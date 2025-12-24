"use client";

import { ConfigProvider, theme as antdTheme } from "antd";

export default function Providers({ children }) {
  return (
    <ConfigProvider
      theme={{
        algorithm: antdTheme.darkAlgorithm,
        token: {
          colorPrimary: "#22d3ee",
          colorInfo: "#22d3ee",
          colorBgBase: "#0b1220",
          colorTextBase: "#e5e7eb",
          colorTextSecondary: "#9ca3af",
          borderRadius: 12,
          fontFamily:
            '"Segoe UI", "Inter", "PingFang SC", "Microsoft YaHei", sans-serif',
        },
        components: {
          Card: {
            colorBgContainer: "rgba(17, 24, 39, 0.9)",
            colorBorderSecondary: "#1f2937",
            boxShadowTertiary: "0 24px 60px rgba(0, 0, 0, 0.4)",
          },
          Layout: {
            bodyBg: "#0b1220",
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
