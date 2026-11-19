import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

/**
 * تنظیمات مشترک تست‌های فرانت.
 *
 * - ماتچرهای `jest-dom` (مثل `toBeDisabled`) به `expect` ویتست اضافه می‌شوند.
 * - پس از هر تست، DOM پاک و `localStorage`/`sessionStorage` خالی می‌شود تا
 *   تست‌ها روی هم اثر نگذارند (توکن مهمان و سبد خرید در همین‌ها ذخیره می‌شوند).
 */
afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.sessionStorage.clear();
});
