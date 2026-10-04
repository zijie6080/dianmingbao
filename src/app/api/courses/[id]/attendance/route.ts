import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, readJson, tooManyRequests, withApi } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { PRESENT_RECORD_WHERE } from "@/lib/stats";
import {
  closeExpiredAttendanceSessions,
  createAttendanceSession,
  createAttendQrAuth,
} from "@/lib/attendance";

// GET /api/courses/[id]/attendance — 获取签到列表
export const GET = withApi(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await getCurrentUser();
  if (!user) {
    return jsonError("请先登录", 401);
  }

  const { id } = await params;

  const course = await prisma.course.findUnique({
    where: { id },
    include: { _count: { select: { students: true } } },
  });
  if (!course || course.userId !== user.userId) {
    return jsonError("课程不存在", 404);
  }

  await closeExpiredAttendanceSessions(id);

  const sessions = await prisma.attendanceSession.findMany({
    where: { courseId: id },
    include: {
      _count: { select: { records: { where: PRESENT_RECORD_WHERE } } },
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
      checkInCount: s._count.records,
      totalStudents,
      createdAt: s.createdAt.toISOString(),
      qrAuth: s.status === "active" ? createAttendQrAuth(s.token) : null,
    })),
  });
});

const createSessionSchema = z.object({
  duration: z
    .number()
    .int()
    .min(1, "签到时长至少1分钟")
    .max(60, "签到时长最多60分钟")
    .default(5),
});

// POST /api/courses/[id]/attendance — 创建签到任务
export const POST = withApi(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await getCurrentUser();
  if (!user) {
    return jsonError("请先登录", 401);
  }

  const { id } = await params;

  // 防止连点重复创建
  const limit = rateLimit(`start-attend:${user.userId}`, 10, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSec);

  const course = await prisma.course.findUnique({
    where: { id },
    include: { _count: { select: { students: true } } },
  });
  if (!course || course.userId !== user.userId) {
    return jsonError("课程不存在", 404);
  }

  if (course._count.students === 0) {
    return jsonError("请先添加学生", 400);
  }

  const parsed = createSessionSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0].message, 400);
  }

  const session = await createAttendanceSession(id, parsed.data.duration);

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
        checkInCount: 0,
        totalStudents: course._count.students,
        createdAt: session.createdAt.toISOString(),
        qrAuth: createAttendQrAuth(session.token),
      },
    },
    { status: 201 }
  );
});
