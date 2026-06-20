import { randomBytes } from "node:crypto";
import { Router } from "express";
import type { Request, Response } from "express";
import { config } from "../config.js";
import { sendBatchLinkMail } from "../services/mailService.js";
import { buildOrderUrl } from "../services/urlService.js";
import { createOrderBatch, getOrderBatchById, getOrderBatchBySource } from "../services/orderService.js";

export const integrationsRouter = Router();

integrationsRouter.post("/hermes/meeting-email", async (req: Request, res: Response) => {
  if (!isHermesAuthorized(req)) {
    res.status(401).json({ message: "UNAUTHORIZED_HERMES" });
    return;
  }

  try {
    const sourceExternalId = String(req.body.sourceExternalId ?? "").trim();
    const meetingTitle = String(req.body.meetingTitle ?? "").trim();
    const organizerEmail = String(req.body.organizerEmail ?? "").trim().toLowerCase();
    const organizerName = String(req.body.organizerName ?? "").trim() || deriveOrganizerName(organizerEmail);
    const department = String(req.body.department ?? "").trim() || "AX팀";
    const memo = typeof req.body.memo === "string" ? req.body.memo : "";
    const autoSendLink = req.body.autoSendLink !== false;

    if (!sourceExternalId) {
      res.status(400).json({ message: "SOURCE_EXTERNAL_ID_REQUIRED" });
      return;
    }

    if (!meetingTitle) {
      res.status(400).json({ message: "MEETING_TITLE_REQUIRED" });
      return;
    }

    if (!organizerEmail) {
      res.status(400).json({ message: "ORGANIZER_EMAIL_REQUIRED" });
      return;
    }

    const existingBatch = await getOrderBatchBySource("hermes-meeting-email", sourceExternalId);
    if (existingBatch) {
      const orderUrl = buildOrderUrl(req, existingBatch.id);
      res.json({ batch: existingBatch, orderUrl, duplicate: true });
      return;
    }

    const batch = await createOrderBatch({
      title: meetingTitle,
      memo,
      department,
      organizerName,
      organizerEmail,
      adminPassword: String(req.body.batchAdminPassword ?? "").trim() || randomBytes(8).toString("hex"),
      sourceType: "hermes-meeting-email",
      sourceExternalId
    });

    const createdBatch = (await getOrderBatchById(batch.id)) ?? batch;
    const orderUrl = buildOrderUrl(req, createdBatch.id);

    if (autoSendLink) {
      void sendBatchLinkMail(createdBatch, orderUrl).catch((error) => {
        console.error("Failed to send Hermes-created batch link mail", error);
      });
    }

    res.status(201).json({ batch: createdBatch, orderUrl, duplicate: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    res.status(400).json({ message });
  }
});

function isHermesAuthorized(req: Request) {
  const expectedToken = config.hermesWebhookToken.trim();
  if (!expectedToken) {
    return false;
  }

  const bearerToken = req.header("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const headerToken = req.header("x-hermes-token")?.trim();
  return bearerToken === expectedToken || headerToken === expectedToken;
}

function deriveOrganizerName(organizerEmail: string) {
  return organizerEmail.split("@")[0] || "회의 개설자";
}
