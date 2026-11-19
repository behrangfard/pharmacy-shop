import { describe, expect, it } from "vitest";
import { AxiosError } from "axios";

import api, {
  adminApi,
  ADMIN_SESSION_EXPIRED_EVENT,
  consumeSessionExpiredNotice,
  SESSION_EXPIRED_EVENT,
} from "./api";
import { STORAGE_KEYS } from "../utils/storageKeys";

/**
 * هدرهای خودکار لایهٔ API.
 *
 * قواعد سمت کلاینت که سرور روی آن‌ها حساب باز می‌کند:
 * - توکن کاربر (اگر هست) همیشه `Authorization: Bearer` می‌شود و هدر مهمان
 *   حذف می‌شود (اولویت با کاربر واردشده است).
 * - هدر `X-Guest-Token` (شناسهٔ مرورگر مهمان) فقط روی مسیرهای سفارش فرستاده
 *   می‌شود، نه همهٔ درخواست‌ها.
 * - پنل مدیریت توکن خودش را از کلید `adminToken` می‌خواند.
 *
 * برای بررسی هدرها، adapter موقت ثبت می‌شود تا درخواست بعد از اجرای همهٔ
 * interceptorهای ماژول (جایی که هدر نهایی مشخص است) متوقف شود و به شبکه نرود.
 */
type CapturedConfig = {
  headers?: unknown;
};

async function captureConfig(
  client: typeof api,
  url: string,
): Promise<CapturedConfig> {
  const state: { config: CapturedConfig | null } = { config: null };

  const originalAdapter = client.defaults.adapter;

  client.defaults.adapter = async (config) => {
    state.config = config as unknown as CapturedConfig;

    return {
      data: {},
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    };
  };

  try {
    await client.get(url);
  } finally {
    client.defaults.adapter = originalAdapter;
  }

  if (!state.config) {
    throw new Error("request was not captured");
  }

  return state.config;
}

function headerValue(
  config: CapturedConfig,
  name: string,
): string | undefined {
  const headers = config.headers as
    | {
        get?: (key: string) => unknown;
        [key: string]: unknown;
      }
    | undefined;

  if (!headers) {
    return undefined;
  }

  const value =
    typeof headers.get === "function" ? headers.get(name) : headers[name];

  return typeof value === "string" ? value : undefined;
}

describe("services/api (api)", () => {
  it("sends the user bearer token and drops the guest header", async () => {
    localStorage.setItem(STORAGE_KEYS.token, "user-token-1");
    localStorage.setItem(STORAGE_KEYS.guestToken, "guest-token-1");

    const config = await captureConfig(api, "/orders");

    expect(headerValue(config, "Authorization")).toBe("Bearer user-token-1");
    expect(headerValue(config, "X-Guest-Token")).toBeUndefined();
  });

  it("sends the guest token only on order routes", async () => {
    localStorage.setItem(STORAGE_KEYS.guestToken, "guest-token-1");

    const orderConfig = await captureConfig(api, "/orders");

    expect(headerValue(orderConfig, "Authorization")).toBeUndefined();
    expect(headerValue(orderConfig, "X-Guest-Token")).toBe("guest-token-1");

    const productConfig = await captureConfig(api, "/products");

    expect(headerValue(productConfig, "X-Guest-Token")).toBeUndefined();
  });

  it("sends no auth headers without token and guest token", async () => {
    const config = await captureConfig(api, "/orders");

    expect(headerValue(config, "Authorization")).toBeUndefined();
    expect(headerValue(config, "X-Guest-Token")).toBeUndefined();
  });

  it("keeps the guest header on nested order routes", async () => {
    localStorage.setItem(STORAGE_KEYS.guestToken, "guest-token-1");

    const config = await captureConfig(api, "/orders/ORD-1/cancel");

    expect(headerValue(config, "X-Guest-Token")).toBe("guest-token-1");
  });
});

