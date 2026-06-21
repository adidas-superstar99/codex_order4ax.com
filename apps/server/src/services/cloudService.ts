import { nanoid } from "nanoid";
import { isLocalFallback, isPostgres, pgAll, pgOne, sqliteDb } from "../db.js";
import { readLocalStore, writeLocalStore } from "../localStore.js";
import type { CloudFile, CloudNote } from "../types.js";

const MAX_CLOUD_FILE_SIZE = 2 * 1024 * 1024;
const MAX_CLOUD_NOTES = 100;
const MAX_CLOUD_FILES = 100;

type CloudNoteRow = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

type CloudFileRow = {
  id: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  content: Buffer | Uint8Array;
  created_at: string;
};

export function getMaxCloudFileSize() {
  return MAX_CLOUD_FILE_SIZE;
}

export async function listCloudNotes(): Promise<CloudNote[]> {
  if (isPostgres()) {
    const rows = await pgAll<CloudNoteRow>("SELECT * FROM cloud_notes ORDER BY updated_at DESC");
    return rows.map(mapCloudNoteRow);
  }

  if (isLocalFallback()) {
    return [...readLocalStore().cloudNotes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  const rows = sqliteDb!.prepare("SELECT * FROM cloud_notes ORDER BY updated_at DESC").all() as CloudNoteRow[];
  return rows.map(mapCloudNoteRow);
}

export async function createCloudNote(input: { title?: string; content?: string }) {
  const title = normalizeNoteTitle(input.title);
  const content = normalizeNoteContent(input.content);
  const now = new Date().toISOString();
  const note: CloudNote = { id: nanoid(), title, content, createdAt: now, updatedAt: now };

  const notes = await listCloudNotes();
  if (notes.length >= MAX_CLOUD_NOTES) {
    throw new Error("CLOUD_NOTE_LIMIT_REACHED");
  }

  if (isPostgres()) {
    await pgOne(
      "INSERT INTO cloud_notes (id, title, content, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)",
      [note.id, note.title, note.content, note.createdAt, note.updatedAt]
    );
    return note;
  }

  if (isLocalFallback()) {
    const store = readLocalStore();
    store.cloudNotes.unshift(note);
    writeLocalStore(store);
    return note;
  }

  sqliteDb!.prepare(
    "INSERT INTO cloud_notes (id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(note.id, note.title, note.content, note.createdAt, note.updatedAt);
  return note;
}

export async function updateCloudNote(noteId: string, input: { title?: string; content?: string }) {
  const existing = await getCloudNoteById(noteId);
  if (!existing) return undefined;

  const updated: CloudNote = {
    ...existing,
    title: normalizeNoteTitle(input.title ?? existing.title),
    content: normalizeNoteContent(input.content ?? existing.content),
    updatedAt: new Date().toISOString()
  };

  if (isPostgres()) {
    await pgOne("UPDATE cloud_notes SET title = $1, content = $2, updated_at = $3 WHERE id = $4 RETURNING id", [
      updated.title,
      updated.content,
      updated.updatedAt,
      noteId
    ]);
    return updated;
  }

  if (isLocalFallback()) {
    const store = readLocalStore();
    const index = store.cloudNotes.findIndex((entry) => entry.id === noteId);
    if (index >= 0) {
      store.cloudNotes[index] = updated;
      writeLocalStore(store);
    }
    return updated;
  }

  sqliteDb!.prepare("UPDATE cloud_notes SET title = ?, content = ?, updated_at = ? WHERE id = ?").run(
    updated.title,
    updated.content,
    updated.updatedAt,
    noteId
  );
  return updated;
}

export async function deleteCloudNote(noteId: string) {
  if (isPostgres()) {
    const deleted = await pgOne<{ id: string }>("DELETE FROM cloud_notes WHERE id = $1 RETURNING id", [noteId]);
    return Boolean(deleted);
  }

  if (isLocalFallback()) {
    const store = readLocalStore();
    const nextNotes = store.cloudNotes.filter((entry) => entry.id !== noteId);
    const deleted = nextNotes.length !== store.cloudNotes.length;
    if (deleted) {
      store.cloudNotes = nextNotes;
      writeLocalStore(store);
    }
    return deleted;
  }

  const result = sqliteDb!.prepare("DELETE FROM cloud_notes WHERE id = ?").run(noteId);
  return result.changes > 0;
}

export async function listCloudFiles(): Promise<CloudFile[]> {
  if (isPostgres()) {
    const rows = await pgAll<Omit<CloudFileRow, "content">>("SELECT id, original_name, mime_type, size_bytes, created_at FROM cloud_files ORDER BY created_at DESC");
    return rows.map(mapCloudFileMetadataRow);
  }

  if (isLocalFallback()) {
    return [...readLocalStore().cloudFiles]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(stripLocalCloudFileContent);
  }

  const rows = sqliteDb!
    .prepare("SELECT id, original_name, mime_type, size_bytes, created_at FROM cloud_files ORDER BY created_at DESC")
    .all() as Array<Omit<CloudFileRow, "content">>;
  return rows.map(mapCloudFileMetadataRow);
}

export async function createCloudFile(input: {
  originalName?: string;
  mimeType?: string;
  sizeBytes?: number;
  contentBase64?: string;
}) {
  const originalName = normalizeFileName(input.originalName);
  const mimeType = normalizeMimeType(input.mimeType);
  const contentBuffer = decodeBase64Content(input.contentBase64);
  const sizeBytes = Number(input.sizeBytes ?? contentBuffer.byteLength);

  if (sizeBytes !== contentBuffer.byteLength) {
    throw new Error("CLOUD_FILE_SIZE_MISMATCH");
  }
  if (sizeBytes <= 0) {
    throw new Error("CLOUD_FILE_EMPTY");
  }
  if (sizeBytes > MAX_CLOUD_FILE_SIZE) {
    throw new Error("CLOUD_FILE_TOO_LARGE");
  }

  const existingFiles = await listCloudFiles();
  if (existingFiles.length >= MAX_CLOUD_FILES) {
    throw new Error("CLOUD_FILE_LIMIT_REACHED");
  }

  const file: CloudFile = {
    id: nanoid(),
    originalName,
    mimeType,
    sizeBytes,
    createdAt: new Date().toISOString()
  };

  if (isPostgres()) {
    await pgOne(
      "INSERT INTO cloud_files (id, original_name, mime_type, size_bytes, content, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
      [file.id, file.originalName, file.mimeType, file.sizeBytes, contentBuffer, file.createdAt]
    );
    return file;
  }

  if (isLocalFallback()) {
    const store = readLocalStore();
    store.cloudFiles.unshift({ ...file, contentBase64: contentBuffer.toString("base64") });
    writeLocalStore(store);
    return file;
  }

  sqliteDb!
    .prepare("INSERT INTO cloud_files (id, original_name, mime_type, size_bytes, content, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(file.id, file.originalName, file.mimeType, file.sizeBytes, contentBuffer, file.createdAt);
  return file;
}

export async function deleteCloudFile(fileId: string) {
  if (isPostgres()) {
    const deleted = await pgOne<{ id: string }>("DELETE FROM cloud_files WHERE id = $1 RETURNING id", [fileId]);
    return Boolean(deleted);
  }

  if (isLocalFallback()) {
    const store = readLocalStore();
    const nextFiles = store.cloudFiles.filter((entry) => entry.id !== fileId);
    const deleted = nextFiles.length !== store.cloudFiles.length;
    if (deleted) {
      store.cloudFiles = nextFiles;
      writeLocalStore(store);
    }
    return deleted;
  }

  const result = sqliteDb!.prepare("DELETE FROM cloud_files WHERE id = ?").run(fileId);
  return result.changes > 0;
}

export async function getCloudFileDownload(fileId: string) {
  if (isPostgres()) {
    const row = await pgOne<CloudFileRow>(
      "SELECT id, original_name, mime_type, size_bytes, content, created_at FROM cloud_files WHERE id = $1",
      [fileId]
    );
    return row ? mapCloudFileDownloadRow(row) : undefined;
  }

  if (isLocalFallback()) {
    const file = readLocalStore().cloudFiles.find((entry) => entry.id === fileId);
    if (!file) return undefined;
    return {
      metadata: stripLocalCloudFileContent(file),
      content: Buffer.from(file.contentBase64, "base64")
    };
  }

  const row = sqliteDb!
    .prepare("SELECT id, original_name, mime_type, size_bytes, content, created_at FROM cloud_files WHERE id = ?")
    .get(fileId) as CloudFileRow | undefined;
  return row ? mapCloudFileDownloadRow(row) : undefined;
}

async function getCloudNoteById(noteId: string) {
  if (isPostgres()) {
    const row = await pgOne<CloudNoteRow>("SELECT * FROM cloud_notes WHERE id = $1", [noteId]);
    return row ? mapCloudNoteRow(row) : undefined;
  }

  if (isLocalFallback()) {
    return readLocalStore().cloudNotes.find((entry) => entry.id === noteId);
  }

  const row = sqliteDb!.prepare("SELECT * FROM cloud_notes WHERE id = ?").get(noteId) as CloudNoteRow | undefined;
  return row ? mapCloudNoteRow(row) : undefined;
}

function mapCloudNoteRow(row: CloudNoteRow): CloudNote {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapCloudFileMetadataRow(row: Omit<CloudFileRow, "content">): CloudFile {
  return {
    id: row.id,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at
  };
}

function mapCloudFileDownloadRow(row: CloudFileRow) {
  return {
    metadata: mapCloudFileMetadataRow(row),
    content: Buffer.from(row.content)
  };
}

function stripLocalCloudFileContent(
  file: CloudFile & {
    contentBase64: string;
  }
): CloudFile {
  return {
    id: file.id,
    originalName: file.originalName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    createdAt: file.createdAt
  };
}

function normalizeNoteTitle(value?: string) {
  const title = String(value ?? "").trim();
  if (!title) {
    throw new Error("CLOUD_NOTE_TITLE_REQUIRED");
  }
  return title.slice(0, 120);
}

function normalizeNoteContent(value?: string) {
  const content = String(value ?? "").trim();
  if (!content) {
    throw new Error("CLOUD_NOTE_CONTENT_REQUIRED");
  }
  return content.slice(0, 20000);
}

function normalizeFileName(value?: string) {
  const original = String(value ?? "").trim();
  if (!original) {
    throw new Error("CLOUD_FILE_NAME_REQUIRED");
  }
  return original.slice(0, 180);
}

function normalizeMimeType(value?: string) {
  const mimeType = String(value ?? "application/octet-stream").trim();
  return mimeType || "application/octet-stream";
}

function decodeBase64Content(value?: string) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    throw new Error("CLOUD_FILE_CONTENT_REQUIRED");
  }
  return Buffer.from(normalized, "base64");
}
