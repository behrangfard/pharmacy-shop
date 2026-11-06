import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type {
  ComponentType,
  CSSProperties,
  DragEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Tags,
  ShoppingCart,
  Store,
  LogOut,
  X,
  ShieldCheck,
  Search,
  Bell,
  ChevronLeft,
  ChevronDown,
  CalendarDays,
  Command,
  Users,
  MessageSquare,
  Megaphone,
  Headset,
  Pencil,
  Settings,
  TicketPercent,
  RotateCcw,
  Image,
  Newspaper,
  TrendingUp,
  BadgeCheck,
  ArrowUp,
  ArrowDown,
  Check,
  GripVertical,
  Pin,
  PinOff,
  SlidersHorizontal,
  Type,
} from "lucide-react";
import { useAdminAuth } from "../context/AdminAuthContext";
import { usePageMeta } from "../hooks/usePageMeta";
import { NO_INDEX_ROBOTS, SITE_NAME } from "../utils/seo";
import {
  ADMIN_PERMISSIONS,
  hasAdminPermission,
} from "../utils/adminPermissions";
import {
  ADMIN_SIDEBAR_DENSITIES,
  ADMIN_SIDEBAR_DENSITY_LABELS,
  ADMIN_SIDEBAR_GROUP_IDS,
  ADMIN_SIDEBAR_PINNED_GROUP_ID,
  ADMIN_SIDEBAR_WIDTH_DEFAULT,
  ADMIN_SIDEBAR_WIDTH_MAX,
  ADMIN_SIDEBAR_WIDTH_MIN,
  clampAdminSidebarWidth,
  defaultSidebarGroupOf,
  normalizeAdminSidebarLayout,
  readAdminSidebarLayout,
  saveAdminSidebarLayout,
  type AdminSidebarContainerId,
  type AdminSidebarGroupId,
  type AdminSidebarLayout,
} from "../utils/adminSidebarLayout";

type AdminSidebarSection = {
  id: AdminSidebarGroupId;
  label: string;
  icon: ComponentType<{ size?: number | string; strokeWidth?: number | string }>;
};

/* گروه‌های اصلی منو با عنوان و آیکن روشن؛ ترتیب و جای آیتم‌ها قابل تغییر است */
const adminSidebarSections: AdminSidebarSection[] = [
  { id: "general", label: "عمومی", icon: LayoutDashboard },
  { id: "store", label: "فروشگاه", icon: Store },
  { id: "orders", label: "سفارشات", icon: ShoppingCart },
  { id: "reports", label: "گزارشات", icon: TrendingUp },
];

