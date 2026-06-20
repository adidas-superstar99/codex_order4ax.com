import { createRequire } from "node:module";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import type BetterSqlite3 from "better-sqlite3";
import { config, isPostgresUrl } from "./config.js";
import { initLocalStore } from "./localStore.js";

const usingPostgres = isPostgresUrl();
const require = createRequire(import.meta.url);
let sqliteUnavailableReason: string | null = null;

function createSqliteDb(): BetterSqlite3.Database | null {
  if (usingPostgres) {
    return null;
  }

  try {
    const Database = require("better-sqlite3") as new (path: string) => BetterSqlite3.Database;
    return new Database(config.databaseUrl);
  } catch (error) {
    sqliteUnavailableReason = error instanceof Error ? error.message : String(error);
    return null;
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

export function isLocalFallback() {
  return !usingPostgres && !sqliteDb;
}

export async function migrate() {
  if (pgPool) {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS order_batches (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        memo TEXT,
        department TEXT NOT NULL DEFAULT 'AX Team',
        organizer_name TEXT NOT NULL DEFAULT '',
        organizer_email TEXT NOT NULL DEFAULT '',
        source_type TEXT,
        source_external_id TEXT,
        admin_password_hash TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'open',
        created_at TEXT NOT NULL,
        closed_at TEXT
      );
    `);
    await pgPool.query(`ALTER TABLE order_batches ADD COLUMN IF NOT EXISTS organizer_name TEXT NOT NULL DEFAULT '';`);
    await pgPool.query(`ALTER TABLE order_batches ADD COLUMN IF NOT EXISTS organizer_email TEXT NOT NULL DEFAULT '';`);
    await pgPool.query(`ALTER TABLE order_batches ADD COLUMN IF NOT EXISTS source_type TEXT;`);
    await pgPool.query(`ALTER TABLE order_batches ADD COLUMN IF NOT EXISTS source_external_id TEXT;`);
    await pgPool.query(`ALTER TABLE order_batches ADD COLUMN IF NOT EXISTS admin_password_hash TEXT NOT NULL DEFAULT '';`);
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        batch_id TEXT REFERENCES order_batches(id) ON DELETE SET NULL,
        ordered_at TEXT NOT NULL,
        orderer_name TEXT NOT NULL,
        order_password_hash TEXT NOT NULL DEFAULT '',
        team TEXT,
        contact TEXT,
        memo TEXT,
        status TEXT NOT NULL DEFAULT 'submitted'
      );
    `);
    await pgPool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS batch_id TEXT REFERENCES order_batches(id) ON DELETE SET NULL;`);
    await pgPool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_password_hash TEXT NOT NULL DEFAULT '';`);
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
    await pgPool.query(`CREATE INDEX IF NOT EXISTS idx_order_batches_source_external_id ON order_batches(source_external_id);`);
    await pgPool.query(`CREATE INDEX IF NOT EXISTS idx_orders_batch_id ON orders(batch_id);`);
    await pgPool.query(`CREATE INDEX IF NOT EXISTS idx_orders_ordered_at ON orders(ordered_at);`);
    await pgPool.query(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);`);
    await pgPool.query(`CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);`);
    return;
  }

  if (!sqliteDb) {
    initLocalStore();
    if (sqliteUnavailableReason) {
      console.warn(`SQLite unavailable, using local JSON fallback instead. ${sqliteUnavailableReason}`);
    }
    return;
  }

  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS order_batches (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      memo TEXT,
      department TEXT NOT NULL DEFAULT 'AX Team',
      organizer_name TEXT NOT NULL DEFAULT '',
      organizer_email TEXT NOT NULL DEFAULT '',
      source_type TEXT,
      source_external_id TEXT,
      admin_password_hash TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL,
      closed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      ordered_at TEXT NOT NULL,
      orderer_name TEXT NOT NULL,
      order_password_hash TEXT NOT NULL DEFAULT '',
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

  const orderColumns = sqliteDb.prepare("PRAGMA table_info(orders)").all() as Array<{ name: string }>;
  if (!orderColumns.some((column) => column.name === "batch_id")) {
    sqliteDb.exec("ALTER TABLE orders ADD COLUMN batch_id TEXT REFERENCES order_batches(id) ON DELETE SET NULL;");
  }
  if (!orderColumns.some((column) => column.name === "order_password_hash")) {
    sqliteDb.exec("ALTER TABLE orders ADD COLUMN order_password_hash TEXT NOT NULL DEFAULT '';");
  }

  const batchColumns = sqliteDb.prepare("PRAGMA table_info(order_batches)").all() as Array<{ name: string }>;
  if (!batchColumns.some((column) => column.name === "organizer_name")) {
    sqliteDb.exec("ALTER TABLE order_batches ADD COLUMN organizer_name TEXT NOT NULL DEFAULT '';");
  }
  if (!batchColumns.some((column) => column.name === "organizer_email")) {
    sqliteDb.exec("ALTER TABLE order_batches ADD COLUMN organizer_email TEXT NOT NULL DEFAULT '';");
  }
  if (!batchColumns.some((column) => column.name === "source_type")) {
    sqliteDb.exec("ALTER TABLE order_batches ADD COLUMN source_type TEXT;");
  }
  if (!batchColumns.some((column) => column.name === "source_external_id")) {
    sqliteDb.exec("ALTER TABLE order_batches ADD COLUMN source_external_id TEXT;");
  }
  if (!batchColumns.some((column) => column.name === "admin_password_hash")) {
    sqliteDb.exec("ALTER TABLE order_batches ADD COLUMN admin_password_hash TEXT NOT NULL DEFAULT '';");
  }

  sqliteDb.exec("CREATE INDEX IF NOT EXISTS idx_orders_batch_id ON orders(batch_id);");
  sqliteDb.exec("CREATE INDEX IF NOT EXISTS idx_order_batches_source_external_id ON order_batches(source_external_id);");
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
