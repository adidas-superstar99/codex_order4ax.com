import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Brand, Menu } from "../types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const candidateDataPaths = [
  join(process.cwd(), "src/data/menu-data.json"),
  join(process.cwd(), "apps/server/src/data/menu-data.json"),
  join(__dirname, "../data/menu-data.json")
];
const menuDataPath = candidateDataPaths.find((path) => existsSync(path)) ?? candidateDataPaths[0];

function readMenus() {
  const rawMenus = JSON.parse(readFileSync(menuDataPath, "utf-8").replace(/^\uFEFF/, "")) as Array<
    Omit<Menu, "availableSizes"> & { availableSizes?: string[] | string | null }
  >;

  return rawMenus.map((menu) => ({
    ...menu,
    availableSizes: normalizeAvailableSizes(menu.availableSizes)
  }));
}

function normalizeAvailableSizes(value: string[] | string | null | undefined) {
  if (Array.isArray(value)) {
    return value.length ? value : ["단일"];
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) return ["단일"];
    if (normalized.toLowerCase() === "one size") return ["단일"];
    return [normalized];
  }

  return ["단일"];
}

export function listMenus(filters: { brand?: Brand; category?: string; query?: string }) {
  const menus = readMenus();
  const query = filters.query?.trim().toLowerCase();

  return menus.filter((menu) => {
    if (filters.brand && menu.brand !== filters.brand) return false;
    if (filters.category && menu.category !== filters.category) return false;
    if (query && !menu.name.toLowerCase().includes(query)) return false;
    return true;
  });
}

export function getMenu(menuId: string) {
  const menus = readMenus();
  return menus.find((menu) => menu.id === menuId);
}
