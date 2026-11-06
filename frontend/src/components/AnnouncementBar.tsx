import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";

import {
  DEFAULT_ANNOUNCEMENT_BAR,
  fetchAnnouncementBar,
  getCachedAnnouncementBar,
  type AnnouncementBarConfig,
  type AnnouncementBarItem,
} from "../services/announcementBar";
import { isExternalBannerLink } from "../utils/banners";
import { getStorageUrl } from "../utils/images";

/**
 * نوار باریک اطلاع‌رسانی بالای هدر.
 *
 * - تمام عرض صفحه است و ارتفاعش از پنل مدیران تنظیم می‌شود (دسکتاپ/موبایل
 *   جداگانه). ارتفاع با متغیرهای CSS اعمال می‌شود تا در هر نما مقدار خودش را
 *   داشته باشد.
 * - رفتارش مثل هدر است: در Layout داخل همان wrapper چسبان (sticky) قرار
 *   می‌گیرد تا هنگام اسکرول ناپدید نشود.
 * - هر آیتم می‌تواند متن، تصویر (شامل GIF/WebP متحرک) یا ویدیوی کوتاه باشد؛
 *   چند آیتم با فاصلهٔ زمانی تنظیم‌شده جابه‌جا می‌شوند.
 *
 * اگر نوار در پنل غیرفعال باشد یا هیچ آیتم قابل نمایشی نداشته باشد، هیچ
 * عنصری رندر نمی‌شود (بدون نوار پیش‌فرض یا محتوای ثابت).
 */
function barStyle(config: AnnouncementBarConfig): CSSProperties {
  return {
    "--ab-height": `${config.height}px`,
    "--ab-height-mobile": `${config.mobileHeight}px`,
    backgroundColor: config.backgroundColor,
    color: config.textColor,
    fontSize: `${config.fontSize}px`,
  } as CSSProperties;
}

function mediaSource(item: AnnouncementBarItem): string | null {
  return item.image ? getStorageUrl(item.image) : null;
}

function AnnouncementBar() {
  const [config, setConfig] = useState<AnnouncementBarConfig>(
    () => getCachedAnnouncementBar() ?? DEFAULT_ANNOUNCEMENT_BAR,
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [brokenId, setBrokenId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchAnnouncementBar()
      .then((data) => {
        if (!cancelled) {
          setConfig(data);
        }
      })
      .catch(() => {
        // در خطای شبکه، آخرین مقدار کش‌شده نمایش داده می‌شود.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /** فقط آیتم‌هایی که محتوای قابل نمایش دارند. */
  const items = useMemo(
    () =>
      config.items.filter((item) =>
        item.type === "text" ? Boolean(item.text) : Boolean(item.image),
      ),
    [config.items],
  );

  const count = items.length;

  useEffect(() => {
    setActiveIndex(0);
    setBrokenId(null);
  }, [count]);

  useEffect(() => {
    if (count < 2 || paused) {
      return;
    }

    const timer = window.setInterval(
      () => setActiveIndex((index) => (index + 1) % count),
      Math.max(config.interval, 2) * 1000,
    );

    return () => window.clearInterval(timer);
  }, [count, config.interval, paused]);

  if (!config.enabled || count === 0) {
    return null;
  }

  const index = activeIndex % count;
  const active = items[index];
  const source = active.type === "text" ? null : mediaSource(active);
  const label = active.text?.trim() || "نوار اطلاع‌رسانی فروشگاه";

  let content: ReactNode = null;

  if (active.type === "text") {
    content = <span className="announcement-bar-text">{active.text}</span>;
  } else if (source && brokenId !== active.id) {
    content =
      active.type === "video" ? (
        <video
          className="announcement-bar-media"
          src={source}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          aria-label={label}
          onError={() => setBrokenId(active.id)}
        />
      ) : (
        <img
          className="announcement-bar-media"
          src={source}
          alt={label}
          loading="lazy"
          onError={() => setBrokenId(active.id)}
        />
      );
  } else if (active.text) {
    // فایل بارگذاری نشد؛ به‌جای آیکن شکسته، متن جایگزین نمایش داده می‌شود.
    content = <span className="announcement-bar-text">{active.text}</span>;
  }

  const target = active.link?.trim() ?? "";

  const linked =
    content === null || target === "" ? (
      content
    ) : isExternalBannerLink(target) ? (
      <a
        className="announcement-bar-link"
        href={target}
        target={active.open_in_new_tab ? "_blank" : undefined}
        rel={active.open_in_new_tab ? "noopener noreferrer" : undefined}
      >
        {content}
      </a>
    ) : (
      <Link
        className="announcement-bar-link"
        to={target}
        target={active.open_in_new_tab ? "_blank" : undefined}
        rel={active.open_in_new_tab ? "noopener noreferrer" : undefined}
      >
        {content}
      </Link>
    );

  return (
    <div
      className="announcement-bar"
      style={barStyle(config)}
      dir="rtl"
      role="region"
      aria-label="نوار اطلاع‌رسانی فروشگاه"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="announcement-bar-inner">
        <div
          key={`${active.id}-${index}`}
          className="announcement-bar-slide"
          data-animation={config.animation}
        >
          {linked}
        </div>

        {count > 1 && (
          <div className="announcement-bar-dots">
            {items.map((item, itemIndex) => (
              <button
                key={item.id}
                type="button"
                className={`announcement-bar-dot${
                  itemIndex === index ? " is-active" : ""
                }`}
                aria-label={`نمایش اطلاع‌رسانی ${itemIndex + 1} از ${count}`}
                aria-current={itemIndex === index}
                onClick={() => setActiveIndex(itemIndex)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AnnouncementBar;
