import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, readJson } from "@/lib/api";

const schema = z.object({ extendMinutes: z.number().int().min(1).max(10) });
/** 单轮签到 / 答题最长时长（分钟） */
const MAX_DURATION = 120;

/**
 * 延长进行中的签到 / 答题（老师点「+1 分钟」）。
 * 只改 duration，学生已拿到的访问凭证仍然有效（凭证只校验签名，超时按本轮截止时间判断）。
 */
export async function extendSession(
  kind: "attend" | "quiz",
  request: Request,
  courseId: string,
  sessionId: string
) {
  const user = await getCurrentUser();
  if (!user) return jsonError("请先登录", 401);

  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { userId: true } });
  if (!course || course.userId !== user.userId) return jsonError("课程不存在", 404);

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("参数错误", 400);

  const model = kind === "attend" ? prisma.attendanceSession : prisma.quizSession;
  const session = await (model as typeof prisma.attendanceSession).findUnique({
    where: { id: sessionId },
    select: { courseId: true, status: true, startTime: true, duration: true },
  });
  if (!session || session.courseId !== courseId) return jsonError("记录不存在", 404);

  const deadline = session.startTime.getTime() + session.duration * 60_000;
  if (session.status !== "active" || Date.now() >= deadline) {
    return jsonError("已经结束，无法延长", 400, { code: "ENDED" });
  }

  const duration = Math.min(MAX_DURATION, session.duration + parsed.data.extendMinutes);
  if (duration === session.duration) return jsonError(`单轮最长 ${MAX_DURATION} 分钟`, 400);

  // 只在仍为进行中时更新，避免与「结束」并发时把已结束的记录改回去
  const result = await (model as typeof prisma.attendanceSession).updateMany({
    where: { id: sessionId, status: "active" },
    data: { duration },
  });
  if (result.count === 0) return jsonError("已经结束，无法延长", 400, { code: "ENDED" });

  return NextResponse.json({ success: true, data: { duration } });
}
