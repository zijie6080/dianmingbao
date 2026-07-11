import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const scoreSchema = z.object({
  submissionId: z.string().min(1),
  score: z.number().int().min(0).max(100),
});

// PATCH /api/courses/[id]/quiz/[sessionId]/score — 教师打分
export async function PATCH(
  request: NextRequest,
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
    return NextResponse.json({ success: false, error: "答题记录不存在" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const parsed = scoreSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "参数错误" }, { status: 400 });
    }

    const { submissionId, score } = parsed.data;

    // 验证提交属于此答题
    const submission = await prisma.quizSubmission.findUnique({
      where: { id: submissionId },
    });
    if (!submission || submission.sessionId !== sessionId) {
      return NextResponse.json({ success: false, error: "提交记录不存在" }, { status: 404 });
    }

    const updated = await prisma.quizSubmission.update({
      where: { id: submissionId },
      data: { score },
    });

    return NextResponse.json({
      success: true,
      message: "打分成功",
      data: {
        id: updated.id,
        score: updated.score,
      },
    });
  } catch (error) {
    console.error("Score error:", error);
    return NextResponse.json({ success: false, error: "打分失败" }, { status: 500 });
  }
}
