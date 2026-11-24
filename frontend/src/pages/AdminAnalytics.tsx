import { useCallback, useEffect, useState } from "react";

import {
  attributionLabel,
  fetchTrafficAnalytics,
  type TrafficAnalytics,
  type TrafficRow,
} from "../services/analytics";
import {
  formatAdminDate,
  formatAdminNumber,
  getAdminErrorMessage,
} from "../utils/adminFormat";

/** ردیف جدول تحلیلی: برچسب‌های آمادهٔ نمایش + متریک‌های عددی. */
type DisplayRow = Record<string, string | number>;

/** ساخت ردیف نمایش از ردیف API + برچسب‌های ترجمه‌شده. */
function toDisplayRow(row: TrafficRow, labels: Record<string, string>): DisplayRow {
  return { ...labels, ...row };
}

interface AttributionTableProps {
  title: string;
  description: string;
  columns: { key: string; label: string }[];
  rows: DisplayRow[];
  emptyText: string;
}

/** جدول یک گروهبندی (منبع/نوع/کمپین/محتوا/ارجاع‌دهنده) با نوار سهم درآمد. */
function AttributionTable({
  title,
  description,
  columns,
  rows,
  emptyText,
}: AttributionTableProps) {
  return (
    <section className="admin-card">
      <div className="admin-card-head">
        <div>
          <h2 className="admin-card-title">{title}</h2>
          <p className="admin-card-desc">{description}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="admin-empty">{emptyText}</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
                <th>سفارش</th>
                <th>درآمد (تومان)</th>
                <th>میانگین سفارش</th>
                <th style={{ width: "24%" }}>سهم از درآمد</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={`${index}-${columns
                    .map((column) => String(row[column.key]))
                    .join("-")}`}
                >
                  {columns.map((column) => (
                    <td key={column.key}>{String(row[column.key])}</td>
                  ))}
                  <td>{formatAdminNumber(row.orders_count)}</td>
                  <td>{formatAdminNumber(row.revenue)}</td>
                  <td>{formatAdminNumber(row.average_order_total)}</td>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          height: 10,
                          background: "#f1f5f0",
                          borderRadius: 999,
                          overflow: "hidden",
                        }}
                        role="presentation"
                      >
                        <div
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(0, Number(row.revenue_share) || 0),
                            )}%`,
                            height: "100%",
                            background: "#648767",
                          }}
                        />
                      </div>
                      <span style={{ minWidth: 52, textAlign: "left" }}>
                        {formatAdminNumber(row.revenue_share)}٪
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/** داشبورد تحلیل کمپین‌ها: فروش به تفکیک منبع ترافیک (فقط دادهٔ سفارش‌ها). */
function AdminAnalytics() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<TrafficAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setData(await fetchTrafficAnalytics(days));
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const summary = data?.summary;

  return (
    <div dir="rtl" className="admin-page">
      <header className="admin-page-head">
        <div>
          <span className="admin-page-eyebrow">بازاریابی</span>
          <h1 className="admin-page-title">تحلیل کمپین‌ها</h1>
          <p className="admin-page-subtitle">
            فروش به تفکیک منبع، نوع ترافیک، کمپین و دامنهٔ ارجاع‌دهنده — از
            روی UTM ذخیره‌شده در خود سفارش‌ها (بدون وابستگی به گوگل).
          </p>
        </div>

        <div className="admin-toolbar" style={{ marginBottom: 0 }}>
          {[7, 30, 90].map((value) => (
            <button
              key={value}
              type="button"
              className={`admin-btn admin-btn-sm${
                days === value ? " admin-btn-primary" : ""
              }`}
              onClick={() => setDays(value)}
            >
              {formatAdminNumber(value)} روز اخیر
            </button>
          ))}

          <button
            type="button"
            className="admin-btn admin-btn-sm"
            onClick={() => void loadAnalytics()}
            disabled={loading}
          >
            {loading ? "..." : "به‌روزرسانی"}
          </button>
        </div>
      </header>

      {error && (
        <div className="admin-alert admin-alert-error" role="alert">
          <span aria-hidden="true">!</span>
          <span>{error}</span>
        </div>
      )}

      {loading && !data ? (
        <div className="admin-card">
          <p className="admin-empty">در حال محاسبهٔ گزارش...</p>
        </div>
      ) : data && summary ? (
        <>
          <div className="admin-stats">
            <div className="admin-stat">
              <span className="admin-stat-label">درآمد کل</span>
              <strong className="admin-stat-value">
                {formatAdminNumber(summary.revenue)}
              </strong>
              <span className="admin-stat-hint">تومان (بدون سفارش لغوشده)</span>
            </div>

            <div className="admin-stat">
              <span className="admin-stat-label">سفارش‌ها</span>
              <strong className="admin-stat-value">
                {formatAdminNumber(summary.orders_count)}
              </strong>
              <span className="admin-stat-hint">
                میانگین {formatAdminNumber(summary.average_order_total)} تومان
              </span>
            </div>

            <div className="admin-stat">
              <span className="admin-stat-label">با برچسب UTM</span>
              <strong className="admin-stat-value">
                {formatAdminNumber(summary.utm_orders_count)}
              </strong>
              <span className="admin-stat-hint">
                {formatAdminNumber(summary.utm_order_share)}٪ از سفارش‌ها
              </span>
            </div>

            <div className="admin-stat">
              <span className="admin-stat-label">منبع شناسایی‌شده</span>
              <strong className="admin-stat-value">
                {formatAdminNumber(summary.tracked_orders_count)}
              </strong>
              <span className="admin-stat-hint">
                {formatAdminNumber(summary.tracked_order_share)}٪ (UTM یا
                ارجاع‌دهنده)
              </span>
            </div>

            <div className="admin-stat">
              <span className="admin-stat-label">ترافیک مستقیم</span>
              <strong className="admin-stat-value">
                {formatAdminNumber(summary.direct_orders_count)}
              </strong>
              <span className="admin-stat-hint">
                {formatAdminNumber(summary.direct_order_share)}٪ از سفارش‌ها
              </span>
            </div>
          </div>

          <section className="admin-card">
            <p className="admin-card-desc">
              مبنای این گزارش فقط سفارش‌های ثبت‌شده است؛ مقدار UTM هنگام ثبت
              سفارش ذخیره می‌شود (انتساب «اولین تماس») و سفارش بدون برچسب در
              ردیف «مستقیم / نامشخص» جمع می‌شود. بازه:{" "}
              {formatAdminDate(data.range.from)} تا{" "}
              {formatAdminDate(data.range.to)}
            </p>
          </section>

          <AttributionTable
            title="منابع ترافیک"
            description="گروه‌بندی بر اساس utm_source"
            columns={[{ key: "source", label: "منبع" }]}
            rows={data.sources.map((row) =>
              toDisplayRow(row, { source: attributionLabel(row.source) }),
            )}
            emptyText="در این بازه سفارش منبع‌داری ثبت نشده است."
          />

          <AttributionTable
            title="نوع ترافیک"
            description="گروه‌بندی بر اساس utm_medium (مثل social، cpc، sms)"
            columns={[{ key: "medium", label: "نوع" }]}
            rows={data.mediums.map((row) =>
              toDisplayRow(row, { medium: attributionLabel(row.medium) }),
            )}
            emptyText="در این بازه سفارش برچسب‌داری ثبت نشده است."
          />

          <AttributionTable
            title="کمپین‌ها"
            description="ترکیب utm_source + utm_medium + utm_campaign"
            columns={[
              { key: "source", label: "منبع" },
              { key: "medium", label: "نوع" },
              { key: "campaign", label: "کمپین" },
            ]}
            rows={data.campaigns.map((row) =>
              toDisplayRow(row, {
                source: attributionLabel(row.source),
                medium: attributionLabel(row.medium),
                campaign: attributionLabel(row.campaign),
              }),
            )}
            emptyText="در این بازه کمپین فعالی ثبت نشده است."
          />

          <AttributionTable
            title="محتوای کمپین"
            description="گروه‌بندی بر اساس utm_content (مثل شماره استوری یا بنر)"
            columns={[{ key: "content", label: "محتوا" }]}
            rows={data.contents.map((row) =>
              toDisplayRow(row, { content: attributionLabel(row.content) }),
            )}
            emptyText="در این بازه محتوای برچسب‌داری ثبت نشده است."
          />

          <AttributionTable
            title="ارجاع‌دهنده‌ها"
            description="دامنهٔ referrer سفارش‌هایی که با لینک خارجی آمده‌اند"
            columns={[{ key: "host", label: "دامنه" }]}
            rows={data.referrers.map((row) =>
              toDisplayRow(row, { host: attributionLabel(row.host) }),
            )}
            emptyText="در این بازه سفارش ارجاع‌داری ثبت نشده است."
          />
        </>
      ) : null}
    </div>
  );
}

export default AdminAnalytics;

