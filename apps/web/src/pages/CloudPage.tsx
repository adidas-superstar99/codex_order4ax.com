import { Download, FileText, Lock, PlusCircle, Save, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  createCloudNote,
  deleteCloudFile,
  deleteCloudNote,
  downloadCloudFile,
  fetchCloudState,
  updateCloudNote,
  uploadCloudFile
} from "../api";
import type { CloudFile, CloudNote } from "../types";

type EditingNote = {
  id?: string;
  title: string;
  content: string;
};

export function CloudPage() {
  const [password, setPassword] = useState(() => window.localStorage.getItem("adminPassword") ?? "1234");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [notes, setNotes] = useState<CloudNote[]>([]);
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [maxFileSizeBytes, setMaxFileSizeBytes] = useState(2 * 1024 * 1024);
  const [message, setMessage] = useState("");
  const [editingNote, setEditingNote] = useState<EditingNote>({ title: "", content: "" });
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  useEffect(() => {
    if (isUnlocked) {
      void loadCloud();
    }
  }, [isUnlocked]);

  const maxFileSizeLabel = useMemo(() => formatBytes(maxFileSizeBytes), [maxFileSizeBytes]);

  async function loadCloud() {
    setMessage("");
    try {
      const cloudState = await fetchCloudState(password);
      setNotes(cloudState.notes);
      setFiles(cloudState.files);
      setMaxFileSizeBytes(cloudState.limits.maxFileSizeBytes);
      if (cloudState.notes.length && !editingNote.id && !editingNote.title && !editingNote.content) {
        setEditingNote({
          id: cloudState.notes[0].id,
          title: cloudState.notes[0].title,
          content: cloudState.notes[0].content
        });
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Cloud page could not be loaded.");
      setIsUnlocked(false);
    }
  }

  function handleUnlock(event: FormEvent) {
    event.preventDefault();
    window.localStorage.setItem("adminPassword", password);
    setIsUnlocked(true);
  }

  function startNewNote() {
    setEditingNote({ title: "", content: "" });
    setMessage("Ready for a new note.");
  }

  function startEditNote(note: CloudNote) {
    setEditingNote({ id: note.id, title: note.title, content: note.content });
    setMessage(`Editing "${note.title}".`);
  }

  async function handleSaveNote(event: FormEvent) {
    event.preventDefault();
    setIsSavingNote(true);
    try {
      const payload = {
        title: editingNote.title,
        content: editingNote.content
      };
      const savedNote = editingNote.id
        ? await updateCloudNote(password, editingNote.id, payload)
        : await createCloudNote(password, payload);
      await loadCloud();
      setEditingNote({ id: savedNote.id, title: savedNote.title, content: savedNote.content });
      setMessage(editingNote.id ? "Note updated." : "Note created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Note save failed.");
    } finally {
      setIsSavingNote(false);
    }
  }

  async function handleDeleteNote(noteId: string) {
    const confirmed = window.confirm("Delete this note?");
    if (!confirmed) return;

    try {
      await deleteCloudNote(password, noteId);
      await loadCloud();
      if (editingNote.id === noteId) {
        setEditingNote({ title: "", content: "" });
      }
      setMessage("Note deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Note delete failed.");
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > maxFileSizeBytes) {
      setMessage(`This file is too large. Limit: ${maxFileSizeLabel}.`);
      event.target.value = "";
      return;
    }

    setIsUploadingFile(true);
    try {
      const contentBase64 = await fileToBase64(file);
      await uploadCloudFile(password, {
        originalName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        contentBase64
      });
      await loadCloud();
      setMessage(`Uploaded ${file.name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "File upload failed.");
    } finally {
      setIsUploadingFile(false);
      event.target.value = "";
    }
  }

  async function handleDownloadFile(file: CloudFile) {
    try {
      const blob = await downloadCloudFile(password, file);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.originalName;
      link.click();
      URL.revokeObjectURL(url);
      setMessage(`Downloaded ${file.originalName}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "File download failed.");
    }
  }

  async function handleDeleteFile(fileId: string) {
    const confirmed = window.confirm("Delete this file?");
    if (!confirmed) return;

    try {
      await deleteCloudFile(password, fileId);
      await loadCloud();
      setMessage("File deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "File delete failed.");
    }
  }

  if (!isUnlocked) {
    return (
      <main className="admin-login">
        <form onSubmit={handleUnlock}>
          <p className="eyebrow">Private Cloud</p>
          <h1>order4ax cloud</h1>
          <label className="field">
            <span>Admin password</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {message ? <p className="status-message">{message}</p> : null}
          <button className="primary-button" type="submit">
            <Lock size={18} />
            Enter cloud
          </button>
          <a className="text-link" href="/admin">Back to admin</a>
        </form>
      </main>
    );
  }

  return (
    <main className="app-shell premium-shell">
      <section className="order-header">
        <div>
          <p className="eyebrow">Private Space</p>
          <h1>Cloud</h1>
          <p>Private notes and small personal files for the site owner.</p>
        </div>
        <div className="cloud-header-actions">
          <a className="admin-link" href="/admin">Admin</a>
          <a className="admin-link" href="/">Order list</a>
        </div>
      </section>

      {message ? <p className="status-message">{message}</p> : null}

      <section className="cloud-grid">
        <div className="dashboard-section">
          <div className="section-heading-row">
            <div>
              <p className="section-kicker">Notes</p>
              <h2>Quick memo board</h2>
            </div>
            <button className="secondary-button" type="button" onClick={startNewNote}>
              <PlusCircle size={16} />
              New note
            </button>
          </div>

          <form className="cloud-note-editor" onSubmit={handleSaveNote}>
            <label className="field">
              <span>Title</span>
              <input
                value={editingNote.title}
                onChange={(event) => setEditingNote((current) => ({ ...current, title: event.target.value }))}
                placeholder="Keep it short"
              />
            </label>
            <label className="field">
              <span>Content</span>
              <textarea
                rows={12}
                value={editingNote.content}
                onChange={(event) => setEditingNote((current) => ({ ...current, content: event.target.value }))}
                placeholder="Private note"
              />
            </label>
            <button className="primary-button" type="submit" disabled={isSavingNote}>
              <Save size={16} />
              {editingNote.id ? "Update note" : "Save note"}
            </button>
          </form>

          <div className="cloud-note-list">
            {notes.length ? notes.map((note) => (
              <article className="cloud-item-card" key={note.id}>
                <button className="cloud-note-card" type="button" onClick={() => startEditNote(note)}>
                  <strong>{note.title}</strong>
                  <span>{new Date(note.updatedAt).toLocaleString("ko-KR")}</span>
                  <p>{note.content}</p>
                </button>
                <button className="secondary-button danger-button" type="button" onClick={() => handleDeleteNote(note.id)}>
                  <Trash2 size={15} />
                  Delete
                </button>
              </article>
            )) : <div className="empty-state">No notes yet.</div>}
          </div>
        </div>

        <div className="dashboard-section">
          <div className="section-heading-row">
            <div>
              <p className="section-kicker">Files</p>
              <h2>Small file shelf</h2>
            </div>
            <label className="secondary-button cloud-upload-button">
              <Upload size={16} />
              {isUploadingFile ? "Uploading..." : "Upload file"}
              <input type="file" hidden onChange={handleFileChange} />
            </label>
          </div>

          <p className="cloud-limit-text">Per-file limit: {maxFileSizeLabel}</p>

          <div className="cloud-file-list">
            {files.length ? files.map((file) => (
              <article className="cloud-item-card" key={file.id}>
                <div className="cloud-file-card">
                  <div className="cloud-file-main">
                    <FileText size={18} />
                    <div>
                      <strong>{file.originalName}</strong>
                      <span>{file.mimeType || "application/octet-stream"}</span>
                    </div>
                  </div>
                  <div className="cloud-file-meta">
                    <span>{formatBytes(file.sizeBytes)}</span>
                    <span>{new Date(file.createdAt).toLocaleString("ko-KR")}</span>
                  </div>
                </div>
                <div className="cloud-file-actions">
                  <button className="secondary-button" type="button" onClick={() => handleDownloadFile(file)}>
                    <Download size={15} />
                    Download
                  </button>
                  <button className="secondary-button danger-button" type="button" onClick={() => handleDeleteFile(file.id)}>
                    <Trash2 size={15} />
                    Delete
                  </button>
                </div>
              </article>
            )) : <div className="empty-state">No files yet.</div>}
          </div>
        </div>
      </section>
    </main>
  );
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const [, base64 = ""] = result.split(",");
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("File could not be read."));
    reader.readAsDataURL(file);
  });
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
