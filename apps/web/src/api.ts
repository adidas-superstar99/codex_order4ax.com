import type {
  Brand,
  CartItem,
  CloudFile,
  CloudNote,
  Order,
  OrderBatch,
  OrderBatchStatus,
  OrderStatus,
  PopularMenuRow,
  SummaryRow
} from "./types";

export type BatchLinkDelivery = {
  ok: boolean;
  skipped?: boolean;
  message: string;
};

export type CreateOrderBatchResult = {
  batch: OrderBatch;
  orderUrl: string;
  emailDelivery: BatchLinkDelivery;
};

export type CloudState = {
  notes: CloudNote[];
  files: CloudFile[];
  limits: {
    maxFileSizeBytes: number;
  };
};

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
  orderPassword: string;
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

export async function fetchMyOrders(params: { batchId: string; ordererName: string; orderPassword: string }) {
  const url = new URL("/api/orders/mine", window.location.origin);
  url.searchParams.set("batchId", params.batchId);
  url.searchParams.set("ordererName", params.ordererName);
  url.searchParams.set("orderPassword", params.orderPassword);

  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "내 주문을 불러오지 못했습니다." }));
    throw new Error(error.message ?? "내 주문을 불러오지 못했습니다.");
  }

  const data = await response.json() as Order[] | Order | null;
  if (!data) return [];
  return Array.isArray(data) ? data : [data];
}

export async function cancelOwnOrder(payload: { orderId: string; batchId?: string; ordererName: string; orderPassword: string }) {
  const response = await fetch(`/api/orders/${payload.orderId}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      batchId: payload.batchId,
      ordererName: payload.ordererName,
      orderPassword: payload.orderPassword
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "주문 삭제에 실패했습니다." }));
    throw new Error(error.message ?? "주문 삭제에 실패했습니다.");
  }

  return response.json() as Promise<{ ok: true }>;
}

export async function fetchAdminOrderBatches(password: string) {
  const response = await fetch("/api/admin/order-batches", { headers: adminHeaders(password) });
  if (!response.ok) throw new Error("관리자 주문 목록을 불러오지 못했습니다.");
  return response.json() as Promise<OrderBatch[]>;
}

export async function createOrderBatch(
  password: string,
  payload: {
    title: string;
    memo?: string;
    department?: string;
    organizerName: string;
    organizerEmail: string;
    adminPassword: string;
  }
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

  return response.json() as Promise<CreateOrderBatchResult>;
}

export async function resendOrderBatchLink(password: string, batchId: string) {
  const response = await fetch(`/api/admin/order-batches/${batchId}/resend-link`, {
    method: "POST",
    headers: adminHeaders(password)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "링크 메일 재발송에 실패했습니다." }));
    throw new Error(error.message ?? "링크 메일 재발송에 실패했습니다.");
  }

  return response.json() as Promise<CreateOrderBatchResult>;
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

export async function fetchCloudState(password: string) {
  const response = await fetch("/api/admin/cloud", { headers: adminHeaders(password) });
  if (!response.ok) throw new Error("클라우드 데이터를 불러오지 못했습니다.");
  return response.json() as Promise<CloudState>;
}

export async function createCloudNote(password: string, payload: { title: string; content: string }) {
  const response = await fetch("/api/admin/cloud/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...adminHeaders(password) },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "메모를 생성하지 못했습니다." }));
    throw new Error(localizeCloudError(error.message) ?? "메모를 생성하지 못했습니다.");
  }

  return response.json() as Promise<CloudNote>;
}

export async function updateCloudNote(password: string, noteId: string, payload: { title: string; content: string }) {
  const response = await fetch(`/api/admin/cloud/notes/${noteId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...adminHeaders(password) },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "메모를 수정하지 못했습니다." }));
    throw new Error(localizeCloudError(error.message) ?? "메모를 수정하지 못했습니다.");
  }

  return response.json() as Promise<CloudNote>;
}

export async function deleteCloudNote(password: string, noteId: string) {
  const response = await fetch(`/api/admin/cloud/notes/${noteId}`, {
    method: "DELETE",
    headers: adminHeaders(password)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "메모를 삭제하지 못했습니다." }));
    throw new Error(localizeCloudError(error.message) ?? "메모를 삭제하지 못했습니다.");
  }

  return response.json() as Promise<{ ok: true }>;
}

export async function uploadCloudFile(
  password: string,
  payload: { originalName: string; mimeType: string; sizeBytes: number; contentBase64: string }
) {
  const response = await fetch("/api/admin/cloud/files", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...adminHeaders(password) },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "파일을 업로드하지 못했습니다." }));
    throw new Error(localizeCloudError(error.message) ?? "파일을 업로드하지 못했습니다.");
  }

  return response.json() as Promise<CloudFile>;
}

export async function deleteCloudFile(password: string, fileId: string) {
  const response = await fetch(`/api/admin/cloud/files/${fileId}`, {
    method: "DELETE",
    headers: adminHeaders(password)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "파일을 삭제하지 못했습니다." }));
    throw new Error(localizeCloudError(error.message) ?? "파일을 삭제하지 못했습니다.");
  }

  return response.json() as Promise<{ ok: true }>;
}

export async function downloadCloudFile(password: string, file: CloudFile) {
  const response = await fetch(`/api/admin/cloud/files/${file.id}/download`, {
    headers: adminHeaders(password)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "파일을 다운로드하지 못했습니다." }));
    throw new Error(localizeCloudError(error.message) ?? "파일을 다운로드하지 못했습니다.");
  }

  return response.blob();
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

function localizeCloudError(message?: string) {
  switch (message) {
    case "CLOUD_NOTE_TITLE_REQUIRED":
      return "메모 제목을 입력해주세요.";
    case "CLOUD_NOTE_CONTENT_REQUIRED":
      return "메모 내용을 입력해주세요.";
    case "CLOUD_NOTE_LIMIT_REACHED":
      return "메모는 최대 100개까지 저장할 수 있습니다.";
    case "CLOUD_NOTE_NOT_FOUND":
      return "메모를 찾을 수 없습니다.";
    case "CLOUD_FILE_NAME_REQUIRED":
      return "파일 이름이 올바르지 않습니다.";
    case "CLOUD_FILE_CONTENT_REQUIRED":
      return "업로드할 파일 내용이 없습니다.";
    case "CLOUD_FILE_SIZE_MISMATCH":
      return "파일 크기 정보가 올바르지 않습니다.";
    case "CLOUD_FILE_EMPTY":
      return "빈 파일은 업로드할 수 없습니다.";
    case "CLOUD_FILE_TOO_LARGE":
      return "파일 용량이 너무 큽니다. 2MB 이하 파일만 업로드할 수 있습니다.";
    case "CLOUD_FILE_LIMIT_REACHED":
      return "파일은 최대 100개까지 저장할 수 있습니다.";
    case "CLOUD_FILE_NOT_FOUND":
      return "파일을 찾을 수 없습니다.";
    case "UNAUTHORIZED":
      return "관리자 비밀번호가 올바르지 않습니다.";
    default:
      return message;
  }
}
