import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Eye,
  Heart,
  Loader2,
  Package,
  RefreshCw,
  Search,
  Users,
  X,
} from "lucide-react";

import { adminApi } from "../services/api";
import {
  formatAdminDate,
  formatAdminNumber,
  formatAdminPrice,
  getAdminErrorMessage,
} from "../utils/adminFormat";
import { getStorageUrl } from "../utils/images";

/* ------------------------------------------------------------------ */
/* انواع داده‌های پاسخ سرور                                            */
/* ------------------------------------------------------------------ */

type TabId = "analytics" | "products" | "customers";

type WishlistSummary = {
  total_items: number;
  customers_count: number;
  products_count: number;
  items_last_7_days: number;
  items_last_30_days: number;
  active_customers_30_days: number;
  avg_items_per_customer: number;
  converted_items: number;
  conversion_rate: number;
  out_of_stock_products: number;
  inactive_products: number;
};

type TrendPoint = {
  date: string;
  count: number;
};

type ProductRef = {
  id: number;
  name: string;
  slug: string;
  price: string | number;
  compare_price?: string | number | null;
  discount_percent?: string | number | null;
  stock: number;
  thumbnail?: string | null;
  is_active?: boolean;
  sales_count?: number;
  category?: { id: number; name: string; slug: string } | null;
};

type WishlistProductRow = ProductRef & {
  wishlist_count: number;
  customers_count: number;
};

type WishlistCustomerRow = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  created_at?: string;
  wishlist_count: number;
  last_wishlist_at?: string | null;
  orders_count?: number;
  total_spent?: number | string | null;
};

type CategoryStat = {
  category_id: number | null;
  name: string;
  items: number;
  products: number;
};

type RecentWishlistItem = {
  id: number;
  created_at: string;
  user: { id: number; name: string; email?: string } | null;
  product: ProductRef | null;
};

type OverviewResponse = {
  success: boolean;
  data: {
    summary: WishlistSummary;
    days: number;
    trend: TrendPoint[];
    top_products: WishlistProductRow[];
    top_categories: CategoryStat[];
    top_customers: WishlistCustomerRow[];
    recent: RecentWishlistItem[];
  };
};

type PaginatedMeta = {
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
};

type ProductsResponse = {
  success: boolean;
  data: PaginatedMeta & { data: WishlistProductRow[] };
  summary: { products_with_wishlist: number; total_items: number };
};

type CustomersResponse = {
  success: boolean;
  data: PaginatedMeta & { data: WishlistCustomerRow[] };
};

type CustomerWishlistItem = {
  id: number;
  created_at: string;
  product: ProductRef;
};

type CustomerItemsResponse = {
  success: boolean;
  data: {
    customer: WishlistCustomerRow;
    items: CustomerWishlistItem[];
    summary: {
      items_count: number;
      total_value: number;
      last_added_at: string | null;
      out_of_stock_count: number;
    };
  };
};

const TABS: { id: TabId; label: string; icon: typeof Heart }[] = [
  { id: "analytics", label: "داشبورد آماری", icon: BarChart3 },
  { id: "products", label: "محصولات پرطرفدار", icon: Package },
  { id: "customers", label: "علاقه‌مندی مشتریان", icon: Users },
];

const TREND_WINDOWS = [
  { value: 7, label: "۷ روز گذشته" },
  { value: 14, label: "۱۴ روز گذشته" },
  { value: 30, label: "۳۰ روز گذشته" },
  { value: 90, label: "۹۰ روز گذشته" },
];

const PAGE_SIZE = 15;

/* ------------------------------------------------------------------ */
/* ابزارهای کوچک                                                       */
/* ------------------------------------------------------------------ */

/** خروجی CSV با BOM تا اکسل فارسی را درست نشان دهد. */
function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\r\n");

  const blob = new Blob([`\uFEFF${csv}`], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** آدرس تصویر محصول؛ اگر تصویری ثبت نشده باشد null. */
function productImageUrl(product: ProductRef | null | undefined): string | null {
  if (!product?.thumbnail) {
    return null;
  }

  return getStorageUrl(product.thumbnail);
}

/** قیمت نهایی محصول پس از تخفیف. */
function finalPrice(product: ProductRef): number {
  const price = Number(product.price) || 0;
  const discount = Number(product.discount_percent ?? 0) || 0;

  return Math.round(price - (price * discount) / 100);
}

function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "text-[#047857]"
      : tone === "warning"
        ? "text-[#b45309]"
        : tone === "danger"
          ? "text-[#b91c1c]"
          : "text-[#31443a]";

  return (
    <div className="admin-stat">
      <span className="admin-stat-label">{label}</span>
      <span className={`admin-stat-value ${toneClass}`}>{value}</span>
      {hint && <span className="admin-stat-hint">{hint}</span>}
    </div>
  );
}

