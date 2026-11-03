import { useCallback, useEffect, useRef, useState } from "react";
import {
  Star,
  MessageSquare,
  Check,
  X,
  RefreshCw,
  Send,
  ChevronLeft,
} from "lucide-react";
import { adminApi } from "../services/api";

type ReviewStatus = "pending" | "approved" | "rejected";

interface Review {
  id: number;
  product_id: number;
  user_id: number;
  order_id: number;
  rating: number;
  title: string | null;
  comment: string;
  status: ReviewStatus;
  admin_reply: string | null;
  replied_at: string | null;
  approved_at: string | null;
  created_at: string;
  product?: {
    id: number;
    name: string;
    slug: string;
  } | null;
  user?: {
    id: number;
    name: string;
    email: string;
  } | null;
  order?: {
    id: number;
    order_number: string;
  } | null;
}

interface PaginatedReviews {
  data: Review[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

const colors = {
  ink: "#344b3a",
  muted: "#7c877b",
  green: "#587b5b",
  greenDark: "#426747",
  greenSoft: "#edf4e9",
  cream: "#fffefa",
  border: "#e7ecdf",
  lilac: "#eee7f5",
  lilacText: "#80649b",
  teal: "#e4f0ed",
  tealText: "#527f7b",
  amber: "#fbf1e2",
  amberText: "#a77639",
  red: "#faeae5",
  redText: "#b65c49",
};

const statusLabels: Record<ReviewStatus, string> = {
  pending: "در انتظار بررسی",
  approved: "تأییدشده",
  rejected: "ردشده",
};

const statusColors: Record<
  ReviewStatus,
  { color: string; background: string }
> = {
  pending: {
    color: colors.amberText,
    background: colors.amber,
  },
  approved: {
    color: colors.greenDark,
    background: "#e0ebdd",
  },
  rejected: {
    color: colors.redText,
    background: colors.red,
  },
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("fa-IR").format(value);

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getErrorMessage(error: unknown, fallback: string) {
  const apiError = error as {
    response?: {
      data?: {
        message?: string;
        errors?: Record<string, string[]>;
      };
    };
  };

  const validationMessages = apiError.response?.data?.errors;

  if (validationMessages) {
    const firstMessage = Object.values(validationMessages).flat()[0];
    if (firstMessage) return firstMessage;
  }

  return apiError.response?.data?.message || fallback;
}

const cardStyle: React.CSSProperties = {
  background: colors.cream,
  border: `1px solid ${colors.border}`,
  borderRadius: 18,
  padding: 20,
  boxShadow: "0 5px 16px rgba(52, 75, 58, 0.035)",
  boxSizing: "border-box",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 0,
  minHeight: 43,
  boxSizing: "border-box",
  border: `1px solid ${colors.border}`,
  borderRadius: 11,
  padding: "11px 13px",
  background: colors.cream,
  color: colors.ink,
  fontSize: 13,
  fontFamily: "inherit",
  outlineColor: colors.green,
};

const primaryButtonStyle: React.CSSProperties = {
  border: `1px solid ${colors.green}`,
  borderRadius: 11,
  padding: "10px 14px",
  minHeight: 40,
  background: colors.green,
  color: "#ffffff",
  fontSize: 13,
  fontWeight: 700,
  transition: "all 160ms ease",
  fontFamily: "inherit",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  boxSizing: "border-box",
};

const secondaryButtonStyle: React.CSSProperties = {
  border: `1px solid ${colors.border}`,
  borderRadius: 11,
  padding: "10px 14px",
  minHeight: 40,
  background: colors.cream,
  color: colors.greenDark,
  fontSize: 13,
  fontWeight: 700,
  transition: "all 160ms ease",
  fontFamily: "inherit",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  boxSizing: "border-box",
};

const cellStyle: React.CSSProperties = {
  padding: "14px 16px",
  borderBottom: `1px solid ${colors.border}`,
  fontSize: 13,
  verticalAlign: "middle",
  color: colors.ink,
};

const modalBackdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  background: "rgba(31, 47, 33, 0.48)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
  boxSizing: "border-box",
};

function AdminProductReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [updatingReviewId, setUpdatingReviewId] = useState<number | null>(null);

  const [replyReview, setReplyReview] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState("");
  const [savingReply, setSavingReply] = useState(false);

  // شناسه آخرین درخواست دریافت نظرات
  const latestRequestId = useRef(0);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const normalizedSearch = searchInput.trim();

      setSearch((currentSearch) =>
        currentSearch === normalizedSearch ? currentSearch : normalizedSearch,
      );

      setPage(1);
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  const loadReviews = useCallback(async () => {
    // هر درخواست شناسه جدیدی دریافت می‌کند.
    const requestId = ++latestRequestId.current;

    try {
      setLoading(true);
      setError("");

      const response = await adminApi.get("/admin/reviews", {
        params: {
          page,
          per_page: 15,
          ...(search ? { search } : {}),
          ...(statusFilter ? { status: statusFilter } : {}),
        },
      });

      // اگر درخواست جدیدتری شروع شده باشد، این پاسخ نادیده گرفته می‌شود.
      if (requestId !== latestRequestId.current) return;

      const result: PaginatedReviews = response.data.data;

      setReviews(Array.isArray(result?.data) ? result.data : []);
      setLastPage(Math.max(1, Number(result?.last_page ?? 1)));
      setTotal(Number(result?.total ?? 0));
    } catch (requestError) {
      // خطای درخواست قدیمی نباید وضعیت درخواست جدید را تغییر دهد.
      if (requestId !== latestRequestId.current) return;

      setError(
        getErrorMessage(
          requestError,
          "دریافت نظرات با خطا مواجه شد. دسترسی ادمین و اتصال API را بررسی کن.",
        ),
      );
    } finally {
      // فقط آخرین درخواست می‌تواند وضعیت loading را تغییر دهد.
      if (requestId === latestRequestId.current) {
        setLoading(false);
      }
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    void loadReviews();

    return () => {
      // درخواست‌های قبلی هنگام تغییر فیلتر یا خروج از صفحه بی‌اعتبار می‌شوند.
      latestRequestId.current += 1;
    };
  }, [loadReviews]);

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatusFilter("");
    setPage(1);
    setNotice("");
    setError("");
  };

  const changeStatusFilter = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const updateReviewStatus = async (
    review: Review,
    status: "approved" | "rejected",
  ) => {
    if (updatingReviewId !== null) return;

    try {
      setUpdatingReviewId(review.id);
      setNotice("");
      setError("");

      const response = await adminApi.patch(
        `/admin/reviews/${review.id}/status`,
        { status },
      );

      const updatedReview: Review = response.data.data;

      setReviews((currentReviews) =>
        currentReviews.map((item) =>
          item.id === updatedReview.id ? updatedReview : item,
        ),
      );

      setNotice(
        response.data.message ||
          (status === "approved" ? "نظر با موفقیت تأیید شد." : "نظر رد شد."),
      );

      // اگر نظر از فیلتر فعلی خارج شده باشد، فهرست را دوباره دریافت می‌کنیم.
      if (statusFilter && statusFilter !== status) {
        await loadReviews();
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError, "تغییر وضعیت نظر ناموفق بود."));
    } finally {
      setUpdatingReviewId(null);
    }
  };

