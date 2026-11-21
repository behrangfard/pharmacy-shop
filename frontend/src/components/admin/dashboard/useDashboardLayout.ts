import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import { ADMIN_NAV_ITEMS } from "../../../utils/adminNavItems";
import {
  DASHBOARD_SHORTCUT_MIME,
  addDashboardShortcutBlock,
  createDefaultAdminDashboardLayout,
  parseDashboardShortcutPayload,
  readAdminDashboardLayout,
  removeDashboardBlock,
  saveAdminDashboardLayout,
  type AdminDashboardLayout,
  type AdminDashboardShortcutPayload,
  type DashboardBlockId,
} from "../../../utils/adminDashboardLayout";

interface UseDashboardLayoutParams {
  /** شناسهٔ مدیر جاری؛ کلید ذخیرهٔ چیدمان شخصی همین شناسه است. */
  userId?: number;
  /** بررسی مجوز پنل برای فهرست میان‌برهای منوی کنار صفحه. */
  can: (permission?: string) => boolean;
}

/**
 * منطق چیدمان شخصی‌سازی‌شدهٔ نمای کلی: ترتیب و نمایش بخش‌ها، کشیدن و رها
 * کردن، و افزودن یا حذف میان‌برهای منو. چیدمان برای هر مدیر جداگانه در
 * localStorage ذخیره می‌شود و با تغییر حساب دوباره خوانده می‌شود.
 */
