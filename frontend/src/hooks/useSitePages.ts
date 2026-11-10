import { useEffect, useState } from "react";

import {
  fetchSitePages,
  getCachedSitePages,
  type SitePageSummary,
} from "../services/pages";

/**
 * صفحات ثابت سایت برای لینک‌های فوتر.
 *
 * فهرست کش‌شده فوراً نمایش داده می‌شود و در پس‌زمینه از سرور تازه می‌شود تا
 * فوتر بدون پرش چیدمان پر شود.
 */
export function useSitePages(): SitePageSummary[] {
  const [pages, setPages] = useState<SitePageSummary[]>(() =>
    getCachedSitePages(),
  );

  useEffect(() => {
    let active = true;

    void fetchSitePages().then((next) => {
      if (active) setPages(next);
    });

    return () => {
      active = false;
    };
  }, []);

  return pages;
}
