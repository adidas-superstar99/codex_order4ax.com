export function parseThemePage(html) {
  const count = html.match(/<em[^>]*>([\d,]+)<\/em>\s*개의 상품이 있습니다/);
  if (!count) throw new Error("Missing product total on SSG theme page");

  const images = [...html.matchAll(/<img\b[^>]*class="[^"]*\bi1\b[^"]*\bssgitem_thmb_img\b[^"]*"[^>]*>/g)]
    .map((match) => ({ index: match.index, src: match[0].match(/\bsrc="([^"]+)"/)?.[1] }));
  const productImages = [...html.matchAll(/<input\b[^>]*name="notiImgPath"[^>]*>/g)]
    .map((match) => ({ index: match.index, src: match[0].match(/\bvalue="([^"]+)"/)?.[1] }));
  const products = [];
  for (const match of html.matchAll(/<span[^>]*class="disp_cart_data"[^>]*>(\{[\s\S]*?\})<\/span>/g)) {
    const data = JSON.parse(match[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&"));
    if (String(data.shppTypeCd) !== "10" || String(data.shppTypeDtlCd) !== "11" || String(data.salestrNo) !== "2037") {
      continue;
    }
    const image = images.findLast((entry) => entry.index < match.index);
    const productImage = productImages.findLast((entry) => entry.index < match.index && entry.src?.includes(String(data.itemId)));
    const imageUrl = productImage?.src ?? image?.src;
    if (!data.itemId || !data.itemNm || !data.itemLnkd || !imageUrl) {
      throw new Error(`Incomplete weekly-delivery product ${data.itemId ?? "unknown"} on SSG theme page`);
    }
    const itemUrl = new URL(data.itemLnkd);
    itemUrl.searchParams.set("siteNo", "6001");
    itemUrl.searchParams.set("salestrNo", "2037");
    products.push({
      itemId: String(data.itemId),
      itemNm: String(data.itemNm).trim(),
      imageUrl,
      itemUrl: itemUrl.toString()
    });
  }
  return { total: Number(count[1].replaceAll(",", "")), products };
}

export async function collectThemeProducts(categoryUrl, getHtml) {
  const products = [];
  const seenIds = new Set();
  let expectedTotal;
  let listingSlots = 0;

  for (let pageNumber = 1; pageNumber <= 100; pageNumber += 1) {
    const pageUrl = new URL(categoryUrl);
    pageUrl.searchParams.set("page", String(pageNumber));
    pageUrl.searchParams.set("sort", "sale");
    const page = parseThemePage(await getHtml(pageUrl.toString()));
    if (expectedTotal === undefined) expectedTotal = page.total;
    if (page.total !== expectedTotal || page.products.length === 0) {
      throw new Error(`Incomplete SSG category: collected ${listingSlots} of ${expectedTotal} listing slots`);
    }
    listingSlots += page.products.length;
    for (const product of page.products) {
      if (seenIds.has(product.itemId)) continue;
      seenIds.add(product.itemId);
      products.push(product);
    }
    if (listingSlots === expectedTotal) return products;
    if (listingSlots > expectedTotal) throw new Error("Incomplete SSG category: too many listing slots");
  }
  throw new Error(`Incomplete SSG category: pagination limit reached`);
}
