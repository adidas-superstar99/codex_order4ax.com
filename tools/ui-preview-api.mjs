import http from "node:http";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { URL } from "node:url";

const port = Number(process.env.PORT ?? 3003);
const adminPassword = "1234";
const menus = JSON.parse(
  readFileSync(new URL("../apps/server/src/data/menu-data.json", import.meta.url), "utf8").replace(/^\uFEFF/, "")
);

const batches = [
  {
    id: randomUUID(),
    title: "기본 음료 주문",
    memo: "로컬 확인용 기본 주문입니다.",
    department: "AX팀",
    status: "open",
    createdAt: new Date().toISOString(),
    closedAt: undefined
  }
];

const orders = [];

const statusLabels = {
  submitted: "주문 접수",
  confirmed: "주문 확정",
  ordered: "매장 주문 완료",
  completed: "수령 완료",
  cancelled: "취소"
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, x-admin-password",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS"
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, payload, contentType = "text/plain; charset=utf-8") {
  res.writeHead(statusCode, {
    "Content-Type": contentType,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, x-admin-password",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS"
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function ensureAdmin(req, res) {
  if (req.headers["x-admin-password"] !== adminPassword) {
    sendJson(res, 401, { message: "UNAUTHORIZED" });
    return false;
  }
  return true;
}

function filterOrders(url) {
  const batchId = url.searchParams.get("batchId");
  const brand = url.searchParams.get("brand");
  const status = url.searchParams.get("status");
  const date = url.searchParams.get("date");

  return orders.filter((order) => {
    if (batchId && order.batchId !== batchId) return false;
    if (status && order.status !== status) return false;
    if (brand && !order.items.some((item) => item.brand === brand)) return false;
    if (date && !order.orderedAt.startsWith(date)) return false;
    return true;
  });
}

function summarize(filteredOrders) {
  const groups = new Map();

  for (const order of filteredOrders) {
    for (const item of order.items) {
      const key = `${item.brand}|${item.category}|${item.menuName}|${item.size}`;
      const current = groups.get(key) ?? {
        brand: item.brand,
        menuName: item.menuName,
        category: item.category,
        size: item.size,
        quantity: 0,
        requests: []
      };
      current.quantity += item.quantity;
      if (item.customRequest) {
        current.requests.push({ ordererName: order.ordererName, customRequest: item.customRequest });
      }
      groups.set(key, current);
    }
  }

  return [...groups.values()];
}

function popularMenus(filteredOrders, limit = 3) {
  const groups = new Map();
  for (const order of filteredOrders) {
    if (order.status === "cancelled") continue;
    for (const item of order.items) {
      const current = groups.get(item.menuId) ?? {
        menuId: item.menuId,
        menuName: item.menuName,
        category: item.category,
        quantity: 0,
        ordererNames: []
      };
      current.quantity += item.quantity;
      if (!current.ordererNames.includes(order.ordererName)) {
        current.ordererNames.push(order.ordererName);
      }
      groups.set(item.menuId, current);
    }
  }

  return [...groups.values()].sort((a, b) => b.quantity - a.quantity).slice(0, limit);
}

function toCsv(filteredOrders) {
  const lines = [["주문시각", "주문자", "부서명", "브랜드", "메뉴", "사이즈", "수량", "상태", "요청사항"]];
  for (const order of filteredOrders) {
    for (const item of order.items) {
      lines.push([
        order.orderedAt,
        order.ordererName,
        order.team ?? "",
        item.brand,
        item.menuName,
        item.size,
        String(item.quantity),
        statusLabels[order.status] ?? order.status,
        item.customRequest ?? ""
      ]);
    }
  }
  return `\uFEFF${lines.map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n")}`;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    sendText(res, 204, "");
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/health") {
    sendJson(res, 200, { ok: true, service: "ui-preview-api" });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/menus") {
    const brand = url.searchParams.get("brand");
    const category = url.searchParams.get("category");
    const query = (url.searchParams.get("query") ?? "").toLowerCase();
    const result = menus.filter((menu) => {
      if (brand && menu.brand !== brand) return false;
      if (category && menu.category !== category) return false;
      if (query && !menu.name.toLowerCase().includes(query)) return false;
      return true;
    });
    sendJson(res, 200, result);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/order-batches") {
    sendJson(res, 200, batches.filter((batch) => batch.status === "open"));
    return;
  }

  if (req.method === "GET" && url.pathname.startsWith("/api/order-batches/")) {
    const batchId = url.pathname.split("/").pop();
    const batch = batches.find((item) => item.id === batchId);
    if (!batch) {
      sendJson(res, 404, { message: "주문 목록을 찾을 수 없습니다." });
      return;
    }
    sendJson(res, 200, batch);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/orders") {
    const body = await readBody(req);
    const batch = batches.find((item) => item.id === body.batchId);
    if (!batch) {
      sendJson(res, 404, { message: "주문 목록을 찾을 수 없습니다." });
      return;
    }
    if (batch.status !== "open") {
      sendJson(res, 400, { message: "마감된 주문 목록입니다." });
      return;
    }
    if (!body.ordererName?.trim()) {
      sendJson(res, 400, { message: "주문자 이름을 입력해 주세요." });
      return;
    }
    if (!body.team?.trim()) {
      sendJson(res, 400, { message: "부서명을 입력해 주세요." });
      return;
    }
    if (!Array.isArray(body.items) || !body.items.length) {
      sendJson(res, 400, { message: "장바구니에 음료를 먼저 담아 주세요." });
      return;
    }

    const order = {
      id: randomUUID(),
      batchId: body.batchId,
      orderedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
      ordererName: body.ordererName,
      team: body.team,
      contact: body.contact,
      memo: body.memo,
      status: "submitted",
      items: body.items.map((item) => ({
        id: randomUUID(),
        orderId: "",
        ...item
      }))
    };
    order.items = order.items.map((item) => ({ ...item, orderId: order.id }));
    orders.unshift(order);
    sendJson(res, 201, order);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/orders/popular") {
    const filteredOrders = filterOrders(url);
    const limit = Number(url.searchParams.get("limit") ?? "3");
    sendJson(res, 200, popularMenus(filteredOrders, Number.isFinite(limit) ? limit : 3));
    return;
  }

  if (url.pathname === "/api/admin/order-batches") {
    if (!ensureAdmin(req, res)) return;

    if (req.method === "GET") {
      sendJson(res, 200, batches);
      return;
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      const batch = {
        id: randomUUID(),
        title: body.title?.trim() || "새 주문 목록",
        memo: body.memo?.trim() || "",
        department: body.department?.trim() || "AX팀",
        status: "open",
        createdAt: new Date().toISOString(),
        closedAt: undefined
      };
      batches.unshift(batch);
      sendJson(res, 201, batch);
      return;
    }
  }

  if (url.pathname.startsWith("/api/admin/order-batches/")) {
    if (!ensureAdmin(req, res)) return;
    const batchId = url.pathname.split("/").pop();
    const batch = batches.find((item) => item.id === batchId);
    if (!batch) {
      sendJson(res, 404, { message: "BATCH_NOT_FOUND" });
      return;
    }

    if (req.method === "PATCH") {
      const body = await readBody(req);
      if (body.title !== undefined) batch.title = body.title.trim() || batch.title;
      if (body.memo !== undefined) batch.memo = body.memo.trim();
      if (body.department !== undefined) batch.department = body.department.trim() || batch.department;
      if (body.status === "open" || body.status === "closed") {
        batch.status = body.status;
        batch.closedAt = body.status === "closed" ? new Date().toISOString() : undefined;
      }
      sendJson(res, 200, batch);
      return;
    }
  }

  if (url.pathname === "/api/orders" || url.pathname === "/api/orders/summary" || url.pathname === "/api/orders/export.csv" || url.pathname === "/api/orders/bulk-status" || url.pathname.includes("/status")) {
    if (!ensureAdmin(req, res)) return;
  }

  if (req.method === "GET" && url.pathname === "/api/orders") {
    sendJson(res, 200, filterOrders(url));
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/orders/summary") {
    sendJson(res, 200, summarize(filterOrders(url)));
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/orders/export.csv") {
    sendText(res, 200, toCsv(filterOrders(url)), "text/csv; charset=utf-8");
    return;
  }

  if (req.method === "PATCH" && url.pathname.match(/^\/api\/orders\/[^/]+\/status$/)) {
    const orderId = url.pathname.split("/")[3];
    const order = orders.find((item) => item.id === orderId);
    if (!order) {
      sendJson(res, 404, { message: "ORDER_NOT_FOUND" });
      return;
    }
    const body = await readBody(req);
    order.status = body.status;
    sendJson(res, 200, order);
    return;
  }

  if (req.method === "DELETE" && url.pathname.match(/^\/api\/orders\/[^/]+$/)) {
    const orderId = url.pathname.split("/")[3];
    const index = orders.findIndex((item) => item.id === orderId);
    if (index === -1) {
      sendJson(res, 404, { message: "ORDER_NOT_FOUND" });
      return;
    }
    orders.splice(index, 1);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/orders/bulk-status") {
    const body = await readBody(req);
    const filterUrl = new URL("http://local.test/api/orders");
    Object.entries(body.filters ?? {}).forEach(([key, value]) => {
      if (value && value !== "ALL") filterUrl.searchParams.set(key, String(value));
    });
    const filtered = filterOrders(filterUrl);
    filtered.forEach((order) => {
      order.status = body.status;
    });
    sendJson(res, 200, { updatedCount: filtered.length });
    return;
  }

  sendJson(res, 404, { message: "NOT_FOUND" });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`UI preview API listening on http://127.0.0.1:${port}`);
});
