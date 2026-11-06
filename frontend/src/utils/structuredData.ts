/**
 * دادهٔ ساختاریافته (JSON-LD) برای موتورهای جست‌وجو.
 *
 * هر تابع یک آبجکت schema.org برمی‌گرداند که با `usePageMeta` در head
 * تزریق می‌شود. قانون‌ها:
 * - هیچ دادهٔ ساختگی ساخته نمی‌شود؛ `aggregateRating` فقط وقتی نظر تأییدشده
 *   وجود دارد اضافه می‌شود (گوگل دادهٔ امتیاز بدون نظر را رد می‌کند).
 * - نشانی‌ها همیشه مطلق هستند.
 * - قیمت‌ها در فروشگاه به «تومان» ذخیره می‌شوند، ولی واحد استاندارد
 *   schema.org برای ایران `IRR` (ریال) است؛ برای همین در خروجی ×۱۰ می‌شوند
 *   تا مقدار اعلام‌شده با واحد آن هم‌خوان باشد.
 */

import { SITE_NAME, absoluteUrl, plainText, truncateText } from "./seo";

const SCHEMA = "https://schema.org";

/** قیمت‌های فروشگاه به تومان است؛ IRR ریال است. */
const TOMAN_TO_RIAL = 10;

const LOGO_PATH = "/images/Behrang Shop Lingerie Elegance.png";

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export interface StructuredProductInput {
  name: string;
  slug: string;
  sku?: string | null;
  /** قیمت نهایی (پس از تخفیف) به تومان. */
  price: number;
  stock: number;
  description?: string | null;
  image?: string | null;
  brand?: string | null;
  category?: string | null;
  averageRating?: number | null;
  reviewsCount?: number | null;
}

export interface StructuredArticleInput {
  title: string;
  slug: string;
  excerpt?: string | null;
  coverImage?: string | null;
  authorName?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
}

/** معرفی فروشگاه (صفحهٔ اصلی). */
export function organizationJsonLd(contact?: {
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}): Record<string, unknown> {
  const organization: Record<string, unknown> = {
    "@type": "Organization",
    "@id": `${absoluteUrl("/")}#organization`,
    name: SITE_NAME,
    url: absoluteUrl("/"),
    logo: { "@type": "ImageObject", url: absoluteUrl(LOGO_PATH) },
    image: absoluteUrl(LOGO_PATH),
    description: `${SITE_NAME}؛ فروشگاه آنلاین پوشاک و لباس زیر زنانه.`,
  };

  const phone = contact?.phone?.trim();
  const email = contact?.email?.trim();
  const address = contact?.address?.trim();

  if (phone) organization.telephone = phone;
  if (email) organization.email = email;
  if (address) {
    organization.address = {
      "@type": "PostalAddress",
      addressCountry: "IR",
      streetAddress: address,
    };
  }

  return { "@context": SCHEMA, ...organization };
}

/** سایت + جست‌وجوی داخلی (Google ممکن است Sitelinks Searchbox بسازد). */
export function websiteJsonLd(): Record<string, unknown> {
  return {
    "@context": SCHEMA,
    "@type": "WebSite",
    "@id": `${absoluteUrl("/")}#website`,
    name: SITE_NAME,
    url: absoluteUrl("/"),
    inLanguage: "fa-IR",
    publisher: { "@id": `${absoluteUrl("/")}#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${absoluteUrl("/products")}?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/** مسیر صفحه (breadcrumb) برای نمایش در نتایج گوگل. */
export function breadcrumbJsonLd(
  items: BreadcrumbItem[],
): Record<string, unknown> {
  return {
    "@context": SCHEMA,
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** یک محصول با قیمت/موجودی برای Rich Result گوگل. */
export function productJsonLd(
  product: StructuredProductInput,
): Record<string, unknown> {
  const url = absoluteUrl(`/product/${product.slug}`);
  const image = product.image ? absoluteUrl(product.image) : null;
  const inStock = Number(product.stock) > 0;
  const description =
    truncateText(plainText(product.description), 300) || product.name;

  const data: Record<string, unknown> = {
    "@context": SCHEMA,
    "@type": "Product",
    name: product.name,
    description,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    offers: {
      "@type": "Offer",
      url,
      price: Math.max(0, Math.round(product.price * TOMAN_TO_RIAL)),
      priceCurrency: "IRR",
      availability: inStock ? `${SCHEMA}/InStock` : `${SCHEMA}/OutOfStock`,
      itemCondition: `${SCHEMA}/NewCondition`,
      seller: { "@type": "Organization", name: SITE_NAME },
    },
  };

  if (image) data.image = [image];
  if (product.sku?.trim()) data.sku = product.sku.trim();
  if (product.brand?.trim()) {
    data.brand = { "@type": "Brand", name: product.brand.trim() };
  }
  if (product.category?.trim()) data.category = product.category.trim();

  const rating = Number(product.averageRating);
  const reviews = Number(product.reviewsCount);

  if (Number.isFinite(rating) && rating > 0 && reviews > 0) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(rating.toFixed(1)),
      reviewCount: reviews,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return data;
}



/** یک مقاله برای Rich Result «مقاله». */
export function articleJsonLd(
  article: StructuredArticleInput,
): Record<string, unknown> {
  const url = absoluteUrl(`/articles/${article.slug}`);
  const cover = article.coverImage
    ? absoluteUrl(article.coverImage)
    : absoluteUrl(LOGO_PATH);

  const data: Record<string, unknown> = {
    "@context": SCHEMA,
    "@type": "Article",
    headline: truncateText(article.title, 110),
    description:
      truncateText(plainText(article.excerpt), 200) || article.title,
    image: [cover],
    inLanguage: "fa-IR",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    author: {
      "@type": article.authorName?.trim() ? "Person" : "Organization",
      name: article.authorName?.trim() || SITE_NAME,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: absoluteUrl(LOGO_PATH) },
    },
  };

  if (article.publishedAt) data.datePublished = article.publishedAt;
  if (article.updatedAt || article.publishedAt) {
    data.dateModified = article.updatedAt || article.publishedAt;
  }

  return data;
}

/** فهرست محصولات/مقاله‌ها برای صفحه‌های فهرست. */
export function itemListJsonLd(
  name: string,
  items: BreadcrumbItem[],
): Record<string, unknown> {
  return {
    "@context": SCHEMA,
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.path),
    })),
  };
}
