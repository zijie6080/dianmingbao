import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { exportQuizCourseExcel } from "@/lib/excel";

// GET /api/courses/[id]/quiz/export — 导出课程全部答题记录
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "请先登录" }, { status: 401 });
  }

  const { id } = await params;

  const course = await prisma.course.findUnique({ where: { id } });
  if (!course || course.userId !== user.userId) {
    return NextResponse.json({ success: false, error: "课程不存在" }, { status: 404 });
  }

  const sessions = await prisma.quizSession.findMany({
    where: { courseId: id },
    include: {
      submissions: { include: { student: true } },
    },
    orderBy: { startTime: "desc" },
  });

  const rows: { studentId: string; name: string; date: string; answer: string; score: number | null }[] = [];

  for (const session of sessions) {
    const dateLabel = new Date(session.startTime).toLocaleDateString("zh-CN", {
      month: "long", day: "numeric",
    });
    for (const sub of session.submissions) {
      rows.push({
        studentId: sub.student.studentId,
        name: sub.student.name,
        date: dateLabel,
        answer: sub.answer,
        score: sub.score,
      });
    }
  }

  const data = exportQuizCourseExcel(rows, course.name);

  return new NextResponse(data as unknown as BodyInit, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(course.name + '-答题记录')}.xlsx"`,
    },
  });
}
