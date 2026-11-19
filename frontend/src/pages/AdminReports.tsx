import { useCallback, useEffect, useMemo, useState } from "react";

import { adminApi } from "../services/api";
import {
  formatAdminDate,
  formatAdminNumber,
  getAdminErrorMessage,
} from "../utils/adminFormat";

interface SalesReport {
  range: { from: string; to: string };
  summary: {
    orders_count: number;
    completed_orders: number;
    revenue: number;
    average_order_total: number;
    subtotal_total: number;
    discount_total: number;
    tax_total: number;
    shipping_total: number;
    items_sold: number;
  };
  statuses: Record<string, number>;
  daily: { date: string; orders_count: number; revenue: number }[];
  top_products: {
    product_id: number | null;
    name: string;
    quantity: number;
    revenue: number;
  }[];
  low_stock_products: {
    id: number;
    name: string;
    slug: string;
    stock: number;
  }[];
  low_stock_variants: {
    id: number;
    product_id: number;
    name: string;
    sku: string | null;
    stock: number;
    product?: { id: number; name: string; slug: string } | null;
  }[];
}

/** یک ردیف دفتر «گردش موجودی» (stock_movements). */
interface StockMovementRow {
  id: number;
  type: string;
  type_label: string | null;
  quantity: number;
  stock_after: number;
  note: string | null;
  created_at: string | null;
  product: { id: number; name: string; slug: string } | null;
  variant: { id: number; name: string; sku: string | null } | null;
  order_number: string | null;
  purchase_invoice_number: string | null;
  user_name: string | null;
}

