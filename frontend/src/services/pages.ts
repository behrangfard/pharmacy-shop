import api, { adminApi } from "./api";
import { STORAGE_KEYS } from "../utils/storageKeys";

/**
 * صفحات ثابت سایت (درباره ما، تماس با ما، قوانین، سؤالات متداول و ...).
 *
 * مدیر محتوا این صفحات را در بخش «مدیریت محتوا»ی پنل می‌نویسد و در مسیر
 * /pages/{slug} فروشگاه نمایش داده می‌شوند. فهرست صفحات منتشرشده برای
 * لینک‌های فوتر کش می‌شود تا از اولین رندر بدون پرش چیدمان بیاید.
 */
export interface SitePageSummary {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  show_in_footer: boolean;
  sort_order: number;
  updated_at: string | null;
}

export interface SitePage {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  updated_at: string | null;
}

export interface AdminPage extends SitePageSummary {
  is_published: boolean;
  published_at: string | null;
}

export interface AdminPageDetail extends AdminPage {
  content: string;
  seo_title: string | null;
  seo_description: string | null;
}

export interface PagePayload {
  title: string;
  slug?: string;
  excerpt?: string;
  content: string;
  is_published: boolean;
  show_in_footer: boolean;
  sort_order?: number;
  seo_title?: string;
  seo_description?: string;
}

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface AdminPageStats {
  total: number;
  published: number;
  draft: number;
  footer: number;
}

export interface AdminPageListParams {
  page?: number;
  perPage?: number;
  status?: "all" | "published" | "draft";
  q?: string;
}

export interface AdminPageListResult {
  pages: AdminPage[];
  meta: PaginationMeta;
  stats: AdminPageStats;
}

const CACHE_TTL = 6 * 60 * 60 * 1000;
const REVALIDATE_AFTER = 5 * 60 * 1000;

interface SitePageCache {
  data: SitePageSummary[];
  savedAt: number;
}

let memoryCache: SitePageCache | null = null;
let inFlightRequest: Promise<SitePageSummary[]> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function nullableText(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

function normalizeSummary(raw: unknown): SitePageSummary | null {
  if (!isRecord(raw)) {
    return null;
  }

  const id = Number(raw.id);
  const title = text(raw.title).trim();
  const slug = text(raw.slug).trim();

  if (!Number.isFinite(id) || id <= 0 || title === "" || slug === "") {
    return null;
  }

  return {
    id,
    title,
    slug,
    excerpt: nullableText(raw.excerpt),
    show_in_footer: raw.show_in_footer === true,
    sort_order: Number(raw.sort_order) || 0,
    updated_at: nullableText(raw.updated_at),
  };
}

function normalizeSummaries(raw: unknown): SitePageSummary[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map(normalizeSummary)
    .filter((page): page is SitePageSummary => page !== null);
}

function normalizeAdminPage(raw: unknown): AdminPage {
  const source = isRecord(raw) ? raw : {};

  return {
    id: Number(source.id) || 0,
    title: text(source.title),
    slug: text(source.slug),
    excerpt: nullableText(source.excerpt),
    show_in_footer: source.show_in_footer === true,
    sort_order: Number(source.sort_order) || 0,
    updated_at: nullableText(source.updated_at),
    is_published: source.is_published === true,
    published_at: nullableText(source.published_at),
  };
}

function normalizeAdminDetail(raw: unknown): AdminPageDetail {
  const source = isRecord(raw) ? raw : {};

  return {
    ...normalizeAdminPage(source),
    content: text(source.content),
    seo_title: nullableText(source.seo_title),
    seo_description: nullableText(source.seo_description),
  };
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

function readStoredCache(): SitePageCache | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.storefrontPages);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as SitePageCache;

    if (!isRecord(parsed) || typeof parsed.savedAt !== "number") {
      return null;
    }

    if (Date.now() - parsed.savedAt >= CACHE_TTL) {
      window.localStorage.removeItem(STORAGE_KEYS.storefrontPages);
      return null;
    }

    return { data: normalizeSummaries(parsed.data), savedAt: parsed.savedAt };
  } catch {
    return null;
  }
}

function writeStoredCache(cache: SitePageCache): void {
  try {
    window.localStorage.setItem(
      STORAGE_KEYS.storefrontPages,
      JSON.stringify(cache),
    );
  } catch {
    // در دسترس نبودن Storage مانع نمایش صفحات نمی‌شود.
  }
}

/** آخرین فهرست کش‌شدهٔ صفحات (بدون درخواست شبکه). */
export function getCachedSitePages(): SitePageSummary[] {
  if (memoryCache === null) {
    memoryCache = readStoredCache();
  }

  return memoryCache?.data ?? [];
}

