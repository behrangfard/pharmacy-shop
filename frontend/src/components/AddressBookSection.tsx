import { useEffect, useState, type FormEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MapPin,
  MapPinned,
  Pencil,
  Plus,
  Save,
  Star,
  Trash2,
  X,
} from "lucide-react";

import AddressMapPicker from "./AddressMapPicker";
import {
  createAddress,
  deleteAddress,
  fetchAddresses,
  setDefaultAddress,
  updateAddress,
  type SavedAddress,
} from "../services/addresses";
import { toEnglishDigits } from "../utils/jalali";

type AddressForm = {
  title: string;
  recipient_name: string;
  phone: string;
  province: string;
  city: string;
  address: string;
  postal_code: string;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
};

const EMPTY_FORM: AddressForm = {
  title: "",
  recipient_name: "",
  phone: "",
  province: "",
  city: "",
  address: "",
  postal_code: "",
  latitude: null,
  longitude: null,
  is_default: false,
};

function toForm(address: SavedAddress): AddressForm {
  return {
    title: address.title ?? "",
    recipient_name: address.recipient_name,
    phone: address.phone,
    province: address.province,
    city: address.city,
    address: address.address,
    postal_code: address.postal_code ?? "",
    latitude: address.latitude,
    longitude: address.longitude,
    is_default: address.is_default,
  };
}

/**
 * دفترچهٔ آدرس حساب کاربری.
 *
 * مشتری می‌تواند هر تعداد آدرس بسازد، یکی را پیش‌فرض کند و موقعیت هر آدرس را
 * روی نقشه انتخاب کند؛ همین آدرس‌ها در صفحهٔ تسویه حساب قابل انتخاب‌اند.
 */
