import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { exportSessionDetailExcel } from "@/lib/excel";
import { withApi, xlsxResponse } from "@/lib/api";
import { formatIsoDate, formatTime } from "@/lib/format";

// GET /api/courses/[id]/attendance/[sessionId]/export — 导出单次签到详情
export const GET = withApi(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) => {
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
        include: { students: { orderBy: { studentId: "asc" } } },
      },
      records: {
        select: { studentId: true, type: true, timestamp: true },
      },
    },
  });

  if (!session || session.courseId !== id) {
    return NextResponse.json({ success: false, error: "签到记录不存在" }, { status: 404 });
  }

  const presentStudentIds = new Map(
    session.records.map((r) => [r.studentId, r])
  );
  const present: { studentId: string; name: string; type: string; time: string }[] = [];
  const absent: { studentId: string; name: string }[] = [];

  for (const student of session.course.students) {
    const record = presentStudentIds.get(student.id);
    if (record) {
      present.push({
        studentId: student.studentId,
        name: student.name,
        type: record.type,
        time: formatTime(record.timestamp),
      });
    } else {
      absent.push({
        studentId: student.studentId,
        name: student.name,
      });
    }
  }

  const day = formatIsoDate(session.startTime);
  const data = exportSessionDetailExcel(present, absent, `签到 ${day}`);
  return xlsxResponse(data, `${course.name}-签到详情-${day}`);
});
