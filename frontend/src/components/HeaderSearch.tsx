import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, History, Loader2, Search, X } from "lucide-react";

import api from "../services/api";
import {
  clearSearchHistory,
  forgetSearch,
  readSearchHistory,
  rememberSearch,
  SEARCH_HISTORY_EVENT,
} from "../services/searchHistory";
import type { WishlistProduct } from "../services/wishlist";
import { getStorageUrl } from "../utils/images";
import { calculateProductPrice } from "../utils/price";

/**
 * جست‌وجوی لحظه‌ای هدر.
 *
 * با هر تغییر متن (پس از ۲۵۰ میلی‌ثانیه توقف) نتایج از سرور گرفته و در یک
 * لیست کشویی نمایش داده می‌شوند؛ بنابراین مشتری بدون رفتن به صفحهٔ محصولات
 * محصول را می‌بیند. عبارت‌های جستوجوی قبلی هم در حالت خالی پیشنهاد می‌شوند.
 *
 * ناوبری با کیبورد (بالا/پایین/Enter/Escape) و صفت‌های ARIA combobox پشتیبانی
 * می‌شود.
 */

/** حداکثر پیشنهاد نمایش‌داده‌شده در کشوی جست‌وجو. */
const SUGGESTION_LIMIT = 6;

/** کمتر از این تعداد نویسه، جست‌وجو ارسال نمی‌شود. */
const MIN_QUERY_LENGTH = 2;

/** زمان توقف تایپ پیش از ارسال درخواست. */
const DEBOUNCE_MS = 250;

/** تصویر کوچک نتیجه؛ اول تصویر اصلی و بعد thumbnail. */
function hitImageUrl(hit: WishlistProduct): string | null {
  const primary =
    hit.images?.find((image) => image.is_primary && image.path) ??
    hit.images?.find((image) => Boolean(image.path));

  if (primary?.path) {
    return getStorageUrl(primary.path);
  }

  return hit.thumbnail ? getStorageUrl(hit.thumbnail) : null;
}

interface Props {
  className?: string;
  /** متن راهنمای کادر؛ در صفحهٔ ۴۰۴ می‌تواند متفاوت باشد. */
  placeholder?: string;
  /** پس از انتخاب آدرس، فوکوس از کادر برداشته شود. */
  onNavigate?: () => void;
}

