import type { LucideIcon } from "lucide-react";
import { PlusCircle } from "lucide-react";
import type { AdminNavItem } from "./adminNavItems";
import {
  ADMIN_SIDEBAR_GROUP_LABELS,
  defaultSidebarGroupOf,
  type AdminSidebarGroupId,
} from "./adminSidebarLayout";

/**
 * فهرست جست‌وجوی سراسری پنل مدیریت.
 *
 * هر ردیف منو یک نتیجه است و زیرصفحه‌هایی که مسیر واقعی دارند (مثل «افزودن
 * محصول») هم نتیجهٔ جدا می‌شوند؛ بنابراین مدیر می‌تواند همهٔ بخش‌ها و
 * زیرمنوها را جست‌وجو کند. هر نتیجه «والد» خودش (گروه منو و آیتم والد) را
 * همراه دارد تا در نتایج معلوم باشد کجای پنل قرار گرفته است.
 */
export type AdminSearchEntry = {
  /** مسیر مقصد؛ برای زیرصفحه‌ها ممکن است دقیق‌تر از مسیر منو باشد. */
  path: string;
  /** نام همین سطح (زیرمنو). */
  label: string;
  icon: LucideIcon;
  keywords: string;
  groupId: AdminSidebarGroupId;
  /** عنوان گروه منو (والد سطح اول). */
  groupLabel: string;
  /** نام آیتم منوی والد؛ فقط برای زیرصفحه‌ها. */
  parentLabel?: string;
  parentPath?: string;
  /** مسیر سلسله‌مراتبی برای نمایش: «فروشگاه › محصولات › افزودن محصول». */
  trail: string;
};

type AdminSearchExtraEntry = {
  /** مسیر آیتم منو که این زیرصفحه زیرمجموعهٔ آن است. */
  parentPath: string;
  path: string;
  label: string;
  keywords: string;
  icon: LucideIcon;
};

/**
 * زیرصفحه‌های واقعی که در منو ردیف جدا ندارند ولی مسیر مستقل دارند.
 * (مسیرهای پویا مثل `/admin/products/:id/edit` اینجا نمی‌آیند چون شناسه ندارند.)
 */
const ADMIN_SEARCH_EXTRA_ENTRIES: AdminSearchExtraEntry[] = [
  {
    parentPath: "/admin/products",
    path: "/admin/products/create",
    label: "افزودن محصول جدید",
    keywords: "ساخت محصول جدید ثبت کالا ایجاد",
    icon: PlusCircle,
  },
];

/** آماده‌سازی متن فارسی برای مقایسه: ي/ك عربی، نیم‌فاصله، اعراب و ارقام. */
export function normalizeAdminSearchText(value: string): string {
  return value
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ۀة]/g, "ه")
    .replace(/[أإآ]/g, "ا")
    .replace(/[\u200c\u200e\u200f]/g, " ")
    .replace(/\u0640/g, "")
    .replace(/[\u064b-\u065f\u0670]/g, "")
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("fa");
}

/** ساخت فهرست کامل جست‌وجو از آیتم‌های منو (فقط بخش‌های مجازِ همین مدیر). */
export function buildAdminSearchEntries(
  items: AdminNavItem[],
): AdminSearchEntry[] {
  const entries: AdminSearchEntry[] = items.map((item) => {
    const groupId = defaultSidebarGroupOf(item.to);
    const groupLabel = ADMIN_SIDEBAR_GROUP_LABELS[groupId];

    return {
      path: item.to,
      label: item.label,
      icon: item.icon,
      keywords: item.keywords,
      groupId,
      groupLabel,
      trail: `${groupLabel} › ${item.label}`,
    };
  });

  ADMIN_SEARCH_EXTRA_ENTRIES.forEach((extra) => {
    const parent = items.find((item) => item.to === extra.parentPath);

    if (!parent) {
      return;
    }

    const groupId = defaultSidebarGroupOf(parent.to);

    entries.push({
      path: extra.path,
      label: extra.label,
      icon: extra.icon,
      keywords: `${extra.keywords} ${parent.keywords}`,
      groupId,
      groupLabel: ADMIN_SIDEBAR_GROUP_LABELS[groupId],
      parentLabel: parent.label,
      parentPath: parent.to,
      trail: `${ADMIN_SIDEBAR_GROUP_LABELS[groupId]} › ${parent.label} › ${extra.label}`,
    });
  });

  return entries;
}

/** همهٔ کلمه‌های عبارت باید در نام/کلیدواژه‌ها/والدِ نتیجه پیدا شوند. */
export function searchAdminEntries(
  entries: AdminSearchEntry[],
  rawQuery: string,
): AdminSearchEntry[] {
  const query = normalizeAdminSearchText(rawQuery);

  if (!query) {
    return entries;
  }

  const tokens = query.split(" ").filter(Boolean);

  const scored = entries
    .map((entry, index) => {
      const label = normalizeAdminSearchText(entry.label);
      const trail = normalizeAdminSearchText(entry.trail);
      const keywords = normalizeAdminSearchText(entry.keywords);
      const haystack = [
        label,
        trail,
        keywords,
        normalizeAdminSearchText(entry.groupLabel),
        entry.parentLabel ? normalizeAdminSearchText(entry.parentLabel) : "",
      ].join(" ");

      let score = 0;

      for (const token of tokens) {
        if (!haystack.includes(token)) {
          return { entry, index, score: -1 };
        }

        if (label === token) {
          score += 40;
        } else if (label.startsWith(token)) {
          score += 30;
        } else if (label.includes(token)) {
          score += 20;
        } else if (trail.includes(token)) {
          score += 10;
        } else {
          score += 5;
        }
      }

      return { entry, index, score };
    })
    .filter((row) => row.score >= 0);

  scored.sort((a, b) => b.score - a.score || a.index - b.index);

  return scored.map((row) => row.entry);
}