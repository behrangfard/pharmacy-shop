import axios from "axios";

const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() ||
  "http://127.0.0.1:8000/api/v1";

const baseURL = API_BASE_URL.replace(/\/+$/, "");

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
    const token = localStorage.getItem("pharmacy-shop-token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

adminApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("pharmacy-shop-admin-token");

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
