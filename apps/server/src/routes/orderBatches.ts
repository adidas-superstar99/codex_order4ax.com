import { Router } from "express";
import {
  createOrderBatch,
  deleteOrderBatch,
  getOrderBatchById,
  listAdminOrderBatches,
  listPublicOrderBatches,
  updateOrderBatch
} from "../services/orderService.js";

export const publicOrderBatchesRouter = Router();
export const adminOrderBatchesRouter = Router();

publicOrderBatchesRouter.get("/", async (_req, res) => {
  res.json(await listPublicOrderBatches());
});

publicOrderBatchesRouter.get("/:id", async (req, res) => {
  const batch = await getOrderBatchById(req.params.id);
  if (!batch) {
    res.status(404).json({ message: "BATCH_NOT_FOUND" });
    return;
  }

  res.json(batch);
});

adminOrderBatchesRouter.get("/", async (_req, res) => {
  res.json(await listAdminOrderBatches());
});

adminOrderBatchesRouter.post("/", async (req, res) => {
  try {
    const batch = await createOrderBatch(req.body);
    res.status(201).json(batch);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    res.status(400).json({ message });
  }
});

adminOrderBatchesRouter.patch("/:id", async (req, res) => {
  try {
    const batch = await updateOrderBatch(req.params.id, req.body);
    if (!batch) {
      res.status(404).json({ message: "BATCH_NOT_FOUND" });
      return;
    }

    res.json(batch);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    res.status(400).json({ message });
  }
});

adminOrderBatchesRouter.delete("/:id", async (req, res) => {
  const deleted = await deleteOrderBatch(req.params.id);
  if (!deleted) {
    res.status(404).json({ message: "BATCH_NOT_FOUND" });
    return;
  }

  res.json({ ok: true });
});
