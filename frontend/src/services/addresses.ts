import api from "./api";

/**
 * آدرس ذخیره‌شده در دفترچهٔ آدرس مشتری.
 */
export interface SavedAddress {
  id: number;
  title: string | null;
  recipient_name: string;
  phone: string;
  province: string;
  city: string;
  address: string;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
  full_address?: string | null;
}

export type AddressPayload = {
  title?: string | null;
  recipient_name: string;
  phone: string;
  province: string;
  city: string;
  address: string;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_default?: boolean;
};

/**
 * پاسخ سرور ممکن است بدنهٔ ساده یا `{ data: ... }` باشد؛ هر دو پوشش داده
 * می‌شود تا صفحه به شکل پاسخ حساس نباشد.
 */
function unwrap<T>(payload: any): T | null {
  if (!payload) {
    return null;
  }

  return (payload.data ?? payload) as T;
}

function normalizeAddress(value: any): SavedAddress | null {
  if (!value || typeof value !== "object" || typeof value.id !== "number") {
    return null;
  }

  return {
    id: value.id,
    title: value.title ?? null,
    recipient_name: String(value.recipient_name ?? ""),
    phone: String(value.phone ?? ""),
    province: String(value.province ?? ""),
    city: String(value.city ?? ""),
    address: String(value.address ?? ""),
    postal_code: value.postal_code ?? null,
    latitude:
      value.latitude === null || value.latitude === undefined
        ? null
        : Number(value.latitude),
    longitude:
      value.longitude === null || value.longitude === undefined
        ? null
        : Number(value.longitude),
    is_default: Boolean(value.is_default),
    full_address: value.full_address ?? null,
  };
}

/**
 * فهرست آدرس‌های کاربر وارد‌شده (پیش‌فرض اول).
 */
export async function fetchAddresses(): Promise<SavedAddress[]> {
  const response = await api.get("/addresses");
  const items = unwrap<{ items?: unknown[] }>(response.data)?.items;

  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map(normalizeAddress)
    .filter((address): address is SavedAddress => address !== null);
}

export async function createAddress(
  payload: AddressPayload,
): Promise<SavedAddress | null> {
  const response = await api.post("/addresses", payload);

  return normalizeAddress(unwrap<unknown>(response.data));
}

export async function updateAddress(
  id: number,
  payload: AddressPayload,
): Promise<SavedAddress | null> {
  const response = await api.put(`/addresses/${id}`, payload);

  return normalizeAddress(unwrap<unknown>(response.data));
}

export async function deleteAddress(id: number): Promise<void> {
  await api.delete(`/addresses/${id}`);
}

export async function setDefaultAddress(id: number): Promise<void> {
  await api.patch(`/addresses/${id}/default`);
}
