import { FormEvent, useCallback, useEffect, useState } from "react";
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

const emptyForm: CategoryForm = {
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

const cardStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 18,
  marginBottom: 18,
} as const;

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  border: "1px solid #d1d5db",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 14,
  fontFamily: "inherit",
  background: "#fff",
};

const buttonStyle = {
  border: "1px solid #d1d5db",
  borderRadius: 8,
  padding: "9px 12px",
  cursor: "pointer",
  fontSize: 13,
  fontFamily: "inherit",
} as const;

function formatNumber(value: number | undefined) {
  return new Intl.NumberFormat("fa-IR").format(value ?? 0);
}

function getErrorMessage(error: unknown): string {
  const response = (
    error as {
      response?: {
        data?: {
          message?: string;
          errors?: Record<string, string[]>;
        };
      };
    }
  )?.response?.data;

  if (response?.errors) {
    const messages = Object.values(response.errors).flat();
    if (messages.length) return messages.join(" ");
  }

  return response?.message || "عملیات انجام نشد. دوباره تلاش کنید.";
}

function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/admin/categories");
      const data = response.data?.data;

      if (!Array.isArray(data)) {
        throw new Error("ساختار پاسخ دسته‌بندی‌ها معتبر نیست.");
      }

      setCategories(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
    setSuccess("");
  }

  function updateField<K extends keyof CategoryForm>(
    field: K,
    value: CategoryForm[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function startEditing(category: Category) {
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
    setError("");
    setSuccess("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name.trim()) {
      setError("نام دسته‌بندی را وارد کنید.");
      return;
    }

    if (editingId !== null && form.parent_id === String(editingId)) {
      setError("یک دسته‌بندی نمی‌تواند والد خودش باشد.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || null,
      parent_id: form.parent_id ? Number(form.parent_id) : null,
      description: form.description.trim() || null,
      image: form.image.trim() || null,
      is_active: form.is_active,
      sort_order: Math.max(0, Number(form.sort_order) || 0),
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

      setForm(emptyForm);
      setEditingId(null);
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

    try {
      await api.patch(`/admin/categories/${category.id}/status`, {
        is_active: !category.is_active,
      });

      setSuccess("وضعیت دسته‌بندی تغییر کرد.");
      await loadCategories();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function deleteCategory(category: Category) {
    const confirmed = window.confirm(
      `آیا از حذف دسته‌بندی «${category.name}» مطمئن هستید؟`,
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await api.delete(`/admin/categories/${category.id}`);

      if (editingId === category.id) {
        resetForm();
      }

      setSuccess("دسته‌بندی حذف شد.");
      await loadCategories();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const filteredCategories = categories.filter((category) => {
    const value = search.trim().toLocaleLowerCase();

    if (!value) return true;

    return (
      category.name.toLocaleLowerCase().includes(value) ||
      category.slug.toLocaleLowerCase().includes(value) ||
      (category.parent?.name ?? "").toLocaleLowerCase().includes(value)
    );
  });

  const availableParents = categories.filter(
    (category) => category.id !== editingId,
  );

  return (
    <div dir="rtl" style={{ maxWidth: 1400, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 22,
        }}
      >
        <div>
          <h1 style={{ margin: "0 0 8px", fontSize: 25 }}>
            مدیریت دسته‌بندی‌ها
          </h1>
          <p style={{ color: "#6b7280", margin: 0, fontSize: 14 }}>
            ایجاد و مدیریت دسته‌بندی‌های فروشگاه
          </p>
        </div>

        <button
          type="button"
          style={buttonStyle}
          onClick={() => void loadCategories()}
          disabled={loading}
        >
          {loading ? "در حال دریافت..." : "بارگذاری مجدد"}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            ...cardStyle,
            background: "#fef2f2",
            color: "#b91c1c",
            borderColor: "#fecaca",
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          style={{
            ...cardStyle,
            background: "#f0fdf4",
            color: "#166534",
            borderColor: "#bbf7d0",
          }}
        >
          {success}
        </div>
      )}

      <section style={cardStyle}>
        <h2 style={{ marginTop: 0, fontSize: 19 }}>
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
            <label>
              <span style={{ display: "block", marginBottom: 7 }}>
                نام دسته‌بندی *
              </span>
              <input
                style={inputStyle}
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                maxLength={255}
                required
                placeholder="مثلاً محصولات مراقبت پوست"
              />
            </label>

            <label>
              <span style={{ display: "block", marginBottom: 7 }}>
                اسلاگ (اختیاری)
              </span>
              <input
                style={inputStyle}
                value={form.slug}
                onChange={(event) => updateField("slug", event.target.value)}
                maxLength={255}
                placeholder="مثلاً skin-care"
                dir="ltr"
              />
            </label>

            <label>
              <span style={{ display: "block", marginBottom: 7 }}>
                دسته‌بندی والد
              </span>
              <select
                style={inputStyle}
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
            </label>

            <label>
              <span style={{ display: "block", marginBottom: 7 }}>
                ترتیب نمایش
              </span>
              <input
                style={inputStyle}
                type="number"
                min="0"
                step="1"
                value={form.sort_order}
                onChange={(event) =>
                  updateField("sort_order", event.target.value)
                }
              />
            </label>

            <label style={{ gridColumn: "1 / -1" }}>
              <span style={{ display: "block", marginBottom: 7 }}>
                آدرس تصویر (اختیاری)
              </span>
              <input
                style={inputStyle}
                value={form.image}
                onChange={(event) => updateField("image", event.target.value)}
                maxLength={2048}
                placeholder="آدرس تصویر دسته‌بندی"
                dir="ltr"
              />
            </label>

            <label style={{ gridColumn: "1 / -1" }}>
              <span style={{ display: "block", marginBottom: 7 }}>توضیحات</span>
              <textarea
                style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
                value={form.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
              />
            </label>

            <label>
              <span style={{ display: "block", marginBottom: 7 }}>
                عنوان سئو
              </span>
              <input
                style={inputStyle}
                value={form.meta_title}
                onChange={(event) =>
                  updateField("meta_title", event.target.value)
                }
                maxLength={255}
              />
            </label>

            <label>
              <span style={{ display: "block", marginBottom: 7 }}>
                توضیحات سئو
              </span>
              <textarea
                style={{ ...inputStyle, minHeight: 42, resize: "vertical" }}
                value={form.meta_description}
                onChange={(event) =>
                  updateField("meta_description", event.target.value)
                }
              />
            </label>
          </div>

          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              marginTop: 18,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) =>
                updateField("is_active", event.target.checked)
              }
            />
            دسته‌بندی فعال باشد
          </label>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginTop: 18,
            }}
          >
            <button
              type="submit"
              disabled={saving}
              style={{
                ...buttonStyle,
                background: "#2563eb",
                borderColor: "#2563eb",
                color: "#fff",
                opacity: saving ? 0.65 : 1,
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
                style={buttonStyle}
                onClick={resetForm}
                disabled={saving}
              >
                انصراف از ویرایش
              </button>
            )}
          </div>
        </form>
      </section>

      <section style={cardStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 19 }}>
            فهرست دسته‌بندی‌ها ({formatNumber(filteredCategories.length)})
          </h2>

          <input
            style={{ ...inputStyle, maxWidth: 320 }}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="جست‌وجوی نام، اسلاگ یا والد..."
          />
        </div>

        {loading ? (
          <p style={{ color: "#6b7280" }}>در حال دریافت دسته‌بندی‌ها...</p>
        ) : filteredCategories.length === 0 ? (
          <p style={{ color: "#6b7280" }}>دسته‌بندی‌ای برای نمایش پیدا نشد.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
                minWidth: 760,
              }}
            >
              <thead>
                <tr style={{ background: "#f9fafb", textAlign: "right" }}>
                  {[
                    "نام",
                    "اسلاگ",
                    "والد",
                    "محصولات",
                    "زیر‌دسته‌ها",
                    "وضعیت",
                    "عملیات",
                  ].map((heading) => (
                    <th
                      key={heading}
                      style={{
                        padding: 12,
                        borderBottom: "1px solid #e5e7eb",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredCategories.map((category) => (
                  <tr key={category.id}>
                    <td
                      style={{
                        padding: 12,
                        borderBottom: "1px solid #e5e7eb",
                        fontWeight: 600,
                      }}
                    >
                      {category.name}
                    </td>
                    <td
                      dir="ltr"
                      style={{
                        padding: 12,
                        borderBottom: "1px solid #e5e7eb",
                        textAlign: "right",
                      }}
                    >
                      {category.slug}
                    </td>
                    <td
                      style={{
                        padding: 12,
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      {category.parent?.name || "—"}
                    </td>
                    <td
                      style={{
                        padding: 12,
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      {formatNumber(category.products_count)}
                    </td>
                    <td
                      style={{
                        padding: 12,
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      {formatNumber(category.children_count)}
                    </td>
                    <td
                      style={{
                        padding: 12,
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      <span
                        style={{
                          color: category.is_active ? "#166534" : "#b91c1c",
                          background: category.is_active
                            ? "#dcfce7"
                            : "#fee2e2",
                          padding: "5px 8px",
                          borderRadius: 20,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {category.is_active ? "فعال" : "غیرفعال"}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: 12,
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          type="button"
                          style={buttonStyle}
                          onClick={() => startEditing(category)}
                        >
                          ویرایش
                        </button>
                        <button
                          type="button"
                          style={{
                            ...buttonStyle,
                            color: category.is_active ? "#92400e" : "#166534",
                          }}
                          onClick={() => void toggleStatus(category)}
                        >
                          {category.is_active ? "غیرفعال‌سازی" : "فعال‌سازی"}
                        </button>
                        <button
                          type="button"
                          style={{
                            ...buttonStyle,
                            color: "#b91c1c",
                          }}
                          onClick={() => void deleteCategory(category)}
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminCategories;
