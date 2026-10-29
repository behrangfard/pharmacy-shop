import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  UserRound,
  Search,
  RefreshCw,
  ShoppingCart,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Mail,
  CalendarDays,
  Trash2,
  CheckCircle2,
  X,
  Eye,
  EyeOff,
  Wallet,
} from "lucide-react";
import { adminApi } from "../services/api";

type Customer = {
  id: number;
  name: string;
  email: string;
  created_at: string;
  orders_count: number;
  total_spent: number | string | null;
};

type Pagination = {
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
};

type CustomerSummary = {
  total_customers: number;
  new_customers: number;
  customers_with_orders: number;
};

type CustomerResponse = {
  success: boolean;
  data: {
    data: Customer[];
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
  };
  summary: CustomerSummary;
};

type ApiErrorResponse = {
  message?: string;
  errors?: Record<string, string[]>;
};

type CreateCustomerResponse = {
  success: boolean;
  message?: string;
  data?: {
    id: number;
    name: string;
    email: string;
    created_at: string;
  };
};

const numberFormatter = new Intl.NumberFormat("fa-IR");

function formatNumber(value: number | string | null | undefined) {
  return numberFormatter.format(Number(value) || 0);
}

function formatPrice(value: number | string | null | undefined) {
  return `${formatNumber(value)} تومان`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const responseError = error as {
    response?: { data?: ApiErrorResponse };
  };

  const data = responseError?.response?.data;

  if (data?.errors) {
    const firstError = Object.values(data.errors).flat()[0];
    if (firstError) return firstError;
  }

  return data?.message || fallback;
}

const initialSummary: CustomerSummary = {
  total_customers: 0,
  new_customers: 0,
  customers_with_orders: 0,
};

