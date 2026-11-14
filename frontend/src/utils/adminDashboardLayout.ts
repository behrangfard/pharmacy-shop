import { STORAGE_KEYS } from "./storageKeys";

/**
 * چیدمان صفحهٔ «نمای کلی» (داشبورد) پنل مدیریت.
 *
 * مدیر می‌تواند بخش‌ها را با ماوس بالا/پایین ببرد، بخش‌های غیرلازم را پنهان
 * کند و هر بخشی را دوباره به صفحه اضافه کند. علاوه بر بخش‌های آماده، هر بخش
 * از منوی پنل را می‌توان کشید و روی داشبورد رها کرد تا به‌صورت «میان‌بر»
 * (بلوک سفارشی custom:) به نمای کلی اضافه شود. چیدمان برای هر مدیر جداگانه
 * در localStorage ذخیره می‌شود.
 */

export const DASHBOARD_BLOCK_IDS = [
  "welcome",
  "quick-links",
  "stats",
  "sales-trend",
  "sales-channels",
  "order-status",
  "payment-status",
  "store-health",
  "support-shortcuts",
] as const;

export type DashboardStaticBlockId = (typeof DASHBOARD_BLOCK_IDS)[number];

/** شناسهٔ بلوک‌های میان‌بر که مدیر از منوی پنل به داشبورد اضافه می‌کند. */
export type DashboardCustomBlockId = `custom:${string}`;

export type DashboardBlockId = DashboardStaticBlockId | DashboardCustomBlockId;

/** نوع داده‌ای که هنگام کشیدن یک ردیف منو به سمت داشبورد منتقل می‌شود. */
export const DASHBOARD_SHORTCUT_MIME = "application/x-admin-dashboard-shortcut";

export type AdminDashboardShortcutPayload = {
  path: string;
  label: string;
};

export type DashboardBlockMeta = {
  label: string;
  description: string;
  /** عرض بلوک در شبکهٔ دوستونی داشبورد؛ full یعنی تمام‌عرض. */
  span: "full" | "half";
};

/** عنوان و توضیح هر بخش؛ همین فهرست در منوی «افزودن بخش» استفاده می‌شود. */
export const DASHBOARD_BLOCK_META: Record<
  DashboardStaticBlockId,
  DashboardBlockMeta
> = {
  welcome: {
    label: "خلاصه هفتگی فروش",
    description: "کارت خوشامد و مقایسهٔ فروش این هفته با هفتهٔ قبل",
    span: "full",
  },
  "quick-links": {
    label: "دسترسی سریع",
    description: "میان‌برهای بخش‌های پرکاربرد پنل",
    span: "full",
  },
  stats: {
    label: "آمار کلی فروشگاه",
    description: "تعداد محصولات، کاربران، سفارش‌ها و مجموع فروش",
    span: "full",
  },
  "sales-trend": {
    label: "روند فروش",
    description: "نمودار تعاملی فروش در بازه‌های ۷ روز، ۳۰ روز و ۱۲ ماه",
    span: "full",
  },
  "sales-channels": {
    label: "کانال‌های فروش",
    description: "سهم وب‌سایت، اینستاگرام، تلفن و حضوری از فروش",
    span: "half",
  },
  "order-status": {
    label: "وضعیت سفارش‌ها",
    description: "توزیع سفارش‌ها بر اساس وضعیت فعلی",
    span: "half",
  },
  "payment-status": {
    label: "وضعیت پرداخت‌ها",
    description: "خلاصهٔ سفارش‌های پرداخت‌شده و پرداخت‌نشده",
    span: "half",
  },
  "store-health": {
    label: "سلامت فروشگاه",
    description: "نرخ تکمیل سفارش، نرخ پرداخت و میانگین ارزش سبد",
    span: "half",
  },
  "support-shortcuts": {
    label: "میان‌برهای پشتیبانی",
    description: "لینک سریع به پشتیبانی، پیام‌رسانی، مقالات و تنظیمات",
    span: "half",
  },
};

/**
 * بخش‌هایی که در حالت پیش‌فرض پنهان‌اند؛ با «افزودن بخش» می‌توان آن‌ها را
 * به نمای کلی اضافه کرد تا صفحهٔ اولیه مثل قبل بماند.
 */
export const DASHBOARD_DEFAULT_HIDDEN: DashboardBlockId[] = [
  "sales-channels",
  "store-health",
  "support-shortcuts",
];

/** بلوک میان‌بر که مدیر از منوی پنل به نمای کلی اضافه کرده است. */
export type AdminDashboardCustomBlock = {
  id: DashboardCustomBlockId;
  /** مسیر بخش در پنل؛ مثلاً /admin/content */
  path: string;
  label: string;
  description: string;
};

