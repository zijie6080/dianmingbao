import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createAttendQrAuth, getSessionDetail, endSession } from "@/lib/attendance";
import { withApi } from "@/lib/api";
import { extendSession } from "@/lib/extend-session";

// GET /api/courses/[id]/attendance/[sessionId] — 获取签到详情
export const GET = withApi(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) => {
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

  return NextResponse.json({
    success: true,
    data: {
      ...detail,
      qrAuth: detail.session.status === "active" ? createAttendQrAuth(detail.session.token) : null,
    },
  });
});

// PUT /api/courses/[id]/attendance/[sessionId] — 结束签到
export const PUT = withApi(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) => {
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

  // 已结束（例如已超时自动结束）也视为成功，避免老师点「结束」时报错
  if (session.status !== "ended") {
    await endSession(sessionId);
  }

  return NextResponse.json({ success: true, message: "签到已结束" });
});

// PATCH — 延长进行中的签到（body: { extendMinutes }）
export const PATCH = withApi(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) => {
  const { id, sessionId } = await params;
  return extendSession("attend", request, id, sessionId);
});
