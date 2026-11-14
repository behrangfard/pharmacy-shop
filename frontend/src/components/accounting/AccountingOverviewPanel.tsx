import {
  EmptyState,
  Panel,
  StatCard,
  money,
  num,
  type AccountingOverview,
  type MonthlyRow,
} from "./accountingUi";

const monthLabel = (value: string) => {
  const [year, month] = value.split("-");

  return `${month}/${year?.slice(2) ?? ""}`;
};

function Bar({ label, value, max, negative }: { label: string; value: number; max: number; negative: boolean }) {
  const width = max > 0 ? Math.min(Math.abs(value) / max, 1) * 100 : 0;

  return (
    <div className="acc-bar-row">
      <div className="acc-bar-head">
        <span>{label}</span>
        <span>{money(value)}</span>
      </div>
      <div className="acc-bar-track">
        <span
          className={`acc-bar-fill${negative ? " is-negative" : ""}`}
          style={{ width: `${Math.max(width, 2)}%` }}
        />
      </div>
    </div>
  );
}

/** نمای کلی حسابداری: سود ماه، انبار، بدهی و چک‌های نزدیک سررسید. */
export default function AccountingOverviewPanel({
  overview,
  loading,
}: {
  overview: AccountingOverview | null;
  loading: boolean;
}) {
  if (loading && !overview) {
    return (
      <Panel title="نمای کلی">
        <EmptyState>در حال محاسبهٔ وضعیت مالی…</EmptyState>
      </Panel>
    );
  }

  if (!overview) {
    return (
      <Panel title="نمای کلی">
        <EmptyState>اطلاعات حسابداری در دسترس نیست.</EmptyState>
      </Panel>
    );
  }

  const { current, previous, series, cheques } = overview;
  const maxNet = Math.max(...series.map((row: MonthlyRow) => Math.abs(row.net)), 1);
  const currentNet = current.profit.net;

  return (
    <>
      <Panel
        title={`سود ماه جاری (${current.period.from} تا ${current.period.to})`}
        description="فروش کالا منهای بهای تمام‌شده، به‌علاوهٔ کرایهٔ دریافتی و منهای هزینه‌های دوره."
      >
        <div className="acc-stats">
          <StatCard
            label="سود ناخالص"
            value={money(current.profit.gross)}
            hint={`حاشیهٔ سود ${num(current.profit.gross_margin)}٪`}
            tone={current.profit.gross >= 0 ? "good" : "bad"}
          />
          <StatCard
            label="سود خالص ماه"
            value={money(currentNet)}
            hint={`ماه قبل: ${money(previous.profit.net)}`}
            tone={currentNet >= 0 ? "good" : "bad"}
          />
          <StatCard
            label="فروش کالا"
            value={money(current.sales.revenue)}
            hint={`${num(current.sales.orders_count)} سفارش پرداخت‌شده`}
          />
          <StatCard
            label="ارزش موجودی انبار"
            value={money(overview.inventory_value)}
            hint="موجودی × آخرین قیمت خرید"
          />
          <StatCard
            label="بدهی به تأمین‌کنندگان"
            value={money(overview.supplier_debt)}
            hint="ماندهٔ تسویه‌نشدهٔ فاکتورهای خرید"
            tone={overview.supplier_debt > 0 ? "warn" : "good"}
          />
          <StatCard
            label="چک‌های در جریان"
            value={money(cheques.paid_pending)}
            hint={`دریافتی در جریان: ${money(cheques.received_pending)}`}
            tone={cheques.overdue_count > 0 ? "bad" : "warn"}
          />
        </div>
      </Panel>

      <Panel
        title="روند سود ۶ ماه گذشته"
        description="مقایسهٔ سود خالص ماه‌ها؛ ماه‌های زیان‌ده قرمز نمایش داده می‌شوند."
      >
        <div className="acc-bars">
          {series.map((row) => (
            <Bar
              key={row.month}
              label={monthLabel(row.month)}
              value={row.net}
              max={maxNet}
              negative={row.net < 0}
            />
          ))}
        </div>
      </Panel>

      <div className="acc-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        <Panel title="چک‌های نزدیک سررسید" description="چک‌های در جریان تا ۱۴ روز آینده یا سررسیدگذشته.">
          {cheques.upcoming.length === 0 ? (
            <EmptyState>چک در جریانی نزدیک سررسید نیست.</EmptyState>
          ) : (
            <div className="acc-list">
              {cheques.upcoming.map((cheque) => (
                <div className="acc-list-row" key={cheque.id}>
                  <div>
                    <div>{cheque.party_name || cheque.bank_name || "چک"}</div>
                    <div className="acc-list-meta">
                      <span>{cheque.direction === "paid" ? "پرداختی" : "دریافتی"}</span>
                      <span>سررسید: {cheque.due_date ?? "—"}</span>
                    </div>
                  </div>
                  <span className={cheque.is_overdue ? "acc-badge is-bad" : "acc-badge is-warn"}>
                    {money(cheque.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="آخرین فاکتورهای خرید" description="پنج فاکتور آخر با ماندهٔ بدهی.">
          {overview.recent_invoices.length === 0 ? (
            <EmptyState>هنوز فاکتور خریدی ثبت نشده است.</EmptyState>
          ) : (
            <div className="acc-list">
              {overview.recent_invoices.map((invoice) => (
                <div className="acc-list-row" key={invoice.id}>
                  <div>
                    <div dir="ltr">{invoice.invoice_number}</div>
                    <div className="acc-list-meta">
                      <span>{invoice.supplier ?? "بدون تأمین‌کننده"}</span>
                      <span>{invoice.issued_at ?? "—"}</span>
                    </div>
                  </div>
                  <span className={invoice.remaining > 0 ? "acc-badge is-warn" : "acc-badge is-ok"}>
                    {money(invoice.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
