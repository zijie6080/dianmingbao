import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, tooManyRequests, withApi } from "@/lib/api";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { createQuizAccessTicket, quizDeadline, verifyQuizQrAuth } from "@/lib/quiz";

// GET /api/check-quiz?token=xxx — 检查答题任务是否有效（学生端使用，无需登录）
export const GET = withApi(async (request: NextRequest) => {
  const limit = rateLimit(`check-quiz:${getClientIp(request)}`, 600, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSec);

  const token = request.nextUrl.searchParams.get("token");
  const bucket = Number(request.nextUrl.searchParams.get("t"));
  const signature = request.nextUrl.searchParams.get("sig") || "";

  if (!token) {
    return jsonError("缺少答题Token", 400);
  }

  const session = await prisma.quizSession.findUnique({
    where: { token },
    include: {
      course: {
        include: {
          user: { select: { name: true } },
        },
      },
    },
  });

  if (!session) {
    return jsonError("无效的答题链接", 404);
  }

  if (session.status === "ended") {
    return jsonError("答题已结束", 400, { code: "ENDED" });
  }

  // 检查是否超时
  const sessionEnd = quizDeadline(session);
  if (Date.now() >= sessionEnd.getTime()) {
    await prisma.quizSession.updateMany({
      where: { id: session.id, status: "active" },
      data: { status: "ended", endTime: sessionEnd },
    });
    return jsonError("答题已超时结束", 400, { code: "ENDED" });
  }

  if (!verifyQuizQrAuth(token, bucket, signature)) {
    return jsonError("二维码已刷新，请重新扫描老师屏幕上的二维码", 400, { code: "QR_EXPIRED" });
  }

  return NextResponse.json({
    success: true,
    data: {
      courseName: session.course.name,
      teacherName: session.course.user.name,
      duration: session.duration,
      status: session.status,
      endsAt: sessionEnd.toISOString(),
      accessTicket: createQuizAccessTicket(session.id, sessionEnd),
    },
  });
});
