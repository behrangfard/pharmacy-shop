import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import ConfirmDialog from "../components/ConfirmDialog";
import { adminApi } from "../services/api";
import { formatAdminNumber, getAdminErrorMessage } from "../utils/adminFormat";
import {
  SEO_ISSUE_LABELS,
  type SeoIssueCode,
  type SeoMetaStatus,
  seoMetaLength,
  seoMetaStatus,
  seoPreviewText,
} from "../utils/seoIssues";

type AuditType = "product" | "category" | "brand" | "page";

const AUDIT_TYPE_LABELS: Record<AuditType, string> = {
  product: "محصولات",
  category: "دسته‌بندی‌ها",
  brand: "برندها",
  page: "صفحات ثابت",
};

const AUDIT_TYPE_BADGES: Record<AuditType, string> = {
  product: "admin-badge admin-badge-blue",
  category: "admin-badge admin-badge-amber",
  brand: "admin-badge admin-badge-gray",
  page: "admin-badge admin-badge-green",
};

interface AuditRow {
  type: AuditType;
  id: number;
  title: string;
  slug: string;
  meta_title: string | null;
  meta_description: string | null;
  public_path: string;
  edit_path: string;
  issues: SeoIssueCode[];
}

interface AuditSummary {
  type: AuditType;
  label: string;
  total: number;
  with_issues: number;
  ok_count: number;
  missing_title: number;
  missing_description: number;
  long_title: number;
  long_description: number;
  duplicate_title: number;
}

interface AuditPayload {
  thresholds: { title_max: number; description_max: number };
  summary: AuditSummary[];
  sitemap: {
    note: string;
    products: number;
    categories: number;
    articles: number;
    pages: number;
    static_pages: number;
    total: number;
  };
  rows: AuditRow[];
  meta: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
  };
}

interface RedirectItem {
  id: number;
  from_path: string;
  to_path: string;
  is_active: boolean;
  hits: number;
  updated_at: string | null;
}

interface RedirectForm {
  from_path: string;
  to_path: string;
  is_active: boolean;
}

const emptyRedirectForm: RedirectForm = {
  from_path: "",
  to_path: "",
  is_active: true,
};

function metaColorClass(status: SeoMetaStatus): string {
  if (status === "missing") return "text-red-600 font-bold";
  if (status === "long") return "text-amber-700 font-bold";
  return "text-emerald-700";
}

