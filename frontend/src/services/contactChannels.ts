import api from "./api";
import { STORAGE_KEYS } from "../utils/storageKeys";

/**
 * کانال‌های ارتباطی فروشگاه (تلگرام، واتس‌اپ، بله، ایتا، اینستاگرام).
 *
 * هر کانال دو دکمه دارد: «عضویت در کانال» و «ارسال پیام به اکانت فروشگاه».
 * فهرست و متن دکمه‌ها کامل از پنل مدیران (/admin/channels) می‌آید؛ اگر مدیر
 * هیچ لینکی وارد نکرده باشد آرایه خالی برمی‌گردد و بخش «همراه ما باشید»
 * رندر نمی‌شود.
 *
 * کش مثل تنظیمات فروشگاه و نشان‌های اعتماد است: حافظه → localStorage → شبکه
 * (stale-while-revalidate) تا بخش از اولین رندر بدون پرش چیدمان بیاید.
 */
export type ContactChannelKey =
  | "telegram"
  | "whatsapp"
  | "bale"
  | "eitaa"
  | "instagram";

export interface ContactChannel {
  key: ContactChannelKey;
  title: string;
  description: string;
  join_url: string | null;
  join_label: string | null;
  chat_url: string | null;
  chat_label: string | null;
}

export interface ContactChannelMeta {
  label: string;
  joinLabel: string;
  chatLabel: string;
  joinPlaceholder: string;
  chatPlaceholder: string;
}

/** برچسب‌ها و نمونهٔ ورودی هر پلتفرم (مشترک بین سایت و پنل). */
export const CONTACT_CHANNEL_META: Record<ContactChannelKey, ContactChannelMeta> =
  {
    telegram: {
      label: "تلگرام",
      joinLabel: "عضویت در کانال",
      chatLabel: "ارسال پیام",
      joinPlaceholder: "https://t.me/behrangshop",
      chatPlaceholder: "@behrang_support",
    },
    whatsapp: {
      label: "واتس‌اپ",
      joinLabel: "عضویت در کانال",
      chatLabel: "ارسال پیام",
      joinPlaceholder: "https://whatsapp.com/channel/...",
      chatPlaceholder: "09121234567",
    },
    bale: {
      label: "بله",
      joinLabel: "عضویت در کانال",
      chatLabel: "ارسال پیام",
      joinPlaceholder: "https://ble.ir/behrangshop",
      chatPlaceholder: "@behrang_support",
    },
    eitaa: {
      label: "ایتا",
      joinLabel: "عضویت در کانال",
      chatLabel: "ارسال پیام",
      joinPlaceholder: "https://eitaa.com/behrangshop",
      chatPlaceholder: "@behrang_support",
    },
    instagram: {
      label: "اینستاگرام",
      joinLabel: "مشاهدهٔ صفحه",
      chatLabel: "ارسال پیام",
      joinPlaceholder: "https://instagram.com/behrang.shop",
      chatPlaceholder: "@behrang.shop",
    },
  };

/** متن آمادهٔ گفتگو در واتس‌اپ (لینک wa.me با پارامتر text). */
export const CONTACT_CHANNEL_GREETING =
  "سلام، از فروشگاه آنلاین پیام می‌دهم و راهنمایی می‌خواهم.";

export function isContactChannelKey(value: string): value is ContactChannelKey {
  return Object.prototype.hasOwnProperty.call(CONTACT_CHANNEL_META, value);
}

export function channelHasLinks(channel: ContactChannel): boolean {
  return Boolean(channel.join_url || channel.chat_url);
}

/** برچسب دکمهٔ عضویت؛ متن پنل اولویت دارد. */
export function contactChannelJoinLabel(channel: ContactChannel): string {
  return channel.join_label || CONTACT_CHANNEL_META[channel.key].joinLabel;
}

/** برچسب دکمهٔ ارسال پیام؛ متن پنل اولویت دارد. */
export function contactChannelChatLabel(channel: ContactChannel): string {
  return channel.chat_label || CONTACT_CHANNEL_META[channel.key].chatLabel;
}

/**
 * لینک ارسال پیام؛ برای واتس‌اپ متن خوش‌آمد پیش‌فرض اضافه می‌شود تا کاربر
 * با یک متن آماده گفتگو را شروع کند.
 */
