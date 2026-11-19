export function calculateProductPrice(
  price: string | number,
  discountPercent?: string | number,
) {
  const originalPrice = Number(price);

  const discount = Math.min(Math.max(Number(discountPercent ?? 0), 0), 100);

  const discountAmount =
    discount > 0 ? Math.round((originalPrice * discount) / 100) : 0;

  const finalPrice = originalPrice - discountAmount;

  const hasDiscount = discount > 0 && discountAmount > 0;

  return {
    originalPrice,
    discountPercent: discount,
    discountAmount,
    finalPrice,
    hasDiscount,
  };
}

/**
 * مبلغ ارزش افزودهٔ یک کالا برای نمایش روی کارت محصول.
 *
 * همان فرمولی است که چک‌اوت و `OrderController` استفاده می‌کنند
 * (`round(مبلغ * درصد / 100)`)، بنابراین عدد روی کارت با مبلغ نهایی سفارش
 * یکی است. مبلغ معتبر و درصد بین ۰ تا ۱۰۰ پذیرفته می‌شود؛ در غیر این صورت ۰.
 */
export function calculateVatAmount(
  amount: string | number,
  vatPercent?: string | number,
): number {
  const price = Number(amount);
  const percent = Math.min(Math.max(Number(vatPercent ?? 0), 0), 100);

  if (!Number.isFinite(price) || price <= 0 || percent <= 0) {
    return 0;
  }

  return Math.round((price * percent) / 100);
}

