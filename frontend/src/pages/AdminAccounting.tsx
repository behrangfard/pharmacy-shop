import { useCallback, useEffect, useRef, useState } from "react";
import { Calculator, Receipt, RefreshCw, TrendingUp, Users, Wallet, Landmark } from "lucide-react";

import { adminApi } from "../services/api";
import { getAdminErrorMessage } from "../utils/adminFormat";
import AccountingOverviewPanel from "../components/accounting/AccountingOverviewPanel";
import ChequesPanel from "../components/accounting/ChequesPanel";
import ExpensesPanel from "../components/accounting/ExpensesPanel";
import ProfitReportPanel from "../components/accounting/ProfitReportPanel";
import PurchaseInvoicesPanel from "../components/accounting/PurchaseInvoicesPanel";
import SuppliersPanel from "../components/accounting/SuppliersPanel";
import {
  AccountingStyle,
  FlashAlert,
  Panel,
  useFlash,
  type AccountingOverview,
  type ProfitReport,
  type Supplier,
} from "../components/accounting/accountingUi";

type TabKey = "overview" | "invoices" | "suppliers" | "expenses" | "cheques" | "profit";

const TABS: { key: TabKey; label: string; icon: typeof Calculator }[] = [
  { key: "overview", label: "نمای کلی", icon: Calculator },
  { key: "invoices", label: "فاکتورهای خرید", icon: Receipt },
  { key: "suppliers", label: "تأمین‌کنندگان", icon: Users },
  { key: "expenses", label: "هزینه‌ها", icon: Wallet },
  { key: "cheques", label: "چک‌ها", icon: Landmark },
  { key: "profit", label: "گزارش سود", icon: TrendingUp },
];

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => `${today().slice(0, 7)}-01`;

/**
 * صفحهٔ حسابداری فروشگاه خانگی: خرید و موجودی، هزینه، چک و گزارش سود.
 *
 * همهٔ محاسبه‌ها در سرور انجام می‌شود و این صفحه فقط انتخاب بازه و نمایش
 * نتیجه را بر عهده دارد.
 */
export default function AdminAccounting() {
  const [tab, setTab] = useState<TabKey>("overview");
  const [overview, setOverview] = useState<AccountingOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [report, setReport] = useState<ProfitReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [range, setRange] = useState({ from: monthStart(), to: today() });
  const { flash, error, success } = useFlash();
  const initialLoadRef = useRef(false);
  /** جلوگیری از ارسال دوبارهٔ درخواست قبل از رندر شدن حالت disabled دکمه. */
  const refreshingRef = useRef(false);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);

    try {
      const response = await adminApi.get<{ data: AccountingOverview }>("/admin/accounting/overview");
      setOverview(response.data.data);
    } catch (caught) {
      error(getAdminErrorMessage(caught, "دریافت خلاصهٔ حسابداری انجام نشد."));
    } finally {
      setOverviewLoading(false);
    }
  }, [error]);

  const loadSuppliers = useCallback(async () => {
    try {
      const response = await adminApi.get<{ data: Supplier[] }>("/admin/accounting/suppliers");
      setSuppliers(response.data.data ?? []);
    } catch {
      // فهرست تأمین‌کنندگان برای فرم‌هاست؛ خطای آن صفحه را متوقف نمی‌کند.
    }
  }, []);

  const loadReport = useCallback(
    async (from: string, to: string) => {
      setReportLoading(true);

      try {
        const response = await adminApi.get<{ data: ProfitReport }>("/admin/accounting/report", {
          params: { from, to },
        });
        setReport(response.data.data);
      } catch (caught) {
        error(getAdminErrorMessage(caught, "محاسبهٔ گزارش سود انجام نشد."));
      } finally {
        setReportLoading(false);
      }
    },
    [error],
  );

  useEffect(() => {
    // بارگذاری اولیه فقط یک‌بار؛ در حالت توسعه React.StrictMode افکت را دو بار
    // اجرا می‌کند و بدون این محافظ، خلاصهٔ سنگین حسابداری دو بار درخواست می‌شد.
    if (initialLoadRef.current) return;

    initialLoadRef.current = true;

    void loadOverview();
    void loadSuppliers();
  }, [loadOverview, loadSuppliers]);

  useEffect(() => {
    if (tab === "profit") {
      void loadReport(range.from, range.to);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, range.from, range.to]);

  const refreshAll = async () => {
    if (refreshingRef.current) return;

    refreshingRef.current = true;
    setRefreshing(true);

    try {
      await Promise.all([loadOverview(), loadSuppliers()]);
      success("اطلاعات حسابداری به‌روزرسانی شد.");
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
    }
  };

  return (
    <div dir="rtl" className="acc-page">
      <AccountingStyle />

      <header className="acc-panel" style={{ padding: 18 }}>
        <div className="acc-panel-head">
          <div>
            <h1 style={{ margin: 0, fontSize: 21, fontWeight: 850 }}>حسابداری فروشگاه</h1>
            <p className="acc-subtitle">
              ثبت فاکتور خرید و افزایش موجودی، هزینه‌های باربری، مدیریت چک‌ها و محاسبهٔ سود دوره‌ای.
            </p>
          </div>

          <div className="acc-actions">
            <button
              type="button"
              className="acc-button"
              onClick={() => void refreshAll()}
              disabled={refreshing}
              aria-busy={refreshing}
            >
              <RefreshCw size={15} aria-hidden="true" />
              {refreshing ? "در حال به‌روزرسانی…" : "به‌روزرسانی"}
            </button>
          </div>
        </div>
      </header>

      <nav className="acc-tabs" aria-label="بخش‌های حسابداری">
        {TABS.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.key}
              type="button"
              className={`acc-tab${tab === item.key ? " is-active" : ""}`}
              onClick={() => setTab(item.key)}
              aria-pressed={tab === item.key}
            >
              <Icon size={15} aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <FlashAlert flash={flash} />

      {tab === "overview" && (
        <AccountingOverviewPanel overview={overview} loading={overviewLoading} />
      )}

      {tab === "invoices" && <PurchaseInvoicesPanel suppliers={suppliers} />}

      {tab === "suppliers" && (
        <SuppliersPanel
          onChanged={() => {
            void loadSuppliers();
            void loadOverview();
          }}
        />
      )}

      {tab === "expenses" && <ExpensesPanel suppliers={suppliers} />}

      {tab === "cheques" && <ChequesPanel suppliers={suppliers} />}

      {tab === "profit" && (
        <ProfitReportPanel
          report={report}
          loading={reportLoading}
          from={range.from}
          to={range.to}
          onChangeRange={(from, to) => setRange({ from, to })}
          onRefresh={() => void loadReport(range.from, range.to)}
        />
      )}

      {tab === "overview" && !overviewLoading && !overview && (
        <Panel title="راهنما">
          <p className="acc-subtitle">
            برای شروع، ابتدا یک تأمین‌کننده بسازید و سپس فاکتور خرید ثبت کنید تا موجودی و قیمت خرید
            محصولات ثبت شود.
          </p>
        </Panel>
      )}
    </div>
  );
}
