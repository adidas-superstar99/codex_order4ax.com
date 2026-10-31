import { readFile, mkdir, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { pgPool } from "./db.js";

export interface AiSnapshotRecord {
  snapshot: Record<string, unknown>;
  received_at: string;
}

const filePath = process.env.AI_SNAPSHOT_FILE || "/tmp/order4ax-ai-snapshot.json";

export async function saveAiSnapshot(snapshot: Record<string, unknown>): Promise<AiSnapshotRecord> {
  const record = { snapshot, received_at: new Date().toISOString() };
  if (pgPool) {
    await pgPool.query(`INSERT INTO ai_dashboard_snapshot (id, payload, received_at)
      VALUES (1, $1::jsonb, $2::timestamptz)
      ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, received_at = EXCLUDED.received_at`,
      [JSON.stringify(snapshot), record.received_at]);
  } else {
    await mkdir(dirname(filePath), { recursive: true });
    const temporary = `${filePath}.${process.pid}.tmp`;
    await writeFile(temporary, JSON.stringify(record), { mode: 0o600 });
    await rename(temporary, filePath);
  }
  return record;
}

export async function readAiSnapshot(): Promise<AiSnapshotRecord | null> {
  if (pgPool) {
    const result = await pgPool.query<{ payload: Record<string, unknown>; received_at: Date }>(
      "SELECT payload, received_at FROM ai_dashboard_snapshot WHERE id = 1");
    const row = result.rows[0];
    return row ? { snapshot: row.payload, received_at: row.received_at.toISOString() } : null;
  }
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as AiSnapshotRecord;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
