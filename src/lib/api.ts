import { NextResponse } from "next/server";

/** 统一的错误响应 */
export function jsonError(error: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ success: false, error, ...extra }, { status });
}

/** 触发限流时的响应 */
export function tooManyRequests(retryAfterSec: number, message = "操作太频繁，请稍后再试") {
  return NextResponse.json(
    { success: false, error: message },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
  );
}

/** Prisma 错误码（不直接依赖生成的 client，避免循环引用） */
function prismaCode(error: unknown): string | undefined {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

/** 是否为唯一约束冲突（并发重复提交时会触发） */
export function isUniqueViolation(error: unknown): boolean {
  return prismaCode(error) === "P2002";
}

/** 结构化错误日志，方便在 Vercel / 日志平台检索 */
export function logError(context: string, error: unknown, extra?: Record<string, unknown>) {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error(
    JSON.stringify({
      level: "error",
      context,
      message: err.message,
      code: prismaCode(error),
      stack: err.stack?.split("\n").slice(0, 5).join("\n"),
      ...extra,
      time: new Date().toISOString(),
    })
  );
}

/**
 * 包装 Route Handler：任何未捕获异常都会被转成友好的 JSON 响应，
 * 而不是 Next.js 默认的 500 HTML 页面（前端 res.json() 会因此崩溃）。
 */
export function withApi<A extends unknown[]>(
  handler: (...args: A) => Promise<Response>
): (...args: A) => Promise<Response> {
  return async (...args: A) => {
    try {
      return await handler(...args);
    } catch (error) {
      // 请求体不是合法 JSON
      if (error instanceof SyntaxError) {
        return jsonError("请求格式错误", 400);
      }
      const code = prismaCode(error);
      if (code === "P2002") return jsonError("数据已存在，请勿重复提交", 409);
      if (code === "P2025") return jsonError("数据不存在或已被删除", 404);

      const request = args[0] as Request | undefined;
      let path: string | undefined;
      try {
        path = request?.url ? new URL(request.url).pathname : undefined;
      } catch {
        path = undefined;
      }
      logError("api", error, { method: request?.method, path });
      return jsonError("服务器繁忙，请稍后重试", 500);
    }
  };
}

/** 读取 JSON 请求体；非法 JSON 返回 null，由调用方返回 400 */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/** 生成 Excel 下载响应（正确处理中文文件名） */
export function xlsxResponse(data: ArrayBuffer, filename: string) {
  const encoded = encodeURIComponent(`${filename}.xlsx`);
  return new NextResponse(data as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="export.xlsx"; filename*=UTF-8''${encoded}`,
      "Cache-Control": "no-store",
    },
  });
}
