/**
 * ساخت خودکار sitemap.xml و robots.txt در زمان build.
 *
 * چرا اسکریپت و نه endpoint؟ سایت یک SPA است که روی هاست استاتیک منتشر
 * می‌شود؛ پس فایل‌ها باید کنار index.html در پوشهٔ dist قرار بگیرند تا روی
 * دامنهٔ اصلی سایت سرو شوند (گوگل همهٔ آدرس‌های sitemap را روی همان میزبان
 * می‌خواهد).
 *
 * ورودی‌ها (متغیر محیطی):
 * - VITE_SITE_URL   نشانی نهایی سایت؛ اگر تنظیم نشده باشد sitemap ساخته
 *                   نمی‌شود (تا آدرس‌های example.com به گوگل نرود).
 * - VITE_API_URL    نشانی API برای گرفتن محصولات/دسته‌ها/مقاله‌ها. اگر در
 *                   زمان build در دسترس نباشد، فقط صفحه‌های ثابت نوشته
 *                   می‌شوند و build شکست نمی‌خورد.
 *
 * اجرا: npm run sitemap  (و به‌صورت خودکار بعد از npm run build)
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE_URL = (
  process.env.VITE_SITE_URL ||
  process.env.SITE_URL ||
  ""
).replace(/\/+$/, "");

const API_URL = (
  process.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1"
).replace(/\/+$/, "");

const OUT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "dist",
);

const STATIC_PAGES = [
  { loc: "/", changefreq: "daily", priority: "1.0" },
  { loc: "/products", changefreq: "daily", priority: "0.9" },
  { loc: "/articles", changefreq: "weekly", priority: "0.7" },
  { loc: "/size-guide", changefreq: "monthly", priority: "0.5" },
];

/** درخواست امن به API؛ هر خطایی به آرایهٔ خالی تبدیل می‌شود. */
async function fetchJson(pathname) {
  try {
    const response = await fetch(`${API_URL}${pathname}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return null;

    return await response.json();
  } catch {
    return null;
  }
}

/** استخراج آرایه از پاسخ API (پاسخ معمولی یا صفحه‌بندی‌شدهٔ لاراول). */
function listOf(payload) {
  const data = payload?.data;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(payload)) return payload;

  return [];
}

/** شمارهٔ آخرین صفحه در پاسخ صفحه‌بندی‌شده. */
function lastPageOf(payload) {
  const last = Number(payload?.meta?.last_page ?? payload?.data?.last_page);

  return Number.isFinite(last) && last > 0 ? last : 1;
}

/**
 * گرفتن همهٔ آیتم‌های یک مسیر صفحه‌بندی‌شده.
 * سقف صفحه‌ها برای جلوگیری از حلقهٔ بی‌پایان روی دادهٔ ناسازگار است.
 */
async function fetchAll(pathname, { perPage, maxPages = 40 }) {
  const items = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const payload = await fetchJson(
      `${pathname}?per_page=${perPage}&page=${page}`,
    );

    if (!payload) break;

    const batch = listOf(payload);

    if (batch.length === 0) break;

    items.push(...batch);

    if (page >= lastPageOf(payload)) break;
  }

  return items;
}

/** فهرست کامل slug دسته‌های تودرتو. */
function flattenCategories(categories) {
  const result = [];

  const walk = (items) => {
    items.forEach((item) => {
      if (item?.slug) result.push(item.slug);
      if (Array.isArray(item?.children)) walk(item.children);
    });
  };

  walk(categories);

  return result;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntry(loc, options = {}) {
  const lines = [`    <loc>${escapeXml(`${SITE_URL}${loc}`)}</loc>`];

  if (options.lastmod) lines.push(`    <lastmod>${options.lastmod}</lastmod>`);
  if (options.changefreq) {
    lines.push(`    <changefreq>${options.changefreq}</changefreq>`);
  }
  if (options.priority) lines.push(`    <priority>${options.priority}</priority>`);

  return `  <url>\n${lines.join("\n")}\n  </url>`;
}

/** تاریخ ISO معتبر برای lastmod؛ در غیر این صورت null. */
function toLastmod(value) {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function buildSitemap() {
  const [products, categoriesPayload, articles] = await Promise.all([
    fetchAll("/products", { perPage: 48 }),
    fetchJson("/categories"),
    fetchAll("/articles", { perPage: 24 }),
  ]);

  const productEntries = products
    .filter((product) => product?.slug && product?.is_active !== false)
    .map((product) =>
      urlEntry(`/product/${product.slug}`, {
        lastmod: toLastmod(product.updated_at),
        changefreq: "weekly",
        priority: "0.8",
      }),
    );

  const categoryEntries = flattenCategories(listOf(categoriesPayload)).map(
    (slug) =>
      urlEntry(`/products?category=${encodeURIComponent(slug)}`, {
        changefreq: "weekly",
        priority: "0.7",
      }),
  );

  const articleEntries = articles
    .filter((article) => article?.slug)
    .map((article) =>
      urlEntry(`/articles/${article.slug}`, {
        lastmod: toLastmod(article.updated_at || article.published_at),
        changefreq: "monthly",
        priority: "0.6",
      }),
    );

  const staticEntries = STATIC_PAGES.map((page) =>
    urlEntry(page.loc, {
      changefreq: page.changefreq,
      priority: page.priority,
    }),
  );

  const urls = [
    ...staticEntries,
    ...categoryEntries,
    ...productEntries,
    ...articleEntries,
  ];

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
}

function buildRobots() {
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /cart",
    "Disallow: /checkout",
    "Disallow: /payment",
    "Disallow: /account",
    "Disallow: /login",
    "Disallow: /register",
    "Disallow: /order/",
    "",
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    "",
  ].join("\n");
}

async function main() {
  if (!SITE_URL) {
    console.warn(
      "[sitemap] VITE_SITE_URL تنظیم نشده است؛ sitemap.xml و robots.txt ساخته نشدند.",
    );
    return;
  }

  await mkdir(OUT_DIR, { recursive: true });

  const sitemap = await buildSitemap();

  await writeFile(path.join(OUT_DIR, "sitemap.xml"), sitemap, "utf8");
  await writeFile(path.join(OUT_DIR, "robots.txt"), buildRobots(), "utf8");

  const count = (sitemap.match(/<url>/g) || []).length;

  console.log(`[sitemap] ${count} آدرس در ${OUT_DIR} نوشته شد.`);
}

main().catch((error) => {
  console.warn(
    "[sitemap] ساخت sitemap ناموفق بود:",
    error?.stack ?? error?.message ?? error,
  );
});
