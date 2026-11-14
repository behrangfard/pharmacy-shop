import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import StoryViewer from "./StoryViewer";
import { useStories } from "../hooks/useStories";
import { readSeenStoryIds } from "../services/stories";
import { getStorageUrl } from "../utils/images";

/**
 * نوار استوری‌های صفحهٔ اول (دایره‌های گرد بالای دسته‌بندی‌ها).
 *
 * مانند استوری اینستاگرام: دایره با حلقهٔ رنگی و عنوان زیر آن؛ با کلیک،
 * اسلایدها در نمایشگر تمام‌صفحه مرور می‌شوند. استوری‌های دیده‌شده در ۲۴ ساعت
 * حلقهٔ خاکستری دارند. اگر مدیری استوری فعالی ثبت نکرده باشد، این بخش اصلاً
 * رندر نمی‌شود تا جای خالی روی صفحه نیفتد.
 */
function StoryStrip() {
  const stories = useStories();
  const [seenIds, setSeenIds] = useState<number[]>(() => readSeenStoryIds());
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [canScrollStart, setCanScrollStart] = useState(false);
  const [canScrollEnd, setCanScrollEnd] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const syncArrows = useCallback(() => {
    const element = scrollRef.current;

    if (!element) {
      return;
    }

    const maxScroll = element.scrollWidth - element.clientWidth;

    setCanScrollStart(element.scrollLeft > 4);
    setCanScrollEnd(maxScroll > 4 && element.scrollLeft < maxScroll - 4);
  }, []);

  useEffect(() => {
    syncArrows();

    const element = scrollRef.current;

    if (!element || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(syncArrows);

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [stories, syncArrows]);

  const scrollBy = (direction: -1 | 1) => {
    const element = scrollRef.current;

    if (!element) {
      return;
    }

    element.scrollBy({ left: direction * 260, behavior: "smooth" });
  };

  if (stories.length === 0) {
    return null;
  }

  return (
    <section
      className="border-b border-line bg-white"
      aria-label="استوری‌های فروشگاه"
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="relative">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            className={`absolute -right-2 top-8 z-10 hidden h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-brand-600 shadow-md transition hover:border-brand-300 hover:text-brand-700 sm:flex ${
              canScrollStart ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            aria-label="استوری‌های قبلی"
          >
            <ChevronRight size={17} />
          </button>

          <button
            type="button"
            onClick={() => scrollBy(1)}
            className={`absolute -left-2 top-8 z-10 hidden h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-brand-600 shadow-md transition hover:border-brand-300 hover:text-brand-700 sm:flex ${
              canScrollEnd ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            aria-label="استوری‌های بعدی"
          >
            <ChevronLeft size={17} />
          </button>

          <div
            ref={scrollRef}
            onScroll={syncArrows}
            className="flex gap-4 overflow-x-auto scroll-smooth px-1 pb-1 pt-0.5 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {stories.map((story, index) => {
              const seen = seenIds.includes(story.id);
              const image = getStorageUrl(story.cover_image);

              return (
                <button
                  key={story.id}
                  type="button"
                  onClick={() => setOpenIndex(index)}
                  className="group flex w-[72px] shrink-0 snap-start flex-col items-center gap-2 focus-visible:outline-none sm:w-[80px]"
                  aria-label={`نمایش استوری ${story.title || ""}`}
                >
                  <span
                    className={`rounded-full p-[3px] bg-gradient-to-tr transition duration-200 group-hover:scale-105 group-active:scale-95 ${
                      seen
                        ? "from-line to-line"
                        : "from-blush-400 via-plum-400 to-brand-500"
                    }`}
                  >
                    <span className="block rounded-full bg-white p-[2px]">
                      {image ? (
                        <img
                          src={image}
                          alt={story.title || "استوری"}
                          className="h-[62px] w-[62px] rounded-full object-cover sm:h-[70px] sm:w-[70px]"
                          loading="lazy"
                        />
                      ) : (
                        <span className="block h-[62px] w-[62px] rounded-full bg-cream sm:h-[70px] sm:w-[70px]" />
                      )}
                    </span>
                  </span>

                  <span className="max-w-[72px] truncate text-center text-xs font-bold text-ink sm:max-w-[80px]">
                    {story.title || "استوری"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {openIndex !== null && (
        <StoryViewer
          stories={stories}
          startIndex={openIndex}
          onClose={() => {
            setOpenIndex(null);
            setSeenIds(readSeenStoryIds());
          }}
        />
      )}
    </section>
  );
}

export default StoryStrip;
