import { FormEvent, useRef, useState } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";

import BannerFontStyles from "./BannerFontStyles";
import { BANNER_TEXT_WEIGHTS } from "../utils/bannerText";
import type { BannerFontRecord } from "../utils/bannerFonts";

/**
 * کتابخانهٔ فونت متن بنرها.
 *
 * مدیر می‌تواند فایل فونت (woff2/woff/ttf/otf تا ۵ مگابایت) را از سیستم خود
 * بارگذاری کند یا نشانی یک فونت بیرونی (فایل مستقیم یا CSS مثل گوگل فونت) را
 * ثبت کند. فونت‌های فعال در فروشگاه به‌صورت @font-face تزریق می‌شوند.
 */
interface AdminBannerFontsPanelProps {
  fonts: BannerFontRecord[];
  loading: boolean;
  error: string;
  disabled?: boolean;
  onCreate: (payload: FormData) => Promise<BannerFontRecord | null>;
  onToggle: (
    font: BannerFontRecord,
    isActive: boolean,
  ) => Promise<BannerFontRecord | null>;
  onDelete: (font: BannerFontRecord) => Promise<boolean>;
}

function AdminBannerFontsPanel({
  fonts,
  loading,
  error,
  disabled = false,
  onCreate,
  onToggle,
  onDelete,
}: AdminBannerFontsPanelProps) {
  const [source, setSource] = useState<"upload" | "url">("upload");
  const [name, setName] = useState("");
  const [family, setFamily] = useState("");
  const [weight, setWeight] = useState("400");
  const [style, setStyle] = useState("normal");
  const [externalUrl, setExternalUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [localError, setLocalError] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setName("");
    setFamily("");
    setWeight("400");
    setStyle("normal");
    setExternalUrl("");

    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting || disabled) return;

    setLocalError("");
    setMessage("");

    if (!name.trim()) {
      setLocalError("نام فونت را وارد کنید.");

      return;
    }

    const payload = new FormData();

    payload.append("source", source);
    payload.append("name", name.trim());
    payload.append("family", family.trim());
    payload.append("weight", weight);
    payload.append("style", style);

    if (source === "upload") {
      const file = fileRef.current?.files?.[0];

      if (!file) {
        setLocalError("فایل فونت را انتخاب کنید.");

        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setLocalError("حجم فایل فونت باید کمتر از ۵ مگابایت باشد.");

        return;
      }

      payload.append("file", file);
    } else {
      if (!externalUrl.trim()) {
        setLocalError("نشانی فونت بیرونی را وارد کنید.");

        return;
      }

      if (!family.trim()) {
        setLocalError("نام خانوادهٔ فونت برای نشانی بیرونی الزامی است.");

        return;
      }

      payload.append("external_url", externalUrl.trim());
    }

    setSubmitting(true);

    try {
      const font = await onCreate(payload);

      if (font) {
        setMessage(`فونت «${font.name}» ذخیره شد.`);
        resetForm();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(font: BannerFontRecord) {
    setBusyId(font.id);
    setMessage("");
    setLocalError("");

    try {
      const updated = await onToggle(font, !font.is_active);

      if (updated) {
        setMessage(updated.is_active ? "فونت فعال شد." : "فونت غیرفعال شد.");
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(font: BannerFontRecord) {
    setBusyId(font.id);
    setMessage("");
    setLocalError("");

    try {
      const removed = await onDelete(font);

      if (removed) setMessage(`فونت «${font.name}» حذف شد.`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="admin-card">
      <div className="admin-card-head">
        <div>
          <h2 className="admin-card-title">کتابخانهٔ فونت بنرها</h2>
          <p className="admin-card-desc">
            فونت سفارشی برای متن‌های روی بنر. فایل فونت (woff2/woff/ttf/otf تا
            ۵ مگابایت) را بارگذاری کنید یا نشانی فونت بیرونی (مثل CSS گوگل
            فونت) را ثبت کنید. فونت‌های فعال در صفحهٔ اول سایت بارگذاری
            می‌شوند.
          </p>
        </div>
      </div>

      {(error || localError) && (
        <div className="admin-alert admin-alert-error" role="alert">
          <span aria-hidden="true">!</span>
          <span>{localError || error}</span>
        </div>
      )}

      {message && (
        <div className="admin-alert admin-alert-success" role="status">
          <span aria-hidden="true">✓</span>
          <span>{message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="admin-form-grid">
          <div className="admin-field">
            <label className="admin-label" htmlFor="font-source">
              منبع فونت
            </label>
            <select
              id="font-source"
              className="admin-input"
              value={source}
              onChange={(event) =>
                setSource(event.target.value === "url" ? "url" : "upload")
              }
              disabled={disabled || submitting}
            >
              <option value="upload">بارگذاری فایل از سیستم</option>
              <option value="url">نشانی بیرونی (فایل یا CSS)</option>
            </select>
          </div>

          <div className="admin-field">
            <label className="admin-label" htmlFor="font-name">
              نام نمایشی *
            </label>
            <input
              id="font-name"
              className="admin-input"
              value={name}
              maxLength={100}
              onChange={(event) => setName(event.target.value)}
              disabled={disabled || submitting}
              placeholder="مثل: وزیرمتن ضخیم"
            />
          </div>

          <div className="admin-field">
            <label className="admin-label" htmlFor="font-family">
              خانوادهٔ فونت (family)
            </label>
            <input
              id="font-family"
              className="admin-input"
              value={family}
              maxLength={60}
              onChange={(event) => setFamily(event.target.value)}
              disabled={disabled || submitting}
              dir="ltr"
              placeholder="Vazirmatn"
            />
            <span className="admin-help">
              فقط حروف انگلیسی، عدد، فاصله و خط تیره. خالی بماند، خودکار ساخته
              می‌شود.
            </span>
          </div>

          <div className="admin-field">
            <label className="admin-label" htmlFor="font-weight">
              ضخامت
            </label>
            <select
              id="font-weight"
              className="admin-input"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              disabled={disabled || submitting}
            >
              {BANNER_TEXT_WEIGHTS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-field">
            <label className="admin-label" htmlFor="font-style">
              حالت
            </label>
            <select
              id="font-style"
              className="admin-input"
              value={style}
              onChange={(event) => setStyle(event.target.value)}
              disabled={disabled || submitting}
            >
              <option value="normal">عادی</option>
              <option value="italic">مورب</option>
            </select>
          </div>

          {source === "upload" ? (
            <div className="admin-field">
              <label className="admin-label" htmlFor="font-file">
                فایل فونت *
              </label>
              <input
                ref={fileRef}
                id="font-file"
                type="file"
                className="admin-input"
                accept=".woff2,.woff,.ttf,.otf"
                disabled={disabled || submitting}
              />
              <span className="admin-help">
                حداکثر ۵ مگابایت؛ woff2 سبک‌تر و سریع‌تر است.
              </span>
            </div>
          ) : (
            <div className="admin-field">
              <label className="admin-label" htmlFor="font-url">
                نشانی فونت یا CSS *
              </label>
              <input
                id="font-url"
                className="admin-input"
                value={externalUrl}
                maxLength={2048}
                onChange={(event) => setExternalUrl(event.target.value)}
                disabled={disabled || submitting}
                dir="ltr"
                placeholder="https://fonts.googleapis.com/css2?family=Vazirmatn"
              />
              <span className="admin-help">
                اگر نشانی به css ختم شود، به‌صورت stylesheet بارگذاری می‌شود.
              </span>
            </div>
          )}
        </div>

        <div className="admin-actions">
          <button
            type="submit"
            className="admin-btn admin-btn-primary"
            disabled={disabled || submitting}
          >
            <span className="inline-flex items-center gap-1.5">
              {submitting ? (
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              ) : (
                <Upload size={14} aria-hidden="true" />
              )}
              {submitting ? "در حال ذخیره..." : "افزودن فونت"}
            </span>
          </button>
        </div>
      </form>

      <BannerFontStyles fonts={fonts} />


      {loading ? (
        <p className="admin-help">در حال دریافت فونت‌ها...</p>
      ) : fonts.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-[#dfe7d8] bg-white p-3 text-[11px] text-[#9aa894]">
          هنوز فونتی ثبت نشده است؛ متن بنرها با فونت پیش‌فرض سایت نمایش داده
          می‌شود.
        </p>
      ) : (
        <div className="admin-table-wrap mt-3">
          <table className="admin-table">
            <thead>
              <tr>
                <th>نام</th>
                <th>خانواده</th>
                <th>ضخامت</th>
                <th>منبع</th>
                <th>نمایش نمونه</th>
                <th>وضعیت</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {fonts.map((font) => (
                <tr key={font.id}>
                  <td>{font.name}</td>
                  <td dir="ltr" style={{ fontSize: 12 }}>
                    {font.family}
                  </td>
                  <td>
                    {font.weight}
                    {font.style === "italic" ? " / مورب" : ""}
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {font.source === "upload"
                      ? "فایل"
                      : font.is_stylesheet
                        ? "CSS بیرونی"
                        : "فایل بیرونی"}
                  </td>
                  <td>
                    <span
                      dir="rtl"
                      style={{
                        fontFamily: `"${font.family}", Vazirmatn, Tahoma, sans-serif`,
                        fontSize: 13,
                        fontWeight: font.weight,
                        fontStyle: font.style,
                      }}
                    >
                      متن نمونه بنر
                    </span>
                  </td>
                  <td>
                    <span
                      className={`admin-badge ${
                        font.is_active ? "admin-badge-green" : "admin-badge-red"
                      }`}
                    >
                      {font.is_active ? "فعال" : "غیرفعال"}
                    </span>
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <button
                        type="button"
                        className="admin-btn admin-btn-sm"
                        onClick={() => void handleToggle(font)}
                        disabled={disabled || busyId === font.id}
                      >
                        {font.is_active ? "غیرفعال‌سازی" : "فعال‌سازی"}
                      </button>

                      <button
                        type="button"
                        className="admin-btn admin-btn-sm admin-btn-danger"
                        onClick={() => void handleDelete(font)}
                        disabled={disabled || busyId === font.id}
                      >
                        <span className="inline-flex items-center gap-1">
                          <Trash2 size={13} aria-hidden="true" />
                          حذف
                        </span>
                      </button>
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

export default AdminBannerFontsPanel;
