import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/courses/[id] — 获取课程详情
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
    include: {
      _count: { select: { students: true, attendanceSessions: true } },
    },
  });

  if (!course || course.userId !== user.userId) {
    return NextResponse.json({ success: false, error: "课程不存在" }, { status: 404 });
  }

  // 计算平均出勤率
  const sessions = await prisma.attendanceSession.findMany({
    where: { courseId: course.id },
    select: { _count: { select: { records: true } } },
  });

  let totalRate = 0;
  let count = 0;
  for (const s of sessions) {
    if (course._count.students > 0) {
      totalRate += (s._count.records / course._count.students) * 100;
      count++;
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      id: course.id,
      name: course.name,
      semester: course.semester,
      userId: course.userId,
      studentCount: course._count.students,
      sessionCount: course._count.attendanceSessions,
      averageAttendanceRate: count > 0 ? totalRate / count : 0,
      createdAt: course.createdAt.toISOString(),
      updatedAt: course.updatedAt.toISOString(),
    },
  });
}

const updateCourseSchema = z.object({
  name: z.string().min(1, "请输入课程名称").optional(),
  semester: z.string().min(1, "请输入学期").optional(),
});

// PUT /api/courses/[id] — 更新课程
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
}

// DELETE /api/courses/[id] — 删除课程
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
}
