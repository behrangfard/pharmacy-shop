import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  ArrowRight,
  CheckCheck,
  Clock3,
  ExternalLink,
  Headset,
  Loader2,
  Megaphone,
  MessageCircle,
  Phone,
  Send,
  Sparkles,
  X,
} from "lucide-react";

import {
  clearSupportToken,
  closeSupportConversation,
  fetchSupportConfig,
  fetchSupportConversation,
  readLastSeenId,
  readSupportToken,
  saveLastSeenId,
  saveSupportToken,
  sendSupportMessage,
  startSupportConversation,
  supportChannelHref,
  type SupportConfig,
  type SupportConversationPayload,
} from "../services/support";
import { SUPPORT_CHAT_OPEN_EVENT } from "../utils/supportChat";

type SupportView = "home" | "form" | "chat";

const channelIcons = {
  telegram: Send,
  whatsapp: MessageCircle,
  bale: Megaphone,
} as const;

const EMPTY_FORM = { name: "", contact: "", message: "", subject: "" };

/** استخراج پیام خطای API برای نمایش فارسی. */
function readErrorMessage(error: unknown, fallback: string): string {
  const response = (error as { response?: { data?: { message?: string } } })
    ?.response;
  const message = response?.data?.message;

  return typeof message === "string" && message.trim() !== ""
    ? message
    : fallback;
}

