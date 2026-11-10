import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import {
  JALALI_MONTH_NAMES,
  JALALI_WEEKDAY_SHORT,
  formatJalaliDisplay,
  jalaliMonthLength,
  jalaliWeekdayIndex,
  parseDateTimeInput,
  toDateTimeInputValue,
  toPersianDigits,
  todayJalali,
} from "../utils/jalali";

interface JalaliDatePickerProps {
  id?: string;
  /** مقدار به قالب `YYYY-MM-DDTHH:mm` (همان قالب ورودی datetime-local) */
  value: string;
  onChange: (value: string) => void;
  /** انتخاب ساعت در کنار تقویم نمایش داده شود */
  withTime?: boolean;
  placeholder?: string;
  disabled?: boolean;
  /** ساعت پیش‌فرض هنگام انتخاب روز، وقتی مقدار قبلی ساعتی ندارد */
  defaultHour?: number;
  defaultMinute?: number;
  /** کوچک‌ترین سال قابل انتخاب (پیش‌فرض: ۲۰ سال قبل از سال در حال نمایش) */
  minYear?: number;
  /** بزرگ‌ترین سال قابل انتخاب (پیش‌فرض: ۲۰ سال بعد از سال در حال نمایش) */
  maxYear?: number;
}

const pad = (part: number) => String(part).padStart(2, "0");

function buildMinuteOptions(current: number): number[] {
  const steps: number[] = [];

  for (let minute = 0; minute < 60; minute += 5) {
    steps.push(minute);
  }

  if (!steps.includes(current)) {
    steps.push(current);
    steps.sort((a, b) => a - b);
  }

  return steps;
}

