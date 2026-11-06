import { useEffect, useState } from "react";

import {
  fetchTrustBadges,
  getCachedTrustBadges,
  type TrustBadge,
} from "../services/trustBadges";

/**
 * نشان‌های اعتماد فوتر را فوراً از کش نمایش می‌دهد و در پس‌زمینه تازه می‌کند.
 */
export function useTrustBadges(): TrustBadge[] {
  const [badges, setBadges] = useState<TrustBadge[]>(() =>
    getCachedTrustBadges(),
  );

  useEffect(() => {
    let active = true;

    void fetchTrustBadges().then((next) => {
      if (active) setBadges(next);
    });

    return () => {
      active = false;
    };
  }, []);

  return badges;
}
