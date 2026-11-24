import { adminApi } from "./api";

/** ردیف یک گروهبندی تحلیلی (منبع، نوع ترافیک، کمپین، محتوا یا ارجاع‌دهنده). */
export interface TrafficRow {
  orders_count: number;
  revenue: number;
  average_order_total: number;
  revenue_share: number;
}

export interface TrafficSourceRow extends TrafficRow {
  source: string;
}

export interface TrafficMediumRow extends TrafficRow {
  medium: string;
}

export interface TrafficCampaignRow extends TrafficRow {
  source: string;
  medium: string;
  campaign: string;
}

export interface TrafficContentRow extends TrafficRow {
  content: string;
}

export interface TrafficReferrerRow extends TrafficRow {
  host: string;
}

export interface TrafficAnalytics {
  range: { days: number; from: string; to: string };
  summary: {
    orders_count: number;
    revenue: number;
    average_order_total: number;
    utm_orders_count: number;
    utm_order_share: number;
    tracked_orders_count: number;
    tracked_order_share: number;
    direct_orders_count: number;
    direct_order_share: number;
  };
  sources: TrafficSourceRow[];
  mediums: TrafficMediumRow[];
  campaigns: TrafficCampaignRow[];
  contents: TrafficContentRow[];
  referrers: TrafficReferrerRow[];
}

/** کلید ردیف بدون مقدار (ترافیک مستقیم یا ناشناخته) که سرور برمی‌گرداند. */
export const DIRECT_ATTRIBUTION_KEY = "(direct)";

/** نمایش فارسی مقدار انتساب؛ مقادیر خالی روی سفارش «مستقیم» خوانده می‌شوند. */
export function attributionLabel(value: string): string {
  return value === DIRECT_ATTRIBUTION_KEY ? "مستقیم / نامشخص" : value;
}

/**
 * تحلیل ترافیک/کمپین‌های پنل: فروش به تفکیک منبع و کمپین از روی سفارش‌ها.
 */
export async function fetchTrafficAnalytics(
  days: number,
): Promise<TrafficAnalytics> {
  const response = await adminApi.get("/admin/analytics/traffic", {
    params: { days },
  });

  const data = response.data?.data as TrafficAnalytics | undefined;

  if (!data?.summary) {
    throw new Error("ساختار پاسخ تحلیل ترافیک معتبر نیست.");
  }

  return data;
}
