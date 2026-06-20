import { createTransport } from "nodemailer";
import type Mail from "nodemailer/lib/mailer/index.js";
import { config } from "../config.js";
import type { Order, OrderBatch } from "../types.js";

export type MailDeliveryResult = {
  ok: boolean;
  skipped?: boolean;
  message: string;
};

type TransportCandidate = {
  host: string;
  port: number;
  secure: boolean;
  requireTLS?: boolean;
};

function getBaseAuth() {
  const smtpUser = config.smtpUser.trim();
  const smtpPass = config.smtpPass.replace(/\s+/g, "");
  const mailFrom = config.mailFrom.trim();

  if (!smtpUser || !smtpPass || !mailFrom) {
    return null;
  }

  return { smtpUser, smtpPass, mailFrom };
}

function getTransportCandidates(): TransportCandidate[] {
  const configuredHost = config.smtpHost.trim();
  const configuredPort = config.smtpPort;
  const configuredSecure = configuredPort === 465;
  const candidates: TransportCandidate[] = [
    {
      host: configuredHost,
      port: configuredPort,
      secure: configuredSecure,
      requireTLS: !configuredSecure
    }
  ];

  if (configuredHost === "smtp.gmail.com") {
    if (configuredPort !== 587) {
      candidates.push({ host: configuredHost, port: 587, secure: false, requireTLS: true });
    }
    if (configuredPort !== 465) {
      candidates.push({ host: configuredHost, port: 465, secure: true });
    }
  }

  return candidates;
}

function getTransport(candidate: TransportCandidate) {
  const auth = getBaseAuth();
  if (!auth) {
    return null;
  }

  return createTransport({
    host: candidate.host,
    port: candidate.port,
    secure: candidate.secure,
    requireTLS: candidate.requireTLS,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: {
      user: auth.smtpUser,
      pass: auth.smtpPass
    }
  });
}

export async function sendBatchLinkMail(batch: OrderBatch, orderUrl: string): Promise<MailDeliveryResult> {
  const auth = getBaseAuth();
  if (!auth) {
    return {
      ok: false,
      skipped: true,
      message: "MAIL_NOT_CONFIGURED"
    };
  }

  await sendMailWithFallback({
    from: auth.mailFrom,
    to: batch.organizerEmail,
    subject: `안녕하세요. ${batch.organizerName}님이 개설한 음료주문방 링크입니다.`,
    text: [
      `안녕하세요. ${batch.organizerName}님이 개설한 음료주문방의 링크는 아래와 같습니다.`,
      "",
      orderUrl,
      "",
      "회의방에 그대로 복사해서 붙여넣어 주세요."
    ].join("\n")
  });

  return {
    ok: true,
    message: "LINK_EMAIL_SENT"
  };
}

export async function sendBatchProgressMail(batch: OrderBatch, orders: Order[], orderUrl: string): Promise<MailDeliveryResult> {
  const auth = getBaseAuth();
  if (!auth) {
    return {
      ok: false,
      skipped: true,
      message: "MAIL_NOT_CONFIGURED"
    };
  }

  await sendMailWithFallback({
    from: auth.mailFrom,
    to: batch.organizerEmail,
    subject: `[음료주문 취합] ${batch.title}`,
    text: buildProgressMailBody(batch, orders, orderUrl)
  });

  return {
    ok: true,
    message: "PROGRESS_EMAIL_SENT"
  };
}

function buildProgressMailBody(batch: OrderBatch, orders: Order[], orderUrl: string) {
  const activeOrders = orders.filter((order) => order.status !== "cancelled");
  const summaryLines = summarizeOrdersForMail(activeOrders);
  const detailLines = activeOrders.flatMap((order) => [
    `${order.ordererName}${order.team ? ` (${order.team})` : ""}`,
    ...order.items.map((item) => `- ${item.menuName} / ${item.size} / ${item.quantity}${getQuantityUnit(item.brand)}${item.customRequest ? ` / 요청: ${item.customRequest}` : ""}`),
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

async function sendMailWithFallback(mailOptions: Mail.Options) {
  const candidates = getTransportCandidates();
  let lastError: unknown;

  for (const candidate of candidates) {
    const transport = getTransport(candidate);
    if (!transport) {
      throw new Error("MAIL_NOT_CONFIGURED");
    }

    try {
      await transport.sendMail(mailOptions);
      return;
    } catch (error) {
      lastError = error;
      console.error(`Mail send failed via ${candidate.host}:${candidate.port}`, error);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("MAIL_SEND_FAILED");
}
