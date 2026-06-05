import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { exportSessionDetailExcel } from "@/lib/excel";

// GET /api/courses/[id]/attendance/[sessionId]/export — 导出单次签到详情
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "请先登录" }, { status: 401 });
  }

  const { id, sessionId } = await params;

  const course = await prisma.course.findUnique({ where: { id } });
  if (!course || course.userId !== user.userId) {
    return NextResponse.json({ success: false, error: "课程不存在" }, { status: 404 });
  }

  const session = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
    include: {
      course: {
        include: { students: true },
      },
      records: {
        include: { student: true },
      },
    },
  });

  if (!session || session.courseId !== id) {
    return NextResponse.json({ success: false, error: "签到记录不存在" }, { status: 404 });
  }

  const presentStudentIds = new Map(
    session.records.map((r) => [r.studentId, r.type])
  );
  const present: { studentId: string; name: string; type: string }[] = [];
  const absent: { studentId: string; name: string }[] = [];

  for (const student of session.course.students) {
    if (presentStudentIds.has(student.id)) {
      present.push({
        studentId: student.studentId,
        name: student.name,
        type: presentStudentIds.get(student.id)!,
      });
    } else {
      absent.push({
        studentId: student.studentId,
        name: student.name,
      });
    }
  }

  const sessionLabel = `Attendance ${new Date(session.startTime).toISOString().slice(0, 10)}`;
  const data = exportSessionDetailExcel(present, absent, sessionLabel);

  return new NextResponse(data as unknown as BodyInit, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(course.name + '-签到详情')}.xlsx"`,
    },
  });
}