/** فهرست صفحات منتشرشدهٔ سایت (با کش و ادغام درخواست‌های هم‌زمان). */
export function fetchSitePages(
  options: { force?: boolean } = {},
): Promise<SitePageSummary[]> {
  const cached = getCachedSitePages();
  const isFresh =
    memoryCache !== null && Date.now() - memoryCache.savedAt < REVALIDATE_AFTER;

  if (!options.force && memoryCache !== null && isFresh) {
    return Promise.resolve(cached);
  }

  if (inFlightRequest !== null) {
    return inFlightRequest;
  }

  inFlightRequest = api
    .get("/pages")
    .then((response) => {
      const pages = normalizeSummaries(response.data?.data);

      memoryCache = { data: pages, savedAt: Date.now() };
      writeStoredCache(memoryCache);

      return pages;
    })
    .catch((error) => {
      console.error("دریافت صفحات سایت ناموفق بود:", error);

      return memoryCache?.data ?? [];
    })
    .finally(() => {
      inFlightRequest = null;
    });

  return inFlightRequest;
}

/** یک صفحهٔ کامل برای نمایش در فروشگاه. */
export async function fetchSitePage(slug: string): Promise<SitePage> {
  const response = await api.get(`/pages/${encodeURIComponent(slug)}`);
  const raw = response.data?.data;
  const source = isRecord(raw) ? raw : {};

  return {
    id: Number(source.id) || 0,
    title: text(source.title),
    slug: text(source.slug),
    excerpt: nullableText(source.excerpt),
    content: text(source.content),
    seo_title: nullableText(source.seo_title),
    seo_description: nullableText(source.seo_description),
    published_at: nullableText(source.published_at),
    updated_at: nullableText(source.updated_at),
  };
}

function buildAdminListParams(
  params: AdminPageListParams,
): Record<string, string> {
  const query: Record<string, string> = {};
  const perPage = params.perPage ?? 20;

  query.per_page = String(perPage);

  if (params.page && params.page > 1) query.page = String(params.page);
  if (params.status && params.status !== "all") query.status = params.status;
  if (params.q && params.q.trim() !== "") query.q = params.q.trim();

  return query;
}

/** فهرست صفحات در پنل (همراه با آمار و فیلتر وضعیت). */
export async function fetchAdminPages(
  params: AdminPageListParams = {},
): Promise<AdminPageListResult> {
  const perPage = params.perPage ?? 20;

  const response = await adminApi.get("/admin/pages", {
    params: buildAdminListParams({ ...params, perPage }),
  });

  const data = response.data?.data;
  const stats = (response.data?.stats ?? {}) as Partial<
    Record<keyof AdminPageStats, unknown>
  >;

  if (!Array.isArray(data)) {
    throw new Error("ساختار پاسخ صفحات معتبر نیست.");
  }

  return {
    pages: data.map(normalizeAdminPage),
    meta: normalizeMeta(response.data?.meta, perPage),
    stats: {
      total: Number(stats.total) || 0,
      published: Number(stats.published) || 0,
      draft: Number(stats.draft) || 0,
      footer: Number(stats.footer) || 0,
    },
  };
}

/** یک صفحهٔ کامل (با متن) برای ویرایش در پنل. */
export async function fetchAdminPage(id: number): Promise<AdminPageDetail> {
  const response = await adminApi.get(`/admin/pages/${id}`);

  return normalizeAdminDetail(response.data?.data);
}

export async function createPage(
  payload: PagePayload,
): Promise<AdminPageDetail> {
  const response = await adminApi.post("/admin/pages", payload);

  return normalizeAdminDetail(response.data?.data);
}

export async function updatePage(
  id: number,
  payload: PagePayload,
): Promise<AdminPageDetail> {
  const response = await adminApi.put(`/admin/pages/${id}`, payload);

  return normalizeAdminDetail(response.data?.data);
}

export async function updatePageStatus(
  id: number,
  isPublished: boolean,
): Promise<AdminPage> {
  const response = await adminApi.patch(`/admin/pages/${id}/status`, {
    is_published: isPublished,
  });

  return normalizeAdminPage(response.data?.data);
}

export async function deletePage(id: number): Promise<void> {
  await adminApi.delete(`/admin/pages/${id}`);
}

/** پاک‌کردن کش صفحات (بعد از تغییر در پنل مدیران). */
export function invalidateSitePagesCache(): void {
  memoryCache = null;

  try {
    window.localStorage.removeItem(STORAGE_KEYS.storefrontPages);
  } catch {
    // نادیده گرفتن خطای Storage
  }
}
