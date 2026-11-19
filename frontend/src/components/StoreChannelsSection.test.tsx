import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import StoreChannelsSection from "./StoreChannelsSection";
import { useContactChannels } from "../hooks/useContactChannels";
import type { ContactChannel } from "../services/contactChannels";

vi.mock("../hooks/useContactChannels", () => ({
  useContactChannels: vi.fn(),
}));

const mockedChannels = vi.mocked(useContactChannels);

/**
 * بخش «همراه ما باشید» صفحه‌های ثبت‌نام و حساب کاربری.
 *
 * لینک‌ها باید در تب جدید و با rel امن باز شوند و دکمه‌ای که لینک ندارد
 * ساخته نشود؛ واتس‌اپ هم متن آمادهٔ گفتگو بگیرد.
 */
const channels: ContactChannel[] = [
  {
    key: "telegram",
    title: "کانال تلگرام",
    description: "اخبار و تخفیف‌ها",
    join_url: "https://t.me/behrangshop",
    join_label: null,
    chat_url: "https://t.me/behrangsupport",
    chat_label: null,
  },
  {
    key: "whatsapp",
    title: "واتس‌اپ",
    description: "",
    join_url: null,
    join_label: null,
    chat_url: "https://wa.me/989121234567",
    chat_label: null,
  },
];

describe("StoreChannelsSection", () => {
  beforeEach(() => {
    mockedChannels.mockReturnValue(channels);
  });

  it("renders nothing when no channel has a link", () => {
    mockedChannels.mockReturnValue([]);

    const { container } = render(<StoreChannelsSection />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders join and chat links that open in a new tab", () => {
    render(<StoreChannelsSection />);

    const join = screen.getByRole("link", { name: "عضویت در کانال" });

    expect(join).toHaveAttribute("href", "https://t.me/behrangshop");
    expect(join).toHaveAttribute("target", "_blank");
    expect(join).toHaveAttribute("rel", "noopener noreferrer");

    expect(screen.getByText("کانال تلگرام")).toBeInTheDocument();
    expect(screen.getByText("اخبار و تخفیف‌ها")).toBeInTheDocument();
  });

  it("prefills the WhatsApp message and skips missing buttons", () => {
    render(<StoreChannelsSection />);

    const whatsAppLink = screen
      .getAllByRole("link", { name: "ارسال پیام" })
      .find((link) => link.getAttribute("href")?.startsWith("https://wa.me/"));

    expect(whatsAppLink).toBeDefined();
    expect(whatsAppLink?.getAttribute("href")).toContain("?text=");

    // برای واتس‌اپ لینک عضویت ثبت نشده است؛ فقط یک دکمهٔ عضویت (تلگرام) هست.
    expect(
      screen.getAllByRole("link", { name: "عضویت در کانال" }),
    ).toHaveLength(1);
  });

  it("uses the custom labels coming from the panel", () => {
    mockedChannels.mockReturnValue([
      {
        ...channels[0],
        join_label: "عضو کانال شوید",
        chat_label: "پیام به پشتیبانی",
      },
    ]);

    render(<StoreChannelsSection />);

    expect(
      screen.getByRole("link", { name: "عضو کانال شوید" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "پیام به پشتیبانی" }),
    ).toBeInTheDocument();
  });
});
