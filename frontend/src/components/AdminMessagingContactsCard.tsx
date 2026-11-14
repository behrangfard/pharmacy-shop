import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileText,
  RefreshCw,
  Trash2,
  Upload,
  Users,
} from "lucide-react";

import { adminApi } from "../services/api";
import { formatAdminDate, formatAdminNumber, getAdminErrorMessage } from "../utils/adminFormat";

type Contact = {
  id: number;
  name: string | null;
  phone: string;
  group_name: string | null;
  note: string | null;
  source: string;
  is_active: boolean;
  created_at: string | null;
};

type ContactsPage = {
  data: Contact[];
  current_page: number;
  last_page: number;
  total: number;
};

type GroupRecord = { name: string; count: number };

type ImportSummary = {
  total: number;
  create: number;
  update: number;
  skipped: number;
  invalid: number;
  duplicate: number;
  errors: number;
};

type ImportRow = {
  row: number;
  phone: string;
  raw: string;
  name: string;
  group_name: string;
  status: "ok" | "error" | "duplicate";
  action: "create" | "update" | "skip";
  messages: string[];
};

type ImportReport = {
  summary: ImportSummary;
  rows: ImportRow[];
  dry_run: boolean;
};

const SOURCE_LABELS: Record<string, string> = {
  manual: "دستی",
  xlsx: "اکسل",
  csv: "CSV",
  txt: "متن",
  docx: "ورد",
};

type Props = {
  onChanged?: () => void;
};

/**
 * کارت «دفترچهٔ مخاطبین» در صفحهٔ پیام‌رسانی.
 *
 * شماره‌ها را می‌توان دستی یا با فایل اکسل/CSV/ورد وارد کرد؛ فایل ابتدا
 * پیش‌نمایش می‌شود و بعد از تأیید ثبت می‌شود.
 */
