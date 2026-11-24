import { Fragment, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  fetchInventory,
  notifyLowStock,
  runStocktake,
  saveInventoryThreshold,
  type InventoryItem,
  type InventoryKindFilter,
  type InventoryMode,
  type InventoryPage,
} from "../services/inventory";
import { formatAdminNumber, getAdminErrorMessage } from "../utils/adminFormat";

const MODE_LABELS: Record<InventoryMode, string> = {
  low: "رو به اتمام",
  all: "همهٔ کالاها",
};

const KIND_LABELS: Record<InventoryKindFilter, string> = {
  all: "همه",
  product: "محصول",
  variant: "تنوع",
};

interface ThresholdDraft {
  kind: InventoryItem["kind"];
  id: number;
  value: string;
}

interface StocktakeDraft {
  item: InventoryItem;
  counted: string;
  note: string;
}

function itemKey(item: InventoryItem): string {
  return `${item.kind}-${item.id}`;
}

function AdminInventory() {
  const [mode, setMode] = useState<InventoryMode>("low");
  const [kind, setKind] = useState<InventoryKindFilter>("all");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);

  const [data, setData] = useState<InventoryPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [thresholdDraft, setThresholdDraft] = useState<ThresholdDraft | null>(null);
  const [stocktakeDraft, setStocktakeDraft] = useState<StocktakeDraft | null>(null);
  const [savingKey, setSavingKey] = useState("");
  const [notifying, setNotifying] = useState(false);
  const [notifyReason, setNotifyReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setData(
        await fetchInventory({
          mode,
          kind,
          search: appliedSearch,
          page,
          per_page: 25,
        }),
      );
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, kind, mode, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [mode, kind, appliedSearch]);

  function changeMode(next: InventoryMode) {
    setMode(next);
    setSuccess("");

    if (next === "all" && kind === "all") {
      setKind("product");
    }
  }

  async function handleThresholdSave(item: InventoryItem, valueOverride?: string) {
    const key = `threshold-${itemKey(item)}`;

    if (savingKey !== "") return;

    const rawValue =
      valueOverride !== undefined
        ? valueOverride.trim()
        : thresholdDraft && thresholdDraft.kind === item.kind && thresholdDraft.id === item.id
          ? thresholdDraft.value.trim()
          : "";

    const parsed = rawValue === "" ? null : Number(rawValue);

    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) {
      setError("آستانه باید عدد صحیح صفر یا بیشتر باشد.");
      return;
    }

    setSavingKey(key);
    setError("");
    setSuccess("");

    try {
      const result = await saveInventoryThreshold(item.kind, item.id, parsed);

      setData((previous) =>
        previous
          ? {
              ...previous,
              summary: result.summary,
              items: previous.items.map((row) =>
                row.kind === item.kind && row.id === item.id ? result.item : row,
              ),
            }
          : previous,
      );

      setSuccess(
        parsed === null
          ? `آستانهٔ «${item.name}» به پیش‌فرض فروشگاه (${formatAdminNumber(result.item.threshold)}) برگشت.`
          : `آستانهٔ «${item.name}» روی ${formatAdminNumber(parsed)} تنظیم شد.`,
      );
      setThresholdDraft(null);
      await load();
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setSavingKey("");
    }
  }

  async function handleStocktakeSubmit() {
    if (!stocktakeDraft || savingKey !== "") return;

    const counted = Number(stocktakeDraft.counted);

    if (!Number.isFinite(counted) || counted < 0 || !Number.isInteger(counted)) {
      setError("تعداد شمارش‌شده باید عدد صحیح صفر یا بیشتر باشد.");
      return;
    }

    const { item } = stocktakeDraft;

    setSavingKey(`stocktake-${itemKey(item)}`);
    setError("");
    setSuccess("");

    try {
      const result = await runStocktake({
        product_id: item.product_id,
        variant_id: item.kind === "variant" ? item.id : null,
        counted_stock: counted,
        note: stocktakeDraft.note.trim() || undefined,
      });

      setSuccess(
        result.difference === 0
          ? `موجودی «${item.name}» با شمارش برابر بود؛ گردشی ثبت نشد.`
          : `اختلاف ${formatAdminNumber(result.difference)} برای «${item.name}» در گردش موجودی ثبت و عدد انبار اصلاح شد.`,
      );
      setStocktakeDraft(null);
      await load();
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setSavingKey("");
    }
  }

  async function handleNotify(force = false) {
    if (notifying) return;

    setNotifying(true);
    setError("");
    setSuccess("");

    try {
      const result = await notifyLowStock(force);

      setNotifyReason(result.reason);

      if (result.created) {
        setSuccess(
          `اعلان «${result.notification?.title ?? "موجودی کم"}» در زنگولهٔ پنل ثبت شد.`,
        );
      } else if (result.reason === "empty") {
        setSuccess("همهٔ کالاها بالای آستانه هستند؛ اعلانی لازم نیست.");
      } else {
        setSuccess(
          "اعلان موجودی کمِ خوانده‌نشده از قبل وجود دارد؛ برای ارسال دوباره از «ارسال دوباره» استفاده کنید.",
        );
      }
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setNotifying(false);
    }
  }

  const summary = data?.summary;
  const items = data?.items ?? [];
  const meta = data?.meta;
  const thresholdDefault = summary?.threshold ?? 0;

  return (
    <div dir="rtl" className="admin-page">
      <header className="admin-page-head">
        <div>
          <span className="admin-page-eyebrow">انبار و موجودی</span>
          <h1 className="admin-page-title">موجودی و شمارش انبار</h1>
          <p className="admin-page-subtitle">
            کالاهای زیر آستانه را ببینید، آستانهٔ هشدار هر محصول/تنوع را تعیین
            کنید، شمارش انبار را ثبت کنید و اعلان «موجودی کم» را در زنگولهٔ پنل
            بسازید.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={() => void handleNotify(false)}
            disabled={notifying}
          >
            {notifying ? "در حال ارسال..." : "اعلان موجودی کم"}
          </button>

          <button
            type="button"
            className="admin-btn"
            onClick={() => void load()}
            disabled={loading}
          >
            {loading ? "در حال دریافت..." : "بارگذاری مجدد"}
          </button>
        </div>
      </header>

      {notifyReason === "cooldown" && (
        <div className="admin-actions" style={{ justifyContent: "flex-start" }}>
          <button
            type="button"
            className="admin-btn admin-btn-sm"
            onClick={() => void handleNotify(true)}
            disabled={notifying}
          >
            ارسال دوباره اعلان
          </button>
          <span style={{ fontSize: 13 }}>
            اعلان قبلی هنوز خوانده نشده است؛ ارسال دوباره فقط برای هشدار فوری است.
          </span>
        </div>
      )}

      {error && (
        <div className="admin-alert admin-alert-error" role="alert">
          <span aria-hidden="true">!</span>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="admin-alert admin-alert-success" role="status">
          <span aria-hidden="true">✓</span>
          <span>{success}</span>
        </div>
      )}

      <div className="admin-stats">
        <div className="admin-stat">
          <span className="admin-stat-label">کل اقلام زیر آستانه</span>
          <strong className="admin-stat-value">
            {formatAdminNumber(summary?.total ?? 0)}
          </strong>
          <span className="admin-stat-hint">محصول و تنوع فعال</span>
        </div>

        <div className="admin-stat">
          <span className="admin-stat-label">رو به اتمام</span>
          <strong className="admin-stat-value">
            {formatAdminNumber(summary?.low_stock ?? 0)}
          </strong>
          <span className="admin-stat-hint">موجودی مثبت اما زیر آستانه</span>
        </div>

        <div className="admin-stat">
          <span className="admin-stat-label">ناموجود</span>
          <strong className="admin-stat-value">
            {formatAdminNumber(summary?.out_of_stock ?? 0)}
          </strong>
          <span className="admin-stat-hint">موجودی صفر یا منفی</span>
        </div>

        <div className="admin-stat">
          <span className="admin-stat-label">آستانهٔ پیش‌فرض</span>
          <strong className="admin-stat-value">
            {formatAdminNumber(thresholdDefault)}
          </strong>
          <span className="admin-stat-hint">
            از INVENTORY_LOW_STOCK_THRESHOLD
          </span>
        </div>
      </div>

      <div className="admin-toolbar">
        {(["low", "all"] as InventoryMode[]).map((value) => (
          <button
            key={value}
            type="button"
            className={`admin-btn ${mode === value ? "admin-btn-primary" : ""}`}
            onClick={() => changeMode(value)}
            aria-pressed={mode === value}
          >
            {MODE_LABELS[value]}
          </button>
        ))}

        <span
          aria-hidden="true"
          style={{
            width: 1,
            height: 22,
            background: "var(--color-line, #e2e8f0)",
          }}
        />

        {(["all", "product", "variant"] as InventoryKindFilter[]).map((value) => (
          <button
            key={value}
            type="button"
            className={`admin-btn admin-btn-sm ${kind === value ? "admin-btn-primary" : ""}`}
            onClick={() => setKind(value)}
            aria-pressed={kind === value}
          >
            {KIND_LABELS[value]}
          </button>
        ))}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            setAppliedSearch(search.trim());
          }}
          style={{ display: "flex", gap: 6, marginInlineStart: "auto" }}
        >
          <input
            className="admin-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="نام کالا یا کد..."
            maxLength={100}
            aria-label="جست‌وجوی کالا"
          />

          <button type="submit" className="admin-btn admin-btn-sm">
            جست‌وجو
          </button>

          {appliedSearch !== "" && (
            <button
              type="button"
              className="admin-btn admin-btn-sm"
              onClick={() => {
                setSearch("");
                setAppliedSearch("");
              }}
            >
              پاک‌کردن
            </button>
          )}
        </form>
      </div>

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2 className="admin-card-title">{MODE_LABELS[mode]}</h2>
            <p className="admin-card-desc">
              {mode === "low"
                ? `کالاهای فعال با موجودی کمتر یا مساوی آستانهٔ خودشان (پیش‌فرض فروشگاه ${formatAdminNumber(thresholdDefault)}).`
                : "همهٔ محصولات یا تنوع‌ها؛ آستانهٔ هر ردیف را همین‌جا تعیین کنید یا به پیش‌فرض برگردانید."}
            </p>
          </div>

          <span className="admin-badge admin-badge-gray">
            {formatAdminNumber(meta?.total ?? 0)} ردیف
          </span>
        </div>

        {loading ? (
          <p className="admin-empty">در حال دریافت موجودی...</p>
        ) : items.length === 0 ? (
          <p className="admin-empty">
            {mode === "low"
              ? "هیچ کالایی زیر آستانه نیست؛ انبار وضعیت خوبی دارد."
              : "کالایی با این فیلتر پیدا نشد."}
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>نوع</th>
                  <th>کالا</th>
                  <th>کد</th>
                  <th>موجودی</th>
                  <th>آستانهٔ هشدار</th>
                  <th>کسری</th>
                  <th>عملیات</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item) => {
                  const key = itemKey(item);

                  const draftValue =
                    thresholdDraft &&
                    thresholdDraft.kind === item.kind &&
                    thresholdDraft.id === item.id
                      ? thresholdDraft.value
                      : item.low_stock_threshold !== null
                        ? String(item.low_stock_threshold)
                        : "";

                  const isStocktaking =
                    stocktakeDraft !== null &&
                    stocktakeDraft.item.kind === item.kind &&
                    stocktakeDraft.item.id === item.id;

                  return (
                    <Fragment key={key}>
                      <tr>
                        <td>
                          <span
                            className={`admin-badge ${
                              item.kind === "product"
                                ? "admin-badge-blue"
                                : "admin-badge-amber"
                            }`}
                          >
                            {KIND_LABELS[item.kind]}
                          </span>
                        </td>

                        <td>
                          <Link to={`/admin/products/${item.product_id}/edit`}>
                            {item.kind === "product"
                              ? item.name
                              : item.product_name ?? `محصول #${item.product_id}`}
                          </Link>

                          {item.kind === "variant" && (
                            <span
                              style={{
                                display: "block",
                                fontSize: 12,
                                color: "#64748b",
                              }}
                            >
                              {item.name}
                            </span>
                          )}
                        </td>

                        <td dir="ltr" style={{ fontSize: 12 }}>
                          {item.sku ?? "—"}
                        </td>

                        <td>
                          <strong
                            className={item.stock <= 0 ? "text-red-600" : ""}
                          >
                            {formatAdminNumber(item.stock)}
                          </strong>
                        </td>

                        <td>
                          <div
                            style={{
                              display: "flex",
                              gap: 4,
                              alignItems: "center",
                              flexWrap: "wrap",
                            }}
                          >
                            <input
                              className="admin-input"
                              style={{ width: 84 }}
                              type="number"
                              min={0}
                              step={1}
                              value={draftValue}
                              aria-label={`آستانهٔ ${item.name}`}
                              onChange={(event) =>
                                setThresholdDraft({
                                  kind: item.kind,
                                  id: item.id,
                                  value: event.target.value,
                                })
                              }
                            />

                            <button
                              type="button"
                              className="admin-btn admin-btn-sm"
                              onClick={() => void handleThresholdSave(item)}
                              disabled={savingKey !== ""}
                            >
                              {savingKey === `threshold-${key}`
                                ? "در حال ذخیره"
                                : "ذخیره"}
                            </button>

                            {item.low_stock_threshold !== null && (
                              <button
                                type="button"
                                className="admin-btn admin-btn-sm"
                                onClick={() => void handleThresholdSave(item, "")}
                                disabled={savingKey !== ""}
                              >
                                پیش‌فرض
                              </button>
                            )}
                          </div>

                          <span
                            style={{
                              display: "block",
                              fontSize: 12,
                              color: "#64748b",
                            }}
                          >
                            {item.low_stock_threshold === null
                              ? `پیش‌فرض فروشگاه (${formatAdminNumber(item.threshold)})`
                              : "آستانهٔ اختصاصی"}
                          </span>
                        </td>

                        <td>
                          {item.shortfall > 0
                            ? formatAdminNumber(item.shortfall)
                            : "—"}
                        </td>

                        <td>
                          <button
                            type="button"
                            className="admin-btn admin-btn-sm"
                            aria-expanded={isStocktaking}
                            onClick={() =>
                              setStocktakeDraft(
                                isStocktaking
                                  ? null
                                  : {
                                      item,
                                      counted: String(item.stock),
                                      note: "",
                                    },
                              )
                            }
                          >
                            {isStocktaking ? "بستن" : "شمارش انبار"}
                          </button>
                        </td>
                      </tr>

                      {isStocktaking && stocktakeDraft && (
                        <tr>
                          <td colSpan={7}>
                            <div
                              style={{
                                display: "flex",
                                gap: 8,
                                flexWrap: "wrap",
                                alignItems: "flex-end",
                              }}
                            >
                              <div className="admin-field" style={{ minWidth: 160 }}>
                                <label className="admin-label" htmlFor={`counted-${key}`}>
                                  تعداد شمارش‌شده
                                </label>
                                <input
                                  id={`counted-${key}`}
                                  className="admin-input"
                                  type="number"
                                  min={0}
                                  step={1}
                                  value={stocktakeDraft.counted}
                                  onChange={(event) =>
                                    setStocktakeDraft({
                                      ...stocktakeDraft,
                                      counted: event.target.value,
                                    })
                                  }
                                />
                              </div>

                              <div
                                className="admin-field"
                                style={{ minWidth: 220, flex: 1 }}
                              >
                                <label className="admin-label" htmlFor={`note-${key}`}>
                                  توضیح (اختیاری)
                                </label>
                                <input
                                  id={`note-${key}`}
                                  className="admin-input"
                                  maxLength={255}
                                  value={stocktakeDraft.note}
                                  placeholder="مثلاً شمارش پایان ماه"
                                  onChange={(event) =>
                                    setStocktakeDraft({
                                      ...stocktakeDraft,
                                      note: event.target.value,
                                    })
                                  }
                                />
                              </div>

                              <button
                                type="button"
                                className="admin-btn admin-btn-primary"
                                onClick={() => void handleStocktakeSubmit()}
                                disabled={savingKey !== ""}
                              >
                                {savingKey === `stocktake-${key}`
                                  ? "در حال ثبت..."
                                  : "ثبت شمارش"}
                              </button>

                              <button
                                type="button"
                                className="admin-btn"
                                onClick={() => setStocktakeDraft(null)}
                                disabled={savingKey !== ""}
                              >
                                انصراف
                              </button>
                            </div>

                            <p style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
                              موجودی فعلی {formatAdminNumber(stocktakeDraft.item.stock)}
                              {" "}است؛ اختلاف به‌عنوان «شمارش انبار» در گزارش گردش
                              موجودی ثبت می‌شود.
                            </p>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {meta && meta.last_page > 1 && (
          <div className="admin-actions" style={{ justifyContent: "space-between" }}>
            <button
              type="button"
              className="admin-btn admin-btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              قبلی
            </button>

            <span style={{ fontSize: 13 }}>
              صفحهٔ {formatAdminNumber(meta.current_page)} از{" "}
              {formatAdminNumber(meta.last_page)} —{" "}
              {formatAdminNumber(meta.total)} ردیف
            </span>

            <button
              type="button"
              className="admin-btn admin-btn-sm"
              disabled={page >= meta.last_page}
              onClick={() => setPage((current) => current + 1)}
            >
              بعدی
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminInventory;
