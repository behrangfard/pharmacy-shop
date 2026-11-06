import api from "./api";
import { STORAGE_KEYS } from "../utils/storageKeys";

/**
 * تنظیمات عمومی فروشگاه با همان الگوی کش دسته‌بندی‌ها:
 * حافظه → localStorage → درخواست شبکه با حالت stale-while-revalidate.
 * فوتر، صفحهٔ پرداخت و صفحهٔ محصولات از این مقادیر استفاده می‌کنند تا
 * اطلاعات تماس، هزینه ارسال و مالیات از پنل مدیران قابل ویرایش باشند.
 */
export interface StorefrontSettings {
  store_name: string;
  store_slogan: string;
  store_phone: string;
  store_mobile: string;
  store_email: string;
  store_address: string;
  store_working_hours: string;
  store_instagram: string;
  store_telegram: string;
  store_whatsapp: string;
  support_note: string;
  shipping_note: string;
  return_policy_days: number;
  vat_enabled: boolean;
  vat_percent: number;
  shipping_cost: number;
  free_shipping_enabled: boolean;
  free_shipping_threshold: number;
}

export const DEFAULT_STOREFRONT_SETTINGS: StorefrontSettings = {
  store_name: "بهرنگ شاپ",
  store_slogan: "فروشگاه آنلاین لباس زیر با تمرکز بر کیفیت و راحتی",
  store_phone: "",
  store_mobile: "",
  store_email: "",
  store_address: "",
  store_working_hours: "",
  store_instagram: "",
  store_telegram: "",
  store_whatsapp: "",
  support_note: "همراه شما در مسیر خرید",
  shipping_note: "",
  return_policy_days: 7,
  vat_enabled: false,
  vat_percent: 0,
  shipping_cost: 0,
  free_shipping_enabled: false,
  free_shipping_threshold: 0,
};

interface SettingsCache {
  data: StorefrontSettings;
  savedAt: number;
}

const CACHE_TTL = 6 * 60 * 60 * 1000;
const REVALIDATE_AFTER = 5 * 60 * 1000;

let memoryCache: SettingsCache | null = null;
let inFlightRequest: Promise<StorefrontSettings> | null = null;

const listeners = new Set<(settings: StorefrontSettings) => void>();

function normalize(raw: unknown): StorefrontSettings {
  const source = (raw ?? {}) as Partial<Record<keyof StorefrontSettings, unknown>>;

  const text = (value: unknown, fallback: string) =>
    typeof value === "string" && value.trim() !== "" ? value : fallback;

  const number = (value: unknown, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  };

  return {
    store_name: text(source.store_name, DEFAULT_STOREFRONT_SETTINGS.store_name),
    store_slogan: text(
      source.store_slogan,
      DEFAULT_STOREFRONT_SETTINGS.store_slogan,
    ),
    store_phone: text(source.store_phone, ""),
    store_mobile: text(source.store_mobile, ""),
    store_email: text(source.store_email, ""),
    store_address: text(source.store_address, ""),
    store_working_hours: text(source.store_working_hours, ""),
    store_instagram: text(source.store_instagram, ""),
    store_telegram: text(source.store_telegram, ""),
    store_whatsapp: text(source.store_whatsapp, ""),
    support_note: text(
      source.support_note,
      DEFAULT_STOREFRONT_SETTINGS.support_note,
    ),
    shipping_note: text(source.shipping_note, ""),
    return_policy_days: number(source.return_policy_days, 7),
    vat_enabled: source.vat_enabled === true,
    vat_percent: Math.min(number(source.vat_percent), 100),
    shipping_cost: number(source.shipping_cost),
    free_shipping_enabled: source.free_shipping_enabled === true,
    free_shipping_threshold: number(source.free_shipping_threshold),
  };
}

function readStoredCache(): SettingsCache | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.storefrontSettings);

    if (!raw) return null;

    const parsed = JSON.parse(raw) as SettingsCache;

    if (!parsed?.data || typeof parsed.savedAt !== "number") {
      return null;
    }

    if (Date.now() - parsed.savedAt >= CACHE_TTL) {
      return null;
    }

    return { data: normalize(parsed.data), savedAt: parsed.savedAt };
  } catch {
    return null;
  }
}

function writeStoredCache(cache: SettingsCache): void {
  try {
    window.localStorage.setItem(
      STORAGE_KEYS.storefrontSettings,
      JSON.stringify(cache),
    );
  } catch {
    // در صورت در دسترس نبودن Storage، کش حافظه‌ای کافی است.
  }
}

function notify(settings: StorefrontSettings): void {
  listeners.forEach((listener) => listener(settings));
}

export function readCachedStoreSettings(): StorefrontSettings {
  if (memoryCache) return memoryCache.data;

  const stored = readStoredCache();

  if (stored) {
    memoryCache = stored;
    return stored.data;
  }

  return DEFAULT_STOREFRONT_SETTINGS;
}

export async function fetchStoreSettings(
  force = false,
): Promise<StorefrontSettings> {
  const cached = memoryCache ?? readStoredCache();
  const isFresh =
    cached !== null && Date.now() - cached.savedAt < REVALIDATE_AFTER;

  if (!force && isFresh) {
    return cached.data;
  }

  if (inFlightRequest) {
    return inFlightRequest;
  }

  inFlightRequest = api
    .get("/store-settings")
    .then((response) => {
      const settings = normalize(response.data?.data);
      const cache: SettingsCache = { data: settings, savedAt: Date.now() };

      memoryCache = cache;
      writeStoredCache(cache);
      notify(settings);

      return settings;
    })
    .catch((error) => {
      console.error("Failed to load store settings:", error);

      const fallback = cached?.data ?? DEFAULT_STOREFRONT_SETTINGS;
      memoryCache = memoryCache ?? { data: fallback, savedAt: Date.now() };

      return fallback;
    })
    .finally(() => {
      inFlightRequest = null;
    });

  return inFlightRequest;
}

export function invalidateStoreSettingsCache(): void {
  memoryCache = null;

  try {
    window.localStorage.removeItem(STORAGE_KEYS.storefrontSettings);
  } catch {
    // نادیده گرفتن خطای Storage
  }
}

export function subscribeStoreSettings(
  listener: (settings: StorefrontSettings) => void,
): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
