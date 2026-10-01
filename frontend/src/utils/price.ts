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
