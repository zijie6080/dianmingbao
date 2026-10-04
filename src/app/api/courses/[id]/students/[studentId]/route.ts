import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isUniqueViolation, withApi } from "@/lib/api";
import { cleanText } from "@/lib/names";

// PUT /api/courses/[id]/students/[studentId] — 编辑学生
export const PUT = withApi(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) => {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "请先登录" }, { status: 401 });
  }

  const { id, studentId } = await params;

  const course = await prisma.course.findUnique({ where: { id } });
  if (!course || course.userId !== user.userId) {
    return NextResponse.json({ success: false, error: "课程不存在" }, { status: 404 });
  }

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student || student.courseId !== id) {
    return NextResponse.json({ success: false, error: "学生不存在" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const schema = z.object({
      studentId: z.string().trim().min(1, "请输入学号").max(30, "学号最多30位").optional(),
      name: z.string().trim().min(1, "请输入姓名").max(50, "姓名最多50字").transform(cleanText).optional(),
    });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    // 如果修改学号，检查新学号是否已被占用
    if (parsed.data.studentId && parsed.data.studentId !== student.studentId) {
      const duplicate = await prisma.student.findUnique({
        where: {
          courseId_studentId: {
            courseId: id,
            studentId: parsed.data.studentId,
          },
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { success: false, error: "该学号已存在" },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.student.update({
      where: { id: studentId },
      data: parsed.data,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        studentId: updated.studentId,
        name: updated.name,
        courseId: updated.courseId,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json({ success: false, error: "该学号已存在" }, { status: 409 });
    }
    console.error("Update student error:", error);
    return NextResponse.json(
      { success: false, error: "更新学生失败" },
      { status: 500 }
    );
  }
});

// DELETE /api/courses/[id]/students/[studentId] — 删除学生
export const DELETE = withApi(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) => {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "请先登录" }, { status: 401 });
  }

  const { id, studentId } = await params;

  const course = await prisma.course.findUnique({ where: { id } });
  if (!course || course.userId !== user.userId) {
    return NextResponse.json({ success: false, error: "课程不存在" }, { status: 404 });
  }

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student || student.courseId !== id) {
    return NextResponse.json({ success: false, error: "学生不存在" }, { status: 404 });
  }

  await prisma.student.delete({ where: { id: studentId } });

  return NextResponse.json({ success: true, message: "学生已删除" });
});
