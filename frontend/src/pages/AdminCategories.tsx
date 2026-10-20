import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";

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
      const response = await api.get("/admin/categories");
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
        await api.put(`/admin/categories/${editingId}`, payload);
        setSuccess("دسته‌بندی با موفقیت ویرایش شد.");
      } else {
        await api.post("/admin/categories", payload);
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
      await api.patch(`/admin/categories/${category.id}/status`, {
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
      await api.delete(`/admin/categories/${category.id}`);

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

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 14,
    boxSizing: "border-box",
    background: "#fff",
    color: "#111827",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: 6,
    fontSize: 14,
    fontWeight: 600,
    color: "#374151",
  };

  const buttonStyle: React.CSSProperties = {
    border: 0,
    borderRadius: 8,
    padding: "9px 14px",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    whiteSpace: "nowrap",
  };

  return (
    <div dir="rtl" style={{ maxWidth: 1400, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ margin: "0 0 8px", fontSize: 26, color: "#111827" }}>
            مدیریت دسته‌بندی‌ها
          </h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>
            ایجاد و مدیریت دسته‌بندی‌های فروشگاه
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadCategories()}
          disabled={loading}
          style={{
            ...buttonStyle,
            background: "#f3f4f6",
            color: "#374151",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "در حال دریافت..." : "بارگذاری مجدد"}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 8,
            background: "#fef2f2",
            color: "#b91c1c",
            border: "1px solid #fecaca",
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 8,
            background: "#ecfdf5",
            color: "#047857",
            border: "1px solid #a7f3d0",
            fontSize: 14,
          }}
        >
          {success}
        </div>
      )}

      <section
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 20,
          marginBottom: 24,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <h2 style={{ margin: "0 0 20px", fontSize: 19, color: "#111827" }}>
          {editingId !== null ? "ویرایش دسته‌بندی" : "افزودن دسته‌بندی جدید"}
        </h2>

        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            <div>
              <label htmlFor="category-name" style={labelStyle}>
                نام دسته‌بندی *
              </label>
              <input
                id="category-name"
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                required
                maxLength={255}
                style={inputStyle}
                placeholder="مثلاً تجهیزات پزشکی"
              />
            </div>

            <div>
              <label htmlFor="category-slug" style={labelStyle}>
                اسلاگ (اختیاری)
              </label>
              <input
                id="category-slug"
                value={form.slug}
                onChange={(event) => updateField("slug", event.target.value)}
                maxLength={255}
                style={inputStyle}
                placeholder="medical-equipment"
                dir="ltr"
              />
            </div>

            <div>
              <label htmlFor="category-parent" style={labelStyle}>
                دسته‌بندی والد
              </label>
              <select
                id="category-parent"
                value={form.parent_id}
                onChange={(event) =>
                  updateField("parent_id", event.target.value)
                }
                style={inputStyle}
              >
                <option value="">بدون والد (دسته‌بندی اصلی)</option>
                {availableParents.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="category-sort-order" style={labelStyle}>
                ترتیب نمایش
              </label>
              <input
                id="category-sort-order"
                type="number"
                min="0"
                step="1"
                value={form.sort_order}
                onChange={(event) =>
                  updateField("sort_order", event.target.value)
                }
                style={inputStyle}
              />
            </div>

            <div>
              <label htmlFor="category-image" style={labelStyle}>
                آدرس تصویر (اختیاری)
              </label>
              <input
                id="category-image"
                value={form.image}
                onChange={(event) => updateField("image", event.target.value)}
                style={inputStyle}
                placeholder="/storage/categories/example.jpg"
                dir="ltr"
              />
            </div>

            <div>
              <label htmlFor="category-meta-title" style={labelStyle}>
                عنوان سئو
              </label>
              <input
                id="category-meta-title"
                value={form.meta_title}
                onChange={(event) =>
                  updateField("meta_title", event.target.value)
                }
                maxLength={255}
                style={inputStyle}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="category-description" style={labelStyle}>
                توضیحات
              </label>
              <textarea
                id="category-description"
                value={form.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="category-meta-description" style={labelStyle}>
                توضیحات سئو
              </label>
              <textarea
                id="category-meta-description"
                value={form.meta_description}
                onChange={(event) =>
                  updateField("meta_description", event.target.value)
                }
                rows={2}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>

            <label
              htmlFor="category-active"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 14,
                color: "#374151",
                cursor: "pointer",
              }}
            >
              <input
                id="category-active"
                type="checkbox"
                checked={form.is_active}
                onChange={(event) =>
                  updateField("is_active", event.target.checked)
                }
              />
              دسته‌بندی فعال باشد
            </label>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginTop: 20,
            }}
          >
            <button
              type="submit"
              disabled={saving}
              style={{
                ...buttonStyle,
                background: "#2563eb",
                color: "#fff",
                opacity: saving ? 0.6 : 1,
              }}
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
                onClick={resetForm}
                disabled={saving}
                style={{
                  ...buttonStyle,
                  background: "#f3f4f6",
                  color: "#374151",
                }}
              >
                لغو ویرایش
              </button>
            )}
          </div>
        </form>
      </section>

      <section
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 20,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 19, color: "#111827" }}>
            فهرست دسته‌بندی‌ها
          </h2>

          <input
            aria-label="جست‌وجوی دسته‌بندی‌ها"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="جست‌وجوی نام، اسلاگ یا والد..."
            style={{ ...inputStyle, maxWidth: 320 }}
          />
        </div>

        {loading ? (
          <p style={{ color: "#6b7280", textAlign: "center", padding: 24 }}>
            در حال دریافت دسته‌بندی‌ها...
          </p>
        ) : filteredCategories.length === 0 ? (
          <p style={{ color: "#6b7280", textAlign: "center", padding: 24 }}>
            دسته‌بندی‌ای برای نمایش پیدا نشد.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 760,
                fontSize: 14,
              }}
            >
              <thead>
                <tr style={{ background: "#f9fafb", color: "#4b5563" }}>
                  {[
                    "نام",
                    "اسلاگ",
                    "والد",
                    "محصولات",
                    "زیردسته‌ها",
                    "وضعیت",
                    "عملیات",
                  ].map((heading) => (
                    <th
                      key={heading}
                      scope="col"
                      style={{
                        padding: "12px 10px",
                        textAlign: "right",
                        borderBottom: "1px solid #e5e7eb",
                        whiteSpace: "nowrap",
                        fontWeight: 600,
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredCategories.map((category) => {
                  const busy = actionId === category.id;

                  return (
                    <tr key={category.id}>
                      <td
                        style={{
                          padding: 12,
                          borderBottom: "1px solid #f3f4f6",
                          color: "#111827",
                          fontWeight: 600,
                        }}
                      >
                        {category.name}
                      </td>

                      <td
                        dir="ltr"
                        style={{
                          padding: 12,
                          borderBottom: "1px solid #f3f4f6",
                          textAlign: "left",
                          color: "#6b7280",
                        }}
                      >
                        {category.slug}
                      </td>

                      <td
                        style={{
                          padding: 12,
                          borderBottom: "1px solid #f3f4f6",
                          color: "#6b7280",
                        }}
                      >
                        {category.parent?.name ?? "—"}
                      </td>

                      <td
                        style={{
                          padding: 12,
                          borderBottom: "1px solid #f3f4f6",
                        }}
                      >
                        {formatNumber(category.products_count)}
                      </td>

                      <td
                        style={{
                          padding: 12,
                          borderBottom: "1px solid #f3f4f6",
                        }}
                      >
                        {formatNumber(category.children_count)}
                      </td>

                      <td
                        style={{
                          padding: 12,
                          borderBottom: "1px solid #f3f4f6",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 8px",
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 600,
                            background: category.is_active
                              ? "#d1fae5"
                              : "#fee2e2",
                            color: category.is_active ? "#065f46" : "#991b1b",
                          }}
                        >
                          {category.is_active ? "فعال" : "غیرفعال"}
                        </span>
                      </td>

                      <td
                        style={{
                          padding: 12,
                          borderBottom: "1px solid #f3f4f6",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            flexWrap: "wrap",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => startEditing(category)}
                            disabled={busy}
                            style={{
                              ...buttonStyle,
                              background: "#dbeafe",
                              color: "#1d4ed8",
                            }}
                          >
                            ویرایش
                          </button>

                          <button
                            type="button"
                            onClick={() => void toggleStatus(category)}
                            disabled={busy}
                            style={{
                              ...buttonStyle,
                              background: category.is_active
                                ? "#fef3c7"
                                : "#d1fae5",
                              color: category.is_active ? "#92400e" : "#065f46",
                            }}
                          >
                            {busy
                              ? "در حال انجام..."
                              : category.is_active
                                ? "غیرفعال‌سازی"
                                : "فعال‌سازی"}
                          </button>

                          <button
                            type="button"
                            onClick={() => void deleteCategory(category)}
                            disabled={busy}
                            style={{
                              ...buttonStyle,
                              background: "#fee2e2",
                              color: "#991b1b",
                            }}
                          >
                            حذف
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
      </section>
    </div>
  );
}
