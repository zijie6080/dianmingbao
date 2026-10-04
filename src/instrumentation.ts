import type { Instrumentation } from "next";

/**
 * 捕获所有服务端未处理异常（页面渲染、Route Handler、Server Action），
 * 以结构化 JSON 输出，便于在 Vercel 日志中检索和配置告警。
 * 如需接入 Sentry 等平台，在这里上报即可。
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const error = err as Error & { digest?: string };
  console.error(
    JSON.stringify({
      level: "error",
      context: "request",
      message: error?.message,
      digest: error?.digest,
      method: request.method,
      path: request.path,
      routePath: context.routePath,
      routeType: context.routeType,
      time: new Date().toISOString(),
    })
  );
};
