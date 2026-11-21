import { useEffect, useRef } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * دیالوگ تأیید مشترک پنل (جای `window.confirm`).
 *
 * چرا: `window.confirm` در پنل، ظاهر سیستم‌عامل را وسط UI می‌آورد، در RTL
 * درست چیده نمی‌شود و روی موبایل متن دکمه‌ها را کوتاه می‌کند. این دیالوگ با
 * کلاس‌های خود پنل رندر می‌شود، با Esc بسته می‌شود و فوکوس را روی دکمهٔ تأیید
 * می‌گذارد.
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "تأیید",
  cancelLabel = "انصراف",
  tone = "default",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    confirmRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          id="confirm-dialog-title"
          className="text-base font-extrabold text-slate-800"
        >
          {title}
        </h2>

        {description && (
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            className="admin-btn"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel}
          </button>

          <button
            ref={confirmRef}
            type="button"
            className={`admin-btn ${
              tone === "danger" ? "admin-btn-danger" : "admin-btn-primary"
            }`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
