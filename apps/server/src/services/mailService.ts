import { config } from "../config.js";
import type { Order, OrderBatch } from "../types.js";

export type MailDeliveryResult = {
  ok: boolean;
  skipped?: boolean;
  message: string;
};

type HermesMailPayload = {
  action: "send_email";
  provider: "gmail";
  account?: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  tags: string[];
  metadata: Record<string, string | number | boolean | null | undefined>;
};

function getHermesConfig() {
  const apiUrl = config.hermesApiUrl.trim();
  const apiToken = config.hermesApiToken.trim();

  if (!apiUrl || !apiToken) {
    return null;
  }

  return {
    apiUrl,
    apiToken,
    account: config.hermesMailAccount.trim() || undefined
  };
}

export async function sendBatchLinkMail(batch: OrderBatch, orderUrl: string): Promise<MailDeliveryResult> {
  const hermesConfig = getHermesConfig();
  if (!hermesConfig) {
    return {
      ok: false,
      skipped: true,
      message: "MAIL_NOT_CONFIGURED"
    };
  }

  await sendHermesMail({
    to: batch.organizerEmail,
    subject: `안녕하세요. ${batch.organizerName}님이 개설한 음료주문방 링크입니다.`,
    text: [
      `안녕하세요. ${batch.organizerName}님이 개설한 음료주문방의 링크는 아래와 같습니다.`,
      "",
      orderUrl,
      "",
      "회의방에 그대로 복사해서 붙여 넣어 사용하시면 됩니다."
    ].join("\n"),
    html: [
      `<p>안녕하세요. <strong>${escapeHtml(batch.organizerName)}</strong>님이 개설한 음료주문방의 링크는 아래와 같습니다.</p>`,
      `<p><a href="${escapeHtml(orderUrl)}">${escapeHtml(orderUrl)}</a></p>`,
      "<p>회의방에 그대로 복사해서 붙여 넣어 사용하시면 됩니다.</p>"
    ].join(""),
    tags: ["batch-link", "order-batch"],
    metadata: {
      batchId: batch.id,
      batchTitle: batch.title,
      organizerEmail: batch.organizerEmail,
      orderUrl
    }
  });

  return {
    ok: true,
    message: "LINK_EMAIL_SENT"
  };
}

export async function sendBatchProgressMail(batch: OrderBatch, orders: Order[], orderUrl: string): Promise<MailDeliveryResult> {
  const hermesConfig = getHermesConfig();
  if (!hermesConfig) {
    return {
      ok: false,
      skipped: true,
      message: "MAIL_NOT_CONFIGURED"
    };
  }

  await sendHermesMail({
    to: batch.organizerEmail,
    subject: `[음료주문 취합] ${batch.title}`,
    text: buildProgressMailBody(batch, orders, orderUrl),
    html: buildProgressMailHtml(batch, orders, orderUrl),
    tags: ["batch-progress", "order-batch"],
    metadata: {
      batchId: batch.id,
      batchTitle: batch.title,
      organizerEmail: batch.organizerEmail,
      orderCount: orders.filter((order) => order.status !== "cancelled").length,
      orderUrl
    }
  });

  return {
    ok: true,
    message: "PROGRESS_EMAIL_SENT"
  };
}

async function sendHermesMail(input: Omit<HermesMailPayload, "action" | "provider" | "account">) {
  const hermesConfig = getHermesConfig();
  if (!hermesConfig) {
    throw new Error("MAIL_NOT_CONFIGURED");
  }

  const response = await fetch(hermesConfig.apiUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${hermesConfig.apiToken}`
    },
    body: JSON.stringify({
      action: "send_email",
      provider: "gmail",
      account: hermesConfig.account,
      ...input
    } satisfies HermesMailPayload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `HERMES_MAIL_SEND_FAILED_${response.status}`);
  }
}

function buildProgressMailBody(batch: OrderBatch, orders: Order[], orderUrl: string) {
  const activeOrders = orders.filter((order) => order.status !== "cancelled");
  const summaryLines = summarizeOrdersForMail(activeOrders);
  const detailLines = activeOrders.flatMap((order) => [
    `${order.ordererName}${order.team ? ` (${order.team})` : ""}`,
    ...order.items.map(
      (item) =>
        `- ${item.menuName} / ${item.size} / ${item.quantity}${getQuantityUnit(item.brand)}${item.customRequest ? ` / 요청: ${item.customRequest}` : ""}`
    ),
    ""
  ]);

  return [
    `주문방: ${batch.title}`,
    `개설자: ${batch.organizerName}`,
    `현재 주문 수: ${activeOrders.length}건`,
    "",
    "[메뉴별 취합]",
    ...(summaryLines.length ? summaryLines : ["아직 취합된 주문이 없습니다."]),
    "",
    "[주문자별 상세]",
    ...(detailLines.length ? detailLines : ["아직 제출된 주문이 없습니다.", ""]),
    `주문방 링크: ${orderUrl}`
  ].join("\n");
}

function buildProgressMailHtml(batch: OrderBatch, orders: Order[], orderUrl: string) {
  const activeOrders = orders.filter((order) => order.status !== "cancelled");
  const summaryLines = summarizeOrdersForMail(activeOrders);

  const detailMarkup = activeOrders.length
    ? activeOrders
        .map((order) => {
          const items = order.items
            .map(
              (item) =>
                `<li>${escapeHtml(item.menuName)} / ${escapeHtml(item.size)} / ${item.quantity}${escapeHtml(
                  getQuantityUnit(item.brand)
                )}${item.customRequest ? ` / 요청: ${escapeHtml(item.customRequest)}` : ""}</li>`
            )
            .join("");

          return `<li><strong>${escapeHtml(order.ordererName)}${order.team ? ` (${escapeHtml(order.team)})` : ""}</strong><ul>${items}</ul></li>`;
        })
        .join("")
    : "<li>아직 제출된 주문이 없습니다.</li>";

  const summaryMarkup = summaryLines.length
    ? summaryLines.map((line) => `<li>${escapeHtml(line.replace(/^- /, ""))}</li>`).join("")
    : "<li>아직 취합된 주문이 없습니다.</li>";

  return [
    `<p><strong>주문방:</strong> ${escapeHtml(batch.title)}</p>`,
    `<p><strong>개설자:</strong> ${escapeHtml(batch.organizerName)}</p>`,
    `<p><strong>현재 주문 수:</strong> ${activeOrders.length}건</p>`,
    "<p><strong>메뉴별 취합</strong></p>",
    `<ul>${summaryMarkup}</ul>`,
    "<p><strong>주문자별 상세</strong></p>",
    `<ul>${detailMarkup}</ul>`,
    `<p><strong>주문방 링크:</strong> <a href="${escapeHtml(orderUrl)}">${escapeHtml(orderUrl)}</a></p>`
  ].join("");
}

function summarizeOrdersForMail(orders: Order[]) {
  const summary = new Map<string, number>();

  for (const order of orders) {
    for (const item of order.items) {
      const key = `${item.menuName} / ${item.size}`;
      summary.set(key, (summary.get(key) ?? 0) + item.quantity);
    }
  }

  return [...summary.entries()]
    .sort(([left], [right]) => left.localeCompare(right, "ko"))
    .map(([key, quantity]) => `- ${key} / ${quantity}`);
}

function getQuantityUnit(brand: Order["items"][number]["brand"]) {
  return brand === "EMART" ? "개" : "잔";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
