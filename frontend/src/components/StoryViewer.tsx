import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Pause, Play, X } from "lucide-react";
import { Link } from "react-router-dom";

import { markStorySeen, type Story } from "../services/stories";
import { getStorageUrl } from "../utils/images";

/** مدت نمایش هر اسلاید (میلی‌ثانیه). */
const SLIDE_DURATION = 5000;

/** گام به‌روزرسانی نوار پیشرفت. */
const TICK = 50;

/** حداقل جابه‌جایی انگشت برای تغییر اسلاید. */
const SWIPE_THRESHOLD = 48;

function isExternalLink(link: string): boolean {
  return /^https?:\/\//i.test(link);
}

/**
 * نمایشگر تمام‌صفحهٔ استوری (مثل استوری اینستاگرام).
 *
 * هر اسلاید ۵ ثانیه نمایش داده می‌شود و نوار پیشرفت بالای صفحه پیش می‌رود.
 * با کلیک/تپ روی نیمهٔ چپ، کلید ArrowLeft یا کشیدن انگشت به سمت چپ، اسلاید بعد
 * و با نیمهٔ راست/ArrowRight اسلاید قبل می‌آید؛ پایان اسلایدهای آخر، نمایشگر
 * بسته می‌شود. دکمهٔ توقف موقت هم برای خواندن متن وجود دارد.
 */
