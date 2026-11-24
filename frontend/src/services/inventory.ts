import { adminApi } from "./api";

/** نوع ردیف انبار: خود محصول یا یکی از تنوع‌های آن. */
export type InventoryKind = "product" | "variant";
export type InventoryKindFilter = "all" | InventoryKind;
export type InventoryMode = "low" | "all";

export interface InventoryItem {
  kind: InventoryKind;
  id: number;
  product_id: number;
  name: string;
  product_name: string | null;
  product_slug: string | null;
  sku: string | null;
  stock: number;
  threshold: number;
  low_stock_threshold: number | null;
  shortfall: number;
  is_active: boolean;
}

export interface InventorySummary {
  products: number;
  variants: number;
  out_of_stock: number;
  low_stock: number;
  total: number;
  threshold: number;
}

export interface InventoryMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface InventoryPage {
  mode: InventoryMode;
  kind: InventoryKindFilter;
  items: InventoryItem[];
  meta: InventoryMeta;
  summary: InventorySummary;
}

export interface InventoryQuery {
  mode: InventoryMode;
  kind?: InventoryKindFilter;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface StocktakePayload {
  product_id: number;
  variant_id?: number | null;
  counted_stock: number;
  note?: string;
}

export interface LowStockNotifyResult {
  created: boolean;
  reason: string;
  summary: InventorySummary;
  notification: {
    id: number;
    title: string;
    body: string | null;
    url: string | null;
  } | null;
}

const toNumber = (value: unknown): number => {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
};

const toNullableNumber = (value: unknown): number | null =>
  value === null || value === undefined || value === "" ? null : toNumber(value);

const normalizeItem = (raw: InventoryItem): InventoryItem => ({
  ...raw,
  id: toNumber(raw.id),
  product_id: toNumber(raw.product_id),
  stock: toNumber(raw.stock),
  threshold: toNumber(raw.threshold),
  low_stock_threshold: toNullableNumber(raw.low_stock_threshold),
  shortfall: toNumber(raw.shortfall),
  is_active: Boolean(raw.is_active),
});

const normalizeSummary = (raw: unknown): InventorySummary => {
  const data = (raw ?? {}) as Partial<Record<keyof InventorySummary, unknown>>;

  return {
    products: toNumber(data.products),
    variants: toNumber(data.variants),
    out_of_stock: toNumber(data.out_of_stock),
    low_stock: toNumber(data.low_stock),
    total: toNumber(data.total),
    threshold: toNumber(data.threshold),
  };
};

const normalizeMeta = (raw: unknown, total: number): InventoryMeta => {
  const data = (raw ?? {}) as Partial<Record<keyof InventoryMeta, unknown>>;

  return {
    current_page: Math.max(1, toNumber(data.current_page) || 1),
    last_page: Math.max(1, toNumber(data.last_page) || 1),
    per_page: Math.max(1, toNumber(data.per_page) || total || 1),
    total: toNumber(data.total) || total,
  };
};

/** فهرست اقلام انبار (رو به اتمام یا همهٔ کالاها). */
export const fetchInventory = async (
  query: InventoryQuery,
): Promise<InventoryPage> => {
  const response = await adminApi.get("/admin/inventory", {
    params: {
      mode: query.mode,
      kind: query.kind ?? undefined,
      search: query.search?.trim() || undefined,
      page: query.page && query.page > 1 ? query.page : undefined,
      per_page: query.per_page ?? 25,
    },
  });

  const data = response.data?.data;

  if (!data || !Array.isArray(data.items)) {
    throw new Error("ساختار پاسخ موجودی انبار معتبر نیست.");
  }

  const items = (data.items as InventoryItem[]).map(normalizeItem);

  return {
    mode: data.mode === "all" ? "all" : "low",
    kind: (data.kind as InventoryKindFilter) ?? "all",
    items,
    meta: normalizeMeta(data.meta, items.length),
    summary: normalizeSummary(data.summary),
  };
};

/** ذخیرهٔ آستانهٔ هشدار؛ مقدار null یعنی بازگشت به پیش‌فرض. */
export const saveInventoryThreshold = async (
  kind: InventoryKind,
  id: number,
  threshold: number | null,
): Promise<{ item: InventoryItem; summary: InventorySummary }> => {
  const response = await adminApi.patch(
    `/admin/inventory/${kind}/${encodeURIComponent(id)}/threshold`,
    { threshold },
  );

  const data = response.data?.data;

  if (!data?.item) {
    throw new Error("پاسخ ذخیرهٔ آستانه معتبر نیست.");
  }

  return {
    item: normalizeItem(data.item as InventoryItem),
    summary: normalizeSummary(data.summary),
  };
};

/** ثبت شمارش انبار و اصلاح اختلاف موجودی. */
export const runStocktake = async (
  payload: StocktakePayload,
): Promise<{ item: InventoryItem; difference: number; summary: InventorySummary }> => {
  const response = await adminApi.post("/admin/inventory/stocktake", payload);
  const data = response.data?.data;

  if (!data?.item) {
    throw new Error("پاسخ ثبت شمارش انبار معتبر نیست.");
  }

  return {
    item: normalizeItem(data.item as InventoryItem),
    difference: toNumber(data.difference),
    summary: normalizeSummary(data.summary),
  };
};

/** ساخت اعلان موجودی کم برای زنگولهٔ پنل. */
export const notifyLowStock = async (
  force = false,
): Promise<LowStockNotifyResult> => {
  const response = await adminApi.post(
    "/admin/inventory/notify",
    {},
    force ? { params: { force: 1 } } : undefined,
  );

  const data = response.data?.data ?? {};

  return {
    created: Boolean(data.created),
    reason: typeof data.reason === "string" ? data.reason : "",
    summary: normalizeSummary(data.summary),
    notification: data.notification
      ? {
          id: toNumber(data.notification.id),
          title: String(data.notification.title ?? ""),
          body: data.notification.body ?? null,
          url: data.notification.url ?? null,
        }
      : null,
  };
};