function JalaliDatePicker({
  id,
  value,
  onChange,
  withTime = true,
  placeholder = "انتخاب تاریخ",
  disabled = false,
  defaultHour = 0,
  defaultMinute = 0,
  minYear,
  maxYear,
}: JalaliDatePickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => parseDateTimeInput(value), [value]);
  const today = useMemo(() => todayJalali(), []);

  const [view, setView] = useState(() =>
    selected
      ? { jy: selected.jy, jm: selected.jm }
      : { jy: today.jy, jm: today.jm },
  );

  useEffect(() => {
    if (!open) return;

    const current = parseDateTimeInput(value);

    if (current) {
      setView({ jy: current.jy, jm: current.jm });
    }
  }, [open, value]);

  useEffect(() => {
    if (!open) return;

    function handleMouseDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const monthLength = jalaliMonthLength(view.jy, view.jm);
  const leadingBlanks = jalaliWeekdayIndex(view.jy, view.jm, 1);

  const cells: Array<number | null> = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: monthLength }, (_, index) => index + 1),
  ];

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const hour = selected?.hour ?? defaultHour;
  const minute = selected?.minute ?? defaultMinute;
  const minuteOptions = buildMinuteOptions(minute);
  const yearOptions = useMemo(() => {
    // سال در حال نمایش همیشه باید در فهرست باشد، حتی اگر بیرون از بازهٔ داده‌شده باشد
    const from = Math.min(minYear ?? view.jy - 20, view.jy);
    const to = Math.max(maxYear ?? view.jy + 20, view.jy, from);

    return Array.from({ length: to - from + 1 }, (_, index) => from + index);
  }, [view.jy, minYear, maxYear]);

  function shiftMonth(delta: number) {
    setView((current) => {
      const total = current.jy * 12 + (current.jm - 1) + delta;
      const rawYear = Math.floor(total / 12);
      const jy = Math.min(
        Math.max(rawYear, minYear ?? rawYear),
        maxYear ?? rawYear,
      );
      const jm = (((total % 12) + 12) % 12) + 1;

      return { jy, jm };
    });
  }

  function emitDate(jy: number, jm: number, jd: number, h: number, m: number) {
    onChange(toDateTimeInputValue({ jy, jm, jd, hour: h, minute: m }));

    if (!withTime) {
      setOpen(false);
    }
  }

  function handleDaySelect(jd: number) {
    emitDate(view.jy, view.jm, jd, hour, minute);
  }

  function handleToday() {
    emitDate(today.jy, today.jm, today.jd, hour, minute);
    setView({ jy: today.jy, jm: today.jm });
  }

  function handleHourChange(nextHour: number) {
    if (selected) {
      emitDate(selected.jy, selected.jm, selected.jd, nextHour, selected.minute);
      return;
    }

    emitDate(today.jy, today.jm, today.jd, nextHour, minute);
    setView({ jy: today.jy, jm: today.jm });
  }

  function handleMinuteChange(nextMinute: number) {
    if (selected) {
      emitDate(selected.jy, selected.jm, selected.jd, selected.hour, nextMinute);
      return;
    }

    emitDate(today.jy, today.jm, today.jd, hour, nextMinute);
    setView({ jy: today.jy, jm: today.jm });
  }

  const triggerLabel = formatJalaliDisplay(value, { withTime });

  return (
    <div className="admin-jalali" ref={rootRef}>
      <div className="admin-jalali-control">
        <button
          type="button"
          id={id}
          className={`admin-input admin-jalali-trigger${open ? " is-open" : ""}`}
          onClick={() => setOpen((current) => !current)}
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <CalendarDays size={16} aria-hidden="true" />
          <span className="admin-jalali-text">
            {triggerLabel || placeholder}
          </span>
        </button>

        {Boolean(value) && !disabled && (
          <button
            type="button"
            className="admin-jalali-clear"
            aria-label="پاک کردن تاریخ"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
          >
            ×
          </button>
        )}
      </div>

      {open && (
        <div
          className="admin-jalali-popover"
          role="dialog"
          aria-label="تقویم شمسی"
        >
          <div className="admin-jalali-head">
            <button
              type="button"
              className="admin-jalali-nav"
              aria-label="ماه قبل"
              onClick={() => shiftMonth(-1)}
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>

            <div className="admin-jalali-title">
              <select
                className="admin-jalali-select"
                aria-label="ماه"
                value={view.jm}
                onChange={(event) => {
                  const jm = Number(event.target.value);
                  setView((current) => ({ ...current, jm }));
                }}
              >
                {JALALI_MONTH_NAMES.map((name, index) => (
                  <option key={name} value={index + 1}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                className="admin-jalali-select"
                aria-label="سال"
                value={view.jy}
                onChange={(event) => {
                  const jy = Number(event.target.value);
                  setView((current) => ({ ...current, jy }));
                }}
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {toPersianDigits(year)}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="admin-jalali-nav"
              aria-label="ماه بعد"
              onClick={() => shiftMonth(1)}
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
          </div>

          <div
            className="admin-jalali-grid admin-jalali-weekdays"
            aria-hidden="true"
          >
            {JALALI_WEEKDAY_SHORT.map((day) => (
              <span key={day} className="admin-jalali-weekday">
                {day}
              </span>
            ))}
          </div>

          <div className="admin-jalali-grid" role="grid">
            {cells.map((day, index) => {
              if (day === null) {
                return (
                  <span
                    key={`empty-${index}`}
                    className="admin-jalali-day is-empty"
                    aria-hidden="true"
                  />
                );
              }

              const isSelected =
                selected !== null &&
                selected.jy === view.jy &&
                selected.jm === view.jm &&
                selected.jd === day;
              const isToday =
                today.jy === view.jy &&
                today.jm === view.jm &&
                today.jd === day;

              return (
                <button
                  key={`day-${day}`}
                  type="button"
                  className={[
                    "admin-jalali-day",
                    isSelected ? "is-selected" : "",
                    isToday ? "is-today" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-pressed={isSelected}
                  onClick={() => handleDaySelect(day)}
                >
                  {toPersianDigits(day)}
                </button>
              );
            })}
          </div>

          {withTime && (
            <div className="admin-jalali-time">
              <span className="admin-jalali-time-label">ساعت</span>

              <select
                className="admin-jalali-select"
                aria-label="ساعت"
                value={hour}
                onChange={(event) => handleHourChange(Number(event.target.value))}
              >
                {Array.from({ length: 24 }, (_, index) => index).map(
                  (value) => (
                    <option key={value} value={value}>
                      {toPersianDigits(pad(value))}
                    </option>
                  ),
                )}
              </select>

              <span aria-hidden="true">:</span>

              <select
                className="admin-jalali-select"
                aria-label="دقیقه"
                value={minute}
                onChange={(event) =>
                  handleMinuteChange(Number(event.target.value))
                }
              >
                {minuteOptions.map((value) => (
                  <option key={value} value={value}>
                    {toPersianDigits(pad(value))}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="admin-jalali-footer">
            <button
              type="button"
              className="admin-jalali-action"
              onClick={handleToday}
            >
              امروز
            </button>

            {Boolean(value) && (
              <button
                type="button"
                className="admin-jalali-action is-danger"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                پاک کردن
              </button>
            )}

            <button
              type="button"
              className="admin-jalali-action is-primary"
              onClick={() => setOpen(false)}
            >
              بستن
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default JalaliDatePicker;
