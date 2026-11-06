import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  Loader2,
  Megaphone,
  MessageCircle,
  RefreshCw,
  Send,
  Smartphone,
} from "lucide-react";

import { adminApi } from "../services/api";
import {
  formatAdminDate,
  getAdminErrorMessage,
} from "../utils/adminFormat";

type SupportChannel = "web" | "telegram" | "whatsapp" | "bale";

type SupportStatus = "open" | "pending" | "closed";

interface AdminSupportMessage {
  id: number;
  sender: "user" | "admin" | "system";
  body: string;
  created_at: string | null;
  admin: { id: number; name: string } | null;
}

interface AdminSupportConversation {
  id: number;
  token: string;
  name: string | null;
  contact: string | null;
  subject: string | null;
  channel: SupportChannel;
  status: SupportStatus;
  last_message_excerpt: string | null;
  last_message_at: string | null;
  admin_unread_count: number;
  messages_count?: number;
  created_at: string | null;
  user: { id: number; name: string; email: string } | null;
  messages: AdminSupportMessage[];
}

interface AdminSupportStats {
  open: number;
  pending: number;
  closed: number;
  total: number;
  today: number;
  unread: number;
}

interface PaginatedConversations {
  data: AdminSupportConversation[];
  current_page: number;
  last_page: number;
  total: number;
}

const STATUS_LABELS: Record<SupportStatus, string> = {
  open: "باز",
  pending: "در انتظار پاسخ",
  closed: "بسته‌شده",
};

const STATUS_CLASSES: Record<SupportStatus, string> = {
  open: "admin-badge-green",
  pending: "admin-badge-amber",
  closed: "admin-badge-gray",
};

const CHANNEL_LABELS: Record<SupportChannel, string> = {
  web: "چت سایت",
  telegram: "تلگرام",
  whatsapp: "واتساپ",
  bale: "بله",
};

const CHANNEL_ICONS = {
  web: MessageCircle,
  telegram: Send,
  whatsapp: Smartphone,
  bale: Megaphone,
} as const;

const EMPTY_STATS: AdminSupportStats = {
  open: 0,
  pending: 0,
  closed: 0,
  total: 0,
  today: 0,
  unread: 0,
};

