import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { initAnalytics, trackPageView } from "../utils/analytics";

/**
 * ثبت بازدید صفحه‌ها در GA4/GTM.
 *
 * سایت SPA است و با تغییر مسیر، صفحه reload نمی‌شود؛ پس `page_view` باید با هر
 * تغییر `pathname`/`search` دستی فرستاده شود (در `initAnalytics` گزینهٔ
 * `send_page_view` خاموش است تا بازدید اولیه دوباره شمرده نشود).
 *
 * مسیرهای پنل مدیریت ثبت نمی‌شوند: آمار فروشگاه نباید با بازدید خودمان و
 * درخواست‌های پنل شلوغ شود. اگر روزی آمار پنل لازم شد، مسیر جدا و فیلتر
 * مخصوص خودش را می‌خواهد.
 */
function AnalyticsTracker() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;

    trackPageView(`${pathname}${search}`);
  }, [pathname, search]);

  return null;
}

export default AnalyticsTracker;
