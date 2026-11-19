import { describe, expect, it } from "vitest";
import { toEnglishDigits, toPersianDigits } from "./jalali";

/**
 * ورودی فرم‌ها ممکن است با صفحه‌کلید فارسی پر شود؛ تبدیل ارقام پایهٔ
 * اعتبارسنجی شماره تماس، کد پستی و کد پیگیری مهمان است.
 */
describe("jalali digit helpers", () => {
  it("converts Persian digits to Latin", () => {
    expect(toEnglishDigits("۰۹۱۲۳۴۵۶۷۸۹")).toBe("09123456789");
  });

  it("converts Arabic-Indic digits to Latin", () => {
    expect(toEnglishDigits("٠١٢٣")).toBe("0123");
  });

  it("converts Latin digits to Persian", () => {
    expect(toPersianDigits(1234)).toBe("۱۲۳۴");
  });

  it("leaves non-digit characters untouched", () => {
    expect(toEnglishDigits("ORD-12")).toBe("ORD-12");
  });
});