function AdminSeo() {
  const [tab, setTab] = useState<"audit" | "redirects">("audit");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [audit, setAudit] = useState<AuditPayload | null>(null);
  const [auditType, setAuditType] = useState<"" | AuditType>("");
  const [auditPage, setAuditPage] = useState(1);
  const [auditLoading, setAuditLoading] = useState(true);
  const [selectedRow, setSelectedRow] = useState<AuditRow | null>(null);

  const [redirects, setRedirects] = useState<RedirectItem[]>([]);
  const [redirectLoading, setRedirectLoading] = useState(true);
  const [redirectForm, setRedirectForm] = useState<RedirectForm>(emptyRedirectForm);
  const [editingRedirectId, setEditingRedirectId] = useState<number | null>(null);
  const [redirectSearch, setRedirectSearch] = useState("");
  const [redirectSaving, setRedirectSaving] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<RedirectItem | null>(null);

  const loadAudit = useCallback(async () => {
    setAuditLoading(true);
    setError("");

    try {
      const response = await adminApi.get("/admin/seo/audit", {
        params: {
          page: auditPage,
          per_page: 20,
          ...(auditType ? { type: auditType } : {}),
        },
      });

      const data = response.data?.data;

      if (!data || !Array.isArray(data.rows)) {
        throw new Error("ساختار پاسخ سلامت سئو معتبر نیست.");
      }

      setAudit(data);
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setAuditLoading(false);
    }
  }, [auditPage, auditType]);

  const loadRedirects = useCallback(async () => {
    setRedirectLoading(true);
    setError("");

    try {
      const response = await adminApi.get("/admin/redirects");
      const result = response.data?.data;

      if (!Array.isArray(result)) {
        throw new Error("ساختار پاسخ ریدایرکت‌ها معتبر نیست.");
      }

      setRedirects(result);
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setRedirectLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAudit();
  }, [loadAudit]);

  // فهرست ریدایرکت‌ها فقط وقتی تب آن باز است گرفته می‌شود تا باز کردن صفحهٔ
  // ممیزی یک درخواست اضافه نزند.
  useEffect(() => {
    if (tab !== "redirects") return;

    void loadRedirects();
  }, [tab, loadRedirects]);

  const filteredRedirects = useMemo(() => {
    const query = redirectSearch.trim().toLocaleLowerCase("fa");

    if (!query) return redirects;

    return redirects.filter((rule) =>
      [rule.from_path, rule.to_path].some((value) =>
        value.toLocaleLowerCase("fa").includes(query),
      ),
    );
  }, [redirects, redirectSearch]);

  const auditTotals = useMemo(() => {
    return (audit?.summary ?? []).reduce(
      (acc, item) => ({
        total: acc.total + item.total,
        withIssues: acc.withIssues + item.with_issues,
      }),
      { total: 0, withIssues: 0 },
    );
  }, [audit]);

  function updateRedirectField<K extends keyof RedirectForm>(
    field: K,
    value: RedirectForm[K],
  ) {
    setRedirectForm((current) => ({ ...current, [field]: value }));
  }

  function resetRedirectForm() {
    setRedirectForm(emptyRedirectForm);
    setEditingRedirectId(null);
  }

  function startEditingRedirect(rule: RedirectItem) {
    setError("");
    setSuccess("");
    setEditingRedirectId(rule.id);
    setRedirectForm({
      from_path: rule.from_path,
      to_path: rule.to_path,
      is_active: Boolean(rule.is_active),
    });
    setTab("redirects");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleRedirectSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (redirectSaving) return;

    setRedirectSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        from_path: redirectForm.from_path.trim(),
        to_path: redirectForm.to_path.trim(),
        is_active: redirectForm.is_active,
      };

      if (editingRedirectId === null) {
        const response = await adminApi.post("/admin/redirects", payload);
        setSuccess(response.data?.message ?? "ریدایرکت ثبت شد.");
      } else {
        const response = await adminApi.put(
          `/admin/redirects/${editingRedirectId}`,
          payload,
        );
        setSuccess(response.data?.message ?? "ریدایرکت ویرایش شد.");
      }

      resetRedirectForm();
      await loadRedirects();
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setRedirectSaving(false);
    }
  }

  async function toggleRedirect(rule: RedirectItem) {
    if (actionId !== null) return;

    setActionId(rule.id);
    setError("");
    setSuccess("");

    try {
      const response = await adminApi.put(`/admin/redirects/${rule.id}`, {
        from_path: rule.from_path,
        to_path: rule.to_path,
        is_active: !rule.is_active,
      });

      setSuccess(
        response.data?.message ??
          (rule.is_active ? "ریدایرکت غیرفعال شد." : "ریدایرکت فعال شد."),
      );

      await loadRedirects();
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setActionId(null);
    }
  }

  async function handleDeleteRedirect() {
    if (!pendingDelete || actionId !== null) return;

    setActionId(pendingDelete.id);
    setError("");

    try {
      const response = await adminApi.delete(
        `/admin/redirects/${pendingDelete.id}`,
      );

      setSuccess(response.data?.message ?? "ریدایرکت حذف شد.");
      setPendingDelete(null);
      await loadRedirects();
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setActionId(null);
    }
  }

  const auditRows = audit?.rows ?? [];
  const auditMeta = audit?.meta;
  const titleMax = audit?.thresholds.title_max ?? 60;
  const descriptionMax = audit?.thresholds.description_max ?? 160;

  const auditSection = (
    <>
      <div className="admin-stats">
        <div className="admin-stat">
          <span className="admin-stat-label">صفحه‌های ممیزی‌شده</span>
          <strong className="admin-stat-value">
            {formatAdminNumber(auditTotals.total)}
          </strong>
          <span className="admin-stat-hint">
            محصول، دسته، برند و صفحهٔ ثابتِ فعال
          </span>
        </div>

        <div className="admin-stat">
          <span className="admin-stat-label">دارای مشکل متا</span>
          <strong className="admin-stat-value">
            {formatAdminNumber(auditTotals.withIssues)}
          </strong>
          <span className="admin-stat-hint">ردیف‌های جدول پایین</span>
        </div>

        <div className="admin-stat">
          <span className="admin-stat-label">آدرس‌های sitemap</span>
          <strong className="admin-stat-value">
            {formatAdminNumber(audit?.sitemap.total ?? 0)}
          </strong>
          <span className="admin-stat-hint">
            محصول {formatAdminNumber(audit?.sitemap.products ?? 0)} · دسته{" "}
            {formatAdminNumber(audit?.sitemap.categories ?? 0)} · مقاله{" "}
            {formatAdminNumber(audit?.sitemap.articles ?? 0)} · صفحه{" "}
            {formatAdminNumber(audit?.sitemap.pages ?? 0)}
          </span>
        </div>
      </div>

      {audit?.sitemap.note && (
        <section className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2 className="admin-card-title">نقشهٔ سایت</h2>
              <p className="admin-card-desc">{audit.sitemap.note}</p>
            </div>
          </div>
        </section>
      )}

      {selectedRow && (
        <section className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2 className="admin-card-title">پیش‌نمایش نتیجهٔ گوگل</h2>
              <p className="admin-card-desc">
                {AUDIT_TYPE_LABELS[selectedRow.type]}: {selectedRow.title}
              </p>
            </div>
            <button
              type="button"
              className="admin-btn admin-btn-sm"
              onClick={() => setSelectedRow(null)}
            >
              بستن
            </button>
          </div>

          <div
            style={{
              border: "1px solid var(--color-line, #e2e8f0)",
              borderRadius: 12,
              padding: 14,
              display: "grid",
              gap: 4,
            }}
          >
            <span className="text-xs text-slate-500" dir="ltr">
              {`${window.location.origin}${selectedRow.public_path}`}
            </span>
            <span className="text-[17px] font-extrabold text-slate-900">
              {seoPreviewText(selectedRow.meta_title, selectedRow.title, titleMax)}
            </span>
            <span className="text-sm leading-6 text-slate-700">
              {seoPreviewText(
                selectedRow.meta_description,
                "توضیح متا ندارد؛ گوگل بخشی از متن صفحه را نشان می‌دهد.",
                descriptionMax,
              )}
            </span>
          </div>
        </section>
      )}

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2 className="admin-card-title">صفحه‌های مشکل‌دار</h2>
            <p className="admin-card-desc">
              ویرایش متا در همان بخشِ خود محتوا انجام می‌شود؛ این جدول فقط
              گزارش می‌دهد.
            </p>
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              type="button"
              className={`admin-btn admin-btn-sm ${auditType === "" ? "admin-btn-primary" : ""}`}
              onClick={() => {
                setAuditType("");
                setAuditPage(1);
              }}
            >
              همه
            </button>

            {(Object.keys(AUDIT_TYPE_LABELS) as AuditType[]).map((type) => (
              <button
                key={type}
                type="button"
                className={`admin-btn admin-btn-sm ${auditType === type ? "admin-btn-primary" : ""}`}
                onClick={() => {
                  setAuditType(type);
                  setAuditPage(1);
                }}
              >
                {AUDIT_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        {auditLoading ? (
          <p className="admin-empty">در حال ممیزی متا...</p>
        ) : auditRows.length === 0 ? (
          <p className="admin-empty">در این بخش متای همهٔ صفحه‌ها سالم است.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>نوع</th>
                  <th>عنوان</th>
                  <th>آدرس</th>
                  <th>عنوان سئو</th>
                  <th>توضیح سئو</th>
                  <th>مشکل‌ها</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {auditRows.map((row) => {
                  const titleStatus = seoMetaStatus(row.meta_title, "title");
                  const descriptionStatus = seoMetaStatus(
                    row.meta_description,
                    "description",
                  );

                  return (
                    <tr key={`${row.type}-${row.id}`}>
                      <td>
                        <span className={AUDIT_TYPE_BADGES[row.type]}>
                          {AUDIT_TYPE_LABELS[row.type]}
                        </span>
                      </td>
                      <td>{row.title}</td>
                      <td dir="ltr" style={{ fontSize: 12 }}>
                        {row.public_path}
                      </td>
                      <td>
                        <span className={metaColorClass(titleStatus)}>
                          {seoMetaLength(row.meta_title)}
                        </span>
                      </td>
                      <td>
                        <span className={metaColorClass(descriptionStatus)}>
                          {seoMetaLength(row.meta_description)}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {row.issues.map((issue) => (
                            <span
                              key={issue}
                              className="admin-badge admin-badge-amber"
                            >
                              {SEO_ISSUE_LABELS[issue]}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className="admin-btn admin-btn-sm"
                            onClick={() => setSelectedRow(row)}
                          >
                            پیش‌نمایش
                          </button>
                          <Link className="admin-btn admin-btn-sm" to={row.edit_path}>
                            ویرایش
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {auditMeta && auditMeta.last_page > 1 && (
          <div
            className="admin-actions"
            style={{ justifyContent: "space-between" }}
          >
            <button
              type="button"
              className="admin-btn admin-btn-sm"
              disabled={auditMeta.current_page <= 1}
              onClick={() => setAuditPage((page) => Math.max(1, page - 1))}
            >
              قبلی
            </button>

            <span style={{ fontSize: 13 }}>
              صفحهٔ {formatAdminNumber(auditMeta.current_page)} از{" "}
              {formatAdminNumber(auditMeta.last_page)} —{" "}
              {formatAdminNumber(auditMeta.total)} مورد
            </span>

            <button
              type="button"
              className="admin-btn admin-btn-sm"
              disabled={auditMeta.current_page >= auditMeta.last_page}
              onClick={() => setAuditPage((page) => page + 1)}
            >
              بعدی
            </button>
          </div>
        )}
      </section>

    </>
  );

  const redirectsSection = (
    <>
      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2 className="admin-card-title">
              {editingRedirectId === null
                ? "افزودن ریدایرکت ۳۰۱"
                : "ویرایش ریدایرکت"}
            </h2>
            <p className="admin-card-desc">
              مسیر قدیمی (مثل /product/old-slug) را به مسیر جدید بفرستید؛
              «/» ابتدای مسیر خودکار اضافه می‌شود و مقصد می‌تواند نشانی کامل
              بیرونی هم باشد.
            </p>
          </div>
        </div>

        <form onSubmit={handleRedirectSubmit}>
          <div className="admin-form-grid">
            <div className="admin-field">
              <label className="admin-label" htmlFor="redirect-from">
                مسیر قدیمی *
              </label>
              <input
                id="redirect-from"
                className="admin-input"
                dir="ltr"
                value={redirectForm.from_path}
                onChange={(event) =>
                  updateRedirectField("from_path", event.target.value)
                }
                placeholder="/product/old-slug"
                maxLength={255}
                required
              />
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="redirect-to">
                مسیر یا نشانی جدید *
              </label>
              <input
                id="redirect-to"
                className="admin-input"
                dir="ltr"
                value={redirectForm.to_path}
                onChange={(event) =>
                  updateRedirectField("to_path", event.target.value)
                }
                placeholder="/product/new-slug یا https://example.com/..."
                maxLength={2048}
                required
              />
            </div>

            <label className="admin-checkbox admin-full" htmlFor="redirect-active">
              <input
                id="redirect-active"
                type="checkbox"
                checked={redirectForm.is_active}
                onChange={(event) =>
                  updateRedirectField("is_active", event.target.checked)
                }
              />
              ریدایرکت فعال باشد
            </label>
          </div>

          <div className="admin-actions">
            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              disabled={redirectSaving}
            >
              {redirectSaving
                ? "در حال ذخیره..."
                : editingRedirectId === null
                  ? "ثبت ریدایرکت"
                  : "ذخیرهٔ تغییرها"}
            </button>

            {editingRedirectId !== null && (
              <button
                type="button"
                className="admin-btn"
                onClick={resetRedirectForm}
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
            <h2 className="admin-card-title">فهرست ریدایرکت‌ها</h2>
            <p className="admin-card-desc">
              فایل ریدایرکت هاست (‎_redirects‎ برای Netlify/Cloudflare و
              ‎redirects.conf‎ برای nginx) با هر build از همین فهرست ساخته
              می‌شود. شمارندهٔ «استفاده» نشان می‌دهد کدام مسیر هنوز بازدید
              دارد و کدام را می‌توان حذف کرد.
            </p>
          </div>
        </div>

        <div className="admin-toolbar">
          <input
            className="admin-input"
            value={redirectSearch}
            onChange={(event) => setRedirectSearch(event.target.value)}
            placeholder="جست‌وجو در مسیر مبدأ یا مقصد..."
            aria-label="جست‌وجوی ریدایرکت"
          />

          <span className="admin-badge admin-badge-gray">
            {formatAdminNumber(filteredRedirects.length)} از{" "}
            {formatAdminNumber(redirects.length)} ریدایرکت
          </span>
        </div>

        {redirectLoading ? (
          <p className="admin-empty">در حال دریافت ریدایرکت‌ها...</p>
        ) : filteredRedirects.length === 0 ? (
          <p className="admin-empty">
            ریدایرکتی با این مشخصات پیدا نشد؛ اگر اسلاگی عوض کرده‌اید، مسیر
            قدیمی را همین بالا ثبت کنید.
          </p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>مسیر قدیمی</th>
                  <th>مقصد</th>
                  <th>وضعیت</th>
                  <th>استفاده</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {filteredRedirects.map((rule) => (
                  <tr key={rule.id}>
                    <td dir="ltr" style={{ fontSize: 12 }}>
                      {rule.from_path}
                    </td>
                    <td dir="ltr" style={{ fontSize: 12 }}>
                      {rule.to_path}
                    </td>
                    <td>
                      <span
                        className={`admin-badge ${
                          rule.is_active
                            ? "admin-badge-green"
                            : "admin-badge-gray"
                        }`}
                      >
                        {rule.is_active ? "فعال" : "غیرفعال"}
                      </span>
                    </td>
                    <td>{formatAdminNumber(rule.hits)}</td>
                    <td>
                      <div
                        style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
                      >
                        <button
                          type="button"
                          className="admin-btn admin-btn-sm"
                          onClick={() => startEditingRedirect(rule)}
                          disabled={actionId !== null}
                        >
                          ویرایش
                        </button>

                        <button
                          type="button"
                          className="admin-btn admin-btn-sm"
                          onClick={() => void toggleRedirect(rule)}
                          disabled={actionId !== null}
                        >
                          {rule.is_active ? "غیرفعال" : "فعال"}
                        </button>

                        <button
                          type="button"
                          className="admin-btn admin-btn-sm admin-btn-danger"
                          onClick={() => setPendingDelete(rule)}
                          disabled={actionId !== null}
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

      <ConfirmDialog
        open={pendingDelete !== null}
        title="حذف ریدایرکت"
        description={
          pendingDelete
            ? `مسیر «${pendingDelete.from_path}» دیگر به مقصد فعلی نمی‌رود. مطمئن هستید؟`
            : ""
        }
        tone="danger"
        confirmLabel="حذف"
        busy={actionId !== null && actionId === pendingDelete?.id}
        onConfirm={() => void handleDeleteRedirect()}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );

  return (
    <div dir="rtl" className="admin-page">
      <header className="admin-page-head">
        <div>
          <span className="admin-page-eyebrow">سئو و دیده‌شدن</span>
          <h1 className="admin-page-title">سلامت سئو</h1>
          <p className="admin-page-subtitle">
            متای صفحه‌های عمومی را ممیزی کنید و مسیرهای قدیمی را با ریدایرکت
            ۳۰۱ به مقصد تازه بفرستید؛ بدون ریدایرکت، تغییر اسلاگ ترافیک آن
            صفحه را می‌سوزاند.
          </p>
        </div>

        <button
          type="button"
          className="admin-btn"
          onClick={() => {
            if (tab === "audit") {
              void loadAudit();
            } else {
              void loadRedirects();
            }
          }}
          disabled={tab === "audit" ? auditLoading : redirectLoading}
        >
          {tab === "audit"
            ? auditLoading
              ? "در حال دریافت..."
              : "بارگذاری مجدد"
            : redirectLoading
              ? "در حال دریافت..."
              : "بارگذاری مجدد"}
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

      <div className="admin-toolbar">
        <button
          type="button"
          className={`admin-btn ${tab === "audit" ? "admin-btn-primary" : ""}`}
          onClick={() => setTab("audit")}
          aria-pressed={tab === "audit"}
        >
          ممیزی متا
        </button>

        <button
          type="button"
          className={`admin-btn ${tab === "redirects" ? "admin-btn-primary" : ""}`}
          onClick={() => setTab("redirects")}
          aria-pressed={tab === "redirects"}
        >
          ریدایرکت ۳۰۱
        </button>
      </div>

      {tab === "audit" ? auditSection : redirectsSection}
    </div>
  );
}

export default AdminSeo;
