import { STORAGE_KEYS } from "./storageKeys";

/**
 * چیدمان قابل شخصی‌سازی منوی سایدبار پنل مدیریت.
 *
 * مدیر فروشگاه می‌تواند آیتم‌های منو را جابه‌جا کند (حتی بین گروه‌ها) و
 * آیتم‌های پرکاربرد را «پین» کند تا در بخش «دسترسی سریع» بالای منو بیایند.
 * چیدمان برای هر مدیر جداگانه در localStorage ذخیره می‌شود و آیتم‌هایی که
 * در آینده به منو اضافه شوند به‌صورت خودکار در گروه پیش‌فرض خود ظاهر می‌شوند.
 */

export const ADMIN_SIDEBAR_GROUP_IDS = [
  "general",
  "store",
  "orders",
  "reports",
] as const;

export type AdminSidebarGroupId = (typeof ADMIN_SIDEBAR_GROUP_IDS)[number];

/** شناسهٔ گروه مجازی «دسترسی سریع» که فقط آیتم‌های پین‌شده را نشان می‌دهد. */
export const ADMIN_SIDEBAR_PINNED_GROUP_ID = "pinned";

export type AdminSidebarContainerId =
  | AdminSidebarGroupId
  | typeof ADMIN_SIDEBAR_PINNED_GROUP_ID;

/** حدود و مقدار پیش‌فرض عرض سایدبار (پیکسل). */
export const ADMIN_SIDEBAR_WIDTH_MIN = 200;
export const ADMIN_SIDEBAR_WIDTH_MAX = 420;
export const ADMIN_SIDEBAR_WIDTH_DEFAULT = 264;

/** اندازهٔ آیتم‌های منو (روی ارتفاع ردیف‌ها و اندازهٔ متن اثر می‌گذارد). */
export type AdminSidebarDensity = "compact" | "normal" | "relaxed";

export const ADMIN_SIDEBAR_DENSITIES: AdminSidebarDensity[] = [
  "compact",
  "normal",
  "relaxed",
];

export const ADMIN_SIDEBAR_DENSITY_LABELS: Record<AdminSidebarDensity, string> = {
  compact: "فشرده",
  normal: "عادی",
  relaxed: "بزرگ",
};

/** عرض سایدبار را در بازهٔ مجاز نگه می‌دارد. */
export function clampAdminSidebarWidth(width: number): number {
  if (!Number.isFinite(width)) {
    return ADMIN_SIDEBAR_WIDTH_DEFAULT;
  }

  return Math.min(
    ADMIN_SIDEBAR_WIDTH_MAX,
    Math.max(ADMIN_SIDEBAR_WIDTH_MIN, Math.round(width)),
  );
}

/** گروه پیش‌فرض هر آیتم منو و ترتیب اولیهٔ نمایش. */
export const ADMIN_SIDEBAR_DEFAULT_GROUPS: Record<
  AdminSidebarGroupId,
  string[]
> = {
  general: ["/admin"],
  store: [
    "/admin/products",
    "/admin/categories",
    "/admin/brands",
    "/admin/content",
    "/admin/announcement-bar",
    "/admin/articles",
    "/admin/reviews",
  ],
  orders: [
    "/admin/orders",
    "/admin/shipping",
    "/admin/returns",
    "/admin/coupons",
    "/admin/customers",
    "/admin/wishlist",
    "/admin/support",
    "/admin/messaging",
  ],
  reports: [
    "/admin/reports",
    "/admin/admins",
    "/admin/settings",
    "/admin/trust-badges",
  ],
};

export type AdminSidebarLayout = {
  version: number;
  /** آیتم‌های پین‌شده به ترتیب نمایش در «دسترسی سریع». */
  pinned: string[];
  /** گروه‌هایی که جمع‌شده (dropdown بسته) هستند. */
  collapsed: AdminSidebarContainerId[];
  /** عرض سایدبار به پیکسل (قابل تغییر با کشیدن لبهٔ سایدبار). */
  width: number;
  /** اندازهٔ آیتم‌های منو. */
  density: AdminSidebarDensity;
  groups: Record<AdminSidebarGroupId, string[]>;
};

function isSidebarContainerId(value: string): value is AdminSidebarContainerId {
  return (
    value === ADMIN_SIDEBAR_PINNED_GROUP_ID ||
    (ADMIN_SIDEBAR_GROUP_IDS as readonly string[]).includes(value)
  );
}

