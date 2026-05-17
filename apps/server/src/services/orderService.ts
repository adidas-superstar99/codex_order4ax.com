import { nanoid } from "nanoid";
import { isPostgres, pgAll, pgOne, sqliteDb, withPgTransaction } from "../db.js";
import type {
  Brand,
  CreateOrderBatchInput,
  CreateOrderInput,
  Order,
  OrderBatch,
  OrderBatchStatus,
  OrderItem,
  OrderStatus,
  UpdateOrderBatchInput
} from "../types.js";

const statuses: OrderStatus[] = ["submitted", "confirmed", "ordered", "completed", "cancelled"];
const batchStatuses: OrderBatchStatus[] = ["open", "closed"];

type OrderRow = {
  id: string;
  batch_id: string | null;
  ordered_at: string;
  orderer_name: string;
  team: string | null;
  contact: string | null;
  memo: string | null;
  status: OrderStatus;
};

type OrderItemRow = {
  id: string;
  order_id: string;
  brand: Brand;
  menu_id: string;
  menu_name: string;
  category: string;
  size: string;
  quantity: number;
  custom_request: string | null;
};

type OrderBatchRow = {
  id: string;
  title: string;
  memo: string | null;
  department: string;
  status: OrderBatchStatus;
  created_at: string;
  closed_at: string | null;
};

export function isOrderStatus(value: string): value is OrderStatus {
  return statuses.includes(value as OrderStatus);
}

