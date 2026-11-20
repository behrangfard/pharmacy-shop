import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../../../services/api";
import { calculateProductPrice } from "../../../utils/price";

export interface CategoryProductsPanelCategory {
  id: number;
  name: string;
  children_count?: number;
}

interface CategoryOption {
  id: number;
  name: string;
}

interface ProductRow {
  id: number;
  name: string;
  sku: string;
  price: string | number;
  discount_percent?: string | number | null;
  stock: number;
  is_active: boolean;
  category_id: number;
  category?: { id: number; name: string } | null;
}

interface CategoryProductsPanelProps {
  category: CategoryProductsPanelCategory;
  categories: CategoryOption[];
  onChanged: () => void;
  onMessage: (message: string) => void;
}

const formatNumber = (value: number | string | undefined) =>
  new Intl.NumberFormat("fa-IR").format(Number(value ?? 0));

function getErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== "object") {
    return fallback;
  }

  const response = (
    error as {
      response?: {
        data?: {
          message?: string;
          errors?: Record<string, string[] | string>;
        };
      };
    }
  ).response?.data;

  if (response?.errors) {
    const messages = Object.values(response.errors)
      .flatMap((item) => (Array.isArray(item) ? item : [item]))
      .filter((item): item is string => typeof item === "string");

    if (messages.length > 0) {
      return messages[0];
    }
  }

  return response?.message || fallback;
}

/**
 * پاسخ فهرست محصولات یا آرایهٔ خام است یا صفحه‌بندی Laravel
 * (`data.data`). هر دو شکل پشتیبانی می‌شوند.
 */
function extractProducts(payload: unknown): ProductRow[] {
  const result = (payload as { data?: unknown } | undefined)?.data;

  if (Array.isArray(result)) {
    return result as ProductRow[];
  }

  const nested = (result as { data?: unknown } | null | undefined)?.data;

  return Array.isArray(nested) ? (nested as ProductRow[]) : [];
}

