import { Component, type ErrorInfo, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  /**
   * با تغییر این مقدار (مسیر صفحه) خطای قبلی پاک می‌شود؛ بنابراین کاربر پس از
   * دیدن صفحهٔ خطا می‌تواند با لینک‌های عادی سایت به صفحهٔ دیگری برود.
   */
  resetKey?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * گرفتن خطاهای رندر React در کل اپلیکیشن.
 *
 * بدون این کامپوننت، هر خطای غیرمنتظره (مثلاً پاسخ نامعتبر API یا خطای یک
 * کامپوننت فرزند) کل صفحه را سفید می‌کند. اینجا به‌جای صفحهٔ سفید، پیام
 * فارسی و دکمهٔ «تلاش دوباره» نمایش داده می‌شود و جزئیات خطا فقط در حالت
 * توسعه در کنسول/صفحه می‌آید تا برای مشتری نگران‌کننده نباشد.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[UI] خطای رندر:", error, info.componentStack);
  }

  componentDidUpdate(previous: ErrorBoundaryProps): void {
    if (this.state.error && previous.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render() {
    const { error } = this.state;

    if (!error) {
      return this.props.children;
    }

    return (
      <div
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-cream px-4 py-16"
      >
        <div className="w-full max-w-lg rounded-3xl border border-brand-100 bg-white p-7 text-center shadow-sm sm:p-9">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blush-50 text-discount">
            <AlertTriangle size={26} aria-hidden="true" />
          </div>

          <h1 className="text-xl font-black leading-8 text-ink sm:text-2xl">
            مشکلی در نمایش این صفحه پیش آمد
          </h1>

          <p className="mt-3 text-sm leading-8 text-muted-soft">
            صفحه به‌درستی بارگذاری نشد. یک‌بار دیگر تلاش کنید؛ اگر مشکل ادامه
            داشت، صفحه را ببندید و دوباره باز کنید یا با پشتیبانی فروشگاه در
            تماس باشید.
          </p>

          {import.meta.env.DEV && (
            <pre
              dir="ltr"
              className="mt-4 max-h-40 overflow-auto rounded-xl bg-[#f6f7f4] p-3 text-left text-[11px] leading-5 text-[#7b3f3f]"
            >
              {error.message}
            </pre>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700"
            >
              <RotateCcw size={16} aria-hidden="true" />
              تلاش دوباره
            </button>

            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-5 py-2.5 text-sm font-bold text-ink-soft transition-colors hover:border-brand-250 hover:text-brand-600"
            >
              <Home size={16} aria-hidden="true" />
              بازگشت به صفحهٔ اصلی
            </a>
          </div>
        </div>
      </div>
    );
  }
}

/**
 * نسخهٔ متصل به مسیر: هر بار آدرس عوض شود، مرز خطا صفر می‌شود.
 * باید داخل Router استفاده شود (از useLocation می‌خواند).
 */
export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <ErrorBoundary resetKey={`${location.pathname}${location.search}`}>
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
