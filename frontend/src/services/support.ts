import api from "./api";
import { STORAGE_KEYS } from "../utils/storageKeys";

/**
 * کلاینت API چت پشتیبانی فروشگاه.
 *
 * گفتگوی کاربر مهمان با «توکن» شناخته می‌شود و همان توکن در مرورگر ذخیره
 * می‌شود؛ بنابراین با رفرش صفحه، گفتگو ادامه پیدا می‌کند.
 */

export type SupportChannelKey = "telegram" | "whatsapp" | "bale";

export type SupportStatus = "open" | "pending" | "closed";

export interface SupportChannelLink {
  key: SupportChannelKey;
  label: string;
  description: string;
  link: string;
  prefill: boolean;
}

export interface SupportConfig {
  enabled: boolean;
  poll_seconds: number;
  store_name: string;
  working_hours: string;
  support_note: string;
  phone: string;
  mobile: string;
  email: string;
  channels: SupportChannelLink[];
}

export interface SupportMessageRecord {
  id: number;
  sender: "user" | "admin" | "system";
  body: string;
  admin_name: string | null;
  created_at: string | null;
}

export interface SupportConversationPayload {
  token: string;
  status: SupportStatus;
  status_label: string;
  channel: string;
  subject: string | null;
  name: string | null;
  contact: string | null;
  user_unread_count: number;
  last_message_at: string | null;
  created_at: string | null;
  messages: SupportMessageRecord[];
}

export interface StartSupportPayload {
  name?: string;
  contact?: string;
  subject?: string;
  message: string;
  page_url?: string;
}

const SUPPORT_TOKEN_KEY = STORAGE_KEYS.supportConversation;

export function readSupportToken(): string | null {
  try {
    const token = window.localStorage.getItem(SUPPORT_TOKEN_KEY);

    return token && token.trim() !== "" ? token : null;
  } catch {
    return null;
  }
}

export function saveSupportToken(token: string): void {
  try {
    window.localStorage.setItem(SUPPORT_TOKEN_KEY, token);
  } catch {
    // اگر Storage در دسترس نبود، گفتگو در همین نشست ادامه می‌یابد.
  }
}

export function clearSupportToken(): void {
  try {
    window.localStorage.removeItem(SUPPORT_TOKEN_KEY);
  } catch {
    // نادیده گرفتن خطای Storage
  }
}

export async function fetchSupportConfig(): Promise<SupportConfig> {
  const response = await api.get("/support/config");
  const data = response.data?.data as Partial<SupportConfig> | undefined;

  return {
    enabled: data?.enabled !== false,
    poll_seconds:
      typeof data?.poll_seconds === "number" && data.poll_seconds >= 3
        ? data.poll_seconds
        : 5,
    store_name: data?.store_name ?? "",
    working_hours: data?.working_hours ?? "",
    support_note: data?.support_note ?? "",
    phone: data?.phone ?? "",
    mobile: data?.mobile ?? "",
    email: data?.email ?? "",
    channels: Array.isArray(data?.channels) ? data.channels : [],
  };
}

export async function startSupportConversation(
  payload: StartSupportPayload,
): Promise<SupportConversationPayload> {
  const response = await api.post("/support/conversations", payload);

  return response.data?.data as SupportConversationPayload;
}

export async function fetchSupportConversation(
  token: string,
): Promise<SupportConversationPayload> {
  const response = await api.get(
    `/support/conversations/${encodeURIComponent(token)}`,
  );

  return response.data?.data as SupportConversationPayload;
}

export async function sendSupportMessage(
  token: string,
  message: string,
): Promise<SupportMessageRecord> {
  const response = await api.post(
    `/support/conversations/${encodeURIComponent(token)}/messages`,
    { message },
  );

  return response.data?.data as SupportMessageRecord;
}

export async function closeSupportConversation(
  token: string,
): Promise<SupportConversationPayload> {
  const response = await api.post(
    `/support/conversations/${encodeURIComponent(token)}/close`,
  );

  return response.data?.data as SupportConversationPayload;
}

/**
 * لینک پیام‌رسان با متن آمادهٔ گفتگو (برای واتساپ و لینک‌های wa.me).
 */
export function supportChannelHref(
  channel: SupportChannelLink,
  greeting: string,
): string {
  if (!channel.prefill) {
    return channel.link;
  }

  const separator = channel.link.includes("?") ? "&" : "?";

  return `${channel.link}${separator}text=${encodeURIComponent(greeting)}`;
}

type SeenMap = Record<string, number>;

function readSeenMap(): SeenMap {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.supportLastSeen);
    const parsed = raw ? (JSON.parse(raw) as SeenMap) : {};

    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** شناسهٔ آخرین پیام دیده‌شده در یک گفتگو (برای نشانگر «پیام جدید»). */
export function readLastSeenId(token: string): number {
  const value = readSeenMap()[token];

  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function saveLastSeenId(token: string, messageId: number): void {
  try {
    const map = readSeenMap();

    map[token] = messageId;

    // فقط گفتگوهای همین مرورگر نگه داشته می‌شوند تا کلید بی‌نهایت رشد نکند.
    const entries = Object.entries(map).slice(-5);

    window.localStorage.setItem(
      STORAGE_KEYS.supportLastSeen,
      JSON.stringify(Object.fromEntries(entries)),
    );
  } catch {
    // نادیده گرفتن خطای Storage
  }
}
