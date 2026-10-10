import { readFile, writeFile } from "node:fs/promises";
import { collectThemeProducts } from "./ssg-theme-parser.mjs";

const THEME_URL = "https://www.ssg.com/disp/theme/category.ssg";
const CATEGORIES = [
  {
    category: "과자/쿠키/파이",
    entries: [
      ["스낵/과자", "6000223618"],
      ["쿠키/비스킷/크래커", "6000223619"],
      ["샌드/스틱과자", "6000223620"],
      ["파이/케익", "6000223621"],
      ["유아과자/시리얼", "6000223622"]
    ]
  },
  { category: "사탕/캬라멜/껌", entries: [["사탕/카라멜/껌", "6000223625"]] },
  { category: "초콜릿/초코바", entries: [["초콜릿/초코바", "6000223627"]] }
];
const OUTPUT_PATHS = [
  new URL("../apps/server/src/data/menu-data.json", import.meta.url),
  new URL("../deploy-upload-render/apps/server/src/data/menu-data.json", import.meta.url)
];

async function getHtml(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/136.0.0.0 Safari/537.36",
      accept: "text/html,application/xhtml+xml",
      "accept-language": "ko-KR,ko;q=0.9"
    },
    signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) throw new Error(`SSG category request failed (${response.status}): ${url}`);
  return response.text();
}

async function main() {
  const current = JSON.parse((await readFile(OUTPUT_PATHS[0], "utf8")).replace(/^\uFEFF/, ""));
  const replacedCategories = new Set(CATEGORIES.map((entry) => entry.category));
  const previousByProduct = new Map();
  for (const menu of current) {
    if (menu.brand !== "EMART" || !replacedCategories.has(menu.category)) continue;
    const itemId = menu.sourceUrl ? new URL(menu.sourceUrl).searchParams.get("itemId") : null;
    if (itemId) previousByProduct.set(`${menu.category}|${itemId}`, menu);
  }

  const updated = [];
  const timestamp = new Date().toISOString();
  for (const group of CATEGORIES) {
    for (const [subcategory, categoryId] of group.entries) {
      const url = `${THEME_URL}?dispCtgId=${categoryId}`;
      const products = await collectThemeProducts(url, getHtml);
      console.log(`${group.category} / ${subcategory}: ${products.length} weekly-delivery products`);
      for (const [index, product] of products.entries()) {
        const previous = previousByProduct.get(`${group.category}|${product.itemId}`);
        const next = {
          id: previous?.id ?? `emart-theme-${categoryId}-${product.itemId}`,
          brand: "EMART",
          category: group.category,
          subcategory,
          name: product.itemNm,
          imageUrl: product.imageUrl,
          sourceUrl: product.itemUrl,
          salesRank: index + 1,
          availableSizes: ["단일"],
          createdAt: previous?.createdAt ?? timestamp,
          updatedAt: timestamp
        };
        if (previous && ["category", "subcategory", "name", "imageUrl", "sourceUrl", "salesRank"].every(
          (key) => previous[key] === next[key]
        )) next.updatedAt = previous.updatedAt;
        updated.push(next);
      }
    }
  }

  if (new Set(updated.map((menu) => menu.id)).size !== updated.length) {
    throw new Error("Duplicate EMART menu IDs; snapshots were not changed");
  }
  const preserved = current.filter((menu) => menu.brand !== "EMART" || !replacedCategories.has(menu.category));
  const merged = [...preserved, ...updated];
  if (process.argv.includes("--write")) {
    for (const path of OUTPUT_PATHS) await writeFile(path, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
    console.log(`Updated ${updated.length} EMART products; preserved ${preserved.length} other menus`);
  } else {
    console.log(`Preview only: ${updated.length} EMART products. Use --write to update both snapshots.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
