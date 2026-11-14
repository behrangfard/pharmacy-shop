import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";

import { adminApi } from "../services/api";
import { formatAdminNumber, getAdminErrorMessage } from "../utils/adminFormat";

/** خلاصهٔ نتیجهٔ تحلیل/ثبت فایل ورود محصولات. */
type ImportSummary = {
  products_total: number;
  products_create: number;
  products_update: number;
  products_skipped: number;
  products_failed: number;
  variants_total: number;
  variants_create: number;
  variants_update: number;
  variants_failed: number;
  new_categories: number;
  new_brands: number;
  errors: number;
};

/** یک ردیف از گزارش ورود (محصول یا تنوع). */
type ImportRow = {
  row: number;
  kind: "product" | "variant";
  sku: string;
  name: string;
  product_sku?: string;
  action: "create" | "update" | "skip";
  status: "ok" | "error";
  messages: string[];
};

type ImportReport = {
  summary: ImportSummary;
  rows: ImportRow[];
  dry_run: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onImported: (message: string) => void;
};

const ACTION_LABELS: Record<ImportRow["action"], string> = {
  create: "ایجاد",
  update: "به‌روزرسانی",
  skip: "رد شد",
};

/**
 * پنجرهٔ ورود گروهی محصولات از فایل اکسل/CSV.
 *
 * ابتدا فایل پیش‌نمایش می‌شود (بدون تغییر دیتابیس) و پس از تأیید همان فایل
 * ثبت می‌شود؛ بنابراین کاربر پیش از هر تغییری خطاها را می‌بیند.
 */
