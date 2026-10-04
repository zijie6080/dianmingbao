import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, readJson, withApi } from "@/lib/api";
import { getCourseSummaries } from "@/lib/stats";

// GET /api/courses — 获取课程列表
export const GET = withApi(async () => {
  const user = await getCurrentUser();
  if (!user) {
    return jsonError("请先登录", 401);
  }

  return NextResponse.json({ success: true, data: await getCourseSummaries(user.userId) });
});

const createCourseSchema = z.object({
  name: z.string().trim().min(1, "请输入课程名称").max(50, "课程名称最多50字"),
  semester: z.string().trim().min(1, "请输入学期").max(30, "学期最多30字"),
});

// POST /api/courses — 创建课程
export const POST = withApi(async (request: NextRequest) => {
  const user = await getCurrentUser();
  if (!user) {
    return jsonError("请先登录", 401);
  }

  const parsed = createCourseSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0].message, 400);
  }

  const course = await prisma.course.create({
    data: {
      name: parsed.data.name,
      semester: parsed.data.semester,
      userId: user.userId,
    },
  });

  return NextResponse.json(
    {
      success: true,
      data: {
        id: course.id,
        name: course.name,
        semester: course.semester,
        userId: course.userId,
        studentCount: 0,
        sessionCount: 0,
        averageAttendanceRate: 0,
        createdAt: course.createdAt.toISOString(),
        updatedAt: course.updatedAt.toISOString(),
      },
    },
    { status: 201 }
  );
});