export function isOrderBatchStatus(value: string): value is OrderBatchStatus {
  return batchStatuses.includes(value as OrderBatchStatus);
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const ordererName = input.ordererName.trim();
  const batchId = input.batchId?.trim();
  if (!batchId) throw new Error("BATCH_REQUIRED");
  if (!ordererName) throw new Error("ORDERER_NAME_REQUIRED");
  if (!input.items.length) throw new Error("ORDER_ITEMS_REQUIRED");

  const batch = await getOrderBatchById(batchId);
  if (!batch) throw new Error("BATCH_NOT_FOUND");
  if (batch.status !== "open") throw new Error("BATCH_CLOSED");

  const orderedAt = new Date().toISOString();
  const orderId = nanoid();

  for (const item of input.items) {
    if (!item.quantity || item.quantity < 1) {
      throw new Error("INVALID_QUANTITY");
    }
  }

  if (isPostgres()) {
    await withPgTransaction(async (client) => {
      await client.query(
        `INSERT INTO orders (id, batch_id, ordered_at, orderer_name, team, contact, memo, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'submitted')`,
        [orderId, batchId, orderedAt, ordererName, input.team?.trim() || null, input.contact?.trim() || null, input.memo?.trim() || null]
      );

      for (const item of input.items) {
        await client.query(
          `INSERT INTO order_items (
             id, order_id, brand, menu_id, menu_name, category, size, quantity, custom_request
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            nanoid(),
            orderId,
            item.brand,
            item.menuId,
            item.menuName,
            item.category,
            item.size,
            item.quantity,
            item.customRequest?.trim() || null
          ]
        );
      }
    });
    return (await getOrderById(orderId))!;
  }

  const insertOrder = sqliteDb!.prepare(`
    INSERT INTO orders (id, batch_id, ordered_at, orderer_name, team, contact, memo, status)
    VALUES (@id, @batchId, @orderedAt, @ordererName, @team, @contact, @memo, 'submitted')
  `);
  const insertItem = sqliteDb!.prepare(`
    INSERT INTO order_items (
      id, order_id, brand, menu_id, menu_name, category, size, quantity, custom_request
    ) VALUES (
      @id, @orderId, @brand, @menuId, @menuName, @category, @size, @quantity, @customRequest
    )
  `);

  const transaction = sqliteDb!.transaction(() => {
    insertOrder.run({
      id: orderId,
      batchId,
      orderedAt,
      ordererName,
      team: input.team?.trim() || null,
      contact: input.contact?.trim() || null,
      memo: input.memo?.trim() || null
    });

    for (const item of input.items) {
      insertItem.run({
        id: nanoid(),
        orderId,
        brand: item.brand,
        menuId: item.menuId,
        menuName: item.menuName,
        category: item.category,
        size: item.size,
        quantity: item.quantity,
        customRequest: item.customRequest?.trim() || null
      });
    }
  });

  transaction();
  return (await getOrderById(orderId))!;
}

export async function listOrders(filters: { batchId?: string; date?: string; brand?: Brand; status?: OrderStatus }) {
  const clauses: string[] = [];
  const values: unknown[] = [];

  if (filters.batchId) {
    clauses.push(`o.batch_id = $${values.push(filters.batchId)}`);
  }

  if (filters.date) {
    const range = getKoreanDateRange(filters.date);
    clauses.push(`o.ordered_at >= $${values.push(range.start)} AND o.ordered_at < $${values.push(range.end)}`);
  }

  if (filters.status) {
    clauses.push(`o.status = $${values.push(filters.status)}`);
  }

  if (filters.brand) {
    clauses.push(`EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.brand = $${values.push(filters.brand)})`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  if (isPostgres()) {
    const rows = await pgAll<OrderRow>(`SELECT * FROM orders o ${where} ORDER BY o.ordered_at DESC`, values);
    return Promise.all(rows.map(mapOrderRowAsync));
  }

  const sqliteParams: Record<string, string> = {};
  if (filters.batchId) sqliteParams.batchId = filters.batchId;
  if (filters.date) {
    const range = getKoreanDateRange(filters.date);
    sqliteParams.startDate = range.start;
    sqliteParams.endDate = range.end;
  }
  if (filters.status) sqliteParams.status = filters.status;
  if (filters.brand) sqliteParams.brand = filters.brand;

  const sqliteClauses: string[] = [];
  if (filters.batchId) sqliteClauses.push("o.batch_id = @batchId");
  if (filters.date) sqliteClauses.push("o.ordered_at >= @startDate AND o.ordered_at < @endDate");
  if (filters.status) sqliteClauses.push("o.status = @status");
  if (filters.brand) sqliteClauses.push("EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.brand = @brand)");
  const sqliteWhere = sqliteClauses.length ? `WHERE ${sqliteClauses.join(" AND ")}` : "";
  const rows = sqliteDb!.prepare(`SELECT * FROM orders o ${sqliteWhere} ORDER BY o.ordered_at DESC`).all(sqliteParams) as OrderRow[];
  return rows.map(mapOrderRowSync);
}

export async function getOrderById(orderId: string): Promise<Order | undefined> {
  if (isPostgres()) {
    const row = await pgOne<OrderRow>("SELECT * FROM orders WHERE id = $1", [orderId]);
    return row ? mapOrderRowAsync(row) : undefined;
  }

  const row = sqliteDb!.prepare("SELECT * FROM orders WHERE id = ?").get(orderId) as OrderRow | undefined;
  return row ? mapOrderRowSync(row) : undefined;
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  if (isPostgres()) {
    const result = await pgOne<{ id: string }>("UPDATE orders SET status = $1 WHERE id = $2 RETURNING id", [status, orderId]);
    return result ? getOrderById(orderId) : undefined;
  }

  const result = sqliteDb!.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, orderId);
  if (result.changes === 0) return undefined;
  return getOrderById(orderId);
}

export async function deleteOrder(orderId: string) {
  if (isPostgres()) {
    await pgOne("DELETE FROM order_items WHERE order_id = $1", [orderId]);
    const result = await pgOne<{ id: string }>("DELETE FROM orders WHERE id = $1 RETURNING id", [orderId]);
    return Boolean(result);
  }

  sqliteDb!.prepare("DELETE FROM order_items WHERE order_id = ?").run(orderId);
  const result = sqliteDb!.prepare("DELETE FROM orders WHERE id = ?").run(orderId);
  return result.changes > 0;
}

export async function summarizeOrders(filters: { batchId?: string; date?: string; brand?: Brand; status?: OrderStatus }) {
  const orders = await listOrders(filters);
  type SummaryGroup = {
    brand: Brand;
    menuName: string;
    category: string;
    size: string;
    quantity: number;
    requests: Array<{ ordererName: string; customRequest: string }>;
  };
  const groups = new Map<string, SummaryGroup>();

  for (const order of orders) {
    for (const item of order.items) {
      const key = `${item.brand}|${item.category}|${item.menuName}|${item.size}`;
      const group: SummaryGroup = groups.get(key) ?? {
        brand: item.brand,
        menuName: item.menuName,
        category: item.category,
        size: item.size,
        quantity: 0,
        requests: []
      };

      group.quantity += item.quantity;
      if (item.customRequest) {
        group.requests.push({ ordererName: order.ordererName, customRequest: item.customRequest });
      }
      groups.set(key, group);
    }
  }

  return [...groups.values()].sort((a, b) =>
    `${a.brand}${a.category}${a.menuName}${a.size}`.localeCompare(`${b.brand}${b.category}${b.menuName}${b.size}`)
  );
}

export async function bulkUpdateOrderStatus(
  filters: { batchId?: string; date?: string; brand?: Brand; status?: OrderStatus },
  nextStatus: OrderStatus
) {
  const orders = await listOrders(filters);
  const targetOrders: Order[] = orders.filter((order) => order.status !== "cancelled" && order.status !== nextStatus);

  if (!targetOrders.length) {
    return { updatedCount: 0 };
  }

  if (isPostgres()) {
    for (const order of targetOrders) {
      await pgOne<{ id: string }>("UPDATE orders SET status = $1 WHERE id = $2 RETURNING id", [nextStatus, order.id]);
    }
    return { updatedCount: targetOrders.length };
  }

  const statement = sqliteDb!.prepare("UPDATE orders SET status = ? WHERE id = ?");
  const transaction = sqliteDb!.transaction(() => {
    for (const order of targetOrders) {
      statement.run(nextStatus, order.id);
    }
  });
  transaction();
  return { updatedCount: targetOrders.length };
}

export async function listPopularMenus(filters: { batchId?: string; date?: string; brand?: Brand; limit?: number }) {
  const orders = await listOrders({
    batchId: filters.batchId,
    date: filters.date ?? getCurrentKoreanDate(),
    brand: filters.brand
  });
  const groups = new Map<string, { menuId: string; menuName: string; category: string; quantity: number; ordererNames: string[] }>();

  for (const order of orders) {
    if (order.status === "cancelled") continue;

    for (const item of order.items) {
      const key = item.menuId;
        const group = groups.get(key) ?? {
          menuId: item.menuId,
          menuName: item.menuName,
          category: item.category,
          quantity: 0,
          ordererNames: []
        };
      group.quantity += item.quantity;
      if (!group.ordererNames.includes(order.ordererName)) {
        group.ordererNames.push(order.ordererName);
      }
      groups.set(key, group);
    }
  }

  return [...groups.values()]
    .sort((a, b) => b.quantity - a.quantity || a.menuName.localeCompare(b.menuName))
    .slice(0, filters.limit ?? 3);
}

export async function listPublicOrderBatches() {
  return listOrderBatches("open");
}

export async function listAdminOrderBatches() {
  return listOrderBatches();
}

export async function getOrderBatchById(batchId: string) {
  if (isPostgres()) {
    const row = await pgOne<OrderBatchRow>("SELECT * FROM order_batches WHERE id = $1", [batchId]);
    return row ? mapOrderBatchRow(row) : undefined;
  }

  const row = sqliteDb!.prepare("SELECT * FROM order_batches WHERE id = ?").get(batchId) as OrderBatchRow | undefined;
  return row ? mapOrderBatchRow(row) : undefined;
}

export async function createOrderBatch(input: CreateOrderBatchInput) {
  const title = input.title?.trim();
  if (!title) throw new Error("BATCH_TITLE_REQUIRED");

  const batch: OrderBatch = {
    id: nanoid(),
    title,
    memo: input.memo?.trim() || undefined,
    department: input.department?.trim() || "AX팀",
    status: "open",
    createdAt: new Date().toISOString()
  };

  if (isPostgres()) {
    await pgOne(
      `INSERT INTO order_batches (id, title, memo, department, status, created_at, closed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [batch.id, batch.title, batch.memo ?? null, batch.department, batch.status, batch.createdAt, null]
    );
    return batch;
  }

  sqliteDb!.prepare(`
    INSERT INTO order_batches (id, title, memo, department, status, created_at, closed_at)
    VALUES (@id, @title, @memo, @department, @status, @createdAt, @closedAt)
  `).run({
    id: batch.id,
    title: batch.title,
    memo: batch.memo ?? null,
    department: batch.department,
    status: batch.status,
    createdAt: batch.createdAt,
    closedAt: null
  });

  return batch;
}

export async function updateOrderBatch(batchId: string, input: UpdateOrderBatchInput) {
  const batch = await getOrderBatchById(batchId);
  if (!batch) return undefined;

  const nextStatus = input.status ?? batch.status;
  if (!isOrderBatchStatus(nextStatus)) {
    throw new Error("INVALID_BATCH_STATUS");
  }

  const updated: OrderBatch = {
    ...batch,
    title: input.title?.trim() || batch.title,
    memo: input.memo !== undefined ? input.memo.trim() || undefined : batch.memo,
    department: input.department?.trim() || batch.department,
    status: nextStatus,
    closedAt: nextStatus === "closed" ? batch.closedAt ?? new Date().toISOString() : undefined
  };

  if (nextStatus === "open") {
    updated.closedAt = undefined;
  }

  if (isPostgres()) {
    await pgOne(
      `UPDATE order_batches
       SET title = $1, memo = $2, department = $3, status = $4, closed_at = $5
       WHERE id = $6
       RETURNING id`,
      [updated.title, updated.memo ?? null, updated.department, updated.status, updated.closedAt ?? null, batchId]
    );
    return updated;
  }

  sqliteDb!.prepare(`
    UPDATE order_batches
    SET title = @title, memo = @memo, department = @department, status = @status, closed_at = @closedAt
    WHERE id = @id
  `).run({
    id: batchId,
    title: updated.title,
    memo: updated.memo ?? null,
    department: updated.department,
    status: updated.status,
    closedAt: updated.closedAt ?? null
  });

  return updated;
}

export async function deleteOrderBatch(batchId: string) {
  if (isPostgres()) {
    const result = await pgOne<{ id: string }>("DELETE FROM order_batches WHERE id = $1 RETURNING id", [batchId]);
    return Boolean(result);
  }

  const result = sqliteDb!.prepare("DELETE FROM order_batches WHERE id = ?").run(batchId);
  return result.changes > 0;
}

async function listOrderBatches(status?: OrderBatchStatus) {
  if (isPostgres()) {
    const rows = status
      ? await pgAll<OrderBatchRow>("SELECT * FROM order_batches WHERE status = $1 ORDER BY created_at DESC", [status])
      : await pgAll<OrderBatchRow>("SELECT * FROM order_batches ORDER BY created_at DESC");
    return rows.map(mapOrderBatchRow);
  }

  if (status) {
    const rows = sqliteDb!
      .prepare("SELECT * FROM order_batches WHERE status = ? ORDER BY created_at DESC")
      .all(status) as OrderBatchRow[];
    return rows.map(mapOrderBatchRow);
  }

  const rows = sqliteDb!.prepare("SELECT * FROM order_batches ORDER BY created_at DESC").all() as OrderBatchRow[];
  return rows.map(mapOrderBatchRow);
}

function getKoreanDateRange(date: string) {
  const start = new Date(`${date}T00:00:00+09:00`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

function getCurrentKoreanDate() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

async function mapOrderRowAsync(row: OrderRow): Promise<Order> {
  const items = await pgAll<OrderItemRow>("SELECT * FROM order_items WHERE order_id = $1 ORDER BY id ASC", [row.id]);
  return {
    id: row.id,
    batchId: row.batch_id ?? undefined,
    orderedAt: row.ordered_at,
    ordererName: row.orderer_name,
    team: row.team ?? undefined,
    contact: row.contact ?? undefined,
    memo: row.memo ?? undefined,
    status: row.status,
    items: items.map(mapOrderItemRow)
  };
}

function mapOrderRowSync(row: OrderRow): Order {
  const items = sqliteDb!
    .prepare("SELECT * FROM order_items WHERE order_id = ? ORDER BY rowid ASC")
    .all(row.id) as OrderItemRow[];

  return {
    id: row.id,
    batchId: row.batch_id ?? undefined,
    orderedAt: row.ordered_at,
    ordererName: row.orderer_name,
    team: row.team ?? undefined,
    contact: row.contact ?? undefined,
    memo: row.memo ?? undefined,
    status: row.status,
    items: items.map(mapOrderItemRow)
  };
}

function mapOrderItemRow(row: OrderItemRow): OrderItem {
  return {
    id: row.id,
    orderId: row.order_id,
    brand: row.brand,
    menuId: row.menu_id,
    menuName: row.menu_name,
    category: row.category,
    size: row.size,
    quantity: row.quantity,
    customRequest: row.custom_request ?? undefined
  };
}

function mapOrderBatchRow(row: OrderBatchRow): OrderBatch {
  return {
    id: row.id,
    title: row.title,
    memo: row.memo ?? undefined,
    department: row.department,
    status: row.status,
    createdAt: row.created_at,
    closedAt: row.closed_at ?? undefined
  };
}
