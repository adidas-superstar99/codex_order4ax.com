import { Router } from "express";
import { ordersToCsv } from "../services/exportService.js";
import {
  bulkUpdateOrderStatus,
  createOrder,
  isOrderStatus,
  listOrders,
  listPopularMenus,
  summarizeOrders,
  updateOrderStatus
} from "../services/orderService.js";
import type { Brand } from "../types.js";

export const publicOrdersRouter = Router();
export const ordersRouter = Router();

publicOrdersRouter.post("/", async (req, res) => {
  try {
    const order = await createOrder(req.body);
    res.status(201).json(order);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    res.status(400).json({ message });
  }
});

publicOrdersRouter.get("/popular", async (req, res) => {
  try {
    const brand = typeof req.query.brand === "string" ? (req.query.brand as Brand) : undefined;
    const date = typeof req.query.date === "string" ? req.query.date : undefined;
    const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;
    res.json(await listPopularMenus({ brand, date, limit: Number.isFinite(limit) ? limit : undefined }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    res.status(500).json({ message });
  }
});

ordersRouter.get("/", async (req, res) => {
  try {
    const filters = readFilters(req.query);
    res.json(await listOrders(filters));
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    res.status(500).json({ message });
  }
});

ordersRouter.get("/summary", async (req, res) => {
  try {
    const filters = readFilters(req.query);
    res.json(await summarizeOrders(filters));
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    res.status(500).json({ message });
  }
});

ordersRouter.get("/export.csv", async (req, res) => {
  try {
    const filters = readFilters(req.query);
    const csv = ordersToCsv(await listOrders(filters));
    res.header("Content-Type", "text/csv; charset=utf-8");
    res.header("Content-Disposition", `attachment; filename="orders-${filters.date ?? "all"}.csv"`);
    res.send(`\uFEFF${csv}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    res.status(500).json({ message });
  }
});

ordersRouter.patch("/:id/status", async (req, res) => {
  try {
    const status = String(req.body.status ?? "");
    if (!isOrderStatus(status)) {
      res.status(400).json({ message: "INVALID_STATUS" });
      return;
    }

    const order = await updateOrderStatus(req.params.id, status);
    if (!order) {
      res.status(404).json({ message: "ORDER_NOT_FOUND" });
      return;
    }

    res.json(order);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    res.status(500).json({ message });
  }
});

ordersRouter.post("/bulk-status", async (req, res) => {
  try {
    const status = String(req.body.status ?? "");
    if (!isOrderStatus(status)) {
      res.status(400).json({ message: "INVALID_STATUS" });
      return;
    }

    const filters = readFilters(req.body.filters ?? {});
    res.json(await bulkUpdateOrderStatus(filters, status));
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    res.status(500).json({ message });
  }
});

function readFilters(query: Record<string, unknown>) {
  const status = typeof query.status === "string" && isOrderStatus(query.status) ? query.status : undefined;
  return {
    date: typeof query.date === "string" ? query.date : undefined,
    brand: typeof query.brand === "string" ? (query.brand as Brand) : undefined,
    status
  };
}
