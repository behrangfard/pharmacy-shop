import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MobileBottomNav from "./MobileBottomNav";
import { HEADER_SEARCH_INPUT_ID } from "./HeaderSearch";
import {
  DEFAULT_HEADER_FOOTER,
  type HeaderFooterSettings,
} from "../services/headerFooter";

/**
 * نوار ناوبری پایین موبایل + دکمهٔ شناور «دسترسی سریع».
 *
 * این تست‌ها رفتارهایی را پوشش می‌دهند که کاربر مستقیماً می‌بیند: میان‌برهای
 * قابل ویرایش از پنل (خانه، فروشگاه، علاقه‌مندی، سبد خرید)، نشان تعداد
 * سبد/علاقه‌مندی، هایلایت میان‌بر فعال (شامل صفحهٔ محصول برای «فروشگاه»)،
 * باز و بسته‌شدن پنل دسترسی سریع با دکمهٔ شناور/Esc/پس‌زمینه، لوگو و حالت
 * لینکِ دکمهٔ شناور، خاموش‌کردن کل نوار از پنل، مقصد درست ردیف حساب کاربری
 * برای مهمان و کاربر واردشده و فوکوس‌شدن کادر جست‌وجوی هدر.
 *
 * چهار وابستگی موک می‌شوند (سبد خرید، علاقه‌مندی، احراز هویت و تنظیمات
 * هدر/فوتر) تا تست فقط روی منطق همین کامپوننت تمرکز کند.
 */

const state = vi.hoisted(() => ({
  cartCount: 0,
  wishlistCount: 0,
  user: null as { id: number; name: string } | null,
}));

/** تنظیمات نوار پایین؛ پیش‌فرض‌ها در `beforeEach` گذاشته می‌شوند. */
const navState = vi.hoisted(() => ({
  settings: null as unknown as HeaderFooterSettings | null,
}));

vi.mock("../context/CartContext", () => ({
  useCart: () => ({ cartCount: state.cartCount }),
}));

vi.mock("../context/WishlistContext", () => ({
  useWishlist: () => ({ count: state.wishlistCount }),
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: state.user }),
}));

vi.mock("../hooks/useHeaderFooter", () => ({
  useHeaderFooter: () => navState.settings as HeaderFooterSettings,
}));

beforeEach(() => {
  state.cartCount = 0;
  state.wishlistCount = 0;
  state.user = null;
  navState.settings = DEFAULT_HEADER_FOOTER;

  // jsdom پیاده‌سازی `scrollIntoView` ندارد؛ بدون آن فوکوس کادر جست‌وجو
  // داخل هندلر کلیک خطا می‌دهد.
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    configurable: true,
    writable: true,
    value: vi.fn(),
  });
});

function renderNav(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <MobileBottomNav />
    </MemoryRouter>,
  );
}

function openQuickPanel() {
  fireEvent.click(
    screen.getByRole("button", { name: "باز کردن دسترسی سریع" }),
  );
}

function getQuickPanel() {
  return screen.getByRole("group", { name: "دسترسی سریع" });
}

