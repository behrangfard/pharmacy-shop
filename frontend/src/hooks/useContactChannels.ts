import { useEffect, useState } from "react";

import {
  fetchContactChannels,
  getCachedContactChannels,
  type ContactChannel,
} from "../services/contactChannels";

/**
 * کانال‌های ارتباطی فروشگاه را فوراً از کش نمایش می‌دهد و در پس‌زمینه تازه
 * می‌کند (همان الگوی useTrustBadges و useStoreSettings).
 */
export function useContactChannels(): ContactChannel[] {
  const [channels, setChannels] = useState<ContactChannel[]>(() =>
    getCachedContactChannels(),
  );

  useEffect(() => {
    let active = true;

    void fetchContactChannels().then((next) => {
      if (active) setChannels(next);
    });

    return () => {
      active = false;
    };
  }, []);

  return channels;
}
