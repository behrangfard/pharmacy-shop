import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Crown,
  Eye,
  EyeOff,
  Mail,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { adminApi } from "../services/api";
import { useAdminAuth } from "../context/AdminAuthContext";

type ShopAdmin = {
  id: number;
  name: string;
  email: string;
  created_at: string | null;
};

type AdminsResponse = {
  success: boolean;
  data: {
    data: ShopAdmin[];
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
  };
  summary: {
    total_admins: number;
    current_admin_id: number;
  };
};

type SavedAdminResponse = {
  success: boolean;
  message?: string;
  data?: ShopAdmin;
};

type ApiErrorResponse = {
  message?: string;
  errors?: Record<string, string[]>;
};

type ModalState =
  | { type: "create" }
  | { type: "edit"; admin: ShopAdmin }
  | null;

const emptyForm = {
  name: "",
  email: "",
  password: "",
  passwordConfirmation: "",
};

const numberFormatter = new Intl.NumberFormat("fa-IR");

function formatNumber(value: number) {
  return numberFormatter.format(Number(value) || 0);
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

function AdminAdmins() {
  const { user, setUser } = useAdminAuth();

  const [admins, setAdmins] = useState<ShopAdmin[]>([]);
  const [totalAdmins, setTotalAdmins] = useState(0);
  const [currentAdminId, setCurrentAdminId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState<"success" | "error">("success");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [modal, setModal] = useState<ModalState>(null);
  const [form, setForm] = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);
  const savingRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (!notice) return;

    const timer = window.setTimeout(() => setNotice(""), 4200);

    return () => window.clearTimeout(timer);
  }, [notice]);

  const loadAdmins = useCallback(
    async (mode: "initial" | "refresh" = "refresh") => {
      const requestId = ++requestIdRef.current;

      if (mode === "initial") setLoading(true);
      else setRefreshing(true);

      setError("");

      try {
        const response = await adminApi.get<AdminsResponse>("/admin/admins", {
          params: { per_page: 50 },
        });

        if (!mountedRef.current || requestId !== requestIdRef.current) {
          return;
        }

        setAdmins(response.data?.data?.data ?? []);
        setTotalAdmins(response.data?.summary?.total_admins ?? 0);
        setCurrentAdminId(response.data?.summary?.current_admin_id ?? null);
      } catch (loadError) {
        if (!mountedRef.current || requestId !== requestIdRef.current) {
          return;
        }

        setError(
          getApiErrorMessage(
            loadError,
            "دریافت فهرست مدیران انجام نشد. دوباره تلاش کن.",
          ),
        );
      } finally {
        if (mountedRef.current && requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    void loadAdmins("initial");
  }, [loadAdmins]);

  const showNotice = (type: "success" | "error", message: string) => {
    setNoticeType(type);
    setNotice(message);
  };

  const openCreateModal = () => {
    setForm(emptyForm);
    setFormError("");
    setFormErrors({});
    setShowPassword(false);
    setModal({ type: "create" });
  };

  const openEditModal = (admin: ShopAdmin) => {
    setForm({
      name: admin.name,
      email: admin.email,
      password: "",
      passwordConfirmation: "",
    });
    setFormError("");
    setFormErrors({});
    setShowPassword(false);
    setModal({ type: "edit", admin });
  };

  const closeModal = useCallback(() => {
    if (savingRef.current) return;

    setModal(null);
    setForm(emptyForm);
    setFormError("");
    setFormErrors({});
    setShowPassword(false);
  }, []);

  useEffect(() => {
    if (!modal) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modal, closeModal]);

  const isEditing = modal?.type === "edit";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!modal || savingRef.current) return;

    const nextErrors: Record<string, string> = {};

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();

    if (!name) {
      nextErrors.name = "نام مدیر را وارد کن.";
    } else if (name.length > 255) {
      nextErrors.name = "نام مدیر نباید بیشتر از ۲۵۵ کاراکتر باشد.";
    }

    if (!email) {
      nextErrors.email = "ایمیل مدیر را وارد کن.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = "فرمت ایمیل معتبر نیست.";
    } else if (email.length > 255) {
      nextErrors.email = "ایمیل نباید بیشتر از ۲۵۵ کاراکتر باشد.";
    }

    const passwordTouched =
      form.password.length > 0 || form.passwordConfirmation.length > 0;

    if (!isEditing && !form.password) {
      nextErrors.password = "رمز عبور را وارد کن.";
    } else if (passwordTouched) {
      if (form.password.length < 8) {
        nextErrors.password = "رمز عبور باید حداقل ۸ کاراکتر باشد.";
      } else if (form.password !== form.passwordConfirmation) {
        nextErrors.passwordConfirmation =
          "تکرار رمز عبور با رمز عبور یکسان نیست.";
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      setFormError("لطفاً خطاهای فرم را برطرف کن.");
      return;
    }

    const payload: Record<string, string> = { name, email };

    if (passwordTouched) {
      payload.password = form.password;
      payload.password_confirmation = form.passwordConfirmation;
    }

    savingRef.current = true;
    setSaving(true);
    setFormError("");
    setFormErrors({});

    try {
      if (modal.type === "create") {
        const response = await adminApi.post<SavedAdminResponse>(
          "/admin/admins",
          payload,
        );

        showNotice(
          "success",
          response.data?.message || "مدیر جدید با موفقیت اضافه شد.",
        );
      } else {
        const response = await adminApi.put<SavedAdminResponse>(
          `/admin/admins/${modal.admin.id}`,
          payload,
        );

        const saved = response.data?.data;

        if (saved && user && saved.id === user.id) {
          setUser({ ...user, name: saved.name, email: saved.email });
        }

        showNotice(
          "success",
          response.data?.message || "اطلاعات مدیر به‌روزرسانی شد.",
        );
      }

      setModal(null);
      setForm(emptyForm);
      setShowPassword(false);

      await loadAdmins("refresh");
    } catch (submitError) {
      const data = (
        submitError as { response?: { data?: ApiErrorResponse } }
      )?.response?.data;

      const fieldErrors: Record<string, string> = {};

      Object.entries(data?.errors ?? {}).forEach(([field, messages]) => {
        const firstMessage = Array.isArray(messages) ? messages[0] : "";

        if (!firstMessage) return;

        const mappedField =
          field === "password_confirmation" ? "passwordConfirmation" : field;

        fieldErrors[mappedField] = firstMessage;
      });

      setFormErrors(fieldErrors);
      setFormError(
        getApiErrorMessage(submitError, "ذخیره اطلاعات مدیر انجام نشد."),
      );
    } finally {
      savingRef.current = false;

      if (mountedRef.current) setSaving(false);
    }
  };

  const handleDelete = async (admin: ShopAdmin) => {
    if (deletingId !== null) return;

    if (admin.id === currentAdminId || admin.id === user?.id) {
      showNotice("error", "حذف حساب خودتان امکان‌پذیر نیست.");
      return;
    }

    const confirmed = window.confirm(
      `حساب «${admin.name}» حذف شود؟ این کار برگشت‌پذیر نیست.`,
    );

    if (!confirmed) return;

    setDeletingId(admin.id);

    try {
      await adminApi.delete(`/admin/admins/${admin.id}`);

      showNotice("success", "مدیر موردنظر با موفقیت حذف شد.");

      await loadAdmins("refresh");
    } catch (deleteError) {
      showNotice(
        "error",
        getApiErrorMessage(deleteError, "حذف مدیر انجام نشد."),
      );
    } finally {
      if (mountedRef.current) setDeletingId(null);
    }
  };

  return (
    <div className="admins-page" dir="rtl">
      <style>{`
        .admins-page {
          --admin-ink: #243529;
          --admin-muted: #829084;
          --admin-line: #e9eee7;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          padding-bottom: 28px;
          color: var(--admin-ink);
        }

        .admins-page,
        .admins-page * {
          box-sizing: border-box;
        }

        .admins-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 18px;
          margin-bottom: 20px;
          min-width: 0;
        }

        .admins-eyebrow {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 8px;
          color: #648066;
          font-size: 12px;
          font-weight: 700;
        }

        .admins-title {
          margin: 0;
          font-size: clamp(23px, 3vw, 30px);
          font-weight: 900;
          letter-spacing: -.5px;
        }

        .admins-subtitle {
          margin: 9px 0 0;
          max-width: 560px;
          color: var(--admin-muted);
          font-size: 13px;
          line-height: 1.9;
        }

        .admins-header-actions {
          display: flex;
          align-items: center;
          gap: 9px;
          flex-wrap: wrap;
        }

        .admins-refresh,
        .admins-add {
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

        .admins-refresh {
          color: #476a49;
          background: #fff;
          border: 1px solid #dfe8dc;
        }

        .admins-refresh:hover:not(:disabled) {
          background: #f7faf5;
        }

        .admins-add {
          color: #fff;
          background: #527b54;
          border: 1px solid #527b54;
          box-shadow: 0 4px 10px rgba(82, 123, 84, .12);
        }

        .admins-add:hover:not(:disabled) {
          background: #416943;
        }

        .admins-refresh:disabled,
        .admins-add:disabled {
          opacity: .65;
          cursor: wait;
        }

        .admins-spin {
          animation: admins-rotation .8s linear infinite;
        }

        @keyframes admins-rotation {
          to { transform: rotate(360deg); }
        }

        .admins-notice {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 16px;
          padding: 12px 14px;
          border-radius: 12px;
          font-size: 12.5px;
          font-weight: 700;
        }

        .admins-notice.is-success {
          color: #2f6b39;
          background: #eef7ed;
          border: 1px solid #d5e8d2;
        }

        .admins-notice.is-error {
          color: #b23c3c;
          background: #fdf1f1;
          border: 1px solid #f4d9d9;
        }

        .admins-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 14px;
          margin-bottom: 20px;
        }

        .admins-stat {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border-radius: 16px;
          background: #fff;
          border: 1px solid var(--admin-line);
        }

        .admins-stat-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          border-radius: 13px;
          color: #4c6f4f;
          background: #f1f6ef;
          flex-shrink: 0;
        }

        .admins-stat-label {
          display: block;
          color: var(--admin-muted);
          font-size: 11.5px;
          font-weight: 700;
        }

        .admins-stat-value {
          display: block;
          margin-top: 3px;
          font-size: 20px;
          font-weight: 900;
        }

        .admins-stat-value.is-small {
          font-size: 14px;
          font-weight: 800;
        }

        .admins-stat-hint {
          display: block;
          margin-top: 2px;
          color: var(--admin-muted);
          font-size: 11.5px;
          direction: ltr;
          text-align: right;
          overflow-wrap: anywhere;
        }

        .admins-alert {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 16px;
          padding: 12px 14px;
          border-radius: 12px;
          color: #b23c3c;
          background: #fdf1f1;
          border: 1px solid #f4d9d9;
          font-size: 12.5px;
          font-weight: 700;
        }

        .admins-alert button {
          margin-right: auto;
          padding: 6px 12px;
          border-radius: 9px;
          border: 1px solid #e8bdbd;
          background: #fff;
          color: #a83636;
          font: inherit;
          font-size: 11.5px;
          font-weight: 800;
          cursor: pointer;
        }

        .admins-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(272px, 1fr));
          gap: 14px;
        }

        .admins-card {
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding: 16px;
          border-radius: 16px;
          background: #fff;
          border: 1px solid var(--admin-line);
          transition: border-color .15s ease, box-shadow .15s ease;
        }

        .admins-card:hover {
          border-color: #d6e2d2;
          box-shadow: 0 10px 24px rgba(40, 60, 44, .06);
        }

        .admins-card.is-self {
          border-color: #c8dcc4;
          background: linear-gradient(180deg, #fbfdfa, #fff 55%);
        }

        .admins-card.is-skeleton {
          min-height: 188px;
          border-style: dashed;
          background: linear-gradient(90deg, #f5f8f4, #eef3ec, #f5f8f4);
          background-size: 200% 100%;
          animation: admins-shimmer 1.3s ease-in-out infinite;
        }

        @keyframes admins-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .admins-card-head {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
        }

        .admins-avatar {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          color: #fff;
          background: linear-gradient(135deg, #6a9269, #476b49);
          font-size: 16px;
          font-weight: 900;
          flex-shrink: 0;
        }

        .admins-card-id {
          min-width: 0;
        }

        .admins-name {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 14px;
          font-weight: 800;
          overflow-wrap: anywhere;
        }

        .admins-badge {
          padding: 2px 8px;
          border-radius: 999px;
          color: #3c6340;
          background: #eaf3e7;
          border: 1px solid #d3e6ce;
          font-size: 10.5px;
          font-weight: 800;
        }

        .admins-role {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          margin-top: 4px;
          color: var(--admin-muted);
          font-size: 11.5px;
          font-weight: 600;
        }

        .admins-meta {
          display: grid;
          gap: 9px;
          margin: 0;
          padding: 12px;
          border-radius: 12px;
          background: #f8faf7;
          border: 1px solid #eef2ec;
        }

        .admins-meta div {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 10px;
          min-width: 0;
        }

        .admins-meta dt {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--admin-muted);
          font-size: 11.5px;
          font-weight: 700;
          white-space: nowrap;
        }

        .admins-meta dd {
          margin: 0;
          color: #38493a;
          font-size: 12px;
          font-weight: 700;
          text-align: left;
          direction: ltr;
          overflow-wrap: anywhere;
        }

        .admins-card-actions {
          display: flex;
          gap: 8px;
          margin-top: auto;
        }

        .admins-edit,
        .admins-delete {
          display: inline-flex;
          flex: 1;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-height: 38px;
          padding: 0 10px;
          border-radius: 10px;
          font: inherit;
          font-size: 11.5px;
          font-weight: 800;
          cursor: pointer;
          transition: background .15s ease, border-color .15s ease;
        }

        .admins-edit {
          color: #3f6643;
          background: #f2f7f0;
          border: 1px solid #dcebd8;
        }

        .admins-edit:hover {
          background: #e9f2e6;
        }

        .admins-delete {
          color: #a8443f;
          background: #fdf4f3;
          border: 1px solid #f3dcda;
        }

        .admins-delete:hover:not(:disabled) {
          background: #fbebe9;
        }

        .admins-delete:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

        .admins-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 46px 20px;
          border-radius: 16px;
          background: #fff;
          border: 1px dashed #dde7da;
          color: var(--admin-muted);
          text-align: center;
        }

        .admins-empty strong {
          color: var(--admin-ink);
          font-size: 14px;
        }

        .admins-empty p {
          margin: 0;
          font-size: 12.5px;
        }

        .admins-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 80;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          background: rgba(24, 36, 26, .45);
          backdrop-filter: blur(3px);
        }

        .admins-modal {
          width: min(520px, 100%);
          max-height: calc(100vh - 36px);
          overflow-y: auto;
          border-radius: 18px;
          background: #fff;
          border: 1px solid #e6ece3;
          box-shadow: 0 24px 60px rgba(20, 32, 22, .22);
        }

        .admins-modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          padding: 18px 18px 14px;
          border-bottom: 1px solid var(--admin-line);
        }

        .admins-modal-heading {
          display: flex;
          gap: 11px;
          min-width: 0;
        }

        .admins-modal-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 11px;
          color: #4c6f4f;
          background: #f1f6ef;
          flex-shrink: 0;
        }

        .admins-modal-title {
          margin: 0;
          font-size: 15px;
          font-weight: 900;
        }

        .admins-modal-subtitle {
          margin: 5px 0 0;
          color: var(--admin-muted);
          font-size: 11.5px;
          line-height: 1.8;
        }

        .admins-modal-close {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 9px;
          border: 1px solid #edf1ea;
          background: #fff;
          color: #7d8c7f;
          cursor: pointer;
          flex-shrink: 0;
        }

        .admins-modal-close:hover:not(:disabled) {
          background: #f6f9f4;
          color: #4f6a52;
        }

        .admins-modal-body {
          display: flex;
          flex-direction: column;
          gap: 13px;
          padding: 16px 18px 18px;
        }

        .admins-form-alert {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 11px;
          color: #b23c3c;
          background: #fdf1f1;
          border: 1px solid #f4d9d9;
          font-size: 11.5px;
          font-weight: 700;
        }

        .admins-form-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
        }

        .admins-form-label {
          display: flex;
          align-items: baseline;
          flex-wrap: wrap;
          gap: 6px;
          color: #40523f;
          font-size: 12px;
          font-weight: 800;
        }

        .admins-form-optional {
          color: var(--admin-muted);
          font-size: 10.5px;
          font-weight: 600;
        }

        .admins-form-input {
          width: 100%;
          min-height: 42px;
          padding: 10px 12px;
          border-radius: 11px;
          border: 1px solid #e2e9df;
          background: #fcfdfb;
          color: #23312a;
          font: inherit;
          font-size: 12.5px;
          font-weight: 600;
          outline: none;
          transition: border-color .15s ease, box-shadow .15s ease;
        }

        .admins-form-input:focus {
          border-color: #9dbd97;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(120, 163, 116, .16);
        }

        .admins-form-input[aria-invalid="true"] {
          border-color: #e5b4b4;
          background: #fffafa;
        }

        .admins-form-error {
          margin: 0;
          color: #b23c3c;
          font-size: 11px;
          font-weight: 700;
        }

        .admins-password-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .admins-password-wrap .admins-form-input {
          padding-left: 42px;
        }

        .admins-password-toggle {
          position: absolute;
          left: 6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border: none;
          border-radius: 8px;
          background: transparent;
          color: #849486;
          cursor: pointer;
        }

        .admins-password-toggle:hover {
          background: #f1f6ef;
          color: #4f6a52;
        }

        .admins-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 9px;
          margin-top: 4px;
          padding-top: 14px;
          border-top: 1px solid var(--admin-line);
        }

        .admins-cancel,
        .admins-submit {
          min-height: 42px;
          padding: 0 18px;
          border-radius: 11px;
          font: inherit;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .admins-cancel {
          color: #5c6b5f;
          background: #fff;
          border: 1px solid #e2e9df;
        }

        .admins-cancel:hover:not(:disabled) {
          background: #f6f9f4;
        }

        .admins-submit {
          color: #fff;
          background: #527b54;
          border: 1px solid #527b54;
          box-shadow: 0 4px 10px rgba(82, 123, 84, .16);
        }

        .admins-submit:hover:not(:disabled) {
          background: #416943;
        }

        .admins-cancel:disabled,
        .admins-submit:disabled {
          opacity: .65;
          cursor: wait;
        }

        @media (max-width: 640px) {
          .admins-header-actions {
            width: 100%;
          }

          .admins-header-actions > button {
            flex: 1;
          }

          .admins-stat-hint {
            text-align: left;
          }

          .admins-card-actions {
            flex-direction: column;
          }

          .admins-modal-header,
          .admins-modal-body {
            padding-left: 14px;
            padding-right: 14px;
          }

          .admins-modal-footer {
            flex-direction: column-reverse;
          }

          .admins-modal-footer > button {
            width: 100%;
          }
        }
      `}</style>

      <header className="admins-heading">
        <div>
          <div className="admins-eyebrow">
            <ShieldCheck size={14} aria-hidden="true" />
            دسترسی مدیریت
          </div>

          <h1 className="admins-title">مدیران فروشگاه</h1>

          <p className="admins-subtitle">
            مدیر جدید اضافه کن یا اطلاعات حساب مدیران، از جمله حساب خودت را
            ویرایش کن.
          </p>
        </div>

        <div className="admins-header-actions">
          <button
            type="button"
            className="admins-refresh"
            onClick={() => void loadAdmins("refresh")}
            disabled={loading || refreshing}
          >
            <RefreshCw
              size={15}
              className={refreshing ? "admins-spin" : undefined}
              aria-hidden="true"
            />
            {refreshing ? "به‌روزرسانی..." : "به‌روزرسانی"}
          </button>

          <button type="button" className="admins-add" onClick={openCreateModal}>
            <UserPlus size={16} aria-hidden="true" />
            افزودن مدیر
          </button>
        </div>
      </header>

      {notice && (
        <div className={`admins-notice is-${noticeType}`} role="status">
          {noticeType === "success" ? (
            <CheckCircle2 size={17} aria-hidden="true" />
          ) : (
            <AlertCircle size={17} aria-hidden="true" />
          )}
          <span>{notice}</span>
        </div>
      )}

      <section className="admins-stats">
        <article className="admins-stat">
          <span className="admins-stat-icon">
            <ShieldCheck size={18} aria-hidden="true" />
          </span>
          <div>
            <span className="admins-stat-label">مدیران فعال</span>
            <strong className="admins-stat-value">
              {formatNumber(totalAdmins)}
            </strong>
          </div>
        </article>

        <article className="admins-stat">
          <span className="admins-stat-icon">
            <Crown size={18} aria-hidden="true" />
          </span>
          <div>
            <span className="admins-stat-label">حساب جاری</span>
            <strong className="admins-stat-value is-small">
              {user?.name || "مدیر فروشگاه"}
            </strong>
            <span className="admins-stat-hint">{user?.email || "—"}</span>
          </div>
        </article>
      </section>

      {error && (
        <div className="admins-alert" role="alert">
          <AlertCircle size={17} aria-hidden="true" />
          <span>{error}</span>
          <button type="button" onClick={() => void loadAdmins("initial")}>
            تلاش دوباره
          </button>
        </div>
      )}

      {loading ? (
        <div className="admins-grid" aria-busy="true" aria-live="polite">
          {[0, 1, 2].map((item) => (
            <div key={item} className="admins-card is-skeleton" />
          ))}
        </div>
      ) : admins.length === 0 ? (
        <div className="admins-empty">
          <ShieldCheck size={26} aria-hidden="true" />
          <strong>مدیری پیدا نشد.</strong>
          <p>با دکمه «افزودن مدیر» اولین حساب مدیریت را بساز.</p>
        </div>
      ) : (
        <section className="admins-grid">
          {admins.map((admin) => {
            const isSelf = admin.id === currentAdminId || admin.id === user?.id;

            return (
              <article
                key={admin.id}
                className={`admins-card${isSelf ? " is-self" : ""}`}
              >
                <div className="admins-card-head">
                  <span className="admins-avatar" aria-hidden="true">
                    {(admin.name.trim().charAt(0) || "م").toUpperCase()}
                  </span>

                  <div className="admins-card-id">
                    <strong className="admins-name">
                      {admin.name}
                      {isSelf && <span className="admins-badge">شما</span>}
                    </strong>

                    <span className="admins-role">
                      <ShieldCheck size={13} aria-hidden="true" />
                      دسترسی کامل مدیر
                    </span>
                  </div>
                </div>

                <dl className="admins-meta">
                  <div>
                    <dt>
                      <Mail size={14} aria-hidden="true" />
                      ایمیل
                    </dt>
                    <dd>{admin.email}</dd>
                  </div>

                  <div>
                    <dt>
                      <CalendarDays size={14} aria-hidden="true" />
                      تاریخ عضویت
                    </dt>
                    <dd>{formatDate(admin.created_at)}</dd>
                  </div>
                </dl>

                <div className="admins-card-actions">
                  <button
                    type="button"
                    className="admins-edit"
                    onClick={() => openEditModal(admin)}
                  >
                    <Pencil size={14} aria-hidden="true" />
                    {isSelf ? "ویرایش حساب من" : "ویرایش"}
                  </button>

                  <button
                    type="button"
                    className="admins-delete"
                    onClick={() => void handleDelete(admin)}
                    disabled={isSelf || deletingId === admin.id}
                    title={
                      isSelf ? "حذف حساب خودتان امکان‌پذیر نیست" : undefined
                    }
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    {deletingId === admin.id ? "در حال حذف..." : "حذف"}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {modal && (
        <div
          className="admins-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !savingRef.current) {
              closeModal();
            }
          }}
        >
          <section
            className="admins-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admins-modal-title"
            aria-describedby="admins-modal-description"
            dir="rtl"
          >
            <header className="admins-modal-header">
              <div className="admins-modal-heading">
                <span className="admins-modal-icon">
                  {isEditing ? (
                    <Pencil size={18} aria-hidden="true" />
                  ) : (
                    <UserPlus size={18} aria-hidden="true" />
                  )}
                </span>

                <div>
                  <h2 id="admins-modal-title" className="admins-modal-title">
                    {isEditing ? "ویرایش حساب مدیر" : "افزودن مدیر جدید"}
                  </h2>

                  <p
                    id="admins-modal-description"
                    className="admins-modal-subtitle"
                  >
                    {isEditing
                      ? "اطلاعات حساب را به‌روزرسانی کن. برای تغییر رمز، هر دو فیلد رمز را پر کن."
                      : "این حساب دسترسی کامل به پنل مدیریت خواهد داشت."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="admins-modal-close"
                onClick={closeModal}
                disabled={saving}
                aria-label="بستن پنجره"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            <form
              className="admins-modal-body"
              onSubmit={(event) => void handleSubmit(event)}
              noValidate
            >
              {formError && (
                <div className="admins-form-alert" role="alert">
                  <AlertCircle size={16} aria-hidden="true" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="admins-form-field">
                <label className="admins-form-label" htmlFor="admin-name">
                  نام و نام خانوادگی
                </label>

                <input
                  id="admin-name"
                  className="admins-form-input"
                  type="text"
                  autoComplete="name"
                  placeholder="مثلاً بهرنگ محمدی"
                  value={form.name}
                  onChange={(event) => {
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }));
                    setFormErrors((current) => ({ ...current, name: "" }));
                  }}
                  aria-invalid={Boolean(formErrors.name)}
                  aria-describedby={
                    formErrors.name ? "admin-name-error" : undefined
                  }
                  maxLength={255}
                  required
                  autoFocus
                  disabled={saving}
                />

                {formErrors.name && (
                  <p id="admin-name-error" className="admins-form-error">
                    {formErrors.name}
                  </p>
                )}
              </div>

              <div className="admins-form-field">
                <label className="admins-form-label" htmlFor="admin-email">
                  آدرس ایمیل
                </label>

                <input
                  id="admin-email"
                  className="admins-form-input"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@behrang-shop.local"
                  dir="ltr"
                  value={form.email}
                  onChange={(event) => {
                    setForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }));
                    setFormErrors((current) => ({ ...current, email: "" }));
                  }}
                  aria-invalid={Boolean(formErrors.email)}
                  aria-describedby={
                    formErrors.email ? "admin-email-error" : undefined
                  }
                  maxLength={255}
                  required
                  disabled={saving}
                />

                {formErrors.email && (
                  <p id="admin-email-error" className="admins-form-error">
                    {formErrors.email}
                  </p>
                )}
              </div>

              <div className="admins-form-field">
                <label className="admins-form-label" htmlFor="admin-password">
                  رمز عبور
                  {isEditing && (
                    <span className="admins-form-optional">
                      (برای عدم تغییر، خالی بگذار)
                    </span>
                  )}
                </label>

                <div className="admins-password-wrap">
                  <input
                    id="admin-password"
                    className="admins-form-input"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="حداقل ۸ کاراکتر"
                    dir="ltr"
                    value={form.password}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        password: event.target.value,
                      }));
                      setFormErrors((current) => ({
                        ...current,
                        password: "",
                        passwordConfirmation: "",
                      }));
                    }}
                    aria-invalid={Boolean(formErrors.password)}
                    aria-describedby={
                      formErrors.password ? "admin-password-error" : undefined
                    }
                    maxLength={128}
                    required={!isEditing}
                    disabled={saving}
                  />

                  <button
                    type="button"
                    className="admins-password-toggle"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={
                      showPassword ? "پنهان کردن رمز عبور" : "نمایش رمز عبور"
                    }
                    tabIndex={saving ? -1 : 0}
                  >
                    {showPassword ? (
                      <EyeOff size={16} aria-hidden="true" />
                    ) : (
                      <Eye size={16} aria-hidden="true" />
                    )}
                  </button>
                </div>

                {formErrors.password && (
                  <p id="admin-password-error" className="admins-form-error">
                    {formErrors.password}
                  </p>
                )}
              </div>

              <div className="admins-form-field">
                <label
                  className="admins-form-label"
                  htmlFor="admin-password-confirmation"
                >
                  تکرار رمز عبور
                </label>

                <input
                  id="admin-password-confirmation"
                  className="admins-form-input"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="همان رمز عبور را دوباره وارد کن"
                  dir="ltr"
                  value={form.passwordConfirmation}
                  onChange={(event) => {
                    setForm((current) => ({
                      ...current,
                      passwordConfirmation: event.target.value,
                    }));
                    setFormErrors((current) => ({
                      ...current,
                      passwordConfirmation: "",
                    }));
                  }}
                  aria-invalid={Boolean(formErrors.passwordConfirmation)}
                  aria-describedby={
                    formErrors.passwordConfirmation
                      ? "admin-password-confirmation-error"
                      : undefined
                  }
                  maxLength={128}
                  required={!isEditing && form.password.length > 0}
                  disabled={saving}
                />

                {formErrors.passwordConfirmation && (
                  <p
                    id="admin-password-confirmation-error"
                    className="admins-form-error"
                  >
                    {formErrors.passwordConfirmation}
                  </p>
                )}
              </div>

              <footer className="admins-modal-footer">
                <button
                  type="button"
                  className="admins-cancel"
                  onClick={closeModal}
                  disabled={saving}
                >
                  انصراف
                </button>

                <button
                  type="submit"
                  className="admins-submit"
                  disabled={saving}
                >
                  {saving
                    ? "در حال ذخیره..."
                    : isEditing
                      ? "ذخیره تغییرات"
                      : "افزودن مدیر"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default AdminAdmins;
