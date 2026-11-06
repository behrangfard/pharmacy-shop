import { useEffect, useRef } from "react";

import { applyPageMeta, NO_INDEX_ROBOTS, SITE_NAME, type PageMeta } from "../utils/seo";

/**
 * نوشتن متای صفحه (عنوان، توضیحات، canonical، og/twitter و JSON-LD).
 *
 * هر صفحهٔ عمومی یک بار این هوک را با دادهٔ خودش صدا می‌زند. برای صفحه‌هایی که
 * داده‌شان بعد از درخواست API می‌آید، مقدار `null` بدهید تا وقتی داده آماده
 * نشده چیزی نوشته نشود (متای صفحهٔ قبلی دست‌نخورده می‌ماند).
 *
 * وابستگی افکت، رشتهٔ سریال‌شدهٔ متاست؛ بنابراین آبجکت تازه در هر رندر باعث
 * اجرای بی‌مورد نمی‌شود.
 */
export function usePageMeta(meta: PageMeta | null): void {
  const key = meta ? JSON.stringify(meta) : "";
  const latest = useRef(meta);

  latest.current = meta;

  useEffect(() => {
    const value = latest.current;

    if (!value) return;

    applyPageMeta(value);
  }, [key]);
}

/**
 * متای صفحه‌های خصوصی (سبد خرید، پرداخت، حساب کاربری، ورود/ثبت‌نام).
 *
 * این صفحه‌ها محتوای عمومی ندارند و نباید ایندکس شوند؛ همچنین باید canonical
 * و عنوان خودشان را بنویسند تا متای صفحهٔ قبلی (مثلاً محصول) روی آن‌ها نماند.
 */
export function usePrivatePageMeta(title: string, path: string): void {
  usePageMeta({
    title: `${title} | ${SITE_NAME}`,
    description: `${title} در ${SITE_NAME}.`,
    path,
    robots: NO_INDEX_ROBOTS,
  });
}

export default usePageMeta;
