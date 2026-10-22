import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import { calculateProductPrice } from "../utils/price";

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

const API_ORIGIN = "http://127.0.0.1:8000";

function imageUrl(path: string | null | undefined): string {
  if (!path) return "";

  const value = path.trim();
  if (!value) return "";

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (value.startsWith("/storage/")) {
    return `${API_ORIGIN}${value}`;
  }

  if (value.startsWith("storage/")) {
    return `${API_ORIGIN}/${value}`;
  }

  if (value.startsWith("/")) {
    return `${API_ORIGIN}${value}`;
  }

  return `${API_ORIGIN}/storage/${value.replace(/^\/+/, "")}`;
}

function getProductImage(product: Product): string {
  const primaryImage = product.images?.find((image) => image.is_primary);
  const firstImage = primaryImage ?? product.images?.[0];

  return imageUrl(product.thumbnail || firstImage?.path);
}

function formatNumber(value: string | number | undefined) {
  return new Intl.NumberFormat("fa-IR").format(Number(value ?? 0));
}

const buttonStyle = {
  border: "1px solid #d1d5db",
  borderRadius: 8,
  padding: "8px 12px",
  cursor: "pointer",
  fontSize: 13,
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 5,
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

    if (search) {
      params.search = search;
    }

    if (status !== "all") {
      params.status = status;
    }

    const requestKey = JSON.stringify(params);

    let request = inFlightRequestRef.current;

    if (!request || request.key !== requestKey) {
      const promise = api.get("/admin/products", { params });

      request = {
        key: requestKey,
        promise,
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

      if (requestId !== requestIdRef.current) {
        return;
      }

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

      if (page > lastPage) {
        setPage(1);
      }
    } catch (err: unknown) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      const apiError = err as {
        response?: { data?: { message?: string } };
      };

      setError(
        apiError.response?.data?.message ||
          "دریافت فهرست محصولات با خطا مواجه شد.",
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
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

    const timeout = window.setTimeout(() => {
      setNotice("");
    }, 5000);

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
      await api.patch(`/admin/products/${product.id}/status`, {
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

  return (
    <div
      dir="rtl"
      className="admin-products-page"
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr)",
        gap: 20,
        color: "#111827",
        width: "100%",
        maxWidth: "none",
        minWidth: 0,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 26,
          minWidth: 0,
        }}
      >
        <div>
          <h1
            style={{
              margin: "0 0 8px",
              fontSize: 28,
              fontWeight: 800,
            }}
          >
            مدیریت محصولات
          </h1>

          <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>
            مشاهده، جست‌وجو، ویرایش و مدیریت وضعیت محصولات فروشگاه
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => void loadProducts()}
            disabled={loading}
            style={{
              ...buttonStyle,
              background: "#fff",
              color: "#374151",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "در حال دریافت..." : "به‌روزرسانی"}
          </button>

          <Link
            to="/admin/products/create"
            style={{
              ...buttonStyle,
              background: "#2563eb",
              color: "#fff",
              borderColor: "#2563eb",
            }}
          >
            <span aria-hidden="true">＋</span>
            افزودن محصول
          </Link>
        </div>
      </div>

      {notice && (
        <div
          role="status"
          style={{
            padding: 12,
            borderRadius: 8,
            border: "1px solid #86efac",
            background: "#f0fdf4",
            color: "#166534",
          }}
        >
          {notice}
        </div>
      )}

      {error && (
        <div
          role="alert"
          style={{
            padding: 12,
            borderRadius: 8,
            border: "1px solid #fca5a5",
            background: "#fef2f2",
            color: "#b91c1c",
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: 12,
          minWidth: 0,
        }}
      >
        <div style={statCardStyle}>
          <div style={statLabelStyle}>کل محصولات</div>
          <div style={statValueStyle}>{formatNumber(pagination.total)}</div>
        </div>

        <div style={statCardStyle}>
          <div style={statLabelStyle}>محصولات فعال در این صفحه</div>
          <div style={{ ...statValueStyle, color: "#15803d" }}>
            {formatNumber(activeCount)}
          </div>
        </div>

        <div style={statCardStyle}>
          <div style={statLabelStyle}>محصولات غیرفعال در این صفحه</div>
          <div style={{ ...statValueStyle, color: "#b45309" }}>
            {formatNumber(inactiveCount)}
          </div>
        </div>

        <div style={statCardStyle}>
          <div style={statLabelStyle}>ناموجود در این صفحه</div>
          <div style={{ ...statValueStyle, color: "#b91c1c" }}>
            {formatNumber(outOfStockCount)}
          </div>
        </div>
      </div>

      <div
        style={{
          ...panelStyle,
          width: "100%",
          minWidth: 0,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
            minWidth: 0,
          }}
        >
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="جست‌وجو بر اساس نام، کد محصول یا شناسه متنی..."
            aria-label="جست‌وجوی محصولات"
            style={{
              ...inputStyle,
              flex: "1 1 260px",
              minWidth: 0,
              boxSizing: "border-box",
            }}
          />

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            aria-label="فیلتر وضعیت محصول"
            style={{ ...inputStyle, width: "auto", minWidth: 150 }}
          >
            <option value="all">همه وضعیت‌ها</option>
            <option value="active">فقط فعال</option>
            <option value="inactive">فقط غیرفعال</option>
          </select>

          <button
            type="button"
            onClick={clearFilters}
            style={{ ...buttonStyle, background: "#fff", color: "#374151" }}
          >
            پاک کردن فیلترها
          </button>
        </div>
      </div>

      <div
        className="admin-products-panel"
        style={{
          ...panelStyle,
          width: "100%",
          maxWidth: "none",
          minWidth: 0,
          boxSizing: "border-box",
          padding: 0,
          overflow: "hidden",
        }}
      >
        {loading ? (
          <div style={{ padding: 35, textAlign: "center", color: "#6b7280" }}>
            در حال دریافت فهرست محصولات...
          </div>
        ) : products.length === 0 ? (
          <div style={{ padding: 35, textAlign: "center", color: "#6b7280" }}>
            محصولی برای نمایش پیدا نشد.
            <div style={{ marginTop: 12 }}>
              <Link to="/admin/products/create">افزودن محصول جدید</Link>
            </div>
          </div>
        ) : (
          <div
            className="admin-products-table-wrapper"
            style={{
              display: "block",
              width: "100%",
              maxWidth: "none",
              minWidth: 0,
              overflowX: "auto",
              boxSizing: "border-box",
            }}
          >
            <table
              className="admin-products-desktop-table"
              style={{
                width: "100%",
                minWidth: 950,
                maxWidth: "none",
                borderCollapse: "collapse",
                textAlign: "right",
                tableLayout: "auto",
              }}
            >
              <thead>
                <tr style={{ background: "#f9fafb" }}>
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

                  return (
                    <tr key={product.id}>
                      <td style={tableCellStyle}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            minWidth: 220,
                          }}
                        >
                          {thumbnail && !imageFailed ? (
                            <img
                              src={thumbnail}
                              alt={product.name}
                              loading="lazy"
                              onError={() => {
                                setFailedImages((current) =>
                                  current.includes(product.id)
                                    ? current
                                    : [...current, product.id],
                                );
                              }}
                              style={{
                                width: 48,
                                height: 48,
                                objectFit: "cover",
                                borderRadius: 8,
                                border: "1px solid #e5e7eb",
                                background: "#f9fafb",
                                flexShrink: 0,
                              }}
                            />
                          ) : (
                            <div
                              aria-label="بدون تصویر یا تصویر در دسترس نیست"
                              title={
                                thumbnail
                                  ? "فایل تصویر در دسترس نیست"
                                  : "برای این محصول تصویری ثبت نشده است"
                              }
                              style={{
                                width: 48,
                                height: 48,
                                display: "grid",
                                placeItems: "center",
                                borderRadius: 8,
                                background: "#f3f4f6",
                                color: "#9ca3af",
                                fontSize: 10,
                                textAlign: "center",
                                flexShrink: 0,
                              }}
                            >
                              بدون تصویر
                            </div>
                          )}

                          <div>
                            <div style={{ fontWeight: 600 }}>
                              {product.name}
                            </div>
                            <div
                              style={{
                                color: "#9ca3af",
                                fontSize: 12,
                                marginTop: 4,
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
                        <div>{product.sku || "—"}</div>
                        <div
                          style={{
                            color: "#9ca3af",
                            fontSize: 11,
                            marginTop: 4,
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
                              color: "#9ca3af",
                              fontSize: 12,
                              marginTop: 4,
                            }}
                          >
                            {product.brand.name}
                          </div>
                        )}
                      </td>

                      <td style={tableCellStyle}>
                        {(() => {
                          const {
                            originalPrice,
                            discountPercent,
                            finalPrice,
                            hasDiscount,
                          } = calculateProductPrice(
                            product.price,
                            product.discount_percent,
                          );

                          return hasDiscount ? (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "flex-start",
                                gap: 5,
                                minWidth: 130,
                              }}
                            >
                              <span
                                style={{
                                  color: "#9ca3af",
                                  textDecoration: "line-through",
                                  fontSize: 12,
                                }}
                              >
                                {formatNumber(originalPrice)} تومان
                              </span>

                              <span
                                style={{ color: "#15803d", fontWeight: 700 }}
                              >
                                {formatNumber(finalPrice)} تومان
                              </span>

                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "3px 7px",
                                  borderRadius: 6,
                                  background: "#fef2f2",
                                  color: "#b91c1c",
                                  fontSize: 11,
                                  fontWeight: 600,
                                }}
                              >
                                {formatNumber(discountPercent)}٪ تخفیف
                              </span>
                            </div>
                          ) : (
                            <span style={{ fontWeight: 600 }}>
                              {formatNumber(originalPrice)} تومان
                            </span>
                          );
                        })()}
                      </td>

                      <td style={tableCellStyle}>
                        <span
                          style={{
                            color:
                              Number(product.stock) > 0 ? "#15803d" : "#b91c1c",
                            fontWeight: 600,
                          }}
                        >
                          {formatNumber(product.stock)}
                        </span>
                      </td>

                      <td style={tableCellStyle}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "5px 9px",
                            borderRadius: 20,
                            fontSize: 12,
                            background: product.is_active
                              ? "#dcfce7"
                              : "#fee2e2",
                            color: product.is_active ? "#166534" : "#991b1b",
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
                            to={`/admin/products/${product.id}/edit`}
                            style={{
                              ...buttonStyle,
                              background: "#eff6ff",
                              color: "#1d4ed8",
                              borderColor: "#bfdbfe",
                            }}
                          >
                            ویرایش
                          </Link>

                          <button
                            type="button"
                            disabled={busyId === product.id}
                            onClick={() => void toggleStatus(product)}
                            style={{
                              ...buttonStyle,
                              background: product.is_active
                                ? "#fff7ed"
                                : "#f0fdf4",
                              color: product.is_active ? "#c2410c" : "#15803d",
                              borderColor: product.is_active
                                ? "#fed7aa"
                                : "#bbf7d0",
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
              const {
                originalPrice,
                discountPercent,
                finalPrice,
                hasDiscount,
              } = calculateProductPrice(
                product.price,
                product.discount_percent,
              );

              const thumbnail = getProductImage(product);

              return (
                <article
                  key={product.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: 14,
                    background: "#fff",
                    minWidth: 0,
                    boxSizing: "border-box",
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
                        borderRadius: 8,
                        overflow: "hidden",
                        background: "#f3f4f6",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      {thumbnail && !failedImages.includes(product.id) ? (
                        <img
                          src={thumbnail}
                          alt={product.name}
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
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <span style={{ fontSize: 10, color: "#9ca3af" }}>
                          بدون تصویر
                        </span>
                      )}
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          overflowWrap: "anywhere",
                          lineHeight: 1.8,
                        }}
                      >
                        {product.name}
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          color: "#6b7280",
                          marginTop: 4,
                        }}
                      >
                        شناسه: {formatNumber(product.id)}
                      </div>

                      {(product.is_featured || product.is_new) && (
                        <div style={{ marginTop: 5, fontSize: 11 }}>
                          {product.is_featured && (
                            <span style={{ color: "#b45309", marginLeft: 8 }}>
                              ویژه
                            </span>
                          )}
                          {product.is_new && (
                            <span style={{ color: "#1d4ed8" }}>جدید</span>
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
                      <div style={{ color: "#6b7280", fontSize: 12 }}>
                        دسته‌بندی
                      </div>
                      <div
                        style={{
                          marginTop: 5,
                          overflowWrap: "anywhere",
                          fontSize: 13,
                        }}
                      >
                        {product.category?.name || "بدون دسته‌بندی"}
                      </div>
                      {product.brand?.name && (
                        <div
                          style={{
                            color: "#9ca3af",
                            fontSize: 12,
                            marginTop: 4,
                          }}
                        >
                          {product.brand.name}
                        </div>
                      )}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: "#6b7280", fontSize: 12 }}>
                        موجودی
                      </div>
                      <div
                        style={{
                          marginTop: 5,
                          fontWeight: 700,
                          color:
                            Number(product.stock) > 0 ? "#15803d" : "#b91c1c",
                        }}
                      >
                        {formatNumber(product.stock)}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      borderTop: "1px solid #f3f4f6",
                      borderBottom: "1px solid #f3f4f6",
                      padding: "12px 0",
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ color: "#6b7280", fontSize: 12 }}>قیمت</div>

                    {hasDiscount && (
                      <div
                        style={{
                          color: "#9ca3af",
                          textDecoration: "line-through",
                          fontSize: 12,
                          marginTop: 5,
                        }}
                      >
                        {formatNumber(originalPrice)} تومان
                      </div>
                    )}

                    <div
                      style={{
                        color: hasDiscount ? "#15803d" : "#111827",
                        fontWeight: 700,
                        marginTop: 5,
                      }}
                    >
                      {formatNumber(hasDiscount ? finalPrice : originalPrice)}{" "}
                      تومان
                    </div>

                    {hasDiscount && (
                      <span
                        style={{
                          display: "inline-block",
                          marginTop: 6,
                          padding: "3px 7px",
                          borderRadius: 6,
                          background: "#fef2f2",
                          color: "#b91c1c",
                          fontSize: 11,
                        }}
                      >
                        {formatNumber(discountPercent)}٪ تخفیف
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
                    <span style={{ fontSize: 12, color: "#6b7280" }}>
                      وضعیت محصول
                    </span>

                    <span
                      style={{
                        padding: "5px 9px",
                        borderRadius: 20,
                        fontSize: 12,
                        background: product.is_active ? "#dcfce7" : "#fee2e2",
                        color: product.is_active ? "#166534" : "#991b1b",
                      }}
                    >
                      {product.is_active ? "فعال" : "غیرفعال"}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <Link
                      to={`/admin/products/${product.id}/edit`}
                      style={{
                        ...buttonStyle,
                        flex: "1 1 100px",
                        textAlign: "center",
                        background: "#eff6ff",
                        color: "#1d4ed8",
                        borderColor: "#bfdbfe",
                        minHeight: 42,
                      }}
                    >
                      ویرایش
                    </Link>

                    <button
                      type="button"
                      disabled={busyId === product.id}
                      onClick={() => void toggleStatus(product)}
                      style={{
                        ...buttonStyle,
                        flex: "1 1 130px",
                        minHeight: 42,
                        background: product.is_active ? "#fff7ed" : "#f0fdf4",
                        color: product.is_active ? "#c2410c" : "#15803d",
                        borderColor: product.is_active ? "#fed7aa" : "#bbf7d0",
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
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          minWidth: 0,
        }}
      >
        <span style={{ color: "#6b7280", fontSize: 13 }}>
          صفحه {formatNumber(pagination.current_page)} از{" "}
          {formatNumber(pagination.last_page)} — مجموع{" "}
          {formatNumber(pagination.total)} محصول
        </span>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            style={{
              ...buttonStyle,
              background: "#fff",
              color: "#374151",
              opacity: page <= 1 || loading ? 0.5 : 1,
              cursor: page <= 1 || loading ? "not-allowed" : "pointer",
            }}
          >
            صفحه قبل
          </button>

          <button
            type="button"
            disabled={page >= pagination.last_page || loading}
            onClick={() =>
              setPage((current) => Math.min(pagination.last_page, current + 1))
            }
            style={{
              ...buttonStyle,
              background: "#fff",
              color: "#374151",
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
      </div>
    </div>
  );
}

const statCardStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 18,
} as const;

const statLabelStyle = {
  fontSize: 13,
  color: "#6b7280",
  marginBottom: 10,
} as const;

const statValueStyle = {
  fontSize: 25,
  fontWeight: 700,
} as const;

const panelStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 16,
} as const;

const inputStyle = {
  border: "1px solid #d1d5db",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 14,
  background: "#fff",
  color: "#111827",
} as const;

const tableHeaderStyle = {
  padding: "13px 14px",
  fontSize: 13,
  color: "#4b5563",
  fontWeight: 600,
  whiteSpace: "nowrap",
  borderBottom: "1px solid #e5e7eb",
} as const;

const tableCellStyle = {
  padding: 14,
  fontSize: 13,
  verticalAlign: "middle" as const,
  borderBottom: "1px solid #f3f4f6",
} as const;

export default AdminProducts;
