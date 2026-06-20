import { Router } from "express";
import type { Request, Response } from "express";
import { ordersToCsv } from "../services/exportService.js";
import {
  bulkUpdateOrderStatus,
  cancelOwnOrder,
  createOrder,
  deleteOrder,
  getOrderBatchById,
  isOrderStatus,
  listOrders,
  listPopularMenus,
  summarizeOrders,
  updateOrderStatus
} from "../services/orderService.js";
import { sendBatchProgressMail } from "../services/mailService.js";
import { config } from "../config.js";
import type { Brand } from "../types.js";

export const publicOrdersRouter = Router();
export const ordersRouter = Router();

publicOrdersRouter.post("/", async (req: Request, res: Response) => {
  try {
    const order = await createOrder(req.body);
    if (order.batchId) {
      const batch = await getOrderBatchById(order.batchId);
      if (batch) {
        const orderUrl = buildOrderUrl(req, batch.id);
        const allOrders = await listOrders({ batchId: batch.id });
        void sendBatchProgressMail(batch, allOrders, orderUrl).catch((error) => {
          console.error("Failed to send batch progress mail", error);
        });
      }
    }
    res.status(201).json(order);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    res.status(400).json({ message });
  }
});

publicOrdersRouter.get("/popular", async (req: Request, res: Response) => {
  try {
    const batchId = typeof req.query.batchId === "string" ? req.query.batchId : undefined;
    const brand = typeof req.query.brand === "string" ? (req.query.brand as Brand) : undefined;
    const date = typeof req.query.date === "string" ? req.query.date : undefined;
    const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;
    res.json(await listPopularMenus({ batchId, brand, date, limit: Number.isFinite(limit) ? limit : undefined }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    res.status(500).json({ message });
  }
});

publicOrdersRouter.get("/mine", async (req: Request, res: Response) => {
  try {
    const batchId = typeof req.query.batchId === "string" ? req.query.batchId : undefined;
    const ordererName = typeof req.query.ordererName === "string" ? req.query.ordererName.trim() : "";
    const orderPassword = typeof req.query.orderPassword === "string" ? req.query.orderPassword.trim() : "";

    if (!batchId) {
      res.status(400).json({ message: "BATCH_REQUIRED" });
      return;
    }

    if (!ordererName) {
      res.status(400).json({ message: "ORDERER_NAME_REQUIRED" });
      return;
    }

    if (!orderPassword) {
      res.status(400).json({ message: "ORDER_PASSWORD_REQUIRED" });
      return;
    }

    res.json(await listOrders({ batchId, ordererName, orderPassword }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    res.status(500).json({ message });
  }
});

publicOrdersRouter.post("/:id/cancel", async (req: Request, res: Response) => {
  try {
    const ordererName = String(req.body.ordererName ?? "").trim();
    const orderPassword = String(req.body.orderPassword ?? "").trim();
    const batchId = typeof req.body.batchId === "string" ? req.body.batchId : undefined;

    if (!ordererName) {
      res.status(400).json({ message: "ORDERER_NAME_REQUIRED" });
      return;
    }

    if (!orderPassword) {
      res.status(400).json({ message: "ORDER_PASSWORD_REQUIRED" });
      return;
    }

    res.json(await cancelOwnOrder({ orderId: req.params.id, batchId, ordererName, orderPassword }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    res.status(400).json({ message });
  }
});

ordersRouter.get("/", async (req: Request, res: Response) => {
  try {
    const filters = readFilters(req.query);
    res.json(await listOrders(filters));
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    res.status(500).json({ message });
  }
});

ordersRouter.get("/summary", async (req: Request, res: Response) => {
  try {
    const filters = readFilters(req.query);
    res.json(await summarizeOrders(filters));
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    res.status(500).json({ message });
  }
});

ordersRouter.get("/export.csv", async (req: Request, res: Response) => {
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

ordersRouter.patch("/:id/status", async (req: Request, res: Response) => {
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

ordersRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const deleted = await deleteOrder(req.params.id);
    if (!deleted) {
      res.status(404).json({ message: "ORDER_NOT_FOUND" });
      return;
    }

    res.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    res.status(500).json({ message });
  }
});

ordersRouter.post("/bulk-status", async (req: Request, res: Response) => {
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
    batchId: typeof query.batchId === "string" ? query.batchId : undefined,
    date: typeof query.date === "string" ? query.date : undefined,
    brand: typeof query.brand === "string" ? (query.brand as Brand) : undefined,
    status
  };
}

function buildOrderUrl(req: Request, batchId: string) {
  const baseUrl = config.publicAppUrl || `${req.protocol}://${req.get("host")}`;
  return new URL(`/order/${batchId}`, baseUrl).toString();
}
