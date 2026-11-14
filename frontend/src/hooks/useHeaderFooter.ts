import { useEffect, useState } from "react";

import {
  fetchHeaderFooter,
  readCachedHeaderFooter,
  subscribeHeaderFooter,
  type HeaderFooterSettings,
} from "../services/headerFooter";

/**
 * تنظیمات هدر و فوتر را فوراً از کش نمایش می‌دهد و در پس‌زمینه تازه می‌کند.
 */
export function useHeaderFooter(): HeaderFooterSettings {
  const [settings, setSettings] = useState<HeaderFooterSettings>(() =>
    readCachedHeaderFooter(),
  );

  useEffect(() => {
    let active = true;

    const unsubscribe = subscribeHeaderFooter((next) => {
      if (active) setSettings(next);
    });

    void fetchHeaderFooter().then((next) => {
      if (active) setSettings(next);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return settings;
}
