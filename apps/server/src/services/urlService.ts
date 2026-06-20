import type { Request } from "express";
import { config } from "../config.js";

export function buildOrderUrl(req: Request, batchId: string) {
  const baseUrl = config.publicAppUrl || `${req.protocol}://${req.get("host")}`;
  return new URL(`/order/${batchId}`, baseUrl).toString();
}
