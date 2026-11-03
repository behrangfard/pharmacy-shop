import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { adminApi } from "../services/api";
import { calculateProductPrice } from "../utils/price";
import { getStorageUrl } from "../utils/images";

interface Product {
  id: number;
  name: string;
  slug: string;
  sku: string;
  price: string | number;
  discount_percent?: string | number;
  stock: number;
  is_active: boolean;
  is_featured: boolean;
  is_new: boolean;
  thumbnail: string | null;
  images?: Array<{
    id: number;
    path: string;
    is_primary?: boolean;
    sort_order?: number;
  }>;
  category?: { id: number; name: string } | null;
  brand?: { id: number; name: string } | null;
}

interface Pagination {
  current_page: number;
  last_page: number;
  total: number;
}

function imageUrl(path: string | null | undefined): string {
  return getStorageUrl(path) ?? "";
}

function getProductImage(product: Product): string {
  const primaryImage = product.images?.find((image) => image.is_primary);
  const firstImage = primaryImage ?? product.images?.[0];

  return imageUrl(product.thumbnail || firstImage?.path);
}

function formatNumber(value: string | number | undefined) {
  return new Intl.NumberFormat("fa-IR").format(Number(value ?? 0));
}

const colors = {
  ink: "#344b3a",
  muted: "#7c877b",
  green: "#587b5b",
  greenDark: "#426747",
  greenSoft: "#edf4e9",
  cream: "#fffefa",
  border: "#e7ecdf",
  background: "#f4f6fb",
  lilac: "#eee7f5",
  lilacText: "#80649b",
  teal: "#e4f0ed",
  tealText: "#527f7b",
  amber: "#fbf1e2",
  amberText: "#a77639",
  red: "#faeae5",
  redText: "#b65c49",
};

const buttonStyle = {
  border: `1px solid ${colors.border}`,
  borderRadius: 11,
  padding: "10px 14px",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 700,
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  minHeight: 40,
  boxSizing: "border-box" as const,
  transition: "background 160ms ease, opacity 160ms ease",
} as const;

const panelStyle = {
  background: colors.cream,
  border: `1px solid ${colors.border}`,
  borderRadius: 18,
  padding: 20,
  boxShadow: "0 5px 16px rgba(52, 75, 58, 0.035)",
} as const;

const inputStyle = {
  border: `1px solid ${colors.border}`,
  borderRadius: 11,
  padding: "11px 13px",
  fontSize: 13,
  background: colors.cream,
  color: colors.ink,
  outlineColor: colors.green,
  minHeight: 43,
} as const;

const tableHeaderStyle = {
  padding: "15px 14px",
  fontSize: 12,
  fontWeight: 700,
  color: colors.muted,
  whiteSpace: "nowrap" as const,
  background: "#f8f8f1",
  borderBottom: `1px solid ${colors.border}`,
} as const;

const tableCellStyle = {
  padding: 14,
  fontSize: 13,
  color: colors.ink,
  verticalAlign: "middle" as const,
  borderBottom: `1px solid #edf0e8`,
} as const;

