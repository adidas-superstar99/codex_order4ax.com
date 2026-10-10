import { readFile, writeFile } from "node:fs/promises";

const MENU_PATHS = [
  new URL("../apps/server/src/data/menu-data.json", import.meta.url),
  new URL("../deploy-upload-render/apps/server/src/data/menu-data.json", import.meta.url)
];
const STARBUCKS_CATEGORIES = [
  ["콜드 브루", "W0000171"],
  ["브루드 커피", "W0000060"],
  ["에스프레소", "W0000003"],
  ["프라푸치노", "W0000004"],
  ["블렌디드", "W0000005"],
  ["리프레셔", "W0000422"],
  ["피지오", "W0000061"],
  ["티", "W0000075"],
  ["기타 제조 음료", "W0000053"],
  ["주스/병음료", "W0000062"]
];
const TWOSOME_CATEGORIES = new Map([
  ["01", "커피"],
  ["02", "음료"],
  ["03", "티/티라떼"],
  ["04", "아이스크림/빙수"]
]);
const TWOSOME_SIZE_NAMES = new Map([
  ["레귤러", "Regular"],
  ["라지", "Large"],
  ["맥스", "Max"]
]);
const write = process.argv.includes("--write");
const current = JSON.parse((await readFile(MENU_PATHS[0], "utf8")).replace(/^\uFEFF/, ""));
const byId = new Map(current.map((menu) => [menu.id, menu]));
const timestamp = new Date().toISOString();

function normalizeSizes(value, fallback = ["단일"]) {
  if (Array.isArray(value) && value.length) return value;
  if (typeof value === "string" && value.trim()) {
    return [value.toLowerCase() === "one size" ? "단일" : value.trim()];
  }
  return fallback;
}

async function getJson(url, options) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const data = await response.json();
  if (!data || typeof data !== "object") throw new Error(`${url}: invalid JSON`);
  return data;
}

function updateMenu(next) {
  const previous = byId.get(next.id);
  return {
    ...previous,
    ...next,
    createdAt: previous?.createdAt ?? timestamp,
    updatedAt: previous && ["name", "category", "imageUrl", "sourceUrl", "availableSizes", "isNew"].every(
      (key) => JSON.stringify(previous[key]) === JSON.stringify(next[key])
    ) ? previous.updatedAt : timestamp
  };
}

async function fetchStarbucks() {
  const menus = [];
  for (const [category, code] of STARBUCKS_CATEGORIES) {
    const data = await getJson(`https://www.starbucks.co.kr/upload/json/menu/${code}.js`);
    if (!Array.isArray(data.list) || data.list.length < 2) throw new Error(`Starbucks ${category}: incomplete list`);
    for (const item of data.list) {
      if (item.sold_OUT === "Y") continue;
      const productCode = String(item.product_CD ?? "").trim();
      const name = String(item.product_NM ?? "").trim();
      const path = String(item.file_PATH ?? "").trim();
      if (!productCode || !name || !path) throw new Error(`Starbucks ${category}: missing product data`);
      const imageHost = String(item.img_UPLOAD_PATH ?? "https://www.istarbucks.co.kr")
        .replace("www.istarbucks.co.kr", "image.istarbucks.co.kr");
      const id = `sb-${productCode}`;
      menus.push(updateMenu({
        id,
        brand: "STARBUCKS",
        category,
        name,
        imageUrl: new URL(path, imageHost).toString(),
        sourceUrl: `https://www.starbucks.co.kr/menu/drink_view.do?product_cd=${productCode}`,
        availableSizes: normalizeSizes(
          byId.get(id)?.availableSizes,
          category === "주스/병음료" ? ["단일"] : ["Short", "Tall", "Grande", "Venti"]
        ),
        isNew: item.newicon === "Y"
      }));
    }
  }
  return menus;
}

async function postTwosome(path, body) {
  return getJson(`https://mo.twosome.co.kr${path}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body)
  });
}

async function getTwosomeSizes(menuCode, midCode, previousSizes) {
  const options = [];
  for (const ondoOpt of ["010H", "010I"]) {
    const data = await postTwosome("/mn/menuSizeOptListAjax.json", {
      menuCd: menuCode,
      ondoOpt,
      midCd: midCode
    });
    if (!Array.isArray(data)) throw new Error(`Twosome ${menuCode}: invalid size list`);
    for (const entry of data) {
      const name = TWOSOME_SIZE_NAMES.get(String(entry.SIZE_OPT_NM ?? "")) ?? String(entry.SIZE_OPT_NM ?? "").trim();
      if (name && !options.includes(name)) options.push(name);
    }
  }
  return options.length ? options : normalizeSizes(previousSizes);
}

async function fetchTwosome() {
  const data = await postTwosome("/mn/menuInfoListAjax.json", { pageNum: "1", grtCd: "1", midCd: "" });
  if (String(data.queryCode) !== "1000" || !Array.isArray(data.fetchResultListSet)) {
    throw new Error("Twosome: invalid menu list");
  }
  if (data.fetchResultListSet.length !== Number(data.rowCount) || data.rowCount < 40) {
    throw new Error(`Twosome: incomplete menu list (${data.fetchResultListSet.length}/${data.rowCount})`);
  }
  const menus = [];
  for (const item of data.fetchResultListSet) {
    const menuCode = String(item.MENU_CD ?? "").trim();
    const name = String(item.MENU_NM ?? "").trim();
    const imagePath = String(item.MENU_IMG_01 ?? "").trim();
    const category = TWOSOME_CATEGORIES.get(String(item.MID_CD ?? ""));
    if (!menuCode || !name || !imagePath || !category) throw new Error(`Twosome: missing menu data ${menuCode}`);
    const id = `tw-${menuCode}`;
    const previous = byId.get(id);
    const availableSizes = await getTwosomeSizes(menuCode, String(item.MID_CD), previous?.availableSizes);
    menus.push(updateMenu({
      id,
      brand: "TWOSOME",
      category,
      name,
      imageUrl: new URL(imagePath, "https://mcdn.twosome.co.kr").toString(),
      sourceUrl: `https://mo.twosome.co.kr/mn/menuInfoDetail.do?menuCd=${menuCode}`,
      availableSizes,
      isNew: false
    }));
  }
  return menus;
}

const starbucks = await fetchStarbucks();
const twosome = await fetchTwosome();
const refreshed = [...starbucks, ...twosome];
if (new Set(refreshed.map((menu) => menu.id)).size !== refreshed.length) {
  throw new Error("Duplicate beverage menu IDs from official sources");
}
const result = [...refreshed, ...current.filter((menu) => menu.brand !== "STARBUCKS" && menu.brand !== "TWOSOME")];
for (const brand of ["STARBUCKS", "TWOSOME"]) {
  const before = current.filter((menu) => menu.brand === brand);
  const after = refreshed.filter((menu) => menu.brand === brand);
  const afterIds = new Set(after.map((menu) => menu.id));
  const beforeIds = new Set(before.map((menu) => menu.id));
  console.log(`${brand}: ${before.length} -> ${after.length}; added ${after.filter((menu) => !beforeIds.has(menu.id)).length}; removed ${before.filter((menu) => !afterIds.has(menu.id)).length}`);
}
console.log(`EMART preserved: ${result.filter((menu) => menu.brand === "EMART").length}`);
if (write) {
  for (const path of MENU_PATHS) await writeFile(path, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log("Updated both menu snapshots");
} else {
  console.log("Preview only. Use --write to update snapshots.");
}
