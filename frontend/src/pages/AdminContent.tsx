import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { FileText, Images, LayoutTemplate, PanelsTopLeft } from "lucide-react";

import AdminBanners from "./AdminBanners";
import AdminPagesPanel from "../components/AdminPagesPanel";
import AdminSliderPanel from "../components/AdminSliderPanel";

/** تب‌های بخش مدیریت محتوا. */
type ContentTab = "banners" | "slider" | "pages";

const TABS: {
  key: ContentTab;
  label: string;
  description: string;
  icon: typeof Images;
}[] = [
  {
    key: "banners",
    label: "بنرها",
    description: "بنرهای دسکتاپ، موبایل و سایر بنرهای سایت",
    icon: Images,
  },
  {
    key: "slider",
    label: "اسلایدر",
    description: "ترتیب، ارتفاع و وضعیت اسلایدهای بالای صفحهٔ اول",
    icon: PanelsTopLeft,
  },
  {
    key: "pages",
    label: "صفحات سایت",
    description: "درباره ما، تماس با ما، قوانین و صفحات دلخواه",
    icon: FileText,
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
 */
function AdminContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = resolveTab(searchParams.get("tab"));

  const switchTab = useCallback(
    (tab: ContentTab) => {
      setSearchParams({ tab }, { replace: true });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [setSearchParams],
  );

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

        <div className="hidden h-14 w-14 items-center justify-center rounded-2xl bg-[#f4f8ef] text-[#648767] sm:flex">
          <LayoutTemplate size={26} aria-hidden="true" />
        </div>
      </header>

      <div
        role="tablist"
        aria-label="بخش‌های مدیریت محتوا"
        className="mb-5 flex flex-wrap gap-2"
      >
        {TABS.map((tab) => {
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
                  ? "border-[#648767] bg-[#f4f8ef] text-[#385e3e]"
                  : "border-[#e3ebdc] bg-white text-[#6b7a67] hover:border-[#a8bea1]"
              }`}
            >
              <Icon size={16} aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel">
        {activeTab === "banners" && <AdminBanners embedded />}

        {activeTab === "slider" && (
          <AdminSliderPanel onManageBanners={() => switchTab("banners")} />
        )}

        {activeTab === "pages" && <AdminPagesPanel />}
      </div>
    </div>
  );
}

export default AdminContent;
