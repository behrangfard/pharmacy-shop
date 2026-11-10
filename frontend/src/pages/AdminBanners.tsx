import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ImagePlus, Loader2, Plus, Upload } from "lucide-react";

import AdminBannerFontsPanel from "../components/AdminBannerFontsPanel";
import AdminBannerSectionCard, {
  type AdminBannerSection,
  type AdminBannerSectionKind,
} from "../components/AdminBannerSectionCard";
import AdminBannerTextEditor from "../components/AdminBannerTextEditor";
import JalaliDatePicker from "../components/JalaliDatePicker";
import { useAdminBannerFonts } from "../hooks/useBannerFonts";
import { adminApi } from "../services/api";
import {
  formatAdminDate,
  getAdminErrorMessage,
  toDateTimeInput,
} from "../utils/adminFormat";
import {
  sanitizeBannerTextLayers,
  type BannerTextLayer,
  type BannerTextScrim,
} from "../utils/bannerText";
import {
  BANNER_RADIUS_PRESETS,
  DEFAULT_BANNER_RADIUS,
  HOME_GRID_POSITION,
  HOME_HERO_POSITION,
  HOME_MOBILE_MIDDLE_POSITION,
  HOME_MOBILE_TOP_POSITION,
  MAX_BANNER_RADIUS,
  bannerSectionSlots,
  normalizeBannerRadius,
  normalizeBannerSectionAnimation,
  normalizeBannerSectionFit,
  normalizeBannerSectionLayout,
  type BannerSectionLayout,
} from "../utils/bannerGrid";
import { isMobileBannerPosition } from "../utils/banners";
import { getStorageUrl } from "../utils/images";

