import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";

import AccountNameMenu from "./AccountNameMenu";

/**
 * منوی نام صاحب حساب در صفحهٔ `/account`.
 *
 * با کلیک روی نام باید دو میان‌بر «سفارش‌های من» و «حساب کاربری من» باز شوند و
 * با Escape یا کلیک بیرون بسته شود؛ بدون کلیک هیچ میان‌بری در صفحه نیست.
 */
function renderMenu() {
  return render(
    <MemoryRouter initialEntries={["/account"]}>
      <AccountNameMenu name="سارا محمدی" />
    </MemoryRouter>,
  );
}

describe("AccountNameMenu", () => {
  it("is closed until the account name is clicked", () => {
    renderMenu();

    const trigger = screen.getByRole("button", { name: "منوی حساب کاربری" });

    expect(screen.getByText("سارا محمدی")).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("opens both shortcuts with the right links", () => {
    renderMenu();

    fireEvent.click(screen.getByRole("button", { name: "منوی حساب کاربری" }));

    expect(
      screen.getByRole("button", { name: "منوی حساب کاربری" }),
    ).toHaveAttribute("aria-expanded", "true");

    expect(screen.getByRole("menuitem", { name: /سفارش‌های من/ })).toHaveAttribute(
      "href",
      "/account/orders",
    );

    expect(
      screen.getByRole("menuitem", { name: /حساب کاربری من/ }),
    ).toHaveAttribute("href", "/account");
  });

  it("closes on Escape", () => {
    renderMenu();

    fireEvent.click(screen.getByRole("button", { name: "منوی حساب کاربری" }));

    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes when clicking outside of it", () => {
    renderMenu();

    fireEvent.click(screen.getByRole("button", { name: "منوی حساب کاربری" }));

    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("shows the name and opens the same menu in the site header (desktop)", () => {
    render(
      <MemoryRouter initialEntries={["/account"]}>
        <AccountNameMenu name="سارا محمدی" variant="header" />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "منوی حساب کاربری" }));

    expect(screen.getByText("سارا محمدی")).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /سفارش‌های من/ }),
    ).toHaveAttribute("href", "/account/orders");
    expect(
      screen.getByRole("menuitem", { name: /حساب کاربری من/ }),
    ).toHaveAttribute("href", "/account");
  });

  it("opens the menu from the icon-only trigger in the mobile header", () => {
    render(
      <MemoryRouter initialEntries={["/account/orders"]}>
        <AccountNameMenu name="سارا محمدی" variant="icon" />
      </MemoryRouter>,
    );

    const trigger = screen.getByRole("button", { name: "منوی حساب کاربری" });

    // در موبایل فقط آیکن دیده می‌شود، نه نام.
    expect(screen.queryByText("سارا محمدی")).not.toBeInTheDocument();

    fireEvent.click(trigger);

    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getAllByRole("menuitem")).toHaveLength(2);
  });
});
