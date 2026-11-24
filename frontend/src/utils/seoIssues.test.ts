import { describe, expect, it } from "vitest";

import {
  SEO_ISSUE_LABELS,
  SEO_META_LIMITS,
  type SeoIssueCode,
  seoMetaLength,
  seoMetaStatus,
  seoPreviewText,
} from "./seoIssues";

describe("seoMetaStatus", () => {
  it("missing را برای متن خالی برمی‌گرداند", () => {
    expect(seoMetaStatus(null, "title")).toBe("missing");
    expect(seoMetaStatus("   ", "description")).toBe("missing");
    expect(seoMetaStatus("", "title")).toBe("missing");
  });

  it("طول را با سقف نوع مربوط می‌سنجد", () => {
    const goodTitle = "ب".repeat(SEO_META_LIMITS.titleMax);
    const longTitle = `${goodTitle}ا`;

    expect(seoMetaStatus(goodTitle, "title")).toBe("good");
    expect(seoMetaStatus(longTitle, "title")).toBe("long");

    const goodDescription = "ب".repeat(SEO_META_LIMITS.descriptionMax);
    const longDescription = `${goodDescription}ا`;

    expect(seoMetaStatus(goodDescription, "description")).toBe("good");
    expect(seoMetaStatus(longDescription, "description")).toBe("long");
  });
});

describe("seoMetaLength", () => {
  it("فاصله‌های ابتدا و انتها را حساب نمی‌کند", () => {
    expect(seoMetaLength("  سلام  ")).toBe(4);
    expect(seoMetaLength(undefined)).toBe(0);
  });
});

describe("seoPreviewText", () => {
  it("متن خالی را با جایگزین پر می‌کند", () => {
    expect(seoPreviewText(null, "متن جایگزین", 60)).toBe("متن جایگزین");
    expect(seoPreviewText("  ", "متن جایگزین", 60)).toBe("متن جایگزین");
  });

  it("متن بلند را با سه‌نقطه کوتاه می‌کند", () => {
    expect(seoPreviewText("abcdef", "", 4)).toBe("abcd…");
  });

  it("متن کوتاه را دست‌نخورده برمی‌گرداند", () => {
    expect(seoPreviewText("کوتاه", "", 60)).toBe("کوتاه");
  });
});

describe("SEO_ISSUE_LABELS", () => {
  it("همهٔ کدهای مشکل برچسب فارسی دارند", () => {
    const codes: SeoIssueCode[] = [
      "missing_title",
      "missing_description",
      "long_title",
      "long_description",
      "duplicate_title",
    ];

    codes.forEach((code) => {
      expect(SEO_ISSUE_LABELS[code].length).toBeGreaterThan(0);
    });
  });
});
