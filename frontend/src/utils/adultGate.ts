import { STORAGE_KEYS } from "./storageKeys";

/**
 * «دروازهٔ سنی» بخش ویژهٔ بزرگسالان.
 *
 * تأیید سن فقط در همین مرورگر نگه داشته می‌شود (localStorage) و هیچ داده‌ای
 * به سرور فرستاده نمی‌شود؛ در سمت سرور تنها نشانهٔ این بخش، پرچم
 * `products.is_adult` است. مقدار ذخیره‌شده زمان تأیید (ISO) است تا بعداً
 * بتوان برای تأیید سقف اعتبار گذاشت.
 */
export const ADULT_CONSENT_EVENT = "behrang:adult-consent";

/** حداقل سن لازم برای مشاهدهٔ این بخش. */
export const ADULT_MIN_AGE = 18;

const CONSENT_KEY = STORAGE_KEYS.adultConsent;

/** آیا کاربر در این مرورگر تأیید کرده بالای ۱۸ سال است؟ */
export function hasAdultConsent(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);

    return typeof raw === "string" && raw.trim() !== "";
  } catch {
    return false;
  }
}

/** زمان تأیید سن (ISO)؛ اگر تأییدی ثبت نشده باشد `null`. */
export function adultConsentAt(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);

    return typeof raw === "string" && raw.trim() !== "" ? raw : null;
  } catch {
    return null;
  }
}

/** ثبت تأیید سن و اطلاع‌رسانی به بخش‌های UI. */
export function grantAdultConsent(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(CONSENT_KEY, new Date().toISOString());
  } catch (error) {
    console.error("Adult consent storage error:", error);
  }

  window.dispatchEvent(new Event(ADULT_CONSENT_EVENT));
}

/** لغو تأیید سن (خروج از بخش ویژه)؛ دفعهٔ بعد دوباره دروازه نشان داده می‌شود. */
export function revokeAdultConsent(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(CONSENT_KEY);
  } catch (error) {
    console.error("Adult consent storage error:", error);
  }

  window.dispatchEvent(new Event(ADULT_CONSENT_EVENT));
}
