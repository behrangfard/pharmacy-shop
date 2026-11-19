import type { ReactNode } from "react";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AxiosResponse } from "axios";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import AccountOrders from "./AccountOrders";
import api from "../services/api";
import type { OrderSummary } from "../utils/orderDisplay";

/**
 * صفحهٔ «سفارش‌های من» (`/account/orders`).
 *
 * این تست‌ها رفتارهایی را پوشش می‌دهند که کاربر مستقیماً می‌بیند: فهرست
 * سفارش‌ها، حالت خالی، خطا با «تلاش دوباره»، نمایش «ادامهٔ پرداخت» فقط برای
 * سفارش آنلاین پرداخت‌نشده و لغو سفارش با به‌روزرسانی کارت.
 *
 * `Layout`، متادیتای صفحه، Context احراز هویت و لایهٔ API موک می‌شوند تا تست
 * فقط روی منطق همین صفحه تمرکز کند.
 */
vi.mock("../components/Layout", () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("../hooks/usePageMeta", () => ({
  usePrivatePageMeta: () => undefined,
}));

vi.mock("../context/AuthContext", () => {
  // کاربر باید بین رندرها پایدار بماند، وگرنه افکت بارگذاری هر رندر دوباره
  // اجرا می‌شود و نتیجهٔ درخواست قبلی را بازنویسی می‌کند.
  const user = { id: 1, name: "سارا محمدی" };

  return { useAuth: () => ({ user }) };
});

vi.mock("../services/api", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const mockedGet = vi.mocked(api.get);
const mockedPost = vi.mocked(api.post);

function buildOrder(overrides: Partial<OrderSummary> = {}): OrderSummary {
  return {
    id: 1,
    order_number: "ORD-2026-0001",
    subtotal: 100000,
    shipping_cost: 0,
    discount: 0,
    total: 100000,
    status: "pending",
    payment_status: "unpaid",
    payment_method: "online",
    created_at: "2026-11-16T10:00:00.000Z",
    items: [{ id: 1, product_name: "کرم مرطوب‌کننده", quantity: 1 }],
    ...overrides,
  };
}

function mockOrders(orders: OrderSummary[]): void {
  mockedGet.mockResolvedValue({
    data: { data: orders },
  } as unknown as AxiosResponse);
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/account/orders"]}>
      <AccountOrders />
    </MemoryRouter>,
  );
}

describe("AccountOrders", () => {
  it("renders order cards with number, total and detail link", async () => {
    mockOrders([buildOrder()]);

    renderPage();

    expect(await screen.findByText("ORD-2026-0001")).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: /مشاهده جزئیات سفارش/ }),
    ).toHaveAttribute("href", "/account/orders/ORD-2026-0001");

    expect(screen.getByText("کرم مرطوب‌کننده")).toBeInTheDocument();
    expect(screen.getByText("ارسال رایگان")).toBeInTheDocument();
    expect(screen.getByText("در انتظار بررسی")).toBeInTheDocument();
  });

  it("shows the empty state when there is no order", async () => {
    mockOrders([]);

    renderPage();

    expect(
      await screen.findByText("هنوز سفارشی ثبت نکرده‌اید"),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "پیگیری سفارش مهمان" }),
    ).toHaveAttribute("href", "/track-order");
  });

  it("shows an error state and reloads on retry", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    mockedGet.mockRejectedValueOnce(new Error("network"));

    renderPage();

    expect(
      await screen.findByText("دریافت سفارش‌ها با خطا مواجه شد."),
    ).toBeInTheDocument();

    mockOrders([]);

    fireEvent.click(screen.getByRole("button", { name: /تلاش دوباره/ }));

    expect(
      await screen.findByText("هنوز سفارشی ثبت نکرده‌اید"),
    ).toBeInTheDocument();

    expect(mockedGet).toHaveBeenCalledTimes(2);
  });

  it("offers payment only for unpaid online orders", async () => {
    mockOrders([
      buildOrder(),
      buildOrder({
        id: 2,
        order_number: "ORD-2026-0002",
        status: "processing",
        payment_method: "cod",
      }),
    ]);

    renderPage();

    await screen.findByText("ORD-2026-0001");

    expect(
      screen.getAllByRole("link", { name: /ادامهٔ پرداخت/ }),
    ).toHaveLength(1);

    // هر دو سفارش پرداخت‌نشده و ارسال‌نشده‌اند، پس دکمهٔ لغو برای هر دو هست.
    expect(
      screen.getAllByRole("button", { name: /لغو سفارش/ }),
    ).toHaveLength(2);
  });

  it("cancels an order after confirmation and updates the card", async () => {
    mockOrders([buildOrder()]);

    mockedPost.mockResolvedValue({ data: { success: true } } as unknown as
      AxiosResponse);

    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(window, "alert").mockImplementation(() => undefined);

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /لغو سفارش/ }));

    await waitFor(() => {
      expect(mockedPost).toHaveBeenCalledWith("/orders/ORD-2026-0001/cancel");
    });

    expect(await screen.findByText("لغو شده")).toBeInTheDocument();
  });
});
