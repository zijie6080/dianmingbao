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

  const search = request.nextUrl.searchParams.get("search") || "";
  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [{ name: { contains: search } }, { user: { name: { contains: search } } }];
  }

  const courses = await prisma.course.findMany({
    where, orderBy: { updatedAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
      _count: { select: { students: true, attendanceSessions: true } },
    },
  });

  return NextResponse.json({
    success: true,
    data: courses.map((c) => ({
      id: c.id, name: c.name, semester: c.semester, teacherName: c.user.name,
      teacherEmail: c.user.email, studentCount: c._count.students,
      sessionCount: c._count.attendanceSessions,
      createdAt: c.createdAt.toISOString(),
    })),
  });
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!checkAdmin(user)) return NextResponse.json({ success: false, error: "无权限" }, { status: 403 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ success: false, error: "缺少课程ID" }, { status: 400 });

  await prisma.course.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
