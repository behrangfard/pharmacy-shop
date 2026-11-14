import {
  BadgeCheck,
  Calculator,
  CirclePlay,
  Heart,
  Headset,
  LayoutDashboard,
  LayoutTemplate,
  Megaphone,
  MessageSquare,
  MonitorSmartphone,
  Newspaper,
  Package,
  PanelTop,
  RotateCcw,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Tags,
  TicketPercent,
  TrendingUp,
  Truck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ADMIN_PERMISSIONS } from "./adminPermissions";

/**
 * فهرست مشترک بخش‌های پنل مدیریت.
 *
 * سایدبار از همین فهرست منو می‌سازد و صفحهٔ «نمای کلی» هم از آن برای ساخت
 * میان‌بر (کشیدن بخشی از منو و رها کردن آن روی داشبورد یا انتخاب از فهرست
 * «افزودن بخش») استفاده می‌کند؛ بنابراین هر بخش جدید فقط باید همین‌جا اضافه
 * شود تا هم در منو و هم در فهرست میان‌برهای داشبورد ظاهر شود.
 */
export type AdminNavItem = {
  to: string;
  permission: string;
  label: string;
  /** فقط برای مسیرهایی مثل /admin که نباید زیرمسیرها را فعال کنند. */
  end?: boolean;
  icon: LucideIcon;
  keywords: string;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
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
    to: "/admin/shipping",
    permission: ADMIN_PERMISSIONS.orders,
    label: "ارسال و حمل‌ونقل",
    icon: Truck,
    keywords:
      "ارسال مرسوله پست تیپاکس باربری هزینه ارسال منطقه تعرفه کد رهگیری بسته‌بندی",
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
    to: "/admin/content",
    permission: ADMIN_PERMISSIONS.banners,
    label: "مدیریت محتوا",
    icon: LayoutTemplate,
    keywords:
      "محتوا بنر اسلایدر تصویر تبلیغات صفحه اول صفحات سایت درباره ما تماس با ما قوانین",
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
    to: "/admin/stories",
    permission: ADMIN_PERMISSIONS.banners,
    label: "استوری‌ها",
    icon: CirclePlay,
    keywords:
      "استوری دایره صفحه اول بالای دسته بندی اسلاید کاور stories اینستاگرام",
  },
  {
    to: "/admin/popups",
    permission: ADMIN_PERMISSIONS.banners,
    label: "پاپ‌آپ‌ها",
    icon: MonitorSmartphone,
    keywords:
      "پاپ آپ پاپ‌آپ popup مودال شیت کمپین تخفیف کد تخفیف اعلان تبلیغات بازشو",
  },
  {
    to: "/admin/trust-badges",
    permission: ADMIN_PERMISSIONS.settings,
    label: "نمادها و مجوزها",
    icon: BadgeCheck,
    keywords: "اینماد نماد اعتماد مجوز ساماندهی نشان اعتماد الکترونیکی فوتر نمادها",
  },
  {
    to: "/admin/header-footer",
    permission: ADMIN_PERMISSIONS.settings,
    label: "هدر و فوتر",
    icon: PanelTop,
    keywords:
      "هدر فوتر لوگو شعار متن درباره لینک سریع کپی رایت دکمه اقدام سربرگ پاورقی",
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
    to: "/admin/wishlist",
    permission: ADMIN_PERMISSIONS.customers,
    label: "علاقه‌مندی‌ها",
    icon: Heart,
    keywords:
      "علاقه مندی لیست آرزو ویش لیست wishlist محصولات ذخیره شده سلیقه مشتری آمار علاقه‌مندی",
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
    to: "/admin/accounting",
    permission: ADMIN_PERMISSIONS.accounting,
    label: "حسابداری",
    icon: Calculator,
    keywords:
      "حسابداری فاکتور خرید تأمین کننده قیمت خرید بهای تمام شده موجودی انبار هزینه باربری چک سود زیان دفتر حساب",
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

/** یافتن بخش منو بر اساس مسیر (برای آیکن و عنوان میان‌برهای داشبورد). */
export function getAdminNavItem(to: string): AdminNavItem | undefined {
  return ADMIN_NAV_ITEMS.find((item) => item.to === to);
}