export function useDashboardLayout({ userId, can }: UseDashboardLayoutParams) {
  const [dashboardLayout, setDashboardLayout] = useState<AdminDashboardLayout>(
    () => readAdminDashboardLayout(userId),
  );
  const [layoutEditing, setLayoutEditing] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [draggingBlock, setDraggingBlock] = useState<DashboardBlockId | null>(
    null,
  );
  const [blockDrop, setBlockDrop] = useState<{
    id: DashboardBlockId;
    after: boolean;
  } | null>(null);
  /** آیا همین حالا بخشی از منو روی صفحهٔ نمای کلی کشیده شده است؟ */
  const [shortcutDragActive, setShortcutDragActive] = useState(false);

  /** ریشهٔ صفحهٔ نمای کلی؛ برای تشخیص ورود/خروج کشیدن استفاده می‌شود. */
  const pageRef = useRef<HTMLDivElement | null>(null);

  /* چیدمان ذخیره‌شدهٔ همین مدیر (در صورت تغییر حساب دوباره خوانده می‌شود) */
  useEffect(() => {
    setDashboardLayout(readAdminDashboardLayout(userId));
  }, [userId]);

  /* ---------- چیدمان شخصی‌سازی‌شدهٔ نمای کلی ---------- */

  const persistDashboardLayout = (next: AdminDashboardLayout) => {
    setDashboardLayout(next);
    saveAdminDashboardLayout(userId, next);
  };

  const visibleBlocks = useMemo(
    () =>
      dashboardLayout.order.filter(
        (blockId) => !dashboardLayout.hidden.includes(blockId),
      ),
    [dashboardLayout],
  );

  const setBlockHidden = (blockId: DashboardBlockId, hidden: boolean) => {
    const hiddenSet = new Set(dashboardLayout.hidden);

    if (hidden) {
      hiddenSet.add(blockId);
    } else {
      hiddenSet.delete(blockId);
    }

    persistDashboardLayout({
      ...dashboardLayout,
      hidden: dashboardLayout.order.filter((id) => hiddenSet.has(id)),
    });
  };

  /** جابه‌جایی یک بخش قبل/بعد از بخش دیگر (کشیدن با ماوس). */
  const moveBlockBefore = (
    blockId: DashboardBlockId,
    targetId: DashboardBlockId,
    after: boolean,
  ) => {
    if (blockId === targetId) {
      return;
    }

    const order = dashboardLayout.order.filter((id) => id !== blockId);
    const targetIndex = order.indexOf(targetId);

    if (targetIndex < 0) {
      return;
    }

    order.splice(targetIndex + (after ? 1 : 0), 0, blockId);
    persistDashboardLayout({ ...dashboardLayout, order });
  };

  /** جابه‌جایی یک پله‌ای بخش (برای لمس و موبایل). */
  const moveBlockByOffset = (blockId: DashboardBlockId, offset: number) => {
    const index = visibleBlocks.indexOf(blockId);
    const target = visibleBlocks[index + offset];

    if (!target) {
      return;
    }

    moveBlockBefore(blockId, target, offset > 0);
  };

  const resetDashboardLayout = () => {
    persistDashboardLayout(createDefaultAdminDashboardLayout());
    setDraggingBlock(null);
    setBlockDrop(null);
  };

  /* ---------- افزودن بخش‌های منو به نمای کلی (کشیدن از سایدبار) ---------- */

  /** آیا دادهٔ در حال کشیده شدن، یک بخش منو برای افزودن به داشبورد است؟ */
  const isShortcutDrag = (dataTransfer: DataTransfer | null) =>
    Boolean(
      dataTransfer &&
        Array.from(dataTransfer.types).includes(DASHBOARD_SHORTCUT_MIME),
    );

  /** افزودن میان‌بر یک بخش منو به نمای کلی (هم با کشیدن، هم از فهرست). */
  const addShortcutBlock = (payload: AdminDashboardShortcutPayload) => {
    persistDashboardLayout(addDashboardShortcutBlock(dashboardLayout, payload));
    setAddMenuOpen(false);
    setShortcutDragActive(false);
  };

  const removeShortcutBlock = (blockId: DashboardBlockId) => {
    persistDashboardLayout(removeDashboardBlock(dashboardLayout, blockId));
  };

  const handleShortcutDragOver = (event: DragEvent<HTMLElement>) => {
    if (!isShortcutDrag(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    /* در حالت «چیدمان» مبدأ کشیدن move است؛ هماهنگ می‌کنیم تا رها کردن مجاز باشد. */
    event.dataTransfer.dropEffect =
      event.dataTransfer.effectAllowed === "move" ? "move" : "copy";
    setShortcutDragActive(true);
  };

  /*
   * فعال/غیرفعال کردن کادر «رها کنید» با یک شنوندهٔ سراسری انجام می‌شود تا
   * هنگام عبور از روی کارت‌های داخلی صفحه پرش نکند و اگر کشیدن لغو شد هم
   * کادر گیر نکند.
   */
  useEffect(() => {
    const handleWindowDragOver = (event: globalThis.DragEvent) => {
      if (!isShortcutDrag(event.dataTransfer)) {
        return;
      }

      const page = pageRef.current;

      setShortcutDragActive(
        Boolean(page && event.composedPath().includes(page)),
      );
    };

    const clearShortcutDrag = () => setShortcutDragActive(false);

    window.addEventListener("dragover", handleWindowDragOver);
    window.addEventListener("dragend", clearShortcutDrag);
    window.addEventListener("drop", clearShortcutDrag);

    return () => {
      window.removeEventListener("dragover", handleWindowDragOver);
      window.removeEventListener("dragend", clearShortcutDrag);
      window.removeEventListener("drop", clearShortcutDrag);
    };
  }, []);

  const handleShortcutDrop = (event: DragEvent<HTMLElement>) => {
    if (!isShortcutDrag(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    setShortcutDragActive(false);

    const payload = parseDashboardShortcutPayload(
      event.dataTransfer.getData(DASHBOARD_SHORTCUT_MIME),
    );

    if (payload) {
      addShortcutBlock(payload);
    }
  };

  /** بخش‌های منوی پنل که همین مدیر به آن‌ها دسترسی دارد (خود داشبورد منهای می‌شود). */
  const navShortcutTargets = ADMIN_NAV_ITEMS.filter(
    (item) =>
      item.to !== "/admin" &&
      (item.permissions ?? [item.permission]).some((permission) =>
        can(permission),
      ),
  );

  const handleBlockDragStart = (
    event: DragEvent<HTMLElement>,
    blockId: DashboardBlockId,
  ) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", blockId);
    setDraggingBlock(blockId);
    setBlockDrop(null);
  };

  const handleBlockDragOver = (
    event: DragEvent<HTMLElement>,
    blockId: DashboardBlockId,
  ) => {
    if (!draggingBlock || draggingBlock === blockId) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    const rect = event.currentTarget.getBoundingClientRect();
    const after = (event.clientY - rect.top) / Math.max(rect.height, 1) > 0.5;

    setBlockDrop({ id: blockId, after });
  };

  const handleBlockDrop = (
    event: DragEvent<HTMLElement>,
    blockId: DashboardBlockId,
  ) => {
    if (!draggingBlock) {
      return;
    }

    event.preventDefault();

    const after = blockDrop?.id === blockId ? blockDrop.after : false;

    moveBlockBefore(draggingBlock, blockId, after);
    setDraggingBlock(null);
    setBlockDrop(null);
  };

  const handleBlockDragEnd = () => {
    setDraggingBlock(null);
    setBlockDrop(null);
  };

  useEffect(() => {
    if (!addMenuOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAddMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [addMenuOpen]);

  useEffect(() => {
    if (!layoutEditing) {
      setAddMenuOpen(false);
    }
  }, [layoutEditing]);

  return {
    dashboardLayout,
    visibleBlocks,
    layoutEditing,
    setLayoutEditing,
    addMenuOpen,
    setAddMenuOpen,
    draggingBlock,
    blockDrop,
    setBlockDrop,
    shortcutDragActive,
    pageRef,
    navShortcutTargets,
    setBlockHidden,
    moveBlockByOffset,
    resetDashboardLayout,
    addShortcutBlock,
    removeShortcutBlock,
    handleShortcutDragOver,
    handleShortcutDrop,
    handleBlockDragStart,
    handleBlockDragOver,
    handleBlockDrop,
    handleBlockDragEnd,
  };
}
