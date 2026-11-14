import { useState } from "react";
import { RefreshCw } from "lucide-react";

import {
  DateField,
  EmptyState,
  Panel,
  StatCard,
  money,
  num,
  type ProfitReport,
} from "./accountingUi";

type Props = {
  report: ProfitReport | null;
  loading: boolean;
  from: string;
  to: string;
  onChangeRange: (from: string, to: string) => void;
  onRefresh: () => void;
};

const isoToday = () => new Date().toISOString().slice(0, 10);
const firstOfMonth = () => `${isoToday().slice(0, 7)}-01`;

const shiftMonth = (value: string, months: number) => {
  const date = new Date(`${value}T00:00:00`);
  date.setMonth(date.getMonth() + months);

  return date;
};

/** گزارش سود دوره‌ای با انتخاب بازه و نمایش ماه‌به‌ماه. */
export default function ProfitReportPanel({
  report,
  loading,
  from,
  to,
  onChangeRange,
  onRefresh,
}: Props) {
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);

  const applyPreset = (months: number) => {
    const start = shiftMonth(firstOfMonth(), -(months - 1));

    onChangeRange(start.toISOString().slice(0, 10), isoToday());
  };

  return (
    <>
      <Panel
        title="گزارش سود دوره‌ای"
        description="بازهٔ دلخواه را انتخاب کنید؛ سود ناخالص، هزینه‌ها و سود خالص دوره محاسبه می‌شود."
        actions={
          <button type="button" className="acc-button" onClick={onRefresh} disabled={loading}>
            <RefreshCw size={15} aria-hidden="true" /> {loading ? "در حال محاسبه…" : "به‌روزرسانی"}
          </button>
        }
      >
        <div className="acc-actions">
          <button type="button" className="acc-button" onClick={() => applyPreset(1)}>
            ماه جاری
          </button>
          <button type="button" className="acc-button" onClick={() => applyPreset(3)}>
            ۳ ماه اخیر
          </button>
          <button type="button" className="acc-button" onClick={() => applyPreset(6)}>
            ۶ ماه اخیر
          </button>
          <button type="button" className="acc-button" onClick={() => applyPreset(12)}>
            ۱۲ ماه اخیر
          </button>
        </div>

        <div className="acc-grid">
          <DateField label="از تاریخ" value={draftFrom} onChange={setDraftFrom} />
          <DateField label="تا تاریخ" value={draftTo} onChange={setDraftTo} />

          <div className="acc-field" style={{ alignSelf: "end" }}>
            <button
              type="button"
              className="acc-button acc-button-primary"
              onClick={() => onChangeRange(draftFrom || firstOfMonth(), draftTo || isoToday())}
            >
              نمایش گزارش
            </button>
          </div>
        </div>
      </Panel>

      {!report ? (
        <Panel title="نتیجه">
          <EmptyState>{loading ? "در حال محاسبهٔ سود…" : "گزارشی برای نمایش نیست."}</EmptyState>
        </Panel>
      ) : (
        <>
          <Panel
            title={`سود بازهٔ ${report.period.from} تا ${report.period.to}`}
            description={`${num(report.sales.orders_count)} سفارش پرداخت‌شده، ${num(
              report.costs.purchases_count,
            )} فاکتور خرید.`}
          >
            <div className="acc-stats">
              <StatCard
                label="سود ناخالص"
                value={money(report.profit.gross)}
                hint={`حاشیهٔ سود ${num(report.profit.gross_margin)}٪`}
                tone={report.profit.gross >= 0 ? "good" : "bad"}
              />
              <StatCard
                label="سود خالص"
                value={money(report.profit.net)}
                hint="پس از کسر هزینه‌ها و باربری خرید"
                tone={report.profit.net >= 0 ? "good" : "bad"}
              />
              <StatCard
                label="فروش کالا"
                value={money(report.sales.revenue)}
                hint={`تخفیف داده‌شده: ${money(report.sales.discount)}`}
              />
              <StatCard
                label="بهای تمام‌شدهٔ کالای فروش‌رفته"
                value={money(report.costs.cogs)}
                hint="قیمت خرید لحظهٔ فروش"
              />
              <StatCard
                label="کرایهٔ دریافتی از مشتری"
                value={money(report.sales.shipping_income)}
                hint="در سود خالص اضافه می‌شود"
              />
              <StatCard
                label="هزینه‌های دوره"
                value={money(report.costs.expenses)}
                hint={`باربری خرید: ${money(report.costs.purchase_shipping)}`}
                tone={report.costs.expenses > 0 ? "warn" : "default"}
              />
            </div>
          </Panel>

          <Panel title="تفکیک ماه‌به‌ماه" description="درآمد کالا، بهای تمام‌شده، هزینه‌ها و سود خالص هر ماه.">
            <div className="acc-table-wrap">
              <table className="acc-table">
                <thead>
                  <tr>
                    <th>ماه</th>
                    <th>سفارش</th>
                    <th>فروش کالا</th>
                    <th>بهای تمام‌شده</th>
                    <th>سود ناخالص</th>
                    <th>هزینه‌ها</th>
                    <th>سود خالص</th>
                  </tr>
                </thead>
                <tbody>
                  {report.monthly.map((row) => (
                    <tr key={row.month}>
                      <td>{row.month}</td>
                      <td>{num(row.orders_count)}</td>
                      <td>{money(row.revenue)}</td>
                      <td>{money(row.cogs)}</td>
                      <td>{money(row.gross)}</td>
                      <td>{money(row.expenses + row.purchase_shipping)}</td>
                      <td>
                        <span className={row.net >= 0 ? "acc-badge is-ok" : "acc-badge is-bad"}>
                          {money(row.net)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <div
            className="acc-grid"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}
          >
            <Panel title="هزینه‌ها به تفکیک دسته">
              {report.costs.expenses_by_category.length === 0 ? (
                <EmptyState>هزینه‌ای در این بازه ثبت نشده است.</EmptyState>
              ) : (
                <div className="acc-list">
                  {report.costs.expenses_by_category.map((row) => (
                    <div className="acc-list-row" key={row.key}>
                      <span>{row.label}</span>
                      <span className="acc-badge is-warn">{money(row.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="پرفروش‌ترین محصولات">
              {report.top_products.length === 0 ? (
                <EmptyState>فروشی در این بازه ثبت نشده است.</EmptyState>
              ) : (
                <div className="acc-list">
                  {report.top_products.map((row) => (
                    <div className="acc-list-row" key={row.name}>
                      <div>
                        <div>{row.name}</div>
                        <div className="acc-list-meta">
                          <span>{num(row.quantity)} عدد</span>
                          <span>سود: {money(row.profit)}</span>
                        </div>
                      </div>
                      <span className="acc-badge is-ok">{money(row.revenue)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </>
      )}
    </>
  );
}
