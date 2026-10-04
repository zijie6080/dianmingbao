import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, tooManyRequests, withApi } from "@/lib/api";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import {
  attendanceDeadline,
  createAttendAccessTicket,
  expireIfOverdue,
  verifyAttendQrAuth,
} from "@/lib/attendance";

// GET /api/check-session?token=xxx&t=bucket&sig=xxx — 检查签到任务是否有效（学生端使用，无需登录）
export const GET = withApi(async (request: NextRequest) => {
  // 同一教室常共用一个出口 IP，阈值要宽松
  const limit = rateLimit(`check-session:${getClientIp(request)}`, 600, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSec);

  const token = request.nextUrl.searchParams.get("token");
  const bucket = Number(request.nextUrl.searchParams.get("t"));
  const signature = request.nextUrl.searchParams.get("sig") || "";

  if (!token) {
    return jsonError("缺少签到Token", 400);
  }

  const found = await prisma.attendanceSession.findUnique({
    where: { token },
    include: {
      course: {
        include: {
          user: { select: { name: true } },
        },
      },
    },
  });

  if (!found) {
    return jsonError("无效的签到链接", 404);
  }

  const session = await expireIfOverdue(found);
  if (session.status === "ended") {
    return jsonError("签到已结束", 400, { code: "ENDED" });
  }

  if (!verifyAttendQrAuth(token, bucket, signature)) {
    return jsonError("二维码已刷新，请重新扫描老师屏幕上的二维码", 400, { code: "QR_EXPIRED" });
  }

  const deadline = attendanceDeadline(session);
  return NextResponse.json({
    success: true,
    data: {
      courseName: session.course.name,
      teacherName: session.course.user.name,
      duration: session.duration,
      status: session.status,
      endsAt: deadline.toISOString(),
      accessTicket: createAttendAccessTicket(session.id, deadline),
    },
  });
});
