import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { nanoid } from "nanoid";
import type { CloudFile, CloudNote, Order, OrderBatch } from "./types.js";

type LocalStore = {
  orderBatches: OrderBatch[];
  orders: Order[];
  cloudNotes: CloudNote[];
  cloudFiles: Array<CloudFile & { contentBase64: string }>;
};

const localStorePath = join(process.cwd(), "data/local-store.json");

function createDefaultStore(): LocalStore {
  return {
    orderBatches: [
      {
        id: nanoid(),
        title: "Default order batch",
        memo: "Local fallback batch for preview.",
        department: "AX Team",
        organizerName: "AX Team",
        organizerEmail: "ax-team@example.com",
        sourceType: undefined,
        sourceExternalId: undefined,
        status: "open",
        createdAt: new Date().toISOString()
      }
    ],
    orders: [],
    cloudNotes: [],
    cloudFiles: []
  };
}

export function initLocalStore() {
  if (existsSync(localStorePath)) {
    return;
  }

  mkdirSync(dirname(localStorePath), { recursive: true });
  writeFileSync(localStorePath, JSON.stringify(createDefaultStore(), null, 2), "utf-8");
}

export function readLocalStore(): LocalStore {
  initLocalStore();
  const store = JSON.parse(readFileSync(localStorePath, "utf-8")) as LocalStore;
  return {
    orderBatches: store.orderBatches.map((batch) => ({
      ...batch,
      organizerName: batch.organizerName || batch.department || "AX Team",
      organizerEmail: batch.organizerEmail || "ax-team@example.com",
      sourceType: batch.sourceType || undefined,
      sourceExternalId: batch.sourceExternalId || undefined
    })),
    orders: store.orders,
    cloudNotes: store.cloudNotes ?? [],
    cloudFiles: store.cloudFiles ?? []
  };
}

export function writeLocalStore(store: LocalStore) {
  mkdirSync(dirname(localStorePath), { recursive: true });
  writeFileSync(localStorePath, JSON.stringify(store, null, 2), "utf-8");
}