describe("services/api (adminApi)", () => {
  it("sends the admin bearer token", async () => {
    localStorage.setItem(STORAGE_KEYS.adminToken, "admin-token-1");

    const config = await captureConfig(adminApi, "/admin/orders");

    expect(headerValue(config, "Authorization")).toBe("Bearer admin-token-1");
  });

  it("sends no Authorization header without an admin token", async () => {
    const config = await captureConfig(adminApi, "/admin/orders");

    expect(headerValue(config, "Authorization")).toBeUndefined();
  });
});

/**
 * پاسخ ۴۰۱ یعنی توکن منقضی یا باطل شده است؛ لایهٔ API باید نشست را پاک کند و
 * رویداد بدهد (تا Contextها و صفحهٔ ورود واکنش نشان دهند).
 */
function withUnauthorized<T>(
  client: typeof api,
  run: () => Promise<T>,
): Promise<T> {
  const originalAdapter = client.defaults.adapter;

  client.defaults.adapter = async (config) => {
    throw new AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, undefined, {
      data: {},
      status: 401,
      statusText: "Unauthorized",
      headers: {},
      config,
    });
  };

  return run().finally(() => {
    client.defaults.adapter = originalAdapter;
  });
}

function collectEvents(eventName: string): {
  events: string[];
  stop: () => void;
} {
  const events: string[] = [];
  const listener = () => events.push(eventName);

  window.addEventListener(eventName, listener);

  return {
    events,
    stop: () => window.removeEventListener(eventName, listener),
  };
}

describe("services/api (session expiry)", () => {
  it("clears the customer session and notifies on 401", async () => {
    localStorage.setItem(STORAGE_KEYS.token, "expired-token");
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify({ id: 1 }));

    const watcher = collectEvents(SESSION_EXPIRED_EVENT);

    try {
      await expect(
        withUnauthorized(api, () => api.get("/auth/me")),
      ).rejects.toBeInstanceOf(AxiosError);
    } finally {
      watcher.stop();
    }

    expect(localStorage.getItem(STORAGE_KEYS.token)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.user)).toBeNull();
    expect(watcher.events).toHaveLength(1);

    // پیام فقط یک‌بار به صفحهٔ ورود داده می‌شود.
    expect(consumeSessionExpiredNotice()).toContain("نشست شما");
    expect(consumeSessionExpiredNotice()).toBe("");
  });

  it("does not touch storage when a request fails without a session", async () => {
    localStorage.setItem(STORAGE_KEYS.cart, "[]");

    const watcher = collectEvents(SESSION_EXPIRED_EVENT);

    try {
      await expect(
        withUnauthorized(api, () => api.get("/auth/login")),
      ).rejects.toBeInstanceOf(AxiosError);
    } finally {
      watcher.stop();
    }

    expect(localStorage.getItem(STORAGE_KEYS.cart)).toBe("[]");
    expect(localStorage.getItem(STORAGE_KEYS.token)).toBeNull();
    expect(watcher.events).toHaveLength(0);
    expect(consumeSessionExpiredNotice()).toBe("");
  });

  it("clears only the admin session on 401 from the panel", async () => {
    localStorage.setItem(STORAGE_KEYS.adminToken, "expired-admin-token");
    localStorage.setItem(STORAGE_KEYS.token, "customer-token");

    const watcher = collectEvents(ADMIN_SESSION_EXPIRED_EVENT);

    try {
      await expect(
        withUnauthorized(adminApi, () => adminApi.get("/admin/orders")),
      ).rejects.toBeInstanceOf(AxiosError);
    } finally {
      watcher.stop();
    }

    expect(localStorage.getItem(STORAGE_KEYS.adminToken)).toBeNull();
    // نشست مشتری در همان مرورگر نباید قربانی ۴۰۱ پنل شود.
    expect(localStorage.getItem(STORAGE_KEYS.token)).toBe("customer-token");
    expect(watcher.events).toHaveLength(1);
  });
});
