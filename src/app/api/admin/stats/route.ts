import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ success: false, error: "无权限" }, { status: 403 });
  }

  const [teacherCount, courseCount, studentCount, sessionCount, recentTeachers, recentSessions] =
    await Promise.all([
      prisma.user.count({ where: { role: "TEACHER" } }),
      prisma.course.count(),
      prisma.student.count(),
      prisma.attendanceSession.count(),
      prisma.user.findMany({
        where: { role: "TEACHER" },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, name: true, email: true, status: true, createdAt: true,
          _count: { select: { courses: true } },
        },
      }),
      prisma.attendanceSession.findMany({
        orderBy: { startTime: "desc" },
        take: 5,
        include: {
          course: { select: { name: true } },
          _count: { select: { records: true } },
        },
      }),
    ]);

  return NextResponse.json({
    success: true,
    data: {
      teacherCount, courseCount, studentCount, sessionCount,
      recentTeachers: recentTeachers.map((t) => ({
        id: t.id, name: t.name, email: t.email, status: t.status,
        courseCount: t._count.courses, createdAt: t.createdAt.toISOString(),
      })),
      recentSessions: recentSessions.map((s) => ({
        id: s.id, courseName: s.course.name, startTime: s.startTime.toISOString(),
        checkInCount: s._count.records, status: s.status,
      })),
    },
  });
}
