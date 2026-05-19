import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { nanoid } from "nanoid";
import type { Order, OrderBatch } from "./types.js";

type LocalStore = {
  orderBatches: OrderBatch[];
  orders: Order[];
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
        status: "open",
        createdAt: new Date().toISOString()
      }
    ],
    orders: []
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
  return JSON.parse(readFileSync(localStorePath, "utf-8")) as LocalStore;
}

export function writeLocalStore(store: LocalStore) {
  mkdirSync(dirname(localStorePath), { recursive: true });
  writeFileSync(localStorePath, JSON.stringify(store, null, 2), "utf-8");
}
