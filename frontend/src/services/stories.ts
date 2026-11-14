import api from "./api";
import { STORAGE_KEYS } from "../utils/storageKeys";

/**
 * استوری‌های صفحهٔ اول فروشگاه (دایره‌های بالای بخش دسته‌بندی‌ها).
 *
 * هر استوری مجموعه‌ای از اسلایدهای تصویری است که با کلیک روی دایره، در
 * نمایشگر تمام‌صفحه مرور می‌شود. همهٔ محتوا از پنل مدیران
 * (/admin/stories) می‌آید؛ اگر مدیر هیچ استوری فعالی ثبت نکرده باشد، آرایه
 * خالی برمی‌گردد و صفحهٔ اول آن نوار را رندر نمی‌کند.
 *
 * کش مثل نشان‌های اعتماد است: حافظه → localStorage → شبکه
 * (stale-while-revalidate) تا دایره‌ها از اولین رندر بدون پرش چیدمان بیایند.
 */
export interface StorySlide {
  /** مسیر تصویر اسلاید (storage یا /images/...) */
  image: string;
  caption: string | null;
  /** لینک مقصد اسلاید؛ خالی یعنی اسلاید فقط تصویری است. */
  link: string | null;
}

export interface Story {
  id: number;
  /** برچسب کوتاه زیر دایره. */
  title: string;
  /** تصویر دایره (اگر مدیر کاور نداده باشد، اولین اسلاید). */
  cover_image: string;
  slides: StorySlide[];
}

interface StoryCache {
  data: Story[];
  savedAt: number;
}

/** مدتی که دادهٔ کش‌شده بدون هیچ درخواستی نمایش داده می‌شود. */
const CACHE_TTL = 6 * 60 * 60 * 1000;

/** بعد از این مدت داده فوراً نمایش داده می‌شود و در پس‌زمینه تازه می‌شود. */
const REVALIDATE_AFTER = 5 * 60 * 1000;

/** مدت باقی ماندن حلقهٔ «دیده‌شده» روی دایره‌ها. */
const SEEN_TTL = 24 * 60 * 60 * 1000;

let memoryCache: StoryCache | null = null;
let inFlightRequest: Promise<Story[]> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeText(value: unknown): string | null {
  const text = typeof value === "string" ? value.trim() : "";

  return text === "" ? null : text;
}

function normalizeSlide(raw: unknown): StorySlide | null {
  if (!isRecord(raw)) {
    return null;
  }

  const image = typeof raw.image === "string" ? raw.image.trim() : "";

  // اسلاید بدون تصویر نمایش داده نمی‌شود.
  if (image === "") {
    return null;
  }

  return {
    image,
    caption: normalizeText(raw.caption),
    link: normalizeText(raw.link),
  };
}

function normalizeStory(raw: unknown): Story | null {
  if (!isRecord(raw)) {
    return null;
  }

  const id = Number(raw.id);
  const slides = Array.isArray(raw.slides)
    ? raw.slides
        .map(normalizeSlide)
        .filter((slide): slide is StorySlide => slide !== null)
    : [];

  if (!Number.isFinite(id) || slides.length === 0) {
    return null;
  }

  const cover = typeof raw.cover_image === "string" ? raw.cover_image.trim() : "";

  return {
    id,
    title: typeof raw.title === "string" ? raw.title.trim() : "",
    cover_image: cover === "" ? slides[0].image : cover,
    slides,
  };
}

function normalize(raw: unknown): Story[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.map(normalizeStory).filter((story): story is Story => story !== null);
}

function readStoredCache(): StoryCache | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.storefrontStories);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as StoryCache;

    if (!isRecord(parsed) || typeof parsed.savedAt !== "number") {
      return null;
    }

    if (Date.now() - parsed.savedAt >= CACHE_TTL) {
      window.localStorage.removeItem(STORAGE_KEYS.storefrontStories);
      return null;
    }

    return { data: normalize(parsed.data), savedAt: parsed.savedAt };
  } catch {
    return null;
  }
}

