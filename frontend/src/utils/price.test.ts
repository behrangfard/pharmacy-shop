import { describe, expect, it } from "vitest";
import { calculateProductPrice, calculateVatAmount } from "./price";

/**
 * محاسبهٔ قیمت کارت محصول و مبلغ ارزش افزودهٔ نمایشی روی همان کارت.
 *
 * عدد ارزش افزوده باید با فرمول چک‌اوت (`round(مبلغ * درصد / 100)`) یکی باشد
 * تا مشتری روی کارت و در پرداخت عدد یکسان ببیند.
 */
describe("product price helpers", () => {
  it("applies the discount percentage to the original price", () => {
    const price = calculateProductPrice(200000, 25);

    expect(price.discountAmount).toBe(50000);
    expect(price.finalPrice).toBe(150000);
    expect(price.hasDiscount).toBe(true);
  });

  it("reports no discount for zero or invalid percentages", () => {
    expect(calculateProductPrice(150000, 0).hasDiscount).toBe(false);
    expect(calculateProductPrice(150000, 140).finalPrice).toBe(0);
  });

  it("rounds the VAT amount the same way as checkout", () => {
    expect(calculateVatAmount(150000, 9)).toBe(13500);
    expect(calculateVatAmount(12345, 10)).toBe(1235);
  });

  it("returns zero VAT when the rate is disabled or out of range", () => {
    expect(calculateVatAmount(150000, 0)).toBe(0);
    expect(calculateVatAmount(150000, -5)).toBe(0);
    expect(calculateVatAmount(0, 10)).toBe(0);
    expect(calculateVatAmount(150000, 250)).toBe(150000);
  });
});
