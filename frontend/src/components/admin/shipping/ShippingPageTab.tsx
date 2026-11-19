import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";

import { adminApi } from "../../../services/api";
import {
  formatAdminNumber,
  getAdminErrorMessage,
} from "../../../utils/adminFormat";

import {
  type Notice,
  NoticeBox,
  Field,
} from "./shippingShared";

/* ------------------------------------------------------------------ */
/* ۷) صفحهٔ «روش‌های ارسال و اطلاعات ارسال» (محتوای سایت)              */
/* ------------------------------------------------------------------ */

interface ShippingPageForm {
  title: string;
  intro: string;
  notes: string[];
  content: string;
  show_costs: boolean;
}

const EMPTY_SHIPPING_PAGE: ShippingPageForm = {
  title: "",
  intro: "",
  notes: [],
  content: "",
  show_costs: true,
};

/** بیشینهٔ نکته‌های «اطلاعات ارسال»؛ هماهنگ با بک‌اند. */
const SHIPPING_PAGE_NOTES_MAX = 10;

/**
 * ویرایش صفحهٔ عمومی «روش‌های ارسال و اطلاعات ارسال» (/shipping-info).
 *
 * روش‌ها، هزینه و زمان تحویل از تب «روش‌های ارسال» می‌آیند؛ این تب فقط متن
 * صفحه (عنوان، معرفی، نکته‌ها، متن تکمیلی) و نمایش/مخفی‌کردن هزینه‌ها را
 * ویرایش می‌کند.
 */
