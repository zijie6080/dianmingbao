import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/courses/[id]/students — 获取学生列表
export async function GET(
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

  const search = request.nextUrl.searchParams.get("search") || "";

  const where: Record<string, unknown> = { courseId: id };
  if (search) {
    where.OR = [
      { studentId: { contains: search } },
      { name: { contains: search } },
    ];
  }

  const students = await prisma.student.findMany({
    where,
    orderBy: { studentId: "asc" },
  });

  return NextResponse.json({
    success: true,
    data: students.map((s) => ({
      id: s.id,
      studentId: s.studentId,
      name: s.name,
      courseId: s.courseId,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
  });
}

const createStudentSchema = z.object({
  studentId: z.string().min(1, "请输入学号"),
  name: z.string().min(1, "请输入姓名"),
});

// POST /api/courses/[id]/students — 添加学生
export async function POST(
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
    const parsed = createStudentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    // 检查学号是否已存在
    const existing = await prisma.student.findUnique({
      where: { courseId_studentId: { courseId: id, studentId: parsed.data.studentId } },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "该学号已存在" },
        { status: 409 }
      );
    }

    const student = await prisma.student.create({
      data: {
        studentId: parsed.data.studentId,
        name: parsed.data.name,
        courseId: id,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: student.id,
          studentId: student.studentId,
          name: student.name,
          courseId: student.courseId,
          createdAt: student.createdAt.toISOString(),
          updatedAt: student.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create student error:", error);
    return NextResponse.json(
      { success: false, error: "添加学生失败" },
      { status: 500 }
    );
  }
}
