/** استایل‌های اختصاصی صفحهٔ «نمای کلی»؛ در همان صفحه با تزریق <style> اعمال می‌شود. */
export const dashboardStyles = `
.dashboard-page {
  --mehr-ink:#17212b;
  --mehr-muted:#89929d;
  --mehr-line:#edf0f2;
  --mehr-shadow:0 8px 26px rgba(35,47,58,.045);
  direction:rtl;
  color:var(--mehr-ink);
  font-family:inherit;
  min-width:0;
  width:100%;
  position:relative;
}
.dashboard-page *, .dashboard-page *::before, .dashboard-page *::after {
  box-sizing:border-box;
}
.dashboard-header {
  display:flex;justify-content:space-between;align-items:flex-end;
  flex-wrap:wrap;gap:18px;margin-bottom:24px;
}
.dashboard-eyebrow {
  display:inline-flex;align-items:center;gap:7px;color:#72808e;
  font-size:11px;font-weight:800;margin-bottom:8px;
}
.dashboard-title {
  margin:0;font-size:clamp(23px,2.5vw,29px);font-weight:900;
  letter-spacing:-.7px;line-height:1.8;color:#17212b;
}
.dashboard-subtitle {margin:4px 0 0;color:#89929d;font-size:12px;line-height:2;}
.dashboard-header-actions {display:flex;align-items:center;flex-wrap:wrap;gap:10px;}
.dashboard-header-badge,.dashboard-refresh-button {
  display:inline-flex;align-items:center;justify-content:center;gap:7px;
  padding:10px 13px;border:1px solid #e8ecef;border-radius:10px;
  background:#fff;color:#687583;font-size:10px;font-weight:700;
}
.dashboard-refresh-button {color:#344454;font-family:inherit;font-size:11px;cursor:pointer;}
.dashboard-refresh-button:hover {background:#f8fafb;border-color:#dce2e6;}
.dashboard-refresh-button:disabled {cursor:not-allowed;opacity:.6;}
.dashboard-section {margin-bottom:25px;min-width:0;}
.dashboard-section-heading {
  display:flex;align-items:center;justify-content:space-between;
  gap:12px;margin-bottom:14px;
}
.dashboard-section-title {margin:0;font-size:15px;font-weight:900;color:#263442;}
.dashboard-section-caption {color:#929ba5;font-size:10px;}
.dashboard-stats-grid {display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;}
.dashboard-stat-card {
  min-width:0;padding:18px;border:1px solid #edf0f2;border-radius:15px;
  background:#fff;box-shadow:var(--mehr-shadow);
  transition:transform .2s ease,box-shadow .2s ease;
}
.dashboard-stat-card:hover {transform:translateY(-2px);box-shadow:0 12px 28px rgba(35,47,58,.07);}
.dashboard-stat-top {display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:16px;}
.dashboard-stat-icon {display:flex;align-items:center;justify-content:center;flex:0 0 42px;width:42px;height:42px;border-radius:12px;}
.dashboard-stat-label {color:#85909c;font-size:11px;font-weight:700;}
.dashboard-stat-value {margin:0;overflow-wrap:anywhere;color:#202d39;font-size:clamp(18px,1.8vw,25px);font-weight:900;line-height:1.8;}
.dashboard-stat-description {margin:5px 0 0;color:#9aa2ab;font-size:10px;line-height:1.9;}
.dashboard-quick-grid {display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;}
.dashboard-quick-card {
  display:flex;flex-direction:column;min-width:0;padding:19px;border:1px solid #edf0f2;
  border-radius:15px;background:#fff;color:inherit;text-decoration:none;box-shadow:var(--mehr-shadow);
  transition:transform .2s ease,border-color .2s ease,box-shadow .2s ease;
}
.dashboard-quick-card:hover {transform:translateY(-2px);border-color:#dfe5e9;box-shadow:0 12px 28px rgba(35,47,58,.07);}
.dashboard-quick-top {display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px;}
.dashboard-quick-icon {display:flex;align-items:center;justify-content:center;width:43px;height:43px;border-radius:12px;}
.dashboard-quick-arrow {color:#a0a8b0;transition:transform .2s ease;}
.dashboard-quick-card:hover .dashboard-quick-arrow {transform:translateX(-3px);}
.dashboard-quick-title {margin:0 0 6px;color:#273542;font-size:13px;font-weight:900;}
.dashboard-quick-description {flex:1;margin:0;color:#8c96a0;font-size:10px;line-height:2.1;}
.dashboard-quick-action {display:inline-flex;align-items:center;gap:6px;margin-top:15px;color:#607687;font-size:10px;font-weight:800;}

/* نمودارها: فروش در سمت راست و عریض‌تر، کانال‌ها در سمت چپ */
.dashboard-charts-grid {
  display:grid;
  direction:rtl;
  grid-template-columns:minmax(0,3fr) minmax(0,1fr);
  gap:16px;
  align-items:stretch;
  margin-bottom:25px;
}
.dashboard-chart-panel {min-width:0;}
.dashboard-chart-panel .dashboard-panel {height:100%;}
.dashboard-lower-grid {display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:16px;align-items:stretch;}
.dashboard-panel {min-width:0;padding:20px;border:1px solid #edf0f2;border-radius:15px;background:#fff;box-shadow:var(--mehr-shadow);}
.dashboard-panel-header {display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px;}
.dashboard-panel-title {margin:0;color:#263442;font-size:13px;font-weight:900;}
.dashboard-panel-subtitle {margin:5px 0 0;color:#9aa2ab;font-size:10px;line-height:1.8;}
.dashboard-status-list {display:flex;flex-direction:column;gap:17px;}
.dashboard-status-row {display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;}
.dashboard-status-info {display:flex;align-items:center;gap:9px;min-width:0;}
.dashboard-status-icon {display:flex;align-items:center;justify-content:center;flex:0 0 34px;width:34px;height:34px;border-radius:10px;}
.dashboard-status-label {color:#586573;font-size:11px;font-weight:700;}
.dashboard-status-value {color:#273542;font-size:12px;font-weight:900;font-variant-numeric:tabular-nums;}
.dashboard-status-track {grid-column:1 / -1;width:100%;height:6px;overflow:hidden;border-radius:999px;background:#f0f2f4;}
.dashboard-status-progress {height:100%;border-radius:inherit;transition:width .35s ease;}
.dashboard-payment-summary {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:17px;}
.dashboard-payment-card {min-width:0;padding:15px;border-radius:12px;}
.dashboard-payment-label {color:#7f8b96;font-size:10px;font-weight:700;}
.dashboard-payment-value {margin-top:7px;overflow-wrap:anywhere;color:#273542;font-size:clamp(17px,2vw,22px);font-weight:900;}
.dashboard-payment-note {margin:0;padding-top:15px;border-top:1px solid #f0f2f4;color:#929ba5;font-size:10px;line-height:2.1;}
.dashboard-message {display:flex;align-items:center;gap:10px;margin-bottom:20px;padding:15px;border:1px solid #f2d6cf;border-radius:12px;background:#fff7f4;color:#a95842;font-size:12px;line-height:1.9;}
.dashboard-message button {margin-right:auto;padding:7px 10px;border:1px solid #ecd2ca;border-radius:8px;background:#fff;color:#a95842;font-family:inherit;font-size:10px;font-weight:800;cursor:pointer;}
.dashboard-loading {display:flex;align-items:center;justify-content:center;gap:10px;min-height:180px;border:1px solid #edf0f2;border-radius:15px;background:#fff;color:#89929d;font-size:12px;}
.dashboard-spin {animation:dashboard-spin 1s linear infinite;}
@keyframes dashboard-spin {to {transform:rotate(360deg);}}
.dashboard-welcome-card {
  position:relative;isolation:isolate;overflow:hidden;display:grid;
  grid-template-columns:minmax(0,1fr) minmax(230px,290px);align-items:center;
  gap:28px;margin:0 0 26px;padding:27px 29px;min-width:0;
  border:1px solid #35515a;border-radius:18px;
  background:linear-gradient(118deg,#263f4b 0%,#2d4b56 55%,#385b65 100%);
  color:#fff;box-shadow:0 13px 32px rgba(29,55,64,.12);
}
.dashboard-welcome-card::before {content:"";position:absolute;z-index:-1;width:290px;height:290px;left:-100px;top:-175px;border:1px solid rgba(229,194,123,.2);border-radius:50%;box-shadow:0 0 0 24px rgba(229,194,123,.035),0 0 0 50px rgba(229,194,123,.025);}
.dashboard-welcome-content {position:relative;z-index:1;min-width:0;}
.dashboard-welcome-label {display:inline-flex;align-items:center;gap:7px;margin-bottom:11px;color:#e5c27b;font-size:10px;font-weight:800;}
.dashboard-welcome-title {margin:0;color:#fff;font-size:clamp(19px,2vw,24px);font-weight:900;line-height:1.9;}
.dashboard-welcome-description {max-width:500px;margin:5px 0 0;color:#cfdbde;font-size:11px;line-height:2.2;}
.dashboard-welcome-link {display:inline-flex;align-items:center;justify-content:center;gap:8px;margin-top:17px;padding:10px 14px;border:1px solid rgba(229,194,123,.42);border-radius:9px;background:rgba(229,194,123,.1);color:#f4dca6;font-family:inherit;font-size:10px;font-weight:800;text-decoration:none;transition:background .2s ease;}
.dashboard-welcome-link:hover {background:rgba(229,194,123,.18);}
.dashboard-weekly-sales {position:relative;z-index:1;min-width:0;padding:18px 19px;border:1px solid rgba(255,255,255,.14);border-radius:13px;background:rgba(255,255,255,.075);}
.dashboard-weekly-sales-top {display:flex;align-items:center;justify-content:space-between;gap:10px;}
.dashboard-weekly-sales-label {color:#d1dfe1;font-size:10px;font-weight:700;}
.dashboard-weekly-sales-icon {display:flex;align-items:center;justify-content:center;width:36px;height:36px;border:1px solid rgba(229,194,123,.23);border-radius:10px;background:rgba(229,194,123,.11);color:#e5c27b;}
.dashboard-weekly-sales-value {margin:8px 0 9px;color:#fff;font-size:clamp(20px,2.2vw,27px);font-weight:900;line-height:1.8;overflow-wrap:anywhere;}
.dashboard-weekly-sales-meta {display:flex;align-items:center;flex-wrap:wrap;gap:7px;margin-top:6px;color:#c5d4d7;font-size:9px;line-height:1.9;}
.dashboard-weekly-change {display:inline-flex;align-items:center;gap:4px;padding:4px 7px;border-radius:7px;font-size:10px;font-weight:800;}
.dashboard-weekly-change.is-up {background:rgba(119,207,145,.14);color:#a8e5b7;}
.dashboard-weekly-change.is-down {background:rgba(255,157,132,.14);color:#ffc0ae;}
.dashboard-weekly-change.is-neutral {background:rgba(255,255,255,.09);color:#d5dfe0;}
.dashboard-weekly-divider {height:1px;margin:12px 0;background:rgba(255,255,255,.12);}
.dashboard-weekly-period {color:#b9cbd0;font-size:9px;line-height:1.9;}
.dashboard-chart-value {font-size:12px;font-weight:900;color:#263442;overflow-wrap:anywhere;}
.dashboard-chart-muted {color:#929ba5;font-size:10px;line-height:2;}
.dashboard-trend { display:flex;flex-direction:column;gap:14px;min-width:0; }
.dashboard-trend-head { display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap; }
.dashboard-trend-headline { display:flex;flex-direction:column;gap:5px;min-width:0; }
.dashboard-trend-headline-label { color:#98a2ad;font-size:10px;font-weight:700; }
.dashboard-trend-headline-value { color:#1f2d3a;font-size:clamp(16px,1.9vw,21px);font-weight:900;line-height:1.7;overflow-wrap:anywhere; }
.dashboard-trend-change { display:inline-flex;align-items:center;gap:5px;align-self:flex-start;max-width:100%;padding:4px 9px;border-radius:999px;font-size:10px;font-weight:800;line-height:1.9;white-space:normal; }
.dashboard-trend-change small { font-size:9px;font-weight:600;opacity:.72; }
.dashboard-trend-change.is-up { background:#eaf5ec;color:#3f7a52; }
.dashboard-trend-change.is-down { background:#fbeeea;color:#c0664e; }
.dashboard-trend-change.is-neutral { background:#f1f4f6;color:#7b8791; }
.dashboard-trend-tabs { display:inline-flex;align-items:center;gap:3px;padding:4px;border:1px solid #e9edea;border-radius:12px;background:#f6f9f6; }
.dashboard-trend-tab { padding:6px 13px;border:0;border-radius:9px;background:transparent;color:#7d8994;font-family:inherit;font-size:11px;font-weight:800;cursor:pointer;transition:background .18s ease,color .18s ease,box-shadow .18s ease; }
.dashboard-trend-tab:hover { color:#456b51;background:#ecf2e9; }
.dashboard-trend-tab.is-active { background:#fff;color:#2f5c3b;box-shadow:0 4px 12px rgba(47,92,59,.13); }
.dashboard-trend-tab:focus-visible { outline:2px solid #8fb79a;outline-offset:2px; }
.dashboard-trend-meta { display:flex;flex-wrap:wrap;align-items:center;gap:6px 18px;color:#8b959f;font-size:10px; }
.dashboard-trend-meta span { display:inline-flex;align-items:center;gap:6px; }
.dashboard-trend-meta strong { color:#4a5763;font-weight:800; }
.dashboard-trend-meta i { display:inline-block;width:7px;height:7px;border-radius:50%;background:#638965; }
.dashboard-chart-wrap { width:100%;min-width:0;height:300px;min-height:240px;display:flex;align-items:stretch; }
.dashboard-chart-svg { display:block;width:100%;height:100%;max-height:none;min-height:0;overflow:visible; }
.dashboard-chart-gridline {stroke:#eef1f3;stroke-width:1;stroke-dasharray:3 5;}
.dashboard-chart-label {fill:#98a2ad;font-size:9.5px;font-family:inherit;}
.dashboard-chart-axis {stroke:#e6ebe7;stroke-width:1;}
.dashboard-trend-chart-wrap {position:relative;}
.dashboard-trend-hit {cursor:crosshair;}
.dashboard-trend-detail { display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:11px 14px;border:1px solid #eaf0ea;border-radius:12px;background:#f8faf7;transition:background .2s ease,border-color .2s ease; }
.dashboard-trend-detail.is-active { border-color:#d7e6db;background:#f3f9f2; }
.dashboard-trend-detail-label { display:block;color:#9aa4ae;font-size:9px;font-weight:700; }
.dashboard-trend-detail-date { display:block;margin-top:2px;color:#33414e;font-size:11px;font-weight:800; }
.dashboard-trend-detail-metrics { display:flex;align-items:center;gap:16px;flex-wrap:wrap; }
.dashboard-trend-detail-metrics span { display:flex;flex-direction:column;gap:2px; }
.dashboard-trend-detail-metrics b { color:#2f5c3b;font-size:11px;font-weight:900; }
.dashboard-trend-detail-metrics small { color:#9aa4ae;font-size:9px; }
.dashboard-trend-empty, .dashboard-trend-error { display:flex;flex-direction:column;align-items:center;gap:6px;padding:26px 18px;border:1px dashed #e3eae4;border-radius:14px;background:#fafcfa;text-align:center;color:#8b959f; }
.dashboard-trend-empty p, .dashboard-trend-error p { margin:0;color:#4d5b68;font-size:11px;font-weight:800; }
.dashboard-trend-empty span { font-size:10px;line-height:1.9; }
.dashboard-trend-error { border-color:#f0ded8;background:#fdf7f5;color:#c0664e; }
.dashboard-trend-error p { color:#8a5142; }
.dashboard-trend-error button { margin-top:4px;padding:6px 14px;border:0;border-radius:9px;background:#fff;color:#c0664e;font-family:inherit;font-size:10px;font-weight:800;box-shadow:0 3px 10px rgba(192,102,78,.14);cursor:pointer; }
.dashboard-trend-skeleton { display:flex;flex-direction:column;gap:10px; }
.dashboard-trend-skeleton span { height:14px;border-radius:8px;background:linear-gradient(90deg,#f2f5f2 25%,#e8eee8 37%,#f2f5f2 63%);background-size:400% 100%;animation:dashboardShimmer 1.4s ease infinite; }
.dashboard-trend-skeleton span:nth-child(1) { height:24px;width:44%; }
.dashboard-trend-skeleton span:nth-child(2) { height:210px;border-radius:14px; }
.dashboard-trend-skeleton span:nth-child(3) { height:42px;border-radius:12px; }
@keyframes dashboardShimmer { 0% {background-position:100% 0;} 100% {background-position:0 0;} }
.dashboard-channel-list {display:flex;flex-direction:column;gap:15px;margin-top:20px;}
.dashboard-channel-row {display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;}
.dashboard-channel-main {display:flex;align-items:center;gap:9px;min-width:0;}
.dashboard-channel-icon {display:flex;align-items:center;justify-content:center;flex:0 0 34px;width:34px;height:34px;border-radius:10px;}
.dashboard-channel-label {color:#43515f;font-size:11px;font-weight:800;}
.dashboard-channel-meta {margin-top:3px;color:#929ba5;font-size:9px;}
.dashboard-channel-percent {color:#263442;font-size:12px;font-weight:900;white-space:nowrap;}
.dashboard-channel-track {grid-column:1 / -1;height:6px;overflow:hidden;border-radius:ظpx;background:#f0f2f4;}
.dashboard-channel-progress {height:100%;border-radius:inherit;}
.dashboard-channel-total {display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:20px;padding-top:15px;border-top:1px solid #edf0f2;color:#7d8994;font-size:10px;}
.dashboard-empty-note {padding:14px;border-radius:10px;background:#f7f9fa;color:#929ba5;font-size:10px;line-height:2;}

/* شبکهٔ بخش‌های نمای کلی؛ ترتیب و نمایش با «چیدمان» قابل تغییر است */
.dashboard-blocks {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;align-items:start;}
.dashboard-block {position:relative;min-width:0;display:flex;flex-direction:column;gap:10px;}
.dashboard-block[data-span="full"] {grid-column:1 / -1;}
.dashboard-block > .dashboard-section {margin-bottom:0;}
.dashboard-block .dashboard-welcome-card {margin:0;}
.dashboard-block > .dashboard-panel {margin:0;}
.dashboard-block.is-dragging {opacity:.5;}
.dashboard-block.is-drop-before::before,
.dashboard-block.is-drop-after::after {
  content:"";position:absolute;inset-inline:0;height:3px;border-radius:3px;
  background:#7fa889;box-shadow:0 0 10px rgba(127,168,137,.55);
}
.dashboard-block.is-drop-before::before {top:-10px;}
.dashboard-block.is-drop-after::after {bottom:-10px;}
.dashboard-block-bar {
  display:flex;align-items:center;justify-content:space-between;gap:8px;
  padding:6px 9px;border:1px dashed #cfdbd2;border-radius:10px;background:#f7faf6;
  color:#5b6b60;font-size:10px;font-weight:800;
}
.dashboard-block-bar-title {display:inline-flex;align-items:center;gap:6px;min-width:0;}
.dashboard-block-grip {display:inline-flex;align-items:center;color:#7d8c81;cursor:grab;}
.dashboard-block-grip:active {cursor:grabbing;}
.dashboard-block-actions {display:inline-flex;align-items:center;gap:3px;}
.dashboard-block-action {
  display:inline-flex;align-items:center;justify-content:center;width:23px;height:23px;padding:0;
  border:1px solid #e1e8e2;border-radius:7px;background:#fff;color:#5b6b60;cursor:pointer;
}
.dashboard-block-action:hover:not(:disabled) {background:#edf4e9;color:#3f5a45;}
.dashboard-block-action:disabled {opacity:.4;cursor:not-allowed;}
.dashboard-block-empty {
  grid-column:1 / -1;padding:22px;border:1px dashed #dfe7e1;border-radius:14px;
  background:#fbfcfb;color:#8b959f;font-size:11px;text-align:center;line-height:2;
}
.dashboard-layout-tools {position:relative;display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap;}
.dashboard-layout-toggle.is-active {background:#edf4e9;border-color:#d6e4d8;color:#3f5a45;}
.dashboard-layout-popover {
  position:absolute;z-index:30;top:calc(100% + 8px);inset-inline-end:0;
  width:min(330px,calc(100vw - 40px));max-height:min(430px,70vh);overflow:auto;
  padding:8px;background:#fff;border:1px solid #e6ece7;border-radius:14px;
  box-shadow:0 16px 36px rgba(30,45,35,.14);text-align:right;
}
.dashboard-layout-popover-title {margin:0;padding:8px 10px;color:#7d8a83;font-size:10px;font-weight:800;}
.dashboard-layout-item {
  display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;
  padding:9px 10px;border:0;border-radius:10px;background:transparent;color:#33443a;
  font:inherit;font-size:11px;font-weight:800;text-align:right;cursor:pointer;
}
.dashboard-layout-item:hover {background:#f3f8f1;}
.dashboard-layout-item small {display:block;margin-top:3px;color:#929c95;font-size:9.5px;font-weight:600;line-height:1.9;}
.dashboard-layout-item-state {display:inline-flex;align-items:center;gap:4px;flex:0 0 auto;color:#5b7b62;font-size:9.5px;}
.dashboard-layout-item.is-added .dashboard-layout-item-state {color:#9aa4a0;}
.dashboard-layout-hint {margin:0;padding:8px 10px 4px;color:#96a09a;font-size:9.5px;line-height:1.9;}
.dashboard-health-list {display:flex;flex-direction:column;gap:14px;}
.dashboard-health-row {display:flex;flex-direction:column;gap:7px;}
.dashboard-health-head {display:flex;align-items:center;justify-content:space-between;gap:10px;}
.dashboard-health-label {color:#53616d;font-size:11px;font-weight:800;}
.dashboard-health-value {color:#263442;font-size:12px;font-weight:900;}
.dashboard-health-track {height:7px;overflow:hidden;border-radius:6px;background:#f0f2f4;}
.dashboard-health-progress {height:100%;border-radius:inherit;}
.dashboard-health-note {margin:0;color:#98a1aa;font-size:9.5px;line-height:2;}
.dashboard-health-foot {display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:16px;padding-top:13px;border-top:1px solid #edf0f2;color:#7d8994;font-size:10px;}
.dashboard-shortcut-list {display:flex;flex-direction:column;gap:9px;}
.dashboard-shortcut {display:flex;align-items:center;gap:10px;padding:10px 11px;border:1px solid #edf0f2;border-radius:11px;color:inherit;text-decoration:none;background:#fff;}
.dashboard-shortcut:hover {border-color:#dfe7e1;background:#f9fbf8;}
.dashboard-shortcut-icon {display:flex;align-items:center;justify-content:center;flex:0 0 32px;width:32px;height:32px;border-radius:9px;background:#eef4ea;color:#54785a;}
.dashboard-shortcut-text {min-width:0;}
.dashboard-shortcut-title {display:block;color:#33414e;font-size:11px;font-weight:800;}
.dashboard-shortcut-description {display:block;margin-top:2px;color:#98a1aa;font-size:9.5px;line-height:1.8;}
/* میان‌بر بخش‌های منو که از سایدبار روی نمای کلی کشیده شده‌اند */
.dashboard-shortcut-block {display:flex;flex-direction:column;gap:12px;}
.dashboard-shortcut-block .dashboard-panel-header {margin-bottom:0;}
.dashboard-shortcut-block .dashboard-shortcut-icon {flex:0 0 34px;width:34px;height:34px;border-radius:10px;}
.dashboard-shortcut-block-text {margin:0;color:#8d98a2;font-size:10.5px;line-height:2;}
.dashboard-shortcut-block-link {display:inline-flex;align-items:center;gap:6px;align-self:flex-start;margin-top:auto;padding:7px 13px;border-radius:9px;background:#f1f6ee;color:#4d6f54;font-size:10px;font-weight:800;text-decoration:none;transition:background-color .15s ease;}
.dashboard-shortcut-block-link:hover {background:#e6f0e1;}
.dashboard-shortcut-dropzone {
  position:absolute;inset:0;z-index:80;margin:-6px;display:flex;align-items:center;justify-content:center;gap:9px;
  border:2px dashed #8fb395;border-radius:16px;background:rgba(244,249,241,.42);backdrop-filter:blur(1px);
  color:#3f6047;font-size:12px;font-weight:800;pointer-events:none;
}
.dashboard-layout-item-main {display:inline-flex;align-items:center;gap:8px;min-width:0;color:#5b7b62;}
.dashboard-layout-item-main > svg {flex:0 0 auto;}
.dashboard-layout-item-main > span {min-width:0;}

@media (max-width:1100px) {
  .dashboard-blocks {grid-template-columns:minmax(0,1fr);}
  .dashboard-stats-grid {grid-template-columns:repeat(2,minmax(0,1fr));}
  .dashboard-lower-grid {grid-template-columns:minmax(0,1fr);}
  .dashboard-charts-grid {grid-template-columns:minmax(0,2fr) minmax(0,1fr);}
}
@media (max-width:760px) {
  .dashboard-quick-grid {grid-template-columns:minmax(0,1fr);}
  .dashboard-header {align-items:flex-start;}
  .dashboard-header-actions {width:100%;}
  .dashboard-welcome-card {grid-template-columns:minmax(0,1fr) minmax(210px,.8fr);gap:17px;padding:21px;}
  .dashboard-charts-grid {grid-template-columns:minmax(0,1fr);}
  .dashboard-chart-wrap {height:270px;min-height:220px;}
}
@media (max-width:600px) {
  .dashboard-welcome-card {grid-template-columns:minmax(0,1fr);gap:17px;padding:19px;}
  .dashboard-weekly-sales {padding:16px;}
  .dashboard-welcome-title {font-size:19px;}
}
@media (max-width:480px) {
  .dashboard-stats-grid {grid-template-columns:minmax(0,1fr);}
  .dashboard-stat-card,.dashboard-panel {padding:15px;}
  .dashboard-payment-summary {grid-template-columns:minmax(0,1fr);}
  .dashboard-chart-wrap {height:235px;min-height:200px;}
  .dashboard-trend-headline-value {font-size:16px;}
  .dashboard-trend-tabs {width:100%;justify-content:space-between;}
  .dashboard-trend-tab {flex:1;padding:7px 6px;}
  .dashboard-trend-detail-metrics {gap:12px;}
  .dashboard-title {font-size:23px;}
  .dashboard-header-badge {display:none;}
}
@media (prefers-reduced-motion:reduce) {
  .dashboard-page *, .dashboard-page *::before, .dashboard-page *::after {
    animation-duration:.01ms !important;animation-iteration-count:1 !important;
    transition-duration:.01ms !important;scroll-behavior:auto !important;
  }
}
`;
