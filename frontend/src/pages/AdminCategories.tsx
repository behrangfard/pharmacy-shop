import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { adminApi } from "../services/api";

interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  description: string | null;
  image: string | null;
  is_active: boolean;
  sort_order: number;
  meta_title: string | null;
  meta_description: string | null;
  products_count?: number;
  children_count?: number;
  parent?: { id: number; name: string } | null;
}

interface CategoryForm {
  name: string;
  slug: string;
  parent_id: string;
  description: string;
  image: string;
  is_active: boolean;
  sort_order: string;
  meta_title: string;
  meta_description: string;
}

const initialForm: CategoryForm = {
  name: "",
  slug: "",
  parent_id: "",
  description: "",
  image: "",
  is_active: true,
  sort_order: "0",
  meta_title: "",
  meta_description: "",
};

const formatNumber = (value: number | undefined) =>
  new Intl.NumberFormat("fa-IR").format(value ?? 0);

function getErrorMessage(error: unknown): string {
  const fallback = "عملیات انجام نشد. لطفاً دوباره تلاش کنید.";

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
      message?: string;
    }
  ).response?.data;

  if (response?.errors) {
    const validationMessages = Object.values(response.errors)
      .flatMap((messages) => (Array.isArray(messages) ? messages : [messages]))
      .filter((message): message is string => typeof message === "string");

    if (validationMessages.length > 0) {
      return validationMessages[0];
    }
  }

  if (response?.message) {
    return response.message;
  }

  const message = (error as { message?: string }).message;
  return message || fallback;
}

