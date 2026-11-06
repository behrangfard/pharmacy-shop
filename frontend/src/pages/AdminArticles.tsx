import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  BookOpen,
  CheckCircle2,
  FileText,
  ImagePlus,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from "lucide-react";

import {
  createArticle,
  deleteArticle,
  fetchAdminArticle,
  fetchAdminArticles,
  updateArticle,
  updateArticleStatus,
  uploadArticleCover,
  type AdminArticle,
  type AdminArticleStats,
  type PaginationMeta,
  type ArticlePayload,
} from "../services/articles";
import JalaliDatePicker from "../components/JalaliDatePicker";
import {
  formatAdminDate,
  formatAdminNumber,
  getAdminErrorMessage,
  toDateTimeInput,
} from "../utils/adminFormat";
import { getStorageUrl } from "../utils/images";

interface ArticleForm {
  title: string;
  slug: string;
  category: string;
  author_name: string;
  cover_image: string;
  excerpt: string;
  content: string;
  is_published: boolean;
  published_at: string;
}

type StatusFilter = "all" | "published" | "scheduled" | "draft";

const initialForm: ArticleForm = {
  title: "",
  slug: "",
  category: "",
  author_name: "",
  cover_image: "",
  excerpt: "",
  content: "",
  is_published: true,
  published_at: "",
};

const EMPTY_META: PaginationMeta = {
  current_page: 1,
  last_page: 1,
  per_page: 12,
  total: 0,
};

const EMPTY_STATS: AdminArticleStats = {
  total: 0,
  published: 0,
  draft: 0,
  today: 0,
};

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "همه" },
  { value: "published", label: "منتشرشده" },
  { value: "draft", label: "پیش‌نویس" },
  { value: "scheduled", label: "زمان‌بندی‌شده" },
];

/** وضعیت نمایشی هر مقاله برای برچسب جدول. */
function articleStatus(
  article: AdminArticle,
): "published" | "scheduled" | "draft" {
  if (!article.is_published) return "draft";

  if (
    article.published_at &&
    new Date(article.published_at).getTime() > Date.now()
  ) {
    return "scheduled";
  }

  return "published";
}

const statusMeta: Record<
  ReturnType<typeof articleStatus>,
  { label: string; className: string }
> = {
  published: { label: "منتشرشده", className: "admin-badge admin-badge-green" },
  scheduled: { label: "زمان‌بندی", className: "admin-badge admin-badge-amber" },
  draft: { label: "پیش‌نویس", className: "admin-badge admin-badge-red" },
};

/**
 * مدیریت مقالات فروشگاه (وبلاگ) در پنل مدیران.
 *
 * مدیر محتوا می‌تواند هر روز مقالهٔ تازه بنویسد، تصویر کاور بارگذاری کند و
 * آن را منتشر یا برای آینده زمان‌بندی کند.
 */
