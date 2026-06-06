import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

function checkAdmin(user: { role: string } | null) {
  if (!user || user.role !== "ADMIN") return false;
  return true;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!checkAdmin(user)) return NextResponse.json({ success: false, error: "无权限" }, { status: 403 });

  const configs = await prisma.appConfig.findMany();
  const map: Record<string, string> = {
    siteName: "点名宝", logo: "", copyright: "", announcement: "",
  };
  for (const c of configs) map[c.key] = c.value;

  return NextResponse.json({ success: true, data: map });
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser();
  if (!checkAdmin(user)) return NextResponse.json({ success: false, error: "无权限" }, { status: 403 });

  const body = await request.json();
  for (const [key, value] of Object.entries(body)) {
    if (typeof value !== "string") continue;
    await prisma.appConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  return NextResponse.json({ success: true, message: "设置已保存" });
}
