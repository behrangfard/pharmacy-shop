import { FormEvent, useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { Plus, Trash2 } from "lucide-react";

import { adminApi } from "../services/api";
import {
  fetchHeaderFooter,
  invalidateHeaderFooterCache,
  FOOTER_SERVICE_ICONS,
  FOOTER_SERVICES_MAX,
  HEADER_FOOTER_QUICK_LINKS_MAX,
  MOBILE_NAV_BADGES,
  MOBILE_NAV_ICONS,
  MOBILE_NAV_ITEMS_MAX,
  MOBILE_NAV_ITEMS_MIN,
  MOBILE_NAV_QUICK_LINKS_MAX,
  type FooterServiceIcon,
  type FooterServiceItem,
  type HeaderFooterLink,
  type MobileNavBadge,
  type MobileNavFabMode,
  type MobileNavIcon,
  type MobileNavItem,
  type MobileNavQuickLink,
} from "../services/headerFooter";
import { getStorageUrl } from "../utils/images";

type HeaderFooterForm = {
  header_logo_text: string;
  header_tagline: string;
  header_show_search: boolean;
  header_cta_enabled: boolean;
  header_cta_label: string;
  header_cta_url: string;
  header_cta_new_tab: boolean;
  footer_about_title: string;
  footer_about_text: string;
  footer_highlight_title: string;
  footer_highlight_text: string;
  footer_copyright: string;
  footer_quick_links: HeaderFooterLink[];
  footer_services_title: string;
  footer_services: FooterServiceItem[];
  footer_show_contact: boolean;
  mobile_nav_enabled: boolean;
  mobile_nav_items: MobileNavItem[];
  mobile_nav_quick_links: MobileNavQuickLink[];
  mobile_nav_fab_mode: MobileNavFabMode;
  mobile_nav_fab_url: string;
  mobile_nav_fab_logo: string;
};

const initialForm: HeaderFooterForm = {
  header_logo_text: "بهرنگ شاپ",
  header_tagline: "",
  header_show_search: true,
  header_cta_enabled: false,
  header_cta_label: "تخفیف‌های امروز",
  header_cta_url: "/products",
  header_cta_new_tab: false,
  footer_about_title: "",
  footer_about_text: "",
  footer_highlight_title: "",
  footer_highlight_text: "",
  footer_copyright: "",
  footer_quick_links: [],
  footer_services_title: "",
  footer_services: [],
  footer_show_contact: true,
  mobile_nav_enabled: true,
  mobile_nav_items: [],
  mobile_nav_quick_links: [],
  mobile_nav_fab_mode: "panel",
  mobile_nav_fab_url: "",
  mobile_nav_fab_logo: "",
};

/**
 * ردیف‌های «خدمات مشتریان» پاسخ API را به شکل فرم تبدیل می‌کند.
 * آیکن/اقدام ناشناخته به مقدار امن برمی‌گردد تا فرم هرگز خراب نشود.
 */
function servicesFromApi(raw: unknown): FooterServiceItem[] {
  if (!Array.isArray(raw)) return [];

  const items: FooterServiceItem[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;

    const item = entry as Record<string, unknown>;
    const title = typeof item.title === "string" ? item.title : "";

    if (!title.trim()) continue;

    items.push({
      title,
      description:
        typeof item.description === "string" ? item.description : "",
      icon: FOOTER_SERVICE_ICONS.some((option) => option.value === item.icon)
        ? (item.icon as FooterServiceIcon)
        : "sparkles",
      action:
        item.action === "url" || item.action === "support"
          ? item.action
          : "none",
      url: typeof item.url === "string" ? item.url : "",
    });
  }

  return items;
}

/** آیکن مجاز از پاسخ API؛ مقدار ناشناخته یعنی آیکن پیش‌فرض. */
function navIconFromApi(value: unknown): MobileNavIcon {
  return MOBILE_NAV_ICONS.some((option) => option.value === value)
    ? (value as MobileNavIcon)
    : "sparkles";
}

/**
 * میان‌برهای نوار پایین را از پاسخ API به شکل فرم تبدیل می‌کند.
 * ردیف بدون عنوان یا نشانی نادیده گرفته می‌شود تا فرم هرگز خراب نشود.
 */
function navItemsFromApi(raw: unknown): MobileNavItem[] {
  if (!Array.isArray(raw)) return [];

  const items: MobileNavItem[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;

    const item = entry as Record<string, unknown>;
    const label = typeof item.label === "string" ? item.label : "";
    const url = typeof item.url === "string" ? item.url : "";

    if (!label.trim() || !url.trim()) continue;

    items.push({
      label,
      url,
      icon: navIconFromApi(item.icon),
      badge:
        item.badge === "cart" || item.badge === "wishlist"
          ? item.badge
          : "none",
    });
  }

  return items;
}

/** ردیف‌های «دسترسی سریع» را از پاسخ API به شکل فرم تبدیل می‌کند. */
function navQuickLinksFromApi(raw: unknown): MobileNavQuickLink[] {
  if (!Array.isArray(raw)) return [];

  const links: MobileNavQuickLink[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;

    const item = entry as Record<string, unknown>;
    const label = typeof item.label === "string" ? item.label : "";
    const url = typeof item.url === "string" ? item.url : "";

    if (!label.trim() || !url.trim()) continue;

    links.push({
      label,
      hint: typeof item.hint === "string" ? item.hint : "",
      url,
      icon: navIconFromApi(item.icon),
    });
  }

  return links;
}

function getErrorMessage(error: unknown): string {
  const fallback = "ذخیره تنظیمات انجام نشد. لطفاً دوباره تلاش کنید.";

  if (!error || typeof error !== "object") {
    return fallback;
  }

  const response = (
    error as {
      response?: {
        data?: {
          message?: string;
          errors?: Record<string, string[] | string>;
        };
      };
      message?: string;
    }
  ).response?.data;

  if (response?.errors) {
    const validationMessages = Object.values(response.errors)
      .flatMap((messages) => (Array.isArray(messages) ? messages : [messages]))
      .filter((message): message is string => typeof message === "string");

    if (validationMessages.length > 0) {
      return validationMessages[0];
    }
  }

  return (
    response?.message || (error as { message?: string }).message || fallback
  );
}

type TextFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  help?: string;
  placeholder?: string;
  ltr?: boolean;
  maxLength?: number;
  full?: boolean;
  required?: boolean;
};