export default function AdminMessagingContactsCard({ onChanged }: Props) {
  const [page, setPage] = useState<ContactsPage | null>(null);
  const [groups, setGroups] = useState<GroupRecord[]>([]);
  const [totals, setTotals] = useState({ total: 0, active: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("");

  const [importOpen, setImportOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importGroup, setImportGroup] = useState("");
  const [report, setReport] = useState<ImportReport | null>(null);
  const [busy, setBusy] = useState<"download" | "preview" | "commit" | null>(null);
  const [importError, setImportError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadContacts = useCallback(
    async (targetPage = 1) => {
      setLoading(true);
      setError("");

      try {
        const response = await adminApi.get<{ data: ContactsPage }>("/admin/messaging/contacts", {
          params: {
            page: targetPage,
            search: search || undefined,
            group: groupFilter || undefined,
          },
        });

        setPage(response.data.data);
      } catch (caught) {
        setError(getAdminErrorMessage(caught, "دریافت مخاطبین انجام نشد."));
      } finally {
        setLoading(false);
      }
    },
    [search, groupFilter],
  );

  const loadGroups = useCallback(async () => {
    try {
      const response = await adminApi.get<{
        data: { groups: GroupRecord[]; total: number; active: number };
      }>("/admin/messaging/contacts/groups");

      setGroups(response.data.data.groups ?? []);
      setTotals({
        total: response.data.data.total ?? 0,
        active: response.data.data.active ?? 0,
      });
    } catch {
      // شمارش گروه‌ها فقط برای فیلتر است؛ خطای آن صفحه را متوقف نمی‌کند.
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => setSearch(searchInput.trim()), 400);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    void loadContacts(1);
  }, [loadContacts]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    if (!notice) return;

    const timeout = window.setTimeout(() => setNotice(""), 6000);

    return () => window.clearTimeout(timeout);
  }, [notice]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadContacts(1), loadGroups()]);
    onChanged?.();
  }, [loadContacts, loadGroups, onChanged]);

  const downloadTemplate = async () => {
    setBusy("download");
    setImportError("");

    try {
      const response = await adminApi.get("/admin/messaging/contacts/template", {
        responseType: "blob",
      });

      const url = URL.createObjectURL(new Blob([response.data as BlobPart]));
      const link = document.createElement("a");

      link.href = url;
      link.download = "messaging-contacts-template.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setImportError(getAdminErrorMessage(caught, "دریافت قالب انجام نشد."));
    } finally {
      setBusy(null);
    }
  };

  const runImport = async (dryRun: boolean) => {
    if (!file) {
      setImportError("ابتدا فایل مخاطبین را انتخاب کنید.");

      return;
    }

    setBusy(dryRun ? "preview" : "commit");
    setImportError("");

    const form = new FormData();
    form.append("file", file);
    form.append("dry_run", dryRun ? "1" : "0");

    if (importGroup.trim() !== "") {
      form.append("group", importGroup.trim());
    }

    try {
      const response = await adminApi.post<{ message?: string; data?: ImportReport }>(
        "/admin/messaging/contacts/import",
        form,
      );

      const data = response.data.data;

      if (!data) throw new Error("پاسخ سرور قابل خواندن نبود.");

      setReport(data);

      if (!dryRun) {
        setNotice(response.data.message || "مخاطبین ثبت شدند.");
        setFile(null);
        await refreshAll();
      }
    } catch (caught) {
      setImportError(getAdminErrorMessage(caught, "پردازش فایل انجام نشد."));
    } finally {
      setBusy(null);
    }
  };

  const deleteContact = async (contact: Contact) => {
    if (deletingId !== null) return;

    const label = contact.name ? `${contact.name} (${contact.phone})` : contact.phone;

    if (!window.confirm(`مخاطب ${label} حذف شود؟`)) return;

    setDeletingId(contact.id);

    try {
      await adminApi.delete(`/admin/messaging/contacts/${contact.id}`);
      setNotice("مخاطب حذف شد.");
      await refreshAll();
    } catch (caught) {
      setError(getAdminErrorMessage(caught, "حذف مخاطب انجام نشد."));
    } finally {
      setDeletingId(null);
    }
  };

  const deleteGroup = async () => {
    if (groupFilter === "") return;

    if (!window.confirm(`همهٔ مخاطبین گروه «${groupFilter}» حذف شوند؟ این عمل قابل بازگشت نیست.`)) {
      return;
    }

    try {
      await adminApi.delete("/admin/messaging/contacts/bulk", { data: { group: groupFilter } });
      setNotice(`گروه «${groupFilter}» حذف شد.`);
      setGroupFilter("");
      await refreshAll();
    } catch (caught) {
      setError(getAdminErrorMessage(caught, "حذف گروه انجام نشد."));
    }
  };

  const problemRows = useMemo(
    () => (report?.rows ?? []).filter((row) => row.status !== "ok").slice(0, 12),
    [report],
  );

  return (
    <section className="msg-card msg-contacts" aria-label="دفترچهٔ مخاطبین">
      <style>{`
        .msg-contacts .contacts-toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
          margin-bottom: 12px;
        }
        .msg-contacts .contacts-secondary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 9px 13px;
          border-radius: 11px;
          border: 1px solid #dfe8db;
          background: #fff;
          color: #3f5142;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
        }
        .msg-contacts .contacts-secondary:disabled { opacity: .55; cursor: not-allowed; }
        .msg-contacts .contacts-import {
          display: grid;
          gap: 11px;
          padding: 14px;
          margin-bottom: 14px;
          border: 1px dashed #cfdcc9;
          border-radius: 14px;
          background: #fbfdf8;
        }
        .msg-contacts .contacts-dropzone {
          display: grid;
          gap: 5px;
          justify-items: center;
          padding: 16px 12px;
          border: 1px dashed #c7d8c1;
          border-radius: 12px;
          background: #fff;
          color: #45604a;
          text-align: center;
          cursor: pointer;
          font-size: 12.5px;
        }
        .msg-contacts .contacts-dropzone input { display: none; }
        .msg-contacts .contacts-dropzone small { color: #7a8a7c; font-size: 11px; line-height: 1.8; }
        .msg-contacts .contacts-group-field {
          display: grid;
          gap: 5px;
          font-size: 12px;
          color: #45584a;
        }
        .msg-contacts .contacts-group-field input {
          width: 100%;
          padding: 9px 11px;
          border: 1px solid #dfe8db;
          border-radius: 10px;
          font-size: 12.5px;
          background: #fff;
        }
        .msg-contacts .contacts-report { display: grid; gap: 8px; }
        .msg-contacts .contacts-report-summary { display: flex; flex-wrap: wrap; gap: 7px; font-size: 11.5px; }
        .msg-contacts .contacts-report-summary span {
          padding: 5px 9px;
          border-radius: 9px;
          border: 1px solid #e3eade;
          background: #fff;
          color: #43544a;
        }
        .msg-contacts .contacts-report-summary span.is-ok { border-color: #cfe2c9; color: #3c613c; }
        .msg-contacts .contacts-report-summary span.is-error { border-color: #f0d6cf; color: #a3452f; }
        .msg-contacts .contacts-report-rows {
          display: grid;
          gap: 6px;
          max-height: 180px;
          overflow-y: auto;
          margin: 0;
          padding: 0;
          list-style: none;
        }
        .msg-contacts .contacts-report-rows li {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          padding: 7px 9px;
          border-radius: 9px;
          border: 1px solid #f0e0da;
          background: #fffaf8;
          font-size: 11.5px;
          color: #8b4634;
        }
        .msg-contacts .contacts-import-actions { display: flex; flex-wrap: wrap; gap: 8px; }
        .msg-contacts .contacts-filters {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
        }
        .msg-contacts .contacts-filters input,
        .msg-contacts .contacts-filters select {
          padding: 9px 11px;
          border: 1px solid #dfe8db;
          border-radius: 10px;
          font-size: 12.5px;
          background: #fff;
        }
        .msg-contacts .contacts-filters input { flex: 1 1 200px; min-width: 0; }
        .msg-contacts .contacts-list { display: grid; gap: 8px; }
        .msg-contacts .contacts-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 12px;
          border: 1px solid #e8efe4;
          border-radius: 11px;
          background: #fff;
        }
        .msg-contacts .contacts-main { display: grid; gap: 3px; min-width: 0; }
        .msg-contacts .contacts-name { font-size: 12.5px; font-weight: 700; color: #33412f; }
        .msg-contacts .contacts-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          font-size: 11px;
          color: #7a8a7c;
        }
        .msg-contacts .contacts-badge {
          padding: 2px 7px;
          border-radius: 999px;
          background: #f1f6ef;
          color: #47664a;
          font-size: 10.5px;
        }
        .msg-contacts .contacts-delete {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 9px;
          border: 1px solid #f0d9d3;
          background: #fff8f6;
          color: #a3452f;
          cursor: pointer;
          flex-shrink: 0;
        }
        .msg-contacts .contacts-delete:disabled { opacity: .5; cursor: not-allowed; }
        .msg-contacts .contacts-empty {
          padding: 22px 14px;
          border: 1px dashed #dfe8db;
          border-radius: 12px;
          text-align: center;
          font-size: 12.5px;
          color: #7a8a7c;
          background: #fcfdfa;
          line-height: 2;
        }
        .msg-contacts .contacts-pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 12px;
          font-size: 11.5px;
          color: #6d7d70;
        }
        .msg-contacts .contacts-pagination div { display: flex; gap: 7px; }
        @media (max-width: 620px) {
          .msg-contacts .contacts-toolbar > * { flex: 1 1 auto; justify-content: center; }
        }
      `}</style>

      <div className="msg-card-head">
        <div>
          <h2>دفترچهٔ مخاطبین</h2>
          <p>
            شمارهٔ مشتریان را دستی یا با فایل اکسل/ورد وارد کنید و پیام‌ها را گروهی برای آن‌ها
            بفرستید.
          </p>
        </div>

        <span className="msg-pill msg-pill-success">
          {formatAdminNumber(totals.active)} مخاطب فعال
        </span>
      </div>

      {notice && (
        <div className="msg-alert msg-alert-success" role="status">
          <CheckCircle2 size={16} aria-hidden="true" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div className="msg-alert msg-alert-error" role="alert">
          <AlertCircle size={16} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div className="contacts-toolbar">
        <button
          type="button"
          className="msg-primary-button"
          onClick={() => setImportOpen(!importOpen)}
        >
          <Upload size={16} aria-hidden="true" />
          {importOpen ? "بستن فرم ورود" : "ورود از اکسل / ورد"}
        </button>

        <button
          type="button"
          className="contacts-secondary"
          onClick={() => void downloadTemplate()}
          disabled={busy !== null}
        >
          {busy === "download" ? (
            <RefreshCw size={16} className="msg-spin" aria-hidden="true" />
          ) : (
            <Download size={16} aria-hidden="true" />
          )}
          دانلود قالب اکسل
        </button>
      </div>

      {importOpen && (
        <div className="contacts-import">
          <label className="contacts-dropzone">
            <input
              type="file"
              accept=".xlsx,.csv,.txt,.docx"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setReport(null);
                setImportError("");
              }}
              disabled={busy !== null}
            />

            <FileText size={18} aria-hidden="true" />
            <span>{file ? file.name : "فایل اکسل (xlsx)، CSV، متن یا Word را انتخاب کنید"}</span>
            <small>شماره‌های داخل فایل ورد از متن استخراج می‌شوند و نیازی به قالب خاص ندارند.</small>
          </label>

          <label className="contacts-group-field">
            <span>گروه این شماره‌ها (اختیاری)</span>
            <input
              type="text"
              value={importGroup}
              onChange={(event) => setImportGroup(event.target.value)}
              placeholder="مثال: مشتریان VIP"
              list="messaging-contact-groups"
            />
            <datalist id="messaging-contact-groups">
              {groups.map((group) => (
                <option key={group.name} value={group.name} />
              ))}
            </datalist>
          </label>

          {importError && (
            <div className="msg-alert msg-alert-error" role="alert">
              <AlertCircle size={16} aria-hidden="true" />
              <span>{importError}</span>
            </div>
          )}

          {report && (
            <div className="contacts-report">
              <div className="contacts-report-summary">
                <span>کل: {formatAdminNumber(report.summary.total)}</span>
                <span className="is-ok">جدید: {formatAdminNumber(report.summary.create)}</span>
                <span>به‌روزرسانی: {formatAdminNumber(report.summary.update)}</span>
                <span>تکراری: {formatAdminNumber(report.summary.duplicate)}</span>
                <span className={report.summary.errors > 0 ? "is-error" : ""}>
                  نامعتبر: {formatAdminNumber(report.summary.errors)}
                </span>
              </div>

              {problemRows.length > 0 && (
                <ul className="contacts-report-rows">
                  {problemRows.map((row) => (
                    <li key={`${row.row}-${row.raw}`}>
                      <strong>ردیف {formatAdminNumber(row.row)}</strong>
                      <span dir="ltr">{row.raw || row.phone}</span>
                      <span>{row.messages.join(" ")}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="contacts-import-actions">
            <button
              type="button"
              className="contacts-secondary"
              onClick={() => void runImport(true)}
              disabled={!file || busy !== null}
            >
              {busy === "preview" ? (
                <RefreshCw size={16} className="msg-spin" aria-hidden="true" />
              ) : (
                <Users size={16} aria-hidden="true" />
              )}
              پیش‌نمایش
            </button>

            <button
              type="button"
              className="msg-primary-button"
              onClick={() => void runImport(false)}
              disabled={!file || busy !== null || report === null || report.dry_run !== true}
            >
              {busy === "commit" ? (
                <RefreshCw size={16} className="msg-spin" aria-hidden="true" />
              ) : (
                <Upload size={16} aria-hidden="true" />
              )}
              ثبت شماره‌ها
            </button>
          </div>
        </div>
      )}

      <div className="contacts-filters">
        <input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="جست‌وجوی نام، شماره یا گروه..."
          aria-label="جست‌وجوی مخاطبین"
        />

        <select
          value={groupFilter}
          onChange={(event) => setGroupFilter(event.target.value)}
          aria-label="فیلتر گروه مخاطبین"
        >
          <option value="">همهٔ گروه‌ها</option>
          {groups.map((group) => (
            <option key={group.name} value={group.name}>
              {group.name} ({formatAdminNumber(group.count)})
            </option>
          ))}
        </select>

        {groupFilter !== "" && (
          <button
            type="button"
            className="contacts-secondary"
            onClick={() => void deleteGroup()}
          >
            <Trash2 size={15} aria-hidden="true" />
            حذف گروه
          </button>
        )}
      </div>

      {loading ? (
        <div className="contacts-empty">در حال دریافت مخاطبین…</div>
      ) : (page?.data.length ?? 0) === 0 ? (
        <div className="contacts-empty">
          هنوز مخاطبی ثبت نشده است.
          <br />
          با دکمهٔ «ورود از اکسل / ورد» شماره‌های خود را اضافه کنید.
        </div>
      ) : (
        <ul className="contacts-list">
          {(page?.data ?? []).map((contact) => (
            <li className="contacts-row" key={contact.id}>
              <div className="contacts-main">
                <span className="contacts-name">{contact.name || "بدون نام"}</span>

                <div className="contacts-meta">
                  <span dir="ltr">{contact.phone}</span>
                  {contact.group_name && (
                    <span className="contacts-badge">{contact.group_name}</span>
                  )}
                  <span>{SOURCE_LABELS[contact.source] ?? contact.source}</span>
                  <span>{formatAdminDate(contact.created_at)}</span>
                </div>
              </div>

              <button
                type="button"
                className="contacts-delete"
                onClick={() => void deleteContact(contact)}
                disabled={deletingId === contact.id}
                aria-label={`حذف مخاطب ${contact.phone}`}
              >
                {deletingId === contact.id ? (
                  <RefreshCw size={14} className="msg-spin" aria-hidden="true" />
                ) : (
                  <Trash2 size={14} aria-hidden="true" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {page && page.last_page > 1 && (
        <div className="contacts-pagination">
          <span>
            صفحهٔ {formatAdminNumber(page.current_page)} از {formatAdminNumber(page.last_page)} —{" "}
            {formatAdminNumber(page.total)} مخاطب
          </span>

          <div>
            <button
              type="button"
              className="contacts-secondary"
              onClick={() => void loadContacts(page.current_page - 1)}
              disabled={page.current_page <= 1 || loading}
            >
              قبلی
            </button>

            <button
              type="button"
              className="contacts-secondary"
              onClick={() => void loadContacts(page.current_page + 1)}
              disabled={page.current_page >= page.last_page || loading}
            >
              بعدی
            </button>
          </div>
        </div>
      )}

      {totals.total > 0 && (
        <p className="contacts-meta" style={{ marginTop: 10 }}>
          مجموع کل مخاطبین: {formatAdminNumber(totals.total)} — فایل‌های تکراری دوباره ثبت نمی‌شوند.
        </p>
      )}
    </section>
  );
}
