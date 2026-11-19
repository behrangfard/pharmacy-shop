import { describe, expect, it } from "vitest";

import {
  bannerH1Summary,
  countBannerH1Layers,
  emptyBannerTextLayer,
} from "./bannerText";

/**
 * قاعدهٔ سئو: هر صفحه فقط یک H1. شمارندهٔ پنل بنرها باید فقط لایه‌های h1
 * دارای متن، بنرهای فعال و بنرهای صفحهٔ اصلی را بشمارد.
 */
describe("countBannerH1Layers", () => {
  it("counts h1 layers that actually render", () => {
    const layers = [
      { ...emptyBannerTextLayer(1), tag: "h1", text: "تیتر اصلی" },
      { ...emptyBannerTextLayer(2), tag: "h1", text: "   " },
      { ...emptyBannerTextLayer(3), tag: "p", text: "توضیح" },
    ];

    expect(countBannerH1Layers(layers)).toBe(1);
  });

  it("returns zero for unknown or empty payloads", () => {
    expect(countBannerH1Layers(null)).toBe(0);
    expect(countBannerH1Layers({})).toBe(0);
    expect(countBannerH1Layers([])).toBe(0);
  });
});

describe("bannerH1Summary", () => {
  const h1Layer = { ...emptyBannerTextLayer(1), tag: "h1", text: "تیتر" };
  const paragraph = { ...emptyBannerTextLayer(2), tag: "p", text: "متن" };

  it("sums H1 across inactive-filtered home banners", () => {
    const summary = bannerH1Summary([
      {
        id: 1,
        title: "بنر اول",
        position: "home_hero",
        is_active: true,
        text_layers: [h1Layer],
      },
      {
        id: 2,
        title: "بنر دوم",
        position: "home_mobile_top",
        is_active: true,
        text_layers: [h1Layer, paragraph],
      },
    ]);

    expect(summary.count).toBe(2);
    expect(summary.banners.map((item) => item.id)).toEqual([1, 2]);
  });

  it("ignores inactive banners and products page banners", () => {
    const summary = bannerH1Summary([
      {
        id: 3,
        title: "غیرفعال",
        position: "home_grid",
        is_active: false,
        text_layers: [h1Layer],
      },
      {
        id: 4,
        title: "صفحهٔ محصولات",
        position: "products_top",
        is_active: true,
        text_layers: [h1Layer],
      },
    ]);

    expect(summary.count).toBe(0);
    expect(summary.banners).toEqual([]);
  });

  it("falls back to the banner id when the title is empty", () => {
    const summary = bannerH1Summary([
      {
        id: 7,
        title: null,
        position: "home_hero",
        is_active: true,
        text_layers: [h1Layer],
      },
    ]);

    expect(summary.banners[0].title).toBe("بنر #7");
  });
});
