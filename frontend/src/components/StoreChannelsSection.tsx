import {
  Camera,
  MessageCircle,
  MessageSquare,
  MessagesSquare,
  Radio,
  Send,
  UserPlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useContactChannels } from "../hooks/useContactChannels";
import {
  contactChannelChatHref,
  contactChannelChatLabel,
  contactChannelJoinLabel,
  type ContactChannelKey,
} from "../services/contactChannels";

/**
 * بخش «همراه ما باشید»: کانال‌های ارتباطی فروشگاه در صفحه‌های ثبت‌نام و
 * حساب کاربری.
 *
 * برای هر کانال دو دکمه ساخته می‌شود: «عضویت در کانال» و «ارسال پیام».
 * اگر مدیر هیچ لینکی در پنل ثبت نکرده باشد (یا همهٔ کانال‌ها خاموش باشند)
 * این بخش هیچ چیزی رندر نمی‌کند تا فضای خالی روی صفحه نماند.
 *
 * چیدمان عمداً «فهرست ردیفی» است (نه شبکهٔ کارت‌های دوستونه) تا در ستون
 * کنارِ باریک صفحه‌های ثبت‌نام/حساب کاربری متن‌ها هم‌تراز بمانند، عنوان‌ها با
 * truncate بریده شوند و دکمه‌ها همیشه در یک ردیف ثابت قرار بگیرند. معنی دو
 * آیکن هم در پانویس بخش توضیح داده شده است.
 */
const CHANNEL_STYLES: Record<
  ContactChannelKey,
  { icon: LucideIcon; tone: string }
> = {
  telegram: { icon: Send, tone: "bg-info-100 text-info" },
  whatsapp: { icon: MessageCircle, tone: "bg-brand-100 text-brand-550" },
  bale: { icon: MessagesSquare, tone: "bg-plum-100 text-plum-500" },
  eitaa: { icon: MessageSquare, tone: "bg-brand-50 text-brand-600" },
  instagram: { icon: Camera, tone: "bg-plum-100 text-plum-500" },
};

type StoreChannelsSectionProps = {
  /** فاصله/چیدمان اضافی از صفحهٔ والد (مثلاً mt-6). */
  className?: string;
};

function StoreChannelsSection({ className = "" }: StoreChannelsSectionProps) {
  const channels = useContactChannels();

  if (channels.length === 0) {
    return null;
  }

  return (
    <section
      dir="rtl"
      aria-labelledby="store-channels-title"
      className={`overflow-hidden rounded-3xl border border-line bg-white shadow-sm ${className}`}
    >
      <header className="flex items-start gap-3 border-b border-line bg-brand-50 px-4 py-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm">
          <Radio size={20} aria-hidden="true" />
        </span>

        <div className="min-w-0">
          <h2
            id="store-channels-title"
            className="text-sm font-black text-ink sm:text-base"
          >
            همراه ما باشید
          </h2>

          <p className="mt-1 text-xs leading-5 text-muted">
            در کانال‌های فروشگاه عضو شوید یا مستقیم به ما پیام بدهید.
          </p>
        </div>
      </header>

      <ul className="divide-y divide-line">
        {channels.map((channel) => {
          const style = CHANNEL_STYLES[channel.key];
          const Icon = style.icon;
          const joinHref = channel.join_url;
          const chatHref = contactChannelChatHref(channel);

          return (
            <li
              key={channel.key}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-cream-deep"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.tone}`}
              >
                <Icon size={18} aria-hidden="true" />
              </span>

              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-bold text-ink">
                  {channel.title}
                </h3>

                {channel.description && (
                  <p className="mt-0.5 truncate text-xs text-muted-soft">
                    {channel.description}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                {joinHref && (
                  <a
                    href={joinHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`${contactChannelJoinLabel(channel)} — ${channel.title}`}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                  >
                    <UserPlus size={17} aria-hidden="true" />
                    <span className="sr-only">
                      {contactChannelJoinLabel(channel)}
                    </span>
                  </a>
                )}

                {chatHref && (
                  <a
                    href={chatHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`${contactChannelChatLabel(channel)} — ${channel.title}`}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand-200 bg-brand-50 text-brand-700 transition-colors hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                  >
                    <MessageCircle size={17} aria-hidden="true" />
                    <span className="sr-only">
                      {contactChannelChatLabel(channel)}
                    </span>
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line bg-cream px-4 py-2.5 text-[11px] text-muted-soft">
        <span className="inline-flex items-center gap-1">
          <UserPlus size={13} aria-hidden="true" />
          عضویت در کانال
        </span>

        <span className="inline-flex items-center gap-1">
          <MessageCircle size={13} aria-hidden="true" />
          ارسال پیام
        </span>
      </p>
    </section>
  );
}

export default StoreChannelsSection;
