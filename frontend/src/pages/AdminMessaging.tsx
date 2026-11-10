import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertCircle,
  Cake,
  CalendarClock,
  CheckCircle2,
  Info,
  Megaphone,
  MessageCircle,
  PartyPopper,
  RefreshCw,
  Send,
  Smartphone,
  Trash2,
} from "lucide-react";
import { adminApi } from "../services/api";

type ChannelKey = "sms" | "telegram" | "whatsapp" | "bale";

type AudienceKey = "custom" | "order_phones" | "default";

type MessagingChannel = {
  key: ChannelKey;
  label: string;
  description: string;
  enabled: boolean;
  configured: boolean;
  available: boolean;
  default_recipient: string | null;
  template_name: string | null;
  recipient_label: string;
  recipient_placeholder: string;
  setup: string;
};

type MessagingSettings = {
  channels: MessagingChannel[];
  audiences: { order_phones: number };
  stats: { total: number; sent: number; failed: number; today: number };
  audience_limit: number;
};

type MessageStatus = "pending" | "sent" | "failed";

type MessageRecord = {
  id: number;
  channel: ChannelKey;
  recipient: string;
  body: string;
  status: MessageStatus;
  provider_message_id: string | null;
  error: string | null;
  sent_at: string | null;
  created_at: string | null;
  sender: { id: number; name: string } | null;
};