function sidebarStorageKey(adminId?: number | null): string {
  return adminId
    ? `${STORAGE_KEYS.adminSidebar}:${adminId}`
    : STORAGE_KEYS.adminSidebar;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** چیدمان پیش‌فرض منو (بدون پین و با ترتیب اولیه). */
export function createDefaultAdminSidebarLayout(): AdminSidebarLayout {
  return {
    version: 1,
    pinned: [],
    collapsed: [],
    width: ADMIN_SIDEBAR_WIDTH_DEFAULT,
    density: "normal",
    groups: {
      general: [...ADMIN_SIDEBAR_DEFAULT_GROUPS.general],
      store: [...ADMIN_SIDEBAR_DEFAULT_GROUPS.store],
      orders: [...ADMIN_SIDEBAR_DEFAULT_GROUPS.orders],
      reports: [...ADMIN_SIDEBAR_DEFAULT_GROUPS.reports],
    },
  };
}

/**
 * گروه پیش‌فرض یک آیتم منو؛ برای وقتی که مدیر آن را از «دسترسی سریع» خارج
 * می‌کند و باید به جای اصلی خودش برگردد.
 */
export function defaultSidebarGroupOf(path: string): AdminSidebarGroupId {
  const match = ADMIN_SIDEBAR_GROUP_IDS.find((groupId) =>
    ADMIN_SIDEBAR_DEFAULT_GROUPS[groupId].includes(path),
  );

  return match ?? "general";
}

/**
 * چیدمان ذخیره‌شده را با فهرست فعلی آیتم‌های منو هم‌تراز می‌کند:
 * آیتم‌های نامعتبر/تکراری حذف و آیتم‌های جدید در گروه پیش‌فرض اضافه می‌شوند.
 */
export function normalizeAdminSidebarLayout(
  stored: unknown,
  knownPaths: string[],
): AdminSidebarLayout {
  const known = new Set(knownPaths);
  const used = new Set<string>();

  const layout: AdminSidebarLayout = {
    version: 1,
    pinned: [],
    collapsed: [],
    width: ADMIN_SIDEBAR_WIDTH_DEFAULT,
    density: "normal",
    groups: { general: [], store: [], orders: [], reports: [] },
  };

  const storedGroups =
    isRecord(stored) && isRecord(stored.groups) ? stored.groups : null;

  ADMIN_SIDEBAR_GROUP_IDS.forEach((groupId) => {
    const rawPaths = storedGroups ? storedGroups[groupId] : undefined;

    if (!Array.isArray(rawPaths)) {
      return;
    }

    rawPaths.forEach((path) => {
      if (typeof path !== "string" || !known.has(path) || used.has(path)) {
        return;
      }

      used.add(path);
      layout.groups[groupId].push(path);
    });
  });

  /* آیتم‌های تازه اضافه‌شده (یا حذف‌شده از چیدمان ذخیره‌شده) */
  ADMIN_SIDEBAR_GROUP_IDS.forEach((groupId) => {
    ADMIN_SIDEBAR_DEFAULT_GROUPS[groupId].forEach((path) => {
      if (!known.has(path) || used.has(path)) {
        return;
      }

      used.add(path);
      layout.groups[groupId].push(path);
    });
  });

  const rawPinned = isRecord(stored) && Array.isArray(stored.pinned) ? stored.pinned : [];
  const pinnedSeen = new Set<string>();

  rawPinned.forEach((path) => {
    if (typeof path !== "string" || !used.has(path) || pinnedSeen.has(path)) {
      return;
    }

    pinnedSeen.add(path);
    layout.pinned.push(path);
  });

  /* گروه‌های بسته (dropdown) */
  const rawCollapsed =
    isRecord(stored) && Array.isArray(stored.collapsed) ? stored.collapsed : [];
  const collapsedSeen = new Set<string>();

  rawCollapsed.forEach((value) => {
    if (
      typeof value !== "string" ||
      !isSidebarContainerId(value) ||
      collapsedSeen.has(value)
    ) {
      return;
    }

    collapsedSeen.add(value);
    layout.collapsed.push(value);
  });

  /* عرض سایدبار و اندازهٔ آیتم‌های منو */
  const storedWidth = isRecord(stored) ? stored.width : undefined;

  layout.width =
    typeof storedWidth === "number"
      ? clampAdminSidebarWidth(storedWidth)
      : ADMIN_SIDEBAR_WIDTH_DEFAULT;

  const storedDensity = isRecord(stored) ? stored.density : undefined;

  layout.density =
    typeof storedDensity === "string" &&
    (ADMIN_SIDEBAR_DENSITIES as readonly string[]).includes(storedDensity)
      ? (storedDensity as AdminSidebarDensity)
      : "normal";

  return layout;
}

/** خواندن چیدمان منوی مدیر از localStorage (با اعتبارسنجی و ادغام پیش‌فرض). */
export function readAdminSidebarLayout(
  adminId: number | null | undefined,
  knownPaths: string[],
): AdminSidebarLayout {
  if (typeof window === "undefined") {
    return normalizeAdminSidebarLayout(null, knownPaths);
  }

  try {
    const raw = window.localStorage.getItem(sidebarStorageKey(adminId));

    return normalizeAdminSidebarLayout(raw ? JSON.parse(raw) : null, knownPaths);
  } catch (error) {
    console.error("Admin sidebar layout read error:", error);

    return normalizeAdminSidebarLayout(null, knownPaths);
  }
}

/** ذخیرهٔ چیدمان منوی مدیر در localStorage. */
export function saveAdminSidebarLayout(
  adminId: number | null | undefined,
  layout: AdminSidebarLayout,
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      sidebarStorageKey(adminId),
      JSON.stringify({ ...layout, version: 1 }),
    );
  } catch (error) {
    console.error("Admin sidebar layout save error:", error);
  }
}
