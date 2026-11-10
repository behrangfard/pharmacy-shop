import { useState } from "react";
import { Check, Palette, X } from "lucide-react";

import {
  DEFAULT_THEME,
  STOREFRONT_THEMES,
  currentTheme,
  setTheme,
  type StorefrontTheme,
} from "../utils/theme";

/**
 * سوییچ پیش‌نمایش تم فروشگاه.
 *
 * برای مقایسهٔ پالت فعلی (سبز مریم‌گلی) با پالت جدید «اقیانوس» است و در
 * محیط توسعه همیشه دیده می‌شود؛ در نسخهٔ ساخته‌شده فقط وقتی نمایش داده
 * می‌شود که تمی غیر از پیش‌فرض فعال باشد (مثلاً با آدرس ?theme=ocean).
 *
 * انتخاب کاربر در localStorage ذخیره می‌شود و تا تغییر بعدی می‌ماند.
 */
function ThemeSwitcher() {
  const [theme, setThemeState] = useState<StorefrontTheme>(() => currentTheme());
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

  const activeOption =
    STOREFRONT_THEMES.find((option) => option.value === theme) ??
    STOREFRONT_THEMES[0];

  // در نسخهٔ ساخته‌شده ابزار مزاحم نمایش داده نمی‌شود.
  const shouldRender = !hidden && (import.meta.env.DEV || theme !== DEFAULT_THEME);

  if (!shouldRender) {
    return null;
  }

  const choose = (value: StorefrontTheme) => {
    setTheme(value);
    setThemeState(value);
  };

  return (
    <div className="theme-switcher" dir="rtl">
      {open && (
        <div className="theme-switcher-panel" role="group" aria-label="انتخاب تم فروشگاه">
          <div className="theme-switcher-head">
            <span className="theme-switcher-title">پیش‌نمایش تم</span>

            <button
              type="button"
              className="theme-switcher-close"
              onClick={() => setOpen(false)}
              aria-label="بستن انتخاب تم"
            >
              <X size={13} />
            </button>
          </div>

          <p className="theme-switcher-note">
            فقط برای مقایسهٔ رنگ‌ها؛ تم انتخابی در همین مرورگر ذخیره می‌شود.
          </p>

          {STOREFRONT_THEMES.map((option) => {
            const selected = option.value === theme;

            return (
              <button
                key={option.value}
                type="button"
                className="theme-switcher-option"
                aria-pressed={selected}
                onClick={() => choose(option.value)}
              >
                <span className="theme-switcher-swatches" aria-hidden="true">
                  {option.swatches.map((color) => (
                    <span
                      key={color}
                      className="theme-switcher-swatch"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </span>

                <span className="theme-switcher-option-text">
                  <span className="theme-switcher-option-name">{option.label}</span>
                  <span className="theme-switcher-option-hint">{option.hint}</span>
                </span>

                {selected && <Check size={14} className="theme-switcher-check" />}
              </button>
            );
          })}

          <button
            type="button"
            className="theme-switcher-hide"
            onClick={() => {
              setOpen(false);
              setHidden(true);
            }}
          >
            پنهان‌کردن این ابزار
          </button>
        </div>
      )}

      <button
        type="button"
        className="theme-switcher-toggle"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={`تم فعلی: ${activeOption.label}`}
        title={`تم فعلی: ${activeOption.label}`}
      >
        <Palette size={14} aria-hidden="true" />

        <span>{activeOption.label}</span>

        <span className="theme-switcher-swatches" aria-hidden="true">
          {activeOption.swatches.map((color) => (
            <span
              key={color}
              className="theme-switcher-swatch"
              style={{ backgroundColor: color }}
            />
          ))}
        </span>

        {open ? (
          <X size={13} aria-hidden="true" />
        ) : null}
      </button>
    </div>
  );
}

export default ThemeSwitcher;
