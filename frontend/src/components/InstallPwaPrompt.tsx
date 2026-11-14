import { useEffect, useRef, useState } from "react";
import { Download, X } from "lucide-react";

import { STORAGE_KEYS } from "../utils/storageKeys";

/**
 * پیشنهاد نصب اپلیکیشن (PWA).
 *
 * مرورگر رویداد `beforeinstallprompt` را فقط وقتی می‌فرستد که سایت شرایط
 * نصب را داشته باشد (manifest + سرویس‌ورکر + HTTPS). تا کاربر خودش نخواهد،
 * پنجرهٔ نصب باز نمی‌شود؛ این کارت فقط دکمهٔ نصب را نشان می‌دهد.
 *
 * اگر کاربر یک‌بار ببندد، تا ۱۴ روز دوباره نمایش داده نمی‌شود.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISS_DAYS = 14;
const DISMISS_TTL = DISMISS_DAYS * 24 * 60 * 60 * 1000;
const APPEAR_DELAY_MS = 4000;

function isStandalone(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const navigatorWithStandalone = window.navigator as Navigator & {
    standalone?: boolean;
  };

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  );
}

function readDismissedAt(): number {
  try {
    return Number(window.localStorage.getItem(STORAGE_KEYS.pwaInstallDismissed)) || 0;
  } catch {
    return 0;
  }
}

function InstallPwaPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);
  const appearTimer = useRef<number | null>(null);

  useEffect(() => {
    if (isStandalone()) {
      return;
    }

    const dismissedAt = readDismissedAt();

    if (dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_TTL) {
      return;
    }

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();

      setDeferred(event as BeforeInstallPromptEvent);

      if (appearTimer.current !== null) {
        window.clearTimeout(appearTimer.current);
      }

      // کمی صبر تا کاربر اول محتوای صفحه را ببیند.
      appearTimer.current = window.setTimeout(
        () => setVisible(true),
        APPEAR_DELAY_MS,
      );
    };

    const handleInstalled = () => {
      setVisible(false);
      setDeferred(null);

      try {
        window.localStorage.removeItem(STORAGE_KEYS.pwaInstallDismissed);
      } catch {
        /* ذخیره‌سازی در دسترس نیست؛ مهم نیست. */
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);

      if (appearTimer.current !== null) {
        window.clearTimeout(appearTimer.current);
        appearTimer.current = null;
      }
    };
  }, []);

  const dismiss = () => {
    setVisible(false);

    try {
      window.localStorage.setItem(
        STORAGE_KEYS.pwaInstallDismissed,
        String(Date.now()),
      );
    } catch {
      /* ذخیره‌سازی در دسترس نیست؛ پیشنهاد در بازدید بعد دوباره می‌آید. */
    }
  };

  const install = async () => {
    if (!deferred || installing) {
      return;
    }

    setInstalling(true);

    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;

      setDeferred(null);
      setVisible(false);

      if (choice.outcome === "dismissed") {
        dismiss();
      }
    } catch (error) {
      console.error("PWA install prompt error:", error);
    } finally {
      setInstalling(false);
    }
  };

  if (!visible || !deferred) {
    return null;
  }

  return (
    <aside
      className="pwa-install"
      role="region"
      aria-label="نصب اپلیکیشن بهرنگ شاپ"
    >
      <img
        src="/icons/icon-192.png"
        alt=""
        width={44}
        height={44}
        className="pwa-install-icon"
      />

      <div className="pwa-install-text">
        <strong>بهرنگ شاپ را نصب کنید</strong>
        <span>دسترسی یک‌کلیکی، حتی وقتی اینترنت قطع است.</span>
      </div>

      <button
        type="button"
        className="pwa-install-action"
        onClick={install}
        disabled={installing}
      >
        <Download size={15} />
        {installing ? "در حال نصب…" : "نصب"}
      </button>

      <button
        type="button"
        className="pwa-install-close"
        onClick={dismiss}
        aria-label="بستن پیشنهاد نصب"
      >
        <X size={15} />
      </button>
    </aside>
  );
}

export default InstallPwaPrompt;