export default function CategoryProductsPanel({
  category,
  categories,
  onChanged,
  onMessage,
}: CategoryProductsPanelProps) {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [includeChildren, setIncludeChildren] = useState(
    Boolean(category.children_count),
  );
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params: Record<string, string | number> = {
        category_id: category.id,
        per_page: 100,
      };

      if (includeChildren) params.include_children = 1;
      if (search) params.search = search;

      const response = await adminApi.get("/admin/products", { params });

      setProducts(extractProducts(response.data));
    } catch (err) {
      setError(
        getErrorMessage(err, "دریافت محصولات این دسته‌بندی با خطا مواجه شد."),
      );
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [category.id, includeChildren, search]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  async function moveProduct(product: ProductRow, targetId: number) {
    if (!targetId || targetId === product.category_id) {
      return;
    }

    const target = categories.find((item) => item.id === targetId);

    if (
      !window.confirm(
        `محصول «${product.name}» به دسته‌بندی «${target?.name ?? ""}» منتقل شود؟`,
      )
    ) {
      return;
    }

    setBusyId(product.id);
    setError("");

    try {
      await adminApi.post("/admin/products/assign-category", {
        category_id: targetId,
        product_ids: [product.id],
      });

      onMessage(
        `محصول «${product.name}» به دسته‌بندی «${target?.name ?? ""}» منتقل شد.`,
      );
      await loadProducts();
      onChanged();
    } catch (err) {
      setError(getErrorMessage(err, "انتقال محصول با خطا مواجه شد."));
    } finally {
      setBusyId(null);
    }
  }

  async function deleteProduct(product: ProductRow) {
    const confirmed = window.confirm(
      `آیا از حذف کامل محصول «${product.name}» اطمینان دارید؟\n\nاین عملیات قابل بازگشت نیست. اگر محصول در سفارشی استفاده شده باشد، حذف انجام نمی‌شود.`,
    );

    if (!confirmed) {
      return;
    }

    setBusyId(product.id);
    setError("");

    try {
      await adminApi.delete(`/admin/products/${product.id}`);

      onMessage(`محصول «${product.name}» با موفقیت حذف شد.`);
      await loadProducts();
      onChanged();
    } catch (err) {
      setError(getErrorMessage(err, "حذف محصول با خطا مواجه شد."));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="category-products-panel" dir="rtl">
      <div className="category-products-toolbar">
        <div className="category-products-toolbar-copy">
          <strong className="category-products-title">
            محصولات دسته‌بندی «{category.name}»
          </strong>
          <p className="category-products-hint">
            هر محصول باید یک دسته‌بندی داشته باشد؛ برای خارج‌کردن محصول از این
            دسته، آن را به دستهٔ دیگر منتقل کنید یا حذف نمایید.
          </p>
        </div>

        <div className="category-products-controls">
          <input
            className="category-products-search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="جست‌وجوی نام یا SKU..."
            aria-label="جست‌وجوی محصولات این دسته‌بندی"
          />

          <button
            type="button"
            className="admin-category-button admin-category-button-primary"
            onClick={() => setAddOpen(true)}
          >
            + افزودن محصول
          </button>

          <Link
            className="admin-category-button admin-category-button-cancel"
            to={`/admin/products/new?category_id=${category.id}`}
          >
            + محصول جدید
          </Link>
        </div>
      </div>

      {Boolean(category.children_count) && (
        <label className="category-products-checkbox">
          <input
            type="checkbox"
            checked={includeChildren}
            onChange={(event) => setIncludeChildren(event.target.checked)}
          />
          <span>نمایش محصولات زیردسته‌ها</span>
        </label>
      )}

      {error && (
        <p className="category-products-error" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="category-products-message">
          در حال دریافت محصولات این دسته‌بندی...
        </p>
      ) : products.length === 0 ? (
        <p className="category-products-message">
          {search
            ? "محصولی با این جست‌وجو در این دسته‌بندی پیدا نشد."
            : "هنوز محصولی در این دسته‌بندی ثبت نشده است."}
        </p>
      ) : (
        <ul className="category-products-list">
          {products.map((product) => {
            const price = calculateProductPrice(
              product.price,
              product.discount_percent ?? 0,
            );

            const busy = busyId === product.id;

            return (
              <li key={product.id} className="category-product-row">
                <div className="category-product-main">
                  <span className="category-product-name">{product.name}</span>

                  <span className="category-product-meta" dir="ltr">
                    {product.sku}
                  </span>

                  <span className="category-product-badges">
                    {product.category && (
                      <span className="category-product-badge">
                        {product.category.name}
                      </span>
                    )}

                    {!product.is_active && (
                      <span className="category-product-badge category-product-badge-muted">
                        غیرفعال
                      </span>
                    )}

                    {Number(product.stock) <= 0 && (
                      <span className="category-product-badge category-product-badge-danger">
                        ناموجود
                      </span>
                    )}
                  </span>
                </div>

                <span className="category-product-price">
                  {formatNumber(price.finalPrice)} تومان
                </span>

                <span className="category-product-stock">
                  موجودی: {formatNumber(product.stock)}
                </span>

                <div className="category-product-actions">
                  <Link
                    className="admin-category-button admin-category-button-edit"
                    to={`/admin/products/${product.id}/edit`}
                  >
                    ویرایش
                  </Link>

                  <select
                    className="category-product-move"
                    value=""
                    disabled={busy}
                    onChange={(event) =>
                      void moveProduct(product, Number(event.target.value))
                    }
                    aria-label={`انتقال «${product.name}» به دسته‌بندی دیگر`}
                  >
                    <option value="">انتقال به دستهٔ...</option>

                    {categories
                      .filter((item) => item.id !== product.category_id)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                  </select>

                  <button
                    type="button"
                    className="admin-category-button admin-category-button-delete"
                    onClick={() => void deleteProduct(product)}
                    disabled={busy}
                  >
                    {busy ? "در حال انجام..." : "حذف"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {addOpen && (
        <AddProductsDialog
          category={category}
          onClose={() => setAddOpen(false)}
          onAdded={(message) => {
            setAddOpen(false);
            onMessage(message);
            void loadProducts();
            onChanged();
          }}
        />
      )}
    </div>
  );
}

interface AddProductsDialogProps {
  category: CategoryProductsPanelCategory;
  onClose: () => void;
  onAdded: (message: string) => void;
}

function AddProductsDialog({
  category,
  onClose,
  onAdded,
}: AddProductsDialogProps) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState<ProductRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params: Record<string, string | number> = { per_page: 100 };

      if (search) params.search = search;

      const response = await adminApi.get("/admin/products", { params });

      setCandidates(
        extractProducts(response.data).filter(
          (product) => product.category_id !== category.id,
        ),
      );
    } catch (err) {
      setError(getErrorMessage(err, "دریافت فهرست محصولات با خطا مواجه شد."));
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, [category.id, search]);

  useEffect(() => {
    void loadCandidates();
  }, [loadCandidates]);

  const allSelected =
    candidates.length > 0 &&
    candidates.every((product) => selectedIds.includes(product.id));

  function toggleSelection(productId: number) {
    setSelectedIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  }

  function toggleAll() {
    setSelectedIds(allSelected ? [] : candidates.map((product) => product.id));
  }

  async function handleAdd() {
    if (selectedIds.length === 0) {
      setError("حداقل یک محصول را انتخاب کنید.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await adminApi.post("/admin/products/assign-category", {
        category_id: category.id,
        product_ids: selectedIds,
      });

      onAdded(
        response.data?.message ||
          "محصولات انتخاب‌شده به این دسته‌بندی اضافه شدند.",
      );
    } catch (err) {
      setError(getErrorMessage(err, "افزودن محصولات با خطا مواجه شد."));
      setSaving(false);
    }
  }

  return (
    <div
      className="category-products-dialog-backdrop"
      onMouseDown={onClose}
      role="presentation"
    >
      <div
        className="category-products-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-products-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="category-products-dialog-header">
          <div>
            <h3 id="category-products-dialog-title">
              افزودن محصول به «{category.name}»
            </h3>
            <p>
              محصولات انتخاب‌شده از دسته‌بندی فعلی خود به این دسته منتقل
              می‌شوند.
            </p>
          </div>

          <button
            type="button"
            className="category-products-dialog-close"
            aria-label="بستن"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <input
          className="category-products-search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="جست‌وجوی نام یا SKU محصول..."
          aria-label="جست‌وجوی محصول برای افزودن"
        />

        {error && (
          <p className="category-products-error" role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <p className="category-products-message">در حال دریافت محصولات...</p>
        ) : candidates.length === 0 ? (
          <p className="category-products-message">
            {search
              ? "محصولی با این جست‌وجو پیدا نشد."
              : "محصول دیگری برای افزودن وجود ندارد."}
          </p>
        ) : (
          <div className="category-products-candidates">
            <label className="category-products-candidate category-products-candidate-all">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
              />
              <span>
                انتخاب همهٔ نتایج ({formatNumber(candidates.length)} محصول)
              </span>
            </label>

            {candidates.map((product) => (
              <label key={product.id} className="category-products-candidate">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(product.id)}
                  onChange={() => toggleSelection(product.id)}
                />

                <span className="category-products-candidate-main">
                  <strong>{product.name}</strong>
                  <span className="category-product-meta" dir="ltr">
                    {product.sku}
                  </span>
                </span>

                <span className="category-products-candidate-category">
                  {product.category?.name ?? "بدون دسته"}
                </span>
              </label>
            ))}
          </div>
        )}

        <div className="category-products-dialog-actions">
          <button
            type="button"
            className="admin-category-button admin-category-button-primary"
            onClick={() => void handleAdd()}
            disabled={saving || selectedIds.length === 0}
          >
            {saving
              ? "در حال افزودن..."
              : `افزودن ${formatNumber(selectedIds.length)} محصول`}
          </button>

          <button
            type="button"
            className="admin-category-button admin-category-button-cancel"
            onClick={onClose}
            disabled={saving}
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
}


