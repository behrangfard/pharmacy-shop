/* ==================================================================
   سرویس‌ورکر فروشگاه «بهرنگ شاپ» (PWA)
   ------------------------------------------------------------------
   راهبرد کش:
   • ناوبری صفحه‌ها: شبکه اول، در نبود شبکه از آخرین نسخهٔ کش‌شده و در
     نهایت صفحهٔ آفلاین.
   • فایل‌های ثابت (CSS/JS/فونت/تصویر): cache-first + به‌روزرسانی پس‌زمینه.
   • درخواست‌های API و دامنه‌های دیگر کش نمی‌شوند تا قیمت/موجودی قدیمی
     نمایش داده نشود.
   ================================================================== */

const VERSION = "v1";

const STATIC_CACHE = `behrang-static-${VERSION}`;
const PAGE_CACHE = `behrang-pages-${VERSION}`;

const OFFLINE_URL = "/offline.html";

/** فقط فایل‌های عمومیِ خود فرانت‌اند (بدون درخواست API) پیش‌کش می‌شوند. */
const PRECACHE_URLS = [
  "/",
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);

      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            const response = await fetch(
              new Request(url, { cache: "reload" }),
            );

            if (response.ok) {
              await cache.put(url, response);
            }
          } catch (error) {
            // یک فایل ناموفق نباید نصب سرویس‌ورکر را متوقف کند.
            console.warn("Precache failed:", url, error);
          }
        }),
      );

      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter(
            (key) =>
              key.startsWith("behrang-") &&
              key !== STATIC_CACHE &&
              key !== PAGE_CACHE,
          )
          .map((key) => caches.delete(key)),
      );

      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

/** فایل‌های ثابتِ same-origin که ارزش کش دارند. */
function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/images/") ||
    /\.(?:css|js|mjs|woff2?|ttf|png|jpe?g|svg|webp|ico)$/i.test(url.pathname)
  );
}

/** حداکثر صفحهٔ کش‌شده؛ از رشد بی‌رویهٔ کش ناوبری جلوگیری می‌کند. */
const MAX_PAGE_ENTRIES = 30;

async function trimPageCache(cache) {
  const keys = await cache.keys();

  if (keys.length <= MAX_PAGE_ENTRIES) {
    return;
  }

  await Promise.all(
    keys
      .slice(0, keys.length - MAX_PAGE_ENTRIES)
      .map((key) => cache.delete(key)),
  );
}

/** ناوبری: شبکه اول تا محتوای تازه بیاید، در غیر این صورت کش/آفلاین. */
async function networkFirstNavigation(request) {
  const cache = await caches.open(PAGE_CACHE);

  try {
    const response = await fetch(request);

    if (response && response.ok) {
      await cache.put(request, response.clone());
      await trimPageCache(cache);
    }

    return response;
  } catch (error) {
    const cached = await cache.match(request);

    if (cached) {
      return cached;
    }

    const staticCache = await caches.open(STATIC_CACHE);
    const offline = await staticCache.match(OFFLINE_URL);

    return (
      offline ||
      new Response("آفلاین هستید.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    );
  }
}

/** فایل ثابت: نسخهٔ کش‌شده فوری، تازه‌سازی در پس‌زمینه. */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }

      return response;
    })
    .catch(() => null);

  if (cached) {
    return cached;
  }

  const fresh = await network;

  return (
    fresh ||
    new Response("", { status: 504, statusText: "Offline" })
  );
}

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // درخواست‌های API/دامنه‌های دیگر به مرورگر سپرده می‌شوند.
  if (url.origin !== self.location.origin) {
    return;
  }

  // خود سرویس‌ورکر کش نمی‌شود تا نسخهٔ تازه همیشه بررسی شود.
  if (url.pathname === "/sw.js") {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