describe("MobileBottomNav", () => {
  it("shows the four shortcuts and marks the current one only", () => {
    renderNav("/cart");

    expect(screen.getByRole("link", { name: "خانه" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "سبد خرید" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "فروشگاه" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(screen.getByRole("link", { name: "علاقه‌مندی" })).toHaveAttribute(
      "href",
      "/wishlist",
    );
  });

  it("keeps the shop shortcut active on a product page", () => {
    renderNav("/product/serum");

    expect(screen.getByRole("link", { name: "فروشگاه" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "خانه" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("shows the cart and wishlist counts in Persian digits", () => {
    state.cartCount = 3;
    state.wishlistCount = 12;

    renderNav();

    expect(screen.getByText("۳")).toBeInTheDocument();
    expect(screen.getByText("۱۲")).toBeInTheDocument();
  });

  it("opens and closes the quick panel with the floating button", () => {
    renderNav();

    expect(
      screen.queryByRole("group", { name: "دسترسی سریع" }),
    ).not.toBeInTheDocument();

    const floatingButton = screen.getByRole("button", {
      name: "باز کردن دسترسی سریع",
    });
    expect(floatingButton).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(floatingButton);

    const panel = getQuickPanel();

    expect(
      screen.getByRole("button", { name: "بستن دسترسی سریع" }),
    ).toHaveAttribute("aria-expanded", "true");

    expect(
      within(panel).getByRole("link", { name: /پیگیری سفارش/ }),
    ).toHaveAttribute("href", "/track-order");
    expect(
      within(panel).getByRole("link", { name: /راهنمای انتخاب سایز/ }),
    ).toHaveAttribute("href", "/size-guide");
    expect(
      within(panel).getByRole("link", { name: /بخش ویژهٔ بزرگسالان/ }),
    ).toHaveAttribute("href", "/adult");

    fireEvent.click(screen.getByRole("button", { name: "بستن دسترسی سریع" }));

    expect(
      screen.queryByRole("group", { name: "دسترسی سریع" }),
    ).not.toBeInTheDocument();
  });

  it("closes the quick panel with Escape and with the backdrop", () => {
    renderNav();

    openQuickPanel();
    fireEvent.keyDown(document, { key: "Escape" });

    expect(
      screen.queryByRole("group", { name: "دسترسی سریع" }),
    ).not.toBeInTheDocument();

    openQuickPanel();
    fireEvent.click(
      screen.getByRole("button", { name: "بستن پنل دسترسی سریع" }),
    );

    expect(
      screen.queryByRole("group", { name: "دسترسی سریع" }),
    ).not.toBeInTheDocument();
  });

  it("sends guests to login and logged-in users to their account", () => {
    const { unmount } = renderNav();

    openQuickPanel();
    expect(
      within(getQuickPanel()).getByRole("link", {
        name: /حساب کاربری و سفارش‌ها/,
      }),
    ).toHaveAttribute("href", "/login");

    unmount();

    state.user = { id: 5, name: "سارا" };
    renderNav();
    openQuickPanel();

    expect(
      within(getQuickPanel()).getByRole("link", {
        name: /حساب کاربری و سفارش‌ها/,
      }),
    ).toHaveAttribute("href", "/account");
  });

  it("focuses the header search box from the quick panel", () => {
    render(
      <MemoryRouter>
        <input id={HEADER_SEARCH_INPUT_ID} aria-label="جست‌وجوی محصولات" />
        <MobileBottomNav />
      </MemoryRouter>,
    );

    openQuickPanel();
    fireEvent.click(screen.getByRole("button", { name: /جست‌وجو در فروشگاه/ }));

    expect(screen.getByLabelText("جست‌وجوی محصولات")).toHaveFocus();
    expect(
      screen.queryByRole("group", { name: "دسترسی سریع" }),
    ).not.toBeInTheDocument();
  });

  it("renders the shortcuts and quick links configured in the admin panel", () => {
    navState.settings = {
      ...DEFAULT_HEADER_FOOTER,
      mobile_nav_items: [
        { label: "خانه", url: "/", icon: "home", badge: "none" },
        {
          label: "پیشنهاد ویژه",
          url: "/products?sort=newest",
          icon: "ticket-percent",
          badge: "none",
        },
        {
          label: "علاقه‌مندی",
          url: "/wishlist",
          icon: "heart",
          badge: "wishlist",
        },
        {
          label: "سبد خرید",
          url: "/cart",
          icon: "shopping-cart",
          badge: "cart",
        },
      ],
      mobile_nav_quick_links: [
        {
          label: "تماس با ما",
          hint: "پاسخ در ساعات کاری",
          url: "/contact",
          icon: "phone",
        },
      ],
    };

    renderNav("/cart");

    expect(
      screen.getByRole("link", { name: "پیشنهاد ویژه" }),
    ).toHaveAttribute("href", "/products?sort=newest");
    expect(screen.getByRole("link", { name: "سبد خرید" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "خانه" })).not.toHaveAttribute(
      "aria-current",
    );

    openQuickPanel();

    const panel = getQuickPanel();

    expect(
      within(panel).getByRole("link", { name: /تماس با ما/ }),
    ).toHaveAttribute("href", "/contact");

    // ردیف‌های ثابت پنل (جست‌وجو و بخش ویژهٔ ۱۸+) همیشه نمایش داده می‌شوند.
    expect(
      within(panel).getByRole("link", { name: /بخش ویژهٔ بزرگسالان/ }),
    ).toHaveAttribute("href", "/adult");
  });

  it("shows the store logo inside the floating button when one is uploaded", () => {
    navState.settings = {
      ...DEFAULT_HEADER_FOOTER,
      mobile_nav_fab_logo: "mobile-nav/logo.webp",
    };

    const { container } = renderNav();

    const logo = container.querySelector(".mobile-fab-logo");

    expect(logo?.getAttribute("src")).toContain(
      "/storage/mobile-nav/logo.webp",
    );

    // در حالت پیش‌فرض، دکمه همان پنل «دسترسی سریع» را باز می‌کند.
    expect(
      screen.getByRole("button", { name: "باز کردن دسترسی سریع" }),
    ).toBeInTheDocument();
  });

  it("turns the floating button into a link when the admin chose a url", () => {
    navState.settings = {
      ...DEFAULT_HEADER_FOOTER,
      mobile_nav_fab_mode: "link",
      mobile_nav_fab_url: "/products",
    };

    renderNav();

    expect(
      screen.queryByRole("button", { name: /دسترسی سریع/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "بهرنگ شاپ" })).toHaveAttribute(
      "href",
      "/products",
    );
  });

  it("hides the whole bar when the admin turned it off", () => {
    navState.settings = {
      ...DEFAULT_HEADER_FOOTER,
      mobile_nav_enabled: false,
    };

    const { container } = renderNav();

    expect(container.querySelector(".mobile-bottom-nav")).toBeNull();
    expect(
      screen.queryByRole("button", { name: /دسترسی سریع/ }),
    ).not.toBeInTheDocument();
  });
});