  const openReplyDialog = (review: Review) => {
    setReplyReview(review);
    setReplyText(review.admin_reply || "");
    setNotice("");
    setError("");
  };

  const closeReplyDialog = () => {
    if (savingReply) return;

    setReplyReview(null);
    setReplyText("");
  };

  const saveReply = async () => {
    if (!replyReview || savingReply) return;

    const normalizedReply = replyText.trim();

    if (normalizedReply.length < 2) {
      setError("متن پاسخ باید حداقل ۲ کاراکتر داشته باشد.");
      return;
    }

    if (normalizedReply.length > 3000) {
      setError("متن پاسخ نمی‌تواند بیشتر از ۳۰۰۰ کاراکتر باشد.");
      return;
    }

    try {
      setSavingReply(true);
      setError("");
      setNotice("");

      const response = await adminApi.patch(
        `/admin/reviews/${replyReview.id}/reply`,
        { admin_reply: normalizedReply },
      );

      const updatedReview: Review = response.data.data;

      setReviews((currentReviews) =>
        currentReviews.map((item) =>
          item.id === updatedReview.id ? updatedReview : item,
        ),
      );

      setNotice(response.data.message || "پاسخ مدیر ثبت شد.");
      setReplyReview(null);
      setReplyText("");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "ثبت پاسخ مدیر ناموفق بود."));
    } finally {
      setSavingReply(false);
    }
  };

  const renderStatusBadge = (status: ReviewStatus) => {
    const badgeColors = statusColors[status] || statusColors.pending;

    return (
      <span
        style={{
          ...badgeColors,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 999,
          padding: "6px 11px",
          fontSize: 12,
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
      >
        {statusLabels[status] || status}
      </span>
    );
  };

  const renderStars = (rating: number) => (
    <div
      aria-label={`امتیاز ${rating} از ۵`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        direction: "ltr",
        whiteSpace: "nowrap",
      }}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={15}
          fill={star <= rating ? "#d9a441" : "transparent"}
          color={star <= rating ? "#d9a441" : "#d9ded4"}
          strokeWidth={1.8}
        />
      ))}
      <span
        style={{
          marginInlineStart: 5,
          color: colors.muted,
          fontSize: 12,
          direction: "rtl",
        }}
      >
        {formatNumber(rating)} از ۵
      </span>
    </div>
  );

  const renderReviewActions = (review: Review) => {
    const isUpdating = updatingReviewId === review.id;

    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 7,
        }}
      >
        {review.status !== "approved" && (
          <button
            type="button"
            disabled={updatingReviewId !== null}
            onClick={() => void updateReviewStatus(review, "approved")}
            style={{
              ...actionButtonStyle,
              color: colors.greenDark,
              background: colors.greenSoft,
              borderColor: "#dce8d7",
              opacity: updatingReviewId !== null ? 0.55 : 1,
            }}
            title="تأیید نظر"
          >
            <Check size={15} />
            {isUpdating ? "در حال ذخیره..." : "تأیید"}
          </button>
        )}

        {review.status !== "rejected" && (
          <button
            type="button"
            disabled={updatingReviewId !== null}
            onClick={() => void updateReviewStatus(review, "rejected")}
            style={{
              ...actionButtonStyle,
              color: colors.redText,
              background: colors.red,
              borderColor: "#f0d8d2",
              opacity: updatingReviewId !== null ? 0.55 : 1,
            }}
            title="رد نظر"
          >
            <X size={15} />
            رد
          </button>
        )}

        <button
          type="button"
          onClick={() => openReplyDialog(review)}
          style={{
            ...actionButtonStyle,
            color: colors.lilacText,
            background: colors.lilac,
            borderColor: "#e2d8ed",
          }}
        >
          <MessageSquare size={15} />
          {review.admin_reply ? "ویرایش پاسخ" : "پاسخ"}
        </button>
      </div>
    );
  };

  return (
    <div
      className="admin-product-reviews-page"
      dir="rtl"
      style={{
        color: colors.ink,
        width: "100%",
        minWidth: 0,
        boxSizing: "border-box",
      }}
    >
      <style>{`
        .admin-product-reviews-page *,
        .admin-product-reviews-page *::before,
        .admin-product-reviews-page *::after {
          box-sizing: border-box;
        }

        .admin-product-reviews-page .reviews-filter-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
        }

        .admin-product-reviews-page .reviews-filter-search {
          flex: 1 1 260px;
          width: 100%;
          min-width: 0;
        }

        .admin-product-reviews-page .reviews-filter-select {
          flex: 0 1 190px;
          width: auto;
          min-width: 150px;
          max-width: 100%;
        }

        .admin-product-reviews-page .reviews-filter-row input:focus-visible,
        .admin-product-reviews-page .reviews-filter-row select:focus-visible,
        .admin-product-reviews-page .reviews-filter-row button:focus-visible {
          outline: 2px solid #587b5b;
          outline-offset: 2px;
        }

        .admin-product-reviews-page .reviews-mobile-cards {
          display: none;
        }

        .admin-product-reviews-page .reviews-desktop-table {
          display: block;
        }

        @media (max-width: 700px) {
          .admin-product-reviews-page .reviews-filter-panel {
            padding: 14px !important;
          }

          .admin-product-reviews-page .reviews-filter-row input,
          .admin-product-reviews-page .reviews-filter-row select,
          .admin-product-reviews-page .reviews-filter-row button {
            flex: 1 1 100% !important;
            width: 100% !important;
            min-width: 0 !important;
          }

          .admin-product-reviews-page .reviews-mobile-cards {
            display: grid !important;
          }

          .admin-product-reviews-page .reviews-desktop-table {
            display: none !important;
          }
        }
      `}</style>

      {/* عنوان صفحه */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 26,
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              background: colors.greenSoft,
              color: colors.green,
              borderRadius: 999,
              padding: "6px 11px",
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 12,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: colors.green,
              }}
            />
            مدیریت فروشگاه
          </div>

          <h1
            style={{
              margin: "0 0 8px",
              fontSize: "clamp(23px, 3vw, 29px)",
              fontWeight: 800,
              color: colors.ink,
              letterSpacing: "-0.4px",
            }}
          >
            مدیریت نظرات محصولات
          </h1>

          <p style={{ margin: 0, color: colors.muted, fontSize: 14 }}>
            بررسی دیدگاه‌ها، مدیریت امتیازها و پاسخ به مشتریان
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadReviews()}
          disabled={loading}
          style={{
            ...primaryButtonStyle,
            opacity: loading ? 0.65 : 1,
            cursor: loading ? "wait" : "pointer",
          }}
        >
          <RefreshCw size={16} />
          {loading ? "در حال دریافت..." : "تازه‌سازی"}
        </button>
      </div>

      {/* آمار */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 190px), 1fr))",
          gap: 14,
          marginBottom: 22,
        }}
      >
        <StatCard
          label="کل نظرات مطابق فیلتر"
          value={total}
          icon={<MessageSquare size={22} />}
          background={colors.greenSoft}
          foreground={colors.green}
        />

        <StatCard
          label="تعداد نظرات این صفحه"
          value={reviews.length}
          icon={<Star size={22} />}
          background={colors.lilac}
          foreground={colors.lilacText}
        />
      </div>

      {/* جست‌وجو و فیلتر */}
      <section
        className="reviews-filter-panel"
        aria-label="جست‌وجو و فیلتر نظرات"
        style={{
          ...cardStyle,
          marginBottom: 20,
          padding: 20,
        }}
      >
        <div
          style={{
            marginBottom: 14,
            color: colors.ink,
            fontSize: 14,
            fontWeight: 800,
          }}
        >
          جست‌وجو و فیلتر
        </div>

        <div className="reviews-filter-row">
          <input
            className="reviews-filter-search"
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="جست‌وجو بر اساس نام محصول، مشتری یا متن نظر..."
            aria-label="جست‌وجوی نظرات"
            autoComplete="off"
            style={inputStyle}
          />

          <select
            className="reviews-filter-select"
            value={statusFilter}
            onChange={(event) => changeStatusFilter(event.target.value)}
            aria-label="فیلتر وضعیت نظر"
            style={inputStyle}
          >
            <option value="">همه وضعیت‌ها</option>
            <option value="pending">در انتظار بررسی</option>
            <option value="approved">تأییدشده</option>
            <option value="rejected">ردشده</option>
          </select>

          <button
            type="button"
            onClick={clearFilters}
            style={{
              ...secondaryButtonStyle,
              background: "#f8f8f1",
              whiteSpace: "nowrap",
            }}
          >
            پاک کردن فیلترها
          </button>
        </div>

        <div
          style={{
            marginTop: 10,
            color: colors.muted,
            fontSize: 11,
            lineHeight: 1.8,
          }}
        >
          نتایج جست‌وجو پس از توقف تایپ به‌صورت خودکار به‌روزرسانی می‌شوند.
        </div>
      </section>

      {/* پیام خطا */}
      {error && (
        <div
          role="alert"
          style={{
            background: colors.red,
            border: "1px solid #e9c9c4",
            color: colors.redText,
            borderRadius: 12,
            padding: "14px 16px",
            marginBottom: 18,
            overflowWrap: "anywhere",
          }}
        >
          {error}
        </div>
      )}

      {/* پیام موفقیت */}
      {notice && (
        <div
          role="status"
          style={{
            background: colors.greenSoft,
            border: "1px solid #dce8d7",
            color: colors.greenDark,
            borderRadius: 12,
            padding: "14px 16px",
            marginBottom: 18,
            overflowWrap: "anywhere",
          }}
        >
          {notice}
          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="بستن پیام"
            style={{
              float: "left",
              border: 0,
              background: "transparent",
              color: "inherit",
              cursor: "pointer",
              fontSize: 18,
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* جدول و کارت‌های نظرات */}
      <div
        style={{
          ...cardStyle,
          padding: 0,
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        {loading ? (
          <p style={{ padding: 28, color: colors.muted }}>
            در حال دریافت نظرات...
          </p>
        ) : reviews.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                background: colors.greenSoft,
                color: colors.green,
                display: "grid",
                placeItems: "center",
                margin: "0 auto 16px",
              }}
            >
              <MessageSquare size={28} />
            </div>

            <div
              style={{
                fontSize: 17,
                fontWeight: 800,
                marginBottom: 8,
                color: colors.ink,
              }}
            >
              نظری پیدا نشد
            </div>

            <div style={{ color: colors.muted, fontSize: 14 }}>
              فیلترها را تغییر بده یا دوباره جست‌وجو کن.
            </div>

            <button
              type="button"
              onClick={clearFilters}
              style={{ ...secondaryButtonStyle, marginTop: 16 }}
            >
              نمایش همه نظرات
            </button>
          </div>
        ) : (
          <>
            {/* جدول دسکتاپ */}
            <div
              className="reviews-desktop-table"
              style={{ overflowX: "auto" }}
            >
              <table
                style={{
                  width: "100%",
                  minWidth: 1050,
                  borderCollapse: "collapse",
                  textAlign: "right",
                }}
              >
                <thead style={{ background: "#f3f6ef" }}>
                  <tr>
                    {[
                      "مشتری",
                      "محصول",
                      "امتیاز",
                      "متن نظر",
                      "وضعیت",
                      "تاریخ",
                      "عملیات",
                    ].map((heading) => (
                      <th
                        key={heading}
                        scope="col"
                        style={{
                          padding: "15px 16px",
                          fontSize: 12,
                          fontWeight: 800,
                          whiteSpace: "nowrap",
                          borderBottom: `1px solid ${colors.border}`,
                          textAlign: "right",
                          color: "#536452",
                        }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {reviews.map((review) => (
                    <tr key={review.id}>
                      <td style={{ ...cellStyle, minWidth: 150 }}>
                        <strong style={{ display: "block" }}>
                          {review.user?.name || "کاربر"}
                        </strong>

                        <span
                          style={{
                            display: "block",
                            color: colors.muted,
                            fontSize: 11,
                            marginTop: 5,
                            direction: "ltr",
                            textAlign: "right",
                          }}
                        >
                          {review.user?.email || "—"}
                        </span>

                        {review.order?.order_number && (
                          <span
                            style={{
                              display: "block",
                              color: colors.muted,
                              fontSize: 11,
                              marginTop: 5,
                            }}
                          >
                            سفارش: {review.order.order_number}
                          </span>
                        )}
                      </td>

                      <td style={{ ...cellStyle, minWidth: 150 }}>
                        <strong>
                          {review.product?.name || "محصول حذف‌شده"}
                        </strong>
                      </td>

                      <td style={{ ...cellStyle, minWidth: 130 }}>
                        {renderStars(review.rating)}
                      </td>

                      <td style={{ ...cellStyle, minWidth: 230 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            marginBottom: 6,
                            overflowWrap: "anywhere",
                          }}
                        >
                          {review.title || "بدون عنوان"}
                        </div>

                        <div
                          style={{
                            color: "#667366",
                            lineHeight: 1.9,
                            whiteSpace: "pre-wrap",
                            overflowWrap: "anywhere",
                            maxWidth: 350,
                          }}
                        >
                          {review.comment}
                        </div>

                        {review.admin_reply && (
                          <div
                            style={{
                              marginTop: 10,
                              padding: 10,
                              background: colors.lilac,
                              color: colors.lilacText,
                              borderRadius: 9,
                              fontSize: 12,
                              lineHeight: 1.8,
                            }}
                          >
                            <strong>پاسخ مدیر:</strong>
                            <div
                              style={{ marginTop: 4, whiteSpace: "pre-wrap" }}
                            >
                              {review.admin_reply}
                            </div>
                          </div>
                        )}
                      </td>

                      <td style={cellStyle}>
                        {renderStatusBadge(review.status)}
                      </td>

                      <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>
                        {formatDate(review.created_at)}
                      </td>

                      <td style={{ ...cellStyle, minWidth: 210 }}>
                        {renderReviewActions(review)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* کارت‌های موبایل */}
            <div
              className="reviews-mobile-cards"
              style={{ padding: 12, gap: 12 }}
            >
              {reviews.map((review) => (
                <article
                  key={review.id}
                  style={{
                    border: `1px solid ${colors.border}`,
                    borderRadius: 14,
                    padding: 16,
                    background: colors.cream,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 10,
                      marginBottom: 14,
                    }}
                  >
                    <strong style={{ overflowWrap: "anywhere" }}>
                      {review.user?.name || "کاربر"}
                    </strong>

                    {renderStatusBadge(review.status)}
                  </div>

                  <div style={{ display: "grid", gap: 13 }}>
                    <div>
                      <div style={mobileLabelStyle}>ایمیل مشتری</div>
                      <div
                        style={{
                          marginTop: 5,
                          fontSize: 13,
                          direction: "ltr",
                          textAlign: "right",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {review.user?.email || "—"}
                      </div>
                    </div>

                    <div>
                      <div style={mobileLabelStyle}>محصول</div>
                      <strong
                        style={{
                          display: "block",
                          marginTop: 5,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {review.product?.name || "محصول حذف‌شده"}
                      </strong>
                    </div>

                    <div>
                      <div style={mobileLabelStyle}>امتیاز</div>
                      <div style={{ marginTop: 7 }}>
                        {renderStars(review.rating)}
                      </div>
                    </div>

                    {review.order?.order_number && (
                      <div>
                        <div style={mobileLabelStyle}>شماره سفارش</div>
                        <div style={{ marginTop: 5 }}>
                          {review.order.order_number}
                        </div>
                      </div>
                    )}

                    <div>
                      <div style={mobileLabelStyle}>عنوان نظر</div>
                      <strong style={{ display: "block", marginTop: 5 }}>
                        {review.title || "بدون عنوان"}
                      </strong>
                    </div>

                    <div>
                      <div style={mobileLabelStyle}>متن نظر</div>
                      <p
                        style={{
                          margin: "6px 0 0",
                          lineHeight: 2,
                          whiteSpace: "pre-wrap",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {review.comment}
                      </p>
                    </div>

                    {review.admin_reply && (
                      <div
                        style={{
                          background: colors.lilac,
                          color: colors.lilacText,
                          borderRadius: 10,
                          padding: 12,
                          fontSize: 13,
                          lineHeight: 1.9,
                        }}
                      >
                        <strong>پاسخ مدیر</strong>
                        <div style={{ marginTop: 5, whiteSpace: "pre-wrap" }}>
                          {review.admin_reply}
                        </div>
                      </div>
                    )}

                    <div>
                      <div style={mobileLabelStyle}>تاریخ ثبت</div>
                      <div style={{ marginTop: 5 }}>
                        {formatDate(review.created_at)}
                      </div>
                    </div>

                    <div
                      style={{
                        borderTop: `1px solid ${colors.border}`,
                        paddingTop: 13,
                      }}
                    >
                      {renderReviewActions(review)}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>

      {/* صفحه‌بندی */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginTop: 18,
        }}
      >
        <span style={{ color: colors.muted, fontSize: 13 }}>
          صفحه {formatNumber(page)} از {formatNumber(lastPage)}
          {" · "}
          مجموع {formatNumber(total)} نظر
        </span>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            style={paginationButtonStyle(page <= 1 || loading)}
          >
            <ChevronLeft size={15} style={{ transform: "rotate(180deg)" }} />
            قبلی
          </button>

          <button
            type="button"
            disabled={page >= lastPage || loading}
            onClick={() =>
              setPage((current) => Math.min(lastPage, current + 1))
            }
            style={paginationButtonStyle(page >= lastPage || loading)}
          >
            بعدی
            <ChevronLeft size={15} />
          </button>
        </div>
      </div>

      {/* پنجره پاسخ مدیر */}
      {replyReview && (
        <div
          style={modalBackdropStyle}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeReplyDialog();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-reply-title"
            style={{
              width: "min(560px, 100%)",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#faf9f4",
              border: `1px solid ${colors.border}`,
              borderRadius: 20,
              padding: "clamp(16px, 3vw, 26px)",
              boxSizing: "border-box",
              boxShadow: "0 24px 70px rgba(35, 55, 37, 0.22)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "start",
                gap: 16,
                marginBottom: 20,
              }}
            >
              <div>
                <div
                  style={{
                    color: colors.lilacText,
                    fontSize: 12,
                    fontWeight: 800,
                    marginBottom: 8,
                  }}
                >
                  ارتباط با مشتری
                </div>

                <h2
                  id="review-reply-title"
                  style={{
                    margin: "0 0 8px",
                    fontSize: 21,
                    color: colors.ink,
                  }}
                >
                  {replyReview.admin_reply ? "ویرایش پاسخ مدیر" : "پاسخ به نظر"}
                </h2>

                <div style={{ color: colors.muted, fontSize: 13 }}>
                  {replyReview.user?.name || "کاربر"} ·{" "}
                  {replyReview.product?.name || "محصول"}
                </div>
              </div>

              <button
                type="button"
                onClick={closeReplyDialog}
                disabled={savingReply}
                aria-label="بستن پنجره پاسخ"
                style={{
                  border: `1px solid ${colors.border}`,
                  background: "#ffffff",
                  color: "#536452",
                  borderRadius: 10,
                  width: 38,
                  height: 38,
                  fontSize: 22,
                  cursor: savingReply ? "not-allowed" : "pointer",
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                background: "#ffffff",
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
                padding: 13,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  color: colors.muted,
                  fontSize: 12,
                  marginBottom: 7,
                }}
              >
                نظر مشتری
              </div>

              <div
                style={{
                  fontWeight: 700,
                  marginBottom: 7,
                  overflowWrap: "anywhere",
                }}
              >
                {replyReview.title || "بدون عنوان"}
              </div>

              <div
                style={{
                  fontSize: 13,
                  color: "#667366",
                  lineHeight: 1.9,
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                }}
              >
                {replyReview.comment}
              </div>
            </div>

            <label
              htmlFor="admin-review-reply"
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 800,
                marginBottom: 9,
              }}
            >
              متن پاسخ مدیر
            </label>

            <textarea
              id="admin-review-reply"
              value={replyText}
              onChange={(event) => setReplyText(event.target.value)}
              rows={5}
              maxLength={3000}
              placeholder="پاسخ خود را برای مشتری بنویسید..."
              disabled={savingReply}
              style={{
                ...inputStyle,
                minHeight: 130,
                resize: "vertical",
                lineHeight: 1.9,
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
                marginTop: 8,
                color: colors.muted,
                fontSize: 11,
              }}
            >
              <span>حداقل ۲ و حداکثر ۳۰۰۰ کاراکتر</span>
              <span>{formatNumber(replyText.length)} / ۳۰۰۰</span>
            </div>

            {error && (
              <div
                role="alert"
                style={{
                  background: colors.red,
                  color: colors.redText,
                  borderRadius: 10,
                  padding: 11,
                  marginTop: 14,
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                flexWrap: "wrap",
                gap: 9,
                marginTop: 20,
              }}
            >
              <button
                type="button"
                onClick={closeReplyDialog}
                disabled={savingReply}
                style={secondaryButtonStyle}
              >
                انصراف
              </button>

              <button
                type="button"
                onClick={() => void saveReply()}
                disabled={savingReply || replyText.trim().length < 2}
                style={{
                  ...primaryButtonStyle,
                  opacity: savingReply || replyText.trim().length < 2 ? 0.6 : 1,
                  cursor:
                    savingReply || replyText.trim().length < 2
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                <Send size={15} />
                {savingReply ? "در حال ثبت..." : "ثبت پاسخ"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  background,
  foreground,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  background: string;
  foreground: string;
}) {
  return (
    <div style={{ ...cardStyle, position: "relative", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          insetInlineStart: 0,
          top: 0,
          bottom: 0,
          width: 4,
          background: foreground,
        }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              color: colors.muted,
              fontSize: 13,
              marginBottom: 8,
            }}
          >
            {label}
          </div>

          <strong style={{ fontSize: 27, color: colors.ink }}>
            {formatNumber(value)}
          </strong>
        </div>

        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 14,
            display: "grid",
            placeItems: "center",
            background,
            color: foreground,
          }}
          aria-hidden="true"
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

const mobileLabelStyle: React.CSSProperties = {
  color: colors.muted,
  fontSize: 12,
};

const actionButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 5,
  border: "1px solid",
  borderRadius: 9,
  padding: "8px 10px",
  fontFamily: "inherit",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap",
  transition: "all 160ms ease",
};

function paginationButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    border: `1px solid ${colors.border}`,
    borderRadius: 10,
    background: disabled ? "#f0f2ec" : "#ffffff",
    color: disabled ? "#a0a79b" : colors.green,
    padding: "9px 13px",
    fontSize: 13,
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit",
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
  };
}

export default AdminProductReviews;
