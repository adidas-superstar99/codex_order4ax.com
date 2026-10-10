import { readFile, writeFile } from "node:fs/promises";

const CATEGORY_CONFIG = [
  {
    category: "과자/쿠키/파이",
    url: "https://emart.ssg.com/disp/category.ssg?dispCtgId=6000213363&shpp=ssgem",
    subcategories: [
      "일반과자",
      "쿠키/비스킷",
      "크래커",
      "샌드/웨하스",
      "스틱과자/빼빼로",
      "파이/케익",
      "과자선물세트",
      "유아과자/시리얼"
    ]
  },
  {
    category: "사탕/캬라멜/껌",
    url: "https://emart.ssg.com/disp/category.ssg?dispCtgId=6000213385&shpp=ssgem",
    subcategories: ["하드캔디", "캬라멜/소프트캔디", "엿/달고나", "껌", "사탕선물세트"]
  },
  {
    category: "초콜릿/초코바",
    url: "https://emart.ssg.com/disp/category.ssg?dispCtgId=6000213395&shpp=ssgem",
    subcategories: ["초콜릿", "초코바", "초콜릿선물세트"]
  },
  {
    category: "두유",
    url: "https://emart.ssg.com/disp/category.ssg?dispCtgId=6000213543&shpp=ssgem",
    leafSubcategory: "두유"
  },
  {
    category: "견과류",
    url: "https://emart.ssg.com/disp/category.ssg?dispCtgId=6000215179&shpp=ssgem",
    leafSubcategory: "견과류"
  }
];

const OUTPUT_PATHS = [
  new URL("../apps/server/src/data/menu-data.json", import.meta.url),
  new URL("../deploy-upload-render/apps/server/src/data/menu-data.json", import.meta.url)
];

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36";
const WEEKLY_DELIVERY_TYPE_CODES = new Set(["10"]);
const WEEKLY_DELIVERY_DETAIL_CODES = new Set(["11"]);
const WEEKLY_DELIVERY_STORE_NUMBERS = new Set(["2037"]);

async function main() {
  const [currentMenuData] = await Promise.all([readJson(OUTPUT_PATHS[0])]);
  const currentEmartMenus = currentMenuData.filter((menu) => menu.brand === "EMART");
  const fetchedEntryKeys = new Set();

  let emartMenus = [];
  const orderedCategoryConfig = CATEGORY_CONFIG;

  for (const categoryConfig of orderedCategoryConfig) {
    try {
      const entries = await resolveCategoryEntries(categoryConfig);

      for (const entry of entries) {
        try {
          const products = await fetchAllProducts(entry.url);
          if (products.length === 0) throw new Error("No weekly-delivery products found");
          const previousCount = currentEmartMenus.filter(
            (menu) => menu.category === categoryConfig.category && menu.subcategory === entry.subcategory
          ).length;
          if (previousCount > 0 && products.length < previousCount / 2) {
            throw new Error(`Incomplete weekly-delivery list: ${products.length} vs ${previousCount} existing`);
          }
          const timestamp = new Date().toISOString();
          fetchedEntryKeys.add(getEntryKey(categoryConfig.category, entry.subcategory));

          products.forEach((product, index) => {
            emartMenus.push({
              id: `emart-${getDispCategoryId(entry.url)}-${slugify(entry.subcategory)}-${product.itemId}`,
              brand: "EMART",
              category: categoryConfig.category,
              subcategory: entry.subcategory,
              name: product.itemNm,
              imageUrl: product.imageUrl,
              sourceUrl: product.itemUrl,
              salesRank: index + 1,
              availableSizes: ["단일"],
              createdAt: timestamp,
              updatedAt: timestamp
            });
          });
        } catch (error) {
          console.warn(
            `Skipping EMART category entry after fetch failure: ${categoryConfig.category} > ${entry.subcategory} (${error instanceof Error ? error.message : error})`
          );
        }

        await sleep(400);
      }
    } catch (error) {
      console.warn(
        `Skipping EMART category after fetch failure: ${categoryConfig.category} (${error instanceof Error ? error.message : error})`
      );
    }
  }

  if (emartMenus.length === 0) {
    throw new Error("EMART live fetch produced no verified weekly-delivery items; snapshots were not changed");
  }

  const nonEmartMenus = currentMenuData.filter((menu) => menu.brand !== "EMART");
  const preservedEmartMenus = currentEmartMenus.filter(
    (menu) => !fetchedEntryKeys.has(getEntryKey(menu.category, menu.subcategory ?? ""))
  );
  const mergedMenus = [...nonEmartMenus, ...dedupeMenus([...preservedEmartMenus, ...emartMenus])];

  for (const outputPath of OUTPUT_PATHS) {
    await writeFile(outputPath, `${JSON.stringify(mergedMenus, null, 2)}\n`, "utf8");
  }

  console.log(`Updated EMART menus: ${dedupeMenus(emartMenus).length} items`);
}