export default function AdminProductImportDialog({ open, onClose, onImported }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [createMissing, setCreateMissing] = useState(true);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [busy, setBusy] = useState<"template" | "preview" | "commit" | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const reset = useCallback(() => {
    setFile(null);
    setReport(null);
    setError("");
    setBusy(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  useEffect(() => {
    if (!open) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && busy === null) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKey);

    return () => window.removeEventListener("keydown", handleKey);
  }, [open, busy, onClose]);

  const downloadTemplate = async () => {
    setBusy("template");
    setError("");

    try {
      const response = await adminApi.get("/admin/products/import/template", {
        responseType: "blob",
      });

      const blob = new Blob([response.data as BlobPart], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = "product-import-template.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(getAdminErrorMessage(caught, "دریافت قالب اکسل انجام نشد."));
    } finally {
      setBusy(null);
    }
  };

  const submit = async (dryRun: boolean) => {
    if (!file) {
      setError("ابتدا فایل اکسل محصولات را انتخاب کنید.");

      return;
    }

    setBusy(dryRun ? "preview" : "commit");
    setError("");

    const form = new FormData();
    form.append("file", file);
    form.append("dry_run", dryRun ? "1" : "0");
    form.append("create_missing", createMissing ? "1" : "0");
    form.append("update_existing", updateExisting ? "1" : "0");

    try {
      const response = await adminApi.post<{ message?: string; data?: ImportReport }>(
        "/admin/products/import",
        form,
      );

      const data = response.data?.data;

      if (!data) {
        throw new Error("پاسخ سرور قابل خواندن نبود.");
      }

      setReport(data);

      if (!dryRun && data.summary.errors === 0) {
        onImported(response.data.message || "محصولات با موفقیت وارد شدند.");
      }
    } catch (caught) {
      setError(getAdminErrorMessage(caught, "پردازش فایل انجام نشد."));
    } finally {
      setBusy(null);
    }
  };

  const errorRows = useMemo(
    () => (report?.rows ?? []).filter((row) => row.status === "error"),
    [report],
  );

  const okRows = useMemo(
    () => (report?.rows ?? []).filter((row) => row.status !== "error"),
    [report],
  );

  if (!open) return null;

  return (
    <div
      className="product-import-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && busy === null) {
          onClose();
        }
      }}
    >
      <style>{`
        .product-import-backdrop {
          position: fixed;
          inset: 0;
          z-index: 90;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          background: rgba(24, 36, 26, .45);
          backdrop-filter: blur(3px);
        }
        .product-import-dialog {
          display: flex;
          flex-direction: column;
          width: min(760px, 100%);
          max-height: calc(100vh - 36px);
          border-radius: 18px;
          background: #fff;
          border: 1px solid var(--admin-line, #e6ece3);
          box-shadow: 0 24px 60px rgba(20, 32, 22, .22);
          color: var(--admin-ink, #2c3a2e);
          font-family: inherit;
        }
        .product-import-dialog * { box-sizing: border-box; }
        .product-import-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          padding: 18px 18px 14px;
          border-bottom: 1px solid var(--admin-line, #e6ece3);
        }
        .product-import-heading { display: flex; gap: 11px; min-width: 0; }
        .product-import-icon {
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
        .product-import-title { margin: 0; font-size: 16px; font-weight: 800; }
        .product-import-subtitle {
          margin: 5px 0 0;
          font-size: 12px;
          line-height: 1.9;
          color: var(--admin-muted, #6d7d70);
        }
        .product-import-close {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 10px;
          border: 1px solid var(--admin-line, #e6ece3);
          background: #fff;
          color: var(--admin-muted, #6d7d70);
          cursor: pointer;
          flex-shrink: 0;
        }
        .product-import-close:hover:not(:disabled) { background: #f6f8f4; color: #33412f; }
        .product-import-body {
          display: grid;
          gap: 14px;
          padding: 16px 18px;
          overflow-y: auto;
        }
        .product-import-steps { display: flex; flex-wrap: wrap; gap: 8px; }
        .product-import-step {
          padding: 5px 10px;
          border-radius: 999px;
          border: 1px dashed #d9e4d5;
          font-size: 11.5px;
          color: var(--admin-muted, #6d7d70);
        }
        .product-import-step.is-done {
          border-style: solid;
          border-color: #cfe2c9;
          background: #f1f7ee;
          color: #40603f;
          font-weight: 700;
        }
        .product-import-dropzone {
          display: grid;
          gap: 6px;
          justify-items: center;
          padding: 20px 14px;
          border: 1px dashed #cbdcc5;
          border-radius: 14px;
          background: #fbfdf9;
          color: #47624b;
          text-align: center;
          cursor: pointer;
        }
        .product-import-dropzone:hover { border-color: #a9c7a1; background: #f6fbf4; }
        .product-import-dropzone input { display: none; }
        .product-import-file { font-size: 13px; font-weight: 700; color: #2f4232; }
        .product-import-hint {
          font-size: 11.5px;
          line-height: 1.9;
          color: var(--admin-muted, #6d7d70);
        }
        .product-import-options {
          display: grid;
          gap: 8px;
          font-size: 12.5px;
          color: #3d4d3f;
        }
        .product-import-options label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }
        .product-import-options input { width: 15px; height: 15px; accent-color: #3f6a45; }
      `}</style>

      <style>{`
        .product-import-alert {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 11px 13px;
          border-radius: 12px;
          border: 1px solid #f0d6cf;
          background: #fdf3f0;
          color: #a3452f;
          font-size: 12.5px;
          line-height: 1.9;
        }
        .product-import-summary { display: flex; flex-wrap: wrap; gap: 8px; font-size: 12px; }
        .product-import-summary span {
          padding: 6px 10px;
          border-radius: 10px;
          border: 1px solid #e4ece0;
          background: #f8faf6;
          color: #3d4d3f;
        }
        .product-import-summary span.is-ok {
          border-color: #cfe2c9;
          background: #f1f7ee;
          color: #3c613c;
        }
        .product-import-summary span.is-error {
          border-color: #f0d6cf;
          background: #fdf3f0;
          color: #a3452f;
        }
        .product-import-errors {
          display: grid;
          gap: 8px;
          margin: 0;
          padding: 0;
          list-style: none;
          max-height: 220px;
          overflow-y: auto;
        }
        .product-import-errors li {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 9px 11px;
          border-radius: 10px;
          border: 1px solid #f2ded8;
          background: #fffaf8;
          font-size: 12px;
          line-height: 1.9;
          color: #8f4432;
        }
        .product-import-error-name { font-weight: 700; color: #7d3a2a; }
        .product-import-table-wrapper {
          max-height: 260px;
          overflow: auto;
          border: 1px solid var(--admin-line, #e6ece3);
          border-radius: 12px;
        }
        .product-import-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .product-import-table th,
        .product-import-table td {
          padding: 8px 10px;
          text-align: right;
          border-bottom: 1px solid #f0f4ed;
          white-space: nowrap;
        }
        .product-import-table th {
          position: sticky;
          top: 0;
          background: #f5f8f2;
          font-weight: 800;
          color: #3c4c3e;
          z-index: 1;
        }
        .product-import-table td:last-child,
        .product-import-table th:last-child { white-space: normal; min-width: 160px; }
        .product-import-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
        }
        .product-import-badge.is-create { background: #eef7ea; color: #3f6b3f; }
        .product-import-badge.is-update { background: #eef2fb; color: #3b527f; }
        .product-import-badge.is-skip { background: #f4f4f0; color: #6c6f63; }
        .product-import-more {
          margin: 0;
          padding: 8px 10px;
          font-size: 11.5px;
          color: var(--admin-muted, #6d7d70);
          background: #fafcf8;
        }
        .product-import-footer {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 18px;
          border-top: 1px solid var(--admin-line, #e6ece3);
          background: #fcfdfa;
          border-radius: 0 0 18px 18px;
        }
        .product-import-actions { display: flex; flex-wrap: wrap; gap: 8px; }
        .product-import-primary,
        .product-import-secondary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 9px 14px;
          border-radius: 11px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 150ms ease, background 150ms ease;
        }
        .product-import-primary { border: 1px solid #33583a; background: #33583a; color: #fff; }
        .product-import-secondary {
          border: 1px solid var(--admin-line, #e6ece3);
          background: #fff;
          color: #3d4d3f;
        }
        .product-import-primary:hover:not(:disabled),
        .product-import-secondary:hover:not(:disabled) { transform: translateY(-1px); }
        .product-import-primary:disabled,
        .product-import-secondary:disabled { opacity: .55; cursor: not-allowed; }
        .product-import-spin { animation: product-import-spin 900ms linear infinite; }
        @keyframes product-import-spin { to { transform: rotate(360deg); } }
        @media (max-width: 620px) {
          .product-import-backdrop { align-items: flex-end; padding: 10px; }
          .product-import-dialog { max-height: calc(100vh - 20px); border-radius: 16px; }
          .product-import-footer { border-radius: 0 0 16px 16px; }
          .product-import-actions { width: 100%; }
          .product-import-actions button { flex: 1 1 auto; justify-content: center; }
        }
      `}</style>

      <section
        className="product-import-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-import-title"
        dir="rtl"
      >
        <header className="product-import-header">
          <div className="product-import-heading">
            <span className="product-import-icon" aria-hidden="true">
              <FileSpreadsheet size={19} />
            </span>

            <div>
              <h2 id="product-import-title" className="product-import-title">
                ورود گروهی محصولات از اکسل
              </h2>
              <p className="product-import-subtitle">
                قالب را دانلود کنید، محصولات را در آن پر کنید و همین‌جا پیش‌نمایش و ثبت کنید.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="product-import-close"
            onClick={onClose}
            disabled={busy !== null}
            aria-label="بستن پنجره"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="product-import-body">
          <div className="product-import-steps">
            <span className="product-import-step is-done">۱. دانلود قالب</span>
            <span className={`product-import-step${file ? " is-done" : ""}`}>۲. انتخاب فایل</span>
            <span className={`product-import-step${report ? " is-done" : ""}`}>
              ۳. پیش‌نمایش و ثبت
            </span>
          </div>

          <button
            type="button"
            className="product-import-secondary"
            onClick={() => void downloadTemplate()}
            disabled={busy !== null}
          >
            {busy === "template" ? (
              <RefreshCw size={16} className="product-import-spin" aria-hidden="true" />
            ) : (
              <Download size={16} aria-hidden="true" />
            )}
            دانلود قالب اکسل (xlsx)
          </button>

          <label className="product-import-dropzone">
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.csv,.txt"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setReport(null);
                setError("");
              }}
              disabled={busy !== null}
            />

            <Upload size={20} aria-hidden="true" />

            <span className="product-import-file">
              {file ? file.name : "فایل اکسل پر شده را انتخاب کنید"}
            </span>

            <span className="product-import-hint">
              {file
                ? `${formatAdminNumber(Math.max(1, Math.round(file.size / 1024)))} کیلوبایت — برای تغییر فایل کلیک کنید`
                : "پسوند xlsx، csv یا txt — حداکثر ۱۰ مگابایت"}
            </span>
          </label>

          <div className="product-import-options">
            <label>
              <input
                type="checkbox"
                checked={createMissing}
                onChange={(event) => setCreateMissing(event.target.checked)}
                disabled={busy !== null}
              />
              ساخت خودکار دسته‌بندی و برندهای جدید
            </label>

            <label>
              <input
                type="checkbox"
                checked={updateExisting}
                onChange={(event) => setUpdateExisting(event.target.checked)}
                disabled={busy !== null}
              />
              به‌روزرسانی محصولاتی که کدشان در سایت موجود است
            </label>
          </div>

          {error && (
            <div className="product-import-alert" role="alert">
              <AlertCircle size={16} aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {report && (
            <>
              <div className="product-import-summary">
                <span>
                  محصول جدید: <strong>{formatAdminNumber(report.summary.products_create)}</strong>
                </span>
                <span>
                  به‌روزرسانی: <strong>{formatAdminNumber(report.summary.products_update)}</strong>
                </span>
                <span>
                  تنوع:{" "}
                  <strong>
                    {formatAdminNumber(
                      report.summary.variants_create + report.summary.variants_update,
                    )}
                  </strong>
                </span>
                <span>
                  دسته‌بندی جدید:{" "}
                  <strong>{formatAdminNumber(report.summary.new_categories)}</strong>
                </span>
                <span className={report.summary.errors > 0 ? "is-error" : "is-ok"}>
                  خطا: <strong>{formatAdminNumber(report.summary.errors)}</strong>
                </span>
              </div>

              {errorRows.length > 0 && (
                <ul className="product-import-errors">
                  {errorRows.slice(0, 30).map((row) => (
                    <li key={`${row.kind}-${row.row}`}>
                      <strong>ردیف {formatAdminNumber(row.row)}</strong>
                      <span className="product-import-error-name" dir="auto">
                        {row.name || row.sku || "—"}
                      </span>
                      <span>{row.messages.join(" ")}</span>
                    </li>
                  ))}

                  {errorRows.length > 30 && (
                    <li>
                      <span>و {formatAdminNumber(errorRows.length - 30)} خطای دیگر…</span>
                    </li>
                  )}
                </ul>
              )}

              {okRows.length > 0 && (
                <div className="product-import-table-wrapper">
                  <table className="product-import-table">
                    <thead>
                      <tr>
                        <th scope="col">ردیف</th>
                        <th scope="col">نوع</th>
                        <th scope="col">کد</th>
                        <th scope="col">نام</th>
                        <th scope="col">وضعیت</th>
                        <th scope="col">پیام</th>
                      </tr>
                    </thead>

                    <tbody>
                      {okRows.slice(0, 50).map((row) => (
                        <tr key={`${row.kind}-${row.row}`}>
                          <td>{formatAdminNumber(row.row)}</td>
                          <td>{row.kind === "product" ? "محصول" : "تنوع"}</td>
                          <td dir="ltr">{row.sku}</td>
                          <td>{row.name}</td>
                          <td>
                            <span className={`product-import-badge is-${row.action}`}>
                              {ACTION_LABELS[row.action]}
                            </span>
                          </td>
                          <td>{row.messages.join(" ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {okRows.length > 50 && (
                    <p className="product-import-more">
                      {formatAdminNumber(okRows.length - 50)} ردیف دیگر در این پیش‌نمایش نمایش
                      داده نشد؛ همهٔ آن‌ها ثبت می‌شوند.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <footer className="product-import-footer">
          <span className="product-import-hint">
            تا زمانی که «ثبت نهایی» را نزنید، هیچ تغییری در محصولات سایت ایجاد نمی‌شود.
          </span>

          <div className="product-import-actions">
            <button
              type="button"
              className="product-import-secondary"
              onClick={() => void submit(true)}
              disabled={!file || busy !== null}
            >
              {busy === "preview" ? (
                <RefreshCw size={16} className="product-import-spin" aria-hidden="true" />
              ) : (
                <CheckCircle2 size={16} aria-hidden="true" />
              )}
              پیش‌نمایش
            </button>

            <button
              type="button"
              className="product-import-primary"
              onClick={() => void submit(false)}
              disabled={
                !file ||
                busy !== null ||
                report === null ||
                report.dry_run !== true ||
                report.summary.errors > 0
              }
            >
              {busy === "commit" ? (
                <RefreshCw size={16} className="product-import-spin" aria-hidden="true" />
              ) : (
                <Upload size={16} aria-hidden="true" />
              )}
              ثبت نهایی
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
