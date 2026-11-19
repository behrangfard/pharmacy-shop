import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * پیکربندی تست فرانت: Vitest + Testing Library روی محیط jsdom.
 *
 * چرا جدا از `vite.config.ts`: پلاگین Tailwind و بازنویسی نسخهٔ سرویس‌ورکر
 * در تست‌ها لازم نیست و فقط زمان اجرا را بالا می‌برد. تست‌ها در
 * `src/**\/*.test.ts(x)` کنار همان ماژول‌ها قرار می‌گیرند.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    restoreMocks: true,
  },
});