function AdminLayout() {
  // همهٔ صفحه‌های پنل از ایندکس موتورهای جست‌وجو خارج می‌شوند.
  usePageMeta({
    title: `پنل مدیریت | ${SITE_NAME}`,
    path: "/admin",
    robots: NO_INDEX_ROBOTS,
  });

  const { user, logout, can, roleLabel } = useAdminAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    {
      to: "/admin",
      permission: ADMIN_PERMISSIONS.dashboard,
      label: "نمای کلی",
      end: true,
      icon: LayoutDashboard,
      keywords: "داشبورد آمار فروش گزارش",
    },
    {
      to: "/admin/products",
      permission: ADMIN_PERMISSIONS.products,
      label: "محصولات",
      icon: Package,
      keywords: "کالا موجودی قیمت افزودن محصول",
    },
    {
      to: "/admin/categories",
      permission: ADMIN_PERMISSIONS.categories,
      label: "دسته‌بندی‌ها",
      icon: Tags,
      keywords: "گروه دسته بندی",
    },
    {
      to: "/admin/brands",
      permission: ADMIN_PERMISSIONS.brands,
      label: "برندها",
      icon: Tags,
      keywords: "برند سازنده لوگو تولیدکننده",
    },
    {
      to: "/admin/orders",
      permission: ADMIN_PERMISSIONS.orders,
      label: "سفارش‌ها",
      icon: ShoppingCart,
      keywords: "خرید پرداخت ارسال سفارش",
    },
    {
      to: "/admin/returns",
      permission: ADMIN_PERMISSIONS.returns,
      label: "مرجوعی‌ها",
      icon: RotateCcw,
      keywords: "مرجوعی بازگشت کالا بازپرداخت شکایت",
    },
    {
      to: "/admin/coupons",
      permission: ADMIN_PERMISSIONS.coupons,
      label: "کدهای تخفیف",
      icon: TicketPercent,
      keywords: "کوپن تخفیف کد درصد مبلغ بازاریابی",
    },
    {
      to: "/admin/banners",
      permission: ADMIN_PERMISSIONS.banners,
      label: "بنرها",
      icon: Image,
      keywords: "بنر اسلایدر تصویر تبلیغات صفحه اول",
    },
    {
      to: "/admin/announcement-bar",
      permission: ADMIN_PERMISSIONS.banners,
      label: "نوار اطلاع‌رسانی",
      icon: Megaphone,
      keywords:
        "نوار اطلاع رسانی تیکر تخفیف تبلیغات بالای هدر متن متحرک تصویر متحرک ویدیو",
    },
    {
      to: "/admin/trust-badges",
      permission: ADMIN_PERMISSIONS.settings,
      label: "نمادها و مجوزها",
      icon: BadgeCheck,
      keywords:
        "اینماد نماد اعتماد مجوز ساماندهی نشان اعتماد الکترونیکی فوتر نمادها",
    },
    {
      to: "/admin/articles",
      permission: ADMIN_PERMISSIONS.articles,
      label: "مقالات",
      icon: Newspaper,
      keywords: "مقاله وبلاگ محتوا پست نوشتن انتشار بلاگ",
    },
    {
      to: "/admin/reviews",
      permission: ADMIN_PERMISSIONS.reviews,
      label: "نظرات محصولات",
      icon: MessageSquare,
      keywords: "نظر دیدگاه امتیاز ستاره بررسی تأیید رد پاسخ مشتری",
    },
    {
      to: "/admin/customers",
      permission: ADMIN_PERMISSIONS.customers,
      label: "مشتریان",
      icon: Users,
      keywords: "مشتری کاربران اعضا سابقه خرید اطلاعات مشتری",
    },
    {
      to: "/admin/support",
      permission: ADMIN_PERMISSIONS.messaging,
      label: "پشتیبانی",
      icon: Headset,
      keywords: "پشتیبانی چت گفتگو صندوق تیکت تلگرام واتساپ بله",
    },
    {
      to: "/admin/messaging",
      permission: ADMIN_PERMISSIONS.messaging,
      label: "پیام‌رسانی",
      icon: Megaphone,
      keywords:
        "پیامک sms تلگرام واتساپ واتس آپ بله ارسال پیام اطلاع رسانی پیام رسان مشتریان",
    },
    {
      to: "/admin/admins",
      permission: ADMIN_PERMISSIONS.admins,
      label: "مدیران",
      icon: ShieldCheck,
      keywords: "مدیر ادمین حساب کاربری رمز عبور افزودن مدیر ویرایش حساب",
    },
    {
      to: "/admin/reports",
      permission: ADMIN_PERMISSIONS.reports,
      label: "گزارش فروش",
      icon: TrendingUp,
      keywords: "گزارش فروش درآمد آمار پرفروش موجودی کم تحلیل",
    },
    {
      to: "/admin/settings",
      permission: ADMIN_PERMISSIONS.settings,
      label: "تنظیمات فروشگاه",
      icon: Settings,
      keywords:
        "تنظیمات هزینه ارسال مالیات تماس شبکه اجتماعی فوتر مرجوعی ارسال رایگان",
    },
  ];

  /* فقط بخش‌هایی که نقش مدیر به آن‌ها دسترسی دارد در منو و جست‌وجو می‌آیند. */
  const visibleNavItems = useMemo(
    () => navItems.filter((item) => hasAdminPermission(user, item.permission)),
    [user],
  );

  /* چیدمان منو: ترتیب گروه‌ها/آیتم‌ها و آیتم‌های پین‌شده (ذخیره‌شده برای هر مدیر) */
  const allNavPaths = useMemo(() => navItems.map((item) => item.to), []);

  const [sidebarLayout, setSidebarLayout] = useState<AdminSidebarLayout>(() =>
    readAdminSidebarLayout(user?.id, allNavPaths),
  );
  const [layoutEditing, setLayoutEditing] = useState(false);
  const [draggingPath, setDraggingPath] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    containerId: AdminSidebarContainerId;
    index: number;
  } | null>(null);

  /* عرض سایدبار در حین کشیدن لبه؛ فقط بعد از رها کردن ذخیره می‌شود */
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const resizeRef = useRef({
    startX: 0,
    startWidth: ADMIN_SIDEBAR_WIDTH_DEFAULT,
  });

  const sidebarWidth = dragWidth ?? sidebarLayout.width;

  useEffect(() => {
    setSidebarLayout(readAdminSidebarLayout(user?.id, allNavPaths));
  }, [user?.id, allNavPaths]);

  const resolveNavItems = (paths: string[]) =>
    paths
      .map((path) => visibleNavItems.find((item) => item.to === path))
      .filter((item): item is (typeof visibleNavItems)[number] => Boolean(item));

  const layoutSections = useMemo(
    () =>
      ADMIN_SIDEBAR_GROUP_IDS.map((groupId) => {
        const meta = adminSidebarSections.find(
          (section) => section.id === groupId,
        );

        return {
          id: groupId,
          label: meta?.label ?? groupId,
          icon: meta?.icon ?? LayoutDashboard,
          items: resolveNavItems(sidebarLayout.groups[groupId]),
        };
      }).filter((section) => section.items.length > 0 || layoutEditing),
    [layoutEditing, sidebarLayout, visibleNavItems],
  );

  const pinnedNavItems = useMemo(
    () => resolveNavItems(sidebarLayout.pinned),
    [sidebarLayout, visibleNavItems],
  );

  const persistSidebarLayout = (next: AdminSidebarLayout) => {
    setSidebarLayout(next);
    saveAdminSidebarLayout(user?.id, next);
  };

  /** شروع کشیدن لبهٔ سایدبار برای تغییر عرض. */
  const handleResizeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeRef.current = {
      startX: event.clientX,
      startWidth: sidebarLayout.width,
    };
    setDragWidth(sidebarLayout.width);
  };

  const handleResizeMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragWidth === null) {
      return;
    }

    /* سایدبار سمت راست است؛ کشیدن لبه به سمت چپ عرض را زیاد می‌کند */
    const { startX, startWidth } = resizeRef.current;

    setDragWidth(clampAdminSidebarWidth(startWidth + (startX - event.clientX)));
  };

  const handleResizeEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragWidth === null) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const { startX, startWidth } = resizeRef.current;
    const width = clampAdminSidebarWidth(startWidth + (startX - event.clientX));

    setDragWidth(null);
    persistSidebarLayout({ ...sidebarLayout, width });
  };

  const resetSidebarWidth = () => {
    setDragWidth(null);
    persistSidebarLayout({
      ...sidebarLayout,
      width: ADMIN_SIDEBAR_WIDTH_DEFAULT,
    });
  };

  /** تغییر اندازهٔ آیتم‌های منو: فشرده → عادی → بزرگ. */
  const cycleSidebarDensity = () => {
    const currentIndex = ADMIN_SIDEBAR_DENSITIES.indexOf(
      sidebarLayout.density,
    );
    const density =
      ADMIN_SIDEBAR_DENSITIES[
        (currentIndex + 1) % ADMIN_SIDEBAR_DENSITIES.length
      ];

    persistSidebarLayout({ ...sidebarLayout, density });
  };

  /** جابه‌جایی یک آیتم به گروه و جای مشخص؛ گروه «pinned» یعنی پین کردن. */
  const moveNavItem = (
    path: string,
    targetContainerId: AdminSidebarContainerId,
    targetIndex: number,
  ) => {
    if (!path) {
      return;
    }

    const groups: Record<AdminSidebarGroupId, string[]> = {
      general: sidebarLayout.groups.general.filter((item) => item !== path),
      store: sidebarLayout.groups.store.filter((item) => item !== path),
      orders: sidebarLayout.groups.orders.filter((item) => item !== path),
      reports: sidebarLayout.groups.reports.filter((item) => item !== path),
    };
    const pinned = sidebarLayout.pinned.filter((item) => item !== path);

    if (targetContainerId === ADMIN_SIDEBAR_PINNED_GROUP_ID) {
      const pinnedIndex = Math.max(0, Math.min(targetIndex, pinned.length));

      persistSidebarLayout({
        ...sidebarLayout,
        groups,
        collapsed: sidebarLayout.collapsed.filter(
          (id) => id !== ADMIN_SIDEBAR_PINNED_GROUP_ID,
        ),
        pinned: [
          ...pinned.slice(0, pinnedIndex),
          path,
          ...pinned.slice(pinnedIndex),
        ],
      });

      return;
    }

    const list = groups[targetContainerId];
    const index = Math.max(0, Math.min(targetIndex, list.length));

    persistSidebarLayout({
      ...sidebarLayout,
      pinned,
      /* گروه مقصد باز می‌شود تا آیتم منتقل‌شده دیده شود */
      collapsed: sidebarLayout.collapsed.filter(
        (id) => id !== targetContainerId,
      ),
      groups: {
        ...groups,
        [targetContainerId]: [
          ...list.slice(0, index),
          path,
          ...list.slice(index),
        ],
      },
    });
  };

  /** پین/آنپین آیتم؛ بعد از آنپین به گروه پیش‌فرض خودش برمی‌گردد. */
  const togglePinNavItem = (path: string) => {
    if (sidebarLayout.pinned.includes(path)) {
      const groupId = defaultSidebarGroupOf(path);

      moveNavItem(path, groupId, sidebarLayout.groups[groupId].length);

      return;
    }

    moveNavItem(
      path,
      ADMIN_SIDEBAR_PINNED_GROUP_ID,
      sidebarLayout.pinned.length,
    );
  };

  /** جابه‌جایی یک پله بالا/پایین در همان گروه (برای موبایل و لمس). */
  const moveNavItemByOffset = (path: string, offset: number) => {
    const pinnedIndex = sidebarLayout.pinned.indexOf(path);

    if (pinnedIndex >= 0) {
      const target = pinnedIndex + offset;

      if (target < 0 || target >= sidebarLayout.pinned.length) {
        return;
      }

      const pinned = [...sidebarLayout.pinned];

      pinned.splice(pinnedIndex, 1);
      pinned.splice(target, 0, path);
      persistSidebarLayout({ ...sidebarLayout, pinned });

      return;
    }

    const groupId = ADMIN_SIDEBAR_GROUP_IDS.find((id) =>
      sidebarLayout.groups[id].includes(path),
    );

    if (!groupId) {
      return;
    }

    const list = [...sidebarLayout.groups[groupId]];
    const from = list.indexOf(path);
    const to = from + offset;

    if (from < 0 || to < 0 || to >= list.length) {
      return;
    }

    list.splice(from, 1);
    list.splice(to, 0, path);
    persistSidebarLayout({
      ...sidebarLayout,
      groups: { ...sidebarLayout.groups, [groupId]: list },
    });
  };

  const resetSidebarLayout = () => {
    persistSidebarLayout(normalizeAdminSidebarLayout(null, allNavPaths));
  };

  /** بستن/باز کردن گروه‌ها (dropdown)؛ وضعیت برای همین مدیر ذخیره می‌شود. */
  const toggleGroupCollapsed = (containerId: AdminSidebarContainerId) => {
    const collapsed = sidebarLayout.collapsed.includes(containerId)
      ? sidebarLayout.collapsed.filter((id) => id !== containerId)
      : [...sidebarLayout.collapsed, containerId];

    persistSidebarLayout({ ...sidebarLayout, collapsed });
  };

  const isGroupCollapsed = (containerId: AdminSidebarContainerId) =>
    sidebarLayout.collapsed.includes(containerId);

  const allGroupsCollapsed = ADMIN_SIDEBAR_GROUP_IDS.every((groupId) =>
    sidebarLayout.collapsed.includes(groupId),
  );

  /** بستن یا باز کردن یک‌جای همهٔ گروه‌ها (منوی خلوت‌تر). */
  const toggleAllGroupsCollapsed = () => {
    const keepPinned: AdminSidebarContainerId[] = sidebarLayout.collapsed.includes(
      ADMIN_SIDEBAR_PINNED_GROUP_ID,
    )
      ? [ADMIN_SIDEBAR_PINNED_GROUP_ID]
      : [];
    const collapsed: AdminSidebarContainerId[] = allGroupsCollapsed
      ? keepPinned
      : [...ADMIN_SIDEBAR_GROUP_IDS, ...keepPinned];

    persistSidebarLayout({ ...sidebarLayout, collapsed });
  };

  /** آیا مسیر فعلی داخل این آیتم است؟ (برای نقطهٔ نشانگر گروه بسته) */
  const isNavItemActive = (item: (typeof visibleNavItems)[number]) =>
    item.end
      ? location.pathname === item.to
      : location.pathname === item.to ||
        location.pathname.startsWith(`${item.to}/`);

  const handleNavDragStart = (event: DragEvent<HTMLElement>, path: string) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", path);
    setDraggingPath(path);
  };

  const handleNavDragOver = (
    event: DragEvent<HTMLElement>,
    containerId: AdminSidebarContainerId,
    index: number,
  ) => {
    if (!draggingPath) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientY - rect.top) / Math.max(rect.height, 1);

    setDropTarget({ containerId, index: index + (ratio > 0.5 ? 1 : 0) });
  };

  const handleNavDrop = (
    event: DragEvent<HTMLElement>,
    containerId: AdminSidebarContainerId,
    index: number,
  ) => {
    event.preventDefault();

    const path = event.dataTransfer.getData("text/plain") || draggingPath;
    const targetIndex =
      dropTarget && dropTarget.containerId === containerId
        ? dropTarget.index
        : index;

    if (path) {
      moveNavItem(path, containerId, targetIndex);
    }

    setDraggingPath(null);
    setDropTarget(null);
  };

  const handleNavDragEnd = () => {
    setDraggingPath(null);
    setDropTarget(null);
  };

  /** آیا خط «رها کردن» باید بالای آیتم این خانه کشیده شود؟ */
  const isDropTarget = (containerId: AdminSidebarContainerId, index: number) =>
    dropTarget?.containerId === containerId && dropTarget.index === index;

  const toggleLayoutEditing = () => {
    setLayoutEditing((editing) => !editing);
    setDraggingPath(null);
    setDropTarget(null);
  };

  const currentPage = useMemo(() => {
    const match = [...navItems]
      .sort((a, b) => b.to.length - a.to.length)
      .find((item) =>
        item.end
          ? location.pathname === item.to
          : location.pathname === item.to ||
            location.pathname.startsWith(`${item.to}/`),
      );

    return match?.label ?? "پنل مدیریت";
  }, [location.pathname]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("fa");

    if (!query) return visibleNavItems;

    return visibleNavItems.filter((item) =>
      `${item.label} ${item.keywords}`.toLocaleLowerCase("fa").includes(query),
    );
  }, [searchQuery, visibleNavItems]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }

      if (event.key === "Escape") {
        setSearchOpen(false);
        setNotificationsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (searchOpen) {
      const timer = window.setTimeout(
        () => searchInputRef.current?.focus(),
        50,
      );

      return () => window.clearTimeout(timer);
    }
  }, [searchOpen]);

  useEffect(() => {
    setSearchOpen(false);
    setSearchQuery("");
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const formatPersianDate = () =>
    new Intl.DateTimeFormat("fa-IR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());

  const openPage = (path: string) => {
    navigate(path);
    setSearchOpen(false);
    setSearchQuery("");
  };

  /* یک ردیف منو؛ در حالت «چیدمان» قابل کشیدن، پین و جابه‌جایی است. */
  const renderNavRow = (
    item: (typeof visibleNavItems)[number],
    containerId: AdminSidebarContainerId,
    index: number,
    total: number,
  ) => {
    const Icon = item.icon;
    const isPinned = sidebarLayout.pinned.includes(item.to);
    const showDropLineAfter = index === total - 1 && isDropTarget(containerId, total);

    return (
      <Fragment key={`${containerId}:${item.to}`}>
        {isDropTarget(containerId, index) && (
          <span className="admin-nav-drop-line" aria-hidden="true" />
        )}

        <div
          className={`admin-nav-row ${draggingPath === item.to ? "is-dragging" : ""}`}
          draggable={layoutEditing}
          onDragStart={(event) => handleNavDragStart(event, item.to)}
          onDragEnd={handleNavDragEnd}
          onDragOver={(event) => {
            event.stopPropagation();
            handleNavDragOver(event, containerId, index);
          }}
          onDrop={(event) => {
            event.stopPropagation();
            handleNavDrop(event, containerId, index);
          }}
        >
          <NavLink
            to={item.to}
            end={item.end}
            tabIndex={layoutEditing ? -1 : undefined}
            onClick={(event) => {
              if (layoutEditing) {
                event.preventDefault();

                return;
              }

              setMobileMenuOpen(false);
            }}
            className={({ isActive }) =>
              `admin-nav-link ${isActive ? "is-active" : ""}`
            }
          >
            <span className="admin-nav-icon">
              <Icon size={19} strokeWidth={1.9} />
            </span>
            <span className="admin-nav-label">{item.label}</span>
            <span className="admin-nav-indicator" />
          </NavLink>

          {layoutEditing ? (
            <div className="admin-nav-actions">
              <button
                type="button"
                className="admin-nav-action"
                onClick={() => moveNavItemByOffset(item.to, -1)}
                disabled={index === 0}
                title="انتقال به بالا"
                aria-label={`انتقال ${item.label} به بالا`}
              >
                <ArrowUp size={13} />
              </button>

              <button
                type="button"
                className="admin-nav-action"
                onClick={() => moveNavItemByOffset(item.to, 1)}
                disabled={index === total - 1}
                title="انتقال به پایین"
                aria-label={`انتقال ${item.label} به پایین`}
              >
                <ArrowDown size={13} />
              </button>

              <button
                type="button"
                className={`admin-nav-action ${isPinned ? "is-pinned" : ""}`}
                onClick={() => togglePinNavItem(item.to)}
                title={
                  isPinned ? "حذف از دسترسی سریع" : "پین در دسترسی سریع"
                }
                aria-label={
                  isPinned
                    ? `حذف ${item.label} از دسترسی سریع`
                    : `پین کردن ${item.label} در دسترسی سریع`
                }
              >
                {isPinned ? <PinOff size={13} /> : <Pin size={13} />}
              </button>

              <span className="admin-nav-grip" aria-hidden="true">
                <GripVertical size={13} />
              </span>
            </div>
          ) : (
            isPinned && (
              <span
                className="admin-nav-pin-mark"
                title="پین‌شده در دسترسی سریع"
                aria-hidden="true"
              >
                <Pin size={12} />
              </span>
            )
          )}
        </div>

        {showDropLineAfter && (
          <span className="admin-nav-drop-line" aria-hidden="true" />
        )}
      </Fragment>
    );
  };

  return (
    <div
      className={`admin-layout ${
        dragWidth !== null ? "is-resizing-sidebar" : ""
      }`}
      dir="rtl"
      style={{ "--admin-sidebar-w": `${sidebarWidth}px` } as CSSProperties}
    >
      <style>{`
        .admin-topbar {
          position: relative;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          min-height: 78px;
          padding: 16px 28px;
          margin-bottom: 24px;
          background: #ffffff;
          border: 1px solid #e9eee7;
          border-radius: 18px;
          box-shadow: 0 5px 22px rgba(31, 55, 35, 0.035);
        }
        .admin-topbar-breadcrumb {
          display: flex;
          align-items: center;
          gap: 9px;
          min-width: 0;
          color: #829084;
          font-size: 13px;
        }
        .admin-topbar-breadcrumb a {
          color: inherit;
          text-decoration: none;
          transition: color 0.2s;
        }
        .admin-topbar-breadcrumb a:hover {
          color: #527852;
        }
        .admin-topbar-current {
          overflow: hidden;
          color: #243529;
          font-size: 15px;
          font-weight: 800;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .admin-topbar-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          flex: 1;
          min-width: 0;
        }
        .admin-topbar-search {
          display: flex;
          align-items: center;
          gap: 10px;
          width: min(100%, 330px);
          min-height: 43px;
          padding: 0 13px;
          color: #788579;
          background: #f7f9f6;
          border: 1px solid #edf1eb;
          border-radius: 12px;
          cursor: pointer;
          text-align: right;
          transition: border-color 0.2s, background 0.2s;
        }
        .admin-topbar-search:hover {
          background: #f1f5ef;
          border-color: #d8e3d5;
        }
        .admin-topbar-search-label {
          flex: 1;
          overflow: hidden;
          font: inherit;
          font-size: 12px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .admin-topbar-shortcut {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 3px 6px;
          color: #718071;
          background: white;
          border: 1px solid #e2e8df;
          border-radius: 6px;
          font-size: 10px;
          white-space: nowrap;
          direction: ltr;
        }
        .admin-topbar-icon-button {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 42px;
          width: 42px;
          height: 42px;
          color: #647464;
          background: #fff;
          border: 1px solid #e9eee7;
          border-radius: 12px;
          cursor: pointer;
          transition: background 0.2s, color 0.2s;
        }
        .admin-topbar-icon-button:hover {
          color: #426c46;
          background: #f4f7f2;
        }
        .admin-topbar-date {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #788579;
          font-size: 12px;
          white-space: nowrap;
          margin-right: auto;
        }
        .admin-search-backdrop {
          position: fixed;
          z-index: 1000;
          inset: 0;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: min(15vh, 120px) 18px 24px;
          background: rgba(18, 30, 21, 0.42);
          backdrop-filter: blur(4px);
        }
        .admin-search-dialog {
          width: min(100%, 540px);
          overflow: hidden;
          background: #fff;
          border: 1px solid #e5ebe2;
          border-radius: 18px;
          box-shadow: 0 24px 80px rgba(18, 35, 20, 0.2);
        }
        .admin-search-input-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 18px;
          border-bottom: 1px solid #edf0ea;
        }
        .admin-search-input {
          flex: 1;
          width: 100%;
          min-width: 0;
          padding: 8px 0;
          color: #243529;
          background: transparent;
          border: 0;
          outline: none;
          font: inherit;
          font-size: 14px;
        }
        .admin-search-results-title {
          padding: 14px 18px 8px;
          color: #849084;
          font-size: 11px;
          font-weight: 700;
        }
        .admin-search-result {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 13px 18px;
          color: #354638;
          background: #fff;
          border: 0;
          cursor: pointer;
          text-align: right;
          font: inherit;
          font-size: 13px;
        }
        .admin-search-result:hover {
          background: #f4f7f2;
        }
        .admin-search-result-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          color: #507b53;
          background: #edf4e9;
          border-radius: 10px;
        }
        .admin-search-empty {
          padding: 24px 18px;
          color: #829084;
          font-size: 13px;
          text-align: center;
        }
        .admin-notification-popover {
          position: absolute;
          z-index: 100;
          top: calc(100% + 10px);
          left: 0;
          width: min(290px, calc(100vw - 40px));
          padding: 16px;
          color: #526153;
          background: #fff;
          border: 1px solid #e8eee5;
          border-radius: 14px;
          box-shadow: 0 12px 36px rgba(25, 45, 27, 0.12);
          font-size: 12px;
          line-height: 1.9;
        }
        .admin-notification-title {
          margin-bottom: 6px;
          color: #263a29;
          font-size: 13px;
          font-weight: 800;
        }
        @media (max-width: 900px) {
          .admin-topbar {
            flex-wrap: wrap;
            padding: 15px 18px;
          }
          .admin-topbar-actions {
            flex: 1 1 100%;
            order: 3;
          }
          .admin-topbar-search {
            flex: 1;
            width: auto;
          }
          .admin-topbar-date {
            margin-right: auto;
          }
        }
        @media (max-width: 560px) {
          .admin-topbar {
            gap: 13px;
            margin-bottom: 18px;
            border-radius: 14px;
          }
          .admin-topbar-current {
            font-size: 13px;
          }
          .admin-topbar-date {
            font-size: 10px;
          }
          .admin-topbar-search {
            min-height: 42px;
          }
          .admin-topbar-shortcut {
            display: none;
          }
          .admin-topbar-actions {
            gap: 8px;
          }

          /* جلوگیری از بیرون‌زدن محتوای پنل در موبایل */
          .admin-layout {
            width: 100%;
            max-width: 100%;
            min-width: 0;
          }

          .admin-main {
            min-width: 0;
            max-width: 100%;
          }

          .admin-page-content {
            min-width: 0;
            max-width: 100%;
            width: 100%;
          }

          .admin-topbar {
            min-width: 0;
            max-width: 100%;
          }

          .admin-topbar-breadcrumb {
            flex: 1 1 auto;
            overflow: hidden;
          }

          .admin-topbar-actions {
            min-width: 0;
          }

          .admin-page-content {
            padding-right: 12px;
            padding-left: 12px;
          }

          .admin-topbar {
            width: 100%;
            padding-right: 12px;
            padding-left: 12px;
          }

          .admin-topbar-date {
            max-width: 100%;
            white-space: normal;
          }
        }
      `}</style>

      {mobileMenuOpen && (
        <button
          type="button"
          className="admin-mobile-overlay"
          aria-label="بستن منو"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`admin-sidebar is-density-${sidebarLayout.density} ${
          mobileMenuOpen ? "is-open" : ""
        }`}
      >
        <div
          className="admin-sidebar-resizer"
          role="separator"
          aria-orientation="vertical"
          aria-label="تغییر عرض سایدبار"
          aria-valuenow={sidebarWidth}
          aria-valuemin={ADMIN_SIDEBAR_WIDTH_MIN}
          aria-valuemax={ADMIN_SIDEBAR_WIDTH_MAX}
          tabIndex={0}
          title="برای تغییر عرض بکشید • دوبار کلیک: عرض پیش‌فرض"
          onPointerDown={handleResizeStart}
          onPointerMove={handleResizeMove}
          onPointerUp={handleResizeEnd}
          onPointerCancel={handleResizeEnd}
          onDoubleClick={resetSidebarWidth}
          onKeyDown={(event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
              return;
            }

            event.preventDefault();

            const delta = event.key === "ArrowLeft" ? 16 : -16;

            persistSidebarLayout({
              ...sidebarLayout,
              width: clampAdminSidebarWidth(sidebarLayout.width + delta),
            });
          }}
        />
        <button
          type="button"
          className="admin-mobile-close-button"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="بستن منو"
        >
          <X size={18} />
          <span>بستن منو</span>
        </button>

        <Link to="/admin" className="admin-brand">
          <span className="admin-brand-icon">
            <ShieldCheck size={25} strokeWidth={2.1} />
          </span>
          <span className="admin-brand-text">
            <strong>پنل مدیریت</strong>
            <small>مدیریت فروشگاه</small>
          </span>
        </Link>

        <nav
          className={`admin-nav ${layoutEditing ? "is-editing" : ""}`}
          aria-label="منوی مدیریت"
        >
          <div className="admin-nav-tools">
            <span className="admin-nav-tools-title">منوی مدیریت</span>

            <div className="admin-nav-tools-actions">
              {layoutEditing && (
                <button
                  type="button"
                  className="admin-nav-tool-button"
                  onClick={resetSidebarLayout}
                  title="بازگشت به چیدمان پیش‌فرض"
                >
                  <RotateCcw size={13} />
                  <span>پیش‌فرض</span>
                </button>
              )}

              <button
                type="button"
                className="admin-nav-tool-button"
                onClick={cycleSidebarDensity}
                title={`اندازهٔ منو: ${
                  ADMIN_SIDEBAR_DENSITY_LABELS[sidebarLayout.density]
                } (کلیک برای تغییر)`}
                aria-label={`اندازهٔ منو: ${
                  ADMIN_SIDEBAR_DENSITY_LABELS[sidebarLayout.density]
                }. کلیک برای تغییر`}
              >
                <Type size={13} />
              </button>

              <button
                type="button"
                className="admin-nav-tool-button"
                onClick={toggleAllGroupsCollapsed}
                title={
                  allGroupsCollapsed
                    ? "باز کردن همهٔ گروه‌ها"
                    : "بستن همهٔ گروه‌ها"
                }
                aria-label={
                  allGroupsCollapsed
                    ? "باز کردن همهٔ گروه‌ها"
                    : "بستن همهٔ گروه‌ها"
                }
                aria-pressed={allGroupsCollapsed}
              >
                <span
                  className={`admin-nav-heading-chevron ${
                    allGroupsCollapsed ? "is-collapsed" : ""
                  }`}
                  aria-hidden="true"
                >
                  <ChevronDown size={13} strokeWidth={2.4} />
                </span>
              </button>

              <button
                type="button"
                className={`admin-nav-tool-button ${layoutEditing ? "is-active" : ""}`}
                onClick={toggleLayoutEditing}
                aria-pressed={layoutEditing}
                title={
                  layoutEditing
                    ? "پایان شخصی‌سازی منو"
                    : "شخصی‌سازی چیدمان منو"
                }
              >
                {layoutEditing ? (
                  <Check size={13} />
                ) : (
                  <SlidersHorizontal size={13} />
                )}
                <span>{layoutEditing ? "پایان" : "چیدمان"}</span>
              </button>
            </div>
          </div>

          {layoutEditing && (
            <p className="admin-nav-tools-hint">
              آیتم‌ها را بکشید یا با ↑ ↓ جابه‌جا کنید؛ با پین هم به «دسترسی
              سریع» می‌آیند. برای خلوت شدن منو روی عنوان هر گروه بزنید تا بسته
              شود.
            </p>
          )}

          {(pinnedNavItems.length > 0 || layoutEditing) && (
            <div
              className={`admin-nav-group admin-nav-group-pinned ${
                isGroupCollapsed(ADMIN_SIDEBAR_PINNED_GROUP_ID)
                  ? "is-collapsed"
                  : ""
              } ${
                dropTarget?.containerId === ADMIN_SIDEBAR_PINNED_GROUP_ID
                  ? "is-drop-active"
                  : ""
              }`}
              onDragOver={(event) =>
                handleNavDragOver(
                  event,
                  ADMIN_SIDEBAR_PINNED_GROUP_ID,
                  pinnedNavItems.length,
                )
              }
              onDrop={(event) =>
                handleNavDrop(
                  event,
                  ADMIN_SIDEBAR_PINNED_GROUP_ID,
                  pinnedNavItems.length,
                )
              }
            >
              <button
                type="button"
                className="admin-nav-heading admin-nav-heading-toggle"
                onClick={() =>
                  toggleGroupCollapsed(ADMIN_SIDEBAR_PINNED_GROUP_ID)
                }
                aria-expanded={!isGroupCollapsed(ADMIN_SIDEBAR_PINNED_GROUP_ID)}
                aria-controls="admin-nav-panel-pinned"
                title="باز و بسته کردن دسترسی سریع"
              >
                <span className="admin-nav-heading-icon">
                  <Pin size={13} strokeWidth={2.1} />
                </span>
                <span className="admin-nav-heading-text">دسترسی سریع</span>

                {isGroupCollapsed(ADMIN_SIDEBAR_PINNED_GROUP_ID) &&
                  pinnedNavItems.some(isNavItemActive) && (
                    <span
                      className="admin-nav-heading-active-dot"
                      title="صفحهٔ فعلی در این بخش است"
                    />
                  )}

                <span
                  className={`admin-nav-heading-chevron ${
                    isGroupCollapsed(ADMIN_SIDEBAR_PINNED_GROUP_ID)
                      ? "is-collapsed"
                      : ""
                  }`}
                  aria-hidden="true"
                >
                  <ChevronDown size={13} strokeWidth={2.4} />
                </span>
              </button>

              {!isGroupCollapsed(ADMIN_SIDEBAR_PINNED_GROUP_ID) && (
                <div className="admin-nav-panel" id="admin-nav-panel-pinned">
                  {pinnedNavItems.length > 0 ? (
                    pinnedNavItems.map((item, index) =>
                      renderNavRow(
                        item,
                        ADMIN_SIDEBAR_PINNED_GROUP_ID,
                        index,
                        pinnedNavItems.length,
                      ),
                    )
                  ) : (
                    <div className="admin-nav-empty">
                      با پین کردن، بخش‌های پرکاربرد بالای منو می‌آیند.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {layoutSections.map((section) => {
            const SectionIcon = section.icon;

            return (
              <div
                className={`admin-nav-group ${
                  isGroupCollapsed(section.id) ? "is-collapsed" : ""
                } ${
                  dropTarget?.containerId === section.id ? "is-drop-active" : ""
                }`}
                key={section.id}
                onDragOver={(event) =>
                  handleNavDragOver(event, section.id, section.items.length)
                }
                onDrop={(event) =>
                  handleNavDrop(event, section.id, section.items.length)
                }
              >
                <button
                  type="button"
                  className="admin-nav-heading admin-nav-heading-toggle"
                  onClick={() => toggleGroupCollapsed(section.id)}
                  aria-expanded={!isGroupCollapsed(section.id)}
                  aria-controls={`admin-nav-panel-${section.id}`}
                  title={`باز و بسته کردن ${section.label}`}
                >
                  <span className="admin-nav-heading-icon">
                    <SectionIcon size={13} strokeWidth={2.1} />
                  </span>
                  <span className="admin-nav-heading-text">{section.label}</span>

                  {isGroupCollapsed(section.id) &&
                    section.items.some(isNavItemActive) && (
                      <span
                        className="admin-nav-heading-active-dot"
                        title="صفحهٔ فعلی در این بخش است"
                      />
                    )}

                  <span
                    className={`admin-nav-heading-chevron ${
                      isGroupCollapsed(section.id) ? "is-collapsed" : ""
                    }`}
                    aria-hidden="true"
                  >
                    <ChevronDown size={13} strokeWidth={2.4} />
                  </span>
                </button>

                {!isGroupCollapsed(section.id) && (
                  <div
                    className="admin-nav-panel"
                    id={`admin-nav-panel-${section.id}`}
                  >
                    {section.items.map((item, index) =>
                      renderNavRow(
                        item,
                        section.id,
                        index,
                        section.items.length,
                      ),
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-card">
            <div className="admin-user-avatar">
              {(user?.name?.trim()?.charAt(0) || "ک").toUpperCase()}
            </div>

            <div className="admin-user-info">
              <span className="admin-user-caption">{roleLabel}</span>
              <strong className="admin-user-name">
                {user?.name || "مدیر فروشگاه"}
              </strong>
            </div>

            {can(ADMIN_PERMISSIONS.admins) && (
              <Link
                to="/admin/admins"
                className="admin-user-edit"
                aria-label="ویرایش حساب مدیر"
                title="ویرایش حساب مدیر"
              >
                <Pencil size={15} strokeWidth={1.9} />
              </Link>
            )}
          </div>

          <div className="admin-sidebar-footer-actions">
            <Link to="/" className="admin-store-link" title="مشاهده فروشگاه">
              <Store size={17} strokeWidth={1.9} />
              <span>فروشگاه</span>
            </Link>

            <button
              type="button"
              className="admin-logout-button"
              title="خروج از حساب"
              onClick={() => {
                void logout();
              }}
            >
              <LogOut size={17} strokeWidth={1.9} />
              <span>خروج</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="admin-main">
        <button
          type="button"
          className="admin-mobile-menu-button"
          onClick={() => setMobileMenuOpen((open) => !open)}
          aria-label="باز و بسته کردن منو"
          aria-expanded={mobileMenuOpen}
        >
          <span />
          <span />
          <span />
        </button>

        <div className="admin-page-content">
          <header className="admin-topbar">
            <div className="admin-topbar-breadcrumb">
              <Link to="/admin">خانه</Link>
              <ChevronLeft size={15} />
              <span className="admin-topbar-current">{currentPage}</span>
            </div>

            <div className="admin-topbar-actions">
              <button
                type="button"
                className="admin-topbar-search"
                onClick={() => setSearchOpen(true)}
                aria-label="جست‌وجو در پنل مدیریت"
              >
                <Search size={17} />
                <span className="admin-topbar-search-label">
                  جست‌وجو در پنل مدیریت...
                </span>
                <span className="admin-topbar-shortcut">
                  {navigator.platform?.toLowerCase().includes("mac") ? (
                    <Command size={11} />
                  ) : (
                    "Ctrl"
                  )}
                  K
                </span>
              </button>

              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  className="admin-topbar-icon-button"
                  onClick={() => setNotificationsOpen((open) => !open)}
                  aria-label="اعلان‌ها"
                  aria-expanded={notificationsOpen}
                >
                  <Bell size={18} />
                </button>

                {notificationsOpen && (
                  <div className="admin-notification-popover" role="status">
                    <div className="admin-notification-title">اعلان‌ها</div>
                    فعلاً اعلان جدیدی برای نمایش وجود ندارد.
                  </div>
                )}
              </div>
            </div>

            <div className="admin-topbar-date">
              <CalendarDays size={16} />
              <span>{formatPersianDate()}</span>
            </div>
          </header>

          <Outlet />
        </div>
      </main>

      {searchOpen && (
        <div
          className="admin-search-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSearchOpen(false);
            }
          }}
        >
          <section
            className="admin-search-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="جست‌وجو در پنل مدیریت"
          >
            <div className="admin-search-input-wrap">
              <Search size={20} color="#668066" />

              <input
                ref={searchInputRef}
                className="admin-search-input"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && filteredItems[0]) {
                    openPage(filteredItems[0].to);
                  }
                }}
                placeholder="نام بخش موردنظر را بنویسید..."
                aria-label="عبارت جست‌وجو"
              />

              <button
                type="button"
                className="admin-topbar-icon-button"
                onClick={() => setSearchOpen(false)}
                aria-label="بستن جست‌وجو"
              >
                <X size={17} />
              </button>
            </div>

            <div className="admin-search-results-title">بخش‌های مدیریت</div>

            {filteredItems.length ? (
              filteredItems.map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.to}
                    type="button"
                    className="admin-search-result"
                    onClick={() => openPage(item.to)}
                  >
                    <span className="admin-search-result-icon">
                      <Icon size={18} />
                    </span>

                    <span>{item.label}</span>

                    <span
                      style={{
                        marginRight: "auto",
                        color: "#91a091",
                      }}
                    >
                      <ChevronLeft size={16} />
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="admin-search-empty">
                بخشی با این عبارت پیدا نشد.
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default AdminLayout;
