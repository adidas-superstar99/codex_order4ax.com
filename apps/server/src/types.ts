export type Brand = "STARBUCKS" | "TWOSOME" | "EMART";

export type Menu = {
  id: string;
  brand: Brand;
  category: string;
  subcategory?: string;
  name: string;
  imageUrl: string;
  sourceUrl: string;
  salesRank?: number;
  isNew?: boolean;
  isSeasonal?: boolean;
  availableSizes: string[];
  createdAt: string;
  updatedAt: string;
};

export type OrderStatus = "submitted" | "confirmed" | "ordered" | "completed" | "cancelled";

export type OrderBatchStatus = "open" | "closed";

export type OrderBatch = {
  id: string;
  title: string;
  memo?: string;
  department: string;
  status: OrderBatchStatus;
  activeBrand?: Brand;
  createdAt: string;
  closedAt?: string;
};

export type OrderItem = {
  id: string;
  orderId: string;
  brand: Brand;
  menuId: string;
  menuName: string;
  category: string;
  size: string;
  quantity: number;
  customRequest?: string;
};

export type Order = {
  id: string;
  batchId?: string;
  orderedAt: string;
  ordererName: string;
  team?: string;
  contact?: string;
  memo?: string;
  status: OrderStatus;
  items: OrderItem[];
};

export type CreateOrderInput = {
  batchId: string;
  ordererName: string;
  team?: string;
  contact?: string;
  memo?: string;
  items: Array<{
    brand: Brand;
    menuId: string;
    menuName: string;
    category: string;
    size: string;
    quantity: number;
    customRequest?: string;
  }>;
};

export type CreateOrderBatchInput = {
  title: string;
  memo?: string;
  department?: string;
};

export type UpdateOrderBatchInput = {
  title?: string;
  memo?: string;
  department?: string;
  status?: OrderBatchStatus;
};
