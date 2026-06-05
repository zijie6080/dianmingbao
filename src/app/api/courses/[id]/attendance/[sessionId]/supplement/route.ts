import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const supplementSchema = z.object({
  studentId: z.string().min(1),
});

// POST /api/courses/[id]/attendance/[sessionId]/supplement
// 教师手动补签，标记为迟到
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "请先登录" }, { status: 401 });
  }

  const { id, sessionId } = await params;

  // 验证课程归属
  const course = await prisma.course.findUnique({ where: { id } });
  if (!course || course.userId !== user.userId) {
    return NextResponse.json({ success: false, error: "课程不存在" }, { status: 404 });
  }

  const session = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
  });
  if (!session || session.courseId !== id) {
    return NextResponse.json({ success: false, error: "签到记录不存在" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const parsed = supplementSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "参数错误" }, { status: 400 });
    }

    const { studentId } = parsed.data;

    // 检查学生属于此课程
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student || student.courseId !== id) {
      return NextResponse.json({ success: false, error: "学生不存在" }, { status: 404 });
    }

    // 检查是否已有记录
    const existing = await prisma.attendanceRecord.findUnique({
      where: {
        sessionId_studentId: { sessionId, studentId },
      },
    });

    if (existing) {
      return NextResponse.json({ success: false, error: "该学生已签到" }, { status: 409 });
    }

    // 创建补签记录，标记为迟到
    const record = await prisma.attendanceRecord.create({
      data: {
        sessionId,
        studentId,
        type: "late",
      },
      include: { student: true },
    });

    return NextResponse.json({
      success: true,
      message: "补签成功（迟到）",
      data: {
        id: record.id,
        studentName: record.student.name,
        studentId: record.student.studentId,
        type: record.type,
        timestamp: record.timestamp.toISOString(),
      },
    });
  } catch (error) {
    console.error("Supplement error:", error);
    return NextResponse.json({ success: false, error: "补签失败" }, { status: 500 });
  }
}
