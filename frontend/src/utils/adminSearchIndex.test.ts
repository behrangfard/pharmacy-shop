import { describe, expect, it } from "vitest";
import { ADMIN_NAV_ITEMS } from "./adminNavItems";
import {
  buildAdminSearchEntries,
  normalizeAdminSearchText,
  searchAdminEntries,
} from "./adminSearchIndex";

const entries = buildAdminSearchEntries(ADMIN_NAV_ITEMS);

describe("adminSearchIndex", () => {
  it("متن فارسی را برای مقایسه نرمال می‌کند", () => {
    expect(normalizeAdminSearchText("موجودي")).toBe("موجودی");
    expect(normalizeAdminSearchText("كــد")).toBe("کد");
    expect(normalizeAdminSearchText("پیام‌رسانی")).toBe("پیام رسانی");
    expect(normalizeAdminSearchText("۲۳")).toBe("23");
  });

  it("هر آیتم منو با والد (گروه) و مسیر کامل ساخته می‌شود", () => {
    const products = entries.find((entry) => entry.path === "/admin/products");

    expect(products?.groupLabel).toBe("فروشگاه");
    expect(products?.trail).toBe("فروشگاه › محصولات");
    expect(products?.parentLabel).toBeUndefined();
  });

  it("زیرمنوی «افزودن محصول» با والد خودش در فهرست است", () => {
    const create = entries.find(
      (entry) => entry.path === "/admin/products/create",
    );

    expect(create?.label).toBe("افزودن محصول جدید");
    expect(create?.parentLabel).toBe("محصولات");
    expect(create?.parentPath).toBe("/admin/products");
    expect(create?.groupLabel).toBe("فروشگاه");
  });

  it("فقط زیرمنوهای بخش‌های داده‌شده ساخته می‌شوند", () => {
    const onlyDashboard = buildAdminSearchEntries([ADMIN_NAV_ITEMS[0]]);

    expect(onlyDashboard.map((entry) => entry.path)).toEqual(["/admin"]);
  });

  it("عبارت خالی همهٔ نتایج را برمی‌گرداند", () => {
    expect(searchAdminEntries(entries, "   ")).toHaveLength(entries.length);
  });

  it("جست‌وجوی نام گروه، زیرمنوهای همان گروه را می‌آورد", () => {
    const paths = searchAdminEntries(entries, "فروشگاه").map(
      (entry) => entry.path,
    );

    expect(paths).toContain("/admin/products");
    expect(paths).toContain("/admin/settings");
  });

  it("همهٔ کلمه‌های عبارت باید در نتیجه پیدا شوند", () => {
    const results = searchAdminEntries(entries, "افزودن محصول");

    expect(results[0]?.path).toBe("/admin/products/create");
  });

  it("جست‌وجو با حروف عربی و نیم‌فاصله هم نتیجه می‌دهد", () => {
    expect(searchAdminEntries(entries, "موجودي")[0]?.path).toBe(
      "/admin/products",
    );

    expect(
      searchAdminEntries(entries, "پيام رساني").map((entry) => entry.path),
    ).toContain("/admin/messaging");
  });

  it("عبارت بی‌ربط هیچ نتیجه‌ای ندارد", () => {
    expect(searchAdminEntries(entries, "زیردریایی")).toHaveLength(0);
  });
});