import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { jsonError, tooManyRequests, withApi } from "@/lib/api";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

// GET /api/qr?url=https://... — 生成签到二维码 PNG 图片
export const GET = withApi(async (request: NextRequest) => {
  const limit = rateLimit(`qr:${getClientIp(request)}`, 120, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSec);

  const url = request.nextUrl.searchParams.get("url");

  if (!url || url.length > 500) {
    return jsonError("缺少 url 参数", 400);
  }

  // 只为本站的签到/答题链接生成二维码，防止被当成公共二维码服务滥用
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return jsonError("url 参数无效", 400);
  }
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (target.host !== host || !/^\/(attend|quiz)\//.test(target.pathname)) {
    return jsonError("url 参数无效", 400);
  }

  const pngBuffer = await QRCode.toBuffer(url, {
    type: "png",
    width: 400,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
    errorCorrectionLevel: "L",
  });

  return new NextResponse(new Uint8Array(pngBuffer), {
    headers: {
      "Content-Type": "image/png",
      // 每个链接都带签名，内容不会变；允许浏览器短暂缓存
      "Cache-Control": "private, max-age=60",
    },
  });
});
