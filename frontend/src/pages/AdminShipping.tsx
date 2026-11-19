import {
  useCallback,
  useState,
} from "react";
import { RefreshCw } from "lucide-react";

import {
  type TabId,
  type OrderOption,
  TABS,
} from "../components/admin/shipping/shippingShared";

import { DashboardTab } from "../components/admin/shipping/DashboardTab";
import { ShipmentsTab } from "../components/admin/shipping/ShipmentsTab";
import { MethodsTab } from "../components/admin/shipping/MethodsTab";
import { ZonesTab } from "../components/admin/shipping/ZonesTab";
import { RulesTab } from "../components/admin/shipping/RulesTab";
import { HistoryTab } from "../components/admin/shipping/HistoryTab";
import { ShippingPageTab } from "../components/admin/shipping/ShippingPageTab";

export default function AdminShipping() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [refreshToken, setRefreshToken] = useState(0);
  const [presetOrder, setPresetOrder] = useState<OrderOption | null>(null);
  const [statusPreset, setStatusPreset] = useState<string | null>(null);
  const [openShipmentId, setOpenShipmentId] = useState<number | null>(null);

  const bumpRefresh = useCallback(() => {
    setRefreshToken((current) => current + 1);
  }, []);

  const consumePreset = useCallback(() => {
    setPresetOrder(null);
  }, []);

  const consumeNav = useCallback(() => {
    setStatusPreset(null);
    setOpenShipmentId(null);
  }, []);

  const handleRegisterOrder = useCallback((order: OrderOption) => {
    setPresetOrder(order);
    setStatusPreset(null);
    setOpenShipmentId(null);
    setActiveTab("shipments");
  }, []);

  const handleOpenShipment = useCallback((id: number) => {
    setPresetOrder(null);
    setStatusPreset(null);
    setOpenShipmentId(id);
    setActiveTab("shipments");
  }, []);

  const handleOpenStatus = useCallback((status: string) => {
    setPresetOrder(null);
    setOpenShipmentId(null);
    setStatusPreset(status);
    setActiveTab("shipments");
  }, []);

  return (
    <div dir="rtl" className="admin-page">
      <header className="admin-page-head">
        <div>
          <span className="admin-page-eyebrow">عملیات فروش</span>
          <h1 className="admin-page-title">مدیریت ارسال و حمل‌ونقل</h1>
          <p className="admin-page-subtitle">
            مرسوله‌ها را ثبت و پیگیری کنید، روش‌ها و مناطق ارسال را تعریف کنید،
            تعرفهٔ هزینه را تنظیم کنید و برچسب، بارنامه و فاکتور چاپ بگیرید.
          </p>
        </div>

        <button
          type="button"
          className="admin-btn"
          onClick={bumpRefresh}
          title="بارگذاری مجدد داده‌های بخش جاری"
        >
          <RefreshCw size={16} /> به‌روزرسانی
        </button>
      </header>

      <nav className="shp-tabs" aria-label="بخش‌های مدیریت ارسال">
        {TABS.map((tab) => {
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              className={`shp-tab${activeTab === tab.id ? " is-active" : ""}`}
              aria-current={activeTab === tab.id ? "page" : undefined}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {activeTab === "dashboard" && (
        <DashboardTab
          refreshToken={refreshToken}
          onRegisterOrder={handleRegisterOrder}
          onOpenShipment={handleOpenShipment}
          onOpenStatus={handleOpenStatus}
        />
      )}

      {activeTab === "shipments" && (
        <ShipmentsTab
          refreshToken={refreshToken}
          presetOrder={presetOrder}
          onConsumedPreset={consumePreset}
          onChanged={bumpRefresh}
          statusPreset={statusPreset}
          openShipmentId={openShipmentId}
          onConsumedNav={consumeNav}
        />
      )}

      {activeTab === "methods" && (
        <MethodsTab refreshToken={refreshToken} onChanged={bumpRefresh} />
      )}

      {activeTab === "zones" && (
        <ZonesTab refreshToken={refreshToken} onChanged={bumpRefresh} />
      )}

      {activeTab === "rules" && (
        <RulesTab refreshToken={refreshToken} onChanged={bumpRefresh} />
      )}

      {activeTab === "page" && (
        <ShippingPageTab onOpenMethods={() => setActiveTab("methods")} />
      )}

      {activeTab === "history" && <HistoryTab refreshToken={refreshToken} />}
    </div>
  );
}
