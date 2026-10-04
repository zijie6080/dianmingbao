import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createQuizQrAuth, getQuizSessionDetail, endQuizSession } from "@/lib/quiz";
import { withApi } from "@/lib/api";

// GET /api/courses/[id]/quiz/[sessionId] — 获取答题详情
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

  const detail = await getQuizSessionDetail(sessionId);
  if (!detail || detail.session.courseId !== id) {
    return NextResponse.json(
      { success: false, error: "答题记录不存在" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      ...detail,
      qrAuth: detail.session.status === "active"
        ? createQuizQrAuth(detail.session.token)
        : null,
    },
  });
});

// PUT /api/courses/[id]/quiz/[sessionId] — 结束答题
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

  const session = await prisma.quizSession.findUnique({
    where: { id: sessionId },
  });
  if (!session || session.courseId !== id) {
    return NextResponse.json(
      { success: false, error: "答题记录不存在" },
      { status: 404 }
    );
  }

  // 已结束（例如已超时自动结束）也视为成功，避免老师点「结束」时报错
  if (session.status !== "ended") {
    await endQuizSession(sessionId);
  }

  return NextResponse.json({ success: true, message: "答题已结束" });
});