function AdminArticles() {
  const [articles, setArticles] = useState<AdminArticle[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [stats, setStats] = useState<AdminArticleStats>(EMPTY_STATS);
  const [form, setForm] = useState<ArticleForm>(initialForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingEditor, setLoadingEditor] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLElement>(null);

  const loadArticles = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await fetchAdminArticles({
        page,
        status: statusFilter,
        q: activeQuery || undefined,
      });

      setArticles(result.articles);
      setMeta(result.meta);
      setStats(result.stats);
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, activeQuery]);

  useEffect(() => {
    void loadArticles();
  }, [loadArticles]);

  function updateField<K extends keyof ArticleForm>(
    field: K,
    value: ArticleForm[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setActiveQuery(searchInput.trim());
  }

  function changeStatusFilter(next: StatusFilter) {
    setStatusFilter(next);
    setPage(1);
  }

  const coverPreview = getStorageUrl(form.cover_image);

  async function startEditing(article: AdminArticle) {
    setError("");
    setSuccess("");
    setLoadingEditor(true);
    setActionId(article.id);

    try {
      const full = await fetchAdminArticle(article.id);

      setEditingId(full.id);
      setForm({
        title: full.title,
        slug: full.slug,
        category: full.category ?? "",
        author_name: full.author_name ?? "",
        cover_image: full.cover_image ?? "",
        excerpt: full.excerpt ?? "",
        content: full.content,
        is_published: full.is_published,
        published_at: toDateTimeInput(full.published_at),
      });

      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setLoadingEditor(false);
      setActionId(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving || uploading) return;

    const title = form.title.trim();
    const content = form.content.trim();

    if (!title) {
      setError("عنوان مقاله الزامی است.");
      return;
    }

    if (content.length < 20) {
      setError("متن مقاله باید حداقل ۲۰ کاراکتر باشد.");
      return;
    }

    const payload: ArticlePayload = {
      title,
      slug: form.slug.trim() || undefined,
      category: form.category.trim() || undefined,
      author_name: form.author_name.trim() || undefined,
      cover_image: form.cover_image.trim() || undefined,
      excerpt: form.excerpt.trim() || undefined,
      content,
      is_published: form.is_published,
      published_at: form.published_at
        ? new Date(form.published_at).toISOString()
        : null,
    };

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (editingId === null) {
        const created = await createArticle(payload);

        setSuccess(
          created.is_published
            ? "مقاله ثبت و منتشر شد."
            : "پیش‌نویس مقاله ذخیره شد.",
        );
      } else {
        await updateArticle(editingId, payload);
        setSuccess("تغییرات مقاله ذخیره شد.");
      }

      resetForm();
      await loadArticles();
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleCoverUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const path = await uploadArticleCover(file);

      updateField("cover_image", path);
      setSuccess("تصویر کاور بارگذاری شد.");
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function toggleStatus(article: AdminArticle) {
    setActionId(article.id);
    setError("");
    setSuccess("");

    try {
      await updateArticleStatus(article.id, !article.is_published);

      setSuccess(
        article.is_published
          ? "مقاله از انتشار خارج شد."
          : "مقاله منتشر شد.",
      );

      await loadArticles();
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setActionId(null);
    }
  }

  async function removeArticle(article: AdminArticle) {
    if (!window.confirm(`مقالهٔ «${article.title}» حذف شود؟`)) return;

    setActionId(article.id);
    setError("");
    setSuccess("");

    try {
      await deleteArticle(article.id);

      if (editingId === article.id) {
        resetForm();
      }

      setSuccess("مقاله حذف شد.");
      await loadArticles();
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
          <span className="admin-page-eyebrow">مدیریت محتوا</span>
          <h1 className="admin-page-title">مقالات فروشگاه</h1>
          <p className="admin-page-subtitle">
            هر روز مقالهٔ تازه بنویسید؛ مقاله‌های منتشرشده در صفحهٔ «مقالات»
            فروشگاه نمایش داده می‌شوند. اگر تاریخ انتشار را در آینده ثبت کنید،
            مقاله در همان زمان روی سایت می‌آید.
          </p>
        </div>

        <button
          type="button"
          className="admin-btn"
          onClick={() => void loadArticles()}
          disabled={loading}
        >
          <span className="inline-flex items-center gap-2">
            <RefreshCw size={15} aria-hidden="true" />
            {loading ? "در حال دریافت..." : "بارگذاری مجدد"}
          </span>
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
          <CheckCircle2 size={16} aria-hidden="true" />
          <span>{success}</span>
        </div>
      )}

      <div className="admin-stats">
        <div className="admin-stat">
          <span className="admin-stat-label">کل مقاله‌ها</span>
          <strong className="admin-stat-value">
            {formatAdminNumber(stats.total)}
          </strong>
          <span className="admin-stat-hint">مقاله‌ها و پیش‌نویس‌ها</span>
        </div>

        <div className="admin-stat">
          <span className="admin-stat-label">منتشرشده</span>
          <strong className="admin-stat-value">
            {formatAdminNumber(stats.published)}
          </strong>
          <span className="admin-stat-hint">قابل مشاهده در فروشگاه</span>
        </div>

        <div className="admin-stat">
          <span className="admin-stat-label">پیش‌نویس</span>
          <strong className="admin-stat-value">
            {formatAdminNumber(stats.draft)}
          </strong>
          <span className="admin-stat-hint">در انتظار انتشار</span>
        </div>

        <div className="admin-stat">
          <span className="admin-stat-label">ثبت‌شده امروز</span>
          <strong className="admin-stat-value">
            {formatAdminNumber(stats.today)}
          </strong>
          <span className="admin-stat-hint">مقاله‌های امروز</span>
        </div>
      </div>

      <section className="admin-card" ref={formRef}>
        <div className="admin-card-head">
          <div>
            <h2 className="admin-card-title">
              {editingId === null ? "نوشتن مقالهٔ تازه" : "ویرایش مقاله"}
            </h2>
            <p className="admin-card-desc">
              نشانه‌گذاری سبک پشتیبانی می‌شود: «## سرتیتر»، «- لیست» و «**متن
              پررنگ**». خط خالی یعنی پاراگراف تازه.
            </p>
          </div>

          {loadingEditor && (
            <span className="inline-flex items-center gap-1.5 text-xs text-[#7b8a77]">
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              در حال بارگذاری متن...
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="admin-form-grid">
            <div className="admin-field admin-full">
              <label className="admin-label" htmlFor="article-title">
                عنوان مقاله *
              </label>
              <input
                id="article-title"
                className="admin-input"
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                maxLength={255}
                placeholder="مثلاً: چطور سایز مناسب را انتخاب کنیم؟"
              />
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="article-category">
                دسته‌بندی
              </label>
              <input
                id="article-category"
                className="admin-input"
                value={form.category}
                onChange={(event) => updateField("category", event.target.value)}
                maxLength={60}
                placeholder="راهنمای خرید"
                list="article-category-options"
              />
              <datalist id="article-category-options">
                <option value="راهنمای خرید" />
                <option value="راهنمای سایز" />
                <option value="نگهداری و شست‌وشو" />
                <option value="سلامت" />
                <option value="اخبار فروشگاه" />
              </datalist>
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="article-author">
                نام نویسنده
              </label>
              <input
                id="article-author"
                className="admin-input"
                value={form.author_name}
                onChange={(event) =>
                  updateField("author_name", event.target.value)
                }
                maxLength={120}
                placeholder="خالی بماند، نام شما ثبت می‌شود"
              />
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="article-slug">
                نشانی مقاله (اسلاگ)
              </label>
              <input
                id="article-slug"
                className="admin-input"
                value={form.slug}
                onChange={(event) => updateField("slug", event.target.value)}
                maxLength={180}
                dir="ltr"
                placeholder="خالی بماند، خودکار ساخته می‌شود"
              />
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="article-publish-at">
                تاریخ انتشار (شمسی)
              </label>
              <JalaliDatePicker
                id="article-publish-at"
                value={form.published_at}
                onChange={(value) => updateField("published_at", value)}
              />
              <span className="admin-help">
                خالی بماند، زمان ذخیره ثبت می‌شود.
              </span>
            </div>

            <div className="admin-field admin-full">
              <label className="admin-label" htmlFor="article-cover-path">
                تصویر کاور
              </label>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="flex h-24 w-40 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#dfe7d8] bg-[#f8faf5]">
                  {coverPreview ? (
                    <img
                      src={coverPreview}
                      alt="پیش‌نمایش کاور مقاله"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="inline-flex flex-col items-center gap-1 text-[11px] text-[#9aa894]">
                      <ImagePlus size={20} aria-hidden="true" />
                      بدون تصویر
                    </span>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={fileInputRef}
                      id="article-cover-file"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(event) => void handleCoverUpload(event)}
                      className="hidden"
                    />

                    <button
                      type="button"
                      className="admin-btn admin-btn-sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || saving}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {uploading ? (
                          <Loader2
                            size={14}
                            className="animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <Upload size={14} aria-hidden="true" />
                        )}
                        {uploading ? "در حال بارگذاری..." : "بارگذاری تصویر"}
                      </span>
                    </button>

                    {form.cover_image && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-sm admin-btn-danger"
                        onClick={() => updateField("cover_image", "")}
                        disabled={uploading || saving}
                      >
                        حذف تصویر
                      </button>
                    )}
                  </div>

                  <input
                    id="article-cover-path"
                    className="admin-input"
                    value={form.cover_image}
                    onChange={(event) =>
                      updateField("cover_image", event.target.value)
                    }
                    dir="ltr"
                    placeholder="article-covers/example.jpg"
                  />

                  <p className="text-[11px] leading-6 text-[#9aa894]">
                    حداکثر ۵ مگابایت با فرمت JPG، PNG یا WebP؛ نسبت پیشنهادی
                    ۱۶:۱۰.
                  </p>
                </div>
              </div>
            </div>

            <div className="admin-field admin-full">
              <label className="admin-label" htmlFor="article-excerpt">
                خلاصه (اختیاری)
              </label>
              <textarea
                id="article-excerpt"
                className="admin-textarea"
                rows={2}
                maxLength={500}
                value={form.excerpt}
                onChange={(event) => updateField("excerpt", event.target.value)}
                placeholder="خالی بماند، از ابتدای متن ساخته می‌شود"
              />
            </div>

            <div className="admin-field admin-full">
              <label className="admin-label" htmlFor="article-content">
                <span className="inline-flex items-center gap-1.5">
                  <FileText size={14} aria-hidden="true" />
                  متن مقاله *
                </span>
              </label>
              <textarea
                id="article-content"
                className="admin-textarea"
                rows={14}
                value={form.content}
                onChange={(event) => updateField("content", event.target.value)}
                placeholder={
                  "مقدمهٔ کوتاه مقاله...\n\n## سرتیتر بخش اول\n- نکتهٔ اول\n- نکتهٔ دوم\n\n> جملهٔ تأکیدی"
                }
              />
              <p className="text-[11px] leading-6 text-[#9aa894]">
                «## » سرتیتر، «### » زیرتیتر، «- » لیست و «&gt; » نقل‌قول می‌سازد.
              </p>
            </div>

            <label
              className="admin-checkbox admin-full"
              htmlFor="article-published"
            >
              <input
                id="article-published"
                type="checkbox"
                checked={form.is_published}
                onChange={(event) =>
                  updateField("is_published", event.target.checked)
                }
              />
              همین حالا منتشر شود (اگر تاریخ انتشار خالی باشد، زمان فعلی ثبت
              می‌شود)
            </label>

          </div>

          <div className="admin-actions">
            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              disabled={saving || uploading}
            >
              {saving
                ? "در حال ذخیره..."
                : editingId === null
                  ? "ثبت مقاله"
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
            <h2 className="admin-card-title">فهرست مقاله‌ها</h2>
            <p className="admin-card-desc">
              {formatAdminNumber(meta.total)} مقاله ثبت شده است؛ برای پیدا کردن
              سریع‌تر از فیلتر وضعیت و جست‌وجو استفاده کنید.
            </p>
          </div>

          <form
            onSubmit={handleSearchSubmit}
            className="flex flex-wrap items-center gap-2"
          >
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className="admin-input"
              placeholder="جست‌وجو در عنوان یا اسلاگ"
              aria-label="جست‌وجو در مقاله‌ها"
              style={{ maxWidth: 230 }}
            />

            <button type="submit" className="admin-btn admin-btn-sm">
              <span className="inline-flex items-center gap-1.5">
                <Search size={14} aria-hidden="true" />
                جست‌وجو
              </span>
            </button>
          </form>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {statusFilters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => changeStatusFilter(item.value)}
              className={
                statusFilter === item.value
                  ? "admin-btn admin-btn-sm admin-btn-primary"
                  : "admin-btn admin-btn-sm"
              }
            >
              {item.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="admin-empty">در حال دریافت مقاله‌ها...</p>
        ) : articles.length === 0 ? (
          <p className="admin-empty">
            <span className="inline-flex items-center gap-2">
              <BookOpen size={16} aria-hidden="true" />
              مقاله‌ای با این شرایط پیدا نشد.
            </span>
          </p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>کاور</th>
                  <th>عنوان</th>
                  <th>دسته</th>
                  <th>وضعیت</th>
                  <th>تاریخ انتشار</th>
                  <th>مطالعه</th>
                  <th>عملیات</th>
                </tr>
              </thead>

              <tbody>
                {articles.map((article) => {
                  const badge = statusMeta[articleStatus(article)];
                  const busy = actionId === article.id;
                  const rowCover = getStorageUrl(article.cover_image);

                  return (
                    <tr key={article.id}>
                      <td>
                        {rowCover ? (
                          <img
                            src={rowCover}
                            alt={article.title}
                            style={{
                              width: 84,
                              height: 52,
                              objectFit: "cover",
                              borderRadius: 8,
                              border: "1px solid #e5e7eb",
                            }}
                          />
                        ) : (
                          <span
                            className="inline-flex h-[52px] w-[84px] items-center justify-center rounded-lg border border-dashed border-[#dfe7d8] text-[10px] text-[#9aa894]"
                          >
                            بدون تصویر
                          </span>
                        )}
                      </td>

                      <td>
                        <div className="font-bold">{article.title}</div>
                        <div
                          style={{ fontSize: 11, color: "#9ca3af" }}
                          dir="ltr"
                        >
                          {article.slug}
                        </div>
                      </td>

                      <td>{article.category || "—"}</td>

                      <td>
                        <span className={badge.className}>{badge.label}</span>
                      </td>

                      <td style={{ fontSize: 12 }}>
                        {article.published_at
                          ? formatAdminDate(article.published_at, true)
                          : "—"}
                      </td>

                      <td style={{ fontSize: 12 }}>
                        {article.reading_minutes} دقیقه
                      </td>

                      <td>
                        <div className="admin-row-actions">
                          <button
                            type="button"
                            className="admin-btn admin-btn-sm"
                            onClick={() => void startEditing(article)}
                            disabled={busy || saving}
                          >
                            ویرایش
                          </button>

                          <button
                            type="button"
                            className="admin-btn admin-btn-sm"
                            onClick={() => void toggleStatus(article)}
                            disabled={busy || saving}
                          >
                            {busy
                              ? "..."
                              : article.is_published
                                ? "لغو انتشار"
                                : "انتشار"}
                          </button>

                          <button
                            type="button"
                            className="admin-btn admin-btn-sm admin-btn-danger"
                            onClick={() => void removeArticle(article)}
                            disabled={busy || saving}
                          >
                            <span className="inline-flex items-center gap-1">
                              <Trash2 size={13} aria-hidden="true" />
                              حذف
                            </span>
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
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              className="admin-btn admin-btn-sm"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={meta.current_page <= 1 || loading}
            >
              صفحهٔ قبل
            </button>

            <span className="text-xs font-bold text-[#7b8a77]">
              صفحهٔ {formatAdminNumber(meta.current_page)} از{" "}
              {formatAdminNumber(meta.last_page)}
            </span>

            <button
              type="button"
              className="admin-btn admin-btn-sm"
              onClick={() =>
                setPage((current) => Math.min(meta.last_page, current + 1))
              }
              disabled={meta.current_page >= meta.last_page || loading}
            >
              صفحهٔ بعد
            </button>
          </div>
        )}

      </section>
    </div>
  );
}

export default AdminArticles;