export default function AddressBookSection() {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<AddressForm>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const [busyId, setBusyId] = useState<number | null>(null);
  const [previewId, setPreviewId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const items = await fetchAddresses();

        if (active) {
          setAddresses(items);
        }
      } catch (loadError) {
        console.error("Addresses load error:", loadError);

        if (active) {
          setError("دریافت آدرس‌های ذخیره‌شده با خطا مواجه شد.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const openCreateForm = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, is_default: addresses.length === 0 });
    setFormError("");
    setMessage("");
    setShowMap(false);
    setFormOpen(true);
  };

  const openEditForm = (address: SavedAddress) => {
    setEditingId(address.id);
    setForm(toForm(address));
    setFormError("");
    setMessage("");
    setShowMap(false);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setShowMap(false);
  };

  const updateField = <K extends keyof AddressForm>(
    key: K,
    value: AddressForm[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setFormError("");
    setMessage("");

    const normalizedPhone = toEnglishDigits(form.phone).replace(/\D/g, "");

    if (!form.recipient_name.trim()) {
      setFormError("نام گیرنده را وارد کنید.");
      return;
    }

    if (!/^09\d{9}$/.test(normalizedPhone)) {
      setFormError("شمارهٔ موبایل گیرنده باید با ۰۹ شروع شود و ۱۱ رقم باشد.");
      return;
    }

    if (!form.province.trim() || !form.city.trim()) {
      setFormError("استان و شهر را کامل کنید.");
      return;
    }

    if (!form.address.trim()) {
      setFormError("آدرس کامل محل تحویل را وارد کنید.");
      return;
    }

    const payload = {
      title: form.title.trim() || null,
      recipient_name: form.recipient_name.trim(),
      phone: normalizedPhone,
      province: form.province.trim(),
      city: form.city.trim(),
      address: form.address.trim(),
      postal_code: toEnglishDigits(form.postal_code).replace(/\D/g, "") || null,
      latitude: form.latitude,
      longitude: form.longitude,
      is_default: form.is_default,
    };

    setSaving(true);

    try {
      if (editingId === null) {
        await createAddress(payload);
        setMessage("آدرس جدید ذخیره شد.");
      } else {
        await updateAddress(editingId, payload);
        setMessage("آدرس به‌روزرسانی شد.");
      }

      setAddresses(await fetchAddresses());
      closeForm();
    } catch (submitError: any) {
      console.error("Address save error:", submitError);

      const responseErrors = submitError?.response?.data?.errors;
      const firstError = responseErrors
        ? (Object.values(responseErrors).flat()[0] as string | undefined)
        : undefined;

      setFormError(
        firstError ??
          submitError?.response?.data?.message ??
          "ذخیرهٔ آدرس با خطا مواجه شد.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (address: SavedAddress) => {
    if (!window.confirm("این آدرس حذف شود؟")) {
      return;
    }

    setBusyId(address.id);
    setMessage("");
    setError("");

    try {
      await deleteAddress(address.id);
      setAddresses(await fetchAddresses());
      setMessage("آدرس حذف شد.");

      if (editingId === address.id) {
        closeForm();
      }
    } catch (deleteError) {
      console.error("Address delete error:", deleteError);
      setError("حذف آدرس با خطا مواجه شد.");
    } finally {
      setBusyId(null);
    }
  };

  const handleMakeDefault = async (address: SavedAddress) => {
    setBusyId(address.id);
    setMessage("");
    setError("");

    try {
      await setDefaultAddress(address.id);
      setAddresses(await fetchAddresses());
      setMessage("آدرس پیش‌فرض تغییر کرد.");
    } catch (defaultError) {
      console.error("Address default error:", defaultError);
      setError("تغییر آدرس پیش‌فرض با خطا مواجه شد.");
    } finally {
      setBusyId(null);
    }
  };

  const fullAddressOf = (address: SavedAddress) =>
    address.full_address ??
    [address.province, address.city, address.address]
      .map((part) => (part ?? "").trim())
      .filter(Boolean)
      .join("، ");

  return (
    <div className="bg-white rounded-3xl border border-line shadow-sm p-5 sm:p-7">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <MapPin size={24} />
          </div>

          <div>
            <h2 className="text-xl font-black">آدرس‌های من</h2>

            <p className="text-sm text-muted mt-1">
              {addresses.length > 0
                ? `${addresses.length.toLocaleString("fa-IR")} آدرس ذخیره‌شده برای ارسال سفارش`
                : "برای ارسال سریع‌تر، آدرس‌های خود را ذخیره کنید"}
            </p>
          </div>
        </div>

        {!formOpen && (
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-50 text-brand-600 px-4 py-2 font-bold text-sm"
          >
            <Plus size={17} />
            افزودن آدرس
          </button>
        )}
      </div>

      {message && (
        <div className="mt-5 flex items-center gap-2 bg-brand-50 text-stock-700 rounded-xl p-4 text-sm font-bold">
          <CheckCircle2 size={18} />
          {message}
        </div>
      )}

      {error && (
        <div className="mt-5 flex items-center gap-2 bg-blush-50 text-discount rounded-xl p-4 text-sm font-bold">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-line py-10 text-sm text-muted">
          <Loader2 size={18} className="animate-spin" />
          در حال دریافت آدرس‌ها...
        </div>
      ) : (
        <>
          {addresses.length === 0 && !formOpen && (
            <div className="mt-6 rounded-2xl border border-dashed border-line bg-cream p-6 text-center">
              <MapPinned size={26} className="mx-auto text-muted-soft" />

              <p className="mt-3 font-bold text-ink">
                هنوز آدرسی ذخیره نکرده‌اید.
              </p>

              <p className="mt-1 text-sm text-muted">
                آدرس‌هایتان را اینجا ذخیره کنید تا در صفحهٔ پرداخت با یک کلیک
                انتخاب شوند.
              </p>
            </div>
          )}

          {addresses.length > 0 && (
            <div className="mt-6 space-y-3">
              {addresses.map((address) => (
                <div
                  key={address.id}
                  className="rounded-2xl border border-line bg-cream p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-black text-ink">
                      {address.title || "آدرس"}
                    </p>

                    {address.is_default && (
                      <span className="rounded-full bg-brand-100 px-2 py-1 text-[11px] font-bold text-brand-700">
                        پیش‌فرض
                      </span>
                    )}

                    {address.latitude !== null &&
                      address.longitude !== null && (
                        <span className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-stock-700 border border-line">
                          ثبت‌شده روی نقشه
                        </span>
                      )}
                  </div>

                  <p className="mt-2 text-sm font-bold text-ink-soft">
                    {address.recipient_name}
                    {address.phone ? ` · ${address.phone}` : ""}
                  </p>

                  <p className="mt-1 text-sm leading-6 text-muted">
                    {fullAddressOf(address)}
                  </p>

                  {address.postal_code && (
                    <p className="mt-1 text-xs text-muted">
                      کد پستی: <span dir="ltr">{address.postal_code}</span>
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditForm(address)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-line px-3 py-2 text-xs font-bold text-ink-soft transition hover:border-brand-200 hover:text-brand-700"
                    >
                      <Pencil size={14} />
                      ویرایش
                    </button>

                    {!address.is_default && (
                      <button
                        type="button"
                        onClick={() => handleMakeDefault(address)}
                        disabled={busyId === address.id}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-line px-3 py-2 text-xs font-bold text-ink-soft transition hover:border-brand-200 hover:text-brand-700 disabled:opacity-60"
                      >
                        {busyId === address.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Star size={14} />
                        )}
                        پیش‌فرض
                      </button>
                    )}

                    {address.latitude !== null &&
                      address.longitude !== null && (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewId(
                              previewId === address.id ? null : address.id,
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-line px-3 py-2 text-xs font-bold text-ink-soft transition hover:border-brand-200 hover:text-brand-700"
                        >
                          <MapPinned size={14} />
                          {previewId === address.id
                            ? "بستن نقشه"
                            : "نمایش روی نقشه"}
                        </button>
                      )}

                    <button
                      type="button"
                      onClick={() => handleDelete(address)}
                      disabled={busyId === address.id}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blush-50 px-3 py-2 text-xs font-bold text-discount transition hover:bg-blush-100 disabled:opacity-60"
                    >
                      {busyId === address.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                      حذف
                    </button>
                  </div>

                  {previewId === address.id &&
                    address.latitude !== null &&
                    address.longitude !== null && (
                      <AddressMapPicker
                        className="mt-3"
                        readOnly
                        height={200}
                        latitude={address.latitude}
                        longitude={address.longitude}
                      />
                    )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {formOpen && (
        <form
          onSubmit={handleSubmit}
          className="mt-6 rounded-2xl border border-brand-200 bg-brand-50/50 p-4 sm:p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="font-black text-ink">
              {editingId === null ? "افزودن آدرس جدید" : "ویرایش آدرس"}
            </p>

            <button
              type="button"
              onClick={closeForm}
              className="inline-flex items-center gap-1 text-xs font-bold text-muted transition hover:text-discount"
            >
              <X size={15} />
              بستن
            </button>
          </div>

          {formError && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-blush-50 p-3 text-xs font-bold text-discount">
              <AlertCircle size={16} />
              {formError}
            </div>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="address-title"
                className="mb-1.5 block text-xs font-bold text-ink-soft"
              >
                عنوان آدرس (اختیاری)
              </label>

              <input
                id="address-title"
                type="text"
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                placeholder="خانه، محل کار، ..."
                maxLength={60}
                className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>

            <div>
              <label
                htmlFor="address-recipient"
                className="mb-1.5 block text-xs font-bold text-ink-soft"
              >
                نام گیرنده
              </label>

              <input
                id="address-recipient"
                type="text"
                value={form.recipient_name}
                onChange={(event) =>
                  updateField("recipient_name", event.target.value)
                }
                placeholder="نام و نام خانوادگی"
                className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>

            <div>
              <label
                htmlFor="address-phone"
                className="mb-1.5 block text-xs font-bold text-ink-soft"
              >
                شمارهٔ موبایل گیرنده
              </label>

              <input
                id="address-phone"
                type="tel"
                dir="ltr"
                value={form.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                placeholder="09121234567"
                maxLength={15}
                className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-left outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>

            <div>
              <label
                htmlFor="address-province"
                className="mb-1.5 block text-xs font-bold text-ink-soft"
              >
                استان
              </label>

              <input
                id="address-province"
                type="text"
                value={form.province}
                onChange={(event) => updateField("province", event.target.value)}
                placeholder="تهران"
                className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>

            <div>
              <label
                htmlFor="address-city"
                className="mb-1.5 block text-xs font-bold text-ink-soft"
              >
                شهر
              </label>

              <input
                id="address-city"
                type="text"
                value={form.city}
                onChange={(event) => updateField("city", event.target.value)}
                placeholder="تهران"
                className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>

            <div>
              <label
                htmlFor="address-postal-code"
                className="mb-1.5 block text-xs font-bold text-ink-soft"
              >
                کد پستی (اختیاری)
              </label>

              <input
                id="address-postal-code"
                type="text"
                dir="ltr"
                value={form.postal_code}
                onChange={(event) =>
                  updateField("postal_code", event.target.value)
                }
                maxLength={10}
                placeholder="1234567890"
                className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-left outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="address-line"
                className="mb-1.5 block text-xs font-bold text-ink-soft"
              >
                آدرس کامل
              </label>

              <textarea
                id="address-line"
                value={form.address}
                onChange={(event) => updateField("address", event.target.value)}
                rows={3}
                placeholder="خیابان، کوچه، پلاک، واحد"
                className="w-full resize-none rounded-xl border border-line bg-white px-4 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>

          <label className="mt-4 flex items-center gap-2 text-xs font-bold text-ink-soft">
            <input
              type="checkbox"
              checked={form.is_default}
              onChange={(event) =>
                updateField("is_default", event.target.checked)
              }
              className="h-4 w-4 rounded border-line accent-brand-600"
            />
            این آدرس، آدرس پیش‌فرض من باشد
          </label>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowMap((current) => !current)}
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-xs font-bold text-ink-soft transition hover:border-brand-200 hover:text-brand-700"
            >
              <MapPinned size={15} />
              {showMap ? "بستن نقشه" : "انتخاب موقعیت روی نقشه"}
            </button>

            {form.latitude !== null && form.longitude !== null && (
              <span className="text-[11px] text-muted" dir="ltr">
                {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
              </span>
            )}
          </div>

          {showMap && (
            <AddressMapPicker
              className="mt-3"
              latitude={form.latitude}
              longitude={form.longitude}
              onChange={({ latitude, longitude }) => {
                updateField("latitude", latitude);
                updateField("longitude", longitude);
              }}
              onResolve={(parts) => {
                if (parts.address) {
                  updateField("address", parts.address);
                }

                if (parts.city) {
                  updateField("city", parts.city);
                }

                if (parts.province) {
                  updateField("province", parts.province);
                }

                if (parts.postal_code) {
                  updateField(
                    "postal_code",
                    toEnglishDigits(parts.postal_code)
                      .replace(/\D/g, "")
                      .slice(0, 10),
                  );
                }
              }}
            />
          )}

          <div className="mt-5 flex flex-col sm:flex-row gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 font-bold text-white disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 size={19} className="animate-spin" />
                  در حال ذخیره...
                </>
              ) : (
                <>
                  <Save size={19} />
                  ذخیرهٔ آدرس
                </>
              )}
            </button>

            <button
              type="button"
              onClick={closeForm}
              className="rounded-xl bg-line px-5 py-3 font-bold text-ink-soft"
            >
              انصراف
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

