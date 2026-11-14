import axios from "axios";

import { API_BASE_URL } from "../utils/apiOrigin";
import { STORAGE_KEYS } from "../utils/storageKeys";

const baseURL = API_BASE_URL;

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

export { api, adminApi };
export default api;