export type AdminDashboardLayout = {
  version: number;
  /** ترتیب همهٔ بخش‌ها (پنهان و پیدا) از بالا به پایین. */
  order: DashboardBlockId[];
  /** بخش‌هایی که مدیر از نمای کلی حذف کرده است. */
  hidden: DashboardBlockId[];
  /** میان‌برهای سفارشی که مدیر از منوی پنل اضافه کرده است. */
  custom: AdminDashboardCustomBlock[];
};

export const ADMIN_DASHBOARD_LAYOUT_VERSION = 2;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStaticBlockId(value: string): value is DashboardStaticBlockId {
  return (DASHBOARD_BLOCK_IDS as readonly string[]).includes(value);
}

/** آیا این شناسه مربوط به یک بلوک میان‌بر (سفارشی) است؟ */
export function isDashboardCustomBlockId(
  value: string,
): value is DashboardCustomBlockId {
  return value.startsWith("custom:") && value.length > "custom:".length;
}

/** شناسهٔ بلوک میان‌بر برای یک مسیر منو (یکتا و قابل بازسازی). */
export function dashboardShortcutBlockId(path: string): DashboardCustomBlockId {
  return `custom:${path}`;
}

function isDashboardBlockId(value: string): value is DashboardBlockId {
  return isStaticBlockId(value) || isDashboardCustomBlockId(value);
}

function dashboardStorageKey(adminId?: number | null): string {
  return adminId
    ? `${STORAGE_KEYS.adminDashboard}:${adminId}`
    : STORAGE_KEYS.adminDashboard;
}

/** چیدمان پیش‌فرض نمای کلی (ترتیب اولیه و بخش‌های پنهان). */
export function createDefaultAdminDashboardLayout(): AdminDashboardLayout {
  return {
    version: ADMIN_DASHBOARD_LAYOUT_VERSION,
    order: [...DASHBOARD_BLOCK_IDS],
    hidden: [...DASHBOARD_DEFAULT_HIDDEN],
    custom: [],
  };
}

/**
 * عنوان/توضیح/عرض یک بلوک؛ برای بلوک‌های میان‌بر از دادهٔ ذخیره‌شدهٔ همان
 * بلوک استفاده می‌شود.
 */
export function getDashboardBlockMeta(
  blockId: DashboardBlockId,
  layout: AdminDashboardLayout,
): DashboardBlockMeta {
  if (isStaticBlockId(blockId)) {
    return DASHBOARD_BLOCK_META[blockId];
  }

  const custom = layout.custom.find((block) => block.id === blockId);

  return {
    label: custom?.label ?? "میان‌بر",
    description: custom?.description ?? "میان‌بر یکی از بخش‌های پنل",
    span: "half",
  };
}

/** خواندن دادهٔ منتقل‌شده هنگام کشیدن یک ردیف منو به سمت داشبورد. */
export function parseDashboardShortcutPayload(
  raw: string,
): AdminDashboardShortcutPayload | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!isRecord(parsed) || typeof parsed.path !== "string") {
      return null;
    }

    const path = parsed.path.trim();

    if (!path.startsWith("/admin")) {
      return null;
    }

    const label =
      typeof parsed.label === "string" && parsed.label.trim()
        ? parsed.label.trim()
        : path;

    return { path, label };
  } catch {
    return null;
  }
}

/**
 * افزودن یک بخش منو به نمای کلی به‌صورت میان‌بر (اگر از قبل نبود).
 * بلوک جدید در انتهای ترتیب قرار می‌گیرد و پنهان نیست.
 */
export function addDashboardShortcutBlock(
  layout: AdminDashboardLayout,
  payload: AdminDashboardShortcutPayload,
): AdminDashboardLayout {
  const id = dashboardShortcutBlockId(payload.path);

  if (layout.custom.some((block) => block.id === id)) {
    /* از قبل هست؛ فقط نمایشش را برمی‌گردانیم. */
    return {
      ...layout,
      hidden: layout.hidden.filter((blockId) => blockId !== id),
    };
  }

  return {
    ...layout,
    order: [...layout.order, id],
    custom: [
      ...layout.custom,
      {
        id,
        path: payload.path,
        label: payload.label,
        description: `میان‌بر سریع به «${payload.label}» در پنل مدیریت`,
      },
    ],
  };
}

/** حذف کامل یک بلوک میان‌بر از چیدمان نمای کلی. */
export function removeDashboardBlock(
  layout: AdminDashboardLayout,
  blockId: DashboardBlockId,
): AdminDashboardLayout {
  return {
    ...layout,
    order: layout.order.filter((id) => id !== blockId),
    hidden: layout.hidden.filter((id) => id !== blockId),
    custom: layout.custom.filter((block) => block.id !== blockId),
  };
}

