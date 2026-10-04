import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isUniqueViolation, jsonError, readJson, withApi } from "@/lib/api";

const supplementSchema = z.object({
  studentId: z.string().min(1).max(100),
  // late：补签（记为迟到）；leave：请假/公假（不算缺勤，也不计入应到）
  type: z.enum(["late", "leave"]).default("late"),
  // 「撤回」误操作：按删除前的原样恢复（包括学生自己扫码的记录及其时间）
  restore: z
    .object({
      type: z.enum(["normal", "late", "leave"]),
      timestamp: z.string().datetime(),
      deviceFingerprint: z.string().max(100).nullable().optional(),
    })
    .optional(),
});

type Restore = z.infer<typeof supplementSchema>["restore"];

/** 校验登录、课程归属、签到归属，返回解析后的学生ID */
async function authorize(
  request: NextRequest,
  params: Promise<{ id: string; sessionId: string }>
): Promise<
  | { error: Response }
  | { courseId: string; sessionId: string; studentId: string; type: "late" | "leave"; restore: Restore }
> {
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

  return {
    courseId: id,
    sessionId,
    studentId: parsed.data.studentId,
    type: parsed.data.type,
    restore: parsed.data.restore,
  };
}

// POST /api/courses/[id]/attendance/[sessionId]/supplement
// 教师手动标记：补签（迟到）或 请假/公假。已有老师标记的记录可以互相切换。
export const POST = withApi(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) => {
  const auth = await authorize(request, params);
  if ("error" in auth) return auth.error;
  const { sessionId, studentId, type, restore } = auth;
  const label = type === "leave" ? "已标记请假" : "补签成功（迟到）";

  if (restore) {
    try {
      await prisma.attendanceRecord.create({
        data: {
          sessionId,
          studentId,
          type: restore.type,
          timestamp: new Date(restore.timestamp),
          deviceFingerprint: restore.deviceFingerprint ?? null,
        },
      });
    } catch (error) {
      if (isUniqueViolation(error)) return jsonError("该学生已有签到记录", 409);
      throw error;
    }
    return NextResponse.json({ success: true, message: "已撤回" });
  }

  const existing = await prisma.attendanceRecord.findUnique({
    where: { sessionId_studentId: { sessionId, studentId } },
  });
  if (existing) {
    // 学生自己扫码签到的记录不覆盖，避免误操作
    if (existing.type === "normal") return jsonError("该学生已自行签到", 409);
    if (existing.type === type) return jsonError(type === "leave" ? "该学生已是请假状态" : "该学生已补签", 409);
    await prisma.attendanceRecord.update({ where: { id: existing.id }, data: { type } });
    return NextResponse.json({ success: true, message: label });
  }

  try {
    const record = await prisma.attendanceRecord.create({
      data: { sessionId, studentId, type },
      include: { student: true },
    });

    return NextResponse.json({
      success: true,
      message: label,
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
    if (isUniqueViolation(error)) return jsonError("该学生已有签到记录，请刷新页面", 409);
    throw error;
  }
});

// DELETE /api/courses/[id]/attendance/[sessionId]/supplement
// 撤销签到 / 请假（补签点错、确认代签时使用），学生会回到「未签到」
export const DELETE = withApi(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) => {
  const auth = await authorize(request, params);
  if ("error" in auth) return auth.error;
  const { sessionId, studentId } = auth;

  const record = await prisma.attendanceRecord.findUnique({
    where: { sessionId_studentId: { sessionId, studentId } },
  });
  if (!record) {
    return jsonError("该学生本次没有签到记录", 404);
  }
  await prisma.attendanceRecord.deleteMany({ where: { id: record.id } });

  // 返回被删除的记录，前端「撤回」时原样恢复
  return NextResponse.json({
    success: true,
    message: "已撤销签到",
    data: {
      type: record.type,
      timestamp: record.timestamp.toISOString(),
      deviceFingerprint: record.deviceFingerprint,
    },
  });
});