function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [summary, setSummary] = useState<CustomerSummary>(initialSummary);

  const [pagination, setPagination] = useState<Pagination>({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 10,
  });

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState<"success" | "error">("success");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);
  const deletingRef = useRef<number | null>(null);
  const creatingRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextSearch = searchInput.trim();

      setPage(1);
      setSearch((current) => (current === nextSearch ? current : nextSearch));
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadCustomers = useCallback(
    async (mode: "initial" | "refresh" = "refresh") => {
      const requestId = ++requestIdRef.current;

      if (mode === "initial") setLoading(true);
      else setRefreshing(true);

      setError("");

      try {
        const response = await adminApi.get<CustomerResponse>(
          "/admin/customers",
          {
            params: {
              page,
              per_page: 10,
              search: search || undefined,
              sort_by: "created_at",
              sort_direction: "desc",
            },
          },
        );

        if (!mountedRef.current || requestId !== requestIdRef.current) {
          return;
        }

        const result = response.data;

        if (!result?.success || !result?.data) {
          throw new Error("پاسخ سرور معتبر نیست.");
        }

        setCustomers(Array.isArray(result.data.data) ? result.data.data : []);

        setPagination({
          current_page: result.data.current_page ?? page,
          last_page: result.data.last_page ?? 1,
          total: result.data.total ?? 0,
          per_page: result.data.per_page ?? 10,
        });

        setSummary(result.summary ?? initialSummary);
      } catch {
        if (!mountedRef.current || requestId !== requestIdRef.current) {
          return;
        }

        setError("دریافت اطلاعات مشتریان انجام نشد. دوباره تلاش کن.");
      } finally {
        if (mountedRef.current && requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [page, search],
  );

  useEffect(() => {
    void loadCustomers("initial");
  }, [loadCustomers]);

  useEffect(() => {
    if (!createModalOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !creatingRef.current) {
        setCreateModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [createModalOpen]);

  const openCreateModal = useCallback(() => {
    setForm({ name: "", email: "", password: "" });
    setFormError("");
    setFormErrors({});
    setShowPassword(false);
    setCreateModalOpen(true);
  }, []);

  const closeCreateModal = useCallback(() => {
    if (creatingRef.current) return;

    setCreateModalOpen(false);
    setFormError("");
    setFormErrors({});
  }, []);

  const handleCreateCustomer = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (creatingRef.current) return;

      const name = form.name.trim();
      const email = form.email.trim().toLowerCase();
      const password = form.password;

      const nextErrors: Record<string, string> = {};

      if (!name) {
        nextErrors.name = "نام مشتری را وارد کن.";
      } else if (name.length > 255) {
        nextErrors.name = "نام نباید بیشتر از ۲۵۵ کاراکتر باشد.";
      }

      if (!email) {
        nextErrors.email = "ایمیل مشتری را وارد کن.";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        nextErrors.email = "فرمت ایمیل معتبر نیست.";
      } else if (email.length > 255) {
        nextErrors.email = "ایمیل بیش از حد طولانی است.";
      }

      if (!password) {
        nextErrors.password = "رمز عبور اولیه را وارد کن.";
      } else if (password.length < 8) {
        nextErrors.password = "رمز عبور باید حداقل ۸ کاراکتر باشد.";
      } else if (password.length > 128) {
        nextErrors.password = "رمز عبور نباید بیشتر از ۱۲۸ کاراکتر باشد.";
      }

      setFormErrors(nextErrors);
      setFormError("");
      setNotice("");

      if (Object.keys(nextErrors).length > 0) return;

      creatingRef.current = true;
      setCreating(true);

      try {
        const response = await adminApi.post<CreateCustomerResponse>(
          "/admin/customers",
          { name, email, password },
        );

        if (!mountedRef.current) return;

        if (!response.data?.success) {
          throw new Error(response.data?.message || "ثبت مشتری انجام نشد.");
        }

        setCreateModalOpen(false);
        setForm({ name: "", email: "", password: "" });
        setFormErrors({});
        setFormError("");
        setNotice(response.data.message || "مشتری جدید با موفقیت ثبت شد.");
        setNoticeType("success");

        setSearchInput("");
        setSearch("");
        setPage(1);

        if (page === 1 && search === "") {
          await loadCustomers("refresh");
        }
      } catch (createError) {
        if (!mountedRef.current) return;

        setFormError(
          getApiErrorMessage(
            createError,
            "ثبت مشتری انجام نشد. اتصال به سرور و اطلاعات واردشده را بررسی کن.",
          ),
        );
      } finally {
        creatingRef.current = false;

        if (mountedRef.current) setCreating(false);
      }
    },
    [form, loadCustomers, page, search],
  );

  const handleDeleteCustomer = useCallback(
    async (customer: Customer) => {
      if (deletingRef.current !== null) return;

      const confirmed = window.confirm(
        `آیا از حذف حساب مشتری «${customer.name || customer.email}» مطمئنی؟\n\nاین عملیات قابل بازگشت نیست. اگر مشتری سابقه سفارش داشته باشد، سرور اجازه حذف نخواهد داد.`,
      );

      if (!confirmed) return;

      deletingRef.current = customer.id;
      setDeletingId(customer.id);
      setNotice("");
      setError("");

      try {
        const response = await adminApi.delete<{
          success: boolean;
          message?: string;
        }>(`/admin/customers/${customer.id}`);

        if (!mountedRef.current) return;

        if (!response.data?.success) {
          throw new Error(response.data?.message || "حذف مشتری انجام نشد.");
        }

        setNotice(response.data.message || "مشتری با موفقیت حذف شد.");
        setNoticeType("success");

        if (customers.length === 1 && page > 1) {
          setPage((current) => Math.max(1, current - 1));
        } else {
          await loadCustomers("refresh");
        }
      } catch (deleteError) {
        if (!mountedRef.current) return;

        setNotice(
          getApiErrorMessage(
            deleteError,
            "حذف مشتری انجام نشد. لطفاً دوباره تلاش کن.",
          ),
        );
        setNoticeType("error");
      } finally {
        deletingRef.current = null;

        if (mountedRef.current) setDeletingId(null);
      }
    },
    [customers.length, loadCustomers, page],
  );

  const stats = [
    {
      title: "کل مشتریان",
      value: summary.total_customers,
      description: "حساب‌های مشتریان فروشگاه",
      icon: Users,
      color: "#527b54",
      background: "#edf4e9",
    },
    {
      title: "مشتریان جدید",
      value: summary.new_customers,
      description: "عضویت از ابتدای ماه جاری",
      icon: UserPlus,
      color: "#397c91",
      background: "#eaf3f5",
    },
    {
      title: "مشتریان دارای سفارش",
      value: summary.customers_with_orders,
      description: "مشتریانی که سفارش ثبت کرده‌اند",
      icon: ShoppingCart,
      color: "#b47b3c",
      background: "#fbf2e5",
    },
  ];

  const renderCustomerCard = (customer: Customer) => (
    <article className="customer-mobile-card" key={customer.id}>
      <div className="customer-mobile-top">
        <div className="customer-mobile-identity">
          <span className="customers-avatar">
            {customer.name?.trim()?.charAt(0) || "م"}
          </span>

          <div className="customer-mobile-person">
            <strong className="customer-mobile-name">
              {customer.name || "بدون نام"}
            </strong>

            <span className="customer-mobile-email" dir="ltr">
              <Mail size={13} aria-hidden="true" />
              <span>{customer.email || "ایمیل ثبت نشده"}</span>
            </span>
          </div>
        </div>

        <span className="customers-order-badge">
          {formatNumber(customer.orders_count)} سفارش
        </span>
      </div>

      <div className="customer-mobile-divider" />

      <div className="customer-mobile-info">
        <div className="customer-mobile-info-item">
          <span className="customer-mobile-label">
            <CalendarDays size={14} aria-hidden="true" />
            تاریخ عضویت
          </span>
          <strong>{formatDate(customer.created_at)}</strong>
        </div>

        <div className="customer-mobile-info-item">
          <span className="customer-mobile-label">
            <Wallet size={14} aria-hidden="true" />
            مجموع خرید پرداخت‌شده
          </span>
          <strong className="customer-mobile-price">
            {formatPrice(customer.total_spent)}
          </strong>
        </div>
      </div>

      <div className="customer-mobile-actions">
        <Link
          className="customer-mobile-detail"
          to={`/admin/customers/${customer.id}`}
        >
          <UserRound size={15} aria-hidden="true" />
          مشاهده جزئیات
          <ChevronLeft size={15} aria-hidden="true" />
        </Link>

        <button
          type="button"
          className="customers-delete customer-mobile-delete"
          onClick={() => void handleDeleteCustomer(customer)}
          disabled={deletingId !== null || loading || refreshing || creating}
          aria-label={`حذف مشتری ${customer.name || customer.email}`}
        >
          {deletingId === customer.id ? (
            <RefreshCw
              size={14}
              className="customers-spin"
              aria-hidden="true"
            />
          ) : (
            <Trash2 size={14} aria-hidden="true" />
          )}
          {deletingId === customer.id ? "در حال حذف..." : "حذف"}
        </button>
      </div>
    </article>
  );

  return (
    <div className="customers-page" dir="rtl">
      <style>{`
        .customers-page {
          --customer-ink: #243529;
          --customer-muted: #829084;
          --customer-line: #e9eee7;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          padding-bottom: 28px;
          color: var(--customer-ink);
        }

        .customers-page,
        .customers-page * {
          box-sizing: border-box;
        }

        .customers-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 24px;
          min-width: 0;
        }

        .customers-heading > div:first-child {
          min-width: 0;
        }

        .customers-eyebrow {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 8px;
          color: #648066;
          font-size: 12px;
          font-weight: 700;
        }

        .customers-title {
          margin: 0;
          color: var(--customer-ink);
          font-size: clamp(23px, 3vw, 30px);
          font-weight: 900;
          letter-spacing: -.5px;
        }

        .customers-subtitle {
          margin: 9px 0 0;
          color: var(--customer-muted);
          font-size: 13px;
          line-height: 1.9;
        }

        .customers-header-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          flex-wrap: wrap;
          gap: 9px;
          flex-shrink: 0;
        }

        .customers-refresh,
        .customers-add {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 42px;
          padding: 0 14px;
          border-radius: 11px;
          font: inherit;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
          transition: background .15s ease, border-color .15s ease;
        }

        .customers-refresh {
          color: #476a49;
          background: #fff;
          border: 1px solid #dfe8dc;
        }

        .customers-refresh:hover:not(:disabled) {
          background: #f7faf5;
        }

        .customers-add {
          color: #fff;
          background: #527b54;
          border: 1px solid #527b54;
          box-shadow: 0 4px 10px rgba(82,123,84,.12);
        }

        .customers-add:hover:not(:disabled) {
          background: #416943;
        }

        .customers-refresh:disabled,
        .customers-add:disabled {
          opacity: .65;
          cursor: wait;
        }

        .customers-spin {
          animation: customers-rotation .8s linear infinite;
        }

        @keyframes customers-rotation {
          to { transform: rotate(360deg); }
        }

        .customers-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 24px;
          min-width: 0;
        }

        .customers-stat {
          min-width: 0;
          padding: 21px;
          background: #fff;
          border: 1px solid var(--customer-line);
          border-radius: 16px;
          box-shadow: 0 5px 22px rgba(31,55,35,.025);
        }

        .customers-stat-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .customers-stat-label {
          color: #738174;
          font-size: 12px;
          font-weight: 700;
          overflow-wrap: anywhere;
        }

        .customers-stat-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 43px;
          height: 43px;
          flex-shrink: 0;
          border-radius: 13px;
        }

        .customers-stat-value {
          margin: 17px 0 7px;
          font-size: 27px;
          font-weight: 900;
          line-height: 1.4;
          overflow-wrap: anywhere;
        }

        .customers-stat-description {
          margin: 0;
          color: var(--customer-muted);
          font-size: 11px;
          line-height: 1.8;
          overflow-wrap: anywhere;
        }

        .customers-panel {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          overflow: hidden;
          background: #fff;
          border: 1px solid var(--customer-line);
          border-radius: 16px;
          box-shadow: 0 5px 22px rgba(31,55,35,.025);
        }

        .customers-panel-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          min-width: 0;
          padding: 22px 23px;
          border-bottom: 1px solid #edf0ea;
        }

        .customers-panel-heading > div {
          min-width: 0;
        }

        .customers-panel-title {
          margin: 0;
          color: var(--customer-ink);
          font-size: 15px;
          font-weight: 900;
        }

        .customers-panel-caption {
          margin: 7px 0 0;
          color: var(--customer-muted);
          font-size: 11px;
          line-height: 1.8;
          overflow-wrap: anywhere;
        }

        .customers-count {
          flex-shrink: 0;
          padding: 7px 10px;
          color: #58775a;
          background: #edf4e9;
          border-radius: 9px;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }

        .customers-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          min-width: 0;
          padding: 17px 23px;
          border-bottom: 1px solid #f0f2ee;
        }

        .customers-search {
          display: flex;
          align-items: center;
          gap: 10px;
          width: min(100%, 380px);
          min-width: 0;
          min-height: 43px;
          padding: 0 13px;
          color: #879487;
          background: #f8faf7;
          border: 1px solid #e9eee6;
          border-radius: 11px;
        }

        .customers-search input {
          width: 100%;
          min-width: 0;
          color: var(--customer-ink);
          background: transparent;
          border: 0;
          outline: none;
          font: inherit;
          font-size: 12px;
        }

        .customers-search input::placeholder {
          color: #a0aaa0;
        }

        .customers-result-count {
          color: var(--customer-muted);
          font-size: 11px;
          white-space: nowrap;
          overflow-wrap: anywhere;
        }

        .customers-table-wrap {
          width: 100%;
          min-width: 0;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .customers-table {
          width: 100%;
          border-collapse: collapse;
          text-align: right;
          white-space: nowrap;
        }

        .customers-table th {
          padding: 14px 20px;
          color: #819082;
          background: #fafbf9;
          font-size: 11px;
          font-weight: 800;
          border-bottom: 1px solid #edf0ea;
        }

        .customers-table td {
          padding: 16px 20px;
          color: #526153;
          font-size: 12px;
          border-bottom: 1px solid #f0f2ee;
        }

        .customers-table tbody tr:last-child td {
          border-bottom: 0;
        }

        .customers-table tbody tr:hover {
          background: #fcfdfb;
        }

        .customers-person {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 185px;
        }

        .customers-avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 39px;
          height: 39px;
          flex-shrink: 0;
          color: #527852;
          background: #edf4e9;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 900;
        }

        .customers-person-name {
          display: block;
          max-width: 200px;
          overflow: hidden;
          color: #2e4031;
          font-size: 12px;
          font-weight: 800;
          text-overflow: ellipsis;
        }

        .customers-person-email {
          display: flex;
          align-items: center;
          gap: 5px;
          max-width: 230px;
          margin-top: 6px;
          overflow: hidden;
          color: #8a978a;
          font-size: 10px;
          text-overflow: ellipsis;
        }

        .customers-order-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 31px;
          padding: 5px 8px;
          color: #507752;
          background: #edf4e9;
          border-radius: 7px;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }

        .customers-detail-link {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: #527852;
          text-decoration: none;
          font-size: 11px;
          font-weight: 800;
        }

        .customers-detail-link:hover {
          color: #294c2b;
        }

        .customers-delete {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          min-height: 32px;
          padding: 0 9px;
          color: #b5473d;
          background: #fff7f5;
          border: 1px solid #f2ded9;
          border-radius: 8px;
          font: inherit;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .customers-delete:hover:not(:disabled) {
          color: #922e27;
          background: #ffefeb;
        }

        .customers-delete:disabled {
          opacity: .55;
          cursor: wait;
        }

        .customers-notice {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          margin: 14px 0 20px;
          padding: 12px 14px;
          border: 1px solid;
          border-radius: 10px;
          font-size: 12px;
          line-height: 1.9;
          min-width: 0;
        }

        .customers-notice-success {
          color: #356b40;
          background: #f0f8ef;
          border-color: #d8ead5;
        }

        .customers-notice-error {
          color: #a13e35;
          background: #fff5f2;
          border-color: #f0d9d2;
        }

        .customers-notice-text {
          flex: 1;
          min-width: 0;
          overflow-wrap: anywhere;
        }

        .customers-notice-dismiss {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          padding: 2px;
          color: inherit;
          background: transparent;
          border: 0;
          cursor: pointer;
        }

        .customers-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 11px;
          min-height: 210px;
          padding: 25px;
          color: var(--customer-muted);
          font-size: 12px;
          text-align: center;
          line-height: 1.9;
          overflow-wrap: anywhere;
        }

        .customers-error {
          color: #a64b3f;
          background: #fff6f3;
          border-bottom: 1px solid #f2dfd9;
        }

        .customers-retry {
          padding: 8px 12px;
          color: #527852;
          background: #fff;
          border: 1px solid #dfe8dc;
          border-radius: 8px;
          font: inherit;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .customers-pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          min-width: 0;
          padding: 17px 23px;
          border-top: 1px solid #edf0ea;
        }

        .customers-pagination-info {
          color: var(--customer-muted);
          font-size: 11px;
          overflow-wrap: anywhere;
        }

        .customers-pagination-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .customers-page-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          min-height: 35px;
          padding: 0 10px;
          color: #526153;
          background: #fff;
          border: 1px solid #e4eae1;
          border-radius: 9px;
          font: inherit;
          font-size: 11px;
          cursor: pointer;
        }

        .customers-page-button:disabled {
          opacity: .4;
          cursor: not-allowed;
        }

        /* کارت‌های مخصوص نمایش موبایل */
        .customers-mobile-list {
          display: none;
          min-width: 0;
          padding: 12px;
          gap: 12px;
        }

        .customer-mobile-card {
          width: 100%;
          min-width: 0;
          padding: 15px;
          background: #fff;
          border: 1px solid #e8eee5;
          border-radius: 14px;
          box-shadow: 0 3px 12px rgba(31,55,35,.035);
        }

        .customer-mobile-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          min-width: 0;
        }

        .customer-mobile-identity {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          min-width: 0;
        }

        .customer-mobile-person {
          min-width: 0;
          flex: 1;
        }

        .customer-mobile-name {
          display: block;
          color: #2e4031;
          font-size: 13px;
          line-height: 1.8;
          overflow-wrap: anywhere;
        }

        .customer-mobile-email {
          display: flex;
          align-items: center;
          gap: 5px;
          min-width: 0;
          margin-top: 5px;
          color: #819082;
          font-size: 10px;
        }

        .customer-mobile-email svg {
          flex-shrink: 0;
        }

        .customer-mobile-email span {
          min-width: 0;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .customer-mobile-top .customers-order-badge {
          max-width: 100px;
          white-space: normal;
          text-align: center;
          line-height: 1.8;
          flex-shrink: 0;
        }

        .customer-mobile-divider {
          height: 1px;
          margin: 14px 0;
          background: #edf0ea;
        }

        .customer-mobile-info {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 12px;
          min-width: 0;
        }

        .customer-mobile-info-item {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          min-width: 0;
        }

        .customer-mobile-label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #829084;
          font-size: 11px;
          line-height: 1.9;
          min-width: 0;
        }

        .customer-mobile-label svg {
          flex-shrink: 0;
        }

        .customer-mobile-info-item > strong {
          max-width: 58%;
          color: #405343;
          font-size: 11px;
          line-height: 1.9;
          text-align: left;
          overflow-wrap: anywhere;
        }

        .customer-mobile-info-item > .customer-mobile-price {
          color: #527852;
          font-weight: 900;
        }

        .customer-mobile-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 16px;
          padding-top: 13px;
          border-top: 1px solid #edf0ea;
        }

        .customer-mobile-detail {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          flex: 1;
          min-width: 0;
          min-height: 36px;
          padding: 0 8px;
          color: #527852;
          background: #f3f7f0;
          border: 1px solid #e2ebde;
          border-radius: 9px;
          font-size: 11px;
          font-weight: 800;
          text-decoration: none;
        }

        .customer-mobile-detail:hover {
          background: #eaf2e5;
        }

        .customer-mobile-delete {
          min-height: 36px;
          padding: 0 11px;
          flex-shrink: 0;
        }

        .customer-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(22,34,25,.52);
          backdrop-filter: blur(4px);
        }

        .customer-modal {
          width: min(100%, 480px);
          max-height: min(90vh, 700px);
          overflow-y: auto;
          background: #fff;
          border: 1px solid #e6ece3;
          border-radius: 20px;
          box-shadow: 0 24px 80px rgba(0,0,0,.2);
          animation: customer-modal-enter .18s ease-out;
        }

        @keyframes customer-modal-enter {
          from { opacity: 0; transform: translateY(8px) scale(.99); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .customer-modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          padding: 23px 24px 19px;
          border-bottom: 1px solid #edf0ea;
        }

        .customer-modal-heading {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .customer-modal-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: 45px;
          height: 45px;
          color: #527b54;
          background: #edf4e9;
          border-radius: 14px;
        }

        .customer-modal-title {
          margin: 0;
          color: #243529;
          font-size: 17px;
          font-weight: 900;
        }

        .customer-modal-subtitle {
          margin: 6px 0 0;
          color: #829084;
          font-size: 11px;
          line-height: 1.8;
        }

        .customer-modal-close {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: 34px;
          height: 34px;
          color: #718071;
          background: #f7f9f6;
          border: 1px solid #e9eee7;
          border-radius: 10px;
          cursor: pointer;
        }

        .customer-modal-close:hover:not(:disabled) {
          background: #edf4e9;
        }

        .customer-modal-close:disabled {
          opacity: .45;
          cursor: wait;
        }

        .customer-modal-body {
          padding: 22px 24px 24px;
        }

        .customer-form-field {
          margin-bottom: 17px;
        }

        .customer-form-label {
          display: block;
          margin-bottom: 8px;
          color: #425444;
          font-size: 12px;
          font-weight: 800;
        }

        .customer-form-input-wrap {
          position: relative;
        }

        .customer-form-input {
          display: block;
          width: 100%;
          min-height: 45px;
          padding: 0 13px;
          color: #243529;
          background: #fbfcfa;
          border: 1px solid #e1e9de;
          border-radius: 11px;
          outline: none;
          font: inherit;
          font-size: 12px;
          transition: border-color .15s ease, box-shadow .15s ease;
        }

        .customer-form-input:focus {
          border-color: #82a783;
          box-shadow: 0 0 0 3px rgba(82,123,84,.1);
        }

        .customer-form-input[aria-invalid="true"] {
          border-color: #d77b70;
        }

        .customer-form-input::placeholder {
          color: #a5afa4;
        }

        .customer-form-password {
          padding-left: 44px;
        }

        .customer-form-eye {
          position: absolute;
          top: 50%;
          left: 8px;
          transform: translateY(-50%);
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          color: #829084;
          background: transparent;
          border: 0;
          border-radius: 7px;
          cursor: pointer;
        }

        .customer-form-eye:hover {
          background: #edf4e9;
        }

        .customer-form-hint {
          margin: 7px 0 0;
          color: #8a978a;
          font-size: 10px;
          line-height: 1.8;
        }

        .customer-form-error {
          margin-top: 7px;
          color: #b5473d;
          font-size: 11px;
          line-height: 1.8;
        }

        .customer-modal-alert {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin-bottom: 17px;
          padding: 11px 12px;
          color: #a13e35;
          background: #fff5f2;
          border: 1px solid #f0d9d2;
          border-radius: 10px;
          font-size: 11px;
          line-height: 1.9;
        }

        .customer-modal-actions {
          display: flex;
          justify-content: flex-start;
          flex-wrap: wrap;
          gap: 9px;
          margin-top: 24px;
          padding-top: 18px;
          border-top: 1px solid #edf0ea;
        }

        .customer-form-submit,
        .customer-form-cancel {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 42px;
          padding: 0 16px;
          border-radius: 10px;
          font: inherit;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .customer-form-submit {
          color: #fff;
          background: #527b54;
          border: 1px solid #527b54;
        }

        .customer-form-submit:hover:not(:disabled) {
          background: #416943;
        }

        .customer-form-cancel {
          color: #526153;
          background: #fff;
          border: 1px solid #e1e9de;
        }

        .customer-form-cancel:hover:not(:disabled) {
          background: #f8faf7;
        }

        .customer-form-submit:disabled,
        .customer-form-cancel:disabled {
          opacity: .6;
          cursor: wait;
        }

        @media (max-width: 900px) {
          .customers-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .customers-stat:last-child {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 560px) {
          .customers-heading {
            align-items: stretch;
            flex-direction: column;
            gap: 14px;
          }

          .customers-header-actions {
            width: 100%;
            min-width: 0;
            justify-content: stretch;
          }

          .customers-refresh,
          .customers-add {
            flex: 1;
            min-width: 0;
            padding: 0 8px;
            white-space: normal;
          }

          .customers-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .customers-stat {
            padding: 12px;
          }

          .customers-stat:last-child {
            grid-column: 1 / -1;
          }

          .customers-stat-top {
            gap: 7px;
          }

          .customers-stat-icon {
            width: 35px;
            height: 35px;
          }

          .customers-stat-value {
            font-size: 22px;
          }

          .customers-stat-description {
            font-size: 10px;
          }

          .customers-panel-heading,
          .customers-toolbar,
          .customers-pagination {
            padding-right: 13px;
            padding-left: 13px;
          }

          .customers-panel-heading {
            gap: 9px;
          }

          .customers-panel-caption {
            font-size: 10px;
          }

          .customers-toolbar {
            align-items: stretch;
            flex-direction: column;
            gap: 11px;
          }

          .customers-search {
            width: 100%;
          }

          .customers-result-count {
            white-space: normal;
            line-height: 1.8;
          }

          /* در موبایل جدول پنهان و کارت‌ها نمایش داده می‌شوند */
          .customers-table-wrap {
            display: none;
          }

          .customers-mobile-list {
            display: grid;
          }

          .customers-pagination {
            align-items: flex-start;
            flex-direction: column;
            gap: 12px;
          }

          .customers-pagination-info {
            max-width: 100%;
            line-height: 1.9;
          }

          .customers-pagination-actions {
            width: 100%;
            justify-content: space-between;
          }

          .customer-modal-backdrop {
            align-items: flex-end;
            padding: 10px;
          }

          .customer-modal {
            max-height: 92vh;
            border-radius: 18px;
          }

          .customer-modal-header {
            padding: 19px 18px 16px;
          }

          .customer-modal-body {
            padding: 19px 18px 20px;
          }

          .customer-modal-actions {
            flex-direction: column;
          }

          .customer-form-submit,
          .customer-form-cancel {
            width: 100%;
          }
        }

        @media (min-width: 561px) {
          .customers-mobile-list {
            display: none;
          }
        }

        @media (max-width: 360px) {
          .customer-mobile-card {
            padding: 11px;
          }

          .customer-mobile-top {
            gap: 6px;
          }

          .customer-mobile-identity {
            gap: 7px;
          }

          .customer-mobile-top .customers-order-badge {
            max-width: 78px;
            padding: 4px 6px;
            font-size: 10px;
          }

          .customer-mobile-info-item {
            gap: 7px;
          }

          .customer-mobile-info-item > strong {
            max-width: 55%;
            font-size: 10px;
          }
        }
      `}</style>

      <header className="customers-heading">
        <div>
          <div className="customers-eyebrow">
            <Users size={15} aria-hidden="true" />
            مدیریت فروشگاه
          </div>
          <h1 className="customers-title">مدیریت مشتریان</h1>
          <p className="customers-subtitle">
            فهرست مشتریان، اطلاعات عضویت و سابقه خرید آن‌ها.
          </p>
        </div>

        <div className="customers-header-actions">
          <button
            type="button"
            className="customers-add"
            onClick={openCreateModal}
            disabled={creating || deletingId !== null}
          >
            <UserPlus size={16} aria-hidden="true" />
            افزودن مشتری
          </button>

          <button
            type="button"
            className="customers-refresh"
            onClick={() => void loadCustomers("refresh")}
            disabled={loading || refreshing || deletingId !== null || creating}
          >
            <RefreshCw
              size={15}
              className={refreshing ? "customers-spin" : ""}
              aria-hidden="true"
            />
            به‌روزرسانی
          </button>
        </div>
      </header>

      {notice && (
        <div
          className={`customers-notice ${
            noticeType === "success"
              ? "customers-notice-success"
              : "customers-notice-error"
          }`}
          role={noticeType === "error" ? "alert" : "status"}
        >
          {noticeType === "success" ? (
            <CheckCircle2 size={18} aria-hidden="true" />
          ) : (
            <AlertCircle size={18} aria-hidden="true" />
          )}
          <span className="customers-notice-text">{notice}</span>
          <button
            type="button"
            className="customers-notice-dismiss"
            onClick={() => setNotice("")}
            aria-label="بستن پیام"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      <section className="customers-stats" aria-label="آمار مشتریان">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <article className="customers-stat" key={stat.title}>
              <div className="customers-stat-top">
                <span className="customers-stat-label">{stat.title}</span>
                <span
                  className="customers-stat-icon"
                  style={{ color: stat.color, background: stat.background }}
                >
                  <Icon size={20} aria-hidden="true" />
                </span>
              </div>
              <p className="customers-stat-value">{formatNumber(stat.value)}</p>
              <p className="customers-stat-description">{stat.description}</p>
            </article>
          );
        })}
      </section>

      <section className="customers-panel">
        <div className="customers-panel-heading">
          <div>
            <h2 className="customers-panel-title">فهرست مشتریان</h2>
            <p className="customers-panel-caption">
              برای مشاهده سابقه سفارش‌های هر مشتری، جزئیات او را باز کن.
            </p>
          </div>
          <span className="customers-count">
            {formatNumber(pagination.total)} مشتری
          </span>
        </div>

        <div className="customers-toolbar">
          <label className="customers-search">
            <Search size={17} aria-hidden="true" />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="جست‌وجوی نام یا ایمیل مشتری..."
              aria-label="جست‌وجوی مشتری"
            />
          </label>
          <span className="customers-result-count">
            {search
              ? `نتایج جست‌وجو برای «${search}»`
              : "مرتب‌شده بر اساس جدیدترین عضویت"}
          </span>
        </div>

        {error ? (
          <div className="customers-state customers-error" role="alert">
            <AlertCircle size={22} aria-hidden="true" />
            <span>{error}</span>
            <button
              type="button"
              className="customers-retry"
              onClick={() => void loadCustomers("refresh")}
            >
              تلاش دوباره
            </button>
          </div>
        ) : loading ? (
          <div className="customers-state" role="status">
            <RefreshCw
              size={22}
              className="customers-spin"
              aria-hidden="true"
            />
            در حال دریافت اطلاعات مشتریان...
          </div>
        ) : customers.length === 0 ? (
          <div className="customers-state">
            <UserRound size={28} aria-hidden="true" />
            <strong>مشتری‌ای پیدا نشد</strong>
            <span>
              {search
                ? "عبارت دیگری را جست‌وجو کن."
                : "هنوز مشتری‌ای برای نمایش وجود ندارد."}
            </span>
          </div>
        ) : (
          <>
            <div className="customers-table-wrap">
              <table className="customers-table">
                <thead>
                  <tr>
                    <th>مشتری</th>
                    <th>تاریخ عضویت</th>
                    <th>تعداد سفارش</th>
                    <th>مجموع خرید پرداخت‌شده</th>
                    <th>جزئیات</th>
                    <th>عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id}>
                      <td>
                        <div className="customers-person">
                          <span className="customers-avatar">
                            {customer.name?.trim()?.charAt(0) || "م"}
                          </span>
                          <span>
                            <span className="customers-person-name">
                              {customer.name || "بدون نام"}
                            </span>
                            <span className="customers-person-email">
                              <Mail size={12} aria-hidden="true" />
                              {customer.email || "ایمیل ثبت نشده"}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            gap: 6,
                            alignItems: "center",
                          }}
                        >
                          <CalendarDays size={14} aria-hidden="true" />
                          {formatDate(customer.created_at)}
                        </span>
                      </td>
                      <td>
                        <span className="customers-order-badge">
                          {formatNumber(customer.orders_count)}
                        </span>
                      </td>
                      <td style={{ fontWeight: 800, color: "#354b37" }}>
                        {formatPrice(customer.total_spent)}
                      </td>
                      <td>
                        <Link
                          className="customers-detail-link"
                          to={`/admin/customers/${customer.id}`}
                        >
                          مشاهده
                          <ChevronLeft size={15} aria-hidden="true" />
                        </Link>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="customers-delete"
                          onClick={() => void handleDeleteCustomer(customer)}
                          disabled={
                            deletingId !== null ||
                            loading ||
                            refreshing ||
                            creating
                          }
                          aria-label={`حذف مشتری ${customer.name || customer.email}`}
                        >
                          {deletingId === customer.id ? (
                            <RefreshCw
                              size={14}
                              className="customers-spin"
                              aria-hidden="true"
                            />
                          ) : (
                            <Trash2 size={14} aria-hidden="true" />
                          )}
                          {deletingId === customer.id ? "در حال حذف..." : "حذف"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="customers-mobile-list">
              {customers.map(renderCustomerCard)}
            </div>
          </>
        )}

        {!error && !loading && pagination.total > 0 && (
          <footer className="customers-pagination">
            <span className="customers-pagination-info">
              صفحه {formatNumber(pagination.current_page)} از{" "}
              {formatNumber(pagination.last_page)} · مجموع{" "}
              {formatNumber(pagination.total)} مشتری
            </span>

            <div className="customers-pagination-actions">
              <button
                type="button"
                className="customers-page-button"
                disabled={pagination.current_page <= 1 || refreshing}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronRight size={15} aria-hidden="true" />
                قبلی
              </button>

              <button
                type="button"
                className="customers-page-button"
                disabled={
                  pagination.current_page >= pagination.last_page || refreshing
                }
                onClick={() =>
                  setPage((current) =>
                    Math.min(pagination.last_page, current + 1),
                  )
                }
              >
                بعدی
                <ChevronLeft size={15} aria-hidden="true" />
              </button>
            </div>
          </footer>
        )}
      </section>

      {createModalOpen && (
        <div
          className="customer-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !creatingRef.current) {
              closeCreateModal();
            }
          }}
        >
          <section
            className="customer-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-modal-title"
            aria-describedby="customer-modal-description"
            dir="rtl"
          >
            <header className="customer-modal-header">
              <div className="customer-modal-heading">
                <span className="customer-modal-icon">
                  <UserPlus size={22} aria-hidden="true" />
                </span>
                <div>
                  <h2
                    id="customer-modal-title"
                    className="customer-modal-title"
                  >
                    افزودن مشتری جدید
                  </h2>
                  <p
                    id="customer-modal-description"
                    className="customer-modal-subtitle"
                  >
                    اطلاعات حساب مشتری را وارد کن.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="customer-modal-close"
                onClick={closeCreateModal}
                disabled={creating}
                aria-label="بستن پنجره"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            <form
              className="customer-modal-body"
              onSubmit={(event) => void handleCreateCustomer(event)}
              noValidate
            >
              {formError && (
                <div className="customer-modal-alert" role="alert">
                  <AlertCircle size={17} aria-hidden="true" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="customer-form-field">
                <label
                  className="customer-form-label"
                  htmlFor="new-customer-name"
                >
                  نام و نام خانوادگی
                </label>
                <input
                  id="new-customer-name"
                  className="customer-form-input"
                  type="text"
                  autoComplete="name"
                  placeholder="مثلاً علی رضایی"
                  value={form.name}
                  onChange={(event) => {
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }));
                    setFormErrors((current) => ({
                      ...current,
                      name: "",
                    }));
                  }}
                  aria-invalid={Boolean(formErrors.name)}
                  aria-describedby={
                    formErrors.name ? "new-customer-name-error" : undefined
                  }
                  maxLength={255}
                  required
                  autoFocus
                  disabled={creating}
                />
                {formErrors.name && (
                  <p
                    id="new-customer-name-error"
                    className="customer-form-error"
                  >
                    {formErrors.name}
                  </p>
                )}
              </div>

              <div className="customer-form-field">
                <label
                  className="customer-form-label"
                  htmlFor="new-customer-email"
                >
                  آدرس ایمیل
                </label>
                <input
                  id="new-customer-email"
                  className="customer-form-input"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={(event) => {
                    setForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }));
                    setFormErrors((current) => ({
                      ...current,
                      email: "",
                    }));
                  }}
                  aria-invalid={Boolean(formErrors.email)}
                  aria-describedby={
                    formErrors.email ? "new-customer-email-error" : undefined
                  }
                  maxLength={255}
                  required
                  disabled={creating}
                  dir="ltr"
                />
                {formErrors.email && (
                  <p
                    id="new-customer-email-error"
                    className="customer-form-error"
                  >
                    {formErrors.email}
                  </p>
                )}
              </div>

              <div className="customer-form-field">
                <label
                  className="customer-form-label"
                  htmlFor="new-customer-password"
                >
                  رمز عبور اولیه
                </label>
                <div className="customer-form-input-wrap">
                  <input
                    id="new-customer-password"
                    className="customer-form-input customer-form-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="حداقل ۸ کاراکتر"
                    value={form.password}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        password: event.target.value,
                      }));
                      setFormErrors((current) => ({
                        ...current,
                        password: "",
                      }));
                    }}
                    aria-invalid={Boolean(formErrors.password)}
                    aria-describedby={
                      formErrors.password
                        ? "new-customer-password-error"
                        : "new-customer-password-hint"
                    }
                    minLength={8}
                    maxLength={128}
                    required
                    disabled={creating}
                    dir="ltr"
                  />

                  <button
                    type="button"
                    className="customer-form-eye"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={
                      showPassword ? "پنهان کردن رمز عبور" : "نمایش رمز عبور"
                    }
                    disabled={creating}
                  >
                    {showPassword ? (
                      <EyeOff size={17} aria-hidden="true" />
                    ) : (
                      <Eye size={17} aria-hidden="true" />
                    )}
                  </button>
                </div>

                {formErrors.password ? (
                  <p
                    id="new-customer-password-error"
                    className="customer-form-error"
                  >
                    {formErrors.password}
                  </p>
                ) : (
                  <p
                    id="new-customer-password-hint"
                    className="customer-form-hint"
                  >
                    رمز عبور اولیه را به‌صورت امن در اختیار مشتری قرار بده.
                  </p>
                )}
              </div>

              <div className="customer-modal-actions">
                <button
                  type="submit"
                  className="customer-form-submit"
                  disabled={creating}
                >
                  {creating ? (
                    <RefreshCw
                      size={15}
                      className="customers-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <UserPlus size={15} aria-hidden="true" />
                  )}
                  {creating ? "در حال ثبت مشتری..." : "ثبت مشتری"}
                </button>

                <button
                  type="button"
                  className="customer-form-cancel"
                  onClick={closeCreateModal}
                  disabled={creating}
                >
                  انصراف
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default AdminCustomers;
