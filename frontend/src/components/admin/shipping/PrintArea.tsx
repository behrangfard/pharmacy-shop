import { useEffect } from "react";
import {
  Printer,
  X,
} from "lucide-react";

import { useStoreSettings } from "../../../hooks/useStoreSettings";
import {
  formatAdminDate,
  formatAdminNumber,
  formatAdminPrice,
} from "../../../utils/adminFormat";

import {
  type PrintJob,
  gramsLabel,
} from "./shippingShared";

/* ------------------------------------------------------------------ */
/* لایهٔ چاپ                                                          */
/* ------------------------------------------------------------------ */

export function PrintArea({ job, onClose }: { job: PrintJob; onClose: () => void }) {
  const settings = useStoreSettings();

  useEffect(() => {
    const timer = window.setTimeout(() => window.print(), 400);

    return () => window.clearTimeout(timer);
  }, [job]);

  return (
    <div className="shp-print-layer">
      <div className="shp-print-actions">
        <button type="button" className="admin-btn admin-btn-primary admin-btn-sm" onClick={() => window.print()}>
          <Printer size={14} /> چاپ
        </button>
        <button type="button" className="admin-btn admin-btn-sm" onClick={onClose}>
          <X size={14} /> بستن
        </button>
      </div>

      <div className="shp-print-body">
        {job.kind === "labels" && (
          <div className="shp-label-grid">
            {job.shipments.map((shipment) => (
              <div className="shp-label" key={shipment.id}>
                <div className="shp-label-head">
                  <strong>{settings.store_name}</strong>
                  <span dir="ltr">{shipment.shipment_number}</span>
                </div>

                <div className="shp-label-row">
                  <span>گیرنده</span>
                  <strong>{shipment.recipient_name}</strong>
                </div>
                <div className="shp-label-row">
                  <span>تلفن</span>
                  <strong dir="ltr">{shipment.phone ?? "—"}</strong>
                </div>
                <div className="shp-label-row">
                  <span>مقصد</span>
                  <strong>
                    {[shipment.province, shipment.city].filter(Boolean).join(" · ") || "—"}
                  </strong>
                </div>
                <div className="shp-label-address">{shipment.address}</div>
                <div className="shp-label-row">
                  <span>کد پستی</span>
                  <strong dir="ltr">{shipment.postal_code ?? "—"}</strong>
                </div>
                <div className="shp-label-row">
                  <span>روش</span>
                  <strong>{shipment.method_name ?? shipment.carrier ?? "—"}</strong>
                </div>
                <div className="shp-label-code" dir="ltr">
                  {shipment.tracking_code ?? shipment.shipment_number}
                </div>
                <div className="shp-label-foot">
                  <span>سفارش: {shipment.order_number ?? "—"}</span>
                  <span>{formatAdminDate(shipment.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {(job.kind === "packing" || job.kind === "invoice") && (
          <div className="shp-doc">
            <div className="shp-doc-head">
              <div>
                <h1>{settings.store_name}</h1>
                {settings.store_slogan && <p>{settings.store_slogan}</p>}
                <p dir="ltr">{settings.store_phone}</p>
                <p>{settings.store_address}</p>
              </div>
              <div className="shp-doc-titles">
                <h2>{job.kind === "packing" ? "برگهٔ بسته‌بندی" : "فاکتور ارسال"}</h2>
                <p dir="ltr">{job.shipment.shipment_number}</p>
                <p>{formatAdminDate(job.shipment.created_at)}</p>
                <p dir="ltr">{job.shipment.order_number ?? "—"}</p>
              </div>
            </div>

            <div className="shp-doc-grid">
              <div>
                <h3>فرستنده</h3>
                <p>{settings.store_name}</p>
                <p dir="ltr">{settings.store_phone}</p>
                <p>{settings.store_address}</p>
              </div>
              <div>
                <h3>گیرنده</h3>
                <p>{job.shipment.recipient_name}</p>
                <p dir="ltr">{job.shipment.phone ?? "—"}</p>
                <p>
                  {[job.shipment.province, job.shipment.city].filter(Boolean).join(" · ")}
                </p>
                <p>{job.shipment.address}</p>
                <p dir="ltr">{job.shipment.postal_code ?? "—"}</p>
              </div>
              <div>
                <h3>ارسال</h3>
                <p>{job.shipment.method_name ?? job.shipment.carrier ?? "—"}</p>
                <p dir="ltr">{job.shipment.tracking_code ?? "بدون کد رهگیری"}</p>
                <p>بسته: {formatAdminNumber(job.shipment.package_count)}</p>
                <p>وزن: {gramsLabel(job.shipment.weight_grams)}</p>
              </div>
            </div>

            <table className="shp-doc-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>کالا</th>
                  <th>کد</th>
                  <th>تعداد</th>
                  {job.kind === "invoice" && <th>قیمت واحد</th>}
                  {job.kind === "invoice" && <th>جمع</th>}
                </tr>
              </thead>
              <tbody>
                {(job.shipment.order?.items ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={job.kind === "invoice" ? 6 : 4}>
                      اقلام سفارش در دسترس نیست.
                    </td>
                  </tr>
                ) : (
                  (job.shipment.order?.items ?? []).map((item, index) => (
                    <tr key={item.id}>
                      <td>{formatAdminNumber(index + 1)}</td>
                      <td>{item.product_name}</td>
                      <td dir="ltr">{item.sku ?? "—"}</td>
                      <td>{formatAdminNumber(item.quantity)}</td>
                      {job.kind === "invoice" && (
                        <td>{formatAdminPrice(item.unit_price)}</td>
                      )}
                      {job.kind === "invoice" && (
                        <td>{formatAdminPrice(item.total_price)}</td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {job.kind === "invoice" && (
              <div className="shp-doc-totals">
                <div>
                  <span>جمع کالاها</span>
                  <strong>{formatAdminPrice(job.shipment.order?.subtotal ?? 0)}</strong>
                </div>
                <div>
                  <span>هزینهٔ ارسال</span>
                  <strong>{formatAdminPrice(job.shipment.cost)}</strong>
                </div>
                <div>
                  <span>مبلغ کل</span>
                  <strong>{formatAdminPrice(job.shipment.order?.total ?? 0)}</strong>
                </div>
              </div>
            )}

            {job.shipment.notes && (
              <p className="shp-doc-note">
                <strong>یادداشت: </strong>
                {job.shipment.notes}
              </p>
            )}

            <div className="shp-doc-foot">
              <span>امضای فرستنده</span>
              <span>امضای مأمور پست / حامل</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
/* ------------------------------------------------------------------ */
/* ۳) روش‌های ارسال                                                    */
/* ------------------------------------------------------------------ */

