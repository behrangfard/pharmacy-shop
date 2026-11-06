import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { adminApi } from "../services/api";
import { getAdminErrorMessage, formatAdminNumber } from "../utils/adminFormat";

interface Brand {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  is_active: boolean;
  sort_order: number;
  products_count?: number;
}

interface BrandForm {
  name: string;
  slug: string;
  description: string;
  logo: string;
  is_active: boolean;
  sort_order: string;
}

const initialForm: BrandForm = {
  name: "",
  slug: "",
  description: "",
  logo: "",
  is_active: true,
  sort_order: "0",
};

function AdminBrands() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [form, setForm] = useState<BrandForm>(initialForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadBrands = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await adminApi.get("/admin/brands");
      const result = response.data?.data;

      if (!Array.isArray(result)) {
        throw new Error("ساختار پاسخ برندها معتبر نیست.");
      }

      setBrands(result);
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBrands();
  }, [loadBrands]);

  const filteredBrands = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fa");

    if (!query) return brands;

    return brands.filter((brand) =>
      [brand.name, brand.slug].some((value) =>
        value.toLocaleLowerCase("fa").includes(query),
      ),
    );
  }, [brands, search]);

  function updateField<K extends keyof BrandForm>(
    field: K,
    value: BrandForm[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
  }

  function startEditing(brand: Brand) {
    setError("");
    setSuccess("");
    setEditingId(brand.id);
    setForm({
      name: brand.name ?? "",
      slug: brand.slug ?? "",
      description: brand.description ?? "",
      logo: brand.logo ?? "",
      is_active: Boolean(brand.is_active),
      sort_order: String(brand.sort_order ?? 0),
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || null,
        description: form.description.trim() || null,
        logo: form.logo.trim() || null,
        is_active: form.is_active,
        sort_order: Number(form.sort_order) || 0,
      };

      if (editingId === null) {
        const response = await adminApi.post("/admin/brands", payload);
        setSuccess(response.data?.message ?? "برند با موفقیت ایجاد شد.");
      } else {
        const response = await adminApi.put(
          `/admin/brands/${editingId}`,
          payload,
        );
        setSuccess(response.data?.message ?? "برند با موفقیت ویرایش شد.");
      }

      resetForm();
      await loadBrands();
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(brand: Brand) {
    setActionId(brand.id);
    setError("");
    setSuccess("");

    try {
      await adminApi.patch(`/admin/brands/${brand.id}/status`, {
        is_active: !brand.is_active,
      });

      setSuccess(brand.is_active ? "برند غیرفعال شد." : "برند فعال شد.");
      await loadBrands();
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setActionId(null);
    }
  }

  async function deleteBrand(brand: Brand) {
    if (!window.confirm(`برند «${brand.name}» حذف شود؟`)) {
      return;
    }

    setActionId(brand.id);
    setError("");
    setSuccess("");

    try {
      const response = await adminApi.delete(`/admin/brands/${brand.id}`);

      setSuccess(response.data?.message ?? "برند حذف شد.");
      await loadBrands();
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setActionId(null);
    }
  }

  return (
    <div dir="rtl" className="admin-page">
      <header className="admin-page-head">
        <div>
          <span className="admin-page-eyebrow">مدیریت کاتالوگ</span>
          <h1 className="admin-page-title">برندها</h1>
          <p className="admin-page-subtitle">
            برندهای فروشگاه را ایجاد و مدیریت کنید. برند غیرفعال در صفحهٔ برندها
            و فیلترهای سایت نمایش داده نمی‌شود.
          </p>
        </div>

        <button
          type="button"
          className="admin-btn"
          onClick={() => void loadBrands()}
          disabled={loading}
        >
          {loading ? "در حال دریافت..." : "بارگذاری مجدد"}
        </button>
      </header>

      {error && (
        <div className="admin-alert admin-alert-error" role="alert">
          <span aria-hidden="true">!</span>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="admin-alert admin-alert-success" role="status">
          <span aria-hidden="true">✓</span>
          <span>{success}</span>
        </div>
      )}

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2 className="admin-card-title">
              {editingId === null ? "افزودن برند جدید" : "ویرایش برند"}
            </h2>
            <p className="admin-card-desc">
              اگر اسلاگ را خالی بگذارید، به‌صورت خودکار از نام برند ساخته
              می‌شود.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="admin-form-grid">
            <div className="admin-field">
              <label className="admin-label" htmlFor="brand-name">
                نام برند *
              </label>
              <input
                id="brand-name"
                className="admin-input"
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                required
                maxLength={255}
              />
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="brand-slug">
                اسلاگ (اختیاری)
              </label>
              <input
                id="brand-slug"
                className="admin-input"
                value={form.slug}
                onChange={(event) => updateField("slug", event.target.value)}
                dir="ltr"
                maxLength={255}
                placeholder="brand-name"
              />
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="brand-logo">
                مسیر یا نشانی لوگو
              </label>
              <input
                id="brand-logo"
                className="admin-input"
                value={form.logo}
                onChange={(event) => updateField("logo", event.target.value)}
                dir="ltr"
                maxLength={2048}
                placeholder="/storage/brands/logo.png"
              />
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="brand-sort">
                ترتیب نمایش
              </label>
              <input
                id="brand-sort"
                type="number"
                min={0}
                className="admin-input"
                value={form.sort_order}
                onChange={(event) =>
                  updateField("sort_order", event.target.value)
                }
                dir="ltr"
              />
            </div>

            <div className="admin-field admin-full">
              <label className="admin-label" htmlFor="brand-description">
                توضیحات
              </label>
              <textarea
                id="brand-description"
                className="admin-textarea"
                value={form.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
              />
            </div>

            <label
              className="admin-checkbox admin-full"
              htmlFor="brand-active"
            >
              <input
                id="brand-active"
                type="checkbox"
                checked={form.is_active}
                onChange={(event) =>
                  updateField("is_active", event.target.checked)
                }
              />
              برند فعال باشد
            </label>
          </div>

          <div className="admin-actions">
            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              disabled={saving}
            >
              {saving
                ? "در حال ذخیره..."
                : editingId === null
                  ? "ایجاد برند"
                  : "ذخیرهٔ تغییرات"}
            </button>

            {editingId !== null && (
              <button
                type="button"
                className="admin-btn"
                onClick={resetForm}
                disabled={saving}
              >
                انصراف
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2 className="admin-card-title">فهرست برندها</h2>
            <p className="admin-card-desc">
              {formatAdminNumber(brands.length)} برند ثبت شده است.
            </p>
          </div>
        </div>

        <div className="admin-toolbar">
          <input
            className="admin-input"
            style={{ maxWidth: 320 }}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="جست‌وجوی نام یا اسلاگ برند..."
            aria-label="جست‌وجوی برند"
          />
        </div>

        {loading ? (
          <p className="admin-empty">در حال دریافت برندها...</p>
        ) : filteredBrands.length === 0 ? (
          <p className="admin-empty">برندی با این مشخصات پیدا نشد.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>نام</th>
                  <th>اسلاگ</th>
                  <th>تعداد محصول</th>
                  <th>وضعیت</th>
                  <th>عملیات</th>
                </tr>
              </thead>

              <tbody>
                {filteredBrands.map((brand) => {
                  const busy = actionId === brand.id;

                  return (
                    <tr key={brand.id}>
                      <td>{brand.name}</td>
                      <td dir="ltr">{brand.slug || "—"}</td>
                      <td>
                        <span className="admin-badge admin-badge-gray">
                          {formatAdminNumber(brand.products_count)}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`admin-badge ${
                            brand.is_active
                              ? "admin-badge-green"
                              : "admin-badge-red"
                          }`}
                        >
                          {brand.is_active ? "فعال" : "غیرفعال"}
                        </span>
                      </td>
                      <td>
                        <div className="admin-row-actions">
                          <button
                            type="button"
                            className="admin-btn admin-btn-sm"
                            onClick={() => startEditing(brand)}
                            disabled={busy || saving}
                          >
                            ویرایش
                          </button>

                          <button
                            type="button"
                            className="admin-btn admin-btn-sm"
                            onClick={() => void toggleStatus(brand)}
                            disabled={busy || saving}
                          >
                            {busy
                              ? "..."
                              : brand.is_active
                                ? "غیرفعال‌سازی"
                                : "فعال‌سازی"}
                          </button>

                          <button
                            type="button"
                            className="admin-btn admin-btn-sm admin-btn-danger"
                            onClick={() => void deleteBrand(brand)}
                            disabled={busy || saving}
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

export default AdminBrands;