function TextField({
  id,
  label,
  value,
  onChange,
  help,
  placeholder,
  ltr,
  maxLength,
  full,
  required,
}: TextFieldProps) {
  return (
    <div className={`admin-field${full ? " admin-full" : ""}`}>
      <label className="admin-label" htmlFor={id}>
        {label}
        {required ? " *" : ""}
      </label>

      <input
        id={id}
        type="text"
        className="admin-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        dir={ltr ? "ltr" : undefined}
        maxLength={maxLength}
        required={required}
      />

      {help && <span className="admin-help">{help}</span>}
    </div>
  );
}

type CheckboxFieldProps = {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  help?: string;
};

function CheckboxField({
  id,
  label,
  checked,
  onChange,
  help,
}: CheckboxFieldProps) {
  return (
    <div className="admin-field">
      <label className="admin-checkbox" htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        {label}
      </label>

      {help && <span className="admin-help">{help}</span>}
    </div>
  );
}

function AdminHeaderFooter() {
  const [form, setForm] = useState<HeaderFooterForm>(initialForm);
  const [savedForm, setSavedForm] = useState<HeaderFooterForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await adminApi.get("/admin/header-footer");
        const data = response.data?.data ?? {};
        const bool = (value: unknown) =>
          value === true || value === 1 || value === "1";

        const links: HeaderFooterLink[] = Array.isArray(data.footer_quick_links)
          ? data.footer_quick_links
              .filter(
                (link: unknown): link is Record<string, unknown> =>
                  typeof link === "object" && link !== null,
              )
              .map((link: Record<string, unknown>) => ({
                label: typeof link.label === "string" ? link.label : "",
                url: typeof link.url === "string" ? link.url : "",
              }))
          : [];

        const services = servicesFromApi(data.footer_services);

        const next: HeaderFooterForm = {
          header_logo_text: data.header_logo_text ?? "",
          header_tagline: data.header_tagline ?? "",
          header_show_search: bool(data.header_show_search),
          header_cta_enabled: bool(data.header_cta_enabled),
          header_cta_label: data.header_cta_label ?? "",
          header_cta_url: data.header_cta_url ?? "",
          header_cta_new_tab: bool(data.header_cta_new_tab),
          footer_about_title: data.footer_about_title ?? "",
          footer_about_text: data.footer_about_text ?? "",
          footer_highlight_title: data.footer_highlight_title ?? "",
          footer_highlight_text: data.footer_highlight_text ?? "",
          footer_copyright: data.footer_copyright ?? "",
          footer_quick_links: links,
          footer_services_title: data.footer_services_title ?? "",
          footer_services: services,
          footer_show_contact: data.footer_show_contact === undefined
            ? true
            : bool(data.footer_show_contact),
          mobile_nav_enabled:
            data.mobile_nav_enabled === undefined
              ? true
              : bool(data.mobile_nav_enabled),
          mobile_nav_items: navItemsFromApi(data.mobile_nav_items),
          mobile_nav_quick_links: navQuickLinksFromApi(
            data.mobile_nav_quick_links,
          ),
          mobile_nav_fab_mode:
            data.mobile_nav_fab_mode === "link" ? "link" : "panel",
          mobile_nav_fab_url: data.mobile_nav_fab_url ?? "",
          mobile_nav_fab_logo: data.mobile_nav_fab_logo ?? "",
        };

        if (!active) return;

        setForm(next);
        setSavedForm(next);
      } catch (err) {
        if (active) setError(getErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  function updateField<K extends keyof HeaderFooterForm>(
    field: K,
    value: HeaderFooterForm[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateLink(
    index: number,
    field: keyof HeaderFooterLink,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      footer_quick_links: current.footer_quick_links.map((link, linkIndex) =>
        linkIndex === index ? { ...link, [field]: value } : link,
      ),
    }));
  }

  function addLink() {
    setForm((current) =>
      current.footer_quick_links.length >= HEADER_FOOTER_QUICK_LINKS_MAX
        ? current
        : {
            ...current,
            footer_quick_links: [
              ...current.footer_quick_links,
              { label: "", url: "" },
            ],
          },
    );
  }

  function removeLink(index: number) {
    setForm((current) => ({
      ...current,
      footer_quick_links: current.footer_quick_links.filter(
        (_, linkIndex) => linkIndex !== index,
      ),
    }));
  }

  /** تغییر فیلدهای یک ردیف «خدمات مشتریان». */
  function updateService(index: number, patch: Partial<FooterServiceItem>) {
    setForm((current) => ({
      ...current,
      footer_services: current.footer_services.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
  }

  function addService() {
    setForm((current) =>
      current.footer_services.length >= FOOTER_SERVICES_MAX
        ? current
        : {
            ...current,
            footer_services: [
              ...current.footer_services,
              {
                title: "",
                description: "",
                icon: "sparkles",
                action: "none",
                url: "",
              },
            ],
          },
    );
  }

  function removeService(index: number) {
    setForm((current) => ({
      ...current,
      footer_services: current.footer_services.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    }));
  }

  /** تغییر فیلدهای یک میان‌بر نوار پایین موبایل. */
  function updateNavItem(index: number, patch: Partial<MobileNavItem>) {
    setForm((current) => ({
      ...current,
      mobile_nav_items: current.mobile_nav_items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
  }

  function addNavItem() {
    setForm((current) =>
      current.mobile_nav_items.length >= MOBILE_NAV_ITEMS_MAX
        ? current
        : {
            ...current,
            mobile_nav_items: [
              ...current.mobile_nav_items,
              { label: "", url: "", icon: "sparkles", badge: "none" },
            ],
          },
    );
  }

  function removeNavItem(index: number) {
    setForm((current) => ({
      ...current,
      mobile_nav_items: current.mobile_nav_items.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    }));
  }

  /** تغییر فیلدهای یک ردیف «دسترسی سریع» پنل دکمهٔ شناور. */
  function updateNavQuickLink(
    index: number,
    patch: Partial<MobileNavQuickLink>,
  ) {
    setForm((current) => ({
      ...current,
      mobile_nav_quick_links: current.mobile_nav_quick_links.map(
        (link, linkIndex) =>
          linkIndex === index ? { ...link, ...patch } : link,
      ),
    }));
  }

  function addNavQuickLink() {
    setForm((current) =>
      current.mobile_nav_quick_links.length >= MOBILE_NAV_QUICK_LINKS_MAX
        ? current
        : {
            ...current,
            mobile_nav_quick_links: [
              ...current.mobile_nav_quick_links,
              { label: "", hint: "", url: "", icon: "sparkles" },
            ],
          },
    );
  }

  function removeNavQuickLink(index: number) {
    setForm((current) => ({
      ...current,
      mobile_nav_quick_links: current.mobile_nav_quick_links.filter(
        (_, linkIndex) => linkIndex !== index,
      ),
    }));
  }

  /**
   * بارگذاری لوگوی دکمهٔ شناور نوار پایین.
   * مثل بقیهٔ بخش‌های پنل، فایل همان لحظه ذخیره و مسیرش در فیلد فرم می‌نشیند؛
   * اتصال نهایی با دکمهٔ «ذخیره» انجام می‌شود.
   */
  async function handleNavLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    // ورودی پاک می‌شود تا انتخاب دوبارهٔ همان فایل هم رویداد بدهد.
    event.target.value = "";

    if (!file || uploadingLogo) return;

    setUploadingLogo(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await adminApi.post(
        "/admin/header-footer/mobile-logo",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );

      const path = response.data?.data?.path;

      if (typeof path !== "string" || path === "") {
        throw new Error("مسیر لوگوی بارگذاری‌شده برنگشت.");
      }

      updateField("mobile_nav_fab_logo", path);
      setSuccess(
        "لوگو بارگذاری شد؛ با دکمهٔ «ذخیره» روی نوار پایین اعمال می‌شود.",
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    if (!form.header_logo_text.trim()) {
      setError("متن لوگو (نام فروشگاه در هدر) الزامی است.");
      return;
    }

    // ردیف‌های کاملاً خالی نادیده گرفته می‌شوند؛ ردیف نیمه‌کاره خطا می‌دهد.
    const quickLinks: HeaderFooterLink[] = [];

    for (const [index, link] of form.footer_quick_links.entries()) {
      const label = link.label.trim();
      const url = link.url.trim();

      if (!label && !url) continue;

      if (!label || !url) {
        setError(
          `ردیف ${index + 1} لینک‌های سریع ناقص است؛ هم عنوان و هم نشانی لازم است.`,
        );
        return;
      }

      quickLinks.push({ label, url });
    }

    // ردیف‌های ستون «خدمات مشتریان»: ردیف کاملاً خالی نادیده گرفته می‌شود و
    // ردیف نیمه‌کاره (بدون عنوان یا لینکِ بدون نشانی) خطا می‌دهد.
    const serviceItems: FooterServiceItem[] = [];

    for (const [index, item] of form.footer_services.entries()) {
      const title = item.title.trim();
      const description = item.description.trim();
      const url = item.url.trim();

      if (!title && !description && !url) continue;

      if (!title) {
        setError(`ردیف ${index + 1} ستون «خدمات مشتریان» عنوان ندارد.`);
        return;
      }

      if (item.action === "url" && !url) {
        setError(
          `ردیف ${index + 1} («${title}»): برای اقدام «بازکردن لینک»، نشانی لازم است.`,
        );
        return;
      }

      serviceItems.push({
        title,
        description,
        icon: item.icon,
        action: item.action,
        url,
      });
    }

    /*
     * میان‌برهای نوار پایین موبایل: ردیف کاملاً خالی نادیده گرفته می‌شود،
     * ردیف نیمه‌کاره خطا می‌دهد و دست‌کم دو میان‌بر لازم است تا نوار شکل
     * درستی داشته باشد (همان قاعدهٔ سرور).
     */
    const navItems: MobileNavItem[] = [];

    for (const [index, item] of form.mobile_nav_items.entries()) {
      const label = item.label.trim();
      const url = item.url.trim();

      if (!label && !url) continue;

      if (!label || !url) {
        setError(
          `ردیف ${index + 1} منوی پایین ناقص است؛ هم عنوان و هم نشانی لازم است.`,
        );
        return;
      }

      navItems.push({ ...item, label, url });
    }

    if (navItems.length < MOBILE_NAV_ITEMS_MIN) {
      setError(
        `منوی پایین موبایل دست‌کم ${MOBILE_NAV_ITEMS_MIN} میان‌بر لازم دارد.`,
      );
      return;
    }

    if (
      form.mobile_nav_fab_mode === "link" &&
      form.mobile_nav_fab_url.trim() === ""
    ) {
      setError(
        "برای حالت «بازکردن یک نشانی»، نشانی دکمهٔ شناور لازم است.",
      );
      return;
    }

    // ردیف‌های «دسترسی سریع»: همان قاعدهٔ ردیف‌های بالا.
    const navQuickLinks: MobileNavQuickLink[] = [];

    for (const [index, link] of form.mobile_nav_quick_links.entries()) {
      const label = link.label.trim();
      const url = link.url.trim();

      if (!label && !url) continue;

      if (!label || !url) {
        setError(
          `ردیف ${index + 1} «دسترسی سریع» ناقص است؛ هم عنوان و هم نشانی لازم است.`,
        );
        return;
      }

      navQuickLinks.push({ ...link, label, url, hint: link.hint.trim() });
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await adminApi.put("/admin/header-footer", {
        ...form,
        footer_quick_links: quickLinks,
        footer_services: serviceItems,
        mobile_nav_items: navItems,
        mobile_nav_quick_links: navQuickLinks,
      });

      const data = response.data?.data;
      const bool = (value: unknown) =>
        value === true || value === 1 || value === "1";

      const next: HeaderFooterForm = {
        header_logo_text: data?.header_logo_text ?? form.header_logo_text,
        header_tagline: data?.header_tagline ?? form.header_tagline,
        header_show_search: bool(data?.header_show_search),
        header_cta_enabled: bool(data?.header_cta_enabled),
        header_cta_label: data?.header_cta_label ?? form.header_cta_label,
        header_cta_url: data?.header_cta_url ?? form.header_cta_url,
        header_cta_new_tab: bool(data?.header_cta_new_tab),
        footer_about_title:
          data?.footer_about_title ?? form.footer_about_title,
        footer_about_text: data?.footer_about_text ?? form.footer_about_text,
        footer_highlight_title:
          data?.footer_highlight_title ?? form.footer_highlight_title,
        footer_highlight_text:
          data?.footer_highlight_text ?? form.footer_highlight_text,
        footer_copyright: data?.footer_copyright ?? form.footer_copyright,
        footer_quick_links: Array.isArray(data?.footer_quick_links)
          ? data.footer_quick_links
          : quickLinks,
        footer_services_title:
          data?.footer_services_title ?? form.footer_services_title,
        footer_services: Array.isArray(data?.footer_services)
          ? servicesFromApi(data.footer_services)
          : serviceItems,
        footer_show_contact:
          data?.footer_show_contact === undefined
            ? form.footer_show_contact
            : bool(data?.footer_show_contact),
        mobile_nav_enabled:
          data?.mobile_nav_enabled === undefined
            ? form.mobile_nav_enabled
            : bool(data?.mobile_nav_enabled),
        mobile_nav_items: Array.isArray(data?.mobile_nav_items)
          ? navItemsFromApi(data.mobile_nav_items)
          : navItems,
        mobile_nav_quick_links: Array.isArray(data?.mobile_nav_quick_links)
          ? navQuickLinksFromApi(data.mobile_nav_quick_links)
          : navQuickLinks,
        mobile_nav_fab_mode:
          data?.mobile_nav_fab_mode === "link" ? "link" : form.mobile_nav_fab_mode,
        mobile_nav_fab_url: data?.mobile_nav_fab_url ?? form.mobile_nav_fab_url,
        mobile_nav_fab_logo:
          data?.mobile_nav_fab_logo ?? form.mobile_nav_fab_logo,
      };

      setForm(next);
      setSavedForm(next);
      setSuccess(
        "تنظیمات هدر و فوتر ذخیره شد؛ سایت از همین حالا مقادیر جدید را نشان می‌دهد.",
      );

      invalidateHeaderFooterCache();
      void fetchHeaderFooter(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  /** پیش‌نمایش لوگوی انتخاب‌شدهٔ دکمهٔ شناور. */
  const navLogoPreview = getStorageUrl(form.mobile_nav_fab_logo);

  return (
    <div dir="rtl" className="admin-page">
      <header className="admin-page-head">
        <div>
          <span className="admin-page-eyebrow">ظاهر فروشگاه</span>
          <h1 className="admin-page-title">هدر و فوتر</h1>
          <p className="admin-page-subtitle">
            متن لوگو، شعار و دکمهٔ اقدام هدر، به‌همراه متن ستون «درباره»،
            لینک‌های سریع، ستون «خدمات مشتریان» و خط کپی‌رایت فوتر را از اینجا
            مدیریت کنید. هر فیلد را خالی بگذارید، سایت همان متن پیش‌فرض خودش را
            نشان می‌دهد.
          </p>
        </div>
      </header>

      {error && (
        <div className="admin-alert admin-alert-error" role="alert">
          <span aria-hidden="true">!</span>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="admin-alert admin-alert-success" role="status">
          <span aria-hidden="true">✓</span>
          <span>{success}</span>
        </div>
      )}


      {loading ? (
        <div className="admin-card">
          <p className="admin-empty">در حال دریافت تنظیمات...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <section className="admin-card">
            <div className="admin-card-head">
              <div>
                <h2 className="admin-card-title">هدر سایت</h2>
                <p className="admin-card-desc">
                  نوار بالای همهٔ صفحه‌ها؛ متن لوگو، شعار کنار آن و دکمهٔ اقدام
                  را از اینجا تغییر دهید. دکمهٔ اقدام فقط در دسکتاپ نمایش داده
                  می‌شود تا هدر موبایل شلوغ نشود.
                </p>
              </div>
            </div>

            <div className="admin-form-grid">
              <TextField
                id="hf-logo-text"
                label="متن لوگو"
                value={form.header_logo_text}
                onChange={(value) => updateField("header_logo_text", value)}
                maxLength={60}
                required
                help="بالای سایت به‌جای نام فروشگاه نمایش داده می‌شود."
              />

              <TextField
                id="hf-tagline"
                label="شعار کوتاه کنار لوگو"
                value={form.header_tagline}
                onChange={(value) => updateField("header_tagline", value)}
                maxLength={120}
                placeholder="مثلاً: کیفیت و راحتی برای هر روز"
                help="خالی بگذارید تا نمایش داده نشود (فقط در صفحه‌های بزرگ)."
              />

              <TextField
                id="hf-cta-label"
                label="متن دکمهٔ اقدام (CTA)"
                value={form.header_cta_label}
                onChange={(value) => updateField("header_cta_label", value)}
                maxLength={40}
                placeholder="تخفیف‌های امروز"
                help="مثلاً «تخفیف‌های امروز» یا «مشاورهٔ خرید»."
              />

              <TextField
                id="hf-cta-url"
                label="نشانی دکمهٔ اقدام"
                value={form.header_cta_url}
                onChange={(value) => updateField("header_cta_url", value)}
                maxLength={255}
                ltr
                placeholder="/products"
                help="مسیر داخلی مثل /products یا نشانی کامل https://example.com"
              />

              <CheckboxField
                id="hf-show-search"
                label="نمایش کادر جست‌وجو در هدر"
                checked={form.header_show_search}
                onChange={(checked) =>
                  updateField("header_show_search", checked)
                }
                help="با غیرفعال‌کردن، کادر جست‌وجو از هدر برداشته می‌شود."
              />

              <CheckboxField
                id="hf-cta-enabled"
                label="نمایش دکمهٔ اقدام در هدر"
                checked={form.header_cta_enabled}
                onChange={(checked) =>
                  updateField("header_cta_enabled", checked)
                }
              />

              <CheckboxField
                id="hf-cta-new-tab"
                label="باز شدن دکمهٔ اقدام در تب جدید"
                checked={form.header_cta_new_tab}
                onChange={(checked) =>
                  updateField("header_cta_new_tab", checked)
                }
                help="برای لینک‌های خارجی مناسب است."
              />
            </div>
          </section>


          <section className="admin-card">
            <div className="admin-card-head">
              <div>
                <h2 className="admin-card-title">فوتر سایت</h2>
                <p className="admin-card-desc">
                  متن ستون «درباره»، کارت تأکید کنار آن، لینک‌های سریع، ستون
                  «خدمات مشتریان» و خط کپی‌رایت پایین صفحه را از اینجا تغییر
                  دهید.
                </p>
              </div>
            </div>

            <div className="admin-form-grid">
              <TextField
                id="hf-about-title"
                label="عنوان ستون درباره"
                value={form.footer_about_title}
                onChange={(value) => updateField("footer_about_title", value)}
                maxLength={80}
                placeholder="درباره بهرنگ شاپ"
                help="خالی بگذارید تا «درباره <نام فروشگاه>» نمایش داده شود."
              />

              <TextField
                id="hf-highlight-title"
                label="عنوان کارت تأکید"
                value={form.footer_highlight_title}
                onChange={(value) =>
                  updateField("footer_highlight_title", value)
                }
                maxLength={80}
              />

              <div className="admin-field admin-full">
                <label className="admin-label" htmlFor="hf-about-text">
                  متن ستون درباره
                </label>
                <textarea
                  id="hf-about-text"
                  className="admin-textarea"
                  value={form.footer_about_text}
                  onChange={(event) =>
                    updateField("footer_about_text", event.target.value)
                  }
                  maxLength={600}
                  rows={4}
                  placeholder="داستان کوتاه فروشگاه، کیفیت محصولات و تجربهٔ خرید..."
                />
                <span className="admin-help">
                  این متن زیر عنوان ستون «درباره» در فوتر نمایش داده می‌شود.
                </span>
              </div>

              <div className="admin-field admin-full">
                <label className="admin-label" htmlFor="hf-highlight-text">
                  متن کارت تأکید
                </label>
                <textarea
                  id="hf-highlight-text"
                  className="admin-textarea"
                  value={form.footer_highlight_text}
                  onChange={(event) =>
                    updateField("footer_highlight_text", event.target.value)
                  }
                  maxLength={300}
                  rows={2}
                />
              </div>

              <TextField
                id="hf-copyright"
                label="متن کپی‌رایت"
                value={form.footer_copyright}
                onChange={(value) => updateField("footer_copyright", value)}
                maxLength={200}
                full
                placeholder="تمامی حقوق این وب‌سایت متعلق به بهرنگ شاپ است."
                help="خالی بگذارید تا جملهٔ پیش‌فرض با نام فروشگاه نمایش داده شود."
              />

              <TextField
                id="hf-services-title"
                label="عنوان ستون خدمات مشتریان"
                value={form.footer_services_title}
                onChange={(value) => updateField("footer_services_title", value)}
                maxLength={80}
                placeholder="خدمات مشتریان"
                help="خالی بگذارید تا همان «خدمات مشتریان» نمایش داده شود."
              />

              <CheckboxField
                id="hf-show-contact"
                label="نمایش ردیف‌های تلفن، ایمیل و نشانی"
                checked={form.footer_show_contact}
                onChange={(checked) => updateField("footer_show_contact", checked)}
                help="این سه ردیف خودشان از «تنظیمات فروشگاه» خوانده می‌شوند."
              />

              <div className="admin-field admin-full">
                <span className="admin-label">لینک‌های سریع فوتر</span>
                <span className="admin-help">
                  زیر عنوان «دسترسی سریع» نمایش داده می‌شوند؛ حداکثر ۱۲ لینک.
                  مسیر داخلی با / شروع می‌شود (مثل /products) و لینک خارجی با
                  https:// در تب جدید باز می‌شود.
                </span>

                <div className="mt-2 space-y-2">
                  {form.footer_quick_links.map((link, index) => (
                    <div
                      key={index}
                      className="flex flex-col gap-2 sm:flex-row sm:items-center"
                    >
                      <input
                        className="admin-input min-w-0 flex-1"
                        value={link.label}
                        onChange={(event) =>
                          updateLink(index, "label", event.target.value)
                        }
                        placeholder="عنوان (مثلاً فروشگاه)"
                        aria-label={`عنوان لینک ${index + 1}`}
                        maxLength={40}
                      />

                      <input
                        className="admin-input min-w-0 flex-1"
                        dir="ltr"
                        value={link.url}
                        onChange={(event) =>
                          updateLink(index, "url", event.target.value)
                        }
                        placeholder="/products"
                        aria-label={`نشانی لینک ${index + 1}`}
                        maxLength={255}
                      />

                      <button
                        type="button"
                        className="admin-btn admin-btn-danger admin-btn-sm"
                        onClick={() => removeLink(index)}
                        aria-label={`حذف لینک ${index + 1}`}
                      >
                        <Trash2 size={15} aria-hidden="true" />
                        <span>حذف</span>
                      </button>
                    </div>
                  ))}

                  {form.footer_quick_links.length === 0 && (
                    <p className="admin-help">
                      هنوز لینکی ثبت نشده است؛ با دکمهٔ زیر اولین لینک را اضافه
                      کنید.
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  className="admin-btn admin-btn-sm mt-3"
                  onClick={addLink}
                  disabled={
                    form.footer_quick_links.length >=
                    HEADER_FOOTER_QUICK_LINKS_MAX
                  }
                >
                  <Plus size={15} aria-hidden="true" />
                  <span>افزودن لینک</span>
                </button>
              </div>

              <div className="admin-field admin-full">
                <span className="admin-label">ردیف‌های ستون «خدمات مشتریان»</span>
                <span className="admin-help">
                  این ردیف‌ها زیر عنوان «{form.footer_services_title || "خدمات مشتریان"}»
                  نمایش داده می‌شوند؛ حداکثر {FOOTER_SERVICES_MAX} ردیف. برای ردیفی
                  که با کلیک باید پنجرهٔ چت پشتیبانی باز شود، «اقدام» را روی
                  «بازکردن چت پشتیبانی» بگذارید. نشانی می‌تواند مسیر داخلی
                  (/account)، لینک کامل (https://…) یا tel: و mailto: باشد.
                </span>

                <div className="mt-2 space-y-3">
                  {form.footer_services.map((item, index) => (
                    <div
                      key={index}
                      className="space-y-2 rounded-xl border border-line bg-white p-3"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                          className="admin-input min-w-0 flex-1"
                          value={item.title}
                          onChange={(event) =>
                            updateService(index, { title: event.target.value })
                          }
                          placeholder="عنوان (مثلاً پشتیبانی)"
                          aria-label={`عنوان ردیف ${index + 1}`}
                          maxLength={60}
                        />

                        <input
                          className="admin-input min-w-0 flex-1"
                          value={item.description}
                          onChange={(event) =>
                            updateService(index, {
                              description: event.target.value,
                            })
                          }
                          placeholder="توضیح کوتاه (اختیاری)"
                          aria-label={`توضیح ردیف ${index + 1}`}
                          maxLength={140}
                        />

                        <button
                          type="button"
                          className="admin-btn admin-btn-danger admin-btn-sm"
                          onClick={() => removeService(index)}
                          aria-label={`حذف ردیف ${index + 1}`}
                        >
                          <Trash2 size={15} aria-hidden="true" />
                          <span>حذف</span>
                        </button>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <select
                          className="admin-select min-w-0 flex-1"
                          value={item.icon}
                          onChange={(event) =>
                            updateService(index, {
                              icon: event.target.value as FooterServiceIcon,
                            })
                          }
                          aria-label={`آیکن ردیف ${index + 1}`}
                        >
                          {FOOTER_SERVICE_ICONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>

                        <select
                          className="admin-select min-w-0 flex-1"
                          value={item.action}
                          onChange={(event) =>
                            updateService(index, {
                              action: event.target
                                .value as FooterServiceItem["action"],
                            })
                          }
                          aria-label={`اقدام ردیف ${index + 1}`}
                        >
                          <option value="none">فقط متن راهنما</option>
                          <option value="url">بازکردن لینک</option>
                          <option value="support">بازکردن چت پشتیبانی</option>
                        </select>

                        {item.action === "url" && (
                          <input
                            className="admin-input min-w-0 flex-1"
                            dir="ltr"
                            value={item.url}
                            onChange={(event) =>
                              updateService(index, { url: event.target.value })
                            }
                            placeholder="/account"
                            aria-label={`نشانی ردیف ${index + 1}`}
                            maxLength={255}
                          />
                        )}
                      </div>
                    </div>
                  ))}

                  {form.footer_services.length === 0 && (
                    <p className="admin-help">
                      هنوز ردیفی ثبت نشده است؛ با دکمهٔ زیر اولین ردیف را اضافه
                      کنید.
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  className="admin-btn admin-btn-sm mt-3"
                  onClick={addService}
                  disabled={form.footer_services.length >= FOOTER_SERVICES_MAX}
                >
                  <Plus size={15} aria-hidden="true" />
                  <span>افزودن ردیف</span>
                </button>
              </div>

            </div>
          </section>

          <section className="admin-card">
            <div className="admin-card-head">
              <div>
                <h2 className="admin-card-title">منوی پایین موبایل</h2>
                <p className="admin-card-desc">
                  نوار پایین صفحه در موبایل: میان‌برها، ردیف‌های پنل «دسترسی
                  سریع» و دکمهٔ شناور وسط نوار. ترتیب ردیف‌ها همان ترتیب نمایش
                  است و ردیف‌های «جست‌وجو در فروشگاه» و «بخش ویژهٔ ۱۸+» ثابت
                  می‌مانند.
                </p>
              </div>
            </div>

            <div className="admin-form-grid">
              <CheckboxField
                id="hf-mobile-nav-enabled"
                label="نمایش نوار پایین در موبایل"
                checked={form.mobile_nav_enabled}
                onChange={(checked) =>
                  updateField("mobile_nav_enabled", checked)
                }
                help="با غیرفعال‌کردن، نوار و دکمهٔ شناور در موبایل پنهان می‌شوند."
              />

              <div className="admin-field">
                <label className="admin-label" htmlFor="hf-mobile-nav-fab-mode">
                  رفتار دکمهٔ شناور
                </label>
                <select
                  id="hf-mobile-nav-fab-mode"
                  className="admin-select"
                  value={form.mobile_nav_fab_mode}
                  onChange={(event) =>
                    updateField(
                      "mobile_nav_fab_mode",
                      event.target.value as MobileNavFabMode,
                    )
                  }
                >
                  <option value="panel">بازکردن پنل «دسترسی سریع»</option>
                  <option value="link">رفتن به یک نشانی</option>
                </select>
                <span className="admin-help">
                  در حالت پیش‌فرض، دکمه پنل دسترسی سریع را باز و بسته می‌کند.
                </span>
              </div>

              {form.mobile_nav_fab_mode === "link" && (
                <TextField
                  id="hf-mobile-nav-fab-url"
                  label="نشانی دکمهٔ شناور"
                  value={form.mobile_nav_fab_url}
                  onChange={(value) => updateField("mobile_nav_fab_url", value)}
                  maxLength={255}
                  ltr
                  placeholder="/products"
                  help="مسیر داخلی مثل /products یا نشانی کامل https://example.com"
                />
              )}

              <div className="admin-field admin-full">
                <span className="admin-label">لوگوی دکمهٔ شناور</span>
                <span className="admin-help">
                  PNG/JPG/WebP تا ۲ مگابایت؛ داخل دایرهٔ وسط نوار نمایش داده
                  می‌شود. خالی بگذارید تا آیکن پیش‌فرض بماند. مسیر آمادهٔ فرانت
                  (مثل /images/logo.png) هم پذیرفته می‌شود.
                </span>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label className="admin-btn admin-btn-sm cursor-pointer">
                    {uploadingLogo ? "در حال بارگذاری..." : "بارگذاری لوگو"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(event) => void handleNavLogoUpload(event)}
                      style={{ display: "none" }}
                      disabled={uploadingLogo}
                    />
                  </label>

                  {form.mobile_nav_fab_logo && (
                    <button
                      type="button"
                      className="admin-btn admin-btn-sm admin-btn-danger"
                      onClick={() => updateField("mobile_nav_fab_logo", "")}
                      disabled={uploadingLogo}
                    >
                      حذف لوگو
                    </button>
                  )}

                  <input
                    className="admin-input min-w-0 flex-1"
                    dir="ltr"
                    value={form.mobile_nav_fab_logo}
                    onChange={(event) =>
                      updateField("mobile_nav_fab_logo", event.target.value)
                    }
                    placeholder="mobile-nav/logo.webp"
                    aria-label="مسیر لوگوی دکمهٔ شناور"
                    maxLength={2048}
                  />
                </div>

                {navLogoPreview && (
                  <img
                    src={navLogoPreview}
                    alt="پیش‌نمایش لوگوی نوار پایین"
                    style={{
                      marginTop: 8,
                      height: 48,
                      width: "auto",
                      objectFit: "contain",
                    }}
                  />
                )}
              </div>

              <div className="admin-field admin-full">
                <span className="admin-label">میان‌برهای نوار پایین</span>
                <span className="admin-help">
                  {MOBILE_NAV_ITEMS_MIN} تا {MOBILE_NAV_ITEMS_MAX} ردیف؛ دو ردیف
                  اول سمت راست قوس وسط نوار و بقیه سمت چپ آن می‌آیند. «نشان» عدد
                  سبد خرید یا علاقه‌مندی را روی آیکن همان میان‌بر می‌گذارد.
                </span>

                <div className="mt-2 space-y-3">
                  {form.mobile_nav_items.map((item, index) => (
                    <div
                      key={index}
                      className="space-y-2 rounded-xl border border-line bg-white p-3"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                          className="admin-input min-w-0 flex-1"
                          value={item.label}
                          onChange={(event) =>
                            updateNavItem(index, { label: event.target.value })
                          }
                          placeholder="عنوان (مثلاً فروشگاه)"
                          aria-label={`عنوان میان‌بر ${index + 1}`}
                          maxLength={24}
                        />

                        <input
                          className="admin-input min-w-0 flex-1"
                          dir="ltr"
                          value={item.url}
                          onChange={(event) =>
                            updateNavItem(index, { url: event.target.value })
                          }
                          placeholder="/products"
                          aria-label={`نشانی میان‌بر ${index + 1}`}
                          maxLength={255}
                        />
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <select
                          className="admin-select min-w-0 flex-1"
                          value={item.icon}
                          onChange={(event) =>
                            updateNavItem(index, {
                              icon: event.target.value as MobileNavIcon,
                            })
                          }
                          aria-label={`آیکن میان‌بر ${index + 1}`}
                        >
                          {MOBILE_NAV_ICONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>

                        <select
                          className="admin-select min-w-0 flex-1"
                          value={item.badge}
                          onChange={(event) =>
                            updateNavItem(index, {
                              badge: event.target.value as MobileNavBadge,
                            })
                          }
                          aria-label={`نشان میان‌بر ${index + 1}`}
                        >
                          {MOBILE_NAV_BADGES.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          className="admin-btn admin-btn-danger admin-btn-sm"
                          onClick={() => removeNavItem(index)}
                          aria-label={`حذف میان‌بر ${index + 1}`}
                          disabled={
                            form.mobile_nav_items.length <= MOBILE_NAV_ITEMS_MIN
                          }
                        >
                          <Trash2 size={15} aria-hidden="true" />
                          <span>حذف</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="admin-btn admin-btn-sm mt-3"
                  onClick={addNavItem}
                  disabled={
                    form.mobile_nav_items.length >= MOBILE_NAV_ITEMS_MAX
                  }
                >
                  <Plus size={15} aria-hidden="true" />
                  <span>افزودن میان‌بر</span>
                </button>
              </div>

              <div className="admin-field admin-full">
                <span className="admin-label">ردیف‌های «دسترسی سریع»</span>
                <span className="admin-help">
                  این ردیف‌ها در پنل دکمهٔ شناور و بعد از ردیف ثابت «جست‌وجو در
                  فروشگاه» نمایش داده می‌شوند؛ حداکثر {MOBILE_NAV_QUICK_LINKS_MAX}{" "}
                  ردیف. نشانی `/account` برای مهمان خودکار به صفحهٔ ورود می‌رود.
                </span>

                <div className="mt-2 space-y-3">
                  {form.mobile_nav_quick_links.map((link, index) => (
                    <div
                      key={index}
                      className="space-y-2 rounded-xl border border-line bg-white p-3"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                          className="admin-input min-w-0 flex-1"
                          value={link.label}
                          onChange={(event) =>
                            updateNavQuickLink(index, {
                              label: event.target.value,
                            })
                          }
                          placeholder="عنوان (مثلاً پیگیری سفارش)"
                          aria-label={`عنوان دسترسی سریع ${index + 1}`}
                          maxLength={40}
                        />

                        <input
                          className="admin-input min-w-0 flex-1"
                          value={link.hint}
                          onChange={(event) =>
                            updateNavQuickLink(index, {
                              hint: event.target.value,
                            })
                          }
                          placeholder="توضیح کوتاه زیر عنوان"
                          aria-label={`توضیح دسترسی سریع ${index + 1}`}
                          maxLength={80}
                        />
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                          className="admin-input min-w-0 flex-1"
                          dir="ltr"
                          value={link.url}
                          onChange={(event) =>
                            updateNavQuickLink(index, {
                              url: event.target.value,
                            })
                          }
                          placeholder="/track-order"
                          aria-label={`نشانی دسترسی سریع ${index + 1}`}
                          maxLength={255}
                        />

                        <select
                          className="admin-select min-w-0 flex-1"
                          value={link.icon}
                          onChange={(event) =>
                            updateNavQuickLink(index, {
                              icon: event.target.value as MobileNavIcon,
                            })
                          }
                          aria-label={`آیکن دسترسی سریع ${index + 1}`}
                        >
                          {MOBILE_NAV_ICONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          className="admin-btn admin-btn-danger admin-btn-sm"
                          onClick={() => removeNavQuickLink(index)}
                          aria-label={`حذف دسترسی سریع ${index + 1}`}
                        >
                          <Trash2 size={15} aria-hidden="true" />
                          <span>حذف</span>
                        </button>
                      </div>
                    </div>
                  ))}

                  {form.mobile_nav_quick_links.length === 0 && (
                    <p className="admin-help">
                      هنوز ردیفی ثبت نشده است؛ با دکمهٔ زیر اولین ردیف را اضافه
                      کنید.
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  className="admin-btn admin-btn-sm mt-3"
                  onClick={addNavQuickLink}
                  disabled={
                    form.mobile_nav_quick_links.length >=
                    MOBILE_NAV_QUICK_LINKS_MAX
                  }
                >
                  <Plus size={15} aria-hidden="true" />
                  <span>افزودن ردیف</span>
                </button>
              </div>
            </div>
          </section>

          <div className="admin-actions">
            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              disabled={saving}
            >
              {saving ? "در حال ذخیره..." : "ذخیرهٔ هدر و فوتر"}
            </button>

            <button
              type="button"
              className="admin-btn"
              onClick={() => {
                setForm(savedForm);
                setError("");
                setSuccess("");
              }}
              disabled={saving}
            >
              بازگردانی تغییرات ذخیره‌نشده
            </button>
          </div>

        </form>
      )}
    </div>
  );
}

export default AdminHeaderFooter;

