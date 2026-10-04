import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/api";

export const dynamic = "force-dynamic";

// GET /api/health — 健康检查（给 UptimeRobot / 监控平台用）
export async function GET() {
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: "ok", db: "ok", dbLatencyMs: Date.now() - started, time: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    logError("health", error);
    return NextResponse.json(
      { status: "error", db: "unreachable", time: new Date().toISOString() },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
