import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { isLocalFallback, pgPool, sqliteDb } from "../db.js";

export type SytvComment = {
  id: string;
  nickname: string;
  body: string;
  status: "published" | "pending" | "hidden";
  createdAt: string;
};

type LocalSytvStore = { visits: Array<{ day: string; hash: string }>; comments: SytvComment[] };
const localPath = join(process.cwd(), "data/sytv-store.json");

function readLocal(): LocalSytvStore {
  if (!existsSync(localPath)) return { visits: [], comments: [] };
  return JSON.parse(readFileSync(localPath, "utf8")) as LocalSytvStore;
}

function writeLocal(store: LocalSytvStore) {
  mkdirSync(dirname(localPath), { recursive: true });
  writeFileSync(localPath, JSON.stringify(store), "utf8");
}

export function seoulDay(date = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

export async function recordSytvVisit(visitorId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(visitorId)) {
    throw new Error("방문 식별값이 올바르지 않습니다.");
  }
  const day = seoulDay();
  const hash = createHash("sha256").update(`${day}:${visitorId}`).digest("hex");
  const createdAt = new Date().toISOString();
  if (pgPool) {
    await pgPool.query(
      "INSERT INTO sytv_visits (visit_day, visitor_hash, created_at) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
      [day, hash, createdAt]
    );
  } else if (sqliteDb) {
    sqliteDb.prepare("INSERT OR IGNORE INTO sytv_visits (visit_day, visitor_hash, created_at) VALUES (?, ?, ?)")
      .run(day, hash, createdAt);
  } else if (isLocalFallback()) {
    const store = readLocal();
    if (!store.visits.some((visit) => visit.day === day && visit.hash === hash)) {
      store.visits.push({ day, hash });
      writeLocal(store);
    }
  }
  return day;
}

function mapComment(row: Record<string, unknown>): SytvComment {
  return {
    id: String(row.id),
    nickname: String(row.nickname),
    body: String(row.body),
    status: String(row.status) as SytvComment["status"],
    createdAt: String(row.created_at)
  };
}

export async function listSytvComments(includeAll = false): Promise<SytvComment[]> {
  if (pgPool) {
    const result = await pgPool.query(
      `SELECT id, nickname, body, status, created_at FROM sytv_comments ${includeAll ? "" : "WHERE status = 'published'"} ORDER BY created_at DESC LIMIT 100`
    );
    return result.rows.map(mapComment);
  }
  if (sqliteDb) {
    const rows = sqliteDb.prepare(
      `SELECT id, nickname, body, status, created_at FROM sytv_comments ${includeAll ? "" : "WHERE status = 'published'"} ORDER BY created_at DESC LIMIT 100`
    ).all() as Array<Record<string, unknown>>;
    return rows.map(mapComment);
  }
  return readLocal().comments
    .filter((comment) => includeAll || comment.status === "published")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 100);
}

export async function createSytvComment(nicknameInput: string, bodyInput: string): Promise<SytvComment> {
  const nickname = nicknameInput.trim().replace(/[\u0000-\u001f\u007f]/g, "");
  const body = bodyInput.trim().replace(/\r\n?/g, "\n");
  if (nickname.length < 1 || nickname.length > 20 || body.length < 2 || body.length > 500 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(body)) {
    throw new Error("닉네임은 1~20자, 댓글은 2~500자로 입력해 주세요.");
  }
  const comment: SytvComment = {
    id: randomUUID(),
    nickname,
    body,
    status: /https?:\/\/|www\./i.test(body) ? "pending" : "published",
    createdAt: new Date().toISOString()
  };
  if (pgPool) {
    await pgPool.query("INSERT INTO sytv_comments (id, nickname, body, status, created_at) VALUES ($1, $2, $3, $4, $5)",
      [comment.id, comment.nickname, comment.body, comment.status, comment.createdAt]);
  } else if (sqliteDb) {
    sqliteDb.prepare("INSERT INTO sytv_comments (id, nickname, body, status, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(comment.id, comment.nickname, comment.body, comment.status, comment.createdAt);
  } else {
    const store = readLocal();
    store.comments.push(comment);
    writeLocal(store);
  }
  return comment;
}

export async function updateSytvCommentStatus(id: string, status: SytvComment["status"]) {
  if (pgPool) {
    const result = await pgPool.query("UPDATE sytv_comments SET status = $1 WHERE id = $2", [status, id]);
    return (result.rowCount ?? 0) > 0;
  }
  if (sqliteDb) {
    return sqliteDb.prepare("UPDATE sytv_comments SET status = ? WHERE id = ?").run(status, id).changes > 0;
  }
  const store = readLocal();
  const comment = store.comments.find((item) => item.id === id);
  if (!comment) return false;
  comment.status = status;
  writeLocal(store);
  return true;
}

export async function getSytvStats(day: string) {
  const parsedDay = new Date(`${day}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(parsedDay.getTime()) || parsedDay.toISOString().slice(0, 10) !== day) {
    throw new Error("날짜 형식이 올바르지 않습니다.");
  }
  if (pgPool) {
    const [visits, comments] = await Promise.all([
      pgPool.query<{ count: string }>("SELECT COUNT(*) AS count FROM sytv_visits WHERE visit_day = $1", [day]),
      pgPool.query<{ status: string; count: string }>("SELECT status, COUNT(*) AS count FROM sytv_comments GROUP BY status")
    ]);
    return { day, visitors: Number(visits.rows[0]?.count ?? 0), comments: Object.fromEntries(comments.rows.map((row) => [row.status, Number(row.count)])) };
  }
  if (sqliteDb) {
    const visits = sqliteDb.prepare("SELECT COUNT(*) AS count FROM sytv_visits WHERE visit_day = ?").get(day) as { count: number };
    const comments = sqliteDb.prepare("SELECT status, COUNT(*) AS count FROM sytv_comments GROUP BY status").all() as Array<{ status: string; count: number }>;
    return { day, visitors: visits.count, comments: Object.fromEntries(comments.map((row) => [row.status, row.count])) };
  }
  const store = readLocal();
  return {
    day,
    visitors: store.visits.filter((visit) => visit.day === day).length,
    comments: {
      published: store.comments.filter((comment) => comment.status === "published").length,
      pending: store.comments.filter((comment) => comment.status === "pending").length,
      hidden: store.comments.filter((comment) => comment.status === "hidden").length
    }
  };
}
