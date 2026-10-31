import { createVerify, scryptSync, timingSafeEqual } from "node:crypto";
import { Router, type NextFunction, type Request, type Response } from "express";
import { readAiSnapshot, saveAiSnapshot } from "../aiStore.js";
import { ingestPublicKey, viewerPasswordHash } from "../aiDashboardKeys.js";

export const aiDashboardRouter = Router();
type RawRequest = Request & { rawBody?: Buffer };

function sameSecret(actual: string, expected: string): boolean {
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function verifyPassword(actual: string, encoded: string): boolean {
  const [saltHex, digestHex] = encoded.split(":");
  if (!saltHex || !digestHex || !/^[0-9a-f]+$/i.test(saltHex) || !/^[0-9a-f]+$/i.test(digestHex)) return false;
  const expected = Buffer.from(digestHex, "hex");
  if (expected.length !== 32) return false;
  const candidate = scryptSync(actual, Buffer.from(saltHex, "hex"), 32);
  return timingSafeEqual(candidate, expected);
}

export function requireAiViewer(req: Request, res: Response, next: NextFunction): void {
  const password = process.env.AI_DASHBOARD_PASSWORD || "";
  const passwordHash = process.env.AI_DASHBOARD_PASSWORD_HASH || viewerPasswordHash;
  if (!password && !passwordHash) {
    res.status(503).json({ error: "AI_DASHBOARD_NOT_CONFIGURED" });
    return;
  }
  const header = req.get("authorization") || "";
  let supplied = "";
  if (header.startsWith("Basic ")) {
    try { supplied = Buffer.from(header.slice(6), "base64").toString("utf8").split(":").slice(1).join(":"); }
    catch { supplied = ""; }
  }
  if (!supplied || !(password ? sameSecret(supplied, password) : verifyPassword(supplied, passwordHash))) {
    res.set("WWW-Authenticate", 'Basic realm="AI Dashboard"');
    res.status(401).json({ error: "UNAUTHORIZED" });
    return;
  }
  res.set("Cache-Control", "no-store");
  next();
}

function requireAiIngest(req: Request, res: Response, next: NextFunction): void {
  const key = process.env.AI_DASHBOARD_PUBLIC_KEY_B64
    ? Buffer.from(process.env.AI_DASHBOARD_PUBLIC_KEY_B64, "base64").toString("utf8") : ingestPublicKey;
  if (!key) {
    res.status(503).json({ error: "AI_INGEST_NOT_CONFIGURED" });
    return;
  }
  const signature = req.get("x-ai-signature") || "";
  const rawBody = (req as RawRequest).rawBody;
  const sentAt = isRecord(req.body) && typeof req.body.sent_at === "string" ? Date.parse(req.body.sent_at) : NaN;
  let verified = false;
  if (rawBody && signature && Number.isFinite(sentAt) && Math.abs(Date.now() - sentAt) <= 300000) {
    try {
      const verifier = createVerify("RSA-SHA256");
      verifier.update(rawBody);
      verified = verifier.verify(key, Buffer.from(signature, "base64"));
    } catch { verified = false; }
  }
  if (!verified) {
    res.status(401).json({ error: "UNAUTHORIZED" });
    return;
  }
  next();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function validSnapshot(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value) || !isRecord(value.sample) || !isRecord(value.spec)) return false;
  const sample = value.sample;
  if (typeof sample.at !== "string" || !Number.isFinite(Date.parse(sample.at))) return false;
  for (const key of ["cpu", "memory", "disk"]) {
    if (typeof sample[key] !== "number" || sample[key] < 0 || sample[key] > 100) return false;
  }
  return Array.isArray(value.history) && value.history.length <= 120 &&
    Array.isArray(value.logs) && value.logs.length <= 100 &&
    isRecord(value.google) && isRecord(value.hostinger) && isRecord(value.telegram) &&
    JSON.stringify(value).length <= 120000;
}

aiDashboardRouter.post("/ingest", requireAiIngest, async (req: Request, res: Response) => {
  if (!validSnapshot(req.body)) {
    res.status(400).json({ error: "INVALID_SNAPSHOT" });
    return;
  }
  try {
    const record = await saveAiSnapshot(req.body);
    res.status(202).json({ received_at: record.received_at });
  } catch {
    res.status(503).json({ error: "SNAPSHOT_STORE_UNAVAILABLE" });
  }
});

aiDashboardRouter.get("/status", requireAiViewer, async (_req: Request, res: Response) => {
  try {
    res.json((await readAiSnapshot()) || { snapshot: null, received_at: null });
  } catch {
    res.status(503).json({ error: "SNAPSHOT_STORE_UNAVAILABLE" });
  }
});
