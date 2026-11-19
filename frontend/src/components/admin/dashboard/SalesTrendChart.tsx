import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ChartNoAxesCombined,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { adminApi } from "../../../services/api";
import {
  faDayMonthFormat,
  faFullDateFormat,
  faMonthFormat,
  faMonthYearFormat,
  faWeekdayFormat,
  formatCompactPrice,
  formatNumber,
  formatPrice,
  parseDateValue,
  salesTrendRanges,
  type SalesTrendData,
  type SalesTrendPoint,
  type SalesTrendRange,
} from "./dashboardShared";

/** منحنی نرم (Catmull-Rom) با کنترل نقاط خارج از محدوده نمودار. */
function buildSmoothPath(
  points: { x: number; y: number }[],
  minY: number,
  maxY: number,
) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  const clamp = (value: number) => Math.min(maxY, Math.max(minY, value));
  const tension = 0.18;
  let path = `M ${points[0].x} ${points[0].y}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[index - 1] ?? points[index];
    const current = points[index];
    const next = points[index + 1];
    const after = points[index + 2] ?? next;

    const control1X = current.x + (next.x - previous.x) * tension;
    const control1Y = clamp(current.y + (next.y - previous.y) * tension);
    const control2X = next.x - (after.x - current.x) * tension;
    const control2Y = clamp(next.y - (after.y - current.y) * tension);

    path += ` C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${next.x} ${next.y}`;
  }

  return path;
}

export function SalesTrendChart() {
  const [range, setRange] = useState<SalesTrendRange>("7d");
  const [trend, setTrend] = useState<SalesTrendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    setLoading(true);
    setError("");
    setActiveIndex(null);

    adminApi
      .get<{ success: boolean; data: SalesTrendData }>(
        "/admin/dashboard/sales-trend",
        { params: { range }, signal: controller.signal },
      )
      .then((response) => {
        if (cancelled) return;
        setTrend(response.data.data);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("دریافت آمار روند فروش انجام نشد. دوباره تلاش کن.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [range, reloadToken]);

  const points = trend?.points ?? [];
  const values = points.map((point) => Math.max(0, Number(point.sales) || 0));
  const totalSales = values.reduce((sum, value) => sum + value, 0);
  const summary = trend?.summary ?? null;
  const totalOrders = Number(summary?.total_orders ?? 0);
  const averageSales = Number(summary?.average_sales ?? 0);
  const changePercent =
    typeof summary?.change_percent === "number" ? summary.change_percent : null;
  const peakPoint = summary?.peak ?? null;
  const hasData = points.length > 0 && totalSales > 0;
  const isMonthly = trend?.granularity === "month";
  const activeRangeOption = salesTrendRanges.find(
    (option) => option.value === range,
  );

  const chartWrapRef = useRef<HTMLDivElement | null>(null);
  const [chartSize, setChartSize] = useState({ width: 760, height: 320 });

  useEffect(() => {
    const element = chartWrapRef.current;

    if (!element || typeof ResizeObserver === "undefined") return;

    const updateSize = (width: number, height: number) => {
      if (width < 1 || height < 1) return;

      setChartSize({
        width: Math.round(width),
        height: Math.round(height),
      });
    };

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      updateSize(entry.contentRect.width, entry.contentRect.height);
    });

    observer.observe(element);
    updateSize(element.clientWidth, element.clientHeight);

    return () => observer.disconnect();
  }, [hasData]);

  const canvasWidth = chartSize.width;
  const canvasHeight = chartSize.height;
  const padding =
    canvasWidth < 560
      ? { top: 18, right: 68, bottom: 36, left: 10 }
      : { top: 20, right: 86, bottom: 40, left: 14 };
  const { top, right, bottom, left } = padding;
  const chartWidth = Math.max(160, canvasWidth - left - right);
  const chartHeight = Math.max(90, canvasHeight - top - bottom);
  const plotBottom = top + chartHeight;
  const maxValue = values.length > 0 ? Math.max(...values) : 0;
  const upperBound = maxValue > 0 ? maxValue * 1.12 : 1;
  const tickCount = 4;
  const step = points.length > 1 ? chartWidth / (points.length - 1) : 0;

  const chartPoints = points.map((point, index) => {
    const value = values[index];
    const x = points.length <= 1 ? left + chartWidth / 2 : left + step * index;
    const y = top + chartHeight - (value / upperBound) * chartHeight;

    return {
      x,
      y,
      value,
      index,
      key: point.key,
      date: point.date,
      orders: point.orders,
    };
  });

  const linePath = buildSmoothPath(chartPoints, top, plotBottom);
  const lastChartPoint = chartPoints[chartPoints.length - 1];
  const areaPath =
    chartPoints.length > 0
      ? `${linePath} L ${lastChartPoint.x} ${plotBottom} L ${chartPoints[0].x} ${plotBottom} Z`
      : "";
  const labelsThatFit = Math.max(2, Math.floor(chartWidth / 56));
  const labelStep = Math.max(1, Math.ceil(points.length / labelsThatFit));
  const activePoint =
    activeIndex === null ? null : (chartPoints[activeIndex] ?? null);
  const detailPoint: SalesTrendPoint | null = activePoint
    ? (points[activePoint.index] ?? null)
    : peakPoint;
  const detailValue = detailPoint ? Number(detailPoint.sales) || 0 : 0;
  const detailAverage =
    detailPoint && detailPoint.orders > 0
      ? detailValue / detailPoint.orders
      : 0;

  const formatPointDate = (point: SalesTrendPoint) =>
    isMonthly
      ? faMonthYearFormat.format(parseDateValue(point.date))
      : faFullDateFormat.format(parseDateValue(point.date));

  const formatAxisLabel = (index: number) => {
    const date = parseDateValue(points[index].date);

    if (isMonthly) return faMonthFormat.format(date);
    if (points.length <= 7) return faWeekdayFormat.format(date);

    return faDayMonthFormat.format(date);
  };

  return (
    <div className="dashboard-trend">
      <div className="dashboard-trend-head">
        <div className="dashboard-trend-headline">
          <span className="dashboard-trend-headline-label">مجموع فروش بازه</span>
          <strong className="dashboard-trend-headline-value">
            {hasData ? formatPrice(totalSales) : "—"}
          </strong>
          {!loading && changePercent !== null && (
            <span
              className={`dashboard-trend-change ${
                changePercent > 0
                  ? "is-up"
                  : changePercent < 0
                    ? "is-down"
                    : "is-neutral"
              }`}
            >
              {changePercent > 0 ? (
                <TrendingUp size={12} aria-hidden="true" />
              ) : changePercent < 0 ? (
                <TrendingDown size={12} aria-hidden="true" />
              ) : (
                <Activity size={12} aria-hidden="true" />
              )}
              {`${changePercent > 0 ? "+" : ""}${formatNumber(changePercent)}٪`}
              <small>نسبت به بازه قبل</small>
            </span>
          )}
          {!loading && changePercent === null && hasData && (
            <span className="dashboard-trend-change is-neutral">
              <Activity size={12} aria-hidden="true" />
              بدون فروش در بازه قبل
            </span>
          )}
        </div>

        <div
          className="dashboard-trend-tabs"
          role="tablist"
          aria-label="بازه زمانی نمودار فروش"
        >
          {salesTrendRanges.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={option.value === range}
              title={option.caption}
              className={`dashboard-trend-tab ${
                option.value === range ? "is-active" : ""
              }`}
              onClick={() => setRange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {hasData && (
        <div className="dashboard-trend-meta">
          <span>
            <i /> {activeRangeOption?.caption}
          </span>
          <span>
            <strong>{formatNumber(totalOrders)}</strong> سفارش پرداخت‌شده
          </span>
          <span>
            میانگین هر {isMonthly ? "ماه" : "روز"}:{" "}
            <strong>{formatPrice(Math.round(averageSales))}</strong>
          </span>
          {peakPoint && (
            <span>
              اوج فروش: <strong>{formatPointDate(peakPoint)}</strong>
            </span>
          )}
        </div>
      )}

      {loading ? (
        <div
          className="dashboard-trend-skeleton"
          role="status"
          aria-label="در حال دریافت نمودار روند فروش"
        >
          <span />
          <span />
          <span />
        </div>
      ) : error ? (
        <div className="dashboard-trend-error" role="alert">
          <XCircle size={17} aria-hidden="true" />
          <p>{error}</p>
          <button
            type="button"
            onClick={() => setReloadToken((token) => token + 1)}
          >
            تلاش دوباره
          </button>
        </div>
      ) : !hasData ? (
        <div className="dashboard-trend-empty">
          <ChartNoAxesCombined size={20} aria-hidden="true" />
          <p>در این بازه فروش پرداخت‌شده‌ای ثبت نشده است.</p>
          <span>
            بازه زمانی دیگری را انتخاب کن یا منتظر ثبت سفارش‌های جدید بمان.
          </span>
        </div>
      ) : (
        <>
          <div
            className="dashboard-chart-wrap dashboard-trend-chart-wrap"
            ref={chartWrapRef}
          >
            <svg
              className="dashboard-chart-svg"
              viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
              role="img"
              aria-label={`نمودار روند فروش، ${activeRangeOption?.caption}`}
              preserveAspectRatio="xMidYMid meet"
              onPointerLeave={() => setActiveIndex(null)}
            >
              <title>{`روند فروش ${activeRangeOption?.caption}`}</title>
              <defs>
                <linearGradient id="mehrTrendArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6f9773" stopOpacity="0.3" />
                  <stop offset="55%" stopColor="#6f9773" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#6f9773" stopOpacity="0.01" />
                </linearGradient>
                <linearGradient id="mehrTrendLine" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#9ab894" />
                  <stop offset="100%" stopColor="#43714f" />
                </linearGradient>
              </defs>

              {Array.from({ length: tickCount + 1 }, (_, index) => {
                const value = (upperBound / tickCount) * index;
                const y = plotBottom - (index / tickCount) * chartHeight;

                return (
                  <g key={`trend-tick-${index}`}>
                    <line
                      x1={left}
                      x2={left + chartWidth}
                      y1={y}
                      y2={y}
                      className={
                        index === 0
                          ? "dashboard-chart-axis"
                          : "dashboard-chart-gridline"
                      }
                    />
                    <text
                      x={left + chartWidth + 12}
                      y={y + 3.5}
                      textAnchor="start"
                      className="dashboard-chart-label"
                    >
                      {formatCompactPrice(value)}
                    </text>
                  </g>
                );
              })}

              <path d={areaPath} fill="url(#mehrTrendArea)" />
              <path
                d={linePath}
                fill="none"
                stroke="url(#mehrTrendLine)"
                strokeWidth={2.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {points.length <= 7 &&
                chartPoints.map((point) => (
                  <circle
                    key={`trend-dot-${point.key}`}
                    cx={point.x}
                    cy={point.y}
                    r={2.9}
                    fill="#fff"
                    stroke="#5c8564"
                    strokeWidth={1.8}
                  />
                ))}

              {activePoint && (
                <g>
                  <line
                    x1={activePoint.x}
                    x2={activePoint.x}
                    y1={top}
                    y2={plotBottom}
                    stroke="#9fbca4"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.y}
                    r={8}
                    fill="#477653"
                    opacity={0.15}
                  />
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.y}
                    r={4}
                    fill="#fff"
                    stroke="#3f6b4c"
                    strokeWidth={2.4}
                  />
                </g>
              )}

              {points.map((point, index) => {
                const isLast = index === points.length - 1;
                const isLabelled = index % labelStep === 0;

                if (!isLabelled && !isLast) return null;

                if (isLast && !isLabelled) {
                  const previousLabelIndex =
                    Math.floor(index / labelStep) * labelStep;

                  if (index - previousLabelIndex < labelStep / 2) return null;
                }

                return (
                  <text
                    key={`trend-label-${point.key}`}
                    x={chartPoints[index].x}
                    y={canvasHeight - 12}
                    textAnchor="middle"
                    className="dashboard-chart-label"
                  >
                    {formatAxisLabel(index)}
                  </text>
                );
              })}

              {chartPoints.map((entry) => {
                const hitWidth = step || chartWidth;
                const hitX = Math.min(
                  Math.max(entry.x - hitWidth / 2, left),
                  left + chartWidth - hitWidth,
                );

                return (
                  <rect
                    key={`trend-hit-${entry.key}`}
                    className="dashboard-trend-hit"
                    x={hitX}
                    y={top}
                    width={hitWidth}
                    height={chartHeight}
                    fill="transparent"
                    onPointerEnter={() => setActiveIndex(entry.index)}
                    onPointerDown={() => setActiveIndex(entry.index)}
                  />
                );
              })}
            </svg>
          </div>

          <div
            className={`dashboard-trend-detail ${
              activePoint ? "is-active" : ""
            }`}
          >
            <div>
              <span className="dashboard-trend-detail-label">
                {activePoint ? "بازه انتخاب‌شده" : "پرفروش‌ترین بازه"}
              </span>
              <strong className="dashboard-trend-detail-date">
                {detailPoint ? formatPointDate(detailPoint) : "—"}
              </strong>
            </div>

            <div className="dashboard-trend-detail-metrics">
              <span>
                <b>{formatPrice(detailValue)}</b>
                <small>فروش</small>
              </span>
              <span>
                <b>{formatNumber(detailPoint?.orders ?? 0)}</b>
                <small>سفارش</small>
              </span>
              <span>
                <b>
                  {detailAverage > 0
                    ? formatPrice(Math.round(detailAverage))
                    : "—"}
                </b>
                <small>میانگین هر سفارش</small>
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

