import { useEffect, useState } from "react";

import {
  fetchStoreSettings,
  readCachedStoreSettings,
  subscribeStoreSettings,
  type StorefrontSettings,
} from "../services/storeSettings";

/**
 * تنظیمات فروشگاه را فوراً از کش نمایش می‌دهد و در پس‌زمینه تازه می‌کند.
 */
export function useStoreSettings(): StorefrontSettings {
  const [settings, setSettings] = useState<StorefrontSettings>(() =>
    readCachedStoreSettings(),
  );

  useEffect(() => {
    let active = true;

    const unsubscribe = subscribeStoreSettings((next) => {
      if (active) setSettings(next);
    });

    void fetchStoreSettings().then((next) => {
      if (active) setSettings(next);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return settings;
}
