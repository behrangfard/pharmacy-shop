import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Camera,
  CheckCircle2,
  ExternalLink,
  Loader2,
  MessageCircle,
  MessageSquare,
  MessagesSquare,
  RefreshCw,
  Save,
  Send,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { adminApi } from "../services/api";
import { getAdminErrorMessage } from "../utils/adminFormat";
import {
  CONTACT_CHANNEL_META,
  isContactChannelKey,
  type ContactChannelKey,
} from "../services/contactChannels";

/** یک کانال ارتباطی در پنل (شامل شناسه و وضعیت فعال بودن). */
interface ContactChannelRecord {
  id: number;
  key: string;
  title: string;
  description: string | null;
  join_url: string | null;
  join_label: string | null;
  chat_url: string | null;
  chat_label: string | null;
  sort_order: number;
  is_active: boolean;
}

type ChannelDraft = {
  title: string;
  description: string;
  join_url: string;
  join_label: string;
  chat_url: string;
  chat_label: string;
  sort_order: string;
};

const CHANNEL_ICONS: Record<ContactChannelKey, LucideIcon> = {
  telegram: Send,
  whatsapp: MessageCircle,
  bale: MessagesSquare,
  eitaa: MessageSquare,
  instagram: Camera,
};

function draftFromRecord(record: ContactChannelRecord): ChannelDraft {
  return {
    title: record.title ?? "",
    description: record.description ?? "",
    join_url: record.join_url ?? "",
    join_label: record.join_label ?? "",
    chat_url: record.chat_url ?? "",
    chat_label: record.chat_label ?? "",
    sort_order: String(record.sort_order ?? 0),
  };
}

/**
 * مدیریت کانال‌های ارتباطی فروشگاه (تلگرام، واتس‌اپ، بله، ایتا، اینستاگرام).
 *
 * هر کانال دو لینک دارد: «عضویت در کانال» و «ارسال پیام به اکانت فروشگاه».
 * لینک‌های فعال در بخش «همراه ما باشید» صفحه‌های ثبت‌نام و حساب کاربری نمایش
 * داده می‌شوند. ارسال خودکار پیام (اعلان سفارش، پیامک گروهی و ...) از بخش
 * «پیام‌رسانی» و با توکن ربات‌ها در فایل .env انجام می‌شود.
 */