function StoryViewer({
  stories,
  startIndex,
  onClose,
}: {
  stories: Story[];
  startIndex: number;
  onClose: () => void;
}) {
  const [storyIndex, setStoryIndex] = useState(() =>
    Math.min(Math.max(startIndex, 0), Math.max(stories.length - 1, 0)),
  );
  const [slideIndex, setSlideIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);

  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const swipeStartX = useRef<number | null>(null);

  const story = stories[storyIndex];
  const slides = useMemo(() => story?.slides ?? [], [story]);
  const slide = slides[slideIndex];

  /** بستن نمایشگر (بازگرداندن اسکرول در افکت پاک‌سازی انجام می‌شود). */
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const goNext = useCallback(() => {
    setElapsed(0);

    if (slideIndex + 1 < slides.length) {
      setSlideIndex((current) => current + 1);
      return;
    }

    if (storyIndex + 1 < stories.length) {
      setStoryIndex((current) => current + 1);
      setSlideIndex(0);
      return;
    }

    handleClose();
  }, [handleClose, slideIndex, slides.length, storyIndex, stories.length]);

  const goPrev = useCallback(() => {
    setElapsed(0);

    if (slideIndex > 0) {
      setSlideIndex((current) => current - 1);
      return;
    }

    if (storyIndex > 0) {
      const previous = stories[storyIndex - 1];

      setStoryIndex((current) => current - 1);
      setSlideIndex(Math.max((previous?.slides.length ?? 1) - 1, 0));
    }
  }, [slideIndex, storyIndex, stories]);

  /* استوری فعال به‌عنوان «دیده‌شده» علامت می‌خورد. */
  useEffect(() => {
    if (story) {
      markStorySeen(story.id);
    }
  }, [story]);

  /* شمارندهٔ اسلاید بر اساس نمایش خودکار. */
  useEffect(() => {
    if (paused || !slide) {
      return;
    }

    const timer = window.setInterval(() => {
      setElapsed((current) => current + TICK);
    }, TICK);

    return () => {
      window.clearInterval(timer);
    };
  }, [paused, slide]);

  /* پایان زمان اسلاید → اسلاید بعد. */
  useEffect(() => {
    if (elapsed >= SLIDE_DURATION) {
      goNext();
    }
  }, [elapsed, goNext]);

  /* قفل اسکرول صفحهٔ زیرین تا زمان باز بودن نمایشگر. */
  useEffect(() => {
    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    body.style.overflow = "hidden";

    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    closeButtonRef.current?.focus();

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
    };
  }, []);

  /* کلیدهای میان‌بر (در چیدمان راست‌به‌چپ، فلش چپ = بعدی). */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goNext();
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        goPrev();
        return;
      }

      if (event.key === " ") {
        event.preventDefault();
        setPaused((current) => !current);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [goNext, goPrev, handleClose]);

  /* پیش‌بارگذاری تصویر اسلاید بعدی تا نمایش بدون مکث باشد. */
  useEffect(() => {
    const nextSlide = slides[slideIndex + 1];
    const nextStory = nextSlide ? undefined : stories[storyIndex + 1];
    const candidate = nextSlide?.image ?? nextStory?.cover_image;
    const url = getStorageUrl(candidate ?? null);

    if (!url) {
      return;
    }

    const image = new Image();
    image.src = url;
  }, [slideIndex, slides, stories, storyIndex]);

  if (!story || !slide) {
    return null;
  }

  const cover = getStorageUrl(story.cover_image);
  const image = getStorageUrl(slide.image);
  const progress = Math.min((elapsed / SLIDE_DURATION) * 100, 100);

  return createPortal(
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label={`استوری ${story.title}`}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 backdrop-blur-sm sm:p-4"
    >
      <div
        className="relative flex h-full w-full max-w-[440px] flex-col overflow-hidden bg-neutral-950 text-white sm:h-[min(92vh,860px)] sm:rounded-3xl sm:shadow-2xl"
        onPointerDown={(event) => {
          swipeStartX.current = event.clientX;
        }}
        onPointerUp={(event) => {
          const start = swipeStartX.current;
          swipeStartX.current = null;

          if (start === null) {
            return;
          }

          const delta = event.clientX - start;

          if (Math.abs(delta) < SWIPE_THRESHOLD) {
            return;
          }

          // کشیدن انگشت به چپ = اسلاید بعدی (جهت راست‌به‌چپ).
          if (delta < 0) {
            goNext();
          } else {
            goPrev();
          }
        }}
      >
        {image && (
          <img
            src={image}
            alt={slide.caption ?? story.title}
            className="absolute inset-0 h-full w-full object-contain"
            draggable={false}
          />
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/80 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/85 to-transparent" />

        {/* نوارهای پیشرفت */}
        <div className="relative z-10 flex gap-1 px-3 pt-3">
          {slides.map((item, index) => (
            <span
              key={`${item.image}-${index}`}
              className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30"
            >
              <span
                className="block h-full rounded-full bg-white"
                style={{
                  width:
                    index < slideIndex
                      ? "100%"
                      : index === slideIndex
                        ? `${progress}%`
                        : "0%",
                }}
              />
            </span>
          ))}
        </div>

        {/* سربرگ */}
        <div className="relative z-10 flex items-center gap-3 px-3 pt-3">
          {cover && (
            <img
              src={cover}
              alt=""
              aria-hidden="true"
              className="h-9 w-9 shrink-0 rounded-full border border-white/50 object-cover"
            />
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{story.title}</p>
            <p className="text-[11px] text-white/70">
              {slideIndex + 1} از {slides.length}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setPaused((current) => !current)}
            className="rounded-full p-2 text-white/80 transition hover:bg-white/15 hover:text-white"
            aria-label={paused ? "ادامهٔ پخش" : "توقف موقت"}
          >
            {paused ? <Play size={17} /> : <Pause size={17} />}
          </button>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={handleClose}
            className="rounded-full p-2 text-white/80 transition hover:bg-white/15 hover:text-white"
            aria-label="بستن استوری"
          >
            <X size={19} />
          </button>
        </div>

        {/* نواحی تپ: چپ = بعدی، راست = قبلی */}
        <button
          type="button"
          onClick={goNext}
          className="absolute inset-y-16 left-0 z-10 w-1/3 cursor-pointer"
          aria-label="اسلاید بعدی"
        />
        <button
          type="button"
          onClick={goPrev}
          className="absolute inset-y-16 right-0 z-10 w-1/3 cursor-pointer"
          aria-label="اسلاید قبلی"
        />

        {/* متن و لینک اسلاید */}
        <div className="relative z-20 mt-auto px-4 pb-5 pt-10">
          {slide.caption && (
            <p className="mb-3 whitespace-pre-line break-words text-sm font-bold leading-6 drop-shadow">
              {slide.caption}
            </p>
          )}

          {slide.link &&
            (isExternalLink(slide.link) ? (
              <a
                href={slide.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-ink transition hover:bg-white/90"
              >
                مشاهده محصولات
                <span aria-hidden="true">↗</span>
              </a>
            ) : (
              <Link
                to={slide.link}
                onClick={handleClose}
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-ink transition hover:bg-white/90"
              >
                مشاهده محصولات
                <span aria-hidden="true">←</span>
              </Link>
            ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default StoryViewer;
