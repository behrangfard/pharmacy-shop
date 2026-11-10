import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2, LocateFixed, MapPin, MapPinned } from "lucide-react";

const DEFAULT_CENTER: [number, number] = [35.6892, 51.389];

const MARKER_STYLE: L.CircleMarkerOptions = {
  radius: 9,
  color: "#ffffff",
  weight: 3,
  fillColor: "#0f766e",
  fillOpacity: 1,
};

/**
 * بخش‌هایی از آدرس که از سرویس نقشه خوانده می‌شود.
 */
export type ResolvedAddressParts = {
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string | null;
};

type AddressMapPickerProps = {
  latitude: number | null;
  longitude: number | null;
  onChange?: (coordinates: { latitude: number; longitude: number }) => void;
  /**
   * در صورت تعریف، دکمهٔ «گرفتن آدرس از نقشه» نمایش داده می‌شود و نتیجهٔ
   * ژئوکدینگ معکوس به این تابع داده می‌شود تا فرم آدرس پر شود.
   */
  onResolve?: (parts: ResolvedAddressParts) => void;
  /** نمایش فقط‌خواندنی؛ برای پیش‌نمایش موقعیت آدرس ذخیره‌شده. */
  readOnly?: boolean;
  height?: number;
  className?: string;
};

function isValidCoordinate(latitude: number | null, longitude: number | null) {
  return (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  );
}

/**
 * انتخاب موقعیت روی نقشه (OpenStreetMap).
 *
 * کاربر می‌تواند با کلیک روی نقشه یا دکمهٔ «موقعیت من» مختصات را انتخاب کند؛
 * در صورت اتصال به اینترنت، آدرس تقریبی هم از روی نقطه خوانده می‌شود.
 */