function formatMessageTime(value: string | null): string {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * ویجت شناور پشتیبانی در همهٔ صفحات فروشگاه.
 *
 * کاربر می‌تواند بدون ورود به حساب، در همان صفحه چت کند یا گفتگو را در
 * تلگرام، واتساپ و بله ادامه دهد.
 */
function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<SupportView>("home");
  const [config, setConfig] = useState<SupportConfig | null>(null);
  const [conversation, setConversation] =
    useState<SupportConversationPayload | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasNewMessage, setHasNewMessage] = useState(false);

  const messagesRef = useRef<HTMLDivElement>(null);

  const token = conversation?.token ?? readSupportToken();
  const pollSeconds = config?.poll_seconds ?? 5;

  /* بارگذاری تنظیمات و بازیابی گفتگوی قبلی از مرورگر */
  useEffect(() => {
    let active = true;

    const load = async () => {
      if (active) {
        setLoading(true);
      }

      try {
        const loaded = await fetchSupportConfig();

        if (active) {
          setConfig(loaded);
        }
      } catch {
        // تنظیمات پیش‌فرض کافی است؛ ویجت باید در هر حالتی کار کند.
      }

      const storedToken = readSupportToken();

      if (!storedToken) {
        if (active) {
          setLoading(false);
        }

        return;
      }

      try {
        const existing = await fetchSupportConversation(storedToken);

        if (!active) return;

        setConversation(existing);

        const lastAdminMessage = [...existing.messages]
          .reverse()
          .find((message) => message.sender !== "user");

        if (
          lastAdminMessage &&
          lastAdminMessage.id > readLastSeenId(storedToken)
        ) {
          setHasNewMessage(true);
        }
      } catch {
        clearSupportToken();
      }

      if (active) {
        setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const refreshConversation = useCallback(async () => {
    const activeToken = readSupportToken();

    if (!activeToken) return;

    try {
      setConversation(await fetchSupportConversation(activeToken));
    } catch {
      // خطای شبکه در به‌روزرسانی خودکار، تجربهٔ کاربر را مختل نمی‌کند.
    }
  }, []);

  /* به‌روزرسانی خودکار گفتگو هنگام باز بودن پنجره */
  useEffect(() => {
    if (!open || view !== "chat" || !token) return;

    const interval = window.setInterval(
      () => void refreshConversation(),
      Math.max(3, pollSeconds) * 1000,
    );

    return () => window.clearInterval(interval);
  }, [open, view, token, pollSeconds, refreshConversation]);

  /* پیمایش به آخرین پیام */
  useEffect(() => {
    if (view !== "chat") return;

    const container = messagesRef.current;

    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [view, conversation?.messages.length]);

  /* بستن پنجره با Esc */
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const markSeen = useCallback((current: SupportConversationPayload | null) => {
    if (!current) return;

    const lastId = current.messages.reduce(
      (max, message) => (message.id > max ? message.id : max),
      0,
    );

    if (lastId > 0) {
      saveLastSeenId(current.token, lastId);
    }

    setHasNewMessage(false);
  }, []);

  /*
   * باز شدن چت از بیرون ویجت (مثلاً ردیف «پشتیبانی» در فوتر یا هر لینک
   * دیگری که requestSupportChat را صدا می‌زند). همان منطق openPanel تکرار
   * می‌شود تا رفتار یکسان بماند.
   */
  useEffect(() => {
    const handleOpenRequest = () => {
      setOpen(true);
      setError("");

      if (conversation && conversation.status !== "closed") {
        setView("chat");
        markSeen(conversation);
      }
    };

    window.addEventListener(SUPPORT_CHAT_OPEN_EVENT, handleOpenRequest);

    return () => {
      window.removeEventListener(SUPPORT_CHAT_OPEN_EVENT, handleOpenRequest);
    };
  }, [conversation, markSeen]);

  const openPanel = () => {
    setOpen(true);
    setError("");

    if (conversation && conversation.status !== "closed") {
      setView("chat");
      markSeen(conversation);
    }
  };

  const startNewConversation = () => {
    clearSupportToken();
    setConversation(null);
    setDraft("");
    setForm(EMPTY_FORM);
    setError("");
    setView("form");
  };

  const handleStart = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (sending) return;

    if (form.message.trim().length < 2) {
      setError("متن پیام را بنویسید.");
      return;
    }

    setSending(true);
    setError("");

    try {
      const created = await startSupportConversation({
        name: form.name.trim() || undefined,
        contact: form.contact.trim() || undefined,
        subject: form.subject.trim() || undefined,
        message: form.message.trim(),
        page_url:
          typeof window !== "undefined" ? window.location.href : undefined,
      });

      saveSupportToken(created.token);
      setConversation(created);
      setForm(EMPTY_FORM);
      setView("chat");
      markSeen(created);
    } catch (err) {
      setError(
        readErrorMessage(err, "ارسال پیام ناموفق بود؛ دوباره تلاش کنید."),
      );
    } finally {
      setSending(false);
    }
  };

  const handleSend = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    const activeToken = conversation?.token;
    const body = draft.trim();

    if (!activeToken || body === "" || sending) return;

    setSending(true);
    setError("");

    try {
      const message = await sendSupportMessage(activeToken, body);

      setConversation((current) =>
        current
          ? { ...current, messages: [...current.messages, message] }
          : current,
      );
      setDraft("");
      saveLastSeenId(activeToken, message.id);
    } catch (err) {
      setError(
        readErrorMessage(err, "ارسال پیام ناموفق بود؛ اتصال خود را بررسی کنید."),
      );
    } finally {
      setSending(false);
    }
  };

  const handleComposerKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const handleCloseConversation = async () => {
    const activeToken = conversation?.token;

    if (!activeToken) return;

    setSending(true);
    setError("");

    try {
      setConversation(await closeSupportConversation(activeToken));
    } catch (err) {
      setError(readErrorMessage(err, "بستن گفتگو ناموفق بود."));
    } finally {
      setSending(false);
    }
  };

  const greeting = `سلام، از فروشگاه ${config?.store_name ?? ""} پیام می‌دهم.`;
  const hasActiveConversation =
    conversation !== null && conversation.status !== "closed";

  const headerJsx = (
    <header className="support-panel-head">
      <div className="support-panel-title">
        <span className="support-panel-avatar" aria-hidden="true">
          <Headset size={18} />
        </span>
        <div>
          <strong>پشتیبانی {config?.store_name || "فروشگاه"}</strong>
          <span className="support-panel-status">
            {config?.working_hours ||
              config?.support_note ||
              "پاسخگوی شما هستیم"}
          </span>
        </div>
      </div>

      <button
        type="button"
        className="support-icon-btn"
        onClick={() => setOpen(false)}
        aria-label="بستن پنجره پشتیبانی"
      >
        <X size={18} />
      </button>
    </header>
  );

  const homeJsx = (
    <div className="support-panel-body support-home">
      <p className="support-intro">
        {config?.support_note ||
          "هر سؤالی دربارهٔ سفارش، محصول یا ارسال دارید بپرسید."}
      </p>

      {config?.enabled !== false && (
        <button
          type="button"
          className="support-primary-action"
          onClick={() => {
            if (hasActiveConversation) {
              setView("chat");
              markSeen(conversation);
            } else {
              startNewConversation();
            }
          }}
        >
          {hasActiveConversation ? (
            <MessageCircle size={17} />
          ) : (
            <Sparkles size={17} />
          )}
          {hasActiveConversation
            ? "ادامهٔ گفتگو در سایت"
            : "شروع گفتگو در سایت"}
        </button>
      )}

      {loading && (
        <p className="support-hint">
          <Loader2 size={14} className="support-spin" />
          در حال دریافت اطلاعات پشتیبانی...
        </p>
      )}

      {config && config.channels.length > 0 && (
        <>
          <span className="support-divider-text">
            یا گفتگو در پیام‌رسان‌ها
          </span>

          <div className="support-channels">
            {config.channels.map((channel) => {
              const Icon = channelIcons[channel.key] ?? MessageCircle;

              return (
                <a
                  key={channel.key}
                  className={`support-channel support-channel-${channel.key}`}
                  href={supportChannelHref(channel, greeting)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="support-channel-icon" aria-hidden="true">
                    <Icon size={17} />
                  </span>

                  <span className="support-channel-text">
                    <strong>{channel.label}</strong>
                    <small>{channel.description}</small>
                  </span>

                  <ExternalLink size={14} />
                </a>
              );
            })}
          </div>
        </>
      )}

      {(config?.mobile || config?.phone) && (
        <a
          className="support-phone"
          href={`tel:${(config?.mobile || config?.phone || "").replace(
            /[^\d+]/g,
            "",
          )}`}
        >
          <Phone size={15} />
          <span dir="ltr">{config?.mobile || config?.phone}</span>
        </a>
      )}

      {config?.working_hours && (
        <p className="support-footnote">
          <Clock3 size={13} />
          ساعات پاسخ‌گویی: {config.working_hours}
        </p>
      )}
    </div>
  );

  const formJsx = (
    <form className="support-panel-body support-form" onSubmit={handleStart}>
      <p className="support-intro">
        پیام خود را بنویسید؛ اگر شمارهٔ تماس بگذارید سریع‌تر پاسخ می‌دهیم.
      </p>

      <label className="support-field">
        <span>نام (اختیاری)</span>
        <input
          value={form.name}
          onChange={(event) =>
            setForm((current) => ({ ...current, name: event.target.value }))
          }
          maxLength={100}
          placeholder="مثلاً سارا محمدی"
        />
      </label>

      <label className="support-field">
        <span>شمارهٔ تماس یا ایمیل (اختیاری)</span>
        <input
          value={form.contact}
          onChange={(event) =>
            setForm((current) => ({ ...current, contact: event.target.value }))
          }
          maxLength={191}
          dir="ltr"
          placeholder="09121234567"
        />
      </label>

      <label className="support-field">
        <span>موضوع (اختیاری)</span>
        <input
          value={form.subject}
          onChange={(event) =>
            setForm((current) => ({ ...current, subject: event.target.value }))
          }
          maxLength={191}
          placeholder="مثلاً پیگیری سفارش"
        />
      </label>

      <label className="support-field">
        <span>پیام *</span>
        <textarea
          value={form.message}
          onChange={(event) =>
            setForm((current) => ({ ...current, message: event.target.value }))
          }
          rows={4}
          maxLength={2000}
          required
          placeholder="پیام خود را اینجا بنویسید..."
        />
      </label>

      {error && (
        <p className="support-error" role="alert">
          {error}
        </p>
      )}

      <div className="support-form-actions">
        <button
          type="button"
          className="support-ghost-btn"
          onClick={() => setView("home")}
          disabled={sending}
        >
          بازگشت
        </button>

        <button type="submit" className="support-send-btn" disabled={sending}>
          {sending ? (
            <Loader2 size={16} className="support-spin" />
          ) : (
            <Send size={16} />
          )}
          ارسال پیام
        </button>
      </div>
    </form>
  );

  const chatJsx = (
    <div className="support-panel-body support-chat">
      <div className="support-chat-head">
        <button
          type="button"
          className="support-link-btn"
          onClick={() => setView("home")}
        >
          <ArrowRight size={14} />
          راه‌های ارتباطی
        </button>

        <span className="support-chat-subject">
          {conversation?.subject || "گفتگو با پشتیبانی"}
        </span>

        {conversation && conversation.status !== "closed" && (
          <button
            type="button"
            className="support-link-btn"
            onClick={() => void handleCloseConversation()}
            disabled={sending}
          >
            پایان گفتگو
          </button>
        )}
      </div>

      <div className="support-messages" ref={messagesRef}>
        {conversation?.messages.map((message) => {
          const isUser = message.sender === "user";

          return (
            <div
              key={message.id}
              className={`support-bubble ${
                isUser ? "support-bubble-user" : "support-bubble-admin"
              }`}
            >
              <div className="support-bubble-body">{message.body}</div>

              <span className="support-bubble-meta">
                {isUser ? "شما" : message.admin_name || "پشتیبانی"}
                {message.created_at && (
                  <> · {formatMessageTime(message.created_at)}</>
                )}
                {isUser && <CheckCheck size={12} aria-hidden="true" />}
              </span>
            </div>
          );
        })}
      </div>

      {error && (
        <p className="support-error" role="alert">
          {error}
        </p>
      )}

      {conversation?.status === "closed" ? (
        <div className="support-closed">
          <p>این گفتگو بسته شده است.</p>

          <button
            type="button"
            className="support-primary-action"
            onClick={startNewConversation}
          >
            <Sparkles size={16} />
            شروع گفتگوی جدید
          </button>
        </div>
      ) : (
        <form className="support-composer" onSubmit={handleSend}>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleComposerKeyDown}
            rows={2}
            maxLength={2000}
            placeholder="پیام خود را بنویسید..."
            aria-label="متن پیام"
          />

          <button
            type="submit"
            className="support-send-btn support-send-btn-icon"
            disabled={sending || draft.trim() === ""}
            aria-label="ارسال پیام"
          >
            {sending ? (
              <Loader2 size={17} className="support-spin" />
            ) : (
              <Send size={17} />
            )}
          </button>
        </form>
      )}

      {conversation?.messages.length === 0 && (
        <p className="support-hint">در حال آماده‌سازی گفتگو...</p>
      )}
    </div>
  );

  return (
    <div className="support-widget" dir="rtl">
      {open && (
        <section
          className="support-panel"
          role="dialog"
          aria-label="پنجرهٔ پشتیبانی"
        >
          {headerJsx}

          {view === "home" && homeJsx}
          {view === "form" && formJsx}
          {view === "chat" && chatJsx}
        </section>
      )}

      <button
        type="button"
        className={`support-launcher ${open ? "is-open" : ""}`}
        onClick={() => (open ? setOpen(false) : openPanel())}
        aria-label={open ? "بستن پشتیبانی" : "چت با پشتیبانی"}
        aria-expanded={open}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}

        {!open && hasNewMessage && (
          <span className="support-launcher-badge" aria-hidden="true" />
        )}

        <span className="support-launcher-text">
          {open ? "بستن" : "پشتیبانی"}
        </span>
      </button>
    </div>
  );
}

export default SupportWidget;
