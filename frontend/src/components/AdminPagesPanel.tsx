import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  FileText,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";

import {
  createPage,
  deletePage,
  fetchAdminPage,
  fetchAdminPages,
  invalidateSitePagesCache,
  updatePage,
  updatePageStatus,
  type AdminPage,
  type AdminPageStats,
  type PaginationMeta,
  type PagePayload,
} from "../services/pages";
import {
  formatAdminDate,
  formatAdminNumber,
  getAdminErrorMessage,
} from "../utils/adminFormat";

interface PageForm {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  seo_title: string;
  seo_description: string;
  sort_order: string;
  is_published: boolean;
  show_in_footer: boolean;
}

const initialForm: PageForm = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  seo_title: "",
  seo_description: "",
  sort_order: "0",
  is_published: true,
  show_in_footer: true,
};

const EMPTY_META: PaginationMeta = {
  current_page: 1,
  last_page: 1,
  per_page: 20,
  total: 0,
};

const EMPTY_STATS: AdminPageStats = {
  total: 0,
  published: 0,
  draft: 0,
  footer: 0,
};

type StatusFilter = "all" | "published" | "draft";

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "همه" },
  { value: "published", label: "منتشرشده" },
  { value: "draft", label: "پیش‌نویس" },
];

/**
 * تب «صفحات سایت» در بخش مدیریت محتوا.
 *
 * مدیر می‌تواند صفحات ثابت (درباره ما، تماس با ما، قوانین و ...) را بنویسد،
 * منتشر کند و انتخاب کند در فوتر سایت لینک شوند. متن با نشانه‌گذاری سبک
 * (##، ###، -، > و **) نوشته می‌شود؛ همان قالب مقاله‌های فروشگاه.
 */
