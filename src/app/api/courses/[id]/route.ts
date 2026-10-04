import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getSessionCounts, sessionRate } from "@/lib/stats";
import { withApi } from "@/lib/api";

// GET /api/courses/[id] — 获取课程详情
export const GET = withApi(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "请先登录" }, { status: 401 });
  }

  const { id } = await params;
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      _count: { select: { students: true, attendanceSessions: true } },
    },
  });

  if (!course || course.userId !== user.userId) {
    return NextResponse.json({ success: false, error: "课程不存在" }, { status: 404 });
  }

  // 计算平均出勤率（请假不计入应到）
  const sessions = await prisma.attendanceSession.findMany({
    where: { courseId: course.id },
    select: { id: true },
  });
  const counts = await getSessionCounts(sessions.map((s) => s.id));
  const rates = sessions.map((s) => {
    const c = counts.get(s.id) ?? { present: 0, leave: 0 };
    return sessionRate(c.present, c.leave, course._count.students);
  });

  return NextResponse.json({
    success: true,
    data: {
      id: course.id,
      name: course.name,
      semester: course.semester,
      userId: course.userId,
      studentCount: course._count.students,
      sessionCount: course._count.attendanceSessions,
      averageAttendanceRate:
        course._count.students > 0 && rates.length > 0
          ? rates.reduce((a, b) => a + b, 0) / rates.length
          : 0,
      createdAt: course.createdAt.toISOString(),
      updatedAt: course.updatedAt.toISOString(),
    },
  });
});

const updateCourseSchema = z.object({
  name: z.string().trim().min(1, "请输入课程名称").max(50, "课程名称最多50字").optional(),
  semester: z.string().trim().min(1, "请输入学期").max(30, "学期最多30字").optional(),
});

// PUT /api/courses/[id] — 更新课程
export const PUT = withApi(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "请先登录" }, { status: 401 });
  }

  const { id } = await params;
  const course = await prisma.course.findUnique({ where: { id } });
  if (!course || course.userId !== user.userId) {
    return NextResponse.json({ success: false, error: "课程不存在" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const parsed = updateCourseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const updated = await prisma.course.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        semester: updated.semester,
        userId: updated.userId,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Update course error:", error);
    return NextResponse.json(
      { success: false, error: "更新课程失败" },
      { status: 500 }
    );
  }
});

// DELETE /api/courses/[id] — 删除课程
export const DELETE = withApi(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "请先登录" }, { status: 401 });
  }

  const { id } = await params;
  const course = await prisma.course.findUnique({ where: { id } });
  if (!course || course.userId !== user.userId) {
    return NextResponse.json({ success: false, error: "课程不存在" }, { status: 404 });
  }

  await prisma.course.delete({ where: { id } });

  return NextResponse.json({ success: true, message: "课程已删除" });
});