interface StockMovementsReport {
  range: { days: number; from: string };
  summary: { decrease_total: number; increase_total: number };
  types: { value: string; label: string }[];
  movements: StockMovementRow[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

const statusLabels: Record<string, string> = {
  pending: "در انتظار بررسی",
  processing: "در حال پردازش",
  shipped: "ارسال‌شده",
  delivered: "تحویل‌شده",
  cancelled: "لغوشده",
  canceled: "لغوشده",
};

function AdminReports() {
  const [days, setDays] = useState(30);
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /*
   * گردش موجودی جدول جداگانه‌ای دارد (دفتر stock_movements) و با فیلتر نوع
   * تغییر و صفحه‌بندی مستقل بارگذاری می‌شود.
   */
  const [movements, setMovements] = useState<StockMovementsReport | null>(null);
  const [movementsLoading, setMovementsLoading] = useState(true);
  const [movementsError, setMovementsError] = useState("");
  const [movementType, setMovementType] = useState("");
  const [movementPage, setMovementPage] = useState(1);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await adminApi.get("/admin/reports/sales", {
        params: { days },
      });

      const data = response.data?.data;

      if (!data?.summary) {
        throw new Error("ساختار پاسخ گزارش فروش معتبر نیست.");
      }

      setReport(data);
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const loadMovements = useCallback(async () => {
    setMovementsLoading(true);
    setMovementsError("");

    try {
      const response = await adminApi.get("/admin/reports/stock-movements", {
        params: {
          days,
          page: movementPage,
          ...(movementType ? { type: movementType } : {}),
        },
      });

      const data = response.data?.data;

      if (!data?.movements) {
        throw new Error("ساختار پاسخ گردش موجودی معتبر نیست.");
      }

      setMovements(data);
    } catch (err) {
      setMovementsError(getAdminErrorMessage(err));
    } finally {
      setMovementsLoading(false);
    }
  }, [days, movementPage, movementType]);

  useEffect(() => {
    void loadMovements();
  }, [loadMovements]);

  const maxDailyRevenue = useMemo(() => {
    if (!report?.daily?.length) return 0;

    return Math.max(...report.daily.map((row) => Number(row.revenue) || 0));
  }, [report]);

  const statusEntries = useMemo(() => {
    if (!report?.statuses) return [];

    return Object.entries(report.statuses).sort((a, b) => b[1] - a[1]);
  }, [report]);

  return (
    <div dir="rtl" className="admin-page">
      <header className="admin-page-head">
        <div>
          <span className="admin-page-eyebrow">تحلیل فروش</span>
          <h1 className="admin-page-title">گزارش فروش</h1>
          <p className="admin-page-subtitle">
            درآمد، تعداد سفارش‌ها، پرفروش‌ترین محصولات و کالاهای کم‌موجود را در
            بازهٔ انتخابی بررسی کنید. سفارش‌های لغوشده در محاسبهٔ درآمد لحاظ
            نمی‌شوند.
          </p>
        </div>

        <div className="admin-toolbar" style={{ marginBottom: 0 }}>
          {[7, 30, 90].map((value) => (
            <button
              key={value}
              type="button"
              className={`admin-btn admin-btn-sm${
                days === value ? " admin-btn-primary" : ""
              }`}
              onClick={() => setDays(value)}
            >
              {formatAdminNumber(value)} روز اخیر
            </button>
          ))}

          <button
            type="button"
            className="admin-btn admin-btn-sm"
            onClick={() => void loadReport()}
            disabled={loading}
          >
            {loading ? "..." : "به‌روزرسانی"}
          </button>
        </div>
      </header>

      {error && (
        <div className="admin-alert admin-alert-error" role="alert">
          <span aria-hidden="true">!</span>
          <span>{error}</span>
        </div>
      )}

      {loading && !report ? (
        <div className="admin-card">
          <p className="admin-empty">در حال محاسبهٔ گزارش...</p>
        </div>
      ) : report ? (
        <>
          <div className="admin-stats">
            <div className="admin-stat">
              <span className="admin-stat-label">درآمد فروش</span>
              <strong className="admin-stat-value">
                {formatAdminNumber(report.summary.revenue)}
              </strong>
              <span className="admin-stat-hint">
                تومان (بدون سفارش لغوشده)
              </span>
            </div>

            <div className="admin-stat">
              <span className="admin-stat-label">تعداد سفارش</span>
              <strong className="admin-stat-value">
                {formatAdminNumber(report.summary.orders_count)}
              </strong>
              <span className="admin-stat-hint">
                {formatAdminNumber(report.summary.completed_orders)} سفارش معتبر
              </span>
            </div>

            <div className="admin-stat">
              <span className="admin-stat-label">میانگین هر سفارش</span>
              <strong className="admin-stat-value">
                {formatAdminNumber(report.summary.average_order_total)}
              </strong>
              <span className="admin-stat-hint">تومان</span>
            </div>

            <div className="admin-stat">
              <span className="admin-stat-label">اقلام فروخته‌شده</span>
              <strong className="admin-stat-value">
                {formatAdminNumber(report.summary.items_sold)}
              </strong>
              <span className="admin-stat-hint">عدد</span>
            </div>

            <div className="admin-stat">
              <span className="admin-stat-label">تخفیف‌ها</span>
              <strong className="admin-stat-value">
                {formatAdminNumber(report.summary.discount_total)}
              </strong>
              <span className="admin-stat-hint">تومان</span>
            </div>

            <div className="admin-stat">
              <span className="admin-stat-label">مالیات</span>
              <strong className="admin-stat-value">
                {formatAdminNumber(report.summary.tax_total)}
              </strong>
              <span className="admin-stat-hint">تومان</span>
            </div>
          </div>

          {statusEntries.length > 0 && (
            <section className="admin-card">
              <div className="admin-card-head">
                <h2 className="admin-card-title">وضعیت سفارش‌ها</h2>
              </div>

              <div className="admin-toolbar">
                {statusEntries.map(([status, count]) => (
                  <span
                    key={status}
                    className="admin-badge admin-badge-gray"
                    style={{ padding: "6px 12px" }}
                  >
                    {statusLabels[status] ?? status}:{" "}
                    {formatAdminNumber(count)}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section className="admin-card">
            <div className="admin-card-head">
              <div>
                <h2 className="admin-card-title">روند فروش روزانه</h2>
                <p className="admin-card-desc">
                  از {formatAdminDate(report.range.from)} تا{" "}
                  {formatAdminDate(report.range.to)}
                </p>
              </div>
            </div>

            {report.daily.length === 0 ? (
              <p className="admin-empty">در این بازه فروشی ثبت نشده است.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>تاریخ</th>
                      <th>سفارش</th>
                      <th>درآمد (تومان)</th>
                      <th style={{ width: "45%" }}>نمودار</th>
                    </tr>
                  </thead>

                  <tbody>
                    {report.daily.map((row) => (
                      <tr key={row.date}>
                        <td>{formatAdminDate(row.date)}</td>
                        <td>{formatAdminNumber(row.orders_count)}</td>
                        <td>{formatAdminNumber(row.revenue)}</td>
                        <td>
                          <div
                            style={{
                              height: 10,
                              background: "#f1f5f0",
                              borderRadius: 999,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${
                                  maxDailyRevenue > 0
                                    ? Math.max(
                                        Math.round(
                                          (Number(row.revenue) /
                                            maxDailyRevenue) *
                                            100,
                                        ),
                                        2,
                                      )
                                    : 0
                                }%`,
                                height: "100%",
                                background: "#8eae86",
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="admin-card">
            <div className="admin-card-head">
              <div>
                <h2 className="admin-card-title">پرفروش‌ترین محصولات</h2>
                <p className="admin-card-desc">
                  بر اساس تعداد فروش در بازهٔ انتخابی.
                </p>
              </div>
            </div>

            {report.top_products.length === 0 ? (
              <p className="admin-empty">در این بازه محصولی فروخته نشده است.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>محصول</th>
                      <th>تعداد فروش</th>
                      <th>درآمد (تومان)</th>
                    </tr>
                  </thead>

                  <tbody>
                    {report.top_products.map((product, index) => (
                      <tr key={`${product.product_id ?? "x"}-${index}`}>
                        <td>{formatAdminNumber(index + 1)}</td>
                        <td>{product.name}</td>
                        <td>{formatAdminNumber(product.quantity)}</td>
                        <td>{formatAdminNumber(product.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="admin-card">
            <div className="admin-card-head">
              <div>
                <h2 className="admin-card-title">هشدار موجودی کم</h2>
                <p className="admin-card-desc">
                  محصولات و تنوع‌هایی با موجودی ۵ عدد یا کمتر.
                </p>
              </div>
            </div>

            {report.low_stock_products.length === 0 &&
            report.low_stock_variants.length === 0 ? (
              <p className="admin-empty">موجودی همهٔ کالاها مناسب است.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>کالا</th>
                      <th>نوع</th>
                      <th>کد</th>
                      <th>موجودی</th>
                    </tr>
                  </thead>

                  <tbody>
                    {report.low_stock_products.map((product) => (
                      <tr key={`product-${product.id}`}>
                        <td>{product.name}</td>
                        <td>
                          <span className="admin-badge admin-badge-blue">
                            محصول
                          </span>
                        </td>
                        <td dir="ltr">{product.slug}</td>
                        <td>
                          <span className="admin-badge admin-badge-red">
                            {formatAdminNumber(product.stock)}
                          </span>
                        </td>
                      </tr>
                    ))}

                    {report.low_stock_variants.map((variant) => (
                      <tr key={`variant-${variant.id}`}>
                        <td>
                          {variant.product?.name ?? "—"} — {variant.name}
                        </td>
                        <td>
                          <span className="admin-badge admin-badge-amber">
                            تنوع
                          </span>
                        </td>
                        <td dir="ltr">{variant.sku || "—"}</td>
                        <td>
                          <span className="admin-badge admin-badge-red">
                            {formatAdminNumber(variant.stock)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <section className="admin-card">
            <div className="admin-card-head">
              <div>
                <h2 className="admin-card-title">گردش موجودی</h2>
                <p className="admin-card-desc">
                  هر کاهش/افزایش موجودی محصول یا تنوع با علت آن: ثبت سفارش،
                  بازگردانی سفارش، فاکتور خرید، ویرایش دستی یا ایمپورت.
                </p>
              </div>

              <div className="admin-toolbar" style={{ marginBottom: 0 }}>
                <select
                  className="admin-select"
                  aria-label="نوع تغییر موجودی"
                  value={movementType}
                  onChange={(event) => {
                    setMovementType(event.target.value);
                    setMovementPage(1);
                  }}
                >
                  <option value="">همهٔ علت‌ها</option>
                  {(movements?.types ?? []).map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="admin-btn admin-btn-sm"
                  onClick={() => void loadMovements()}
                  disabled={movementsLoading}
                >
                  {movementsLoading ? "..." : "به‌روزرسانی"}
                </button>
              </div>
            </div>

            {movementsError && (
              <div className="admin-alert admin-alert-error" role="alert">
                <span aria-hidden="true">!</span>
                <span>{movementsError}</span>
              </div>
            )}

            {movements && (
              <>
                <div className="admin-toolbar">
                  <span className="admin-badge admin-badge-red">
                    کاهش موجودی:{" "}
                    {formatAdminNumber(movements.summary.decrease_total)} عدد
                  </span>

                  <span className="admin-badge admin-badge-green">
                    افزایش موجودی:{" "}
                    {formatAdminNumber(movements.summary.increase_total)} عدد
                  </span>

                  <span className="admin-badge admin-badge-gray">
                    {formatAdminNumber(movements.meta.total)} ردیف در{" "}
                    {formatAdminNumber(movements.range.days)} روز اخیر
                  </span>
                </div>

                {movements.movements.length === 0 ? (
                  <p className="admin-empty">
                    در این بازه تغییری در موجودی ثبت نشده است.
                  </p>
                ) : (
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>تاریخ</th>
                          <th>کالا</th>
                          <th>علت</th>
                          <th>تغییر</th>
                          <th>موجودی پس از تغییر</th>
                          <th>مرجع</th>
                          <th>کاربر</th>
                        </tr>
                      </thead>

                      <tbody>
                        {movements.movements.map((movement) => (
                          <tr key={movement.id}>
                            <td dir="ltr">
                              {formatAdminDate(movement.created_at, true)}
                            </td>

                            <td>
                              {movement.product?.name ?? "—"}
                              {movement.variant
                                ? ` — ${movement.variant.name}`
                                : ""}
                            </td>

                            <td>{movement.type_label ?? movement.type}</td>

                            <td>
                              <span
                                className={`admin-badge ${
                                  movement.quantity < 0
                                    ? "admin-badge-red"
                                    : "admin-badge-green"
                                }`}
                              >
                                {movement.quantity > 0 ? "+" : "−"}
                                {formatAdminNumber(Math.abs(movement.quantity))}
                              </span>
                            </td>

                            <td>{formatAdminNumber(movement.stock_after)}</td>

                            <td dir="ltr">
                              {movement.order_number ??
                                movement.purchase_invoice_number ??
                                "—"}
                            </td>

                            <td>{movement.user_name ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {movements.meta.last_page > 1 && (
                  <div className="admin-toolbar">
                    <button
                      type="button"
                      className="admin-btn admin-btn-sm"
                      onClick={() =>
                        setMovementPage((page) => Math.max(1, page - 1))
                      }
                      disabled={
                        movementsLoading || movements.meta.current_page <= 1
                      }
                    >
                      صفحهٔ قبل
                    </button>

                    <span className="admin-badge admin-badge-gray">
                      صفحهٔ {formatAdminNumber(movements.meta.current_page)} از{" "}
                      {formatAdminNumber(movements.meta.last_page)}
                    </span>

                    <button
                      type="button"
                      className="admin-btn admin-btn-sm"
                      onClick={() =>
                        setMovementPage((page) =>
                          Math.min(movements.meta.last_page, page + 1),
                        )
                      }
                      disabled={
                        movementsLoading ||
                        movements.meta.current_page >= movements.meta.last_page
                      }
                    >
                      صفحهٔ بعد
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

export default AdminReports;