function AdminPagesPanel() {
  const [pages, setPages] = useState<AdminPage[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [stats, setStats] = useState<AdminPageStats>(EMPTY_STATS);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingEditor, setLoadingEditor] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PageForm>(initialForm);

  const formRef = useRef<HTMLDivElement>(null);

  const loadPages = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await fetchAdminPages({
        page,
        status: statusFilter,
        q: activeQuery || undefined,
      });

      setPages(result.pages);
      setMeta(result.meta);
      setStats(result.stats);
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, activeQuery]);

  useEffect(() => {
    void loadPages();
  }, [loadPages]);

  function updateField<K extends keyof PageForm>(
    field: K,
    value: PageForm[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
    setFormOpen(false);
  }

  function openCreateForm() {
    setForm(initialForm);
    setEditingId(null);
    setFormOpen(true);

    window.setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  async function openEditForm(target: AdminPage) {
    setError("");
    setLoadingEditor(true);
    setEditingId(target.id);
    setFormOpen(true);

    try {
      const detail = await fetchAdminPage(target.id);

      setForm({
        title: detail.title,
        slug: detail.slug,
        excerpt: detail.excerpt ?? "",
        content: detail.content,
        seo_title: detail.seo_title ?? "",
        seo_description: detail.seo_description ?? "",
        sort_order: String(detail.sort_order ?? 0),
        is_published: detail.is_published,
        show_in_footer: detail.show_in_footer,
      });

      window.setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    } catch (err) {
      setError(getAdminErrorMessage(err));
      setFormOpen(false);
      setEditingId(null);
    } finally {
      setLoadingEditor(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    const payload: PagePayload = {
      title: form.title.trim(),
      slug: form.slug.trim() || undefined,
      excerpt: form.excerpt.trim() || undefined,
      content: form.content,
      is_published: form.is_published,
      show_in_footer: form.show_in_footer,
      sort_order: Number(form.sort_order) || 0,
      seo_title: form.seo_title.trim() || undefined,
      seo_description: form.seo_description.trim() || undefined,
    };

    try {
      if (editingId === null) {
        await createPage(payload);
        setSuccess("صفحه با موفقیت ثبت شد.");
      } else {
        await updatePage(editingId, payload);
        setSuccess("صفحه با موفقیت ویرایش شد.");
      }

      invalidateSitePagesCache();
      setEditingId(null);
      setForm(initialForm);
      setFormOpen(false);
      await loadPages();
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(target: AdminPage) {
    setError("");
    setSuccess("");
    setActionId(target.id);

    try {
      await updatePageStatus(target.id, !target.is_published);
      invalidateSitePagesCache();
      setSuccess(
        target.is_published ? "صفحه از انتشار خارج شد." : "صفحه منتشر شد.",
      );
      await loadPages();
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setActionId(null);
    }
  }

  async function removePage(target: AdminPage) {
    const confirmed = window.confirm(
      `صفحهٔ «${target.title}» حذف شود؟ این کار قابل بازگشت نیست.`,
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setActionId(target.id);

    try {
      await deletePage(target.id);
      invalidateSitePagesCache();
      setSuccess("صفحه حذف شد.");

      if (editingId === target.id) {
        resetForm();
      }

      await loadPages();
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setActionId(null);
    }
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setActiveQuery(searchInput.trim());
  }

  return (
    <div>
      {/* آمار و دکمه‌های اصلی */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#6b7280]">
          <span className="rounded-lg border border-[#e3ebdc] bg-white px-3 py-1.5">
            کل: {formatAdminNumber(stats.total)}
          </span>
          <span className="rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-1.5 text-[#047857]">
            منتشرشده: {formatAdminNumber(stats.published)}
          </span>
          <span className="rounded-lg border border-[#fde68a] bg-[#fffbeb] px-3 py-1.5 text-[#b45309]">
            پیش‌نویس: {formatAdminNumber(stats.draft)}
          </span>
          <span className="rounded-lg border border-[#e3ebdc] bg-white px-3 py-1.5">
            در فوتر: {formatAdminNumber(stats.footer)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={openCreateForm}
          >
            <span className="inline-flex items-center gap-1.5">
              <Plus size={15} aria-hidden="true" />
              افزودن صفحه
            </span>
          </button>

          <button
            type="button"
            className="admin-btn"
            onClick={() => void loadPages()}
            disabled={loading}
          >
            <span className="inline-flex items-center gap-1.5">
              <RefreshCw size={14} aria-hidden="true" />
              {loading ? "در حال دریافت..." : "بارگذاری مجدد"}
            </span>
          </button>
        </div>
      </div>

      {/* فیلتر وضعیت و جست‌وجو */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {statusFilters.map((filter) => {
          const selected = statusFilter === filter.value;

          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => {
                setPage(1);
                setStatusFilter(filter.value);
              }}
              aria-pressed={selected}
              className={`rounded-xl border-2 px-4 py-2 text-sm font-bold transition ${
                selected
                  ? "border-[#648767] bg-[#f4f8ef] text-[#385e3e]"
                  : "border-[#e3ebdc] bg-white text-[#6b7a67] hover:border-[#a8bea1]"
              }`}
            >
              {filter.label}
            </button>
          );
        })}

        <form
          onSubmit={handleSearchSubmit}
          className="mr-auto flex w-full items-center gap-2 sm:w-auto"
        >
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="جست‌وجوی عنوان یا اسلاگ..."
            className="admin-input sm:w-64"
            aria-label="جست‌وجوی صفحات"
          />

          <button type="submit" className="admin-btn shrink-0">
            <Search size={14} aria-hidden="true" />
            جست‌وجو
          </button>
        </form>
      </div>

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

      {/* فرم افزودن/ویرایش صفحه */}
      {formOpen && (
        <div className="admin-card" ref={formRef}>
          <div className="admin-card-head">
            <div>
              <h2 className="admin-card-title">
                {editingId === null ? "افزودن صفحهٔ جدید" : "ویرایش صفحه"}
              </h2>
              <p className="admin-card-desc">
                متن صفحه را با نشانه‌های ساده بنویسید: «## سرتیتر»، «###
                زیرتیتر»، «- لیست»، «&gt; نقل‌قول» و **پررنگ**. اسلاگ خالی
                خودکار از عنوان ساخته می‌شود.
              </p>
            </div>

            <button
              type="button"
              className="admin-btn admin-btn-sm"
              onClick={resetForm}
              disabled={saving}
            >
              بستن
            </button>
          </div>

          {loadingEditor ? (
            <p className="admin-help">
              <Loader2 size={14} className="ml-1 inline animate-spin" />
              در حال دریافت متن صفحه...
            </p>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="admin-form-grid">
                <label className="admin-field">
                  <span className="admin-label">عنوان صفحه *</span>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(event) =>
                      updateField("title", event.target.value)
                    }
                    className="admin-input"
                    required
                    maxLength={255}
                    placeholder="مثلاً درباره ما"
                  />
                </label>

                <label className="admin-field">
                  <span className="admin-label">اسلاگ (آدرس صفحه)</span>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(event) =>
                      updateField("slug", event.target.value)
                    }
                    className="admin-input"
                    maxLength={180}
                    dir="ltr"
                    placeholder="about-us"
                  />
                  <span className="admin-help">
                    آدرس نهایی: /pages/{form.slug || "..."}
                  </span>
                </label>

                <label className="admin-field admin-full">
                  <span className="admin-label">خلاصه (اختیاری)</span>
                  <input
                    type="text"
                    value={form.excerpt}
                    onChange={(event) =>
                      updateField("excerpt", event.target.value)
                    }
                    className="admin-input"
                    maxLength={500}
                    placeholder="یک یا دو خط توضیح کوتاه؛ خالی بماند از متن ساخته می‌شود."
                  />
                </label>

                <label className="admin-field admin-full">
                  <span className="admin-label">متن صفحه *</span>
                  <textarea
                    value={form.content}
                    onChange={(event) =>
                      updateField("content", event.target.value)
                    }
                    className="admin-textarea"
                    style={{ minHeight: 240 }}
                    required
                    placeholder={"## سرتیتر\n\nمتن صفحه...\n\n- مورد اول\n- مورد دوم"}
                  />
                  <span className="admin-help">
                    حداقل ۱۰ نویسه. خط خالی بین پاراگراف‌ها فاصله می‌سازد.
                  </span>
                </label>

                <label className="admin-field">
                  <span className="admin-label">عنوان سئو (اختیاری)</span>
                  <input
                    type="text"
                    value={form.seo_title}
                    onChange={(event) =>
                      updateField("seo_title", event.target.value)
                    }
                    className="admin-input"
                    maxLength={255}
                    placeholder="پیش‌فرض: عنوان صفحه"
                  />
                </label>

                <label className="admin-field">
                  <span className="admin-label">ترتیب نمایش</span>
                  <input
                    type="number"
                    min={0}
                    max={9999}
                    value={form.sort_order}
                    onChange={(event) =>
                      updateField("sort_order", event.target.value)
                    }
                    className="admin-input"
                    dir="ltr"
                  />
                  <span className="admin-help">
                    عدد کوچک‌تر بالاتر نمایش داده می‌شود.
                  </span>
                </label>

                <label className="admin-field admin-full">
                  <span className="admin-label">توضیحات سئو (اختیاری)</span>
                  <textarea
                    value={form.seo_description}
                    onChange={(event) =>
                      updateField("seo_description", event.target.value)
                    }
                    className="admin-textarea"
                    maxLength={500}
                    placeholder="توضیح کوتاه برای نتیجهٔ جست‌وجو؛ خالی بماند از خلاصه استفاده می‌شود."
                  />
                </label>

                <div className="admin-field admin-full">
                  <label className="admin-checkbox">
                    <input
                      type="checkbox"
                      checked={form.is_published}
                      onChange={(event) =>
                        updateField("is_published", event.target.checked)
                      }
                      disabled={saving}
                    />
                    صفحه در سایت منتشر شود
                  </label>

                  <label className="admin-checkbox">
                    <input
                      type="checkbox"
                      checked={form.show_in_footer}
                      onChange={(event) =>
                        updateField("show_in_footer", event.target.checked)
                      }
                      disabled={saving}
                    />
                    لینک این صفحه در فوتر سایت نمایش داده شود
                  </label>
                </div>
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
                      ? "ثبت صفحه"
                      : "ذخیرهٔ تغییرات"}
                </button>

                <button
                  type="button"
                  className="admin-btn"
                  onClick={resetForm}
                  disabled={saving}
                >
                  انصراف
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* فهرست صفحات */}
      <div className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2 className="admin-card-title">فهرست صفحات سایت</h2>
            <p className="admin-card-desc">
              {formatAdminNumber(meta.total)} صفحه ثبت شده است. برای تغییر
              وضعیت انتشار روی برچسب وضعیت بزنید.
            </p>
          </div>
        </div>

        {loading ? (
          <p className="admin-help">
            <Loader2 size={14} className="ml-1 inline animate-spin" />
            در حال دریافت صفحات...
          </p>
        ) : pages.length === 0 ? (
          <p className="admin-empty">
            صفحه‌ای با این فیلترها پیدا نشد. با «افزودن صفحه» اولین صفحه را
            بسازید.
          </p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>عنوان</th>
                  <th>وضعیت</th>
                  <th>فوتر</th>
                  <th>ترتیب</th>
                  <th>آخرین ویرایش</th>
                  <th>عملیات</th>
                </tr>
              </thead>

              <tbody>
                {pages.map((item) => {
                  const busy = actionId === item.id;

                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="font-bold text-ink">{item.title}</div>
                        <div
                          dir="ltr"
                          className="mt-1 text-right text-[11px] text-muted-soft"
                        >
                          /pages/{item.slug}
                        </div>
                      </td>

                      <td>
                        <button
                          type="button"
                          onClick={() => void toggleStatus(item)}
                          disabled={busy}
                          title="تغییر وضعیت انتشار"
                          className={`admin-badge ${
                            item.is_published
                              ? "admin-badge-green"
                              : "admin-badge-red"
                          }`}
                        >
                          {busy
                            ? "..."
                            : item.is_published
                              ? "منتشرشده"
                              : "پیش‌نویس"}
                        </button>
                      </td>

                      <td className="text-xs font-bold text-muted-soft">
                        {item.show_in_footer ? "بله" : "—"}
                      </td>

                      <td className="text-xs font-bold text-muted-soft">
                        {formatAdminNumber(item.sort_order)}
                      </td>

                      <td className="text-xs text-muted-soft">
                        {formatAdminDate(item.updated_at)}
                      </td>

                      <td>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            className="admin-btn admin-btn-sm"
                            onClick={() => void openEditForm(item)}
                            disabled={loadingEditor || busy}
                          >
                            <Pencil size={13} aria-hidden="true" />
                            ویرایش
                          </button>

                          {item.is_published && (
                            <a
                              href={`/pages/${encodeURIComponent(item.slug)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="admin-btn admin-btn-sm"
                            >
                              <FileText size={13} aria-hidden="true" />
                              مشاهده
                            </a>
                          )}

                          <button
                            type="button"
                            className="admin-btn admin-btn-sm admin-btn-danger"
                            onClick={() => void removePage(item)}
                            disabled={busy}
                          >
                            <Trash2 size={13} aria-hidden="true" />
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

        {meta.last_page > 1 && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              className="admin-btn admin-btn-sm"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || loading}
            >
              صفحهٔ قبل
            </button>

            <span className="text-xs font-bold text-[#6b7280]">
              صفحهٔ {formatAdminNumber(meta.current_page)} از{" "}
              {formatAdminNumber(meta.last_page)}
            </span>

            <button
              type="button"
              className="admin-btn admin-btn-sm"
              onClick={() =>
                setPage((current) => Math.min(meta.last_page, current + 1))
              }
              disabled={page >= meta.last_page || loading}
            >
              صفحهٔ بعد
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPagesPanel;
