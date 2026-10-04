import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isUniqueViolation, jsonError, readJson, withApi } from "@/lib/api";

const supplementSchema = z.object({
  studentId: z.string().min(1).max(100),
});

/** 校验登录、课程归属、签到归属，返回解析后的学生ID */
async function authorize(
  request: NextRequest,
  params: Promise<{ id: string; sessionId: string }>
): Promise<{ error: Response } | { courseId: string; sessionId: string; studentId: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: jsonError("请先登录", 401) };

  const { id, sessionId } = await params;

  const course = await prisma.course.findUnique({ where: { id }, select: { userId: true } });
  if (!course || course.userId !== user.userId) {
    return { error: jsonError("课程不存在", 404) };
  }

  const session = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
    select: { courseId: true },
  });
  if (!session || session.courseId !== id) {
    return { error: jsonError("签到记录不存在", 404) };
  }

  const parsed = supplementSchema.safeParse(await readJson(request));
  if (!parsed.success) return { error: jsonError("参数错误", 400) };

  const student = await prisma.student.findUnique({
    where: { id: parsed.data.studentId },
    select: { courseId: true },
  });
  if (!student || student.courseId !== id) {
    return { error: jsonError("学生不存在", 404) };
  }

  return { courseId: id, sessionId, studentId: parsed.data.studentId };
}

// POST /api/courses/[id]/attendance/[sessionId]/supplement
// 教师手动补签，标记为迟到
export const POST = withApi(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) => {
  const auth = await authorize(request, params);
  if ("error" in auth) return auth.error;
  const { sessionId, studentId } = auth;

  try {
    const record = await prisma.attendanceRecord.create({
      data: { sessionId, studentId, type: "late" },
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
    // 连点或学生恰好自己签到了
    if (isUniqueViolation(error)) return jsonError("该学生已签到", 409);
    throw error;
  }
});

// DELETE /api/courses/[id]/attendance/[sessionId]/supplement
// 撤销签到（补签点错、或确认代签时使用），学生会回到「未签到」
export const DELETE = withApi(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) => {
  const auth = await authorize(request, params);
  if ("error" in auth) return auth.error;
  const { sessionId, studentId } = auth;

  const result = await prisma.attendanceRecord.deleteMany({
    where: { sessionId, studentId },
  });
  if (result.count === 0) {
    return jsonError("该学生本次没有签到记录", 404);
  }

  return NextResponse.json({ success: true, message: "已撤销签到" });
});
