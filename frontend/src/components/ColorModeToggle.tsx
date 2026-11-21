import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

import {
  currentColorMode,
  toggleColorMode,
  type ColorMode,
} from "../utils/colorMode";

type ColorModeToggleProps = {
  /** اندازه/چیدمان دکمه؛ `icon` برای نوار آیکن‌ها و `boxed` برای دسکتاپ. */
  variant?: "icon" | "boxed";
};

/**
 * کلید روشن/تاریک سایت در هدر.
 *
 * آیکن، «کاری که با کلیک انجام می‌شود» را نشان می‌دهد: در حالت روشن ماه و در
 * حالت تاریک خورشید. انتخاب کاربر در localStorage ذخیره می‌شود و اگر ذخیره‌ای
 * نباشد، تنظیم سیستم‌عامل مبنا است (منطق در `utils/colorMode.ts`).
 *
 * با رویداد `behrang:colormode` هم‌گام می‌شود تا اگر همین حالت از تب دیگری یا
 * پارامتر آدرس عوض شد، آیکن هدر قدیمی نماند.
 */
function ColorModeToggle({ variant = "icon" }: ColorModeToggleProps) {
  const [mode, setMode] = useState<ColorMode>(() => currentColorMode());

  useEffect(() => {
    const sync = () => setMode(currentColorMode());

    window.addEventListener("behrang:colormode", sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener("behrang:colormode", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const nextLabel = mode === "dark" ? "حالت روشن" : "حالت تاریک";

  const shared = {
    type: "button" as const,
    onClick: () => {
      const next = toggleColorMode();
      setMode(next);
      window.dispatchEvent(new Event("behrang:colormode"));
    },
    "aria-pressed": mode === "dark",
    "aria-label": nextLabel,
    title: nextLabel,
  };

  if (variant === "boxed") {
    return (
      <button
        {...shared}
        className="
          relative flex h-11 w-11 items-center justify-center
          rounded-xl border border-line-soft bg-surface text-ink-soft
          transition-all hover:border-gold hover:text-gold
        "
      >
        {mode === "dark" ? <Sun size={21} /> : <Moon size={21} />}
      </button>
    );
  }

  return (
    <button
      {...shared}
      className="flex shrink-0 items-center justify-center text-ink-soft transition-colors hover:text-gold"
    >
      {mode === "dark" ? <Sun size={21} /> : <Moon size={21} />}
    </button>
  );
}

export default ColorModeToggle;
