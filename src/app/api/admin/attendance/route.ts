import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

function checkAdmin(user: { role: string } | null) {
  if (!user || user.role !== "ADMIN") return false;
  return true;
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!checkAdmin(user)) return NextResponse.json({ success: false, error: "无权限" }, { status: 403 });

  const teacherId = request.nextUrl.searchParams.get("teacherId") || "";
  const courseId = request.nextUrl.searchParams.get("courseId") || "";
  const dateFrom = request.nextUrl.searchParams.get("dateFrom") || "";
  const dateTo = request.nextUrl.searchParams.get("dateTo") || "";

  const where: Record<string, unknown> = {};
  if (teacherId) where.course = { ...((where.course as object) || {}), userId: teacherId };
  if (courseId) where.courseId = courseId;
  if (dateFrom || dateTo) {
    where.startTime = {};
    if (dateFrom) (where.startTime as Record<string, unknown>).gte = new Date(dateFrom);
    if (dateTo) (where.startTime as Record<string, unknown>).lte = new Date(dateTo + "T23:59:59");
  }

  const sessions = await prisma.attendanceSession.findMany({
    where, orderBy: { startTime: "desc" }, take: 50,
    include: {
      course: { include: { user: { select: { id: true, name: true } },
        _count: { select: { students: true } } } },
      _count: { select: { records: true } },
    },
  });

  return NextResponse.json({
    success: true,
    data: sessions.map((s) => ({
      id: s.id, startTime: s.startTime.toISOString(), duration: s.duration, status: s.status,
      courseName: s.course.name, teacherName: s.course.user.name, teacherId: s.course.user.id,
      courseId: s.course.id, checkInCount: s._count.records,
      totalStudents: s.course._count.students,
    })),
  });
}
