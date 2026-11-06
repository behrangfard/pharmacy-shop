import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldAlert } from "lucide-react";

import { useAdminAuth } from "../context/AdminAuthContext";

type AdminPermissionGuardProps = {
  /** مجوز لازم برای دیدن این صفحه (مثلاً "products.manage"). */
  permission: string;
  /** نام فارسی بخش برای پیام «دسترسی محدود». */
  section?: string;
  children: ReactNode;
};

/**
 * گارد مسیرهای پنل بر اساس نقش مدیر.
 *
 * اگر کاربر مجوز نداشته باشد، به‌جای ریدایرکت، کارت «دسترسی محدود» با نام
 * نقش و راه بازگشت نمایش داده می‌شود (API هم همین مجوز را 403 می‌کند).
 */
function AdminPermissionGuard({
  permission,
  section,
  children,
}: AdminPermissionGuardProps) {
  const { can, roleLabel } = useAdminAuth();

  if (can(permission)) {
    return <>{children}</>;
  }

  return (
    <div className="admin-denied" dir="rtl">
      <style>{`
        .admin-denied {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 10px;
          max-width: 620px;
          margin: 24px auto;
          padding: 28px;
          background: #ffffff;
          border: 1px solid var(--admin-line, #e6ece2);
          border-radius: 18px;
          box-shadow: 0 6px 24px rgba(31, 55, 35, 0.04);
          text-align: right;
        }
        .admin-denied-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 46px;
          height: 46px;
          border-radius: 14px;
          color: #a9601f;
          background: #fdf4e8;
        }
        .admin-denied h1 {
          margin: 4px 0 0;
          font-size: clamp(19px, 2.4vw, 23px);
          font-weight: 900;
          color: #22331f;
        }
        .admin-denied p {
          margin: 0;
          color: var(--admin-muted, #6f7d6f);
          font-size: 13px;
          line-height: 2;
        }
        .admin-denied-link {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          margin-top: 8px;
          padding: 10px 16px;
          border-radius: 11px;
          color: #fff;
          background: #527b54;
          font-size: 12.5px;
          font-weight: 800;
          text-decoration: none;
          transition: background 0.15s ease;
        }
        .admin-denied-link:hover {
          background: #416943;
        }
      `}</style>

      <span className="admin-denied-icon">
        <ShieldAlert size={25} aria-hidden="true" />
      </span>

      <h1>دسترسی به این بخش محدود است</h1>

      <p>
        نقش «{roleLabel}» اجازه مشاهده {section ? `بخش «${section}»` : "این بخش"}{" "}
        را ندارد. برای دسترسی، از مدیر ارشد فروشگاه بخواهید نقش حساب شما را
        تغییر دهد.
      </p>

      <Link to="/admin" className="admin-denied-link">
        <ArrowRight size={16} aria-hidden="true" />
        بازگشت به نمای کلی
      </Link>
    </div>
  );
}

export default AdminPermissionGuard;
