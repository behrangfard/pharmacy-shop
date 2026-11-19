import axios from "axios";

import { API_BASE_URL } from "../utils/apiOrigin";
import { STORAGE_KEYS } from "../utils/storageKeys";

const baseURL = API_BASE_URL;

/** پس از پاک‌شدن نشست مشتری به‌خاطر پاسخ ۴۰۱ اعلام می‌شود. */
export const SESSION_EXPIRED_EVENT = "behrang-shop:session-expired";

/** پس از پاک‌شدن نشست پنل مدیریت به‌خاطر پاسخ ۴۰۱ اعلام می‌شود. */
export const ADMIN_SESSION_EXPIRED_EVENT = "behrang-shop:admin-session-expired";

/**
 * نشانهٔ «نشست منقضی شده» برای صفحهٔ ورود.
 *
 * در `sessionStorage` نگه داشته می‌شود تا فقط در همین تب و یک‌بار مصرف شود؛
 * کاربر پس از ریدایرکت به `/login` پیام روشن می‌بیند.
 */
const SESSION_EXPIRED_NOTICE_KEY = "behrang-shop-session-expired-notice";

/**
 * پیام «نشست منقضی شده» را یک‌بار برمی‌گرداند و پاک می‌کند.
 *
 * صفحهٔ ورود این تابع را برای مقدار اولیهٔ خطا صدا می‌زند. اگر نشانه‌ای نباشد
 * رشتهٔ خالی برمی‌گردد.
 */
export function consumeSessionExpiredNotice(): string {
  try {
    if (sessionStorage.getItem(SESSION_EXPIRED_NOTICE_KEY) === null) {
      return "";
    }

    sessionStorage.removeItem(SESSION_EXPIRED_NOTICE_KEY);
  } catch {
    return "";
  }

  return "نشست شما به پایان رسیده است؛ لطفاً دوباره وارد شوید.";
}

const api = axios.create({
  baseURL,
  headers: {
    Accept: "application/json",
  },
});

const adminApi = axios.create({
  baseURL,
  headers: {
    Accept: "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(STORAGE_KEYS.token);
    const guestToken = localStorage.getItem(STORAGE_KEYS.guestToken);
    const requestUrl = typeof config.url === "string" ? config.url : "";
    // شناسهٔ مهمان فقط برای مسیرهای سفارش فرستاده می‌شود، نه همهٔ APIها.
    const isOrderRequest = /(^|\/)orders(\/|$)/.test(requestUrl);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      // سفارش مهمان فقط با شناسهٔ مرورگر دیده می‌شود؛ توکن کاربر اولویت دارد.
      delete config.headers["X-Guest-Token"];
    } else {
      delete config.headers.Authorization;

      if (guestToken && isOrderRequest) {
        config.headers["X-Guest-Token"] = guestToken;
      } else {
        delete config.headers["X-Guest-Token"];
      }
    }

    return config;
  },
  (error) => Promise.reject(error),
);

adminApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(STORAGE_KEYS.adminToken);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

/**
 * عمر توکن مشتری محدود است (`sanctum.expiration`). وقتی سرور `401` بدهد یعنی
 * توکن منقضی یا باطل شده است؛ نشست محلی پاک و رویداد اعلام می‌شود تا
 * `AuthContext` کاربر را خارج‌شده نشان دهد و صفحهٔ ورود پیام «نشست منقضی شده»
 * را نمایش دهد. اگر توکنی وجود نداشته باشد (مثلاً ورود با رمز اشتباه) کاری
 * انجام نمی‌شود.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const hasToken = localStorage.getItem(STORAGE_KEYS.token) !== null;

    if (axios.isAxiosError(error) && error.response?.status === 401 && hasToken) {
      localStorage.removeItem(STORAGE_KEYS.token);
      localStorage.removeItem(STORAGE_KEYS.user);

      try {
        sessionStorage.setItem(SESSION_EXPIRED_NOTICE_KEY, "1");
      } catch {
        // دسترسی به sessionStorage در حالت خصوصی مرورگر ممکن است بسته باشد.
      }

      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }

    return Promise.reject(error);
  },
);

/**
 * همین قاعده برای پنل مدیریت؛ فقط توکن پنل پاک می‌شود و مدیر باید دوباره
 * وارد شود (توکن مشتری در همان مرورگر دست‌نخورده می‌ماند).
 */
adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const hasToken = localStorage.getItem(STORAGE_KEYS.adminToken) !== null;

    if (axios.isAxiosError(error) && error.response?.status === 401 && hasToken) {
      localStorage.removeItem(STORAGE_KEYS.adminToken);
      localStorage.removeItem(STORAGE_KEYS.adminUser);

      window.dispatchEvent(new Event(ADMIN_SESSION_EXPIRED_EVENT));
    }

    return Promise.reject(error);
  },
);

export { api, adminApi };
export default api;