/**
 * چیدمان ذخیره‌شده را با فهرست فعلی بخش‌ها هم‌تراز می‌کند: شناسه‌های
 * ناشناخته/تکراری حذف، بخش‌های جدید به انتهای ترتیب اضافه و میان‌برهای
 * نامعتبر پاک می‌شوند. چیدمان‌های قدیمی (بدون custom) بدون ریست ارتقا
 * پیدا می‌کنند.
 */
export function normalizeAdminDashboardLayout(
  stored: unknown,
): AdminDashboardLayout {
  const layout = createDefaultAdminDashboardLayout();
  const layoutRecord = isRecord(stored) ? stored : null;

  /* میان‌برهای ذخیره‌شده (با اعتبارسنجی مسیر و شناسه) */
  const rawCustom =
    layoutRecord && Array.isArray(layoutRecord.custom)
      ? layoutRecord.custom
      : [];
  const custom: AdminDashboardCustomBlock[] = [];

  rawCustom.forEach((value) => {
    if (!isRecord(value)) {
      return;
    }

    const path = typeof value.path === "string" ? value.path.trim() : "";
    const label = typeof value.label === "string" ? value.label.trim() : "";

    if (!path.startsWith("/admin")) {
      return;
    }

    const id = dashboardShortcutBlockId(path);

    if (custom.some((block) => block.id === id)) {
      return;
    }

    custom.push({
      id,
      path,
      label: label || path,
      description:
        typeof value.description === "string" && value.description.trim()
          ? value.description.trim()
          : `میان‌بر سریع به «${label || path}» در پنل مدیریت`,
    });
  });

  const knownIds = new Set<string>([
    ...DASHBOARD_BLOCK_IDS,
    ...custom.map((block) => block.id),
  ]);

  const rawOrder =
    layoutRecord && Array.isArray(layoutRecord.order) ? layoutRecord.order : [];
  const order: DashboardBlockId[] = [];

  rawOrder.forEach((value) => {
    if (
      typeof value !== "string" ||
      !isDashboardBlockId(value) ||
      !knownIds.has(value) ||
      order.includes(value)
    ) {
      return;
    }

    order.push(value);
  });

  DASHBOARD_BLOCK_IDS.forEach((blockId) => {
    if (!order.includes(blockId)) {
      order.push(blockId);
    }
  });

  custom.forEach((block) => {
    if (!order.includes(block.id)) {
      order.push(block.id);
    }
  });

  layout.order = order;
  layout.custom = custom;

  /*
   * اگر برای اولین بار است که چیدمانی ذخیره می‌شود (hidden وجود ندارد)،
   * بخش‌های پیش‌فرض پنهان حفظ می‌شوند تا ظاهر اولیهٔ داشبورد تغییر نکند.
   */
  if (layoutRecord && Array.isArray(layoutRecord.hidden)) {
    const rawHidden = layoutRecord.hidden;
    const hidden: DashboardBlockId[] = [];

    rawHidden.forEach((value) => {
      if (
        typeof value === "string" &&
        isDashboardBlockId(value) &&
        !hidden.includes(value)
      ) {
        hidden.push(value);
      }
    });

    /* ترتیب پنهان‌ها همیشه مطابق ترتیب بخش‌ها نگه داشته می‌شود. */
    layout.hidden = order.filter((blockId) => hidden.includes(blockId));
  }

  return layout;
}

/** خواندن چیدمان نمای کلی از localStorage (با اعتبارسنجی). */
export function readAdminDashboardLayout(
  adminId?: number | null,
): AdminDashboardLayout {
  if (typeof window === "undefined") {
    return createDefaultAdminDashboardLayout();
  }

  try {
    const raw = window.localStorage.getItem(dashboardStorageKey(adminId));

    return normalizeAdminDashboardLayout(raw ? JSON.parse(raw) : null);
  } catch (error) {
    console.error("Admin dashboard layout read error:", error);

    return createDefaultAdminDashboardLayout();
  }
}

/** ذخیرهٔ چیدمان نمای کلی در localStorage. */
export function saveAdminDashboardLayout(
  adminId: number | null | undefined,
  layout: AdminDashboardLayout,
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      dashboardStorageKey(adminId),
      JSON.stringify({ ...layout, version: ADMIN_DASHBOARD_LAYOUT_VERSION }),
    );
  } catch (error) {
    console.error("Admin dashboard layout save error:", error);
  }
}



