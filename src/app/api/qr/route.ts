import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

// GET /api/qr?url=https://... — 生成签到二维码 PNG 图片
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "缺少 url 参数" }, { status: 400 });
  }

  try {
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
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("QR generation error:", error);
    return NextResponse.json({ error: "生成二维码失败" }, { status: 500 });
  }
}
