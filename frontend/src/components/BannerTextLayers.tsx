import { createElement, useRef } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";

import {
  BANNER_TEXT_SCRIM_CLASS,
  bannerTextLayerStyle,
  isRenderableTextLayer,
  type BannerTextLayer,
  type BannerTextScrim,
  type BannerTextViewport,
} from "../utils/bannerText";

/**
 * لایه‌های متن HTML روی تصویر بنر.
 *
 * متن با تگ واقعی (h1/h2/p/…) رندر می‌شود تا برای سئو و screen reader خوانا
 * باشد؛ متن هیچ‌وقت داخل تصویر پخته نمی‌شود. ظرف این لایه‌ها
 * `container-type: inline-size` دارد تا اندازه‌های نوشته‌شده با `cqw` همراه
 * عرض بنر مقیاس بگیرند.
 *
 * در پنل مدیریت با `interactive` هر لایه با کشیدن ماوس جابه‌جا می‌شود و
 * موقعیت جدید درصدی (نسبت به عرض/ارتفاع بنر) برگردانده می‌شود.
 */
interface BannerTextLayersProps {
  layers: BannerTextLayer[];
  /** نمای فعال؛ موقعیت موبایل وقتی ثبت شده باشد در این نما اعمال می‌شود. */
  viewport?: BannerTextViewport;
  /** پردهٔ تیره اختیاری پشت متن (خوانایی روی تصویرهای شلوغ). */
  scrim?: BannerTextScrim | null;
  /** کلاس ذخیره اضافی برای جابه‌جایی/مخفی‌کردن لایه‌ها در هر نما. */
  className?: string;
  /** حالت ویرایش در پنل: کشیدن لایه‌ها و انتخاب آن‌ها. */
  interactive?: boolean;
  selectedId?: string | null;
  onSelect?: (layerId: string) => void;
  /** موقعیت جدید (درصد از عرض و ارتفاع بنر). */
  onMove?: (layerId: string, position: { x: number; y: number }) => void;
}

const CONTAINER_STYLE: CSSProperties = {
  // بدون این مقدار، واحد cqw به ظرف نزدیک‌تر (مثلاً کل صفحه) اشاره می‌کند.
  containerType: "inline-size",
} as CSSProperties;

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, Number(value.toFixed(2))));
}

function BannerTextLayers({
  layers,
  viewport = "desktop",
  scrim = "none",
  className,
  interactive = false,
  selectedId = null,
  onSelect,
  onMove,
}: BannerTextLayersProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    id: string;
    offsetX: number;
    offsetY: number;
    pointerId: number;
  } | null>(null);

  const visibleLayers = layers.filter(isRenderableTextLayer);
  const scrimClass = BANNER_TEXT_SCRIM_CLASS[scrim ?? "none"] ?? "";

  if (visibleLayers.length === 0) return null;

  function handlePointerDown(
    event: ReactPointerEvent<HTMLElement>,
    layer: BannerTextLayer,
  ) {
    if (!interactive) return;

    onSelect?.(layer.id);

    if (!onMove) return;

    const box = event.currentTarget.getBoundingClientRect();

    dragRef.current = {
      id: layer.id,
      offsetX: event.clientX - box.left,
      offsetY: event.clientY - box.top,
      pointerId: event.pointerId,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
  }

  function handlePointerMove(
    event: ReactPointerEvent<HTMLElement>,
    layer: BannerTextLayer,
  ) {
    const drag = dragRef.current;
    const container = containerRef.current;

    if (!interactive || !onMove || !drag || !container || drag.id !== layer.id) {
      return;
    }

    const area = container.getBoundingClientRect();

    if (area.width === 0 || area.height === 0) return;

    const box = event.currentTarget.getBoundingClientRect();

    const left = Math.min(
      Math.max(0, event.clientX - area.left - drag.offsetX),
      Math.max(0, area.width - box.width),
    );

    const top = Math.min(
      Math.max(0, event.clientY - area.top - drag.offsetY),
      Math.max(0, area.height - box.height),
    );

    onMove(layer.id, {
      x: clampPercent((left / area.width) * 100),
      y: clampPercent((top / area.height) * 100),
    });
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current;

    if (!drag) return;

    if (event.currentTarget.hasPointerCapture?.(drag.pointerId)) {
      event.currentTarget.releasePointerCapture(drag.pointerId);
    }

    dragRef.current = null;
  }

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden ${
        interactive ? "" : "pointer-events-none"
      } ${className ?? ""}`}
      style={CONTAINER_STYLE}
    >
      {scrimClass && <div className={`absolute inset-0 ${scrimClass}`} />}

      {visibleLayers.map((layer) => {
        const isSelected = interactive && selectedId === layer.id;

        return createElement(
          layer.tag,
          {
            key: layer.id,
            className: `absolute whitespace-pre-line ${
              interactive
                ? "cursor-move select-none rounded-sm outline-2 outline-offset-2 outline-dashed"
                : ""
            } ${
              isSelected
                ? "pointer-events-auto outline-stock"
                : interactive
                  ? "pointer-events-auto outline-transparent"
                  : ""
            }`,
            style: bannerTextLayerStyle(layer, viewport),
            onPointerDown: interactive
              ? (event: ReactPointerEvent<HTMLElement>) =>
                  handlePointerDown(event, layer)
              : undefined,
            onPointerMove: interactive
              ? (event: ReactPointerEvent<HTMLElement>) =>
                  handlePointerMove(event, layer)
              : undefined,
            onPointerUp: interactive ? handlePointerUp : undefined,
            onPointerCancel: interactive ? handlePointerUp : undefined,
          },
          layer.text,
        );
      })}
    </div>
  );
}

export default BannerTextLayers;
