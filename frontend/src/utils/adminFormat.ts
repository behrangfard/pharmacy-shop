/**
 * پیام خطای خوانا از پاسخ خطای API (اعتبارسنجی لاراول یا پیام سرور).
 */
export function getAdminErrorMessage(
  error: unknown,
  fallback = "عملیات انجام نشد. لطفاً دوباره تلاش کنید.",
): string {
  if (!error || typeof error !== "object") {
    return fallback;
  }

  const response = (
    error as {
      response?: {
        data?: {
          message?: string;
          errors?: Record<string, string[] | string>;
        };
      };
      message?: string;
    }
  ).response?.data;

  if (response?.errors) {
    const validationMessages = Object.values(response.errors)
      .flatMap((messages) => (Array.isArray(messages) ? messages : [messages]))
      .filter((message): message is string => typeof message === "string");

    if (validationMessages.length > 0) {
      return validationMessages[0];
    }
  }

  if (response?.message) {
    return response.message;
  }

  return (error as { message?: string }).message || fallback;
}

/** تبدیل تاریخ میلادی ISO به رشتهٔ قابل نمایش در ورودی datetime-local */
export function toDateTimeInput(value: string | null | undefined): string {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 16);
  }

  const pad = (part: number) => String(part).padStart(2, "0");

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

export const formatAdminNumber = (value: number | string | undefined) =>
  new Intl.NumberFormat("fa-IR").format(Number(value) || 0);

export const formatAdminPrice = (value: number | string | undefined) =>
  `${formatAdminNumber(value)} تومان`;

export const formatAdminDate = (
  value: string | null | undefined,
  withTime = false,
) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
};