/** نمودار ستونی سادهٔ روند افزودن به علاقه‌مندی‌ها (بدون کتابخانهٔ چارت). */
function TrendChart({ points }: { points: TrendPoint[] }) {
  const max = Math.max(...points.map((point) => point.count), 1);
  const total = points.reduce((sum, point) => sum + point.count, 0);

  return (
    <div>
      <div className="flex h-44 items-end gap-1 rounded-xl border border-[#eef0f2] bg-[#f8faf7] p-3">
        {points.map((point) => {
          const height = point.count === 0 ? 3 : (point.count / max) * 100;

          return (
            <div
              key={point.date}
              className="flex h-full flex-1 flex-col justify-end"
              title={`${formatAdminDate(point.date)} — ${formatAdminNumber(point.count)} علاقه‌مندی`}
            >
              <div
                className={`w-full rounded-t transition-all ${
                  point.count === 0 ? "bg-[#e5e7eb]" : "bg-[#648767]"
                }`}
                style={{ height: `${height}%` }}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#6b7280]">
        <span>{formatAdminDate(points[0]?.date)}</span>
        <span className="font-bold text-[#31443a]">
          مجموع {formatAdminNumber(total)} علاقه‌مندی در این بازه
        </span>
        <span>{formatAdminDate(points[points.length - 1]?.date)}</span>
      </div>
    </div>
  );
}

function StockBadge({ product }: { product: ProductRef | null | undefined }) {
  if (!product) {
    return <span className="admin-badge admin-badge-gray">حذف‌شده</span>;
  }

  if (product.is_active === false) {
    return <span className="admin-badge admin-badge-gray">غیرفعال</span>;
  }

  if (Number(product.stock) <= 0) {
    return <span className="admin-badge admin-badge-red">ناموجود</span>;
  }

  if (Number(product.stock) <= 5) {
    return <span className="admin-badge admin-badge-amber">موجودی کم</span>;
  }

  return <span className="admin-badge admin-badge-green">موجود</span>;
}

function ProductCell({ product }: { product: ProductRef | null | undefined }) {
  const imageUrl = productImageUrl(product);

  return (
    <div className="flex items-center gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#eef0f2] bg-[#f8faf7]">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product?.name ?? "محصول"}
            className="h-full w-full object-contain p-1"
            loading="lazy"
          />
        ) : (
          <Package size={18} className="text-[#9ca3af]" />
        )}
      </span>

      <span className="min-w-0">
        <span className="block truncate font-bold text-[#111827]">
          {product?.name ?? "محصول حذف‌شده"}
        </span>
        <span className="block text-[11.5px] text-[#9ca3af]">
          {product?.category?.name ?? "بدون دسته‌بندی"}
        </span>
      </span>
    </div>
  );
}

function Pagination({
  page,
  lastPage,
  total,
  onChange,
  busy,
}: {
  page: number;
  lastPage: number;
  total: number;
  onChange: (page: number) => void;
  busy?: boolean;
}) {
  if (lastPage <= 1) {
    return (
      <div className="mt-3 text-xs text-[#9ca3af]">
        {formatAdminNumber(total)} مورد
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <span className="text-xs text-[#6b7280]">
        صفحهٔ {formatAdminNumber(page)} از {formatAdminNumber(lastPage)} —{" "}
        {formatAdminNumber(total)} مورد
      </span>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="admin-btn admin-btn-sm"
          disabled={page <= 1 || busy}
          onClick={() => onChange(page - 1)}
        >
          <ChevronRight size={14} />
          قبلی
        </button>

        <button
          type="button"
          className="admin-btn admin-btn-sm"
          disabled={page >= lastPage || busy}
          onClick={() => onChange(page + 1)}
        >
          بعدی
          <ChevronLeft size={14} />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* تب داشبورد آماری                                                    */
/* ------------------------------------------------------------------ */

function AnalyticsTab({
  onSelectTab,
  onOpenCustomer,
}: {
  onSelectTab: (tab: TabId) => void;
  onOpenCustomer: (customer: WishlistCustomerRow) => void;
}) {
  const [days, setDays] = useState(14);
  const [overview, setOverview] = useState<OverviewResponse["data"] | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await adminApi.get<OverviewResponse>(
        "/admin/wishlist/overview",
        { params: { days } },
      );

      setOverview(response.data.data);
    } catch (loadError) {
      setError(
        getAdminErrorMessage(
          loadError,
          "دریافت آمار علاقه‌مندی‌ها انجام نشد.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !overview) {
    return (
      <div className="admin-card flex items-center justify-center gap-2 py-16 text-sm text-[#6b7280]">
        <Loader2 size={18} className="animate-spin" />
        در حال محاسبهٔ آمار علاقه‌مندی‌ها...
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="admin-card">
        <div className="admin-alert admin-alert-error">
          <AlertCircle size={16} />
          {error}
        </div>
        <button type="button" className="admin-btn" onClick={load}>
          <RefreshCw size={15} />
          تلاش دوباره
        </button>
      </div>
    );
  }

  if (!overview) {
    return null;
  }

  const summary = overview.summary;

  return (
    <div>
      <div className="admin-stats">
        <StatCard
          label="کل علاقه‌مندی‌ها"
          value={formatAdminNumber(summary.total_items)}
          hint={`${formatAdminNumber(summary.items_last_30_days)} مورد در ۳۰ روز گذشته`}
        />

        <StatCard
          label="مشتریان دارای علاقه‌مندی"
          value={formatAdminNumber(summary.customers_count)}
          hint={`${formatAdminNumber(summary.active_customers_30_days)} نفر در ۳۰ روز فعال`}
        />

        <StatCard
          label="محصولات ذخیره‌شده"
          value={formatAdminNumber(summary.products_count)}
          hint={`میانگین ${formatAdminNumber(summary.avg_items_per_customer)} مورد برای هر مشتری`}
        />

        <StatCard
          label="تبدیل علاقه‌مندی به خرید"
          value={`${formatAdminNumber(summary.conversion_rate)}٪`}
          tone="success"
          hint={`${formatAdminNumber(summary.converted_items)} علاقه‌مندی به خرید رسیده`}
        />

        <StatCard
          label="محصولات ناموجود در علاقه‌مندی"
          value={formatAdminNumber(summary.out_of_stock_products)}
          tone={summary.out_of_stock_products > 0 ? "danger" : "default"}
          hint="اولویت تأمین و شارژ موجودی"
        />

        <StatCard
          label="علاقه‌مندی‌های ۷ روز گذشته"
          value={formatAdminNumber(summary.items_last_7_days)}
          tone="warning"
          hint={`${formatAdminNumber(summary.inactive_products)} محصول غیرفعال هم ذخیره شده`}
        />
      </div>

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2 className="admin-card-title">روند افزودن به علاقه‌مندی‌ها</h2>
            <p className="admin-card-desc">
              تعداد محصولاتی که در هر روز ذخیره شده‌اند؛ برای دیدن مقدار هر
              ستون روی آن نگه دارید.
            </p>
          </div>

          <select
            className="admin-select"
            style={{ maxWidth: 180 }}
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
            aria-label="بازهٔ زمانی نمودار"
          >
            {TREND_WINDOWS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <TrendChart points={overview.trend} />
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <section className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2 className="admin-card-title">۱۰ محصول پرطرفدار</h2>
              <p className="admin-card-desc">
                بیشترین تعداد علاقه‌مندی مشتریان
              </p>
            </div>

            <button
              type="button"
              className="admin-btn admin-btn-sm"
              onClick={() => onSelectTab("products")}
            >
              همهٔ محصولات
              <ChevronLeft size={14} />
            </button>
          </div>

          {overview.top_products.length === 0 ? (
            <div className="admin-empty">
              هنوز محصولی به علاقه‌مندی‌ها اضافه نشده است.
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>محصول</th>
                    <th>قیمت</th>
                    <th>وضعیت</th>
                    <th>علاقه‌مندی</th>
                    <th>تعداد مشتری</th>
                  </tr>
                </thead>

                <tbody>
                  {overview.top_products.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <ProductCell product={product} />
                      </td>
                      <td>{formatAdminPrice(finalPrice(product))}</td>
                      <td>
                        <StockBadge product={product} />
                      </td>
                      <td>
                        <span className="admin-badge admin-badge-blue">
                          <Heart size={11} />
                          {formatAdminNumber(product.wishlist_count)}
                        </span>
                      </td>
                      <td>
                        {formatAdminNumber(product.customers_count)} نفر
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div>
          <section className="admin-card">
            <div className="admin-card-head">
              <h2 className="admin-card-title">دسته‌بندی‌های پرتقاضا</h2>
            </div>

            {overview.top_categories.length === 0 ? (
              <div className="admin-empty">داده‌ای برای نمایش نیست.</div>
            ) : (
              <ul className="space-y-3">
                {overview.top_categories.map((category) => {
                  const percent =
                    summary.total_items > 0
                      ? Math.round((category.items / summary.total_items) * 100)
                      : 0;

                  return (
                    <li key={`${category.category_id ?? "none"}-${category.name}`}>
                      <div className="flex items-center justify-between gap-2 text-[13px]">
                        <span className="font-bold text-[#374151]">
                          {category.name}
                        </span>
                        <span className="text-[#6b7280]">
                          {formatAdminNumber(category.items)} مورد ·{" "}
                          {formatAdminNumber(category.products)} محصول
                        </span>
                      </div>

                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#f1f5f9]">
                        <div
                          className="h-full rounded-full bg-[#648767]"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="admin-card">
            <div className="admin-card-head">
              <h2 className="admin-card-title">مشتریان فعال</h2>

              <button
                type="button"
                className="admin-btn admin-btn-sm"
                onClick={() => onSelectTab("customers")}
              >
                همهٔ مشتریان
                <ChevronLeft size={14} />
              </button>
            </div>

            {overview.top_customers.length === 0 ? (
              <div className="admin-empty">
                هنوز مشتری‌ای علاقه‌مندی ثبت نکرده است.
              </div>
            ) : (
              <ul className="divide-y divide-[#f1f5f9]">
                {overview.top_customers.map((customer) => (
                  <li
                    key={customer.id}
                    className="flex items-center justify-between gap-2 py-2.5"
                  >
                    <button
                      type="button"
                      className="min-w-0 text-right"
                      onClick={() => onOpenCustomer(customer)}
                      title="مشاهدهٔ اقلام علاقه‌مندی این مشتری"
                    >
                      <span className="block truncate text-[13px] font-bold text-[#111827]">
                        {customer.name}
                      </span>
                      <span className="block truncate text-[11.5px] text-[#9ca3af]">
                        {formatAdminNumber(customer.orders_count)} سفارش ·{" "}
                        {formatAdminPrice(customer.total_spent ?? 0)}
                      </span>
                    </button>

                    <span className="admin-badge admin-badge-blue">
                      {formatAdminNumber(customer.wishlist_count)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2 className="admin-card-title">آخرین علاقه‌مندی‌های ثبت‌شده</h2>
            <p className="admin-card-desc">
              برای پیگیری سریع رفتار مشتریان و اولویت‌بندی تأمین کالا
            </p>
          </div>
        </div>

        {overview.recent.length === 0 ? (
          <div className="admin-empty">فعالیتی برای نمایش نیست.</div>
        ) : (
          <ul className="divide-y divide-[#f1f5f9]">
            {overview.recent.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f4dfe5] text-[#854c61]">
                    <Heart size={15} />
                  </span>

                  <span className="min-w-0">
                    <span className="block truncate text-[13px] text-[#111827]">
                      <strong className="font-bold">
                        {item.user?.name ?? "مشتری"}
                      </strong>{" "}
                      «{item.product?.name ?? "محصول حذف‌شده"}» را ذخیره کرد
                    </span>
                    <span className="block text-[11.5px] text-[#9ca3af]">
                      {formatAdminDate(item.created_at, true)}
                    </span>
                  </span>
                </div>

                {item.product && (
                  <Link
                    to={`/product/${item.product.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="admin-btn admin-btn-sm"
                  >
                    <ExternalLink size={13} />
                    صفحهٔ محصول
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* تب محصولات پرطرفدار                                                 */
/* ------------------------------------------------------------------ */

const PRODUCT_SORT_OPTIONS = [
  {
    value: "wishlist_count:desc",
    label: "بیشترین علاقه‌مندی",
    sortBy: "wishlist_count" as const,
    direction: "desc" as const,
  },
  {
    value: "wishlist_count:asc",
    label: "کمترین علاقه‌مندی",
    sortBy: "wishlist_count" as const,
    direction: "asc" as const,
  },
  {
    value: "sales_count:asc",
    label: "کمترین فروش (فرصت بازاریابی)",
    sortBy: "sales_count" as const,
    direction: "asc" as const,
  },
  {
    value: "stock:asc",
    label: "کمترین موجودی",
    sortBy: "stock" as const,
    direction: "asc" as const,
  },
  {
    value: "price:desc",
    label: "گران‌ترین",
    sortBy: "price" as const,
    direction: "desc" as const,
  },
  {
    value: "name:asc",
    label: "نام محصول",
    sortBy: "name" as const,
    direction: "asc" as const,
  },
];

const STOCK_OPTIONS = [
  { value: "all", label: "همهٔ محصولات" },
  { value: "in_stock", label: "فقط موجود" },
  { value: "out_of_stock", label: "فقط ناموجود" },
];

function ProductsTab() {
  const [rows, setRows] = useState<WishlistProductRow[]>([]);
  const [meta, setMeta] = useState<PaginatedMeta>({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: PAGE_SIZE,
  });
  const [summary, setSummary] = useState({
    products_with_wishlist: 0,
    total_items: 0,
  });

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [stock, setStock] = useState("all");
  const [sortValue, setSortValue] = useState(PRODUCT_SORT_OPTIONS[0].value);
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // جست‌وجو با تأخیر تا با هر کلید درخواست ارسال نشود.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const sortOption =
    PRODUCT_SORT_OPTIONS.find((option) => option.value === sortValue) ??
    PRODUCT_SORT_OPTIONS[0];

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await adminApi.get<ProductsResponse>(
        "/admin/wishlist/products",
        {
          params: {
            search: search || undefined,
            stock,
            sort_by: sortOption.sortBy,
            sort_direction: sortOption.direction,
            page,
            per_page: PAGE_SIZE,
          },
        },
      );

      setRows(response.data.data.data);
      setMeta({
        current_page: response.data.data.current_page,
        last_page: response.data.data.last_page,
        total: response.data.data.total,
        per_page: response.data.data.per_page,
      });
      setSummary(response.data.summary);
    } catch (loadError) {
      setError(
        getAdminErrorMessage(
          loadError,
          "دریافت فهرست محصولات علاقه‌مندی انجام نشد.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [search, stock, sortOption.sortBy, sortOption.direction, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleExport = () => {
    downloadCsv("wishlist-products.csv", [
      [
        "محصول",
        "دسته‌بندی",
        "قیمت نهایی",
        "موجودی",
        "تعداد علاقه‌مندی",
        "تعداد مشتری",
        "تعداد فروش",
      ],
      ...rows.map((row) => [
        row.name,
        row.category?.name ?? "",
        finalPrice(row),
        row.stock,
        row.wishlist_count,
        row.customers_count,
        row.sales_count ?? 0,
      ]),
    ]);
  };

  return (
    <section className="admin-card">
      <div className="admin-card-head">
        <div>
          <h2 className="admin-card-title">محصولات موجود در علاقه‌مندی‌ها</h2>
          <p className="admin-card-desc">
            {formatAdminNumber(summary.products_with_wishlist)} محصول دارای
            علاقه‌مندی و {formatAdminNumber(summary.total_items)} علاقه‌مندی
            ثبت‌شده — محصولات ناموجود یا کم‌فروش را برای تأمین و کمپین
            اولویت دهید.
          </p>
        </div>

        <button
          type="button"
          className="admin-btn"
          onClick={handleExport}
          disabled={rows.length === 0}
        >
          <Download size={15} />
          خروجی CSV
        </button>
      </div>

      <div className="admin-toolbar">
        <div className="relative" style={{ flex: "1 1 220px", maxWidth: 300 }}>
          <Search
            size={15}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af]"
          />
          <input
            type="search"
            className="admin-input pr-9"
            placeholder="جست‌وجوی نام یا کد محصول..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            aria-label="جست‌وجوی محصول"
          />
        </div>

        <select
          className="admin-select"
          style={{ maxWidth: 190 }}
          value={stock}
          onChange={(event) => {
            setStock(event.target.value);
            setPage(1);
          }}
          aria-label="فیلتر موجودی"
        >
          {STOCK_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          className="admin-select"
          style={{ maxWidth: 250 }}
          value={sortValue}
          onChange={(event) => {
            setSortValue(event.target.value);
            setPage(1);
          }}
          aria-label="ترتیب نمایش"
        >
          {PRODUCT_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <span className="admin-toolbar-spacer" />

        <button
          type="button"
          className="admin-btn admin-btn-sm"
          onClick={load}
          disabled={loading}
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <RefreshCw size={14} />
          )}
          به‌روزرسانی
        </button>
      </div>

      {error && (
        <div className="admin-alert admin-alert-error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {loading && rows.length === 0 ? (
        <div className="admin-empty flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin" />
          در حال دریافت محصولات...
        </div>
      ) : rows.length === 0 ? (
        <div className="admin-empty">محصولی با این فیلترها پیدا نشد.</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>محصول</th>
                <th>قیمت</th>
                <th>وضعیت</th>
                <th>علاقه‌مندی</th>
                <th>مشتریان</th>
                <th>فروش</th>
                <th>عملیات</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <ProductCell product={row} />
                  </td>
                  <td>{formatAdminPrice(finalPrice(row))}</td>
                  <td>
                    <StockBadge product={row} />
                  </td>
                  <td>
                    <span className="admin-badge admin-badge-blue">
                      <Heart size={11} />
                      {formatAdminNumber(row.wishlist_count)}
                    </span>
                  </td>
                  <td>{formatAdminNumber(row.customers_count)} نفر</td>
                  <td>{formatAdminNumber(row.sales_count)} عدد</td>
                  <td>
                    <Link
                      to={`/product/${row.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="admin-btn admin-btn-sm"
                    >
                      <ExternalLink size={13} />
                      صفحهٔ محصول
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={meta.current_page}
        lastPage={meta.last_page}
        total={meta.total}
        onChange={setPage}
        busy={loading}
      />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* تب علاقه‌مندی مشتریان                                                */
/* ------------------------------------------------------------------ */

const CUSTOMER_SORT_OPTIONS = [
  {
    value: "wishlist_count:desc",
    label: "بیشترین علاقه‌مندی",
    sortBy: "wishlist_count" as const,
    direction: "desc" as const,
  },
  {
    value: "last_wishlist_at:desc",
    label: "آخرین فعالیت",
    sortBy: "last_wishlist_at" as const,
    direction: "desc" as const,
  },
  {
    value: "orders_count:desc",
    label: "بیشترین سفارش",
    sortBy: "orders_count" as const,
    direction: "desc" as const,
  },
  {
    value: "total_spent:desc",
    label: "بیشترین خرید",
    sortBy: "total_spent" as const,
    direction: "desc" as const,
  },
  {
    value: "created_at:desc",
    label: "تازه‌ترین مشتری",
    sortBy: "created_at" as const,
    direction: "desc" as const,
  },
];

const CUSTOMER_FILTER_OPTIONS = [
  { value: "with_wishlist", label: "فقط مشتریان دارای علاقه‌مندی" },
  { value: "all", label: "همهٔ مشتریان" },
];

function CustomersTab({
  onOpenCustomer,
}: {
  onOpenCustomer: (customer: WishlistCustomerRow) => void;
}) {
  const [rows, setRows] = useState<WishlistCustomerRow[]>([]);
  const [meta, setMeta] = useState<PaginatedMeta>({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: PAGE_SIZE,
  });

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [only, setOnly] = useState("with_wishlist");
  const [sortValue, setSortValue] = useState(CUSTOMER_SORT_OPTIONS[0].value);
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const sortOption =
    CUSTOMER_SORT_OPTIONS.find((option) => option.value === sortValue) ??
    CUSTOMER_SORT_OPTIONS[0];

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await adminApi.get<CustomersResponse>(
        "/admin/wishlist/customers",
        {
          params: {
            search: search || undefined,
            only,
            sort_by: sortOption.sortBy,
            sort_direction: sortOption.direction,
            page,
            per_page: PAGE_SIZE,
          },
        },
      );

      setRows(response.data.data.data);
      setMeta({
        current_page: response.data.data.current_page,
        last_page: response.data.data.last_page,
        total: response.data.data.total,
        per_page: response.data.data.per_page,
      });
    } catch (loadError) {
      setError(
        getAdminErrorMessage(
          loadError,
          "دریافت فهرست مشتریان علاقه‌مندی انجام نشد.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [search, only, sortOption.sortBy, sortOption.direction, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleExport = () => {
    downloadCsv("wishlist-customers.csv", [
      [
        "نام مشتری",
        "ایمیل",
        "شماره تماس",
        "تعداد علاقه‌مندی",
        "آخرین فعالیت",
        "تعداد سفارش",
        "مجموع خرید",
      ],
      ...rows.map((row) => [
        row.name,
        row.email,
        row.phone ?? "",
        row.wishlist_count,
        row.last_wishlist_at ? formatAdminDate(row.last_wishlist_at, true) : "",
        row.orders_count ?? 0,
        Number(row.total_spent ?? 0),
      ]),
    ]);
  };

  return (
    <section className="admin-card">
      <div className="admin-card-head">
        <div>
          <h2 className="admin-card-title">علاقه‌مندی مشتریان</h2>
          <p className="admin-card-desc">
            هر مشتری چه محصولاتی را ذخیره کرده و آخرین بار چه زمانی فعال
            بوده است؛ برای پیگیری تلفنی و ارسال پیام یادآوری.
          </p>
        </div>

        <button
          type="button"
          className="admin-btn"
          onClick={handleExport}
          disabled={rows.length === 0}
        >
          <Download size={15} />
          خروجی CSV
        </button>
      </div>

      <div className="admin-toolbar">
        <div className="relative" style={{ flex: "1 1 220px", maxWidth: 300 }}>
          <Search
            size={15}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af]"
          />
          <input
            type="search"
            className="admin-input pr-9"
            placeholder="جست‌وجوی نام، ایمیل یا تلفن..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            aria-label="جست‌وجوی مشتری"
          />
        </div>

        <select
          className="admin-select"
          style={{ maxWidth: 240 }}
          value={only}
          onChange={(event) => {
            setOnly(event.target.value);
            setPage(1);
          }}
          aria-label="فیلتر مشتریان"
        >
          {CUSTOMER_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          className="admin-select"
          style={{ maxWidth: 200 }}
          value={sortValue}
          onChange={(event) => {
            setSortValue(event.target.value);
            setPage(1);
          }}
          aria-label="ترتیب نمایش مشتریان"
        >
          {CUSTOMER_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <span className="admin-toolbar-spacer" />

        <button
          type="button"
          className="admin-btn admin-btn-sm"
          onClick={load}
          disabled={loading}
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <RefreshCw size={14} />
          )}
          به‌روزرسانی
        </button>
      </div>

      {error && (
        <div className="admin-alert admin-alert-error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {loading && rows.length === 0 ? (
        <div className="admin-empty flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin" />
          در حال دریافت مشتریان...
        </div>
      ) : rows.length === 0 ? (
        <div className="admin-empty">مشتری‌ای با این فیلترها پیدا نشد.</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>مشتری</th>
                <th>تماس</th>
                <th>علاقه‌مندی</th>
                <th>آخرین فعالیت</th>
                <th>سفارش‌ها</th>
                <th>مجموع خرید</th>
                <th>عملیات</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <span className="block font-bold text-[#111827]">
                      {row.name}
                    </span>
                    <span className="block text-[11.5px] text-[#9ca3af]">
                      {row.email}
                    </span>
                  </td>
                  <td dir="ltr" className="text-right">
                    {row.phone || "—"}
                  </td>
                  <td>
                    <span className="admin-badge admin-badge-blue">
                      <Heart size={11} />
                      {formatAdminNumber(row.wishlist_count)}
                    </span>
                  </td>
                  <td>{formatAdminDate(row.last_wishlist_at)}</td>
                  <td>{formatAdminNumber(row.orders_count)}</td>
                  <td>{formatAdminPrice(row.total_spent ?? 0)}</td>
                  <td>
                    <div className="admin-row-actions">
                      <button
                        type="button"
                        className="admin-btn admin-btn-sm"
                        onClick={() => onOpenCustomer(row)}
                      >
                        <Eye size={13} />
                        اقلام
                      </button>

                      <Link
                        to={`/admin/customers/${row.id}`}
                        className="admin-btn admin-btn-sm"
                      >
                        <Users size={13} />
                        پرونده
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={meta.current_page}
        lastPage={meta.last_page}
        total={meta.total}
        onChange={setPage}
        busy={loading}
      />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* پنجرهٔ اقلام علاقه‌مندی یک مشتری                                     */
/* ------------------------------------------------------------------ */

function CustomerItemsSheet({
  customer,
  onClose,
}: {
  customer: WishlistCustomerRow;
  onClose: () => void;
}) {
  const [data, setData] = useState<CustomerItemsResponse["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await adminApi.get<CustomerItemsResponse>(
          `/admin/wishlist/customers/${customer.id}`,
        );

        if (active) {
          setData(response.data.data);
        }
      } catch (loadError) {
        if (active) {
          setError(
            getAdminErrorMessage(
              loadError,
              "دریافت اقلام علاقه‌مندی این مشتری انجام نشد.",
            ),
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [customer.id]);

  // بستن پنجره با کلید Escape
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKey);

    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
      <div
        className="w-full max-w-3xl rounded-2xl bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label={`علاقمندی‌های ${customer.name}`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#eef0f2] p-5">
          <div>
            <h2 className="m-0 text-lg font-black text-[#111827]">
              علاقه‌مندی‌های {customer.name}
            </h2>
            <p className="mt-1 text-xs text-[#6b7280]">
              {data
                ? `${formatAdminNumber(data.summary.items_count)} محصول · ارزش تقریبی ${formatAdminPrice(data.summary.total_value)}`
                : customer.email}
            </p>
          </div>

          <button
            type="button"
            className="admin-btn admin-btn-sm"
            onClick={onClose}
            aria-label="بستن"
          >
            <X size={15} />
          </button>
        </div>

        <div className="p-5">
          {loading && (
            <div className="admin-empty flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              در حال دریافت اقلام...
            </div>
          )}

          {error && (
            <div className="admin-alert admin-alert-error">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {!loading && !error && data && data.items.length === 0 && (
            <div className="admin-empty">
              این مشتری در حال حاضر محصولی در علاقه‌مندی‌ها ندارد.
            </div>
          )}

          {!loading && !error && data && data.items.length > 0 && (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>محصول</th>
                    <th>قیمت</th>
                    <th>وضعیت</th>
                    <th>تاریخ افزودن</th>
                  </tr>
                </thead>

                <tbody>
                  {data.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <ProductCell product={item.product} />
                      </td>
                      <td>{formatAdminPrice(finalPrice(item.product))}</td>
                      <td>
                        <StockBadge product={item.product} />
                      </td>
                      <td>{formatAdminDate(item.created_at, true)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            <Link to={`/admin/customers/${customer.id}`} className="admin-btn">
              <Users size={14} />
              پروندهٔ مشتری
            </Link>

            <button type="button" className="admin-btn" onClick={onClose}>
              بستن
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* صفحهٔ اصلی مدیریت علاقه‌مندی‌ها                                      */
/* ------------------------------------------------------------------ */

export default function AdminWishlist() {
  const [searchParams] = useSearchParams();

  // لینک مستقیم از پروندهٔ مشتری: /admin/wishlist?customer=۱۲&name=...
  const linkedCustomerId = Number(searchParams.get("customer"));

  const [activeTab, setActiveTab] = useState<TabId>(
    Number.isFinite(linkedCustomerId) && linkedCustomerId > 0
      ? "customers"
      : "analytics",
  );
  const [refreshToken, setRefreshToken] = useState(0);
  const [selectedCustomer, setSelectedCustomer] =
    useState<WishlistCustomerRow | null>(() =>
      Number.isFinite(linkedCustomerId) && linkedCustomerId > 0
        ? {
            id: linkedCustomerId,
            name: searchParams.get("name")?.trim() || "مشتری",
            email: "",
            wishlist_count: 0,
          }
        : null,
    );

  const bumpRefresh = useCallback(() => {
    setRefreshToken((current) => current + 1);
  }, []);

  const handleOpenCustomer = useCallback((customer: WishlistCustomerRow) => {
    setSelectedCustomer(customer);
  }, []);

  const handleCloseCustomer = useCallback(() => {
    setSelectedCustomer(null);
  }, []);

  return (
    <div dir="rtl" className="admin-page">
      <header className="admin-page-head">
        <div>
          <span className="admin-page-eyebrow">بازاریابی و مشتریان</span>
          <h1 className="admin-page-title">علاقه‌مندی‌های مشتریان</h1>
          <p className="admin-page-subtitle">
            ببینید مشتریان چه محصولاتی را ذخیره می‌کنند، کدام محصولات بیشتر
            مورد توجه‌اند و کدام علاقه‌مندی‌ها به خرید تبدیل شده‌اند؛
            محصولات ناموجود و کم‌فروش اولویت تأمین و کمپین هستند.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link to="/admin/customers" className="admin-btn">
            <Users size={15} />
            مشتریان
          </Link>

          <button type="button" className="admin-btn" onClick={bumpRefresh}>
            <RefreshCw size={15} />
            به‌روزرسانی
          </button>
        </div>
      </header>

      <nav
        role="tablist"
        aria-label="بخش‌های علاقه‌مندی‌ها"
        style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`admin-btn${isActive ? " admin-btn-primary" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {activeTab === "analytics" && (
        <AnalyticsTab
          key={`analytics-${refreshToken}`}
          onSelectTab={setActiveTab}
          onOpenCustomer={handleOpenCustomer}
        />
      )}

      {activeTab === "products" && (
        <ProductsTab key={`products-${refreshToken}`} />
      )}

      {activeTab === "customers" && (
        <CustomersTab
          key={`customers-${refreshToken}`}
          onOpenCustomer={handleOpenCustomer}
        />
      )}

      {selectedCustomer && (
        <CustomerItemsSheet
          customer={selectedCustomer}
          onClose={handleCloseCustomer}
        />
      )}
    </div>
  );
}