interface Banner {
  id: number;
  title: string | null;
  subtitle: string | null;
  image: string;
  /** تصویر نسخهٔ موبایل (برای بنرهای موبایل همان تصویر اصلی است). */
  mobile_image: string | null;
  /** متن جایگزین تصویر برای سئو و screen reader. */
  image_alt: string | null;
  /** پردهٔ تیره پشت متن (none | light | medium | dark). */
  text_scrim: string | null;
  /** لایه‌های متن روی بنر (JSON از API). */
  text_layers: unknown;
  link: string | null;
  button_label: string | null;
  position:
    | "home_hero"
    | "home_strip"
    | "home_grid"
    | "home_mobile_top"
    | "home_mobile_middle"
    | "products_top";
  sort_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

/**
 * تنظیمات بخش‌های بنر صفحهٔ اول.
 *
 * چهار بخش مستقل: بالای صفحه (دسکتاپ)، وسط صفحه (دسکتاپ)، بالای موبایل و
 * وسط موبایل. هر بخش تعداد، ارتفاع و گردی گوشهٔ خودش را دارد.
 */
type BannerSectionPosition =
  | typeof HOME_HERO_POSITION
  | typeof HOME_GRID_POSITION
  | typeof HOME_MOBILE_TOP_POSITION
  | typeof HOME_MOBILE_MIDDLE_POSITION;

/** تنظیمات بخش بنر (شکل مشترک با کارت تنظیمات). */
type BannerSection = AdminBannerSection & { position: BannerSectionPosition };

/** تنظیمات قابل ویرایش هر بخش در پنل + جای نمایش آن. */
const BANNER_SECTION_CARDS: {
  position: BannerSectionPosition;
  kind: AdminBannerSectionKind;
  tab: "desktop" | "mobile";
  title: string;
  description: string;
  addLabel: string;
}[] = [
  {
    position: HOME_HERO_POSITION,
    kind: "hero",
    tab: "desktop",
    title: "بنر بالای صفحهٔ اول (دسکتاپ)",
    description:
      "اسلایدر بالای صفحهٔ اول در دسکتاپ. تعداد تصاویر، حداکثر ارتفاع، گردی گوشه و انیمیشن هاور این بخش مستقل از بقیهٔ بنرهاست. با «بدون برش و بدون بزرگ‌نمایی» تصویر با نسبت خودش نمایش داده می‌شود و کیفیتش پایین نمی‌آید. تعداد خالی یا ۰ یعنی همهٔ بنرهای این بخش.",
    addLabel: "افزودن بنر به این بخش",
  },
  {
    position: HOME_GRID_POSITION,
    kind: "grid",
    tab: "desktop",
    title: "بنر وسط صفحهٔ اول (دسکتاپ)",
    description:
      "ردیف بنرهای چندستونهٔ وسط صفحهٔ اول در دسکتاپ (بعد از دسته‌بندی محصولات). چیدمان، ارتفاع کاشی‌ها، گردی گوشه و انیمیشن هاور این بخش مستقل است؛ مثلاً «دو بنر راست، یکی چپ» دو بنر کوچک را روی هم سمت راست و یک بنر بلند را سمت چپ می‌گذارد.",
    addLabel: "افزودن بنر به این بخش",
  },
  {
    position: HOME_MOBILE_TOP_POSITION,
    kind: "mobile",
    tab: "mobile",
    title: "بنر بالای صفحه (موبایل)",
    description:
      "این بنر فقط روی موبایل (عرض کمتر از ۷۶۸ پیکسل) و بالای صفحهٔ اول نمایش داده می‌شود. تصویر، تعداد، ارتفاع و گردی گوشهٔ آن کاملاً مستقل از بنرهای دسکتاپ است.",
    addLabel: "افزودن بنر موبایل",
  },
  {
    position: HOME_MOBILE_MIDDLE_POSITION,
    kind: "mobile",
    tab: "mobile",
    title: "بنر وسط صفحه (موبایل)",
    description:
      "این بنر فقط روی موبایل و وسط صفحهٔ اول (بعد از دسته‌بندی محصولات) نمایش داده می‌شود. تعداد، ارتفاع و گردی گوشهٔ آن مستقل از بنر بالای موبایل و بنرهای دسکتاپ است.",
    addLabel: "افزودن بنر موبایل",
  },
];

/** بنرهای هر تب؛ «سایر» شامل نوار تبلیغاتی و بنر بالای صفحهٔ محصولات است. */
type BannerTab = "desktop" | "mobile" | "other";

const POSITIONS_BY_TAB: Record<BannerTab, Banner["position"][]> = {
  desktop: [HOME_HERO_POSITION, HOME_GRID_POSITION],
  mobile: [HOME_MOBILE_TOP_POSITION, HOME_MOBILE_MIDDLE_POSITION],
  other: ["home_strip", "products_top"],
};

/** اولین موقعیت هر تب؛ فرم «افزودن بنر» با همین موقعیت باز می‌شود. */
const DEFAULT_POSITION_BY_TAB: Record<BannerTab, Banner["position"]> = {
  desktop: HOME_HERO_POSITION,
  mobile: HOME_MOBILE_TOP_POSITION,
  other: "home_strip",
};

const TAB_LABELS: Record<BannerTab, string> = {
  desktop: "بنرهای دسکتاپ",
  mobile: "بنرهای موبایل",
  other: "سایر بنرها",
};

interface BannerForm {
  title: string;
  subtitle: string;
  image: string;
  mobile_image: string;
  image_alt: string;
  text_scrim: BannerTextScrim;
  text_layers: BannerTextLayer[];
  link: string;
  button_label: string;
  position: Banner["position"];
  sort_order: string;
  is_active: boolean;
  starts_at: string;
  ends_at: string;
}

const initialForm: BannerForm = {
  title: "",
  subtitle: "",
  image: "",
  mobile_image: "",
  image_alt: "",
  text_scrim: "none",
  text_layers: [],
  link: "",
  button_label: "",
  position: "home_hero",
  sort_order: "0",
  is_active: true,
  starts_at: "",
  ends_at: "",
};

const positionLabels: Record<Banner["position"], string> = {
  home_hero: "بنر بالای صفحهٔ اول (دسکتاپ)",
  home_grid: "بنر وسط صفحهٔ اول (دسکتاپ)",
  home_strip: "نوار تبلیغاتی صفحهٔ اول",
  home_mobile_top: "بنر بالای صفحه (موبایل)",
  home_mobile_middle: "بنر وسط صفحه (موبایل)",
  products_top: "بالای صفحهٔ محصولات",
};

/**
 * گزینه‌های «محل نمایش» فرم بنر؛ فقط موقعیت‌های همان تب.
 *
 * بنرهای دسکتاپ و موبایل کاملاً جدا هستند: در تب «بنرهای دسکتاپ» هیچ گزینه یا
 * نشانی از بنرهای موبایل دیده نمی‌شود و برعکس. بنر موبایل فقط در همان دو
 * بخش موبایل ثبت می‌شود و بنر دسکتاپ فقط در دو بخش دسکتاپ.
 */
function positionOptionsForTab(tab: BannerTab): [Banner["position"], string][] {
  return POSITIONS_BY_TAB[tab].map((position) => [
    position,
    positionLabels[position],
  ]);
}

/**
 * موقعیت‌هایی که هم در دسکتاپ و هم در موبایل دیده می‌شوند (نوار تبلیغاتی و
 * بالای صفحهٔ محصولات)؛ فقط برای این‌ها فیلد «تصویر موبایل» نمایش داده می‌شود.
 * بنرهای بالای/وسط صفحهٔ اول هر نما بنر مستقل و تک‌تصویری‌اند.
 */
const POSITIONS_WITH_MOBILE_IMAGE: Banner["position"][] = [
  "home_strip",
  "products_top",
];

/**
 * ابعاد پیشنهادی تصویر بنر.
 * بنرها با تنظیم «بدون برش و بدون بزرگنمایی» و نسبت تصویر خودشان نمایش داده
 * می‌شوند؛ پس هر یک از این نسبت‌ها بدون بریدگی می‌نشیند.
 */
const BANNER_SIZE_HINTS = [
  { label: "دسکتاپ عریض", size: "۱۹۲۰ × ۶۵۰" },
  { label: "دسکتاپ بلندتر", size: "۱۹۲۰ × ۷۵۰" },
  { label: "لپ‌تاپ", size: "۱۴۴۰ × ۶۰۰" },
  { label: "موبایل", size: "۷۵۰ × ۱۰۰۰" },
] as const;

/**
 * بخش مدیریت بنرهای فروشگاه.
 *
 * `embedded` برای زمانی است که این صفحه داخل تب «بنرها» از بخش «مدیریت محتوا»
 * نمایش داده می‌شود؛ در آن حالت سربرگ بزرگ صفحه حذف و فقط نوار دکمه‌ها می‌ماند.
 */
function AdminBanners({ embedded = false }: { embedded?: boolean }) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [form, setForm] = useState<BannerForm>(initialForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  // کتابخانهٔ فونت بنرها (بارگذاری/حذف/وضعیت) در یک جا نگه داشته می‌شود تا
  // ویرایشگر متن و پنل فونت همان فهرست را ببینند.
  const {
    fonts,
    loading: fontsLoading,
    error: fontsError,
    createFont,
    deleteFont,
    toggleFont,
  } = useAdminBannerFonts();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [previewBroken, setPreviewBroken] = useState(false);
  const [mobilePreviewBroken, setMobilePreviewBroken] = useState(false);
  const [brokenImages, setBrokenImages] = useState<Record<number, boolean>>({});

  // تنظیمات بخش‌های بنر صفحهٔ اول (هیرو و چندستونه): چیدمان، ابعاد، تعداد
  // تصاویر، عنوان و فعال/غیرفعال.
  const [sections, setSections] = useState<
    Partial<Record<BannerSectionPosition, BannerSection>>
  >({});
  const [sectionLoading, setSectionLoading] = useState(false);
  const [sectionSaving, setSectionSaving] = useState(false);

  // ظاهر پیش‌فرض بنرهای «سایر» (نوار تبلیغاتی و بالای صفحهٔ محصولات)؛ هر بخش
  // صفحهٔ اول گردی گوشهٔ مستقل خودش را دارد.
  const [bannerRadius, setBannerRadius] = useState<number>(
    DEFAULT_BANNER_RADIUS,
  );
  const [appearanceSaving, setAppearanceSaving] = useState(false);

  /** تبی که کاربر می‌بیند: بنرهای دسکتاپ، بنرهای موبایل یا سایر بنرها. */
  const [activeTab, setActiveTab] = useState<BannerTab>("desktop");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mobileImageInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLElement>(null);

  const loadBanners = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await adminApi.get("/admin/banners");
      const result = response.data?.data;

      if (!Array.isArray(result)) {
        throw new Error("ساختار پاسخ بنرها معتبر نیست.");
      }

      setBanners(result);
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * تنظیمات بخش‌های بنر صفحهٔ اول را می‌خواند (چیدمان + ابعاد + تعداد تصاویر +
   * عنوان + فعال/غیرفعال + تعداد بنرهای ثبت‌شده در هر بخش).
   */
  const loadSections = useCallback(async () => {
    setSectionLoading(true);

    try {
      const response = await adminApi.get("/admin/banner-sections");
      const result = response.data?.data;
      // ظاهر مشترک بنرها (گردی گوشه) در همان پاسخ و زیر کلید appearance است.
      setBannerRadius(
        normalizeBannerRadius(response.data?.appearance?.radius),
      );

      if (!Array.isArray(result)) {
        setSections({});
        return;
      }

      const next: Partial<Record<BannerSectionPosition, BannerSection>> = {};

      BANNER_SECTION_CARDS.forEach(({ position }) => {
        const raw = result.find(
          (item: { position?: string }) => item?.position === position,
        );

        if (!raw) return;

        const layout = normalizeBannerSectionLayout(raw.layout);

        next[position] = {
          position,
          layout,
          slots: bannerSectionSlots(layout),
          title: typeof raw.title === "string" ? raw.title : "",
          subtitle: typeof raw.subtitle === "string" ? raw.subtitle : "",
          image_count: Number(raw.image_count ?? 0) || 0,
          height_desktop: Number(raw.height_desktop ?? 0) || 0,
          height_mobile: Number(raw.height_mobile ?? 0) || 0,
          fit: normalizeBannerSectionFit(raw.fit),
          radius: normalizeBannerRadius(raw.radius),
          animation: normalizeBannerSectionAnimation(raw.animation),
          radius_default: normalizeBannerRadius(
            raw.radius_default ?? response.data?.appearance?.radius,
          ),
          is_active: raw.is_active !== false,
          banners_count: Number(raw.banners_count ?? 0),
        };
      });

      setSections(next);
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setSectionLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadBanners(), loadSections()]);
  }, [loadBanners, loadSections]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    setBrokenImages({});
  }, [banners]);

  useEffect(() => {
    setPreviewBroken(false);
  }, [form.image]);

  useEffect(() => {
    setMobilePreviewBroken(false);
  }, [form.mobile_image]);

  function updateField<K extends keyof BannerForm>(
    field: K,
    value: BannerForm[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function scrollToForm() {
    window.setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
    setFormOpen(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (mobileImageInputRef.current) {
      mobileImageInputRef.current.value = "";
    }
  }

  /**
   * تغییر تب فعال.
   *
   * اگر فرم باز باشد و «محل نمایش» انتخاب‌شده در تب جدید نباشد، فرم روی بخش
   * پیش‌فرض همان تب تنظیم می‌شود؛ بنابراین بنر موبایل در تب دسکتاپ (و برعکس)
   * ثبت نمی‌شود.
   */
  function switchTab(tab: BannerTab) {
    setActiveTab(tab);

    if (formOpen && !POSITIONS_BY_TAB[tab].includes(form.position)) {
      updateField("position", DEFAULT_POSITION_BY_TAB[tab]);
    }
  }

  /**
   * باز کردن فرم ایجاد بنر. با `position` می‌توان فرم را از پیش روی بخش
   * موردنظر (مثلاً بخش چندستونهٔ صفحهٔ اول) تنظیم کرد.
   */
  function openCreateForm(position: Banner["position"] = "home_hero") {
    setError("");
    setSuccess("");
    setForm({ ...initialForm, position });
    setEditingId(null);
    setFormOpen(true);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (mobileImageInputRef.current) {
      mobileImageInputRef.current.value = "";
    }

    scrollToForm();
  }

  function startEditing(banner: Banner) {
    setError("");
    setSuccess("");
    setEditingId(banner.id);
    setForm({
      title: banner.title ?? "",
      subtitle: banner.subtitle ?? "",
      image: banner.image ?? "",
      mobile_image: banner.mobile_image ?? "",
      image_alt: banner.image_alt ?? "",
      text_scrim:
        banner.text_scrim === "light" ||
        banner.text_scrim === "medium" ||
        banner.text_scrim === "dark"
          ? banner.text_scrim
          : "none",
      text_layers: sanitizeBannerTextLayers(banner.text_layers),
      link: banner.link ?? "",
      button_label: banner.button_label ?? "",
      position: banner.position ?? "home_hero",
      sort_order: String(banner.sort_order ?? 0),
      is_active: Boolean(banner.is_active),
      starts_at: toDateTimeInput(banner.starts_at),
      ends_at: toDateTimeInput(banner.ends_at),
    });
    setFormOpen(true);

    scrollToForm();
  }

  /**
   * بارگذاری تصویر بنر. `field` مشخص می‌کند مسیر برگشتی در فیلد تصویر اصلی
   * (دسکتاپ) یا تصویر موبایل قرار بگیرد.
   */
  async function handleImageUpload(
    event: ChangeEvent<HTMLInputElement>,
    field: "image" | "mobile_image" = "image",
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await adminApi.post("/admin/banners/image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const path = response.data?.data?.path;

      if (typeof path !== "string" || path === "") {
        throw new Error("بارگذاری تصویر بنر انجام نشد.");
      }

      updateField(field, path);
      setSuccess(
        field === "mobile_image"
          ? "تصویر موبایل بنر بارگذاری شد."
          : "تصویر بنر بارگذاری شد.",
      );
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      if (mobileImageInputRef.current) {
        mobileImageInputRef.current.value = "";
      }
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving || uploading) return;

    if (!form.image.trim()) {
      setError("نشانی تصویر بنر الزامی است.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        title: form.title.trim() || null,
        subtitle: form.subtitle.trim() || null,
        image: form.image.trim(),
        // تصویر موبایل فقط برای نوار تبلیغاتی و بنر بالای صفحهٔ محصولات؛
        // بنرهای بالای/وسط صفحهٔ اول هر نما بنر مستقل و تک‌تصویری‌اند.
        mobile_image: showMobileImageField
          ? form.mobile_image.trim() || null
          : null,
        image_alt: form.image_alt.trim() || null,
        text_scrim: form.text_scrim,
        // لایه‌های بدون متن را نمی‌فرستیم تا بک‌اند آن‌ها را دور بریزد.
        text_layers: form.text_layers
          .filter((layer) => layer.text.trim().length > 0)
          .map((layer) => ({ ...layer, text: layer.text.trim() })),
        link: form.link.trim() || null,
        button_label: form.button_label.trim() || null,
        position: form.position,
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
      };

      if (editingId === null) {
        const response = await adminApi.post("/admin/banners", payload);
        setSuccess(response.data?.message ?? "بنر ایجاد شد.");
      } else {
        const response = await adminApi.put(
          `/admin/banners/${editingId}`,
          payload,
        );
        setSuccess(response.data?.message ?? "بنر ویرایش شد.");
      }

      resetForm();
      await refreshAll();
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  /** تغییر چیدمان یک بخش (با دکمهٔ «ذخیرهٔ تنظیمات بخش» ذخیره می‌شود). */
  function selectSectionLayout(
    position: BannerSectionPosition,
    layout: BannerSectionLayout,
  ) {
    setSections((current) => {
      const section = current[position];

      if (!section) return current;

      return {
        ...current,
        [position]: { ...section, layout, slots: bannerSectionSlots(layout) },
      };
    });
  }

  function updateSectionField<K extends keyof AdminBannerSection>(
    position: BannerSectionPosition,
    field: K,
    value: AdminBannerSection[K],
  ) {
    setSections((current) => {
      const section = current[position];

      if (!section) return current;

      return { ...current, [position]: { ...section, [field]: value } };
    });
  }

  /**
   * ذخیرهٔ تنظیمات یک بخش بنر (چیدمان، ابعاد، تعداد تصاویر، عنوان و وضعیت).
   * هر تغییر در این بخش کش بنرهای فروشگاه را هم پاک می‌کند؛ بنابراین تنظیم
   * جدید بلافاصله در صفحهٔ اول دیده می‌شود.
   */
  async function saveSection(position: BannerSectionPosition) {
    const section = sections[position];

    if (!section || sectionSaving) return;

    setSectionSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await adminApi.put(
        `/admin/banner-sections/${position}`,
        {
          layout: section.layout,
          title: section.title.trim() || null,
          subtitle: section.subtitle.trim() || null,
          // صفر یعنی «همه»/«ارتفاع طبیعی»؛ برای همین به null تبدیل می‌شود.
          image_count: section.image_count > 0 ? section.image_count : null,
          height_desktop: section.height_desktop > 0 ? section.height_desktop : null,
          height_mobile: section.height_mobile > 0 ? section.height_mobile : null,
          fit: section.fit,
          radius: normalizeBannerRadius(section.radius),
          animation: section.animation,
          is_active: section.is_active,
        },
      );

      setSuccess(response.data?.message ?? "تنظیمات بخش بنر ذخیره شد.");
      await refreshAll();
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setSectionSaving(false);
    }
  }

  /**
   * ذخیرهٔ ظاهر مشترک بنرها (گردی گوشه).
   * این تنظیم روی همهٔ بنرها اعمال می‌شود و کش بنرهای فروشگاه را پاک می‌کند.
   */
  async function saveAppearance() {
    if (appearanceSaving) return;

    setAppearanceSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await adminApi.put("/admin/banner-appearance", {
        radius: normalizeBannerRadius(bannerRadius),
      });

      setSuccess(response.data?.message ?? "ظاهر بنرها ذخیره شد.");
      setBannerRadius(normalizeBannerRadius(response.data?.data?.radius));
      await refreshAll();
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setAppearanceSaving(false);
    }
  }

  async function toggleStatus(banner: Banner) {
    setActionId(banner.id);
    setError("");
    setSuccess("");

    try {
      await adminApi.patch(`/admin/banners/${banner.id}/status`, {
        is_active: !banner.is_active,
      });

      setSuccess(banner.is_active ? "بنر غیرفعال شد." : "بنر فعال شد.");
      await refreshAll();
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setActionId(null);
    }
  }

  async function deleteBanner(banner: Banner) {
    if (!window.confirm("این بنر حذف شود؟")) {
      return;
    }

    setActionId(banner.id);
    setError("");
    setSuccess("");

    try {
      const response = await adminApi.delete(`/admin/banners/${banner.id}`);

      setSuccess(response.data?.message ?? "بنر حذف شد.");
      await refreshAll();
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setActionId(null);
    }
  }

  const imagePreview = getStorageUrl(form.image);
  const mobileImagePreview = getStorageUrl(form.mobile_image);

  // تصویر موبایل فقط برای بنرهایی است که هم در دسکتاپ و هم در موبایل دیده
  // می‌شوند (نوار تبلیغاتی و بالای صفحهٔ محصولات).
  const showMobileImageField = POSITIONS_WITH_MOBILE_IMAGE.includes(
    form.position,
  );

  // در فرم بنر موبایل فقط یک تصویر لازم است (همان تصویر روی موبایل رندر
  // می‌شود)؛ فرم بنرهای دیگر همان دو فیلد قبلی را دارد.
  const isMobileFormPosition = isMobileBannerPosition(form.position);

  const imageFieldLabel = isMobileFormPosition
    ? "تصویر بنر موبایل *"
    : form.position === "home_hero" || form.position === "home_grid"
      ? "تصویر بنر دسکتاپ *"
      : "تصویر بنر *";

  // بنرهای تب فعال؛ هر تب فقط بنرهای خودش را نشان می‌دهد تا موبایل و دسکتاپ
  // قاطی نشوند.
  const tabBanners = banners.filter((banner) =>
    POSITIONS_BY_TAB[activeTab].includes(banner.position),
  );

  const tabSections = BANNER_SECTION_CARDS.filter(
    (card) => card.tab === activeTab,
  );

  const toolbar = (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 8,
      }}
    >
      <button
        type="button"
        className="admin-btn admin-btn-primary"
        onClick={() => openCreateForm(DEFAULT_POSITION_BY_TAB[activeTab])}
      >
        <span className="inline-flex items-center gap-1.5">
          <Plus size={15} aria-hidden="true" />
          افزودن بنر
        </span>
      </button>

      <button
        type="button"
        className="admin-btn"
        onClick={() => void refreshAll()}
        disabled={loading}
      >
        {loading ? "در حال دریافت..." : "بارگذاری مجدد"}
      </button>
    </div>
  );

  return (
    <div dir="rtl" className="admin-page">
      {!embedded && (
        <header className="admin-page-head">
          <div>
            <span className="admin-page-eyebrow">مدیریت محتوا</span>
            <h1 className="admin-page-title">بنرهای فروشگاه</h1>
            <p className="admin-page-subtitle">
              بنرها در سه تب جدا دسته‌بندی شده‌اند: «بنرهای دسکتاپ» (بالا و وسط
              صفحهٔ اول)، «بنرهای موبایل» (بالا و وسط صفحه، فقط روی گوشی) و «سایر
              بنرها» (نوار تبلیغاتی و بالای صفحهٔ محصولات). هر بخش تعداد، ارتفاع
              و گردی گوشهٔ مستقل خودش را دارد. بنر غیرفعال یا خارج از بازهٔ
              زمانی در سایت دیده نمی‌شود.
            </p>
          </div>

          {toolbar}
        </header>
      )}

      {embedded && <div className="mb-4">{toolbar}</div>}

      {/* تب‌ها: بنرهای دسکتاپ، بنرهای موبایل و سایر بنرها کاملاً جدا هستند. */}
      <div
        role="tablist"
        aria-label="دسته‌بندی بنرها"
        className="mb-4 flex flex-wrap gap-2"
      >
        {(Object.keys(TAB_LABELS) as BannerTab[]).map((tab) => {
          const selected = activeTab === tab;
          const count = banners.filter((banner) =>
            POSITIONS_BY_TAB[tab].includes(banner.position),
          ).length;

          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => switchTab(tab)}
              className={`rounded-xl border-2 px-4 py-2 text-sm font-bold transition ${
                selected
                  ? "border-[#648767] bg-[#f4f8ef] text-[#385e3e]"
                  : "border-[#e3ebdc] bg-white text-[#6b7a67] hover:border-[#a8bea1]"
              }`}
            >
              {TAB_LABELS[tab]}
              <span className="mr-1.5 text-[11px] font-normal opacity-70">
                ({count})
              </span>
            </button>
          );
        })}
      </div>

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

      {formOpen && (
        <section className="admin-card" ref={formRef}>
          <div className="admin-card-head">
            <div>
              <h2 className="admin-card-title">
                {editingId === null ? "افزودن بنر جدید" : "ویرایش بنر"}
              </h2>
              <p className="admin-card-desc">
                تصویر بنر را بارگذاری کنید یا نشانی کامل/مسیر فایل را وارد کنید.
                بنرهای دسکتاپ و موبایل تک‌تصویری و کاملاً جدا هستند؛ فیلد «تصویر
                موبایل» فقط برای نوار تبلیغاتی و بنر بالای صفحهٔ محصولات (تب
                «سایر بنرها») لازم است. بازهٔ نمایش به تاریخ شمسی ثبت می‌شود.
              </p>
            </div>

            <button
              type="button"
              className="admin-btn admin-btn-sm"
              onClick={resetForm}
              disabled={saving}
            >
              بستن فرم
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="admin-form-grid">
              <div className="admin-field">
                <label className="admin-label" htmlFor="banner-title">
                  عنوان
                </label>
                <input
                  id="banner-title"
                  className="admin-input"
                  value={form.title}
                  onChange={(event) => updateField("title", event.target.value)}
                  maxLength={255}
                />
              </div>

              <div className="admin-field">
                <label className="admin-label" htmlFor="banner-subtitle">
                  زیرعنوان
                </label>
                <input
                  id="banner-subtitle"
                  className="admin-input"
                  value={form.subtitle}
                  onChange={(event) =>
                    updateField("subtitle", event.target.value)
                  }
                  maxLength={255}
                />
              </div>

              <div className="admin-field admin-full">
                <label className="admin-label" htmlFor="banner-image">
                  {imageFieldLabel}
                </label>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="flex h-24 w-40 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#dfe7d8] bg-[#f8faf5]">
                    {imagePreview && !previewBroken ? (
                      <img
                        src={imagePreview}
                        alt="پیش‌نمایش تصویر بنر"
                        className="h-full w-full object-cover"
                        onError={() => setPreviewBroken(true)}
                      />
                    ) : (
                      <span className="inline-flex flex-col items-center gap-1 text-[11px] text-[#9aa894]">
                        <ImagePlus size={20} aria-hidden="true" />
                        {imagePreview ? "تصویر پیدا نشد" : "بدون تصویر"}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        ref={fileInputRef}
                        id="banner-image-file"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(event) => void handleImageUpload(event)}
                        className="hidden"
                      />

                      <button
                        type="button"
                        className="admin-btn admin-btn-sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading || saving}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          {uploading ? (
                            <Loader2
                              size={14}
                              className="animate-spin"
                              aria-hidden="true"
                            />
                          ) : (
                            <Upload size={14} aria-hidden="true" />
                          )}
                          {uploading
                            ? "در حال بارگذاری..."
                            : "بارگذاری تصویر بنر"}
                        </span>
                      </button>

                      {form.image && (
                        <button
                          type="button"
                          className="admin-btn admin-btn-sm admin-btn-danger"
                          onClick={() => updateField("image", "")}
                          disabled={uploading || saving}
                        >
                          حذف تصویر
                        </button>
                      )}
                    </div>

                    <input
                      id="banner-image"
                      className="admin-input"
                      value={form.image}
                      onChange={(event) =>
                        updateField("image", event.target.value)
                      }
                      dir="ltr"
                      maxLength={2048}
                      required
                      placeholder="banners/banner.jpg"
                    />

                    {previewBroken && imagePreview && (
                      <p
                        className="text-[11px] leading-6 text-[#b91c1c]"
                        dir="rtl"
                      >
                        تصویر از نشانی{" "}
                        <span dir="ltr">{imagePreview}</span> بارگذاری نشد؛ اگر
                        تازه فایل را آپلود کرده‌اید یک‌بار دستور{" "}
                        <span dir="ltr">php artisan storage:link</span> را در
                        پوشهٔ backend اجرا کنید.
                      </p>
                    )}

                    <p className="text-[11px] leading-6 text-[#9aa894]">
                      مسیر فایل بارگذاری‌شده (مثل{" "}
                      <span dir="ltr">banners/banner.jpg</span>) یا آدرس کامل
                      تصویر را می‌توانید وارد کنید. حداکثر ۵ مگابایت با فرمت
                      JPG، PNG یا WebP.
                    </p>

                    <div className="rounded-xl border border-[#e6ecdf] bg-[#f8faf5] p-3">
                      <p className="text-[11px] font-bold leading-6 text-[#4b5f4a]">
                        بنر اسلایدر اصلی در تمام عرض صفحه و با نسبت تصویر خودش
                        (بدون برش) نمایش داده می‌شود؛ ابعاد پیشنهادی:
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {BANNER_SIZE_HINTS.map((item) => (
                          <span
                            key={item.label}
                            className="inline-flex items-center gap-1 rounded-full border border-[#dfe7d8] bg-white px-2.5 py-1 text-[11px] text-[#4b5f4a]"
                          >
                            {item.label}:
                            <span dir="ltr" className="font-bold">
                              {item.size}
                            </span>
                          </span>
                        ))}
                      </div>

                      <p className="mt-2 text-[11px] leading-6 text-[#9aa894]">
                        «نوار تبلیغاتی» تصویر را با همان نسبت خودش و بدون برش
                        نشان می‌دهد؛ برای هماهنگی کارت‌ها تصویرهای هم‌ارتفاع
                        بگذارید.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {showMobileImageField && (
                <div className="admin-field admin-full">
                  <label className="admin-label" htmlFor="banner-mobile-image">
                    تصویر موبایل (اختیاری)
                  </label>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="flex h-24 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#dfe7d8] bg-[#f8faf5]">
                    {mobileImagePreview && !mobilePreviewBroken ? (
                      <img
                        src={mobileImagePreview}
                        alt="پیش‌نمایش تصویر موبایل بنر"
                        className="h-full w-full object-cover"
                        onError={() => setMobilePreviewBroken(true)}
                      />
                    ) : (
                      <span className="inline-flex flex-col items-center gap-1 text-[11px] text-[#9aa894]">
                        <ImagePlus size={20} aria-hidden="true" />
                        {mobileImagePreview ? "تصویر پیدا نشد" : "بدون تصویر"}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        ref={mobileImageInputRef}
                        id="banner-mobile-image-file"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(event) =>
                          void handleImageUpload(event, "mobile_image")
                        }
                        className="hidden"
                      />

                      <button
                        type="button"
                        className="admin-btn admin-btn-sm"
                        onClick={() => mobileImageInputRef.current?.click()}
                        disabled={uploading || saving}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          {uploading ? (
                            <Loader2
                              size={14}
                              className="animate-spin"
                              aria-hidden="true"
                            />
                          ) : (
                            <Upload size={14} aria-hidden="true" />
                          )}
                          {uploading
                            ? "در حال بارگذاری..."
                            : "بارگذاری تصویر موبایل"}
                        </span>
                      </button>

                      {form.mobile_image && (
                        <button
                          type="button"
                          className="admin-btn admin-btn-sm admin-btn-danger"
                          onClick={() => updateField("mobile_image", "")}
                          disabled={uploading || saving}
                        >
                          حذف تصویر موبایل
                        </button>
                      )}
                    </div>

                    <input
                      id="banner-mobile-image"
                      className="admin-input"
                      value={form.mobile_image}
                      onChange={(event) =>
                        updateField("mobile_image", event.target.value)
                      }
                      dir="ltr"
                      maxLength={2048}
                      placeholder="banners/banner-mobile.jpg"
                    />

                    <p className="text-[11px] leading-6 text-[#9aa894]">
                      این تصویر مستقل از تصویر دسکتاپ است و فقط روی موبایل
                      (عرض کمتر از ۷۶۸ پیکسل) نمایش داده می‌شود. ابعاد پیشنهادی
                      موبایل:{" "}
                      <span dir="ltr" className="font-bold">
                        ۷۵۰ × ۱۰۰۰
                      </span>{" "}
                      و در نوار تبلیغاتی و بنر بالای صفحهٔ محصولات استفاده
                      می‌شود.
                    </p>

                    {!form.mobile_image.trim() && (
                      <p className="rounded-lg border border-[#f0d9a8] bg-[#fff9ec] px-3 py-2 text-[11px] leading-6 text-[#8a5a00]">
                        ⚠️ تصویر موبایل ثبت نشده است؛ این بنر روی گوشی نمایش
                        داده نمی‌شود (تصویر دسکتاپ جای آن نمی‌نشیند).
                      </p>
                    )}
                  </div>
                </div>
                </div>
              )}

              <div className="admin-field">
                <label className="admin-label" htmlFor="banner-position">
                  محل نمایش
                </label>
                <select
                  id="banner-position"
                  className="admin-select"
                  value={form.position}
                  onChange={(event) =>
                    updateField(
                      "position",
                      event.target.value as Banner["position"],
                    )
                  }
                >
                  {positionOptionsForTab(activeTab).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>

                <p className="text-[11px] leading-6 text-[#9aa894]">
                  {activeTab === "desktop"
                    ? "این بنر فقط در دسکتاپ دیده می‌شود؛ بنرهای موبایل در تب «بنرهای موبایل» ثبت می‌شوند. «بنر بالای صفحه» تصویر بزرگ بالای صفحهٔ اول است و با ثبت بیش از یک بنر فعال، اسلایدر خودکار فعال می‌شود."
                    : activeTab === "mobile"
                      ? "این بنر فقط روی موبایل (عرض کمتر از ۷۶۸ پیکسل) دیده می‌شود و با بنرهای دسکتاپ اشتراکی ندارد."
                      : "نوار تبلیغاتی زیر بنر بالای صفحه و بنر بالای فهرست محصولات؛ برای این دو بخش می‌توانید تصویر موبایل جداگانه هم ثبت کنید."}
                </p>
              </div>

              <div className="admin-field">
                <label className="admin-label" htmlFor="banner-link">
                  لینک مقصد
                </label>
                <input
                  id="banner-link"
                  className="admin-input"
                  value={form.link}
                  onChange={(event) => updateField("link", event.target.value)}
                  dir="ltr"
                  maxLength={2048}
                  placeholder="/products?category=..."
                />
              </div>

              <div className="admin-field">
                <label className="admin-label" htmlFor="banner-button">
                  متن دکمه
                </label>
                <input
                  id="banner-button"
                  className="admin-input"
                  value={form.button_label}
                  onChange={(event) =>
                    updateField("button_label", event.target.value)
                  }
                  maxLength={60}
                  placeholder="مشاهدهٔ محصولات"
                />
              </div>

              <div className="admin-field">
                <label className="admin-label" htmlFor="banner-sort">
                  ترتیب نمایش
                </label>
                <input
                  id="banner-sort"
                  type="number"
                  min={0}
                  className="admin-input"
                  value={form.sort_order}
                  onChange={(event) =>
                    updateField("sort_order", event.target.value)
                  }
                  dir="ltr"
                />
              </div>

              <div className="admin-field">
                <label className="admin-label" htmlFor="banner-start">
                  شروع نمایش (شمسی)
                </label>
                <JalaliDatePicker
                  id="banner-start"
                  value={form.starts_at}
                  onChange={(value) => updateField("starts_at", value)}
                />
                <span className="admin-help">
                  خالی بماند، از ابتدا نمایش داده می‌شود.
                </span>
              </div>

              <div className="admin-field">
                <label className="admin-label" htmlFor="banner-end">
                  پایان نمایش (شمسی)
                </label>
                <JalaliDatePicker
                  id="banner-end"
                  value={form.ends_at}
                  onChange={(value) => updateField("ends_at", value)}
                  defaultHour={23}
                  defaultMinute={59}
                />
                <span className="admin-help">خالی بماند، بدون پایان است.</span>
              </div>

              <label
                className="admin-checkbox admin-full"
                htmlFor="banner-active"
              >
                <input
                  id="banner-active"
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) =>
                    updateField("is_active", event.target.checked)
                  }
                />
                بنر فعال باشد
              </label>
            </div>

            <AdminBannerTextEditor
              imagePath={form.image}
              mobileImagePath={form.mobile_image}
              layers={form.text_layers}
              scrim={form.text_scrim}
              imageAlt={form.image_alt}
              fonts={fonts}
              disabled={saving}
              onLayersChange={(layers) => updateField("text_layers", layers)}
              onScrimChange={(scrim) => updateField("text_scrim", scrim)}
              onImageAltChange={(alt) => updateField("image_alt", alt)}
            />

            <div className="admin-actions">
              <button
                type="submit"
                className="admin-btn admin-btn-primary"
                disabled={saving || uploading}
              >
                {saving
                  ? "در حال ذخیره..."
                  : editingId === null
                    ? "ایجاد بنر"
                    : "ذخیرهٔ تغییرات"}
              </button>

              <button
                type="button"
                className="admin-btn"
                onClick={resetForm}
                disabled={saving}
              >
                انصراف
              </button>
            </div>
          </form>
        </section>
      )}

      {/*
        تنظیمات بنرها بر اساس تب فعال:
        - دسکتاپ/موبایل: کارت تنظیمات هر بخش (بالا و وسط) با تعداد یا چیدمان،
          ارتفاع و گردی گوشهٔ همان بخش
        - سایر بنرها: گردی گوشهٔ پیش‌فرض نوار تبلیغاتی و بنر محصولات
      */}
      {activeTab === "other" ? (
        <section className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2 className="admin-card-title">
                گردی گوشهٔ نوار تبلیغاتی و بنر محصولات
              </h2>
              <p className="admin-card-desc">
                این مقدار پیش‌فرض بنرهای این تب است (و پیش‌فرض بخش‌هایی که گردی
                اختصاصی ندارند). صفر یعنی گوشهٔ تیز. بنرهای بالای صفحه و وسط
                صفحهٔ اول گردی گوشهٔ مستقل خودشان را در تب‌های «دسکتاپ» و
                «موبایل» دارند.
              </p>
            </div>
          </div>

          <div className="admin-form-grid">
            <div className="admin-field">
              <label className="admin-label" htmlFor="banner-radius">
                گردی گوشه (پیکسل)
              </label>
              <input
                id="banner-radius"
                type="number"
                min={0}
                max={MAX_BANNER_RADIUS}
                step={1}
                className="admin-input"
                value={bannerRadius}
                onChange={(event) =>
                  setBannerRadius(normalizeBannerRadius(event.target.value))
                }
                disabled={appearanceSaving}
              />

              <div className="mt-2 flex flex-wrap gap-1.5">
                {BANNER_RADIUS_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`admin-btn admin-btn-sm ${
                      bannerRadius === preset ? "admin-btn-primary" : ""
                    }`}
                    onClick={() => setBannerRadius(preset)}
                    disabled={appearanceSaving}
                  >
                    {preset === 0 ? "بدون گردی" : `${preset}px`}
                  </button>
                ))}
              </div>
            </div>

            <div className="admin-field">
              <span className="admin-label">پیش‌نمایش کادر بنر</span>

              <div className="flex items-center gap-3">
                <span
                  className="inline-block h-16 w-28 border border-[#c9d8c2] bg-gradient-to-t from-[#648767] to-[#a8bea1]"
                  style={{ borderRadius: `${bannerRadius}px` }}
                  aria-hidden="true"
                />
                <span className="text-xs font-bold text-[#3f5140]">
                  {bannerRadius}px
                </span>
              </div>
            </div>
          </div>

          <div className="admin-actions">
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={() => void saveAppearance()}
              disabled={appearanceSaving}
            >
              {appearanceSaving ? "در حال ذخیره..." : "ذخیرهٔ گردی گوشه"}
            </button>
          </div>
        </section>
      ) : (
        tabSections.map((card) => (
          <AdminBannerSectionCard
            key={card.position}
            kind={card.kind}
            title={card.title}
            description={card.description}
            addLabel={card.addLabel}
            section={sections[card.position] ?? null}
            loading={sectionLoading}
            saving={sectionSaving}
            onChange={(field, value) =>
              updateSectionField(card.position, field, value)
            }
            onLayout={(layout) => selectSectionLayout(card.position, layout)}
            onSave={() => void saveSection(card.position)}
            onAdd={() => openCreateForm(card.position)}
          />
        ))
      )}

      <AdminBannerFontsPanel
        fonts={fonts}
        loading={fontsLoading}
        error={fontsError}
        disabled={saving}
        onCreate={createFont}
        onToggle={toggleFont}
        onDelete={deleteFont}
      />

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2 className="admin-card-title">
              فهرست بنرها — {TAB_LABELS[activeTab]}
            </h2>
            <p className="admin-card-desc">
              بنرهای فعال به ترتیب «ترتیب نمایش» در سایت قرار می‌گیرند؛ در
              اسلایدر همین ترتیب، ترتیب اسلایدها است. برای دیدن بنرهای بخش‌های
              دیگر، تب بالا را عوض کنید.
            </p>
          </div>

          <button
            type="button"
            className="admin-btn admin-btn-sm"
            onClick={() => openCreateForm(DEFAULT_POSITION_BY_TAB[activeTab])}
          >
            <span className="inline-flex items-center gap-1.5">
              <Plus size={14} aria-hidden="true" />
              افزودن بنر
            </span>
          </button>
        </div>

        {loading ? (
          <p className="admin-empty">در حال دریافت بنرها...</p>
        ) : tabBanners.length === 0 ? (
          <p className="admin-empty">در این بخش هنوز بنری ثبت نشده است.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>تصویر</th>
                  <th>عنوان</th>
                  <th>محل نمایش</th>
                  <th>بازهٔ نمایش</th>
                  <th>ترتیب</th>
                  <th>وضعیت</th>
                  <th>عملیات</th>
                </tr>
              </thead>

              <tbody>
                {tabBanners.map((banner) => {
                  const busy = actionId === banner.id;
                  const imageUrl = getStorageUrl(banner.image);

                  return (
                    <tr key={banner.id}>
                      <td>
                        {imageUrl && !brokenImages[banner.id] ? (
                          <a
                            href={imageUrl}
                            target="_blank"
                            rel="noreferrer"
                            title="مشاهدهٔ تصویر"
                          >
                            <img
                              src={imageUrl}
                              alt={banner.title ?? "بنر"}
                              loading="lazy"
                              onError={() =>
                                setBrokenImages((current) => ({
                                  ...current,
                                  [banner.id]: true,
                                }))
                              }
                              style={{
                                width: 84,
                                height: 46,
                                objectFit: "cover",
                                borderRadius: 8,
                                border: "1px solid #e5e7eb",
                                background: "#f8faf5",
                              }}
                            />
                          </a>
                        ) : (
                          <span
                            style={{
                              display: "inline-flex",
                              flexDirection: "column",
                              gap: 2,
                              fontSize: 11,
                              color: banner.image ? "#b91c1c" : "#9ca3af",
                            }}
                          >
                            {banner.image ? "تصویر یافت نشد" : "—"}
                            {banner.image && (
                              <span dir="ltr" style={{ color: "#9ca3af" }}>
                                {banner.image}
                              </span>
                            )}
                          </span>
                        )}

                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 10,
                            fontWeight: 700,
                            color: banner.mobile_image ? "#3f6b45" : "#9ca3af",
                          }}
                        >
                          {banner.mobile_image ? "موبایل ✓" : "موبایل: —"}
                        </div>
                      </td>
                      <td>
                        {banner.title || "—"}
                        {banner.subtitle && (
                          <div style={{ fontSize: 11, color: "#9ca3af" }}>
                            {banner.subtitle}
                          </div>
                        )}
                      </td>
                      <td>{positionLabels[banner.position] ?? "—"}</td>
                      <td style={{ fontSize: 12 }}>
                        {banner.starts_at || banner.ends_at
                          ? `${formatAdminDate(
                              banner.starts_at,
                              true,
                            )} تا ${formatAdminDate(banner.ends_at, true)}`
                          : "همیشگی"}
                      </td>
                      <td>{banner.sort_order}</td>
                      <td>
                        <span
                          className={`admin-badge ${
                            banner.is_active
                              ? "admin-badge-green"
                              : "admin-badge-red"
                          }`}
                        >
                          {banner.is_active ? "فعال" : "غیرفعال"}
                        </span>
                      </td>
                      <td>
                        <div className="admin-row-actions">
                          <button
                            type="button"
                            className="admin-btn admin-btn-sm"
                            onClick={() => startEditing(banner)}
                            disabled={busy || saving}
                          >
                            ویرایش
                          </button>

                          <button
                            type="button"
                            className="admin-btn admin-btn-sm"
                            onClick={() => void toggleStatus(banner)}
                            disabled={busy || saving}
                          >
                            {busy
                              ? "..."
                              : banner.is_active
                                ? "غیرفعال‌سازی"
                                : "فعال‌سازی"}
                          </button>

                          <button
                            type="button"
                            className="admin-btn admin-btn-sm admin-btn-danger"
                            onClick={() => void deleteBanner(banner)}
                            disabled={busy || saving}
                          >
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminBanners;
