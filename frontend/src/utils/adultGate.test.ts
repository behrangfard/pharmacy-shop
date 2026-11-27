import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ADULT_CONSENT_EVENT,
  ADULT_MIN_AGE,
  adultConsentAt,
  grantAdultConsent,
  hasAdultConsent,
  revokeAdultConsent,
} from "./adultGate";
import { STORAGE_KEYS } from "./storageKeys";

/**
 * دروازهٔ سنی بخش ویژهٔ بزرگسالان.
 *
 * شرایط: پیش‌فرض بدون تأیید، تأیید در localStorage می‌ماند، رویداد همگام‌سازی
 * منتشر می‌شود و لغو تأیید مقدار ذخیره‌شده را پاک می‌کند.
 */
describe("adultGate", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("با پیش‌فرض تأیید نشده است", () => {
    expect(hasAdultConsent()).toBe(false);
    expect(adultConsentAt()).toBeNull();
  });

  it("تأیید سن را در کلید اختصاصی localStorage ذخیره می‌کند", () => {
    grantAdultConsent();

    expect(hasAdultConsent()).toBe(true);

    const stored = window.localStorage.getItem(STORAGE_KEYS.adultConsent);

    expect(stored).not.toBeNull();
    expect(Number.isNaN(new Date(String(stored)).getTime())).toBe(false);
    expect(adultConsentAt()).toBe(stored);
  });

  it("پس از تأیید رویداد همگام‌سازی منتشر می‌شود", () => {
    const listener = vi.fn();

    window.addEventListener(ADULT_CONSENT_EVENT, listener);
    grantAdultConsent();
    revokeAdultConsent();
    window.removeEventListener(ADULT_CONSENT_EVENT, listener);

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("لغو تأیید مقدار ذخیره‌شده را پاک می‌کند", () => {
    grantAdultConsent();
    revokeAdultConsent();

    expect(hasAdultConsent()).toBe(false);
    expect(window.localStorage.getItem(STORAGE_KEYS.adultConsent)).toBeNull();
  });

  it("مقدار خالی را تأیید حساب نمی‌کند", () => {
    window.localStorage.setItem(STORAGE_KEYS.adultConsent, "   ");

    expect(hasAdultConsent()).toBe(false);
  });

  it("حداقل سن را ۱۸ سال اعلام می‌کند", () => {
    expect(ADULT_MIN_AGE).toBe(18);
  });
});
