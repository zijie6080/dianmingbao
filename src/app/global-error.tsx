"use client";

// 根布局本身出错时的兜底页面（必须自带 html/body，不能依赖全局样式）
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="zh-CN">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif",
          background: "#F8FAFC",
          color: "#1E293B",
          textAlign: "center",
          padding: 16,
        }}
      >
        <title>点名宝 - 出错了</title>
        <h1 style={{ fontSize: 20, margin: 0 }}>页面加载失败</h1>
        <p style={{ fontSize: 14, color: "#64748B", margin: 0 }}>请检查网络后重试</p>
        {error.digest && <p style={{ fontSize: 12, color: "#94A3B8", margin: 0 }}>错误编号：{error.digest}</p>}
        <button
          onClick={() => unstable_retry()}
          style={{
            padding: "10px 24px",
            borderRadius: 12,
            border: "none",
            background: "#2563EB",
            color: "#fff",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          重试
        </button>
      </body>
    </html>
  );
}
