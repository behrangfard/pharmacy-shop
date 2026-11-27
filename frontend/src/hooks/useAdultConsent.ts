import { useCallback, useEffect, useState } from "react";

import {
  ADULT_CONSENT_EVENT,
  grantAdultConsent,
  hasAdultConsent,
  revokeAdultConsent,
} from "../utils/adultGate";
import { STORAGE_KEYS } from "../utils/storageKeys";

/**
 * وضعیت تأیید سن (۱۸+) با همگام‌سازی زنده.
 *
 * صفحهٔ ویژهٔ بزرگسالان و صفحهٔ محصول ۱۸+ هر دو از همین هوک استفاده می‌کنند؛
 * تأیید در یکی، دیگری را هم بدون رفرش باز می‌کند و «خروج از بخش ویژه» همان
 * لحظه دروازه را برمی‌گرداند.
 */
export function useAdultConsent() {
  const [confirmed, setConfirmed] = useState(hasAdultConsent);

  useEffect(() => {
    const sync = () => setConfirmed(hasAdultConsent());

    const handleStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === STORAGE_KEYS.adultConsent) {
        sync();
      }
    };

    // مقدار اولیه ممکن است پیش از ثبت اثر (hydration) تغییر کرده باشد.
    sync();

    window.addEventListener(ADULT_CONSENT_EVENT, sync);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(ADULT_CONSENT_EVENT, sync);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const confirm = useCallback(() => {
    grantAdultConsent();
    setConfirmed(true);
  }, []);

  const revoke = useCallback(() => {
    revokeAdultConsent();
    setConfirmed(false);
  }, []);

  return { confirmed, confirm, revoke };
}

export default useAdultConsent;