type PaginatedMessages = {
  data: MessageRecord[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
};

type SendResultItem = {
  id: number;
  recipient: string;
  status: MessageStatus;
  error: string | null;
  provider_message_id: string | null;
};

type SendResult = {
  sent: number;
  failed: number;
  total: number;
  results: SendResultItem[];
};

type ApiErrorResponse = {
  message?: string;
  errors?: Record<string, string[]>;
};

type BirthdaySettings = {
  enabled: boolean;
  channel: ChannelKey;
  template: string;
  send_time: string;
};

type BirthdayRecipient = {
  id: number;
  name: string;
  mobile: string;
  mobile_source: "profile" | "order" | null;
  birth_date: string | null;
  jalali_date: string;
  jalali_label: string;
  days_until: number;
  opted_out: boolean;
  status: MessageStatus | null;
  sent_at: string | null;
};

type BirthdayOverview = {
  settings: BirthdaySettings;
  channels: { key: ChannelKey; label: string; available: boolean; enabled: boolean }[];
  placeholders: string[];
  default_template: string;
  stats: {
    customers: number;
    reachable: number;
    today: number;
    today_sent: number;
    upcoming: number;
    sent_this_year: number;
  };
  today: BirthdayRecipient[];
  upcoming: BirthdayRecipient[];
  preview: string;
  store_name: string;
  jalali_today: string;
};

type BirthdaySendResult = {
  jalali_label: string;
  channel: ChannelKey;
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  results: { user_id: number; name: string; mobile: string; status: MessageStatus; error: string | null }[];
  overview: BirthdayOverview;
};

const EMPTY_CHANNELS: MessagingChannel[] = [];

const channelIcons = {
  sms: Smartphone,
  telegram: Send,
  whatsapp: MessageCircle,
  bale: Megaphone,
} as const;

const channelLabels: Record<ChannelKey, string> = {
  sms: "پیامک",
  telegram: "تلگرام",
  whatsapp: "واتساپ",
  bale: "بله",
};

const statusMeta: Record<MessageStatus, { label: string; className: string }> = {
  sent: { label: "ارسال شد", className: "msg-badge msg-badge-success" },
  failed: { label: "ناموفق", className: "msg-badge msg-badge-danger" },
  pending: { label: "در انتظار", className: "msg-badge msg-badge-muted" },
};

/**
 * وضعیت نمایشی هر تولد: رکورد ارسال، انصراف مشتری یا نبود شماره.
 */
function birthdayStatusMeta(record: {
  status: MessageStatus | null;
  opted_out: boolean;
  mobile: string;
}) {
  if (record.status) return statusMeta[record.status];
  if (record.opted_out) {
    return { label: "انصراف داده", className: "msg-badge msg-badge-muted" };
  }
  if (!record.mobile) {
    return { label: "بدون شماره", className: "msg-badge msg-badge-danger" };
  }

  return { label: "در انتظار", className: "msg-badge msg-badge-muted" };
}

/**
 * جدول مشترک تولدهای امروز و پیش‌رو.
 */
function BirthdayTable({
  records,
  emptyText,
  showDays = false,
}: {
  records: BirthdayRecipient[];
  emptyText: string;
  showDays?: boolean;
}) {
  if (records.length === 0) {
    return (
      <div className="msg-empty">
        <Info size={16} />
        <span>{emptyText}</span>
      </div>
    );
  }

  return (
    <div className="msg-table-wrap">
      <table className="msg-table">
        <thead>
          <tr>
            <th>مشتری</th>
            <th>موبایل</th>
            <th>تاریخ تولد</th>
            <th>وضعیت</th>
          </tr>
        </thead>

        <tbody>
          {records.map((record) => {
            const meta = birthdayStatusMeta(record);

            return (
              <tr key={record.id}>
                <td>
                  <span className="msg-bday-name">{record.name}</span>

                  {record.opted_out && (
                    <span className="msg-bday-note-inline">انصراف از دریافت</span>
                  )}
                </td>

                <td dir="ltr" className="msg-recipient">
                  {record.mobile || "—"}

                  {record.mobile_source === "order" && (
                    <span className="msg-bday-source">از سفارش</span>
                  )}
                </td>

                <td className="msg-time">
                  {record.jalali_label}

                  {showDays && (
                    <>
                      {" "}
                      — {formatNumber(record.days_until)} روز دیگر
                    </>
                  )}
                </td>

                <td>
                  <span className={meta.className}>{meta.label}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}



const numberFormatter = new Intl.NumberFormat("fa-IR");

function formatNumber(value: number) {
  return numberFormatter.format(Number(value) || 0);
}

function toLatinDigits(value: string) {
  const persian = "۰۱۲۳۴۵۶۷۸۹";
  const arabic = "٠١٢٣٤٥٦٧٨٩";

  return value.replace(/[۰-۹٠-٩]/g, (character) => {
    const persianIndex = persian.indexOf(character);
    if (persianIndex > -1) return String(persianIndex);

    const arabicIndex = arabic.indexOf(character);
    if (arabicIndex > -1) return String(arabicIndex);

    return character;
  });
}

function formatDateTime(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const responseError = error as { response?: { data?: ApiErrorResponse } };
  const data = responseError?.response?.data;

  if (data?.errors) {
    const firstError = Object.values(data.errors).flat()[0];
    if (firstError) return firstError;
  }

  return data?.message || fallback;
}

function AdminMessaging() {
  const [settings, setSettings] = useState<MessagingSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState("");

  const [channelKey, setChannelKey] = useState<ChannelKey>("sms");
  const [audience, setAudience] = useState<AudienceKey>("custom");
  const [recipientsText, setRecipientsText] = useState("");
  const [body, setBody] = useState("");
  const [asTemplate, setAsTemplate] = useState(false);
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState("");
  const [result, setResult] = useState<SendResult | null>(null);

  const [history, setHistory] = useState<PaginatedMessages | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [filterChannel, setFilterChannel] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [birthday, setBirthday] = useState<BirthdayOverview | null>(null);
  const [birthdayForm, setBirthdayForm] = useState<BirthdaySettings | null>(null);
  const [birthdayLoading, setBirthdayLoading] = useState(true);
  const [birthdaySaving, setBirthdaySaving] = useState(false);
  const [birthdaySending, setBirthdaySending] = useState(false);
  const [birthdayError, setBirthdayError] = useState("");
  const [birthdayMessage, setBirthdayMessage] = useState("");
  const [birthdayResult, setBirthdayResult] = useState<BirthdaySendResult | null>(null);

  const channels = settings?.channels ?? EMPTY_CHANNELS;

  const selectedChannel = useMemo(
    () => channels.find((channel) => channel.key === channelKey) ?? null,
    [channels, channelKey],
  );

  const customRecipients = useMemo(
    () =>
      recipientsText
        .split(/[\n,،;]+/)
        .map((value) => value.trim())
        .filter(Boolean),
    [recipientsText],
  );

  const smsParts = useMemo(
    () => Math.max(1, Math.ceil(toLatinDigits(body).length / 70)),
    [body],
  );

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);

    try {
      const response = await adminApi.get("/admin/messaging/settings");
      setSettings(response.data.data);
      setSettingsError("");
    } catch (error) {
      setSettingsError(
        getApiErrorMessage(error, "دریافت وضعیت کانال‌های پیام‌رسانی ناموفق بود."),
      );
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);

    try {
      const response = await adminApi.get("/admin/messaging", {
        params: {
          page,
          channel: filterChannel || undefined,
          status: filterStatus || undefined,
          search: debouncedSearch || undefined,
        },
      });

      setHistory(response.data.data);
      setHistoryError("");
    } catch (error) {
      setHistoryError(getApiErrorMessage(error, "دریافت تاریخچهٔ ارسال‌ها ناموفق بود."));
    } finally {
      setHistoryLoading(false);
    }
  }, [page, filterChannel, filterStatus, debouncedSearch]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search.trim());
    }, 400);

    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const applyBirthdayOverview = useCallback((overview: BirthdayOverview) => {
    setBirthday(overview);
    setBirthdayForm(overview.settings);
  }, []);

  const loadBirthday = useCallback(async () => {
    setBirthdayLoading(true);

    try {
      const response = await adminApi.get("/admin/messaging/birthday");
      applyBirthdayOverview(response.data.data as BirthdayOverview);
      setBirthdayError("");
    } catch (error) {
      setBirthdayError(
        getApiErrorMessage(error, "دریافت وضعیت تبریک تولد ناموفق بود."),
      );
    } finally {
      setBirthdayLoading(false);
    }
  }, [applyBirthdayOverview]);

  useEffect(() => {
    void loadBirthday();
  }, [loadBirthday]);

  const handleBirthdaySave = async (event: FormEvent) => {
    event.preventDefault();

    if (!birthdayForm || birthdaySaving) return;

    setBirthdayError("");
    setBirthdayMessage("");

    if (birthdayForm.template.trim().length < 10) {
      setBirthdayError("متن تبریک باید حداقل ۱۰ نویسه باشد.");
      return;
    }

    setBirthdaySaving(true);

    try {
      const response = await adminApi.put("/admin/messaging/birthday", {
        enabled: birthdayForm.enabled,
        channel: birthdayForm.channel,
        template: birthdayForm.template.trim(),
        send_time: birthdayForm.send_time,
      });

      applyBirthdayOverview(response.data.data as BirthdayOverview);
      setBirthdayMessage(
        response.data.message || "تنظیمات تبریک تولد ذخیره شد.",
      );
    } catch (error) {
      setBirthdayError(
        getApiErrorMessage(error, "ذخیرهٔ تنظیمات تبریک تولد ناموفق بود."),
      );
    } finally {
      setBirthdaySaving(false);
    }
  };

  const handleBirthdaySend = async (force: boolean) => {
    if (birthdaySending) return;

    if (
      force &&
      !window.confirm(
        "ارسال دوباره به همهٔ مشتریانِ امروز — حتی کسانی که قبلاً پیام گرفته‌اند. ادامه می‌دهید؟",
      )
    ) {
      return;
    }

    setBirthdayError("");
    setBirthdayMessage("");
    setBirthdayResult(null);
    setBirthdaySending(true);

    try {
      const response = await adminApi.post("/admin/messaging/birthday/send", {
        force,
      });

      const data = response.data.data as BirthdaySendResult;

      setBirthdayResult(data);
      applyBirthdayOverview(data.overview);
      setBirthdayMessage(response.data.message || "");

      if (data.sent > 0) {
        void loadHistory();
        void loadSettings();
      }
    } catch (error) {
      setBirthdayError(
        getApiErrorMessage(error, "ارسال تبریک تولد ناموفق بود."),
      );
    } finally {
      setBirthdaySending(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (sending) return;

    setFormError("");
    setResult(null);

    const trimmedBody = body.trim();

    if (!trimmedBody) {
      setFormError("متن پیام را وارد کنید.");
      return;
    }

    if (audience === "custom" && customRecipients.length === 0) {
      setFormError("حداقل یک گیرنده وارد کنید.");
      return;
    }

    setSending(true);

    try {
      const response = await adminApi.post("/admin/messaging/send", {
        channel: channelKey,
        body: trimmedBody,
        audience,
        recipients: audience === "custom" ? customRecipients : [],
        as_template: asTemplate,
      });

      setResult(response.data.data as SendResult);

      if (!response.data.data.failed) {
        setBody("");
      }

      await Promise.all([loadHistory(), loadSettings()]);
    } catch (error) {
      setFormError(getApiErrorMessage(error, "ارسال پیام ناموفق بود."));
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (deletingId) return;

    const confirmed = window.confirm("این رکورد از تاریخچه حذف شود؟");
    if (!confirmed) return;

    setDeletingId(id);

    try {
      await adminApi.delete(`/admin/messaging/${id}`);
      await loadHistory();
    } catch (error) {
      setHistoryError(getApiErrorMessage(error, "حذف رکورد ناموفق بود."));
    } finally {
      setDeletingId(null);
    }
  };

  const isAvailable = Boolean(selectedChannel?.available);

  const birthdayPreview = useMemo(() => {
    if (!birthdayForm) return "";

    const sampleName = birthday?.today[0]?.name ?? "سارا محمدی";
    const firstName = sampleName.trim().split(/\s+/)[0] ?? sampleName;

    return birthdayForm.template
      .replaceAll("{name}", sampleName)
      .replaceAll("{first_name}", firstName)
      .replaceAll("{store}", birthday?.store_name ?? "فروشگاه")
      .replaceAll("{date}", birthday?.jalali_today ?? "");
  }, [birthdayForm, birthday]);

  const birthdayChannelAvailable = useMemo(() => {
    if (!birthday?.channels || !birthdayForm) return false;

    return Boolean(
      birthday.channels.find((channel) => channel.key === birthdayForm.channel)
        ?.available,
    );
  }, [birthday, birthdayForm]);

  const insertBirthdayPlaceholder = (placeholder: string) => {
    setBirthdayForm((current) =>
      current
        ? { ...current, template: `${current.template}${placeholder}`.slice(0, 1000) }
        : current,
    );
  };

  return (
    <div className="msg-page">
      <style>{msgStyles}</style>
      <header className="msg-header">
        <div className="msg-header-text">
          <span className="msg-eyebrow">
            <Megaphone size={15} />
            مرکز پیام‌رسانی
          </span>
          <h1>پنل ارسال پیام</h1>
          <p>
            اطلاع‌رسانی به مشتریان از طریق پیامک، تلگرام، واتساپ و پیام‌رسان بله — همه از یک صفحه.
          </p>
        </div>

        <div className="msg-stats">
          <div className="msg-stat">
            <span>کل ارسال‌ها</span>
            <strong>{formatNumber(settings?.stats.total ?? 0)}</strong>
          </div>
          <div className="msg-stat">
            <span>موفق</span>
            <strong>{formatNumber(settings?.stats.sent ?? 0)}</strong>
          </div>
          <div className="msg-stat">
            <span>ناموفق</span>
            <strong>{formatNumber(settings?.stats.failed ?? 0)}</strong>
          </div>
          <div className="msg-stat">
            <span>امروز</span>
            <strong>{formatNumber(settings?.stats.today ?? 0)}</strong>
          </div>

          <button
            type="button"
            className="msg-ghost-button"
            onClick={() => {
              void loadSettings();
              void loadHistory();
            }}
            disabled={settingsLoading || historyLoading}
          >
            <RefreshCw size={15} className={settingsLoading || historyLoading ? "msg-spin" : ""} />
            به‌روزرسانی
          </button>
        </div>
      </header>

      {settingsError && (
        <div className="msg-alert msg-alert-error" role="alert">
          <AlertCircle size={16} />
          <span>{settingsError}</span>
        </div>
      )}

      <section className="msg-channels" aria-label="کانال‌های پیام‌رسانی">
        {settingsLoading && !settings
          ? [0, 1, 2, 3].map((index) => <div key={index} className="msg-channel msg-channel-skeleton" />)
          : channels.map((channel) => {
              const Icon = channelIcons[channel.key] ?? Megaphone;
              const isActive = channel.key === channelKey;

              return (
                <button
                  key={channel.key}
                  type="button"
                  className={`msg-channel${isActive ? " is-active" : ""}${
                    channel.available ? "" : " is-off"
                  }`}
                  onClick={() => {
                    setChannelKey(channel.key);
                    setResult(null);
                    setFormError("");
                    setAsTemplate(false);
                  }}
                  aria-pressed={isActive}
                >
                  <span className="msg-channel-top">
                    <span className="msg-channel-icon">
                      <Icon size={18} />
                    </span>
                    <span
                      className={`msg-status-dot${
                        channel.available ? " is-on" : " is-off"
                      }`}
                    />
                  </span>

                  <strong>{channel.label}</strong>

                  <span className="msg-channel-state">
                    {channel.available
                      ? "آماده ارسال"
                      : channel.enabled
                        ? "نیاز به تنظیمات"
                        : "غیرفعال"}
                  </span>
                </button>
              );
            })}
      </section>

      <section className="msg-card msg-composer">
        <div className="msg-card-head">
          <div>
            <h2>ارسال پیام جدید</h2>
            <p>
              {selectedChannel?.description ||
                "یکی از کانال‌های بالا را برای ارسال پیام انتخاب کنید."}
            </p>
          </div>

          {selectedChannel && (
            <span
              className={
                isAvailable ? "msg-pill msg-pill-success" : "msg-pill msg-pill-warning"
              }
            >
              {isAvailable ? "کانال فعال" : "کانال تنظیم نشده"}
            </span>
          )}
        </div>

        {selectedChannel && !isAvailable && (
          <div className="msg-alert msg-alert-warning">
            <Info size={16} />
            <span>
              برای فعال‌سازی این کانال این مقادیر را در فایل <code>backend/.env</code> وارد
              کنید: {selectedChannel.setup}
            </span>
          </div>
        )}

        <form className="msg-form" onSubmit={handleSubmit}>
          <div className="msg-field">
            <span className="msg-label">گیرندگان</span>

            <div className="msg-audience">
              <button
                type="button"
                className={audience === "custom" ? "is-active" : ""}
                onClick={() => setAudience("custom")}
              >
                گیرندگان دلخواه
              </button>

              <button
                type="button"
                className={audience === "order_phones" ? "is-active" : ""}
                onClick={() => setAudience("order_phones")}
                disabled={(settings?.audiences.order_phones ?? 0) === 0}
              >
                شماره‌های سفارش‌ها ({formatNumber(settings?.audiences.order_phones ?? 0)})
              </button>

              {selectedChannel?.default_recipient && (
                <button
                  type="button"
                  className={audience === "default" ? "is-active" : ""}
                  onClick={() => setAudience("default")}
                >
                  مقصد پیش‌فرض کانال
                </button>
              )}
            </div>
          </div>

          {audience === "custom" && (
            <label className="msg-field">
              <span className="msg-label">
                {selectedChannel?.recipient_label || "گیرنده"}
              </span>

              <textarea
                className="msg-input msg-textarea"
                rows={3}
                value={recipientsText}
                onChange={(event) => setRecipientsText(event.target.value)}
                placeholder={selectedChannel?.recipient_placeholder || "09121234567"}
                dir="ltr"
              />

              <span className="msg-hint">
                هر گیرنده را در یک خط (یا جدا شده با ویرگول) وارد کنید —{" "}
                {formatNumber(customRecipients.length)} گیرنده.
              </span>
            </label>
          )}

          {audience === "order_phones" && (
            <div className="msg-readonly">
              پیام برای همهٔ شماره‌های ثبت‌شده در سفارش‌ها ارسال می‌شود (حداکثر{" "}
              {formatNumber(settings?.audience_limit ?? 0)} گیرنده).
            </div>
          )}

          {audience === "default" && selectedChannel?.default_recipient && (
            <div className="msg-readonly">
              ارسال به مقصد پیش‌فرض کانال:{" "}
              <strong dir="ltr">{selectedChannel.default_recipient}</strong>
            </div>
          )}

          <label className="msg-field">
            <span className="msg-label">متن پیام</span>

            <textarea
              className="msg-input msg-textarea msg-body-input"
              rows={6}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="متن پیام خود را بنویسید..."
              maxLength={3000}
            />

            <span className="msg-hint">
              {formatNumber(body.length)} نویسه
              {channelKey === "sms" && <> — {formatNumber(smsParts)} بخش پیامک</>}
              {" "}— حداکثر ۳۰۰۰ نویسه
            </span>
          </label>

          {channelKey === "whatsapp" && selectedChannel?.template_name && (
            <label className="msg-checkbox">
              <input
                type="checkbox"
                checked={asTemplate}
                onChange={(event) => setAsTemplate(event.target.checked)}
              />
              <span>
                ارسال در قالب Template «{selectedChannel.template_name}» (برای پیام خارج از
                پنجرهٔ ۲۴ ساعتهٔ واتساپ)
              </span>
            </label>
          )}

          {formError && (
            <div className="msg-alert msg-alert-error" role="alert">
              <AlertCircle size={16} />
              <span>{formError}</span>
            </div>
          )}

          {result && (
            <div className="msg-result">
              <div
                className={`msg-alert ${
                  result.failed ? "msg-alert-warning" : "msg-alert-success"
                }`}
              >
                {result.failed ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                <span>
                  {result.failed === 0
                    ? `${formatNumber(result.sent)} پیام با موفقیت ارسال شد.`
                    : `${formatNumber(result.sent)} موفق و ${formatNumber(
                        result.failed,
                      )} ناموفق از ${formatNumber(result.total)} گیرنده.`}
                </span>
              </div>

              {result.results.some((item) => item.error) && (
                <ul className="msg-result-list">
                  {result.results
                    .filter((item) => item.error)
                    .map((item) => (
                      <li key={item.id}>
                        <span dir="ltr">{item.recipient}</span>
                        <span className="msg-result-error">{item.error}</span>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          )}

          <div className="msg-actions">
            <button
              type="submit"
              className="msg-primary-button"
              disabled={sending || !isAvailable}
            >
              {sending ? (
                <RefreshCw size={16} className="msg-spin" />
              ) : (
                <Send size={16} />
              )}
              {sending ? "در حال ارسال..." : "ارسال پیام"}
            </button>

            <span className="msg-hint">
              حداکثر {formatNumber(settings?.audience_limit ?? 0)} گیرنده در هر ارسال.
            </span>
          </div>

        </form>
      </section>

      <section className="msg-card msg-birthday">
        <div className="msg-card-head">
          <div>
            <h2 className="msg-bday-title">
              <Cake size={18} />
              تبریک تولد خودکار
            </h2>
            <p>
              در روز تولد شمسی هر مشتری، پیام تبریک به‌صورت خودکار ارسال می‌شود. تاریخ تولد
              هنگام ثبت‌نام یا از بخش «حساب کاربری» ثبت می‌شود و مشتری می‌تواند از دریافت آن
              انصراف دهد.
            </p>
          </div>

          {birthdayForm && (
            <label className="msg-switch">
              <input
                type="checkbox"
                checked={birthdayForm.enabled}
                onChange={(event) =>
                  setBirthdayForm({
                    ...birthdayForm,
                    enabled: event.target.checked,
                  })
                }
                aria-label="فعال بودن تبریک تولد خودکار"
              />
              <span className="msg-switch-track" aria-hidden="true">
                <span />
              </span>
              <span className="msg-switch-text">
                {birthdayForm.enabled ? "فعال" : "غیرفعال"}
              </span>
            </label>
          )}
        </div>

        {birthdayError && (
          <div className="msg-alert msg-alert-error" role="alert">
            <AlertCircle size={16} />
            <span>{birthdayError}</span>
          </div>
        )}

        {birthdayMessage && (
          <div className="msg-alert msg-alert-success" role="status">
            <CheckCircle2 size={16} />
            <span>{birthdayMessage}</span>
          </div>
        )}

        {birthdayLoading && !birthdayForm ? (
          <div className="msg-table-skeleton">
            {[0, 1, 2].map((index) => (
              <div key={index} className="msg-skeleton-row" />
            ))}
          </div>
        ) : birthday && birthdayForm ? (
          <>
            <div className="msg-bday-stats">
              <div className="msg-stat">
                <span>مشتری با تاریخ تولد</span>
                <strong>{formatNumber(birthday.stats.customers)}</strong>
              </div>
              <div className="msg-stat">
                <span>قابل ارسال</span>
                <strong>{formatNumber(birthday.stats.reachable)}</strong>
              </div>
              <div className="msg-stat">
                <span>تولد امروز</span>
                <strong>{formatNumber(birthday.stats.today)}</strong>
              </div>
              <div className="msg-stat">
                <span>ارسال‌شدهٔ امسال</span>
                <strong>{formatNumber(birthday.stats.sent_this_year)}</strong>
              </div>
            </div>

            <form className="msg-form msg-bday-form" onSubmit={handleBirthdaySave}>
              <div className="msg-bday-row">
                <label className="msg-field">
                  <span className="msg-label">کانال ارسال</span>

                  <select
                    className="msg-input msg-select"
                    value={birthdayForm.channel}
                    onChange={(event) =>
                      setBirthdayForm({
                        ...birthdayForm,
                        channel: event.target.value as ChannelKey,
                      })
                    }
                  >
                    {birthday.channels.map((channel) => (
                      <option
                        key={channel.key}
                        value={channel.key}
                        disabled={!channel.available}
                      >
                        {channel.label}
                        {channel.available ? "" : " — تنظیم نشده"}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="msg-field">
                  <span className="msg-label">ساعت ارسال</span>

                  <input
                    type="time"
                    className="msg-input msg-time-input"
                    dir="ltr"
                    value={birthdayForm.send_time}
                    onChange={(event) =>
                      setBirthdayForm({
                        ...birthdayForm,
                        send_time: event.target.value,
                      })
                    }
                    required
                  />

                  <span className="msg-hint">
                    زمان‌بندی هر ۱۵ دقیقه بررسی می‌شود؛ پیام در اولین بررسیِ بعد از این ساعت
                    ارسال می‌شود.
                  </span>
                </label>
              </div>

              {!birthdayChannelAvailable && (
                <div className="msg-alert msg-alert-warning">
                  <Info size={16} />
                  <span>
                    کانال انتخاب‌شده هنوز در <code>backend/.env</code> تنظیم نشده است؛ تا آن
                    زمان ارسال خودکار انجام نمی‌شود.
                  </span>
                </div>
              )}

              <label className="msg-field">
                <span className="msg-label">متن پیام تبریک</span>

                <textarea
                  className="msg-input msg-textarea"
                  rows={5}
                  maxLength={1000}
                  value={birthdayForm.template}
                  onChange={(event) =>
                    setBirthdayForm({
                      ...birthdayForm,
                      template: event.target.value,
                    })
                  }
                  placeholder="{name} عزیز، زادروزت مبارک!"
                />

                <span className="msg-hint">
                  متغیرها به‌صورت خودکار با اطلاعات هر مشتری جایگزین می‌شوند؛ برای افزودن،
                  روی آن‌ها کلیک کنید.
                </span>
              </label>

              <div className="msg-bday-chips">
                {birthday.placeholders.map((placeholder) => (
                  <button
                    key={placeholder}
                    type="button"
                    className="msg-ghost-button"
                    onClick={() => insertBirthdayPlaceholder(placeholder)}
                  >
                    {placeholder}
                  </button>
                ))}

                {birthday.default_template &&
                  birthdayForm.template !== birthday.default_template && (
                    <button
                      type="button"
                      className="msg-ghost-button msg-bday-reset"
                      onClick={() =>
                        setBirthdayForm({
                          ...birthdayForm,
                          template: birthday.default_template,
                        })
                      }
                      title="بازگرداندن متن پیش‌فرض فروشگاه"
                    >
                      متن پیش‌فرض
                    </button>
                  )}
              </div>

              <div className="msg-bday-preview">
                <span className="msg-label">پیش‌نمایش</span>
                <p>{birthdayPreview}</p>
                <span className="msg-hint">
                  {formatNumber(birthdayPreview.length)} نویسه
                  {birthdayForm.channel === "sms" && (
                    <>
                      {" "}
                      —{" "}
                      {formatNumber(
                        Math.max(1, Math.ceil(birthdayPreview.length / 70)),
                      )}{" "}
                      بخش پیامک
                    </>
                  )}
                </span>
              </div>

              <div className="msg-actions">
                <button
                  type="submit"
                  className="msg-primary-button"
                  disabled={birthdaySaving}
                >
                  {birthdaySaving ? (
                    <RefreshCw size={16} className="msg-spin" />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  {birthdaySaving ? "در حال ذخیره..." : "ذخیرهٔ تنظیمات"}
                </button>

                <button
                  type="button"
                  className="msg-ghost-button"
                  onClick={() => void handleBirthdaySend(false)}
                  disabled={birthdaySending || !birthdayChannelAvailable}
                >
                  {birthdaySending ? (
                    <RefreshCw size={15} className="msg-spin" />
                  ) : (
                    <Send size={15} />
                  )}
                  ارسال تبریک امروز
                </button>

                {birthday.stats.today > 0 && (
                  <button
                    type="button"
                    className="msg-ghost-button"
                    onClick={() => void handleBirthdaySend(true)}
                    disabled={birthdaySending || !birthdayChannelAvailable}
                    title="ارسال دوباره به همهٔ تولدهای امروز، حتی ارسال‌شده‌ها"
                  >
                    ارسال دوباره
                  </button>
                )}
              </div>
            </form>

            {birthdayResult && birthdayResult.results.length > 0 && (
              <ul className="msg-result-list msg-bday-result">
                {birthdayResult.results.map((item) => (
                  <li key={item.user_id}>
                    <span>
                      {item.name} — <span dir="ltr">{item.mobile}</span>
                    </span>
                    <span
                      className={
                        item.status === "sent" ? "msg-result-ok" : "msg-result-error"
                      }
                    >
                      {item.error ??
                        (item.status === "sent" ? "ارسال شد" : "ناموفق")}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="msg-bday-lists">
              <div className="msg-bday-block">
                <h3>
                  <PartyPopper size={16} />
                  تولدهای امروز ({formatNumber(birthday.stats.today)})
                </h3>

                <BirthdayTable
                  records={birthday.today}
                  emptyText="امروز تولدی ثبت نشده است."
                />
              </div>

              <div className="msg-bday-block">
                <h3>
                  <CalendarClock size={16} />
                  تولدهای ۷ روز آینده ({formatNumber(birthday.stats.upcoming)})
                </h3>

                <BirthdayTable
                  records={birthday.upcoming}
                  emptyText="در هفتهٔ آینده تولدی ثبت نشده است."
                  showDays
                />
              </div>
            </div>

            <p className="msg-bday-note">
              برای ارسال خودکار، کرون سرور باید هر دقیقه فرمان{" "}
              <code>php artisan schedule:run</code> را اجرا کند.
            </p>
          </>
        ) : (
          <div className="msg-empty">
            <Info size={18} />
            <span>اطلاعات تبریک تولد در دسترس نیست.</span>
          </div>
        )}
      </section>

      <section className="msg-card msg-history">
        <div className="msg-card-head">
          <div>
            <h2>تاریخچهٔ ارسال‌ها</h2>
            <p>{formatNumber(history?.total ?? 0)} رکورد ثبت شده است.</p>
          </div>

          <div className="msg-filters">
            <input
              className="msg-input msg-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="جست‌وجو در گیرنده یا متن..."
              aria-label="جست‌وجو در تاریخچه"
            />

            <select
              className="msg-input msg-select"
              value={filterChannel}
              onChange={(event) => {
                setPage(1);
                setFilterChannel(event.target.value);
              }}
              aria-label="فیلتر کانال"
            >
              <option value="">همهٔ کانال‌ها</option>
              {(Object.keys(channelLabels) as ChannelKey[]).map((key) => (
                <option key={key} value={key}>
                  {channelLabels[key]}
                </option>
              ))}
            </select>

            <select
              className="msg-input msg-select"
              value={filterStatus}
              onChange={(event) => {
                setPage(1);
                setFilterStatus(event.target.value);
              }}
              aria-label="فیلتر وضعیت"
            >
              <option value="">همهٔ وضعیت‌ها</option>
              <option value="sent">ارسال شد</option>
              <option value="failed">ناموفق</option>
              <option value="pending">در انتظار</option>
            </select>
          </div>
        </div>

        {historyError && (
          <div className="msg-alert msg-alert-error" role="alert">
            <AlertCircle size={16} />
            <span>{historyError}</span>
          </div>
        )}

        {historyLoading ? (
          <div className="msg-table-skeleton">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="msg-skeleton-row" />
            ))}
          </div>
        ) : !history || history.data.length === 0 ? (
          <div className="msg-empty">
            <Info size={18} />
            <span>هنوز پیامی با این شرایط ثبت نشده است.</span>
          </div>
        ) : (
          <div className="msg-table-wrap">
            <table className="msg-table">
              <thead>
                <tr>
                  <th>کانال</th>
                  <th>گیرنده</th>
                  <th>متن پیام</th>
                  <th>وضعیت</th>
                  <th>مدیر</th>
                  <th>زمان</th>
                  <th aria-label="عملیات" />
                </tr>
              </thead>

              <tbody>
                {history.data.map((message) => {
                  const Icon = channelIcons[message.channel] ?? Megaphone;
                  const meta = statusMeta[message.status] ?? statusMeta.pending;

                  return (
                    <tr key={message.id}>
                      <td>
                        <span className="msg-channel-chip">
                          <Icon size={14} />
                          {channelLabels[message.channel] ?? message.channel}
                        </span>
                      </td>

                      <td dir="ltr" className="msg-recipient">
                        {message.recipient}
                      </td>

                      <td>
                        <span className="msg-body-preview" title={message.body}>
                          {message.body}
                        </span>

                        {message.error && (
                          <span className="msg-error-text" title={message.error}>
                            {message.error}
                          </span>
                        )}
                      </td>

                      <td>
                        <span className={meta.className}>{meta.label}</span>
                      </td>

                      <td>{message.sender?.name ?? "—"}</td>

                      <td className="msg-time">
                        {formatDateTime(message.sent_at ?? message.created_at)}
                      </td>

                      <td>
                        <button
                          type="button"
                          className="msg-icon-button"
                          onClick={() => void handleDelete(message.id)}
                          disabled={deletingId === message.id}
                          aria-label="حذف رکورد از تاریخچه"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {history && history.last_page > 1 && (
          <div className="msg-pagination">
            <button
              type="button"
              className="msg-ghost-button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || historyLoading}
            >
              قبلی
            </button>

            <span>
              صفحهٔ {formatNumber(history.current_page)} از {formatNumber(history.last_page)}
            </span>

            <button
              type="button"
              className="msg-ghost-button"
              onClick={() => setPage((current) => Math.min(history.last_page, current + 1))}
              disabled={page >= history.last_page || historyLoading}
            >
              بعدی
            </button>
          </div>
        )}
      </section>

    </div>
  );
}

const msgStyles = `
.msg-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 4px 0 28px;
  color: #2f4a33;
}

.msg-page * { box-sizing: border-box; }

/* ---------- Header ---------- */
.msg-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  padding: 22px;
  border: 1px solid #e2ecdd;
  border-radius: 20px;
  background: linear-gradient(135deg, #f4f8f0 0%, #ffffff 62%);
}

.msg-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: #eaf2e5;
  color: #4f7754;
  font-size: 12px;
  font-weight: 700;
}

.msg-header h1 {
  margin: 10px 0 6px;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.2px;
}

.msg-header p {
  margin: 0;
  max-width: 54ch;
  font-size: 13.5px;
  line-height: 1.9;
  color: #77897a;
}

.msg-stats {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.msg-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 78px;
  padding: 8px 12px;
  border: 1px solid #e2ecdd;
  border-radius: 14px;
  background: #ffffff;
}

.msg-stat span {
  font-size: 11.5px;
  font-weight: 600;
  color: #8a9c8b;
}

.msg-stat strong {
  font-size: 17px;
  font-weight: 800;
}

/* ---------- Channel cards ---------- */
.msg-channels {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.msg-channel {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  text-align: right;
  cursor: pointer;
  border: 1px solid #e2ecdd;
  border-radius: 16px;
  background: #ffffff;
  color: inherit;
  font-family: inherit;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.msg-channel:hover {
  border-color: #b9d0b2;
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgba(47, 74, 51, 0.08);
}

.msg-channel.is-active {
  border-color: #4f7754;
  background: #f4f8f0;
  box-shadow: 0 10px 24px rgba(79, 119, 84, 0.16);
}

.msg-channel.is-off { opacity: 0.78; }

.msg-channel-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.msg-channel-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 11px;
  background: #eef4ea;
  color: #4f7754;
}

.msg-channel strong { font-size: 14.5px; font-weight: 800; }

.msg-channel-state { font-size: 12px; color: #8a9c8b; }

.msg-status-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

.msg-status-dot.is-on { background: #4caf50; box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.16); }
.msg-status-dot.is-off { background: #c7cfc6; }

.msg-channel-skeleton {
  height: 96px;
  border-style: dashed;
  animation: msg-pulse 1.4s ease-in-out infinite;
}

/* ---------- Buttons ---------- */
.msg-ghost-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 13px;
  border: 1px solid #dbe6d6;
  border-radius: 12px;
  background: #ffffff;
  color: #4f7754;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.18s ease, border-color 0.18s ease;
}

.msg-ghost-button:hover:not(:disabled) { background: #f4f8f0; border-color: #b9d0b2; }
.msg-ghost-button:disabled { opacity: 0.55; cursor: not-allowed; }

.msg-primary-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 22px;
  border: none;
  border-radius: 13px;
  background: #4f7754;
  color: #ffffff;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 10px 22px rgba(79, 119, 84, 0.22);
  transition: background 0.18s ease, transform 0.18s ease;
}

.msg-primary-button:hover:not(:disabled) { background: #43684a; transform: translateY(-1px); }
.msg-primary-button:disabled { opacity: 0.6; cursor: not-allowed; box-shadow: none; }

.msg-icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid #f0dcd8;
  border-radius: 9px;
  background: #fff7f5;
  color: #c05a4a;
  cursor: pointer;
  transition: background 0.18s ease;
}

.msg-icon-button:hover:not(:disabled) { background: #fdeae5; }
.msg-icon-button:disabled { opacity: 0.5; cursor: not-allowed; }

/* ---------- Alerts & pills ---------- */
.msg-alert {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 13px;
  border-radius: 12px;
  font-size: 12.5px;
  line-height: 1.85;
}

.msg-alert code {
  padding: 1px 5px;
  border-radius: 6px;
  background: rgba(47, 74, 51, 0.08);
  font-size: 12px;
}

.msg-alert-error { background: #fdecea; color: #a53f34; }
.msg-alert-warning { background: #fff6e6; color: #96651a; }
.msg-alert-success { background: #ecf7ec; color: #2f6b3a; }

.msg-pill {
  padding: 5px 11px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  white-space: nowrap;
}

.msg-pill-success { background: #eaf6ea; color: #2f6b3a; }
.msg-pill-warning { background: #fff3df; color: #96651a; }

@keyframes msg-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}

.msg-spin { animation: msg-rotate 0.9s linear infinite; }

@keyframes msg-rotate {
  to { transform: rotate(360deg); }
}
/* ---------- Cards & form ---------- */
.msg-card {
  padding: 20px;
  border: 1px solid #e2ecdd;
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 14px 30px rgba(47, 74, 51, 0.06);
}

.msg-card-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.msg-card-head h2 {
  margin: 0 0 6px;
  font-size: 16.5px;
  font-weight: 800;
}

.msg-card-head p {
  margin: 0;
  max-width: 70ch;
  font-size: 12.5px;
  line-height: 1.85;
  color: #77897a;
}

.msg-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.msg-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.msg-label {
  font-size: 12.5px;
  font-weight: 700;
  color: #4f7754;
}

.msg-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #dbe6d6;
  border-radius: 12px;
  background: #fbfdf9;
  color: #2f4a33;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.8;
  outline: none;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.msg-input:focus {
  border-color: #8db08a;
  box-shadow: 0 0 0 3px rgba(141, 176, 138, 0.2);
}

.msg-textarea { resize: vertical; min-height: 76px; }

.msg-body-input { min-height: 132px; }

.msg-hint {
  font-size: 11.5px;
  color: #8a9c8b;
}

.msg-audience {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.msg-audience button {
  padding: 8px 14px;
  border: 1px solid #dbe6d6;
  border-radius: 999px;
  background: #ffffff;
  color: #5a6f5c;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
}

.msg-audience button:hover:not(:disabled) { border-color: #b9d0b2; }

.msg-audience button.is-active {
  background: #4f7754;
  border-color: #4f7754;
  color: #ffffff;
}

.msg-audience button:disabled { opacity: 0.5; cursor: not-allowed; }

.msg-readonly {
  padding: 10px 13px;
  border: 1px dashed #dbe6d6;
  border-radius: 12px;
  background: #f8fbf6;
  font-size: 12.5px;
  line-height: 1.85;
  color: #6d8070;
}

.msg-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12.5px;
  line-height: 1.85;
  color: #5a6f5c;
  cursor: pointer;
}

.msg-checkbox input { margin-top: 3px; accent-color: #4f7754; }

.msg-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding-top: 4px;
}

.msg-result { display: flex; flex-direction: column; gap: 8px; }

.msg-result-list {
  margin: 0;
  padding: 0 16px 0 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: #a53f34;
}

.msg-result-list li { display: flex; flex-wrap: wrap; gap: 6px; }

.msg-result-error { color: #c05a4a; }

/* ---------- History ---------- */
.msg-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.msg-search { width: 210px; }
.msg-select { width: 150px; cursor: pointer; }

.msg-table-wrap { overflow-x: auto; }

.msg-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}

.msg-table th {
  padding: 9px 10px;
  text-align: right;
  font-size: 11.5px;
  font-weight: 700;
  color: #8a9c8b;
  border-bottom: 1px solid #e8f0e3;
  white-space: nowrap;
}

.msg-table td {
  padding: 11px 10px;
  border-bottom: 1px solid #f1f6ee;
  vertical-align: top;
  color: #43564a;
}

.msg-table tbody tr:hover { background: #fafdf8; }

.msg-channel-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  border-radius: 999px;
  background: #eef4ea;
  color: #4f7754;
  font-size: 11.5px;
  font-weight: 700;
  white-space: nowrap;
}

.msg-recipient {
  font-family: "Vazirmatn", monospace;
  font-size: 12px;
  white-space: nowrap;
}

.msg-body-preview {
  display: block;
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.msg-error-text {
  display: block;
  max-width: 260px;
  margin-top: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  color: #c05a4a;
}

.msg-time { white-space: nowrap; font-size: 11.5px; color: #8a9c8b; }

.msg-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.msg-badge-success { background: #eaf6ea; color: #2f6b3a; }
.msg-badge-danger { background: #fdecea; color: #a53f34; }
.msg-badge-muted { background: #f1f3f0; color: #7b887c; }

.msg-table-skeleton { display: flex; flex-direction: column; gap: 8px; }

.msg-skeleton-row {
  height: 38px;
  border-radius: 10px;
  background: #f4f8f0;
  animation: msg-pulse 1.4s ease-in-out infinite;
}

.msg-empty {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 26px 16px;
  border: 1px dashed #dbe6d6;
  border-radius: 14px;
  background: #fafdf8;
  color: #8a9c8b;
  font-size: 12.5px;
}

.msg-pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 14px;
  font-size: 12.5px;
  color: #6d8070;
}

/* ---------- Birthday greetings ---------- */
.msg-bday-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #3f6144;
}

.msg-switch {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  cursor: pointer;
  font-size: 12.5px;
  font-weight: 700;
  color: #4f7754;
}

.msg-switch input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.msg-switch-track {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 42px;
  height: 23px;
  padding: 2px;
  border-radius: 999px;
  background: #d8e2d3;
  transition: background 0.18s ease;
}

.msg-switch-track > span {
  width: 19px;
  height: 19px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(47, 74, 51, 0.28);
  transition: transform 0.18s ease;
}

.msg-switch input:checked + .msg-switch-track { background: #4f7754; }

.msg-switch input:checked + .msg-switch-track > span { transform: translateX(-19px); }

.msg-switch input:focus-visible + .msg-switch-track {
  box-shadow: 0 0 0 3px rgba(79, 119, 84, 0.25);
}

.msg-switch-text { min-width: 46px; }

.msg-bday-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}

.msg-bday-form { gap: 14px; }

.msg-bday-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
}

.msg-time-input { max-width: 160px; }

.msg-bday-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.msg-bday-chips .msg-ghost-button {
  padding: 5px 10px;
  font-family: "Vazirmatn", monospace;
  direction: ltr;
  font-size: 12px;
}

.msg-bday-chips .msg-bday-reset {
  border-style: dashed;
  color: #5c6f61;
  font-family: inherit;
  direction: rtl;
}

.msg-bday-preview {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 13px 15px;
  border: 1px dashed #cfe0c7;
  border-radius: 14px;
  background: #f7fbF4;
}

.msg-bday-preview p {
  margin: 0;
  font-size: 13px;
  line-height: 2;
  color: #35493a;
  white-space: pre-wrap;
}

.msg-bday-lists {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  margin-top: 18px;
}

.msg-bday-block h3 {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0 0 9px;
  font-size: 13.5px;
  font-weight: 800;
  color: #43564a;
}

.msg-bday-name { font-weight: 700; color: #33463a; }

.msg-bday-note-inline {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: #a53f34;
}

.msg-bday-source {
  display: block;
  margin-top: 2px;
  font-family: inherit;
  font-size: 10.5px;
  color: #8a9c8b;
}

.msg-bday-result { margin-top: 2px; }

.msg-result-ok { color: #2f6b3a; }

.msg-bday-note {
  margin: 16px 0 0;
  font-size: 12px;
  line-height: 1.9;
  color: #8a9c8b;
}

.msg-bday-note code {
  padding: 1px 5px;
  border-radius: 6px;
  background: #eef4ea;
  font-size: 11.5px;
}

/* ---------- Responsive ---------- */
@media (max-width: 1024px) {
  .msg-channels { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .msg-bday-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 720px) {
  .msg-header { padding: 16px; }
  .msg-card { padding: 15px; }
  .msg-stats { width: 100%; }
  .msg-stat { flex: 1 1 calc(50% - 10px); }
  .msg-search, .msg-select { width: 100%; }
  .msg-filters { width: 100%; }
  .msg-body-preview, .msg-error-text { max-width: 180px; }
  .msg-bday-row { grid-template-columns: minmax(0, 1fr); }
  .msg-time-input { max-width: 100%; }
  .msg-switch { width: 100%; }
}

`;


export default AdminMessaging;
