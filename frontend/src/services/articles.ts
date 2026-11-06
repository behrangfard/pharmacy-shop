import api, { adminApi } from "./api";

/**
 * بخش «مقالات» فروشگاه.
 *
 * مقاله‌ها از پنل مدیران به‌صورت روزانه منتشر می‌شوند؛ سمت فروشگاه فقط
 * مقاله‌های منتشرشده دیده می‌شوند (کنترل نهایی در سرور انجام می‌شود).
 */
export interface ArticleSummary {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image: string | null;
  category: string | null;
  author_name: string | null;
  published_at: string | null;
  reading_minutes: number;
}

export interface ArticleDetail extends ArticleSummary {
  content: string;
}

export interface AdminArticle extends ArticleSummary {
  is_published: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminArticleDetail extends AdminArticle {
  content: string;
}

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface ArticleListResult {
  articles: ArticleSummary[];
  meta: PaginationMeta;
  categories: string[];
}

export interface ArticleListParams {
  page?: number;
  perPage?: number;
  q?: string;
  category?: string;
}

export interface AdminArticleListParams {
  page?: number;
  perPage?: number;
  status?: "all" | "published" | "scheduled" | "draft";
  q?: string;
}

export interface AdminArticleStats {
  total: number;
  published: number;
  draft: number;
  today: number;
}

export interface AdminArticleListResult {
  articles: AdminArticle[];
  meta: PaginationMeta;
  stats: AdminArticleStats;
}

export interface ArticlePayload {
  title: string;
  slug?: string;
  excerpt?: string;
  content: string;
  cover_image?: string;
  category?: string;
  author_name?: string;
  is_published: boolean;
  published_at?: string | null;
}

function normalizeMeta(raw: unknown, fallbackPerPage: number): PaginationMeta {
  const source = (raw ?? {}) as Partial<Record<keyof PaginationMeta, unknown>>;

  const number = (value: unknown, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };

  return {
    current_page: number(source.current_page, 1),
    last_page: number(source.last_page, 1),
    per_page: number(source.per_page, fallbackPerPage),
    total: Number.isFinite(Number(source.total)) ? Number(source.total) : 0,
  };
}

function normalizeSummary(raw: unknown): ArticleSummary {
  const source = (raw ?? {}) as Partial<Record<keyof ArticleSummary, unknown>>;

  return {
    id: Number(source.id) || 0,
    title: typeof source.title === "string" ? source.title : "",
    slug: typeof source.slug === "string" ? source.slug : "",
    excerpt: typeof source.excerpt === "string" ? source.excerpt : null,
    cover_image:
      typeof source.cover_image === "string" ? source.cover_image : null,
    category: typeof source.category === "string" ? source.category : null,
    author_name:
      typeof source.author_name === "string" ? source.author_name : null,
    published_at:
      typeof source.published_at === "string" ? source.published_at : null,
    reading_minutes: Number(source.reading_minutes) || 1,
  };
}

function buildListParams(params: ArticleListParams): Record<string, string> {
  const query: Record<string, string> = {};

  if (params.page && params.page > 1) query.page = String(params.page);
  if (params.perPage) query.per_page = String(params.perPage);
  if (params.q?.trim()) query.q = params.q.trim();
  if (params.category?.trim()) query.category = params.category.trim();

  return query;
}

/** فهرست مقاله‌های منتشرشده برای صفحهٔ مقالات و بخش صفحهٔ اول. */
export async function fetchArticles(
  params: ArticleListParams = {},
): Promise<ArticleListResult> {
  const perPage = params.perPage ?? 9;

  const response = await api.get("/articles", {
    params: buildListParams({ ...params, perPage }),
  });

  const data = response.data?.data;

  if (!Array.isArray(data)) {
    throw new Error("ساختار پاسخ مقاله‌ها معتبر نیست.");
  }

  return {
    articles: data.map(normalizeSummary),
    meta: normalizeMeta(response.data?.meta, perPage),
    categories: Array.isArray(response.data?.categories)
      ? (response.data.categories as unknown[]).filter(
          (item): item is string => typeof item === "string",
        )
      : [],
  };
}

/** تازه‌ترین مقاله‌ها برای نمایش در صفحهٔ اول فروشگاه. */
export async function fetchLatestArticles(
  limit = 3,
): Promise<ArticleSummary[]> {
  const result = await fetchArticles({ perPage: limit });

  return result.articles.slice(0, limit);
}

/** یک مقالهٔ منتشرشده بر اساس اسلاگ، همراه با مقاله‌های مرتبط. */
export async function fetchArticleBySlug(
  slug: string,
): Promise<{ article: ArticleDetail; related: ArticleSummary[] }> {
  const response = await api.get(`/articles/${encodeURIComponent(slug)}`);
  const raw = response.data?.data;

  if (!raw || typeof raw !== "object") {
    throw new Error("مقالهٔ موردنظر پیدا نشد.");
  }

  return {
    article: {
      ...normalizeSummary(raw),
      content:
        typeof (raw as { content?: unknown }).content === "string"
          ? (raw as { content: string }).content
          : "",
    },
    related: Array.isArray(response.data?.related)
      ? (response.data.related as unknown[]).map(normalizeSummary)
      : [],
  };
}

/* ---------------------------------- پنل ---------------------------------- */

function buildAdminListParams(
  params: AdminArticleListParams,
): Record<string, string> {
  const query: Record<string, string> = {};

  if (params.page && params.page > 1) query.page = String(params.page);
  if (params.perPage) query.per_page = String(params.perPage);
  if (params.status && params.status !== "all") query.status = params.status;
  if (params.q?.trim()) query.q = params.q.trim();

  return query;
}

function normalizeAdminArticle(raw: unknown): AdminArticle {
  const source = (raw ?? {}) as Partial<Record<keyof AdminArticle, unknown>>;

  return {
    ...normalizeSummary(raw),
    is_published: source.is_published === true,
    created_at:
      typeof source.created_at === "string" ? source.created_at : null,
    updated_at:
      typeof source.updated_at === "string" ? source.updated_at : null,
  };
}

function normalizeAdminDetail(raw: unknown): AdminArticleDetail {
  return {
    ...normalizeAdminArticle(raw),
    content:
      typeof (raw as { content?: unknown })?.content === "string"
        ? (raw as { content: string }).content
        : "",
  };
}

/** فهرست مقاله‌ها در پنل (همراه با آمار و فیلتر وضعیت). */
export async function fetchAdminArticles(
  params: AdminArticleListParams = {},
): Promise<AdminArticleListResult> {
  const perPage = params.perPage ?? 12;

  const response = await adminApi.get("/admin/articles", {
    params: buildAdminListParams({ ...params, perPage }),
  });

  const data = response.data?.data;
  const stats = (response.data?.stats ?? {}) as Partial<
    Record<keyof AdminArticleStats, unknown>
  >;

  if (!Array.isArray(data)) {
    throw new Error("ساختار پاسخ مقاله‌ها معتبر نیست.");
  }

  return {
    articles: data.map(normalizeAdminArticle),
    meta: normalizeMeta(response.data?.meta, perPage),
    stats: {
      total: Number(stats.total) || 0,
      published: Number(stats.published) || 0,
      draft: Number(stats.draft) || 0,
      today: Number(stats.today) || 0,
    },
  };
}

/** یک مقالهٔ کامل (با متن) برای ویرایش در پنل. */
export async function fetchAdminArticle(
  id: number,
): Promise<AdminArticleDetail> {
  const response = await adminApi.get(`/admin/articles/${id}`);

  return normalizeAdminDetail(response.data?.data);
}

export async function createArticle(
  payload: ArticlePayload,
): Promise<AdminArticleDetail> {
  const response = await adminApi.post("/admin/articles", payload);

  return normalizeAdminDetail(response.data?.data);
}

export async function updateArticle(
  id: number,
  payload: ArticlePayload,
): Promise<AdminArticleDetail> {
  const response = await adminApi.put(`/admin/articles/${id}`, payload);

  return normalizeAdminDetail(response.data?.data);
}

export async function updateArticleStatus(
  id: number,
  isPublished: boolean,
): Promise<AdminArticle> {
  const response = await adminApi.patch(`/admin/articles/${id}/status`, {
    is_published: isPublished,
  });

  return normalizeAdminArticle(response.data?.data);
}

export async function deleteArticle(id: number): Promise<void> {
  await adminApi.delete(`/admin/articles/${id}`);
}

/** بارگذاری تصویر کاور مقاله و برگرداندن مسیر ذخیره‌شده در سرور. */
export async function uploadArticleCover(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);

  const response = await adminApi.post("/admin/articles/cover", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  const path = response.data?.data?.path;

  if (typeof path !== "string" || path === "") {
    throw new Error("بارگذاری تصویر کاور انجام نشد.");
  }

  return path;
}

/** تاریخ خوانای فارسی برای کارت و صفحهٔ مقاله. */
export function formatArticleDate(value: string | null | undefined): string {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}