async function resolveCategoryEntries(categoryConfig) {
  if (categoryConfig.leafSubcategory) {
    const url = new URL(categoryConfig.url);
    url.searchParams.set("shpp", "ssgem");
    url.searchParams.set("sort", "sale");
    return [{ subcategory: categoryConfig.leafSubcategory, url: url.toString() }];
  }

  const rootHtml = await fetchHtml(categoryConfig.url);
  const subcategoryUrls = extractSubcategoryUrls(rootHtml, categoryConfig.url, categoryConfig.subcategories);

  return categoryConfig.subcategories
    .map((subcategory) => {
      const subcategoryUrl = subcategoryUrls.get(normalizeLabel(subcategory));
      if (!subcategoryUrl) {
        console.warn(`Skipping missing EMART subcategory URL: ${categoryConfig.category} > ${subcategory}`);
        return null;
      }

      const url = new URL(subcategoryUrl);
      url.searchParams.set("shpp", "ssgem");
      url.searchParams.set("sort", "sale");
      return { subcategory, url: url.toString() };
    })
    .filter(Boolean);
}

function getEntryKey(category, subcategory) {
  return `${category}|${subcategory}`;
}

async function fetchAllProducts(categoryUrl) {
  const seenIds = new Set();
  const products = [];

  for (let page = 1; page <= 100; page += 1) {
    const nextUrl = new URL(categoryUrl);
    nextUrl.searchParams.set("page", String(page));
    nextUrl.searchParams.set("ctgListItemCount", "100");
    nextUrl.searchParams.set("shpp", "ssgem");
    nextUrl.searchParams.set("sort", "sale");

    const html = await fetchHtml(nextUrl.toString());
    const pageProducts = parseProducts(html);

    if (!pageProducts.length) break;

    let newCount = 0;
    for (const product of pageProducts) {
      if (seenIds.has(product.itemId)) continue;
      seenIds.add(product.itemId);
      products.push(product);
      newCount += 1;
    }

    if (newCount === 0) break;
    await sleep(250);
  }

  return products;
}

function parseProducts(html) {
  const images = [];
  const imageRegex = /<img\b[^>]*class="mnemitem_thmb_img"[^>]*>/g;
  let imageMatch;

  while ((imageMatch = imageRegex.exec(html)) !== null) {
    const attrs = readAttributes(imageMatch[0]);
    images.push({
      index: imageMatch.index,
      src: attrs.src ? attrs.src.split(",")[0].trim() : "",
      alt: decodeHtml(attrs.alt ?? "")
    });
  }

  const products = [];
  const jsonRegex = /<span[^>]*class="disp_cart_data"[^>]*>(\{[\s\S]*?\})<\/span>/g;
  let jsonMatch;

  while ((jsonMatch = jsonRegex.exec(html)) !== null) {
    const rawJson = decodeHtml(jsonMatch[1]);
    const parsed = JSON.parse(rawJson);
    if (!isWeeklyDeliveryProduct(parsed)) continue;

    const image = [...images].reverse().find((entry) => entry.index < jsonMatch.index);
    products.push({
      itemId: String(parsed.itemId),
      itemNm: String(parsed.itemNm).trim(),
      itemUrl: normalizeItemUrl(String(parsed.itemLnkd)),
      imageUrl: image?.src || buildImageUrl(String(parsed.itemId))
    });
  }

  return products.filter((product) => product.itemId && product.itemNm && product.itemUrl && product.imageUrl);
}

