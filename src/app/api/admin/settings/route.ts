import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { readJson, withApi } from "@/lib/api";

const ALLOWED_KEYS = new Set(["siteName", "logo", "copyright", "announcement"]);

function checkAdmin(user: { role: string } | null) {
  if (!user || user.role !== "ADMIN") return false;
  return true;
}

export const GET = withApi(async () => {
  const user = await getCurrentUser();
  if (!checkAdmin(user)) return NextResponse.json({ success: false, error: "无权限" }, { status: 403 });

  const configs = await prisma.appConfig.findMany();
  const map: Record<string, string> = {
    siteName: "点名宝", logo: "", copyright: "", announcement: "",
  };
  for (const c of configs) map[c.key] = c.value;

  return NextResponse.json({ success: true, data: map });
});

export const PUT = withApi(async (request: NextRequest) => {
  const user = await getCurrentUser();
  if (!checkAdmin(user)) return NextResponse.json({ success: false, error: "无权限" }, { status: 403 });

  const body = await readJson(request);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ success: false, error: "请求格式错误" }, { status: 400 });
  }
  // 只允许已知配置项，防止写入任意 key
  const entries = Object.entries(body as Record<string, unknown>).filter(
    (entry): entry is [string, string] =>
      ALLOWED_KEYS.has(entry[0]) && typeof entry[1] === "string"
  );
  if (entries.some(([, value]) => value.length > 2000)) {
    return NextResponse.json({ success: false, error: "内容过长" }, { status: 400 });
  }
  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.appConfig.upsert({ where: { key }, update: { value }, create: { key, value } })
    )
  );

  return NextResponse.json({ success: true, message: "设置已保存" });
});
