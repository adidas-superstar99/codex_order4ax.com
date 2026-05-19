import { createRequire } from "node:module";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { nanoid } from "nanoid";
import type BetterSqlite3 from "better-sqlite3";
import { config, isPostgresUrl } from "./config.js";

const usingPostgres = isPostgresUrl();
const require = createRequire(import.meta.url);

function createSqliteDb(): BetterSqlite3.Database | null {
  if (usingPostgres) {
    return null;
  }

  try {
    const Database = require("better-sqlite3") as new (path: string) => BetterSqlite3.Database;
    return new Database(config.databaseUrl);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `SQLite support is unavailable. Install the optional better-sqlite3 dependency or configure DATABASE_URL for Postgres. ${detail}`
    );
  }
}

export const sqliteDb = createSqliteDb();
export const pgPool = usingPostgres
  ? new Pool({
      connectionString: config.databaseUrl,
      ssl: config.databaseUrl.includes("localhost") ? false : { rejectUnauthorized: false }
    })
  : null;

if (sqliteDb) {
  sqliteDb.pragma("journal_mode = WAL");
  sqliteDb.pragma("foreign_keys = ON");
}

export function isPostgres() {
  return usingPostgres;
}

export async function migrate() {
  if (pgPool) {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS order_batches (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        memo TEXT,
        department TEXT NOT NULL DEFAULT 'AX팀',
        status TEXT NOT NULL DEFAULT 'open',
        created_at TEXT NOT NULL,
        closed_at TEXT
      );
    `);
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        batch_id TEXT REFERENCES order_batches(id) ON DELETE SET NULL,
        ordered_at TEXT NOT NULL,
        orderer_name TEXT NOT NULL,
        team TEXT,
        contact TEXT,
        memo TEXT,
        status TEXT NOT NULL DEFAULT 'submitted'
      );
    `);
    await pgPool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS batch_id TEXT REFERENCES order_batches(id) ON DELETE SET NULL;`);
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        brand TEXT NOT NULL,
        menu_id TEXT NOT NULL,
        menu_name TEXT NOT NULL,
        category TEXT NOT NULL,
        size TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        custom_request TEXT
      );
    `);
    await pgPool.query(`CREATE INDEX IF NOT EXISTS idx_order_batches_status ON order_batches(status);`);
    await pgPool.query(`CREATE INDEX IF NOT EXISTS idx_orders_batch_id ON orders(batch_id);`);
    await pgPool.query(`CREATE INDEX IF NOT EXISTS idx_orders_ordered_at ON orders(ordered_at);`);
    await pgPool.query(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);`);
    await pgPool.query(`CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);`);

    const existingBatch = await pgPool.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM order_batches");
    if (Number(existingBatch.rows[0]?.count ?? "0") === 0) {
      await pgPool.query(
        `INSERT INTO order_batches (id, title, memo, department, status, created_at, closed_at)
         VALUES ($1, $2, $3, $4, 'open', $5, $6)`,
        [nanoid(), "기본 음료 주문", "로컬 확인용 기본 주문입니다.", "AX팀", new Date().toISOString(), null]
      );
    }
    return;
  }

  sqliteDb!.exec(`
    CREATE TABLE IF NOT EXISTS order_batches (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      memo TEXT,
      department TEXT NOT NULL DEFAULT 'AX팀',
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL,
      closed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      ordered_at TEXT NOT NULL,
      orderer_name TEXT NOT NULL,
      team TEXT,
      contact TEXT,
      memo TEXT,
      status TEXT NOT NULL DEFAULT 'submitted'
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      brand TEXT NOT NULL,
      menu_id TEXT NOT NULL,
      menu_name TEXT NOT NULL,
      category TEXT NOT NULL,
      size TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      custom_request TEXT,
      FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_orders_ordered_at ON orders(ordered_at);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_order_batches_status ON order_batches(status);
  `);

  const orderColumns = sqliteDb!.prepare("PRAGMA table_info(orders)").all() as Array<{ name: string }>;
  if (!orderColumns.some((column) => column.name === "batch_id")) {
    sqliteDb!.exec("ALTER TABLE orders ADD COLUMN batch_id TEXT REFERENCES order_batches(id) ON DELETE SET NULL;");
  }

  sqliteDb!.exec("CREATE INDEX IF NOT EXISTS idx_orders_batch_id ON orders(batch_id);");

  const batchCount = sqliteDb!.prepare("SELECT COUNT(*) AS count FROM order_batches").get() as { count: number };
  if (batchCount.count === 0) {
    sqliteDb!.prepare(`
      INSERT INTO order_batches (id, title, memo, department, status, created_at, closed_at)
      VALUES (?, ?, ?, ?, 'open', ?, ?)
    `).run(nanoid(), "기본 음료 주문", "로컬 확인용 기본 주문입니다.", "AX팀", new Date().toISOString(), null);
  }
}

export async function withPgTransaction<T>(callback: (client: PoolClient) => Promise<T>) {
  if (!pgPool) {
    throw new Error("POSTGRES_NOT_CONFIGURED");
  }

  const client = await pgPool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function pgAll<T extends QueryResultRow>(query: string, values: unknown[] = []) {
  if (!pgPool) {
    throw new Error("POSTGRES_NOT_CONFIGURED");
  }
  const result = await pgPool.query<T>(query, values);
  return result.rows;
}

export async function pgOne<T extends QueryResultRow>(query: string, values: unknown[] = []) {
  const rows = await pgAll<T>(query, values);
  return rows[0];
}
