import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Heart,
  ShoppingBag,
  Sparkles,
  Headset,
  Truck,
  PackageCheck,
} from "lucide-react";

function Footer() {
  return (
    <footer className="mt-16 border-t border-[#e6ecdf] bg-[#faf9f4]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
        {/* Main footer */}
        <div className="grid grid-cols-1 gap-9 sm:grid-cols-2 md:grid-cols-4 md:gap-8">
          {/* Brand */}
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-xl font-black text-[#4f7754] transition-colors hover:text-[#385e3e]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e5eddf]">
                <ShoppingBag size={21} />
              </span>
              بهرنگ شاپ
            </Link>

            <p className="mt-4 text-sm leading-8 text-[#788174]">
              فروشگاه آنلاین لباس زیر با تمرکز بر کیفیت، راحتی و انتخابی متنوع.
              تلاش می‌کنیم خریدی ساده و دلنشین را برای شما فراهم کنیم.
            </p>

            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#eee7f5] px-3 py-2 text-xs font-medium text-[#725a91]">
              <Heart size={14} />
              <span>انتخابی برای راحتی شما</span>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="mb-5 flex items-center gap-2 font-black text-[#354a37]">
              <span className="h-6 w-1 rounded-full bg-[#8eae86]" />
              دسترسی سریع
            </h4>

            <div className="space-y-3.5 text-sm text-[#788174]">
              <Link
                to="/products"
                className="group flex items-center justify-between gap-2 transition-colors hover:text-[#4f7754]"
              >
                <span>فروشگاه</span>
                <ArrowLeft
                  size={15}
                  className="opacity-0 transition-all group-hover:translate-x-[-3px] group-hover:opacity-100"
                />
              </Link>

              <Link
                to="/products?category=lingerie-sets"
                className="group flex items-center justify-between gap-2 transition-colors hover:text-[#4f7754]"
              >
                <span>ست لباس زیر</span>
                <ArrowLeft
                  size={15}
                  className="opacity-0 transition-all group-hover:translate-x-[-3px] group-hover:opacity-100"
                />
              </Link>

              <Link
                to="/products?category=sleepwear"
                className="group flex items-center justify-between gap-2 transition-colors hover:text-[#4f7754]"
              >
                <span>لباس خواب</span>
                <ArrowLeft
                  size={15}
                  className="opacity-0 transition-all group-hover:translate-x-[-3px] group-hover:opacity-100"
                />
              </Link>

              <Link
                to="/products"
                className="group flex items-center justify-between gap-2 transition-colors hover:text-[#4f7754]"
              >
                <span>مشاهده محصولات</span>
                <ArrowLeft
                  size={15}
                  className="opacity-0 transition-all group-hover:translate-x-[-3px] group-hover:opacity-100"
                />
              </Link>

              <Link
                to="/size-guide"
                className="group flex items-center justify-between gap-2 transition-colors hover:text-[#4f7754]"
              >
                <span>راهنمای انتخاب سایز</span>
                <ArrowLeft
                  size={15}
                  className="opacity-0 transition-all group-hover:translate-x-[-3px] group-hover:opacity-100"
                />
              </Link>
            </div>
          </div>

          {/* Customer services */}
          <div>
            <h4 className="mb-5 flex items-center gap-2 font-black text-[#354a37]">
              <span className="h-6 w-1 rounded-full bg-[#c9b6df]" />
              خدمات مشتریان
            </h4>

            <div className="space-y-4 text-sm text-[#788174]">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#e5eddf] text-[#537653]">
                  <ShoppingBag size={16} />
                </span>
                <div>
                  <p className="font-bold text-[#526451]">راهنمای خرید</p>
                  <p className="mt-1 text-xs leading-6">
                    انتخاب و ثبت سفارش محصولات
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#eee7f5] text-[#8066a2]">
                  <Truck size={16} />
                </span>
                <div>
                  <p className="font-bold text-[#526451]">روش‌های ارسال</p>
                  <p className="mt-1 text-xs leading-6">
                    اطلاعات ارسال سفارش‌ها
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#e5eddf] text-[#537653]">
                  <Headset size={16} />
                </span>
                <div>
                  <p className="font-bold text-[#526451]">پشتیبانی</p>
                  <p className="mt-1 text-xs leading-6">
                    همراه شما در مسیر خرید
                  </p>
                </div>
              </div>

              <Link
                to="/account"
                className="flex items-center gap-3 transition-colors hover:text-[#4f7754]"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#eee7f5] text-[#8066a2]">
                  <PackageCheck size={16} />
                </span>
                <span>حساب کاربری و سفارش‌ها</span>
              </Link>
            </div>
          </div>

          {/* About */}
          <div>
            <h4 className="mb-5 flex items-center gap-2 font-black text-[#354a37]">
              <span className="h-6 w-1 rounded-full bg-[#8eae86]" />
              درباره بهرنگ شاپ
            </h4>

            <p className="text-sm leading-8 text-[#788174]">
              تلاش ما ارائه تجربه‌ای ساده، سریع و مطمئن برای خرید لباس زیر
              باکیفیت و راحت است. می‌خواهیم انتخاب محصولات موردنیازتان تجربه‌ای
              دلنشین و آسان باشد.
            </p>

            <div className="mt-5 rounded-2xl border border-[#e5eadd] bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-[#4f7754]">
                <Sparkles size={17} />
                <span>خریدی آسان و دلنشین</span>
              </div>
              <p className="mt-2 text-xs leading-6 text-[#8a9284]">
                از انتخاب محصول تا ثبت سفارش، تجربه‌ای ساده و راحت داشته باشید.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 border-t border-[#e6ecdf] pt-6">
          <div className="flex flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-right">
            <p className="text-xs leading-6 text-[#92998d]">
              تمامی حقوق این وب‌سایت متعلق به بهرنگ شاپ است.
            </p>

            <Link
              to="/"
              className="text-xs font-bold text-[#668264] transition-colors hover:text-[#8066a2]"
            >
              بازگشت به صفحهٔ اصلی
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
