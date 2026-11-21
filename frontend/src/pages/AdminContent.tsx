import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { FileText, Images, LayoutTemplate, PanelsTopLeft } from "lucide-react";

import AdminBanners from "./AdminBanners";
import AdminPagesPanel from "../components/AdminPagesPanel";
import AdminSliderPanel from "../components/AdminSliderPanel";
import { useAdminAuth } from "../context/AdminAuthContext";
import { ADMIN_PERMISSIONS } from "../utils/adminPermissions";

/** تب‌های بخش مدیریت محتوا. */
type ContentTab = "banners" | "slider" | "pages";

const TABS: {
  key: ContentTab;
  label: string;
  description: string;
  icon: typeof Images;
  /** داشتن هر یک از این مجوزها برای دیدن تب کافی است. */
  permissions: string[];
}[] = [
  {
    key: "banners",
    label: "بنرها",
    description: "بنرهای دسکتاپ، موبایل و سایر بنرهای سایت",
    icon: Images,
    permissions: [ADMIN_PERMISSIONS.banners],
  },
  {
    key: "slider",
    label: "اسلایدر",
    description: "ترتیب، ارتفاع و وضعیت اسلایدهای بالای صفحهٔ اول",
    icon: PanelsTopLeft,
    permissions: [ADMIN_PERMISSIONS.banners],
  },
  {
    key: "pages",
    label: "صفحات سایت",
    description: "درباره ما، تماس با ما، قوانین و صفحات دلخواه",
    icon: FileText,
    permissions: [ADMIN_PERMISSIONS.pages],
  },
];

function resolveTab(value: string | null): ContentTab {
  return value === "slider" || value === "pages" ? value : "banners";
}

/**
 * بخش «مدیریت محتوا» در پنل مدیران.
 *
 * همهٔ کارهای محتوایی سایت یک‌جا جمع شده است: بنرهای فروشگاه (که پیش از این
 * صفحهٔ جداگانه داشت)، اسلایدر بالای صفحهٔ اول و صفحات ثابت سایت. تب فعال در
 * آدرس صفحه (?tab=...) نگه داشته می‌شود تا با رفرش یا لینک مستقیم هم بماند.
 * پارامتر `?edit=<id>` فرم ویرایش همان بنر را در تب بنرها باز می‌کند (از تب
 * «اسلایدر» یا لینک مستقیم).
 */
function AdminContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { can } = useAdminAuth();

  /*
   * هر تب مجوز خودش را دارد؛ کسی که فقط مجوز «صفحات سایت» دارد نباید تب
   * بنر را ببیند و اگر آدرس تب غیرمجاز را باز کند، به اولین تب مجاز می‌رود.
   */
  const allowedTabs = TABS.filter((tab) =>
    tab.permissions.some((permission) => can(permission)),
  );
  const requestedTab = resolveTab(searchParams.get("tab"));
  const activeTab = allowedTabs.some((tab) => tab.key === requestedTab)
    ? requestedTab
    : (allowedTabs[0]?.key ?? "banners");

  const editBannerId = Number(searchParams.get("edit")) || null;

  const switchTab = useCallback(
    (tab: ContentTab, options?: { editBannerId?: number }) => {
      const next: Record<string, string> = { tab };

      if (options?.editBannerId) {
        next.edit = String(options.editBannerId);
      }

      setSearchParams(next, { replace: true });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [setSearchParams],
  );

  /** بعد از باز شدن فرم ویرایش، پارامتر `edit` از آدرس پاک می‌شود. */
  const clearEditRequest = useCallback(() => {
    setSearchParams({ tab: activeTab }, { replace: true });
  }, [activeTab, setSearchParams]);

  return (
    <div dir="rtl" className="admin-page">
      <header className="admin-page-head">
        <div>
          <span className="admin-page-eyebrow">مدیریت محتوا</span>
          <h1 className="admin-page-title">مدیریت محتوای سایت</h1>
          <p className="admin-page-subtitle">
            بنرها، اسلایدر و صفحات سایت از همین‌جا مدیریت می‌شوند. هر بخش یک تب
            جدا دارد: در «بنرها» تصویر و متن بنرها را می‌سازید، در «اسلایدر»
            ترتیب و تنظیمات اسلایدهای بالای صفحهٔ اول را کنترل می‌کنید و در
            «صفحات سایت» صفحه‌هایی مانند درباره ما یا قوانین را می‌نویسید و
            منتشر می‌کنید.
          </p>
        </div>

        <div className="hidden h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 sm:flex">
          <LayoutTemplate size={26} aria-hidden="true" />
        </div>
      </header>

      <div
        role="tablist"
        aria-label="بخش‌های مدیریت محتوا"
        className="mb-5 flex flex-wrap gap-2"
      >
        {allowedTabs.map((tab) => {
          const selected = activeTab === tab.key;
          const Icon = tab.icon;

          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => switchTab(tab.key)}
              title={tab.description}
              className={`flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-bold transition ${
                selected
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-brand-200 bg-white text-muted hover:border-brand-300"
              }`}
            >
              <Icon size={16} aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel">
        {activeTab === "banners" && (
          <AdminBanners
            embedded
            initialEditId={editBannerId}
            onEditRequestHandled={clearEditRequest}
          />
        )}

        {activeTab === "slider" && (
          <AdminSliderPanel
            onManageBanners={(bannerId) =>
              switchTab("banners", { editBannerId: bannerId })
            }
          />
        )}

        {activeTab === "pages" && <AdminPagesPanel />}
      </div>
    </div>
  );
}

export default AdminContent;
