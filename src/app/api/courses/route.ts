import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/courses — 获取课程列表
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: "请先登录" },
      { status: 401 }
    );
  }

  const courses = await prisma.course.findMany({
    where: { userId: user.userId },
    include: {
      _count: { select: { students: true, attendanceSessions: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  // 计算每个课程的平均出勤率
  const coursesWithRate = await Promise.all(
    courses.map(async (course) => {
      const sessions = await prisma.attendanceSession.findMany({
        where: { courseId: course.id },
        select: {
          _count: { select: { records: true } },
        },
      });

      let totalRate = 0;
      let count = 0;
      for (const s of sessions) {
        if (course._count.students > 0) {
          totalRate += (s._count.records / course._count.students) * 100;
          count++;
        }
      }

      return {
        id: course.id,
        name: course.name,
        semester: course.semester,
        userId: course.userId,
        studentCount: course._count.students,
        sessionCount: course._count.attendanceSessions,
        averageAttendanceRate: count > 0 ? totalRate / count : 0,
        createdAt: course.createdAt.toISOString(),
        updatedAt: course.updatedAt.toISOString(),
      };
    })
  );

  return NextResponse.json({ success: true, data: coursesWithRate });
}

const createCourseSchema = z.object({
  name: z.string().min(1, "请输入课程名称"),
  semester: z.string().min(1, "请输入学期"),
});

// POST /api/courses — 创建课程
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: "请先登录" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const parsed = createCourseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
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
  } catch (error) {
    console.error("Create course error:", error);
    return NextResponse.json(
      { success: false, error: "创建课程失败" },
      { status: 500 }
    );
  }
}
