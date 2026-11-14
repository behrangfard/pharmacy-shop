/**
 * باز کردن پنجرهٔ چت پشتیبانی از هر جای سایت.
 *
 * `SupportWidget` همیشه در `Layout` رندر می‌شود؛ بنابراین به‌جای prop-drilling
 * (که فوتر را به وضعیت ویجت گره می‌زند) یک رویداد سراسری روی `window` فرستاده
 * می‌شود و خود ویجت آن را می‌شنود. هر عنصری — مثل ردیف «پشتیبانی» در فوتر که
 * از پنل قابل ویرایش است — با `requestSupportChat()` می‌تواند چت را باز کند.
 */
export const SUPPORT_CHAT_OPEN_EVENT = "behrang:open-support-chat";

/** درخواست باز شدن پنجرهٔ چت پشتیبانی. */
export function requestSupportChat(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(SUPPORT_CHAT_OPEN_EVENT));
}
