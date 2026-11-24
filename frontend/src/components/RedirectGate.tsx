import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

import {
  fetchRedirectRules,
  findRedirectRule,
  reportRedirectHit,
} from "../services/redirects";

/**
 * ریدایرکت مسیرهای قدیمی (۳۰۱) در سمت مرورگر.
 *
 * فایل ریدایرکت هاست در زمان build ساخته می‌شود، ولی بازدیدکننده‌ای که با
 * لینک قدیمی داخل SPA می‌آید نباید به ۴۰۴ بخورد؛ این کامپوننت نقشهٔ
 * ریدایرکت‌ها را (با کش) می‌گیرد و مسیرهای قدیمی را به مقصد می‌فرستد.
 *
 * - مسیرهای پنل (/admin) مستثنا هستند.
 * - مقصد بیرونی (http/https) با `location.replace` باز می‌شود.
 * - اگر مقصد ریدایرکت، همان مسیر فعلی باشد که نمی‌گردد (حلقه نمی‌سازد).
 */
export default function RedirectGate() {
  const location = useLocation();
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (location.pathname.startsWith("/admin")) {
      setTarget(null);
      return;
    }

    const current = `${location.pathname}${location.search}`;

    void fetchRedirectRules().then((rules) => {
      if (cancelled) return;

      const rule = findRedirectRule(rules, location.pathname);

      if (!rule || rule.to === current) {
        setTarget(null);
        return;
      }

      reportRedirectHit(location.pathname);

      if (/^https?:\/\//i.test(rule.to)) {
        window.location.replace(rule.to);
        return;
      }

      setTarget(rule.to);
    });

    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.search]);

  if (!target) return null;

  return <Navigate to={target} replace />;
}
