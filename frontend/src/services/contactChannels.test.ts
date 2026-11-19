import { describe, expect, it } from "vitest";

import {
  channelHasLinks,
  contactChannelChatHref,
  contactChannelChatLabel,
  contactChannelJoinLabel,
  CONTACT_CHANNEL_GREETING,
  CONTACT_CHANNEL_META,
  normalizeContactChannel,
  type ContactChannel,
} from "./contactChannels";

/**
 * کانال‌های ارتباطی: نرمال‌سازی پاسخ سرور و ساخت لینک/برچسب دکمه‌ها.
 *
 * این تست‌ها قرارداد پنل و سایت را قفل می‌کنند: کانال بدون لینک رندر نمی‌شود،
 * برچسب پنل بر پیش‌فرض اولویت دارد و لینک واتس‌اپ متن آمادهٔ گفتگو می‌گیرد.
 */
const telegram: ContactChannel = {
  key: "telegram",
  title: "کانال تلگرام",
  description: "اخبار فروشگاه",
  join_url: "https://t.me/behrangshop",
  join_label: null,
  chat_url: "https://t.me/behrangsupport",
  chat_label: null,
};

describe("contactChannels", () => {
  it("drops unknown channels and channels without links", () => {
    expect(normalizeContactChannel({ key: "sms", join_url: "https://x.y" })).toBeNull();
    expect(
      normalizeContactChannel({ key: "telegram", title: "تلگرام" }),
    ).toBeNull();
    expect(normalizeContactChannel("telegram")).toBeNull();
  });

  it("trims values and falls back to the platform label for the title", () => {
    const channel = normalizeContactChannel({
      key: "bale",
      title: "   ",
      description: "  کانال بله  ",
      join_url: "  https://ble.ir/behrangshop  ",
      join_label: "",
      chat_url: "",
      chat_label: null,
    });

    expect(channel).toEqual({
      key: "bale",
      title: CONTACT_CHANNEL_META.bale.label,
      description: "کانال بله",
      join_url: "https://ble.ir/behrangshop",
      join_label: null,
      chat_url: null,
      chat_label: null,
    });
  });

  it("uses panel labels first and platform defaults otherwise", () => {
    expect(contactChannelJoinLabel(telegram)).toBe("عضویت در کانال");
    expect(contactChannelChatLabel(telegram)).toBe("ارسال پیام");

    expect(
      contactChannelJoinLabel({ ...telegram, join_label: "عضو شوید" }),
    ).toBe("عضو شوید");
    expect(
      contactChannelJoinLabel({ ...telegram, key: "instagram" }),
    ).toBe("مشاهدهٔ صفحه");
  });

  it("adds the ready-made greeting to WhatsApp chat links only", () => {
    const whatsapp: ContactChannel = {
      ...telegram,
      key: "whatsapp",
      chat_url: "https://wa.me/989121234567",
    };

    expect(contactChannelChatHref(whatsapp)).toBe(
      `https://wa.me/989121234567?text=${encodeURIComponent(
        CONTACT_CHANNEL_GREETING,
      )}`,
    );

    expect(contactChannelChatHref(whatsapp, "سلام")).toBe(
      `https://wa.me/989121234567?text=${encodeURIComponent("سلام")}`,
    );

    expect(contactChannelChatHref(telegram)).toBe("https://t.me/behrangsupport");
    expect(
      contactChannelChatHref({ ...telegram, chat_url: null }),
    ).toBeNull();
  });

  it("detects channels that have at least one link", () => {
    expect(channelHasLinks(telegram)).toBe(true);
    expect(
      channelHasLinks({ ...telegram, join_url: null, chat_url: null }),
    ).toBe(false);
    expect(channelHasLinks({ ...telegram, join_url: null })).toBe(true);
  });
});
