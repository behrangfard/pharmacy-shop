/**
 * ثبت سرویس‌ورکر PWA.
 *
 * فقط در نسخهٔ تولید ثبت می‌شود تا در حالت توسعه (HMR ویت) کش سرویس‌ورکر
 * باعث دیدن نسخهٔ قدیمی صفحه نشود. فایل `public/sw.js` هنگام build در
 * ریشهٔ سایت قرار می‌گیرد.
 */
export function registerServiceWorker(): void {
  if (typeof window === "undefined") {
    return;
  }

  if (!("serviceWorker" in navigator)) {
    return;
  }

  if (!import.meta.env.PROD) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((error) => {
        console.error("Service worker registration failed:", error);
      });
  });
}

export default registerServiceWorker;
