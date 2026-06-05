import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/check-session?token=xxx — 检查签到任务是否有效（学生端使用，无需登录）
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { success: false, error: "缺少签到Token" },
      { status: 400 }
    );
  }

  const session = await prisma.attendanceSession.findUnique({
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
    return NextResponse.json(
      { success: false, error: "无效的签到链接" },
      { status: 404 }
    );
  }

  if (session.status === "ended") {
    return NextResponse.json(
      { success: false, error: "签到已结束" },
      { status: 400 }
    );
  }

  // 检查是否超时
  const sessionEnd = new Date(session.startTime);
  sessionEnd.setMinutes(sessionEnd.getMinutes() + session.duration);
  if (new Date() > sessionEnd) {
    await prisma.attendanceSession.update({
      where: { id: session.id },
      data: { status: "ended", endTime: sessionEnd },
    });
    return NextResponse.json(
      { success: false, error: "签到已超时结束" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      courseName: session.course.name,
      teacherName: session.course.user.name,
      duration: session.duration,
      status: session.status,
    },
  });
}