function AdminProducts() {
  const navigate = useNavigate();
  const location = useLocation();

  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    current_page: 1,
    last_page: 1,
    total: 0,
  });

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [failedImages, setFailedImages] = useState<number[]>([]);

  const requestIdRef = useRef(0);
  const inFlightRequestRef = useRef<{
    key: string;
    promise: Promise<any>;
  } | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const nextSearch = searchInput.trim();

      setSearch((currentSearch) =>
        currentSearch === nextSearch ? currentSearch : nextSearch,
      );

      setPage(1);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const loadProducts = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    setLoading(true);
    setError("");

    const params: Record<string, string | number> = {
      page,
      per_page: 10,
    };

    if (search) params.search = search;
    if (status !== "all") params.status = status;

    const requestKey = JSON.stringify(params);
    let request = inFlightRequestRef.current;

    if (!request || request.key !== requestKey) {
      request = {
        key: requestKey,
        promise: adminApi.get("/admin/products", { params }),
      };

      inFlightRequestRef.current = request;
    }

    try {
      let response;

      try {
        response = await request.promise;
      } finally {
        if (inFlightRequestRef.current === request) {
          inFlightRequestRef.current = null;
        }
      }

      if (requestId !== requestIdRef.current) return;

      const result = response.data?.data;
      const productList = Array.isArray(result)
        ? result
        : Array.isArray(result?.data)
          ? result.data
          : [];

      setProducts(productList);
      setFailedImages([]);

      const lastPage = Math.max(1, Number(result?.last_page ?? 1));
      const currentPage = Number(result?.current_page ?? page);

      setPagination({
        current_page: currentPage,
        last_page: lastPage,
        total: Number(result?.total ?? productList.length),
      });

      if (page > lastPage) setPage(1);
    } catch (err: unknown) {
      if (requestId !== requestIdRef.current) return;

      const apiError = err as {
        response?: { data?: { message?: string } };
      };

      setError(
        apiError.response?.data?.message ||
          "دریافت فهرست محصولات با خطا مواجه شد.",
      );
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    void loadProducts();

    return () => {
      requestIdRef.current += 1;
    };
  }, [loadProducts]);

  useEffect(() => {
    const state = location.state as { notice?: string } | null;

    if (state?.notice) {
      setNotice(state.notice);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!notice) return;

    const timeout = window.setTimeout(() => setNotice(""), 5000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  async function toggleStatus(product: Product) {
    const nextStatus = !product.is_active;
    const action = nextStatus ? "فعال" : "غیرفعال";

    if (
      !window.confirm(
        `آیا از ${action} کردن محصول «${product.name}» اطمینان دارید؟`,
      )
    ) {
      return;
    }

    setBusyId(product.id);
    setError("");
    setNotice("");

    try {
      await adminApi.patch(`/admin/products/${product.id}/status`, {
        is_active: nextStatus,
      });

      setNotice(`وضعیت محصول «${product.name}» با موفقیت تغییر کرد.`);
      await loadProducts();
    } catch (err: unknown) {
      const apiError = err as {
        response?: { data?: { message?: string } };
      };

      setError(
        apiError.response?.data?.message ||
          "تغییر وضعیت محصول با خطا مواجه شد.",
      );
    } finally {
      setBusyId(null);
    }
  }

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setStatus("all");
    setPage(1);
  }

  const activeCount = products.filter((product) => product.is_active).length;
  const inactiveCount = products.length - activeCount;
  const outOfStockCount = products.filter(
    (product) => Number(product.stock) <= 0,
  ).length;

  const statCards = [
    {
      label: "کل محصولات",
      value: pagination.total,
      detail: "تعداد محصولات ثبت‌شده",
      color: colors.green,
      background: colors.greenSoft,
    },
    {
      label: "محصولات فعال در این صفحه",
      value: activeCount,
      detail: "قابل نمایش در فروشگاه",
      color: colors.tealText,
      background: colors.teal,
    },
    {
      label: "محصولات غیرفعال در این صفحه",
      value: inactiveCount,
      detail: "غیرفعال در فروشگاه",
      color: colors.amberText,
      background: colors.amber,
    },
    {
      label: "ناموجود در این صفحه",
      value: outOfStockCount,
      detail: "نیازمند بررسی موجودی",
      color: colors.redText,
      background: colors.red,
    },
  ];

  return (
    <div dir="rtl" className="admin-products-page">
      <style>{`
        .admin-products-page {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 22px;
          width: 100%;
          max-width: none;
          min-width: 0;
          color: ${colors.ink};
          box-sizing: border-box;
        }
        .admin-products-page * { box-sizing: border-box; }
        .admin-products-page .products-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        .admin-products-page .products-title {
          margin: 0 0 8px;
          font-size: clamp(23px, 2vw, 29px);
          line-height: 1.6;
          font-weight: 850;
          color: ${colors.ink};
        }
        .admin-products-page .products-subtitle {
          margin: 0;
          color: ${colors.muted};
          font-size: 13px;
          line-height: 1.9;
        }
        .admin-products-page .products-actions {
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
        }
        .admin-products-page .products-button {
          transition: transform 150ms ease, box-shadow 150ms ease, background 150ms ease;
        }
        .admin-products-page .products-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(52,75,58,.08);
        }
        .admin-products-page .products-button:focus-visible,
        .admin-products-page input:focus-visible,
        .admin-products-page select:focus-visible {
          outline: 2px solid ${colors.green};
          outline-offset: 2px;
        }
        .admin-products-page .products-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 13px;
        }
        .admin-products-page .products-stat {
          min-width: 0;
          padding: 18px;
          border: 1px solid ${colors.border};
          border-radius: 17px;
          background: ${colors.cream};
          box-shadow: 0 4px 13px rgba(52,75,58,.025);
        }
        .admin-products-page .products-stat-label {
          color: ${colors.muted};
          font-size: 12px;
          line-height: 1.9;
          min-height: 42px;
        }
        .admin-products-page .products-stat-value {
          margin-top: 5px;
          font-size: 27px;
          font-weight: 850;
          line-height: 1.6;
          overflow-wrap: anywhere;
        }
        .admin-products-page .products-stat-detail {
          margin-top: 5px;
          font-size: 11px;
          color: ${colors.muted};
          line-height: 1.8;
        }
        .admin-products-page .products-filter-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
        }
        .admin-products-page .products-filter-row input {
          flex: 1 1 260px;
          min-width: 0;
          width: 100%;
        }
        .admin-products-page .products-filter-row select {
          width: auto;
          min-width: 150px;
          max-width: 100%;
        }
        .admin-products-page .admin-products-panel {
          overflow: hidden;
          padding: 0;
        }
        .admin-products-page .admin-products-table-wrapper {
          width: 100%;
          min-width: 0;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .admin-products-page .admin-products-desktop-table {
          width: 100%;
          min-width: 950px;
          border-collapse: separate;
          border-spacing: 0;
          text-align: right;
          background: ${colors.cream};
        }
        .admin-products-page .admin-products-desktop-table tbody tr {
          transition: background 140ms ease;
        }
        .admin-products-page .admin-products-desktop-table tbody tr:hover {
          background: #fafbf6;
        }
        .admin-products-page .admin-products-desktop-table tbody tr:last-child td {
          border-bottom: 0;
        }
        .admin-products-page .admin-products-mobile-cards {
          display: none;
        }
        .admin-products-page .products-notice {
          padding: 13px 15px;
          border: 1px solid #d8e7d4;
          border-radius: 13px;
          background: ${colors.greenSoft};
          color: ${colors.greenDark};
          line-height: 1.9;
          font-size: 13px;
        }
        .admin-products-page .products-error {
          padding: 13px 15px;
          border: 1px solid #f1d9d2;
          border-radius: 13px;
          background: ${colors.red};
          color: ${colors.redText};
          line-height: 1.9;
          font-size: 13px;
        }
        .admin-products-page .products-empty {
          padding: 38px 20px;
          text-align: center;
          color: ${colors.muted};
          line-height: 2;
        }
        .admin-products-page .products-empty a {
          color: ${colors.greenDark};
          font-weight: 700;
        }
        .admin-products-page .products-pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .admin-products-page .products-pagination-label {
          color: ${colors.muted};
          font-size: 12px;
          line-height: 2;
        }
        .admin-products-page .products-pagination-actions {
          display: flex;
          gap: 8px;
        }
        @media (max-width: 1100px) {
          .admin-products-page .products-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 700px) {
          .admin-products-page { gap: 16px; }
          .admin-products-page .products-heading { align-items: flex-start; }
          .admin-products-page .products-actions { width: 100%; }
          .admin-products-page .products-actions > * { flex: 1 1 auto; }
          .admin-products-page .products-stats { gap: 10px; }
          .admin-products-page .products-stat { padding: 14px; border-radius: 15px; }
          .admin-products-page .products-stat-label { min-height: 43px; font-size: 11px; }
          .admin-products-page .products-stat-value { font-size: 24px; }
          .admin-products-page .products-filter-panel { padding: 14px; }
          .admin-products-page .products-filter-row input,
          .admin-products-page .products-filter-row select,
          .admin-products-page .products-filter-row button { flex: 1 1 100%; width: 100%; }
          .admin-products-page .admin-products-desktop-table { display: none; }
          .admin-products-page .admin-products-mobile-cards {
            display: grid;
            gap: 12px;
            padding: 12px;
          }
          .admin-products-page .products-pagination { align-items: stretch; }
          .admin-products-page .products-pagination-actions { width: 100%; }
          .admin-products-page .products-pagination-actions button { flex: 1; }
        }
        @media (max-width: 380px) {
          .admin-products-page .products-stats { grid-template-columns: minmax(0, 1fr); }
          .admin-products-page .products-stat-label { min-height: auto; }
        }
      `}</style>

      <header className="products-heading">
        <div>
          <h1 className="products-title">مدیریت محصولات</h1>
          <p className="products-subtitle">
            مشاهده، جست‌وجو، ویرایش و مدیریت وضعیت محصولات فروشگاه
          </p>
        </div>

        <div className="products-actions">
          <button
            type="button"
            className="products-button"
            onClick={() => void loadProducts()}
            disabled={loading}
            style={{
              ...buttonStyle,
              background: colors.cream,
              color: colors.ink,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "در حال دریافت..." : "به‌روزرسانی"}
          </button>

          <Link
            to="/admin/products/create"
            className="products-button"
            style={{
              ...buttonStyle,
              background: colors.greenDark,
              color: "#fff",
              borderColor: colors.greenDark,
            }}
          >
            <span aria-hidden="true">＋</span>
            افزودن محصول
          </Link>
        </div>
      </header>

      {notice && (
        <div role="status" className="products-notice">
          {notice}
        </div>
      )}

      {error && (
        <div role="alert" className="products-error">
          {error}
        </div>
      )}

      <section className="products-stats" aria-label="آمار محصولات">
        {statCards.map((item) => (
          <article className="products-stat" key={item.label}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <div className="products-stat-label">{item.label}</div>
              <span
                aria-hidden="true"
                style={{
                  width: 35,
                  height: 35,
                  borderRadius: 11,
                  background: item.background,
                  color: item.color,
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                  fontSize: 17,
                }}
              >
                ◈
              </span>
            </div>
            <div className="products-stat-value" style={{ color: item.color }}>
              {formatNumber(item.value)}
            </div>
            <div className="products-stat-detail">{item.detail}</div>
          </article>
        ))}
      </section>

      <section
        className="products-filter-panel"
        style={panelStyle}
        aria-label="جست‌وجو و فیلتر محصولات"
      >
        <div
          style={{
            marginBottom: 14,
            color: colors.ink,
            fontSize: 14,
            fontWeight: 800,
          }}
        >
          جست‌وجو و فیلتر
        </div>

        <div className="products-filter-row">
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="جست‌وجو بر اساس نام، کد محصول یا شناسه متنی..."
            aria-label="جست‌وجوی محصولات"
            style={inputStyle}
          />

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            aria-label="فیلتر وضعیت محصول"
            style={inputStyle}
          >
            <option value="all">همه وضعیت‌ها</option>
            <option value="active">فقط فعال</option>
            <option value="inactive">فقط غیرفعال</option>
          </select>

          <button
            type="button"
            className="products-button"
            onClick={clearFilters}
            style={{
              ...buttonStyle,
              background: "#f8f8f1",
              color: colors.ink,
            }}
          >
            پاک کردن فیلترها
          </button>
        </div>
      </section>

      <section
        className="admin-products-panel"
        style={panelStyle}
        aria-label="فهرست محصولات"
      >
        {loading ? (
          <div className="products-empty">در حال دریافت فهرست محصولات...</div>
        ) : products.length === 0 ? (
          <div className="products-empty">
            محصولی برای نمایش پیدا نشد.
            <div style={{ marginTop: 12 }}>
              <Link to="/admin/products/create">افزودن محصول جدید</Link>
            </div>
          </div>
        ) : (
          <div className="admin-products-table-wrapper">
            <table className="admin-products-desktop-table">
              <thead>
                <tr>
                  {[
                    "محصول",
                    "کد محصول",
                    "دسته‌بندی",
                    "قیمت",
                    "موجودی",
                    "وضعیت",
                    "عملیات",
                  ].map((heading) => (
                    <th key={heading} style={tableHeaderStyle}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {products.map((product) => {
                  const thumbnail = getProductImage(product);
                  const imageFailed = failedImages.includes(product.id);

                  const price = calculateProductPrice(
                    product.price,
                    product.discount_percent,
                  );

                  return (
                    <tr key={product.id}>
                      <td style={tableCellStyle}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 11,
                            minWidth: 220,
                          }}
                        >
                          {thumbnail && !imageFailed ? (
                            <img
                              src={thumbnail}
                              alt={product.name}
                              loading="lazy"
                              onError={() =>
                                setFailedImages((current) =>
                                  current.includes(product.id)
                                    ? current
                                    : [...current, product.id],
                                )
                              }
                              style={{
                                width: 49,
                                height: 49,
                                objectFit: "cover",
                                borderRadius: 12,
                                border: `1px solid ${colors.border}`,
                                background: "#f8f8f1",
                                flexShrink: 0,
                              }}
                            />
                          ) : (
                            <div
                              title={
                                thumbnail
                                  ? "فایل تصویر در دسترس نیست"
                                  : "برای این محصول تصویری ثبت نشده است"
                              }
                              style={{
                                width: 49,
                                height: 49,
                                display: "grid",
                                placeItems: "center",
                                borderRadius: 12,
                                background: "#f2f3eb",
                                color: colors.muted,
                                fontSize: 10,
                                textAlign: "center",
                                flexShrink: 0,
                              }}
                            >
                              بدون تصویر
                            </div>
                          )}

                          <div>
                            <div style={{ fontWeight: 800, lineHeight: 1.9 }}>
                              {product.name}
                            </div>
                            <div
                              style={{
                                color: colors.muted,
                                fontSize: 11,
                                marginTop: 3,
                              }}
                            >
                              شناسه: {formatNumber(product.id)}
                              {product.is_featured ? " · ویژه" : ""}
                              {product.is_new ? " · جدید" : ""}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={tableCellStyle}>
                        <div style={{ fontWeight: 700 }}>
                          {product.sku || "—"}
                        </div>
                        <div
                          style={{
                            color: colors.muted,
                            fontSize: 11,
                            marginTop: 4,
                            overflowWrap: "anywhere",
                          }}
                        >
                          {product.slug || "—"}
                        </div>
                      </td>

                      <td style={tableCellStyle}>
                        {product.category?.name || "بدون دسته‌بندی"}
                        {product.brand?.name && (
                          <div
                            style={{
                              color: colors.muted,
                              fontSize: 11,
                              marginTop: 4,
                            }}
                          >
                            {product.brand.name}
                          </div>
                        )}
                      </td>

                      <td style={tableCellStyle}>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-start",
                            gap: 5,
                            minWidth: 130,
                          }}
                        >
                          {price.hasDiscount && (
                            <span
                              style={{
                                color: colors.muted,
                                textDecoration: "line-through",
                                fontSize: 11,
                              }}
                            >
                              {formatNumber(price.originalPrice)} تومان
                            </span>
                          )}

                          <span
                            style={{
                              color: colors.ink,
                              fontWeight: 800,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {formatNumber(
                              price.hasDiscount
                                ? price.finalPrice
                                : price.originalPrice,
                            )}{" "}
                            تومان
                          </span>

                          {price.hasDiscount && (
                            <span
                              style={{
                                padding: "3px 7px",
                                borderRadius: 7,
                                background: colors.red,
                                color: colors.redText,
                                fontSize: 10,
                                fontWeight: 800,
                              }}
                            >
                              {formatNumber(price.discountPercent)}٪ تخفیف
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={tableCellStyle}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minWidth: 35,
                            padding: "5px 9px",
                            borderRadius: 9,
                            background:
                              Number(product.stock) > 0
                                ? colors.greenSoft
                                : colors.red,
                            color:
                              Number(product.stock) > 0
                                ? colors.greenDark
                                : colors.redText,
                            fontWeight: 800,
                          }}
                        >
                          {formatNumber(product.stock)}
                        </span>
                      </td>

                      <td style={tableCellStyle}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "6px 10px",
                            borderRadius: 9,
                            fontSize: 11,
                            fontWeight: 800,
                            background: product.is_active
                              ? colors.greenSoft
                              : colors.red,
                            color: product.is_active
                              ? colors.greenDark
                              : colors.redText,
                          }}
                        >
                          {product.is_active ? "فعال" : "غیرفعال"}
                        </span>
                      </td>

                      <td style={tableCellStyle}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 7,
                            flexWrap: "wrap",
                          }}
                        >
                          <Link
                            className="products-button"
                            to={`/admin/products/${product.id}/edit`}
                            style={{
                              ...buttonStyle,
                              background: colors.greenDark,
                              color: "#fff",
                              borderColor: colors.greenDark,
                            }}
                          >
                            ویرایش
                          </Link>

                          <button
                            type="button"
                            className="products-button"
                            disabled={busyId === product.id}
                            onClick={() => void toggleStatus(product)}
                            style={{
                              ...buttonStyle,
                              background: product.is_active
                                ? colors.amber
                                : colors.greenSoft,
                              color: product.is_active
                                ? colors.amberText
                                : colors.greenDark,
                              opacity: busyId === product.id ? 0.6 : 1,
                              cursor:
                                busyId === product.id
                                  ? "not-allowed"
                                  : "pointer",
                            }}
                          >
                            {busyId === product.id
                              ? "در حال انجام..."
                              : product.is_active
                                ? "غیرفعال‌سازی"
                                : "فعال‌سازی"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && products.length > 0 && (
          <div className="admin-products-mobile-cards">
            {products.map((product) => {
              const price = calculateProductPrice(
                product.price,
                product.discount_percent,
              );

              const thumbnail = getProductImage(product);

              return (
                <article
                  key={product.id}
                  style={{
                    border: `1px solid ${colors.border}`,
                    borderRadius: 15,
                    padding: 14,
                    background: colors.cream,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      marginBottom: 14,
                    }}
                  >
                    <div
                      style={{
                        width: 60,
                        height: 60,
                        flexShrink: 0,
                        borderRadius: 13,
                        overflow: "hidden",
                        background: "#f4f5ee",
                        border: `1px solid ${colors.border}`,
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      {thumbnail && !failedImages.includes(product.id) ? (
                        <img
                          src={thumbnail}
                          alt={product.name}
                          loading="lazy"
                          onError={() =>
                            setFailedImages((previous) =>
                              previous.includes(product.id)
                                ? previous
                                : [...previous, product.id],
                            )
                          }
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                          }}
                        />
                      ) : (
                        <span style={{ fontSize: 10, color: colors.muted }}>
                          بدون تصویر
                        </span>
                      )}
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontWeight: 800,
                          overflowWrap: "anywhere",
                          lineHeight: 1.9,
                          color: colors.ink,
                        }}
                      >
                        {product.name}
                      </div>

                      <div
                        style={{
                          fontSize: 11,
                          color: colors.muted,
                          marginTop: 4,
                        }}
                      >
                        شناسه: {formatNumber(product.id)}
                      </div>

                      {(product.is_featured || product.is_new) && (
                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            flexWrap: "wrap",
                            marginTop: 5,
                            fontSize: 10,
                          }}
                        >
                          {product.is_featured && (
                            <span
                              style={{
                                padding: "3px 6px",
                                borderRadius: 6,
                                background: colors.amber,
                                color: colors.amberText,
                              }}
                            >
                              ویژه
                            </span>
                          )}
                          {product.is_new && (
                            <span
                              style={{
                                padding: "3px 6px",
                                borderRadius: 6,
                                background: colors.lilac,
                                color: colors.lilacText,
                              }}
                            >
                              جدید
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                      gap: 12,
                      marginBottom: 14,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: colors.muted, fontSize: 11 }}>
                        دسته‌بندی
                      </div>
                      <div
                        style={{
                          marginTop: 5,
                          overflowWrap: "anywhere",
                          fontSize: 12,
                          fontWeight: 700,
                          lineHeight: 1.9,
                        }}
                      >
                        {product.category?.name || "بدون دسته‌بندی"}
                      </div>
                      {product.brand?.name && (
                        <div
                          style={{
                            color: colors.muted,
                            fontSize: 11,
                            marginTop: 4,
                          }}
                        >
                          {product.brand.name}
                        </div>
                      )}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: colors.muted, fontSize: 11 }}>
                        موجودی
                      </div>
                      <div
                        style={{
                          marginTop: 5,
                          fontWeight: 800,
                          color:
                            Number(product.stock) > 0
                              ? colors.greenDark
                              : colors.redText,
                        }}
                      >
                        {formatNumber(product.stock)}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      borderTop: `1px solid ${colors.border}`,
                      borderBottom: `1px solid ${colors.border}`,
                      padding: "12px 0",
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ color: colors.muted, fontSize: 11 }}>
                      قیمت
                    </div>

                    {price.hasDiscount && (
                      <div
                        style={{
                          color: colors.muted,
                          textDecoration: "line-through",
                          fontSize: 11,
                          marginTop: 5,
                        }}
                      >
                        {formatNumber(price.originalPrice)} تومان
                      </div>
                    )}

                    <div
                      style={{
                        color: colors.ink,
                        fontWeight: 800,
                        marginTop: 5,
                      }}
                    >
                      {formatNumber(
                        price.hasDiscount
                          ? price.finalPrice
                          : price.originalPrice,
                      )}{" "}
                      تومان
                    </div>

                    {price.hasDiscount && (
                      <span
                        style={{
                          display: "inline-block",
                          marginTop: 6,
                          padding: "4px 7px",
                          borderRadius: 7,
                          background: colors.red,
                          color: colors.redText,
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      >
                        {formatNumber(price.discountPercent)}٪ تخفیف
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      flexWrap: "wrap",
                      marginBottom: 12,
                    }}
                  >
                    <span style={{ fontSize: 11, color: colors.muted }}>
                      وضعیت محصول
                    </span>

                    <span
                      style={{
                        padding: "6px 10px",
                        borderRadius: 9,
                        fontSize: 11,
                        fontWeight: 800,
                        background: product.is_active
                          ? colors.greenSoft
                          : colors.red,
                        color: product.is_active
                          ? colors.greenDark
                          : colors.redText,
                      }}
                    >
                      {product.is_active ? "فعال" : "غیرفعال"}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Link
                      className="products-button"
                      to={`/admin/products/${product.id}/edit`}
                      style={{
                        ...buttonStyle,
                        flex: "1 1 100px",
                        background: colors.greenDark,
                        color: "#fff",
                        borderColor: colors.greenDark,
                        minHeight: 42,
                      }}
                    >
                      ویرایش
                    </Link>

                    <button
                      type="button"
                      className="products-button"
                      disabled={busyId === product.id}
                      onClick={() => void toggleStatus(product)}
                      style={{
                        ...buttonStyle,
                        flex: "1 1 130px",
                        minHeight: 42,
                        background: product.is_active
                          ? colors.amber
                          : colors.greenSoft,
                        color: product.is_active
                          ? colors.amberText
                          : colors.greenDark,
                        opacity: busyId === product.id ? 0.6 : 1,
                      }}
                    >
                      {busyId === product.id
                        ? "در حال انجام..."
                        : product.is_active
                          ? "غیرفعال‌سازی"
                          : "فعال‌سازی"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <footer className="products-pagination">
        <span className="products-pagination-label">
          صفحه {formatNumber(pagination.current_page)} از{" "}
          {formatNumber(pagination.last_page)} — مجموع{" "}
          {formatNumber(pagination.total)} محصول
        </span>

        <div className="products-pagination-actions">
          <button
            type="button"
            className="products-button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            style={{
              ...buttonStyle,
              background: colors.cream,
              color: colors.ink,
              opacity: page <= 1 || loading ? 0.5 : 1,
              cursor: page <= 1 || loading ? "not-allowed" : "pointer",
            }}
          >
            صفحه قبل
          </button>

          <button
            type="button"
            className="products-button"
            disabled={page >= pagination.last_page || loading}
            onClick={() =>
              setPage((current) => Math.min(pagination.last_page, current + 1))
            }
            style={{
              ...buttonStyle,
              background: colors.cream,
              color: colors.ink,
              opacity: page >= pagination.last_page || loading ? 0.5 : 1,
              cursor:
                page >= pagination.last_page || loading
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            صفحه بعد
          </button>
        </div>
      </footer>
    </div>
  );
}

export default AdminProducts;