function getDescendantIds(
  categories: Category[],
  categoryId: number,
): Set<number> {
  const descendants = new Set<number>();
  const pending = [categoryId];

  while (pending.length > 0) {
    const currentId = pending.pop()!;

    for (const category of categories) {
      if (category.parent_id === currentId && !descendants.has(category.id)) {
        descendants.add(category.id);
        pending.push(category.id);
      }
    }
  }

  return descendants;
}

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<CategoryForm>(initialForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await adminApi.get("/admin/categories");
      const result = response.data?.data;

      if (!Array.isArray(result)) {
        throw new Error("ساختار پاسخ دسته‌بندی‌ها معتبر نیست.");
      }

      setCategories(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const availableParents = useMemo(() => {
    if (editingId === null) {
      return categories;
    }

    const excludedIds = getDescendantIds(categories, editingId);
    excludedIds.add(editingId);

    return categories.filter((category) => !excludedIds.has(category.id));
  }, [categories, editingId]);

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();

    if (!query) {
      return categories;
    }

    return categories.filter((category) => {
      const parentName = category.parent?.name ?? "";

      return [category.name, category.slug, parentName].some((value) =>
        value.toLocaleLowerCase().includes(query),
      );
    });
  }, [categories, search]);

  function updateField<K extends keyof CategoryForm>(
    field: K,
    value: CategoryForm[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
  }

  function startEditing(category: Category) {
    setError("");
    setSuccess("");
    setEditingId(category.id);

    setForm({
      name: category.name ?? "",
      slug: category.slug ?? "",
      parent_id: category.parent_id === null ? "" : String(category.parent_id),
      description: category.description ?? "",
      image: category.image ?? "",
      is_active: Boolean(category.is_active),
      sort_order: String(category.sort_order ?? 0),
      meta_title: category.meta_title ?? "",
      meta_description: category.meta_description ?? "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const name = form.name.trim();

    if (!name) {
      setError("نام دسته‌بندی را وارد کنید.");
      return;
    }

    const parentId = form.parent_id ? Number(form.parent_id) : null;

    if (editingId !== null && parentId === editingId) {
      setError("یک دسته‌بندی نمی‌تواند والد خودش باشد.");
      return;
    }

    if (
      editingId !== null &&
      parentId !== null &&
      getDescendantIds(categories, editingId).has(parentId)
    ) {
      setError("انتخاب یکی از زیردسته‌ها به‌عنوان والد مجاز نیست.");
      return;
    }

    const parsedSortOrder = Number.parseInt(form.sort_order, 10);

    const payload = {
      name,
      slug: form.slug.trim() || null,
      parent_id: parentId,
      description: form.description.trim() || null,
      image: form.image.trim() || null,
      is_active: form.is_active,
      sort_order: Number.isFinite(parsedSortOrder)
        ? Math.max(0, parsedSortOrder)
        : 0,
      meta_title: form.meta_title.trim() || null,
      meta_description: form.meta_description.trim() || null,
    };

    setSaving(true);

    try {
      if (editingId !== null) {
        await adminApi.put(`/admin/categories/${editingId}`, payload);
        setSuccess("دسته‌بندی با موفقیت ویرایش شد.");
      } else {
        await adminApi.post("/admin/categories", payload);
        setSuccess("دسته‌بندی جدید با موفقیت ایجاد شد.");
      }

      resetForm();
      await loadCategories();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(category: Category) {
    setError("");
    setSuccess("");
    setActionId(category.id);

    try {
      await adminApi.patch(`/admin/categories/${category.id}/status`, {
        is_active: !category.is_active,
      });

      setSuccess("وضعیت دسته‌بندی با موفقیت تغییر کرد.");
      await loadCategories();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionId(null);
    }
  }

  async function deleteCategory(category: Category) {
    const confirmed = window.confirm(
      `آیا از حذف دسته‌بندی «${category.name}» مطمئن هستید؟\n\nاگر دسته‌بندی دارای محصول یا زیردسته باشد، حذف آن امکان‌پذیر نیست.`,
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");
    setActionId(category.id);

    try {
      await adminApi.delete(`/admin/categories/${category.id}`);

      if (editingId === category.id) {
        resetForm();
      }

      setSuccess("دسته‌بندی با موفقیت حذف شد.");
      await loadCategories();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionId(null);
    }
  }

  function renderCategoryActions(category: Category) {
    const busy = actionId === category.id;

    return (
      <div className="admin-category-actions">
        <button
          type="button"
          className="admin-category-button admin-category-button-edit"
          onClick={() => startEditing(category)}
          disabled={busy || saving}
        >
          ویرایش
        </button>

        <button
          type="button"
          className="admin-category-button admin-category-button-status"
          onClick={() => void toggleStatus(category)}
          disabled={busy || saving}
        >
          {busy
            ? "در حال انجام..."
            : category.is_active
              ? "غیرفعال‌سازی"
              : "فعال‌سازی"}
        </button>

        <button
          type="button"
          className="admin-category-button admin-category-button-delete"
          onClick={() => void deleteCategory(category)}
          disabled={busy || saving}
        >
          حذف
        </button>
      </div>
    );
  }

  function renderStatus(category: Category) {
    return (
      <span
        className={`admin-category-status ${
          category.is_active
            ? "admin-category-status-active"
            : "admin-category-status-inactive"
        }`}
      >
        {category.is_active ? "فعال" : "غیرفعال"}
      </span>
    );
  }

  return (
    <div dir="rtl" className="admin-categories-page">
      <header className="admin-categories-heading">
        <div className="admin-categories-heading-copy">
          <span className="admin-categories-eyebrow">مدیریت فروشگاه</span>
          <h1 className="admin-categories-title">مدیریت دسته‌بندی‌ها</h1>
          <p className="admin-categories-subtitle">
            دسته‌بندی‌های فروشگاه را ایجاد کنید و ساختار آن‌ها را مدیریت کنید.
          </p>
        </div>

        <button
          type="button"
          className="admin-category-button admin-category-button-reload"
          onClick={() => void loadCategories()}
          disabled={loading}
        >
          <span className="admin-category-button-icon" aria-hidden="true">
            ↻
          </span>
          {loading ? "در حال دریافت..." : "بارگذاری مجدد"}
        </button>
      </header>

      {error && (
        <div
          className="admin-categories-alert admin-categories-error"
          role="alert"
        >
          <span className="admin-categories-alert-icon" aria-hidden="true">
            !
          </span>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div
          className="admin-categories-alert admin-categories-success"
          role="status"
        >
          <span className="admin-categories-alert-icon" aria-hidden="true">
            ✓
          </span>
          <span>{success}</span>
        </div>
      )}

      <section className="admin-categories-panel admin-categories-form-panel">
        <div className="admin-categories-panel-heading">
          <div className="admin-categories-panel-icon" aria-hidden="true">
            {editingId !== null ? "✎" : "+"}
          </div>
          <div>
            <h2 className="admin-categories-section-title">
              {editingId !== null
                ? "ویرایش دسته‌بندی"
                : "افزودن دسته‌بندی جدید"}
            </h2>
            <p className="admin-categories-section-description">
              اطلاعات اصلی و تنظیمات نمایش دسته‌بندی را وارد کنید.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="admin-categories-form-grid">
            <div className="admin-category-field">
              <label htmlFor="category-name">نام دسته‌بندی *</label>
              <input
                id="category-name"
                className="admin-category-input"
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                required
                maxLength={255}
                placeholder="مثلاً لباس زیر زنانه"
              />
            </div>

            <div className="admin-category-field">
              <label htmlFor="category-slug">اسلاگ (اختیاری)</label>
              <input
                id="category-slug"
                className="admin-category-input"
                value={form.slug}
                onChange={(event) => updateField("slug", event.target.value)}
                maxLength={255}
                placeholder="lingerie-sets"
                dir="ltr"
              />
            </div>

            <div className="admin-category-field">
              <label htmlFor="category-parent">دسته‌بندی والد</label>
              <select
                id="category-parent"
                className="admin-category-input"
                value={form.parent_id}
                onChange={(event) =>
                  updateField("parent_id", event.target.value)
                }
              >
                <option value="">بدون والد (دسته‌بندی اصلی)</option>
                {availableParents.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-category-field">
              <label htmlFor="category-sort-order">ترتیب نمایش</label>
              <input
                id="category-sort-order"
                className="admin-category-input"
                type="number"
                min="0"
                step="1"
                value={form.sort_order}
                onChange={(event) =>
                  updateField("sort_order", event.target.value)
                }
              />
            </div>

            <div className="admin-category-field">
              <label htmlFor="category-image">آدرس تصویر (اختیاری)</label>
              <input
                id="category-image"
                className="admin-category-input"
                value={form.image}
                onChange={(event) => updateField("image", event.target.value)}
                placeholder="/storage/categories/example.jpg"
                dir="ltr"
              />
            </div>

            <div className="admin-category-field">
              <label htmlFor="category-meta-title">عنوان سئو</label>
              <input
                id="category-meta-title"
                className="admin-category-input"
                value={form.meta_title}
                onChange={(event) =>
                  updateField("meta_title", event.target.value)
                }
                maxLength={255}
                placeholder="عنوان مناسب برای موتورهای جست‌وجو"
              />
            </div>

            <div className="admin-category-field admin-categories-full-width">
              <label htmlFor="category-description">توضیحات</label>
              <textarea
                id="category-description"
                className="admin-category-input admin-category-textarea"
                value={form.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
                rows={3}
                placeholder="توضیح کوتاهی درباره این دسته‌بندی..."
              />
            </div>

            <div className="admin-category-field admin-categories-full-width">
              <label htmlFor="category-meta-description">توضیحات سئو</label>
              <textarea
                id="category-meta-description"
                className="admin-category-input admin-category-textarea"
                value={form.meta_description}
                onChange={(event) =>
                  updateField("meta_description", event.target.value)
                }
                rows={2}
                placeholder="توضیح کوتاه برای نمایش در نتایج جست‌وجو"
              />
            </div>

            <label className="admin-categories-checkbox">
              <input
                id="category-active"
                type="checkbox"
                checked={form.is_active}
                onChange={(event) =>
                  updateField("is_active", event.target.checked)
                }
              />
              <span
                className="admin-categories-checkbox-mark"
                aria-hidden="true"
              >
                ✓
              </span>
              <span>دسته‌بندی فعال باشد</span>
            </label>
          </div>

          <div className="admin-categories-form-actions">
            <button
              type="submit"
              className="admin-category-button admin-category-button-primary"
              disabled={saving}
            >
              {saving
                ? "در حال ذخیره..."
                : editingId !== null
                  ? "ذخیره تغییرات"
                  : "ایجاد دسته‌بندی"}
            </button>

            {editingId !== null && (
              <button
                type="button"
                className="admin-category-button admin-category-button-cancel"
                onClick={resetForm}
                disabled={saving}
              >
                لغو ویرایش
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="admin-categories-panel admin-categories-list-panel">
        <div className="admin-categories-list-heading">
          <div className="admin-categories-panel-heading">
            <div className="admin-categories-panel-icon admin-categories-panel-icon-lilac">
              ≡
            </div>
            <div>
              <h2 className="admin-categories-section-title">
                فهرست دسته‌بندی‌ها
              </h2>
              <p className="admin-categories-section-description">
                {formatNumber(categories.length)} دسته‌بندی ثبت شده است.
              </p>
            </div>
          </div>

          <div className="admin-categories-search">
            <span aria-hidden="true">⌕</span>
            <input
              aria-label="جست‌وجوی دسته‌بندی‌ها"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="جست‌وجوی نام، اسلاگ یا والد..."
            />
            {search && (
              <button
                type="button"
                aria-label="پاک کردن جست‌وجو"
                onClick={() => setSearch("")}
              >
                ×
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <p className="admin-categories-message">
            در حال دریافت دسته‌بندی‌ها...
          </p>
        ) : filteredCategories.length === 0 ? (
          <div className="admin-categories-empty">
            <span aria-hidden="true">⌕</span>
            <p>دسته‌بندی‌ای برای نمایش پیدا نشد.</p>
            {search && (
              <button
                type="button"
                className="admin-category-button admin-category-button-cancel"
                onClick={() => setSearch("")}
              >
                پاک کردن جست‌وجو
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="admin-categories-desktop">
              <div className="admin-categories-table-scroll">
                <table className="admin-categories-table">
                  <thead>
                    <tr>
                      {[
                        "نام",
                        "اسلاگ",
                        "والد",
                        "محصولات",
                        "زیردسته‌ها",
                        "وضعیت",
                        "عملیات",
                      ].map((heading) => (
                        <th key={heading} scope="col">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {filteredCategories.map((category) => (
                      <tr key={category.id}>
                        <td className="admin-category-name">
                          <span className="admin-category-name-dot" />
                          {category.name}
                        </td>
                        <td className="admin-category-slug" dir="ltr">
                          {category.slug || "—"}
                        </td>
                        <td>{category.parent?.name ?? "—"}</td>
                        <td>
                          <span className="admin-category-count">
                            {formatNumber(category.products_count)}
                          </span>
                        </td>
                        <td>
                          <span className="admin-category-count admin-category-count-lilac">
                            {formatNumber(category.children_count)}
                          </span>
                        </td>
                        <td>{renderStatus(category)}</td>
                        <td>{renderCategoryActions(category)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="admin-categories-mobile">
              {filteredCategories.map((category) => (
                <article key={category.id} className="admin-category-card">
                  <div className="admin-category-card-header">
                    <div className="admin-category-card-title">
                      <span className="admin-category-card-id">
                        شناسه: {formatNumber(category.id)}
                      </span>
                      <h3>{category.name}</h3>
                    </div>
                    {renderStatus(category)}
                  </div>

                  <div className="admin-category-card-details">
                    <div className="admin-category-detail">
                      <span>اسلاگ</span>
                      <strong dir="ltr">{category.slug || "—"}</strong>
                    </div>
                    <div className="admin-category-detail">
                      <span>دسته‌بندی والد</span>
                      <strong>{category.parent?.name ?? "دسته اصلی"}</strong>
                    </div>
                    <div className="admin-category-stat">
                      <span>محصولات</span>
                      <strong>{formatNumber(category.products_count)}</strong>
                    </div>
                    <div className="admin-category-stat">
                      <span>زیردسته‌ها</span>
                      <strong>{formatNumber(category.children_count)}</strong>
                    </div>
                  </div>

                  <div className="admin-category-card-actions">
                    {renderCategoryActions(category)}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
