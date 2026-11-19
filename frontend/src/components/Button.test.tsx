import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Button, { ButtonLink } from "./Button";

/**
 * دکمهٔ مشترک سایت؛ همهٔ فرم‌های ثبت سفارش/ورود به آن وابسته‌اند.
 * تست‌ها رفتار پایه (کلیک، غیرفعال‌شدن هنگام ارسال) را قفل می‌کنند.
 */
describe("Button", () => {
  it("renders its label and calls onClick", async () => {
    const onClick = vi.fn();

    render(<Button onClick={onClick}>ثبت سفارش</Button>);

    await userEvent.click(screen.getByRole("button", { name: "ثبت سفارش" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is disabled and marked busy while loading", () => {
    render(<Button loading>در حال ارسال</Button>);

    const button = screen.getByRole("button", { name: "در حال ارسال" });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("does not call onClick when disabled", async () => {
    const onClick = vi.fn();

    render(
      <Button disabled onClick={onClick}>
        غیرفعال
      </Button>,
    );

    await userEvent.click(screen.getByRole("button", { name: "غیرفعال" }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it("renders a router link with the same styles", () => {
    render(
      <MemoryRouter>
        <ButtonLink to="/products">محصولات</ButtonLink>
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "محصولات" })).toHaveAttribute(
      "href",
      "/products",
    );
  });
});
