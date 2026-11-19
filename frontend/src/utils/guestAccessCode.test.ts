import { describe, expect, it } from "vitest";
import {
  formatGuestAccessCode,
  GUEST_ACCESS_CODE_LENGTH,
  isCompleteGuestAccessCode,
  normalizeGuestAccessCode,
} from "./guestAccessCode";

/**
 * کد پیگیری مهمان باید مثل بک‌اند نرمال شود: خط تیره/فاصله حذف، حروف بزرگ و
 * ارقام فارسی/عربی لاتین شوند؛ وگرنه مشتری کد کپی‌شده را «اشتباه» می‌بیند.
 */
describe("guestAccessCode", () => {
  it("normalizes dashes, spaces, lowercase and Persian digits", () => {
    expect(normalizeGuestAccessCode("ab cd-۲۳۴۵")).toBe("ABCD2345");
    expect(normalizeGuestAccessCode("abcd 2345")).toBe("ABCD2345");
  });

  it("normalizes Arabic-Indic digits too", () => {
    expect(normalizeGuestAccessCode("AB-٢٣٤٥")).toBe("AB2345");
  });

  it("formats the code in readable 4+4 groups", () => {
    expect(formatGuestAccessCode("abcd2345")).toBe("ABCD-2345");
    expect(formatGuestAccessCode("ABCD-2345")).toBe("ABCD-2345");
  });

  it("returns an empty string for empty input", () => {
    expect(formatGuestAccessCode("")).toBe("");
    expect(normalizeGuestAccessCode("   ")).toBe("");
  });

  it("accepts a complete code and rejects short ones", () => {
    expect(GUEST_ACCESS_CODE_LENGTH).toBe(8);
    expect(isCompleteGuestAccessCode("abcd-2345")).toBe(true);
    expect(isCompleteGuestAccessCode("ABCD234")).toBe(false);
    expect(isCompleteGuestAccessCode("")).toBe(false);
  });
});
