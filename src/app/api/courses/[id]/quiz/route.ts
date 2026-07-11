import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createQuizSession } from "@/lib/quiz";

// GET /api/courses/[id]/quiz — 获取答题列表
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "请先登录" }, { status: 401 });
  }

  const { id } = await params;

  const course = await prisma.course.findUnique({
    where: { id },
    include: { _count: { select: { students: true } } },
  });
  if (!course || course.userId !== user.userId) {
    return NextResponse.json({ success: false, error: "课程不存在" }, { status: 404 });
  }

  const sessions = await prisma.quizSession.findMany({
    where: { courseId: id },
    include: {
      _count: { select: { submissions: true } },
    },
    orderBy: { startTime: "desc" },
  });

  const totalStudents = course._count.students;

  return NextResponse.json({
    success: true,
    data: sessions.map((s) => ({
      id: s.id,
      courseId: s.courseId,
      token: s.token,
      startTime: s.startTime.toISOString(),
      endTime: s.endTime?.toISOString() || null,
      duration: s.duration,
      status: s.status,
      submissionCount: s._count.submissions,
      totalStudents,
      createdAt: s.createdAt.toISOString(),
    })),
  });
}

const createQuizSchema = z.object({
  duration: z
    .number()
    .int()
    .min(1, "答题时长至少1分钟")
    .max(60, "答题时长最多60分钟")
    .default(5),
});

// POST /api/courses/[id]/quiz — 创建答题任务
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "请先登录" }, { status: 401 });
  }

  const { id } = await params;

  const course = await prisma.course.findUnique({
    where: { id },
    include: { _count: { select: { students: true } } },
  });
  if (!course || course.userId !== user.userId) {
    return NextResponse.json({ success: false, error: "课程不存在" }, { status: 404 });
  }

  if (course._count.students === 0) {
    return NextResponse.json(
      { success: false, error: "请先添加学生" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const parsed = createQuizSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const session = await createQuizSession(id, parsed.data.duration);

    return NextResponse.json(
      {
        success: true,
        data: {
          id: session.id,
          courseId: session.courseId,
          token: session.token,
          startTime: session.startTime.toISOString(),
          endTime: null,
          duration: session.duration,
          status: session.status,
          submissionCount: 0,
          totalStudents: course._count.students,
          createdAt: session.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create quiz error:", error);
    return NextResponse.json(
      { success: false, error: "创建答题失败" },
      { status: 500 }
    );
  }
}
