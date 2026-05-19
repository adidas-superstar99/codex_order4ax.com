import type { Brand, CartItem, Order, OrderBatch, OrderBatchStatus, OrderStatus, PopularMenuRow, SummaryRow } from "./types";

export async function fetchMenus(params: { brand?: Brand; category?: string; query?: string }) {
  const url = new URL("/api/menus", window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });

  const response = await fetch(url);
  if (!response.ok) throw new Error("메뉴를 불러오지 못했습니다.");
  return response.json();
}

export async function fetchPublicOrderBatches() {
  const response = await fetch("/api/order-batches");
  if (!response.ok) throw new Error("주문 목록을 불러오지 못했습니다.");
  return response.json() as Promise<OrderBatch[]>;
}

export async function fetchOrderBatch(batchId: string) {
  const response = await fetch(`/api/order-batches/${batchId}`);
  if (!response.ok) throw new Error("주문 목록을 찾을 수 없습니다.");
  return response.json() as Promise<OrderBatch>;
}

export async function createOrder(payload: {
  batchId: string;
  ordererName: string;
  team?: string;
  contact?: string;
  memo?: string;
  items: CartItem[];
}) {
  const response = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "주문 처리에 실패했습니다." }));
    throw new Error(error.message ?? "주문 처리에 실패했습니다.");
  }

  return response.json() as Promise<Order>;
}

export async function fetchPopularMenus(params: { batchId?: string; brand?: Brand; date?: string; limit?: number }) {
  const url = new URL("/api/orders/popular", window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  });

  const response = await fetch(url);
  if (!response.ok) throw new Error("인기 메뉴를 불러오지 못했습니다.");
  return response.json() as Promise<PopularMenuRow[]>;
}

export async function fetchAdminOrderBatches(password: string) {
  const response = await fetch("/api/admin/order-batches", { headers: adminHeaders(password) });
  if (!response.ok) throw new Error("관리자 주문 목록을 불러오지 못했습니다.");
  return response.json() as Promise<OrderBatch[]>;
}

export async function createOrderBatch(
  password: string,
  payload: { title: string; memo?: string; department?: string }
) {
  const response = await fetch("/api/admin/order-batches", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...adminHeaders(password) },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "주문 목록 생성에 실패했습니다." }));
    throw new Error(error.message ?? "주문 목록 생성에 실패했습니다.");
  }

  return response.json() as Promise<OrderBatch>;
}

export async function updateOrderBatch(
  password: string,
  batchId: string,
  payload: { title?: string; memo?: string; department?: string; status?: OrderBatchStatus }
) {
  const response = await fetch(`/api/admin/order-batches/${batchId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...adminHeaders(password) },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "주문 목록 수정에 실패했습니다." }));
    throw new Error(error.message ?? "주문 목록 수정에 실패했습니다.");
  }

  return response.json() as Promise<OrderBatch>;
}

export async function deleteOrderBatch(password: string, batchId: string) {
  const response = await fetch(`/api/admin/order-batches/${batchId}`, {
    method: "DELETE",
    headers: adminHeaders(password)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "주문 목록 삭제에 실패했습니다." }));
    throw new Error(error.message ?? "주문 목록 삭제에 실패했습니다.");
  }

  return response.json() as Promise<{ ok: true }>;
}

export async function fetchAdminOrders(
  password: string,
  params: { batchId?: string; date?: string; brand?: Brand | "ALL"; status?: OrderStatus | "ALL" }
) {
  const url = new URL("/api/orders", window.location.origin);
  appendAdminParams(url, params);
  const response = await fetch(url, { headers: adminHeaders(password) });
  if (!response.ok) throw new Error("관리자 주문 조회에 실패했습니다.");
  return response.json() as Promise<Order[]>;
}

export async function fetchSummary(
  password: string,
  params: { batchId?: string; date?: string; brand?: Brand | "ALL"; status?: OrderStatus | "ALL" }
) {
  const url = new URL("/api/orders/summary", window.location.origin);
  appendAdminParams(url, params);
  const response = await fetch(url, { headers: adminHeaders(password) });
  if (!response.ok) throw new Error("집계를 불러오지 못했습니다.");
  return response.json() as Promise<SummaryRow[]>;
}

export async function updateStatus(password: string, orderId: string, status: OrderStatus) {
  const response = await fetch(`/api/orders/${orderId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...adminHeaders(password) },
    body: JSON.stringify({ status })
  });

  if (!response.ok) throw new Error("상태 변경에 실패했습니다.");
  return response.json() as Promise<Order>;
}

export async function deleteAdminOrder(password: string, orderId: string) {
  const response = await fetch(`/api/orders/${orderId}`, {
    method: "DELETE",
    headers: adminHeaders(password)
  });

  if (!response.ok) throw new Error("주문 삭제에 실패했습니다.");
  return response.json() as Promise<{ ok: true }>;
}

export async function bulkUpdateStatus(
  password: string,
  payload: {
    status: OrderStatus;
    filters: { batchId?: string; date?: string; brand?: Brand | "ALL"; status?: OrderStatus | "ALL" };
  }
) {
  const response = await fetch("/api/orders/bulk-status", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...adminHeaders(password) },
    body: JSON.stringify(payload)
  });

  if (!response.ok) throw new Error("일괄 상태 변경에 실패했습니다.");
  return response.json() as Promise<{ updatedCount: number }>;
}

export function exportCsvUrl(params: { batchId?: string; date?: string; brand?: Brand | "ALL"; status?: OrderStatus | "ALL" }) {
  const url = new URL("/api/orders/export.csv", window.location.origin);
  appendAdminParams(url, params);
  return url.pathname + url.search;
}

export function adminHeaders(password: string) {
  return { "x-admin-password": password };
}

function appendAdminParams(
  url: URL,
  params: { batchId?: string; date?: string; brand?: Brand | "ALL"; status?: OrderStatus | "ALL" }
) {
  if (params.batchId) url.searchParams.set("batchId", params.batchId);
  if (params.date) url.searchParams.set("date", params.date);
  if (params.brand && params.brand !== "ALL") url.searchParams.set("brand", params.brand);
  if (params.status && params.status !== "ALL") url.searchParams.set("status", params.status);
}