function AdminSupport() {
  const [conversations, setConversations] = useState<AdminSupportConversation[]>(
    [],
  );
  const [stats, setStats] = useState<AdminSupportStats>(EMPTY_STATS);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);

  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selected, setSelected] = useState<AdminSupportConversation | null>(
    null,
  );
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  const threadRef = useRef<HTMLDivElement>(null);

  const selectedId = selected?.id ?? null;

  const queryParams = useMemo(
    () => ({
      status: statusFilter || undefined,
      channel: channelFilter || undefined,
      search: search || undefined,
      unread: unreadOnly ? 1 : undefined,
      page,
    }),
    [statusFilter, channelFilter, search, unreadOnly, page],
  );

  const loadConversations = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await adminApi.get("/admin/support/conversations", {
        params: queryParams,
      });

      const result = response.data?.data as PaginatedConversations | undefined;

      if (!result || !Array.isArray(result.data)) {
        throw new Error("ساختار پاسخ گفتگوهای پشتیبانی معتبر نیست.");
      }

      setConversations(result.data);
      setPage(result.current_page);
      setLastPage(result.last_page);
      setStats((response.data?.stats as AdminSupportStats) ?? EMPTY_STATS);
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [queryParams]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  const openConversation = useCallback(async (conversationId: number) => {
    setThreadLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await adminApi.get(
        `/admin/support/conversations/${conversationId}`,
      );

      const result = response.data?.data as
        | AdminSupportConversation
        | undefined;

      if (!result) {
        throw new Error("گفتگوی موردنظر پیدا نشد.");
      }

      setSelected(result);
      setReply("");

      setConversations((current) =>
        current.map((item) =>
          item.id === result.id ? { ...item, admin_unread_count: 0 } : item,
        ),
      );

      setStats((current) => ({
        ...current,
        unread: Math.max(0, current.unread - result.admin_unread_count),
      }));
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setThreadLoading(false);
    }
  }, []);

  /* به‌روزرسانی خودکار گفتگوی باز و فهرست */
  useEffect(() => {
    const interval = window.setInterval(async () => {
      if (selectedId) {
        try {
          const response = await adminApi.get(
            `/admin/support/conversations/${selectedId}`,
          );

          const result = response.data?.data as
            | AdminSupportConversation
            | undefined;

          if (result) {
            setSelected((current) =>
              current && current.messages.length === result.messages.length
                ? current
                : result,
            );
          }
        } catch {
          // به‌روزرسانی خودکار نباید پیام خطا نشان دهد.
        }
      }

      try {
        const response = await adminApi.get("/admin/support/conversations", {
          params: queryParams,
        });

        const result = response.data?.data as
          | PaginatedConversations
          | undefined;

        if (result?.data) {
          setConversations(result.data);
          setStats((response.data?.stats as AdminSupportStats) ?? EMPTY_STATS);
        }
      } catch {
        // نادیده گرفتن خطای به‌روزرسانی خودکار
      }
    }, 12000);

    return () => window.clearInterval(interval);
  }, [selectedId, queryParams]);

  useEffect(() => {
    const container = threadRef.current;

    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [selected?.messages.length, selectedId]);

  /* انتخاب خودکار اولین گفتگو برای اینکه صندوق خالی نماند */
  useEffect(() => {
    if (selected !== null || loading || conversations.length === 0) return;

    void openConversation(conversations[0].id);
  }, [selected, loading, conversations, openConversation]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const sendReply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selected || sending) return;

    const body = reply.trim();

    if (body === "") return;

    setSending(true);
    setError("");

    try {
      await adminApi.post(
        `/admin/support/conversations/${selected.id}/messages`,
        { body },
      );

      setReply("");
      await openConversation(selected.id);
      await loadConversations();
      setSuccess("پاسخ شما ثبت شد و برای مشتری ارسال می‌شود.");
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const changeStatus = async (next: SupportStatus) => {
    if (!selected || statusSaving || selected.status === next) return;

    setStatusSaving(true);
    setError("");
    setSuccess("");

    try {
      await adminApi.patch(
        `/admin/support/conversations/${selected.id}/status`,
        { status: next },
      );

      setSelected({ ...selected, status: next });
      await loadConversations();
      setSuccess(`وضعیت گفتگو به «${STATUS_LABELS[next]}» تغییر کرد.`);
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setStatusSaving(false);
    }
  };

  const listJsx = (
    <section className="admin-card admin-support-list-card">
      <div className="admin-card-head">
        <div>
          <h2 className="admin-card-title">گفتگوها</h2>
          <p className="admin-card-desc">
            {stats.total} گفتگو · {stats.unread} پیام خوانده‌نشده
          </p>
        </div>
      </div>

      {loading ? (
        <p className="admin-empty">در حال دریافت گفتگوها...</p>
      ) : conversations.length === 0 ? (
        <p className="admin-empty">
          گفتگویی با این فیلترها وجود ندارد. به‌محض ثبت اولین درخواست، اینجا
          نمایش داده می‌شود.
        </p>
      ) : (
        <div className="admin-support-list">
          {conversations.map((item) => {
            const Icon = CHANNEL_ICONS[item.channel] ?? MessageCircle;

            return (
              <button
                key={item.id}
                type="button"
                className={`admin-support-item ${
                  selectedId === item.id ? "is-active" : ""
                }`}
                onClick={() => void openConversation(item.id)}
              >
                <span className="admin-support-item-top">
                  <span className="admin-support-item-name">
                    {item.user?.name || item.name || "مهمان"}
                  </span>

                  <span className="admin-support-item-time">
                    {formatAdminDate(
                      item.last_message_at ?? item.created_at,
                      true,
                    )}
                  </span>
                </span>

                <span className="admin-support-item-meta">
                  <span className={`admin-badge ${STATUS_CLASSES[item.status]}`}>
                    {STATUS_LABELS[item.status]}
                  </span>

                  <span className="admin-support-channel">
                    <Icon size={13} />
                    {CHANNEL_LABELS[item.channel]}
                  </span>

                  {item.admin_unread_count > 0 && (
                    <span className="admin-support-unread">
                      {item.admin_unread_count}
                    </span>
                  )}
                </span>

                <span className="admin-support-item-excerpt">
                  {item.last_message_excerpt || item.subject || "بدون پیام"}
                </span>

                {item.contact && (
                  <span className="admin-support-item-contact" dir="ltr">
                    {item.contact}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {lastPage > 1 && (
        <div className="admin-support-pager">
          <button
            type="button"
            className="admin-btn admin-btn-sm"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1 || loading}
          >
            قبلی
          </button>

          <span>
            صفحهٔ {page} از {lastPage}
          </span>

          <button
            type="button"
            className="admin-btn admin-btn-sm"
            onClick={() =>
              setPage((current) => Math.min(lastPage, current + 1))
            }
            disabled={page >= lastPage || loading}
          >
            بعدی
          </button>
        </div>
      )}
    </section>
  );

  const threadJsx = (
    <section className="admin-card admin-support-thread-card">
      {!selected ? (
        <div className="admin-support-empty-thread">
          <MessageCircle size={34} aria-hidden="true" />
          <p>یک گفتگو را از فهرست انتخاب کنید تا پیام‌ها را ببینید.</p>
        </div>
      ) : (
        <>
          <header className="admin-support-thread-head">
            <div>
              <h2 className="admin-card-title">
                {selected.user?.name || selected.name || "مهمان"}
              </h2>

              <p className="admin-card-desc">
                {selected.subject || "بدون موضوع"} ·{" "}
                {CHANNEL_LABELS[selected.channel]}
                {selected.contact && (
                  <>
                    {" · "}
                    <span dir="ltr">{selected.contact}</span>
                  </>
                )}
              </p>

              {selected.user?.email && (
                <p className="admin-card-desc" dir="ltr">
                  {selected.user.email}
                </p>
              )}
            </div>

            <select
              className="admin-select"
              value={selected.status}
              onChange={(event) =>
                void changeStatus(event.target.value as SupportStatus)
              }
              disabled={statusSaving}
              aria-label="وضعیت گفتگو"
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </header>

          <div className="admin-support-messages" ref={threadRef}>
            {selected.messages.map((message) => {
              const isAdmin = message.sender === "admin";

              return (
                <div
                  key={message.id}
                  className={`admin-support-msg ${
                    isAdmin ? "is-admin" : "is-user"
                  }`}
                >
                  <div className="admin-support-msg-body">{message.body}</div>

                  <span className="admin-support-msg-meta">
                    {isAdmin
                      ? message.admin?.name || "پشتیبانی"
                      : selected.user?.name || selected.name || "کاربر"}
                    {message.created_at && (
                      <> · {formatAdminDate(message.created_at, true)}</>
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          <form className="admin-support-reply" onSubmit={sendReply}>
            <textarea
              className="admin-input"
              rows={3}
              maxLength={2000}
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              placeholder="پاسخ خود را بنویسید..."
              aria-label="متن پاسخ"
            />

            <div className="admin-support-reply-actions">
              <span className="admin-card-desc">
                پاسخ در همین گفتگو ثبت می‌شود و اگر گفتگو از پیام‌رسان آمده باشد،
                برای مشتری هم ارسال می‌شود.
              </span>

              <button
                type="submit"
                className="admin-btn admin-btn-primary"
                disabled={sending || reply.trim() === ""}
              >
                {sending ? (
                  <Loader2 size={15} className="support-spin" />
                ) : (
                  <Send size={15} />
                )}
                ارسال پاسخ
              </button>
            </div>
          </form>
        </>
      )}

      {threadLoading && <p className="admin-empty">در حال دریافت گفتگو...</p>}
    </section>
  );

  return (
    <div dir="rtl" className="admin-page">
      <header className="admin-page-head">
        <div>
          <span className="admin-page-eyebrow">پشتیبانی</span>
          <h1 className="admin-page-title">صندوق پشتیبانی</h1>
          <p className="admin-page-subtitle">
            گفتگوهای مشتریان از چت سایت، تلگرام، واتساپ و بله در یک صندوق جمع
            می‌شوند؛ پاسخ شما در همان کانال برای مشتری ارسال می‌شود.
          </p>
        </div>

        <button
          type="button"
          className="admin-btn"
          onClick={() => void loadConversations()}
          disabled={loading}
        >
          <RefreshCw size={15} />
          {loading ? "در حال دریافت..." : "به‌روزرسانی"}
        </button>
      </header>

      {error && (
        <div className="admin-alert admin-alert-error" role="alert">
          <span aria-hidden="true">!</span>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="admin-alert admin-alert-success" role="status">
          <span aria-hidden="true">✓</span>
          <span>{success}</span>
        </div>
      )}

      <div className="admin-support-stats">
        <button
          type="button"
          className={`admin-support-stat ${
            statusFilter === "open" ? "is-active" : ""
          }`}
          onClick={() => {
            setPage(1);
            setStatusFilter(statusFilter === "open" ? "" : "open");
          }}
        >
          <strong>{stats.open}</strong>
          <span>باز</span>
        </button>

        <button
          type="button"
          className={`admin-support-stat ${
            statusFilter === "pending" ? "is-active" : ""
          }`}
          onClick={() => {
            setPage(1);
            setStatusFilter(statusFilter === "pending" ? "" : "pending");
          }}
        >
          <strong>{stats.pending}</strong>
          <span>در انتظار پاسخ</span>
        </button>

        <button
          type="button"
          className={`admin-support-stat ${
            statusFilter === "closed" ? "is-active" : ""
          }`}
          onClick={() => {
            setPage(1);
            setStatusFilter(statusFilter === "closed" ? "" : "closed");
          }}
        >
          <strong>{stats.closed}</strong>
          <span>بسته‌شده</span>
        </button>

        <button
          type="button"
          className={`admin-support-stat ${unreadOnly ? "is-active" : ""}`}
          onClick={() => {
            setPage(1);
            setUnreadOnly((current) => !current);
          }}
        >
          <strong>{stats.unread}</strong>
          <span>پیام خوانده‌نشده</span>
        </button>

        <div className="admin-support-stat admin-support-stat-static">
          <strong>{stats.today}</strong>
          <span>گفتگوی امروز</span>
        </div>
      </div>

      <section className="admin-card">
        <form className="admin-support-filters" onSubmit={handleSearch}>
          <input
            className="admin-input"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="جست‌وجو در نام، تماس، موضوع یا کد گفتگو..."
            aria-label="جست‌وجوی گفتگو"
          />

          <select
            className="admin-select"
            value={statusFilter}
            onChange={(event) => {
              setPage(1);
              setStatusFilter(event.target.value);
            }}
            aria-label="فیلتر وضعیت"
          >
            <option value="">همهٔ وضعیت‌ها</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <select
            className="admin-select"
            value={channelFilter}
            onChange={(event) => {
              setPage(1);
              setChannelFilter(event.target.value);
            }}
            aria-label="فیلتر کانال"
          >
            <option value="">همهٔ کانال‌ها</option>
            {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <button type="submit" className="admin-btn admin-btn-primary">
            جست‌وجو
          </button>
        </form>
      </section>

      <div className="admin-support-layout">
        {listJsx}
        {threadJsx}
      </div>
    </div>
  );
}

export default AdminSupport;