function writeStoredCache(cache: StoryCache): void {
  try {
    window.localStorage.setItem(
      STORAGE_KEYS.storefrontStories,
      JSON.stringify(cache),
    );
  } catch {
    // در دسترس نبودن Storage مانع نمایش استوری‌ها نمی‌شود.
  }
}

/** آخرین فهرست کش‌شده (بدون درخواست شبکه)؛ برای مقدار اولیهٔ رندر. */
export function getCachedStories(): Story[] {
  if (memoryCache === null) {
    memoryCache = readStoredCache();
  }

  return memoryCache?.data ?? [];
}

/**
 * فهرست استوری‌ها را از سرور می‌خواند (با کش و ادغام درخواست‌های هم‌زمان).
 */
export function fetchStories(options: { force?: boolean } = {}): Promise<Story[]> {
  const cached = getCachedStories();
  const isFresh =
    memoryCache !== null && Date.now() - memoryCache.savedAt < REVALIDATE_AFTER;

  if (!options.force && memoryCache !== null && isFresh) {
    return Promise.resolve(cached);
  }

  if (inFlightRequest !== null) {
    return inFlightRequest;
  }

  inFlightRequest = api
    .get("/stories")
    .then((response) => {
      const stories = normalize(response.data?.data);

      memoryCache = { data: stories, savedAt: Date.now() };
      writeStoredCache(memoryCache);

      return stories;
    })
    .catch((error) => {
      console.error("دریافت استوری‌ها ناموفق بود:", error);

      if (memoryCache !== null) {
        return memoryCache.data;
      }

      memoryCache = { data: [], savedAt: Date.now() };

      return [];
    })
    .finally(() => {
      inFlightRequest = null;
    });

  return inFlightRequest;
}

/** پاک‌کردن کش استوری‌ها (مثلاً بعد از تغییر در پنل مدیران). */
export function invalidateStoriesCache(): void {
  memoryCache = null;

  try {
    window.localStorage.removeItem(STORAGE_KEYS.storefrontStories);
  } catch {
    // نادیده گرفتن خطای Storage
  }
}

/**
 * شناسهٔ استوری‌هایی که کاربر در ۲۴ ساعت گذشته دیده است.
 *
 * حلقهٔ دایرهٔ این استوری‌ها خاکستری می‌شود (مثل استوری اینستاگرام) تا کاربر
 * بداند چه چیزی را باز کرده است.
 */
export function readSeenStoryIds(): number[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.storiesSeen);

    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);

    if (!isRecord(parsed)) {
      return [];
    }

    const now = Date.now();
    const seen: Record<string, number> = {};
    const ids: number[] = [];

    Object.entries(parsed).forEach(([key, value]) => {
      const id = Number(key);
      const seenAt = typeof value === "number" ? value : 0;

      if (!Number.isFinite(id) || now - seenAt >= SEEN_TTL) {
        return;
      }

      seen[key] = seenAt;
      ids.push(id);
    });

    // پاک‌سازی خودکار رکوردهای منقضی تا کلید ذخیره‌سازی بزرگ نشود.
    window.localStorage.setItem(
      STORAGE_KEYS.storiesSeen,
      JSON.stringify(seen),
    );

    return ids;
  } catch {
    return [];
  }
}

/** علامت‌گذاری یک استوری به‌عنوان «دیده‌شده». */
export function markStorySeen(id: number): void {
  if (typeof window === "undefined" || !Number.isFinite(id)) {
    return;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.storiesSeen);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    const seen: Record<string, unknown> = isRecord(parsed) ? { ...parsed } : {};

    seen[String(id)] = Date.now();

    window.localStorage.setItem(STORAGE_KEYS.storiesSeen, JSON.stringify(seen));
  } catch {
    // نادیده گرفتن خطای Storage
  }
}
