import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  MessageSquare,
  RefreshCw,
  RotateCcw,
  ShoppingCart,
  Truck,
} from "lucide-react";
import {
  fetchAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  type AdminNotification,
} from "../services/adminNotifications";
import { getAdminErrorMessage } from "../utils/adminFormat";
import { formatJalaliDateTime, toPersianDigits } from "../utils/jalali";

/** فاصلهٔ به‌روزرسانی خودکار اعلان‌ها (میلی‌ثانیه). */
const POLL_INTERVAL = 45_000;

/** فاصلهٔ زمانی خوانا؛ برای اعلان‌های قدیمی‌تر تاریخ شمسی نشان داده می‌شود. */
function timeAgo(value: string | null): string {
  if (!value) return "";

  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) return "";

  const diffMinutes = Math.floor((Date.now() - timestamp) / 60_000);

  if (diffMinutes < 1) return "همین حالا";

  if (diffMinutes < 60) {
    return `${toPersianDigits(diffMinutes)} دقیقه پیش`;
  }

  if (diffMinutes < 24 * 60) {
    return `${toPersianDigits(Math.floor(diffMinutes / 60))} ساعت پیش`;
  }

  if (diffMinutes < 7 * 24 * 60) {
    return `${toPersianDigits(Math.floor(diffMinutes / (24 * 60)))} روز پیش`;
  }

  return formatJalaliDateTime(value);
}

/** آیکن هر نوع اعلان. */
function NotificationIcon({ type }: { type: string }) {
  if (type === "order") return <ShoppingCart size={15} />;
  if (type === "order_status") return <Truck size={15} />;
  if (type === "support") return <MessageSquare size={15} />;
  if (type === "return") return <RotateCcw size={15} />;

  return <Bell size={15} />;
}

/**
 * زنگولهٔ اعلان پنل مدیریت.
 *
 * اعلان‌ها هر ۴۵ ثانیه و هنگام باز شدن کشو تازه می‌شوند؛ کلیک روی هر اعلان
 * آن را خوانده‌شده می‌کند و مدیر را به صفحهٔ مربوطه می‌برد.
 */
function AdminNotificationBell() {
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);

    try {
      const feed = await fetchAdminNotifications();

      setItems(feed.items);
      setUnreadCount(feed.unread_count);
      setError("");
    } catch (requestError) {
      setError(
        getAdminErrorMessage(requestError, "دریافت اعلان‌ها ناموفق بود."),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // بارگذاری اولیه + به‌روزرسانی دوره‌ای و هنگام بازگشت به تب.
  useEffect(() => {
    void load(true);

    const timer = window.setInterval(() => void load(), POLL_INTERVAL);
    const handleFocus = () => void load();

    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", handleFocus);
    };
  }, [load]);

  // کشو با کلیک بیرون یا Esc بسته می‌شود.
  useEffect(() => {
    if (!open) return;

    void load();

    const handlePointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, load]);

  const handleOpenNotification = async (item: AdminNotification) => {
    setOpen(false);

    if (!item.read) {
      setMarkingId(item.id);

      // ابتدا رابط کاربری به‌روز می‌شود تا کلیک فوری حس شود.
      setItems((current) =>
        current.map((row) =>
          row.id === item.id ? { ...row, read: true } : row,
        ),
      );
      setUnreadCount((current) => Math.max(current - 1, 0));

      try {
        const result = await markAdminNotificationRead(item.id);

        setUnreadCount(result.unread_count);
      } catch {
        // خطای علامت‌گذاری نباید مانع رفتن به صفحهٔ مربوطه شود.
        void load();
      } finally {
        setMarkingId(null);
      }
    }

    if (item.url && item.url.startsWith("/")) {
      navigate(item.url);
    }
  };

  const handleMarkAll = async () => {
    if (markingAll || unreadCount === 0) return;

    setMarkingAll(true);

    try {
      const result = await markAllAdminNotificationsRead();

      setItems((current) => current.map((row) => ({ ...row, read: true })));
      setUnreadCount(result.unread_count);
      setError("");
    } catch (requestError) {
      setError(
        getAdminErrorMessage(requestError, "علامت‌گذاری اعلان‌ها ناموفق بود."),
      );
    } finally {
      setMarkingAll(false);
    }
  };

  const badgeLabel = unreadCount > 99 ? "+۹۹" : toPersianDigits(unreadCount);

  return (
    <div className="admin-notification-anchor" ref={wrapperRef}>
      <button
        type="button"
        className="admin-topbar-icon-button"
        onClick={() => setOpen((current) => !current)}
        aria-label={
          unreadCount > 0
            ? `اعلان‌ها، ${toPersianDigits(unreadCount)} خوانده‌نشده`
            : "اعلان‌ها"
        }
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell size={18} />

        {unreadCount > 0 && (
          <span className="admin-notification-badge" aria-hidden="true">
            {badgeLabel}
          </span>
        )}
      </button>

      {open && (
        <div
          className="admin-notification-popover"
          role="dialog"
          aria-label="اعلان‌های پنل"
        >
          <div className="admin-notification-head">
            <span className="admin-notification-title">اعلان‌ها</span>

            <button
              type="button"
              className="admin-notification-mark-all"
              onClick={() => void handleMarkAll()}
              disabled={markingAll || unreadCount === 0}
            >
              {markingAll ? (
                <RefreshCw size={13} className="admin-notification-spin" />
              ) : (
                <CheckCheck size={13} />
              )}
              همه خوانده شد
            </button>
          </div>

          {error && (
            <div className="admin-notification-state is-error" role="alert">
              {error}
            </div>
          )}

          {loading && items.length === 0 ? (
            <div className="admin-notification-state">در حال دریافت...</div>
          ) : items.length === 0 ? (
            <div className="admin-notification-state">
              فعلاً اعلانی برای نمایش وجود ندارد.
            </div>
          ) : (
            <ul className="admin-notification-list">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`admin-notification-item${
                      item.read ? "" : " is-unread"
                    }`}
                    onClick={() => void handleOpenNotification(item)}
                    disabled={markingId === item.id}
                  >
                    <span
                      className={`admin-notification-icon is-${item.type}`}
                      aria-hidden="true"
                    >
                      <NotificationIcon type={item.type} />
                    </span>

                    <span className="admin-notification-copy">
                      <span className="admin-notification-item-title">
                        {item.title}
                      </span>

                      {item.body && (
                        <span className="admin-notification-body">
                          {item.body}
                        </span>
                      )}

                      <span className="admin-notification-time">
                        {timeAgo(item.created_at)}
                      </span>
                    </span>

                    {!item.read && (
                      <span
                        className="admin-notification-dot"
                        aria-label="خوانده‌نشده"
                      />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminNotificationBell;
