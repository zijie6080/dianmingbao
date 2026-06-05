import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getSessionDetail, endSession } from "@/lib/attendance";

// GET /api/courses/[id]/attendance/[sessionId] — 获取签到详情
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "请先登录" }, { status: 401 });
  }

  const { id, sessionId } = await params;

  const course = await prisma.course.findUnique({ where: { id } });
  if (!course || course.userId !== user.userId) {
    return NextResponse.json({ success: false, error: "课程不存在" }, { status: 404 });
  }

  const detail = await getSessionDetail(sessionId);
  if (!detail || detail.session.courseId !== id) {
    return NextResponse.json(
      { success: false, error: "签到记录不存在" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: detail });
}

// PUT /api/courses/[id]/attendance/[sessionId] — 结束签到
export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "请先登录" }, { status: 401 });
  }

  const { id, sessionId } = await params;

  const course = await prisma.course.findUnique({ where: { id } });
  if (!course || course.userId !== user.userId) {
    return NextResponse.json({ success: false, error: "课程不存在" }, { status: 404 });
  }

  const session = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
  });
  if (!session || session.courseId !== id) {
    return NextResponse.json(
      { success: false, error: "签到记录不存在" },
      { status: 404 }
    );
  }

  if (session.status === "ended") {
    return NextResponse.json(
      { success: false, error: "签到已结束" },
      { status: 400 }
    );
  }

  await endSession(sessionId);

  return NextResponse.json({ success: true, message: "签到已结束" });
}
