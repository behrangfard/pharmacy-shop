import { useEffect, useState } from "react";

import { fetchStories, getCachedStories, type Story } from "../services/stories";

/**
 * استوری‌های صفحهٔ اول را فوراً از کش نمایش می‌دهد و در پس‌زمینه تازه می‌کند.
 */
export function useStories(): Story[] {
  const [stories, setStories] = useState<Story[]>(() => getCachedStories());

  useEffect(() => {
    let active = true;

    void fetchStories().then((next) => {
      if (active) setStories(next);
    });

    return () => {
      active = false;
    };
  }, []);

  return stories;
}