function isWeeklyDeliveryProduct(parsed) {
  const shppTypeCd = String(parsed.shppTypeCd ?? "");
  const shppTypeDtlCd = String(parsed.shppTypeDtlCd ?? "");
  const salestrNo = String(parsed.salestrNo ?? "");
  const itemUrl = String(parsed.itemLnkd ?? "");

  return (
    WEEKLY_DELIVERY_TYPE_CODES.has(shppTypeCd) &&
    WEEKLY_DELIVERY_DETAIL_CODES.has(shppTypeDtlCd) &&
    (WEEKLY_DELIVERY_STORE_NUMBERS.has(salestrNo) || itemUrl.includes("salestrNo=2037"))
  );
}

function normalizeItemUrl(itemUrl) {
  const url = new URL(itemUrl);
  url.searchParams.set("siteNo", "6001");
  url.searchParams.set("salestrNo", "2037");
  return url.toString();
}

function extractSubcategoryUrls(html, baseUrl, expectedSubcategories) {
  const links = new Map();
  const anchorRegex = /<a\b[^>]*href="([^"]*dispCtgId=[^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
  let match;

  while ((match = anchorRegex.exec(html)) !== null) {
    const href = match[1];
    const text = normalizeLabel(stripTags(decodeHtml(match[2])));
    if (!text) continue;

    for (const expected of expectedSubcategories) {
      const normalizedExpected = normalizeLabel(expected);
      if (text.includes(normalizedExpected) && !links.has(normalizedExpected)) {
        const url = new URL(href, baseUrl);
        url.searchParams.set("shpp", "ssgem");
        url.searchParams.set("sort", "sale");
        links.set(normalizedExpected, url.toString());
      }
    }
  }

  return links;
}

function dedupeMenus(menus) {
  const map = new Map();
  for (const menu of menus) {
    map.set(menu.id, menu);
  }
  return [...map.values()].sort((a, b) => {
    const categoryCompare = `${a.category}|${a.subcategory}`.localeCompare(`${b.category}|${b.subcategory}`, "ko");
    if (categoryCompare !== 0) return categoryCompare;
    return (a.salesRank ?? Number.MAX_SAFE_INTEGER) - (b.salesRank ?? Number.MAX_SAFE_INTEGER)
      || a.name.localeCompare(b.name, "ko");
  });
}

function getDispCategoryId(url) {
  return new URL(url).searchParams.get("dispCtgId") ?? "unknown";
}

function buildImageUrl(itemId) {
  const digits = itemId.replace(/\D/g, "");
  const padded = digits.slice(-6).padStart(6, "0");
  const segments = [padded.slice(4, 6), padded.slice(2, 4), padded.slice(0, 2)];
  return `https://sitem.ssgcdn.com/${segments.join("/")}/item/${itemId}_i1_290.jpg`;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stripTags(value) {
  return value.replace(/<[^>]+>/g, " ");
}

function normalizeLabel(value) {
  return value.replace(/\s+/g, "").trim();
}

function readAttributes(tag) {
  const attrs = {};
  const attrRegex = /([:@\w-]+)="([^"]*)"/g;
  let match;
  while ((match = attrRegex.exec(tag)) !== null) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function fetchHtml(url) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        "user-agent": USER_AGENT,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7"
      }
    });

    if (response.ok) {
      return response.text();
    }

    if (response.status === 429 && attempt < 3) {
      await sleep(1500 * attempt);
      continue;
    }

    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  throw new Error(`Failed to fetch ${url}: exhausted retries`);
}

async function readJson(url) {
  const raw = await readFile(url, "utf8");
  return JSON.parse(raw.replace(/^\uFEFF/, ""));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
