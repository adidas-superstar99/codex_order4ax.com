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

export const sytvGameFiles = {
  minekart: "1wI8aU2MCSqbJkf30X3GoVxev3xYA_VIB",
  familycraft: "1iQO6__Aq0SBn-Ouvk2_yz_XekYVJRzeX",
  animalhospital: "1orcoPcPgMpmsOP6eKyGpX9NkLTCzeZ95",
  marioslug: "1xGFpwdNLe1FTkPFQXPGfibTcs4JEeyrT",
  prophunt: "1BlpktlmBYGnNhrpkSAd7LXJgVO6dhAaZ",
  koopaworld: "1iqhIGYcurdN4BBtG2BIaHNkee28hiIqp",
  rival: "1aQnRFRARF9FzVoEDy8g2r8DqCUrnwNU5",
  dungeon: "1fyi3UfP0vc6qt21skovCKyJkOJ12yxLK",
  doors: "1QALC-zPzHJ6QAbjS6RU6FRNrlz8R1M6V",
  tower: "1uTgYzDywPRn8TwN7nyrjLZ5Zorxrma22",
  anisoccer: "1cd52Gz9lKMR9krgVO1xgkTHIb5cQ0TBP"
} as const;
export type SytvGameId = keyof typeof sytvGameFiles;
export type SytvReaction = "heart" | "clap" | "fire";
type LocalSytvStore = {
  visits: Array<{ day: string; hash: string }>;
  comments: SytvComment[];
  downloads: Array<{ gameId: string; day: string; count: number }>;
  reactions: Array<{ gameId: string; hash: string; reaction: SytvReaction }>;
};
const localPath = join(process.cwd(), "data/sytv-store.json");

function readLocal(): LocalSytvStore {
  if (!existsSync(localPath)) return { visits: [], comments: [], downloads: [], reactions: [] };
  const stored = JSON.parse(readFileSync(localPath, "utf8")) as Partial<LocalSytvStore>;
  return { visits: stored.visits ?? [], comments: stored.comments ?? [], downloads: stored.downloads ?? [], reactions: stored.reactions ?? [] };
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

export function isSytvGameId(value: string): value is SytvGameId {
  return Object.hasOwn(sytvGameFiles, value);
}

export function validateSytvVisitorId(visitorId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(visitorId)) {
    throw new Error("방문 식별값이 올바르지 않습니다.");
  }
}

export async function recordSytvDownload(gameId: SytvGameId) {
  const day = seoulDay();
  if (pgPool) {
    await pgPool.query(`INSERT INTO sytv_download_counts (game_id, download_day, count) VALUES ($1, $2, 1)
      ON CONFLICT (game_id, download_day) DO UPDATE SET count = sytv_download_counts.count + 1`, [gameId, day]);
  } else if (sqliteDb) {
    sqliteDb.prepare(`INSERT INTO sytv_download_counts (game_id, download_day, count) VALUES (?, ?, 1)
      ON CONFLICT (game_id, download_day) DO UPDATE SET count = count + 1`).run(gameId, day);
  } else {
    const store = readLocal();
    const existing = store.downloads.find((item) => item.gameId === gameId && item.day === day);
    if (existing) existing.count += 1;
    else store.downloads.push({ gameId, day, count: 1 });
    writeLocal(store);
  }
  return `https://drive.google.com/uc?export=download&id=${sytvGameFiles[gameId]}`;
}