export default function AddressMapPicker({
  latitude,
  longitude,
  onChange,
  onResolve,
  readOnly = false,
  height = 260,
  className = "",
}: AddressMapPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [locating, setLocating] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [message, setMessage] = useState("");

  const hasCoordinates = isValidCoordinate(latitude, longitude);

  useEffect(() => {
    const container = containerRef.current;

    // نمایش فقط‌خواندنی بدون مختصات معنا ندارد؛ حالت قابل‌ویرایش همیشه نقشه
    // را نشان می‌دهد تا کاربر بتواند نقطه را انتخاب کند.
    if (!container || mapRef.current || (readOnly && !hasCoordinates)) {
      return;
    }

    const center: [number, number] = hasCoordinates
      ? [latitude as number, longitude as number]
      : DEFAULT_CENTER;

    const map = L.map(container, {
      center,
      zoom: hasCoordinates ? 16 : 11,
      zoomControl: !readOnly,
      dragging: !readOnly,
      // در حالت انتخاب موقعیت، اسکرول ماوس روی نقشه زوم می‌کند.
      scrollWheelZoom: !readOnly,
      wheelDebounceTime: 40,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(map);

    if (hasCoordinates) {
      markerRef.current = L.circleMarker(center, MARKER_STYLE).addTo(map);
    }

    if (!readOnly) {
      map.on("click", (event: L.LeafletMouseEvent) => {
        const { lat, lng } = event.latlng;

        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          markerRef.current = L.circleMarker([lat, lng], MARKER_STYLE).addTo(
            map,
          );
        }

        setMessage("");

        onChangeRef.current?.({
          latitude: Number(lat.toFixed(7)),
          longitude: Number(lng.toFixed(7)),
        });
      });
    }

    mapRef.current = map;

    // اندازهٔ نقشه بعد از چیده‌شدن کارت مشخص می‌شود.
    const resizeTimer = window.setTimeout(() => map.invalidateSize(), 120);

    return () => {
      window.clearTimeout(resizeTimer);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // نقشه فقط یک بار برای هر تغییر وضعیت مختصات ساخته می‌شود.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCoordinates, readOnly]);

  // ساخت یا جابه‌جایی نشانگر وقتی مختصات از بیرون (فرم) تغییر می‌کند.
  useEffect(() => {
    const map = mapRef.current;

    if (!map || !hasCoordinates) {
      return;
    }

    const position: [number, number] = [
      latitude as number,
      longitude as number,
    ];

    if (!markerRef.current) {
      markerRef.current = L.circleMarker(position, MARKER_STYLE).addTo(map);
      map.setView(position, 16);

      return;
    }

    markerRef.current.setLatLng(position);
    map.setView(position, map.getZoom());
  }, [latitude, longitude, hasCoordinates]);

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setMessage("مرورگر شما از موقعیت‌یابی پشتیبانی نمی‌کند.");
      return;
    }

    setLocating(true);
    setMessage("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLatitude = Number(position.coords.latitude.toFixed(7));
        const nextLongitude = Number(position.coords.longitude.toFixed(7));

        onChangeRef.current?.({
          latitude: nextLatitude,
          longitude: nextLongitude,
        });

        mapRef.current?.setView([nextLatitude, nextLongitude], 16);
        setLocating(false);
      },
      () => {
        setMessage("دسترسی به موقعیت مکانی ممکن نشد.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleResolve = async () => {
    if (!onResolve || !hasCoordinates) {
      return;
    }

    setResolving(true);
    setMessage("");

    try {
      const url =
        "https://nominatim.openstreetmap.org/reverse?format=jsonv2" +
        `&lat=${latitude}&lon=${longitude}&accept-language=fa`;

      const response = await fetch(url, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error("reverse geocode failed");
      }

      const result = await response.json();
      const parts = result?.address ?? {};

      const city =
        parts.city ??
        parts.town ??
        parts.village ??
        parts.municipality ??
        parts.county ??
        "";

      const road = [
        parts.road ?? parts.pedestrian ?? "",
        parts.house_number ?? "",
      ]
        .filter(Boolean)
        .join("، ");

      onResolve({
        address: road || parts.neighbourhood || parts.suburb || undefined,
        city: city || undefined,
        province: parts.state ?? parts.province ?? undefined,
        postal_code: parts.postcode ? String(parts.postcode) : null,
      });

      setMessage("آدرس از روی نقشه خوانده شد؛ در صورت نیاز آن را کامل کنید.");
    } catch {
      setMessage(
        "دریافت آدرس از نقشه ممکن نشد. لطفاً آدرس را دستی تکمیل کنید.",
      );
    } finally {
      setResolving(false);
    }
  };

  if (readOnly && !hasCoordinates) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-cream px-4 py-8 text-center text-xs text-muted ${className}`}
      >
        <MapPin size={22} className="text-muted-soft" />
        موقعیتی برای این آدرس روی نقشه ثبت نشده است.
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        ref={containerRef}
        style={{ height }}
        className="relative isolate z-0 w-full overflow-hidden rounded-2xl border border-line"
        aria-label="نقشهٔ انتخاب موقعیت آدرس"
      />

      {!readOnly && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleLocate}
            disabled={locating}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-xs font-bold text-ink-soft transition hover:border-brand-200 hover:text-brand-700 disabled:opacity-60"
          >
            {locating ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <LocateFixed size={15} />
            )}
            موقعیت من
          </button>

          {onResolve && (
            <button
              type="button"
              onClick={handleResolve}
              disabled={resolving}
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-xs font-bold text-ink-soft transition hover:border-brand-200 hover:text-brand-700 disabled:opacity-60"
            >
              {resolving ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <MapPinned size={15} />
              )}
              گرفتن آدرس از نقشه
            </button>
          )}

          <span className="text-[11px] text-muted-soft">
            {hasCoordinates
              ? "با کلیک روی نقشه محل دقیق را انتخاب کنید."
              : "روی نقشه کلیک کنید تا موقعیت آدرس انتخاب شود."}
          </span>
        </div>
      )}

      {message && (
        <p className="mt-2 text-[11px] leading-5 text-muted">{message}</p>
      )}
    </div>
  );
}

