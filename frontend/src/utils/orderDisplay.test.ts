import { describe, expect, it } from "vitest";

import {
  canCancelCustomerOrder,
  canContinuePayment,
  formatOrderPrice,
  orderItemCount,
  orderStatusLabel,
  orderStatusStyle,
  paymentStatusLabel,
  paymentStatusStyle,
} from "./orderDisplay";

/**
 * توابع نمایش سفارش مشتری که از `Account.tsx` به `utils/orderDisplay.ts`
 * منتقل شدند. برچسب‌ها باید فارسی بمانند، وضعیت ناشناخته متن خام برگرداند و
 * قواعد «ادامهٔ پرداخت / لغو» دقیقاً همان شروط سرور را رعایت کنند.
 */
describe("orderStatusLabel / paymentStatusLabel", () => {
  it("labels known order statuses in Persian", () => {
    expect(orderStatusLabel("pending")).toBe("در انتظار بررسی");
    expect(orderStatusLabel("processing")).toBe("در حال پردازش");
    expect(orderStatusLabel("shipped")).toBe("ارسال شده");
    expect(orderStatusLabel("delivered")).toBe("تحویل شده");
    expect(orderStatusLabel("cancelled")).toBe("لغو شده");
    expect(orderStatusLabel("canceled")).toBe("لغو شده");
  });

  it("falls back to the raw value for unknown statuses", () => {
    expect(orderStatusLabel("custom")).toBe("custom");
    expect(paymentStatusLabel("custom")).toBe("custom");
  });

  it("labels payment statuses the way the site does", () => {
    expect(paymentStatusLabel("paid")).toBe("پرداخت شده");
    expect(paymentStatusLabel("unpaid")).toBe("پرداخت نشده");
    expect(paymentStatusLabel("pending")).toBe("پرداخت نشده");
    expect(paymentStatusLabel("failed")).toBe("پرداخت ناموفق");
    expect(paymentStatusLabel("refunded")).toBe("مسترد شده");
  });
});

describe("orderStatusStyle / paymentStatusStyle", () => {
  it("gives cancelled orders the red accent bar", () => {
    expect(orderStatusStyle("cancelled").accent).toBe("bg-discount");
    expect(orderStatusStyle("canceled").accent).toBe("bg-discount");
  });

  it("falls back to a neutral style for unknown statuses", () => {
    expect(orderStatusStyle("weird").wrapper).toBe("bg-cream text-muted border-line");
    expect(paymentStatusStyle("weird")).toBe("bg-cream text-muted border-line");
  });

  it("marks paid payments as successful", () => {
    expect(paymentStatusStyle("paid")).toBe(
      "bg-brand-50 text-stock-700 border-brand-200",
    );
  });
});

describe("formatOrderPrice / orderItemCount", () => {
  it("formats amounts with Persian digits", () => {
    expect(formatOrderPrice(0)).toBe("۰");
    expect(formatOrderPrice("125000")).not.toBe("");
    expect(formatOrderPrice(undefined)).toBe("۰");
    expect(formatOrderPrice("abc")).toBe("۰");
  });

  it("sums item quantities", () => {
    expect(
      orderItemCount({
        items: [
          { id: 1, product_name: "الف", quantity: 2 },
          { id: 2, product_name: "ب", quantity: "3" },
        ],
      }),
    ).toBe(5);
  });
});

describe("canContinuePayment", () => {
  it("allows online unpaid orders that are not cancelled", () => {
    expect(
      canContinuePayment({
        payment_status: "unpaid",
        payment_method: "online",
        status: "pending",
      }),
    ).toBe(true);
  });

  it("never allows cash-on-delivery orders", () => {
    expect(
      canContinuePayment({
        payment_status: "unpaid",
        payment_method: "cod",
        status: "processing",
      }),
    ).toBe(false);
  });

  it("blocks cancelled and already-paid orders", () => {
    expect(
      canContinuePayment({
        payment_status: "unpaid",
        payment_method: "online",
        status: "cancelled",
      }),
    ).toBe(false);

    expect(
      canContinuePayment({
        payment_status: "paid",
        payment_method: "online",
        status: "processing",
      }),
    ).toBe(false);
  });
});

describe("canCancelCustomerOrder", () => {
  it("allows unpaid orders before shipping", () => {
    expect(
      canCancelCustomerOrder({ payment_status: "unpaid", status: "processing" }),
    ).toBe(true);
  });

  it("blocks paid, shipped, delivered and cancelled orders", () => {
    expect(
      canCancelCustomerOrder({ payment_status: "paid", status: "pending" }),
    ).toBe(false);

    ["shipped", "delivered", "cancelled", "canceled"].forEach((status) => {
      expect(
        canCancelCustomerOrder({ payment_status: "unpaid", status }),
      ).toBe(false);
    });
  });
});