export function contactChannelChatHref(
  channel: ContactChannel,
  greeting: string = CONTACT_CHANNEL_GREETING,
): string | null {
  if (!channel.chat_url) return null;

  if (channel.key !== "whatsapp") return channel.chat_url;

  const separator = channel.chat_url.includes("?") ? "&" : "?";

  return `${channel.chat_url}${separator}text=${encodeURIComponent(greeting)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function optionalUrl(value: unknown): string | null {
  const url = text(value);

  return url === "" ? null : url;
}

export function normalizeContactChannel(raw: unknown): ContactChannel | null {
  if (!isRecord(raw)) return null;

  const key = text(raw.key);

  if (!isContactChannelKey(key)) return null;

  const channel: ContactChannel = {
    key,
    title: text(raw.title) || CONTACT_CHANNEL_META[key].label,
    description: text(raw.description),
    join_url: optionalUrl(raw.join_url),
    join_label: optionalUrl(raw.join_label),
    chat_url: optionalUrl(raw.chat_url),
    chat_label: optionalUrl(raw.chat_label),
  };

  return channelHasLinks(channel) ? channel : null;
}

function normalize(raw: unknown): ContactChannel[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map(normalizeContactChannel)
    .filter((channel): channel is ContactChannel => channel !== null);
}

interface ContactChannelCache {
  data: ContactChannel[];
  savedAt: number;
}

/** مدتی که دادهٔ کش‌شده بدون هیچ درخواستی نمایش داده می‌شود. */
const CACHE_TTL = 6 * 60 * 60 * 1000;

/** بعد از این مدت داده فوراً نمایش داده می‌شود و در پس‌زمینه تازه می‌شود. */
const REVALIDATE_AFTER = 5 * 60 * 1000;

let memoryCache: ContactChannelCache | null = null;
let inFlightRequest: Promise<ContactChannel[]> | null = null;

function readStoredCache(): ContactChannelCache | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(
      STORAGE_KEYS.storefrontContactChannels,
    );

    if (!raw) return null;

    const parsed = JSON.parse(raw) as ContactChannelCache;

    if (!isRecord(parsed) || typeof parsed.savedAt !== "number") {
      return null;
    }

    if (Date.now() - parsed.savedAt >= CACHE_TTL) {
      window.localStorage.removeItem(STORAGE_KEYS.storefrontContactChannels);
      return null;
    }

    return { data: normalize(parsed.data), savedAt: parsed.savedAt };
  } catch {
    return null;
  }
}

function writeStoredCache(cache: ContactChannelCache): void {
  try {
    window.localStorage.setItem(
      STORAGE_KEYS.storefrontContactChannels,
      JSON.stringify(cache),
    );
  } catch {
    // در دسترس نبودن Storage مانع نمایش کانال‌ها نمی‌شود.
  }
}

/** آخرین فهرست کش‌شده (بدون درخواست شبکه)؛ برای مقدار اولیهٔ رندر. */
export function getCachedContactChannels(): ContactChannel[] {
  if (memoryCache === null) {
    memoryCache = readStoredCache();
  }

  return memoryCache?.data ?? [];
}

/** فهرست کانال‌ها را از سرور می‌خواند (با کش و ادغام درخواست‌های هم‌زمان). */
export function fetchContactChannels(
  options: { force?: boolean } = {},
): Promise<ContactChannel[]> {
  const cached = getCachedContactChannels();
  const isFresh =
    memoryCache !== null && Date.now() - memoryCache.savedAt < REVALIDATE_AFTER;

  if (!options.force && memoryCache !== null && isFresh) {
    return Promise.resolve(cached);
  }

  if (inFlightRequest !== null) {
    return inFlightRequest;
  }

  inFlightRequest = api
    .get("/contact-channels")
    .then((response) => {
      const channels = normalize(response.data?.data);

      memoryCache = { data: channels, savedAt: Date.now() };
      writeStoredCache(memoryCache);

      return channels;
    })
    .catch((error) => {
      console.error("دریافت کانال‌های ارتباطی ناموفق بود:", error);

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

/** پاک‌کردن کش کانال‌ها (مثلاً بعد از تغییر در پنل مدیران). */
export function invalidateContactChannelsCache(): void {
  memoryCache = null;

  try {
    window.localStorage.removeItem(STORAGE_KEYS.storefrontContactChannels);
  } catch {
    // نادیده گرفتن خطای Storage
  }
}
