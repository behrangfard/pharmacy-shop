import { useEffect, useState } from "react";

import api from "../services/api";

interface DashboardData {
  products: {
    total: number;
    active: number;
  };
  users: {
    total: number;
  };
  orders: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    cancelled: number;
  };
  payments: {
    paid: number;
    unpaid: number;
  };
  sales: {
    total: string;
  };
}

function formatPrice(value: string | number) {
  return new Intl.NumberFormat("fa-IR").format(Number(value));
}

function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/admin/dashboard");

        setData(response.data.data);
      } catch {
        setError("دریافت اطلاعات داشبورد با خطا مواجه شد.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div>
        <h1
          style={{
            margin: 0,
            marginBottom: "8px",
            fontSize: "28px",
          }}
        >
          داشبورد{" "}
        </h1>

        <p
          style={{
            color: "#6b7280",
            marginBottom: "30px",
          }}
        >
          در حال دریافت اطلاعات...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <h1
          style={{
            margin: 0,
            marginBottom: "16px",
            fontSize: "28px",
          }}
        >
          داشبورد{" "}
        </h1>

        <div
          style={{
            background: "#fff",
            borderRadius: "14px",
            padding: "20px",
            color: "#b91c1c",
            border: "1px solid #fecaca",
          }}
        >
          {error || "اطلاعات داشبورد در دسترس نیست."}
        </div>
      </div>
    );
  }

  const cards = [
    {
      title: "کل محصولات",
      value: data.products.total,
      description: `${data.products.active} محصول فعال`,
    },
    {
      title: "کل کاربران",
      value: data.users.total,
      description: "کاربر ثبت‌نام‌شده",
    },
    {
      title: "کل سفارش‌ها",
      value: data.orders.total,
      description: `${data.orders.processing} سفارش در حال پردازش`,
    },
    {
      title: "فروش کل",
      value: data.sales.total,
      description: `${data.payments.paid} سفارش پرداخت‌شده`,
      isCurrency: true,
    },
  ];

  const orderStatuses = [
    {
      label: "در انتظار",
      value: data.orders.pending,
    },
    {
      label: "در حال پردازش",
      value: data.orders.processing,
    },
    {
      label: "تکمیل‌شده",
      value: data.orders.completed,
    },
    {
      label: "لغوشده",
      value: data.orders.cancelled,
    },
  ];

  return (
    <div>
      <div
        style={{
          marginBottom: "30px",
        }}
      >
        <h1
          style={{
            margin: 0,
            marginBottom: "8px",
            fontSize: "28px",
            fontWeight: 800,
            color: "#111827",
          }}
        >
          داشبورد مدیریت{" "}
        </h1>

        <p
          style={{
            margin: 0,
            color: "#6b7280",
          }}
        >
          نمای کلی وضعیت فروشگاه
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: "18px",
          marginBottom: "24px",
        }}
      >
        {cards.map((card) => (
          <div
            key={card.title}
            style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "22px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
            }}
          >
            <div
              style={{
                color: "#6b7280",
                fontSize: "14px",
                marginBottom: "12px",
              }}
            >
              {card.title}
            </div>

            <div
              style={{
                color: "#111827",
                fontSize: "25px",
                fontWeight: 800,
                marginBottom: "8px",
              }}
            >
              {card.isCurrency
                ? `${formatPrice(card.value)} تومان`
                : formatPrice(card.value)}
            </div>

            <div
              style={{
                color: "#6b7280",
                fontSize: "13px",
              }}
            >
              {card.description}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "24px",
        }}
      >
        <section
          style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "24px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
          }}
        >
          <h2
            style={{
              margin: 0,
              marginBottom: "20px",
              fontSize: "19px",
              color: "#111827",
            }}
          >
            وضعیت سفارش‌ها
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "12px",
            }}
          >
            {orderStatuses.map((status) => (
              <div
                key={status.label}
                style={{
                  background: "#f9fafb",
                  borderRadius: "12px",
                  padding: "18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    color: "#4b5563",
                    fontSize: "14px",
                  }}
                >
                  {status.label}
                </span>

                <strong
                  style={{
                    color: "#111827",
                    fontSize: "20px",
                  }}
                >
                  {formatPrice(status.value)}
                </strong>
              </div>
            ))}
          </div>
        </section>

        <section
          style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "24px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
          }}
        >
          <h2
            style={{
              margin: 0,
              marginBottom: "20px",
              fontSize: "19px",
              color: "#111827",
            }}
          >
            وضعیت پرداخت
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
            }}
          >
            <div
              style={{
                background: "#f0fdf4",
                borderRadius: "12px",
                padding: "20px",
              }}
            >
              <div
                style={{
                  color: "#166534",
                  fontSize: "14px",
                  marginBottom: "8px",
                }}
              >
                پرداخت‌شده
              </div>

              <strong
                style={{
                  color: "#166534",
                  fontSize: "24px",
                }}
              >
                {formatPrice(data.payments.paid)}
              </strong>
            </div>

            <div
              style={{
                background: "#fff7ed",
                borderRadius: "12px",
                padding: "20px",
              }}
            >
              <div
                style={{
                  color: "#9a3412",
                  fontSize: "14px",
                  marginBottom: "8px",
                }}
              >
                پرداخت‌نشده
              </div>

              <strong
                style={{
                  color: "#9a3412",
                  fontSize: "24px",
                }}
              >
                {formatPrice(data.payments.unpaid)}
              </strong>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default AdminDashboard;
