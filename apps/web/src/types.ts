export type Brand = "STARBUCKS" | "TWOSOME" | "EMART";

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
};

export type OrderStatus = "submitted" | "confirmed" | "ordered" | "completed" | "cancelled";

export type CartItem = {
  localId: string;
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
  items: Array<CartItem & { id: string; orderId: string }>;
};

export type SummaryRow = {
  brand: Brand;
  menuName: string;
  category: string;
  size: string;
  quantity: number;
  requests: Array<{ ordererName: string; customRequest: string }>;
};

export type PopularMenuRow = {
  menuId: string;
  menuName: string;
  category: string;
  size: string;
  quantity: number;
  ordererNames: string[];
};
