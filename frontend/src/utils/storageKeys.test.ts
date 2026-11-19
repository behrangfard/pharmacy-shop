import { describe, expect, it } from "vitest";
import { migrateLegacyStorage, STORAGE_KEYS } from "./storageKeys";

/**
 * مهاجرت کلیدهای قدیمی (`pharmacy-shop-*`) نباید سبد خرید یا توکن کاربر را
 * از دست بدهد؛ و اگر کلید جدید از قبل مقدار دارد، نباید بازنویسی شود.
 */
describe("migrateLegacyStorage", () => {
  it("moves a legacy value to the new key and removes the legacy key", () => {
    window.localStorage.setItem("pharmacy-shop-cart", '[{"id":1}]');

    migrateLegacyStorage();

    expect(window.localStorage.getItem(STORAGE_KEYS.cart)).toBe('[{"id":1}]');
    expect(window.localStorage.getItem("pharmacy-shop-cart")).toBeNull();
  });

  it("keeps the new key value when both exist", () => {
    window.localStorage.setItem("pharmacy-shop-token", "old-token");
    window.localStorage.setItem(STORAGE_KEYS.token, "new-token");

    migrateLegacyStorage();

    expect(window.localStorage.getItem(STORAGE_KEYS.token)).toBe("new-token");
    expect(window.localStorage.getItem("pharmacy-shop-token")).toBeNull();
  });

  it("creates nothing when there is no legacy value", () => {
    migrateLegacyStorage();

    expect(window.localStorage.getItem(STORAGE_KEYS.user)).toBeNull();
    expect(window.localStorage.length).toBe(0);
  });

  it("uses the behrang-shop- prefix for every key", () => {
    Object.values(STORAGE_KEYS).forEach((key) => {
      expect(key.startsWith("behrang-shop-")).toBe(true);
    });
  });
});
