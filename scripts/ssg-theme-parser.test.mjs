import assert from "node:assert/strict";
import test from "node:test";
import { collectThemeProducts, parseThemePage } from "./ssg-theme-parser.mjs";

test("reads the displayed total and only weekly-delivery products", () => {
  const html = `
    <em>2</em>개의 상품이 있습니다.
    <img src="https://sitem.ssgcdn.com/first.jpg" class="i1 ssgitem_thmb_img" alt="쿠키" />
    <img src="https://sitem.ssgcdn.com/second.jpg" class="i2 ssgitem_thmb_img" alt="쿠키 측면" />
    <span class="disp_cart_data">{"itemId":"1001","itemNm":"쿠키","itemLnkd":"https://www.ssg.com/item/itemView.ssg?itemId=1001","shppTypeCd":"10","shppTypeDtlCd":"11","salestrNo":"2037"}</span>
    <img src="https://sitem.ssgcdn.com/other.jpg" class="i1 ssgitem_thmb_img" alt="택배 상품" />
    <span class="disp_cart_data">{"itemId":"1002","itemNm":"택배 상품","itemLnkd":"https://www.ssg.com/item/itemView.ssg?itemId=1002","shppTypeCd":"20","shppTypeDtlCd":"21","salestrNo":"2037"}</span>
  `;

  const page = parseThemePage(html);
  assert.equal(page.total, 2);
  assert.deepEqual(page.products.map(({ itemId, itemNm, imageUrl }) => ({ itemId, itemNm, imageUrl })), [
    { itemId: "1001", itemNm: "쿠키", imageUrl: "https://sitem.ssgcdn.com/first.jpg" }
  ]);
});

test("rejects a page without a product total", () => {
  assert.throws(() => parseThemePage("<html>blocked</html>"), /product total/i);
});

test("uses the product image field when the image tag has no class", () => {
  const html = `<em>1</em>개의 상품이 있습니다.
    <img src="https://sitem.ssgcdn.com/1001.jpg" alt="껌" />
    <input name="notiImgPath" value="https://sitem.ssgcdn.com/1001_i1_290.jpg" />
    <span class="disp_cart_data">{"itemId":"1001","itemNm":"껌","itemLnkd":"https://www.ssg.com/item/itemView.ssg?itemId=1001","shppTypeCd":"10","shppTypeDtlCd":"11","salestrNo":"2037"}</span>`;
  assert.equal(parseThemePage(html).products[0].imageUrl, "https://sitem.ssgcdn.com/1001_i1_290.jpg");
});

test("collects every page before accepting a category", async () => {
  const html = (id) => `<em>2</em>개의 상품이 있습니다.
    <img src="https://sitem.ssgcdn.com/${id}.jpg" class="i1 ssgitem_thmb_img" />
    <span class="disp_cart_data">{"itemId":"${id}","itemNm":"상품 ${id}","itemLnkd":"https://www.ssg.com/item/itemView.ssg?itemId=${id}","shppTypeCd":"10","shppTypeDtlCd":"11","salestrNo":"2037"}</span>`;
  const products = await collectThemeProducts("https://www.ssg.com/disp/theme/category.ssg?dispCtgId=1", async (url) =>
    html(new URL(url).searchParams.get("page") === "2" ? "1002" : "1001")
  );
  assert.deepEqual(products.map((item) => item.itemId), ["1001", "1002"]);
});

test("does not accept a truncated category page", async () => {
  const html = `<em>2</em>개의 상품이 있습니다.
    <img src="https://sitem.ssgcdn.com/1001.jpg" class="i1 ssgitem_thmb_img" />
    <span class="disp_cart_data">{"itemId":"1001","itemNm":"상품","itemLnkd":"https://www.ssg.com/item/itemView.ssg?itemId=1001","shppTypeCd":"10","shppTypeDtlCd":"11","salestrNo":"2037"}</span>`;
  await assert.rejects(
    collectThemeProducts("https://www.ssg.com/disp/theme/category.ssg?dispCtgId=1", async (url) =>
      new URL(url).searchParams.get("page") === "2" ? "<em>2</em>개의 상품이 있습니다." : html
    ),
    /incomplete/i
  );
});

test("counts repeated listing slots but keeps one copy of a product", async () => {
  const html = (id) => `<em>2</em>개의 상품이 있습니다.
    <img src="https://sitem.ssgcdn.com/${id}.jpg" class="i1 ssgitem_thmb_img" />
    <span class="disp_cart_data">{"itemId":"${id}","itemNm":"상품","itemLnkd":"https://www.ssg.com/item/itemView.ssg?itemId=${id}","shppTypeCd":"10","shppTypeDtlCd":"11","salestrNo":"2037"}</span>`;
  const products = await collectThemeProducts("https://www.ssg.com/disp/theme/category.ssg?dispCtgId=1", async () => html("1001"));
  assert.deepEqual(products.map((item) => item.itemId), ["1001"]);
});