function AdminChannels() {
  const [channels, setChannels] = useState<ContactChannelRecord[]>([]);
  const [drafts, setDrafts] = useState<Record<number, ChannelDraft>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [statusId, setStatusId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadChannels = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await adminApi.get("/admin/channels");
      const result = response.data?.data;

      if (!Array.isArray(result)) {
        throw new Error("ساختار پاسخ کانال‌ها معتبر نیست.");
      }

      const records = result as ContactChannelRecord[];

      setChannels(records);
      setDrafts(
        Object.fromEntries(records.map((record) => [record.id, draftFromRecord(record)])),
      );
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadChannels();
  }, [loadChannels]);

  const stats = useMemo(() => {
    const active = channels.filter((channel) => channel.is_active).length;
    const ready = channels.filter(
      (channel) => channel.join_url || channel.chat_url,
    ).length;

    return { total: channels.length, active, ready };
  }, [channels]);

  function updateDraft(id: number, field: keyof ChannelDraft, value: string) {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], [field]: value },
    }));
  }

  function mergeRecord(record: ContactChannelRecord, resetDrafts = true) {
    setChannels((current) =>
      current.map((item) => (item.id === record.id ? record : item)),
    );

    if (!resetDrafts) return;

    setDrafts((current) => ({
      ...current,
      [record.id]: draftFromRecord(record),
    }));
  }

  async function saveChannel(channel: ContactChannelRecord) {
    const draft = drafts[channel.id];

    if (!draft) return;

    setError("");
    setSuccess("");

    if (draft.title.trim() === "") {
      setError("عنوان کانال را وارد کنید.");
      return;
    }

    setSavingId(channel.id);

    try {
      const response = await adminApi.put(`/admin/channels/${channel.id}`, {
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        join_url: draft.join_url.trim() || null,
        join_label: draft.join_label.trim() || null,
        chat_url: draft.chat_url.trim() || null,
        chat_label: draft.chat_label.trim() || null,
        sort_order: Number(draft.sort_order) || 0,
        is_active: channel.is_active,
      });

      mergeRecord(response.data?.data as ContactChannelRecord);
      setSuccess(response.data?.message ?? "کانال ارتباطی ذخیره شد.");
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setSavingId(null);
    }
  }

  async function toggleStatus(channel: ContactChannelRecord) {
    setStatusId(channel.id);
    setError("");
    setSuccess("");

    try {
      const response = await adminApi.patch(
        `/admin/channels/${channel.id}/status`,
        { is_active: !channel.is_active },
      );

      mergeRecord(response.data?.data as ContactChannelRecord, false);
      setSuccess(response.data?.message ?? "وضعیت کانال تغییر کرد.");
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setStatusId(null);
    }
  }

  return (
    <div dir="rtl" className="admin-page">
      <header className="admin-page-head">
        <div>
          <span className="admin-page-eyebrow">مدیریت فروشگاه</span>
          <h1 className="admin-page-title">کانال‌های ارتباطی</h1>
          <p className="admin-page-subtitle">
            لینک کانال و راه ارتباط با فروشگاه در تلگرام، واتس‌اپ، بله، ایتا و
            اینستاگرام را اینجا وارد کنید؛ بخش «همراه ما باشید» صفحه‌های ثبت‌نام
            و حساب کاربری همین لینک‌ها را نشان می‌دهد.
          </p>
        </div>

        <button
          type="button"
          className="admin-btn"
          onClick={() => void loadChannels()}
          disabled={loading}
        >
          <span className="inline-flex items-center gap-2">
            <RefreshCw size={15} aria-hidden="true" />
            {loading ? "در حال دریافت..." : "بارگذاری مجدد"}
          </span>
        </button>
      </header>

      {error && (
        <div role="alert" className="admin-alert admin-alert-error">
          {error}
        </div>
      )}

      {success && (
        <div role="status" className="admin-alert admin-alert-success">
          <CheckCircle2 size={16} aria-hidden="true" />
          {success}
        </div>
      )}

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2 className="admin-card-title">راهنمای سریع</h2>
            <p className="admin-card-desc">
              {stats.total.toLocaleString("fa-IR")} کانال تعریف شده ·{" "}
              {stats.active.toLocaleString("fa-IR")} فعال ·{" "}
              {stats.ready.toLocaleString("fa-IR")} دارای لینک
            </p>
          </div>
        </div>

        <ul className="space-y-2 text-sm leading-7 text-[#4b5563]">
          <li>
            می‌توانید لینک کامل (<span dir="ltr">https://t.me/...</span>)، دامنه
            بدون پروتکل (<span dir="ltr">t.me/...</span>) یا نام کاربری (
            <span dir="ltr">@behrangshop</span>) وارد کنید؛ سرور خودش آدرس کامل
            می‌سازد.
          </li>
          <li>
            برای واتس‌اپ در فیلد «لینک ارسال پیام» شمارهٔ موبایل مثل{" "}
            <span dir="ltr">09121234567</span> کافی است.
          </li>
          <li>
            اگر کانالی لینک نداشته باشد یا خاموش شود، روی سایت دیده نمی‌شود؛
            رکورد حذف نمی‌شود.
          </li>
          <li>
            ارسال خودکار پیام (اعلان سفارش، پیامک گروهی، پاسخ چت) از بخش{" "}
            <Link
              to="/admin/messaging"
              className="font-bold text-brand-600 hover:text-brand-700"
            >
              پیام‌رسانی
            </Link>{" "}
            و با توکن ربات‌ها در فایل <span dir="ltr">.env</span> انجام می‌شود.
          </li>
        </ul>
      </section>

      {loading && channels.length === 0 ? (
        <div className="admin-card flex items-center justify-center gap-2 py-10 text-sm text-[#6b7280]">
          <Loader2 size={18} className="animate-spin" aria-hidden="true" />
          در حال دریافت کانال‌ها...
        </div>
      ) : (
        <div className="space-y-4">
          {channels.map((channel) => {
            const draft = drafts[channel.id] ?? draftFromRecord(channel);
            const key = isContactChannelKey(channel.key) ? channel.key : null;
            const meta = key ? CONTACT_CHANNEL_META[key] : null;
            const Icon = key ? CHANNEL_ICONS[key] : MessagesSquare;
            const busy = savingId === channel.id;
            const prefix = `channel-${channel.id}`;

            return (
              <form
                key={channel.id}
                className="admin-card"
                onSubmit={(event) => {
                  event.preventDefault();
                  void saveChannel(channel);
                }}
              >
                <div className="admin-card-head">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef4ea] text-[#4a6b4f]">
                      <Icon size={19} aria-hidden="true" />
                    </span>

                    <div>
                      <h2 className="admin-card-title">
                        {channel.title || meta?.label || channel.key}
                      </h2>
                      <p className="admin-card-desc">
                        {meta ? `${meta.label} · ` : ""}شناسه:{" "}
                        <span dir="ltr">{channel.key}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`admin-badge ${
                        channel.is_active
                          ? "admin-badge-green"
                          : "admin-badge-gray"
                      }`}
                    >
                      {channel.is_active ? "فعال" : "غیرفعال"}
                    </span>

                    <button
                      type="button"
                      className="admin-btn admin-btn-sm"
                      onClick={() => void toggleStatus(channel)}
                      disabled={statusId === channel.id}
                    >
                      {statusId === channel.id && (
                        <Loader2 size={14} className="animate-spin" />
                      )}
                      {channel.is_active ? "غیرفعال کردن" : "فعال کردن"}
                    </button>
                  </div>
                </div>

                <div className="admin-form-grid admin-form-grid-3">
                  <div className="admin-field">
                    <label className="admin-label" htmlFor={`${prefix}-title`}>
                      عنوان نمایشی *
                    </label>
                    <input
                      id={`${prefix}-title`}
                      className="admin-input"
                      value={draft.title}
                      onChange={(event) =>
                        updateDraft(channel.id, "title", event.target.value)
                      }
                      maxLength={80}
                      required
                    />
                  </div>

                  <div className="admin-field">
                    <label className="admin-label" htmlFor={`${prefix}-sort`}>
                      ترتیب نمایش
                    </label>
                    <input
                      id={`${prefix}-sort`}
                      className="admin-input"
                      type="number"
                      min={0}
                      max={9999}
                      value={draft.sort_order}
                      onChange={(event) =>
                        updateDraft(channel.id, "sort_order", event.target.value)
                      }
                    />
                    <span className="admin-help">عدد کوچک‌تر، بالاتر.</span>
                  </div>

                  <div className="admin-field admin-full">
                    <label
                      className="admin-label"
                      htmlFor={`${prefix}-description`}
                    >
                      توضیح کوتاه
                    </label>
                    <input
                      id={`${prefix}-description`}
                      className="admin-input"
                      value={draft.description}
                      onChange={(event) =>
                        updateDraft(
                          channel.id,
                          "description",
                          event.target.value,
                        )
                      }
                      maxLength={255}
                    />
                    <span className="admin-help">
                      زیر عنوان کانال روی سایت دیده می‌شود.
                    </span>
                  </div>

                  <div className="admin-field">
                    <label className="admin-label" htmlFor={`${prefix}-join-label`}>
                      برچسب دکمهٔ عضویت
                    </label>
                    <input
                      id={`${prefix}-join-label`}
                      className="admin-input"
                      value={draft.join_label}
                      onChange={(event) =>
                        updateDraft(channel.id, "join_label", event.target.value)
                      }
                      placeholder={meta?.joinLabel ?? ""}
                      maxLength={60}
                    />
                    <span className="admin-help">خالی بماند، متن پیش‌فرض.</span>
                  </div>

                  <div className="admin-field">
                    <label className="admin-label" htmlFor={`${prefix}-join-url`}>
                      لینک عضویت در کانال
                    </label>
                    <input
                      id={`${prefix}-join-url`}
                      className="admin-input"
                      dir="ltr"
                      value={draft.join_url}
                      onChange={(event) =>
                        updateDraft(channel.id, "join_url", event.target.value)
                      }
                      placeholder={meta?.joinPlaceholder ?? ""}
                      maxLength={2048}
                    />
                    <span className="admin-help">
                      خالی بماند، دکمهٔ عضویت نمایش داده نمی‌شود.
                    </span>
                  </div>

                  <div className="admin-field">
                    <label className="admin-label" htmlFor={`${prefix}-chat-label`}>
                      برچسب دکمهٔ ارسال پیام
                    </label>
                    <input
                      id={`${prefix}-chat-label`}
                      className="admin-input"
                      value={draft.chat_label}
                      onChange={(event) =>
                        updateDraft(channel.id, "chat_label", event.target.value)
                      }
                      placeholder={meta?.chatLabel ?? ""}
                      maxLength={60}
                    />
                  </div>

                  <div className="admin-field">
                    <label className="admin-label" htmlFor={`${prefix}-chat-url`}>
                      لینک ارسال پیام به فروشگاه
                    </label>
                    <input
                      id={`${prefix}-chat-url`}
                      className="admin-input"
                      dir="ltr"
                      value={draft.chat_url}
                      onChange={(event) =>
                        updateDraft(channel.id, "chat_url", event.target.value)
                      }
                      placeholder={meta?.chatPlaceholder ?? ""}
                      maxLength={2048}
                    />
                    <span className="admin-help">
                      خالی بماند، دکمهٔ ارسال پیام نمایش داده نمی‌شود.
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    {channel.join_url && (
                      <a
                        className="admin-btn admin-btn-sm"
                        href={channel.join_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink size={14} aria-hidden="true" />
                        پیش‌نمایش عضویت
                      </a>
                    )}

                    {channel.chat_url && (
                      <a
                        className="admin-btn admin-btn-sm"
                        href={channel.chat_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink size={14} aria-hidden="true" />
                        پیش‌نمایش پیام
                      </a>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="admin-btn admin-btn-primary"
                    disabled={busy}
                  >
                    {busy ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Save size={15} aria-hidden="true" />
                    )}
                    {busy ? "در حال ذخیره..." : "ذخیرهٔ کانال"}
                  </button>
                </div>
              </form>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AdminChannels;
