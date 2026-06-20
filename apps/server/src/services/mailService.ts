import { createTransport } from "nodemailer";
import { config } from "../config.js";
import type { OrderBatch } from "../types.js";

export type MailDeliveryResult = {
  ok: boolean;
  skipped?: boolean;
  message: string;
};

function getTransport() {
  if (!config.smtpUser || !config.smtpPass || !config.mailFrom) {
    return null;
  }

  return createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass
    }
  });
}

export async function sendBatchLinkMail(batch: OrderBatch, orderUrl: string): Promise<MailDeliveryResult> {
  const transport = getTransport();
  if (!transport) {
    return {
      ok: false,
      skipped: true,
      message: "MAIL_NOT_CONFIGURED"
    };
  }

  await transport.sendMail({
    from: config.mailFrom,
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