function HeaderSearch({
  className = "",
  placeholder = "جست‌وجوی محصول، برند یا دسته‌بندی...",
  onNavigate,
}: Props) {
  const navigate = useNavigate();
  const location = useLocation();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<WishlistProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<string[]>(readSearchHistory);
  const [activeIndex, setActiveIndex] = useState(-1);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  /** شناسهٔ آخرین درخواست؛ پاسخ‌های قدیمی نادیده گرفته می‌شوند. */
  const requestId = useRef(0);

  const trimmedQuery = query.trim();
  const showHistory = trimmedQuery.length < MIN_QUERY_LENGTH;
  const options = showHistory ? history : hits;
  const optionsCount = options.length;

  // تاریخچه در همهٔ نمونه‌های کادر جست‌وجو (دسکتاپ/موبایل) همگام می‌ماند.
  useEffect(() => {
    const sync = () => setHistory(readSearchHistory());

    window.addEventListener(SEARCH_HISTORY_EVENT, sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(SEARCH_HISTORY_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // دریافت نتایج با تعویق؛ درخواست‌های قبلی با شمارنده بی‌اثر می‌شوند.
  useEffect(() => {
    const term = trimmedQuery;

    if (term.length < MIN_QUERY_LENGTH) {
      requestId.current += 1;
      setHits([]);
      setTotal(0);
      setLoading(false);
      setError("");
      return;
    }

    const id = (requestId.current += 1);
    setLoading(true);
    setError("");

    const timer = window.setTimeout(() => {
      api
        .get("/products", {
          params: { search: term, per_page: SUGGESTION_LIMIT },
        })
        .then((response) => {
          if (id !== requestId.current) {
            return;
          }

          const payload = response.data?.data;
          const list = Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload)
              ? payload
              : [];

          setHits(list as WishlistProduct[]);
          setTotal(Number(payload?.total ?? list.length) || list.length);
          setActiveIndex(-1);
        })
        .catch((requestError) => {
          if (id !== requestId.current) {
            return;
          }

          console.error("Instant search error:", requestError);
          setHits([]);
          setTotal(0);
          setError("جست‌وجو انجام نشد؛ اتصال اینترنت را بررسی کنید.");
        })
        .finally(() => {
          if (id === requestId.current) {
            setLoading(false);
          }
        });
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [trimmedQuery]);

  // بستن کشو با کلیک بیرون از کادر جست‌وجو.
  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  // با تغییر مسیر (کلیک روی نتیجه/منو) کشو بسته می‌شود.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);

  const goToResults = useCallback(
    (term: string) => {
      const value = term.trim();

      setOpen(false);
      setQuery(value);
      inputRef.current?.blur();
      onNavigate?.();

      if (value === "") {
        navigate("/products");
        return;
      }

      rememberSearch(value);
      setHistory(readSearchHistory());
      navigate(`/products?search=${encodeURIComponent(value)}`);
    },
    [navigate, onNavigate],
  );

  const openHit = useCallback(
    (hit: WishlistProduct) => {
      if (trimmedQuery.length >= MIN_QUERY_LENGTH) {
        rememberSearch(trimmedQuery);
      }

      setOpen(false);
      inputRef.current?.blur();
      onNavigate?.();
      navigate(`/product/${hit.slug}`);
    },
    [navigate, onNavigate, trimmedQuery],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    goToResults(query);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      if (!open) {
        setOpen(true);
      }

      setActiveIndex((current) => Math.min(current + 1, optionsCount - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, -1));
      return;
    }

    if (
      event.key === "Enter" &&
      open &&
      activeIndex >= 0 &&
      activeIndex < optionsCount
    ) {
      event.preventDefault();

      if (showHistory) {
        goToResults(history[activeIndex]);
      } else {
        const hit = hits[activeIndex];

        if (hit) {
          openHit(hit);
        }
      }
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className={`relative ${className}`}
    >
      <div className="relative" ref={wrapperRef}>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="جست‌وجوی محصولات"
          role="combobox"
          aria-expanded={open}
          aria-controls="header-search-suggestions"
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `header-search-option-${activeIndex}` : undefined
          }
          autoComplete="off"
          className="
            w-full rounded-2xl border border-line-soft
            bg-cream py-3 pl-10 pr-12
            text-sm text-ink
            outline-none transition-all
            placeholder:text-muted-soft
            focus:border-brand-400
            focus:bg-white
            focus:ring-4 focus:ring-brand-500/10
            [&::-webkit-search-cancel-button]:hidden
          "
        />

        <button
          type="submit"
          aria-label="جست‌وجو"
          className="absolute right-0 top-0 flex h-full w-12 items-center justify-center text-brand-500 transition-colors hover:text-brand-600"
        >
          <Search size={21} />
        </button>

        {query !== "" && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setActiveIndex(-1);
              inputRef.current?.focus();
            }}
            aria-label="پاک کردن جست‌وجو"
            className="absolute left-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-soft transition hover:bg-cream-deep hover:text-ink-soft"
          >
            <X size={15} />
          </button>
        )}

        {open && (
          <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-[70] overflow-hidden rounded-2xl border border-line bg-white shadow-[0_20px_50px_rgba(40,59,45,0.16)]">
            <div className="flex items-center justify-between gap-2 border-b border-line bg-cream/60 px-3 py-2 text-[11px] text-muted">
              <span className="inline-flex items-center gap-1.5 font-bold">
                {showHistory ? (
                  <>
                    <History size={13} />
                    جست‌وجوهای اخیر
                  </>
                ) : loading ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    در حال جست‌وجو…
                  </>
                ) : (
                  <>
                    <Search size={13} />
                    پیشنهادها
                  </>
                )}
              </span>

              {showHistory && history.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    clearSearchHistory();
                    setHistory([]);
                  }}
                  className="rounded-md px-1.5 py-0.5 font-bold text-muted-soft transition hover:bg-white hover:text-discount"
                >
                  پاک کردن
                </button>
              )}
            </div>

            <div
              id="header-search-suggestions"
              role="listbox"
              aria-label="پیشنهادهای جست‌وجو"
              className="max-h-[62vh] overflow-y-auto overscroll-contain p-1.5"
            >
              {showHistory ? (
                history.length === 0 ? (
                  <p className="px-2.5 py-4 text-center text-xs leading-6 text-muted-soft">
                    عبارت مورد نظر را بنویسید؛ پیشنهادها همین‌جا نمایش داده
                    می‌شوند.
                  </p>
                ) : (
                  history.map((term, index) => (
                    <div key={term} className="flex items-center gap-1">
                      <button
                        type="button"
                        role="option"
                        id={`header-search-option-${index}`}
                        aria-selected={index === activeIndex}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => goToResults(term)}
                        className={`flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2.5 py-2 text-right text-sm transition ${
                          index === activeIndex
                            ? "bg-brand-50 text-brand-700"
                            : "text-ink-soft hover:bg-cream"
                        }`}
                      >
                        <Clock size={15} className="shrink-0 text-muted-soft" />
                        <span className="truncate">{term}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setHistory(forgetSearch(term))}
                        aria-label={`حذف «${term}» از تاریخچه`}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-soft transition hover:bg-blush-50 hover:text-discount"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))
                )
              ) : (
                loading && hits.length === 0 ? (
                  <div className="space-y-1" aria-hidden="true">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div
                        key={index}
                        className="h-14 animate-pulse rounded-xl bg-cream"
                      />
                    ))}
                  </div>
                ) : error ? (
                  <p className="px-3 py-4 text-center text-xs leading-6 text-discount">
                    {error}
                  </p>
                ) : hits.length === 0 ? (
                  <p className="px-3 py-4 text-center text-xs leading-6 text-muted-soft">
                    نتیجه‌ای برای «{trimmedQuery}» پیدا نشد.
                  </p>
                ) : (
                  hits.map((hit, index) => {
                    const image = hitImageUrl(hit);
                    const { finalPrice, hasDiscount } =
                      calculateProductPrice(
                        hit.price,
                        hit.discount_percent ?? undefined,
                      );

                    const subtitle = [hit.brand?.name, hit.category?.name]
                      .filter(Boolean)
                      .join(" · ");

                    return (
                      <button
                        key={hit.id}
                        type="button"
                        role="option"
                        id={`header-search-option-${index}`}
                        aria-selected={index === activeIndex}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => openHit(hit)}
                        className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-right transition ${
                          index === activeIndex ? "bg-brand-50" : "hover:bg-cream"
                        }`}
                      >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-cream-deep">
                          {image ? (
                            <img
                              src={image}
                              alt=""
                              loading="lazy"
                              className="h-full w-full object-contain p-1"
                            />
                          ) : (
                            <Search size={16} className="text-muted-soft" />
                          )}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-ink">
                            {hit.name}
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] text-muted-soft">
                            {subtitle || "محصول"}
                          </span>
                        </span>

                        <span
                          className="shrink-0 text-left text-xs font-black text-brand-700"
                          dir="ltr"
                        >
                          {finalPrice.toLocaleString("fa-IR")}
                          {hasDiscount && (
                            <span className="mr-1 align-middle text-[10px] font-bold text-blush-600">
                              ٪
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })
                )

              )}

            </div>

            {!showHistory && hits.length > 0 && (
              <button
                type="submit"
                className="flex w-full items-center justify-between gap-2 border-t border-line bg-cream/60 px-3 py-2.5 text-xs font-bold text-brand-700 transition hover:bg-brand-50"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Search size={13} />
                  {total.toLocaleString("fa-IR")} نتیجه پیدا شد
                </span>

                <span className="inline-flex items-center gap-1 text-brand-600">
                  همهٔ نتایج «{trimmedQuery}»
                  <ArrowLeft size={14} />
                </span>
              </button>
            )}

          </div>
        )}
      </div>
    </form>
  );
}

export default HeaderSearch;