export function ShippingPageTab({ onOpenMethods }: { onOpenMethods: () => void }) {
  const [form, setForm] = useState<ShippingPageForm>(EMPTY_SHIPPING_PAGE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const response = await adminApi.get("/admin/shipping/page");
      const data = (response.data?.data ?? {}) as Record<string, unknown>;

      setForm({
        title: typeof data.title === "string" ? data.title : "",
        intro: typeof data.intro === "string" ? data.intro : "",
        notes: Array.isArray(data.notes)
          ? data.notes.filter(
              (note): note is string => typeof note === "string",
            )
          : [],
        content: typeof data.content === "string" ? data.content : "",
        show_costs: data.show_costs !== false,
      });
    } catch (error) {
      setNotice({ type: "error", text: getAdminErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function update<K extends keyof ShippingPageForm>(
    key: K,
    value: ShippingPageForm[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateNote(index: number, value: string) {
    setForm((current) => ({
      ...current,
      notes: current.notes.map((note, position) =>
        position === index ? value : note,
      ),
    }));
  }

  function addNote() {
    setForm((current) => ({ ...current, notes: [...current.notes, ""] }));
  }

  function removeNote(index: number) {
    setForm((current) => ({
      ...current,
      notes: current.notes.filter((_, position) => position !== index),
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    if (!form.title.trim()) {
      setNotice({ type: "error", text: "عنوان صفحه را وارد کنید." });
      return;
    }

    setSaving(true);

    try {
      const response = await adminApi.put("/admin/shipping/page", {
        title: form.title.trim(),
        intro: form.intro.trim(),
        notes: form.notes
          .map((note) => note.trim())
          .filter((note) => note !== ""),
        content: form.content,
        show_costs: form.show_costs,
      });

      setNotice({
        type: "success",
        text: response.data?.message ?? "صفحهٔ روش‌های ارسال ذخیره شد.",
      });

      await load();
    } catch (error) {
      setNotice({ type: "error", text: getAdminErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <NoticeBox notice={notice} />

      <div className="admin-toolbar">
        <div className="admin-toolbar-spacer" />
        <button
          type="button"
          className="admin-btn admin-btn-sm"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw size={14} /> بازخوانی
        </button>
        <a
          className="admin-btn admin-btn-sm"
          href="/shipping-info"
          target="_blank"
          rel="noopener noreferrer"
        >
          مشاهده در سایت
        </a>
      </div>

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2 className="admin-card-title">
              محتوای صفحهٔ «روش‌های ارسال و اطلاعات ارسال»
            </h2>
            <p className="admin-card-desc">
              این متن‌ها در مسیر <code dir="ltr">/shipping-info</code> سایت
              نمایش داده می‌شوند. فهرست روش‌ها، هزینه و زمان تحویل از تب
              «روش‌های ارسال» خوانده می‌شود.
            </p>
          </div>

          <button
            type="button"
            className="admin-btn admin-btn-sm"
            onClick={onOpenMethods}
          >
            ویرایش روش‌های ارسال
          </button>
        </div>

        <form onSubmit={submit} noValidate>
          <div className="admin-form-grid admin-form-grid-3">
            <Field id="shipping-page-title" label="عنوان صفحه *" full>
              <input
                id="shipping-page-title"
                className="admin-input"
                value={form.title}
                onChange={(event) => update("title", event.target.value)}
                maxLength={120}
                required
              />
            </Field>

            <Field id="shipping-page-intro" label="متن معرفی" full>
              <textarea
                id="shipping-page-intro"
                className="admin-input"
                rows={3}
                value={form.intro}
                onChange={(event) => update("intro", event.target.value)}
                maxLength={1000}
              />
            </Field>
          </div>

          <div style={{ marginTop: 14 }}>
            <div className="admin-toolbar" style={{ marginTop: 0 }}>
              <span className="admin-label" style={{ margin: 0 }}>
                نکته‌های «اطلاعات ارسال» (
                {formatAdminNumber(form.notes.length)} از{" "}
                {formatAdminNumber(SHIPPING_PAGE_NOTES_MAX)})
              </span>
              <div className="admin-toolbar-spacer" />
              <button
                type="button"
                className="admin-btn admin-btn-sm"
                onClick={addNote}
                disabled={form.notes.length >= SHIPPING_PAGE_NOTES_MAX}
              >
                <Plus size={14} /> افزودن نکته
              </button>
            </div>

            {form.notes.length === 0 ? (
              <p className="admin-empty">هنوز نکته‌ای اضافه نشده است.</p>
            ) : (
              <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                {form.notes.map((note, index) => (
                  <div
                    key={index}
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <input
                      className="admin-input"
                      value={note}
                      onChange={(event) => updateNote(index, event.target.value)}
                      maxLength={300}
                      aria-label={`نکتهٔ ${index + 1}`}
                      placeholder="مثلاً: بسته‌بندی سفارش‌ها محرمانه انجام می‌شود."
                    />
                    <button
                      type="button"
                      className="admin-btn admin-btn-sm"
                      onClick={() => removeNote(index)}
                      title="حذف نکته"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            className="admin-form-grid admin-form-grid-3"
            style={{ marginTop: 14 }}
          >
            <Field
              id="shipping-page-content"
              label="متن تکمیلی صفحه (اختیاری)"
              full
            >
              <textarea
                id="shipping-page-content"
                className="admin-input"
                rows={6}
                value={form.content}
                onChange={(event) => update("content", event.target.value)}
                maxLength={20000}
                placeholder={
                  "## عنوان بخش\nمتن پاراگراف...\n\n- نکتهٔ اول\n- نکتهٔ دوم"
                }
              />
              <p className="admin-card-desc" style={{ marginTop: 6 }}>
                نشانه‌های سبک متن: <code dir="ltr">##</code> سرتیتر،{" "}
                <code dir="ltr">###</code> زیرتیتر، <code dir="ltr">-</code>{" "}
                فهرست، <code dir="ltr">&gt;</code> نکتهٔ برجسته و{" "}
                <code dir="ltr">**متن**</code> پررنگ.
              </p>
            </Field>

            <Field id="shipping-page-show-costs" label="نمایش هزینه‌ها" full>
              <label
                style={{
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                  paddingTop: 4,
                }}
              >
                <input
                  type="checkbox"
                  className="admin-checkbox"
                  checked={form.show_costs}
                  onChange={(event) =>
                    update("show_costs", event.target.checked)
                  }
                />
                هزینهٔ پایه و هزینهٔ هر کیلوگرم روش‌ها روی صفحهٔ سایت نمایش
                داده شود.
              </label>
            </Field>
          </div>

          <div
            className="admin-toolbar"
            style={{ marginTop: 14, marginBottom: 0 }}
          >
            <div className="admin-toolbar-spacer" />
            <button
              type="submit"
              className="admin-btn admin-btn-primary admin-btn-sm"
              disabled={saving}
            >
              <Save size={14} /> {saving ? "در حال ذخیره..." : "ذخیره"}
            </button>
          </div>

        </form>
      </section>
    </div>
  );
}

