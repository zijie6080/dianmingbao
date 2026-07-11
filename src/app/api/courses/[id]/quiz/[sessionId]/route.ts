import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getQuizSessionDetail, endQuizSession } from "@/lib/quiz";

// GET /api/courses/[id]/quiz/[sessionId] — 获取答题详情
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

  const detail = await getQuizSessionDetail(sessionId);
  if (!detail || detail.session.courseId !== id) {
    return NextResponse.json(
      { success: false, error: "答题记录不存在" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: detail });
}

// PUT /api/courses/[id]/quiz/[sessionId] — 结束答题
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

  const session = await prisma.quizSession.findUnique({
    where: { id: sessionId },
  });
  if (!session || session.courseId !== id) {
    return NextResponse.json(
      { success: false, error: "答题记录不存在" },
      { status: 404 }
    );
  }

  if (session.status === "ended") {
    return NextResponse.json(
      { success: false, error: "答题已结束" },
      { status: 400 }
    );
  }

  await endQuizSession(sessionId);

  return NextResponse.json({ success: true, message: "答题已结束" });
}