export async function getSytvGameStats() {
  const day = seoulDay();
  const games: Record<string, { today: number; total: number; reactions: Record<SytvReaction, number> }> = {};
  for (const gameId of Object.keys(sytvGameFiles)) {
    games[gameId] = { today: 0, total: 0, reactions: { heart: 0, clap: 0, fire: 0 } };
  }
  if (pgPool) {
    const [downloads, reactions] = await Promise.all([
      pgPool.query<{ game_id: string; today: string; total: string }>(
        `SELECT game_id, COALESCE(SUM(CASE WHEN download_day = $1 THEN count ELSE 0 END), 0) AS today,
          SUM(count) AS total FROM sytv_download_counts GROUP BY game_id`, [day]),
      pgPool.query<{ game_id: string; reaction: SytvReaction; count: string }>(
        "SELECT game_id, reaction, COUNT(*) AS count FROM sytv_reactions GROUP BY game_id, reaction")
    ]);
    for (const row of downloads.rows) if (games[row.game_id]) {
      games[row.game_id].today = Number(row.today);
      games[row.game_id].total = Number(row.total);
    }
    for (const row of reactions.rows) if (games[row.game_id] && row.reaction in games[row.game_id].reactions) {
      games[row.game_id].reactions[row.reaction] = Number(row.count);
    }
  } else if (sqliteDb) {
    const downloads = sqliteDb.prepare(`SELECT game_id, SUM(CASE WHEN download_day = ? THEN count ELSE 0 END) AS today,
      SUM(count) AS total FROM sytv_download_counts GROUP BY game_id`).all(day) as Array<{ game_id: string; today: number; total: number }>;
    const reactions = sqliteDb.prepare("SELECT game_id, reaction, COUNT(*) AS count FROM sytv_reactions GROUP BY game_id, reaction")
      .all() as Array<{ game_id: string; reaction: SytvReaction; count: number }>;
    for (const row of downloads) if (games[row.game_id]) {
      games[row.game_id].today = row.today;
      games[row.game_id].total = row.total;
    }
    for (const row of reactions) if (games[row.game_id] && row.reaction in games[row.game_id].reactions) {
      games[row.game_id].reactions[row.reaction] = row.count;
    }
  } else {
    const store = readLocal();
    for (const item of store.downloads) if (games[item.gameId]) {
      games[item.gameId].total += item.count;
      if (item.day === day) games[item.gameId].today += item.count;
    }
    for (const item of store.reactions) if (games[item.gameId] && item.reaction in games[item.gameId].reactions) {
      games[item.gameId].reactions[item.reaction] += 1;
    }
  }
  return { day, games };
}

export async function setSytvReaction(gameId: SytvGameId, visitorId: string, reaction: SytvReaction | null) {
  validateSytvVisitorId(visitorId);
  const hash = createHash("sha256").update(visitorId).digest("hex");
  if (pgPool) {
    if (reaction === null) {
      await pgPool.query("DELETE FROM sytv_reactions WHERE game_id = $1 AND visitor_hash = $2", [gameId, hash]);
    } else {
      await pgPool.query(`INSERT INTO sytv_reactions (game_id, visitor_hash, reaction, created_at) VALUES ($1, $2, $3, $4)
        ON CONFLICT (game_id, visitor_hash) DO UPDATE SET reaction = EXCLUDED.reaction`,
        [gameId, hash, reaction, new Date().toISOString()]);
    }
  } else if (sqliteDb) {
    if (reaction === null) {
      sqliteDb.prepare("DELETE FROM sytv_reactions WHERE game_id = ? AND visitor_hash = ?").run(gameId, hash);
    } else {
      sqliteDb.prepare(`INSERT INTO sytv_reactions (game_id, visitor_hash, reaction, created_at) VALUES (?, ?, ?, ?)
        ON CONFLICT (game_id, visitor_hash) DO UPDATE SET reaction = excluded.reaction`)
        .run(gameId, hash, reaction, new Date().toISOString());
    }
  } else {
    const store = readLocal();
    store.reactions = store.reactions.filter((item) => item.gameId !== gameId || item.hash !== hash);
    if (reaction !== null) store.reactions.push({ gameId, hash, reaction });
    writeLocal(store);
  }
  return (await getSytvGameStats()).games[gameId];
}

export async function recordSytvVisit(visitorId: string) {
  validateSytvVisitorId(visitorId);
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
