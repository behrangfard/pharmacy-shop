import {
  channelPresentation,
  formatNumber,
  formatPrice,
  type SalesChannelItem,
} from "./dashboardShared";

export function SalesChannelsChart({ channels }: { channels: SalesChannelItem[] }) {
  const colors: Record<string, string> = {
    website: "#397c91",
    instagram: "#b65d8b",
    phone: "#b47b3c",
    in_person: "#54785a",
    other: "#a5adb6",
  };

  const safeChannels = channels.map((channel) => ({
    ...channel,
    sales: Math.max(0, Number(channel.sales) || 0),
    orders: Math.max(0, Number(channel.orders) || 0),
    percentage: Math.max(0, Number(channel.percentage) || 0),
  }));

  const totalSales = safeChannels.reduce((sum, item) => sum + item.sales, 0);
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr)",
          alignItems: "center",
          gap: 12,
        }}
      >
        <svg
          viewBox="0 0 160 160"
          role="img"
          aria-label="نمودار سهم کانال‌های فروش"
          style={{
            display: "block",
            width: "100%",
            maxWidth: 155,
            margin: "0 auto",
          }}
        >
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="#edf0f2"
            strokeWidth="17"
          />

          {totalSales > 0 &&
            safeChannels.map((channel, index) => {
              const fraction = channel.sales / totalSales;
              const segmentLength = circumference * fraction;
              const currentOffset = offset;
              offset += segmentLength;

              return (
                <circle
                  key={`${channel.channel}-${index}`}
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="none"
                  stroke={colors[channel.channel] ?? "#a5adb6"}
                  strokeWidth="17"
                  strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                  strokeDashoffset={-currentOffset}
                  transform="rotate(-90 80 80)"
                >
                  <title>{`${channel.label}: ${formatPrice(channel.sales)}`}</title>
                </circle>
              );
            })}

          <text x="80" y="74" textAnchor="middle" fill="#89929d" fontSize="10">
            مجموع فروش
          </text>
          <text
            x="80"
            y="94"
            textAnchor="middle"
            fill="#263442"
            fontSize="12"
            fontWeight="800"
          >
            {formatNumber(totalSales)}
          </text>
        </svg>

        <div style={{ minWidth: 0 }}>
          {safeChannels.length === 0 ? (
            <div className="dashboard-empty-note">
              اطلاعات کانال‌های فروش موجود نیست.
            </div>
          ) : (
            safeChannels.map((channel, index) => {
              const presentation =
                channelPresentation[channel.channel] ??
                channelPresentation.other;
              const Icon = presentation.icon;

              return (
                <div
                  key={`${channel.channel}-${index}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 12,
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      flex: "0 0 9px",
                      borderRadius: 3,
                      background: colors[channel.channel] ?? "#a5adb6",
                    }}
                  />
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        color: "#43515f",
                        fontSize: 10,
                        fontWeight: 800,
                      }}
                    >
                      <Icon size={13} aria-hidden="true" />
                      {channel.label || presentation.label}
                    </span>
                    <span
                      style={{
                        display: "block",
                        marginTop: 3,
                        color: "#929ba5",
                        fontSize: 9,
                      }}
                    >
                      {formatNumber(channel.orders)} سفارش
                    </span>
                  </span>
                  <strong
                    style={{
                      color: "#263442",
                      fontSize: 11,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatNumber(channel.percentage)}٪
                  </strong>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="dashboard-channel-list">
        {safeChannels.map((channel, index) => {
          const presentation =
            channelPresentation[channel.channel] ?? channelPresentation.other;
          const color = colors[channel.channel] ?? "#a5adb6";
          const percentage = Math.min(100, channel.percentage);

          return (
            <div
              className="dashboard-channel-row"
              key={`${channel.channel}-detail-${index}`}
            >
              <div className="dashboard-channel-main">
                <span
                  className="dashboard-channel-icon"
                  style={{
                    color: presentation.color,
                    background: presentation.background,
                  }}
                >
                  <presentation.icon size={16} aria-hidden="true" />
                </span>
                <span style={{ minWidth: 0 }}>
                  <span className="dashboard-channel-label">
                    {channel.label || presentation.label}
                  </span>
                  <span
                    className="dashboard-channel-meta"
                    style={{ display: "block" }}
                  >
                    {formatPrice(channel.sales)} ·{" "}
                    {formatNumber(channel.orders)} سفارش
                  </span>
                </span>
              </div>

              <span className="dashboard-channel-percent">
                {formatNumber(channel.percentage)}٪
              </span>

              <div className="dashboard-channel-track">
                <div
                  className="dashboard-channel-progress"
                  style={{ width: `${percentage}%`, background: color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="dashboard-channel-total">
        <span>مجموع فروش کانال‌ها</span>
        <strong>{formatPrice(totalSales)}</strong>
      </div>
    </div>
  );
}

