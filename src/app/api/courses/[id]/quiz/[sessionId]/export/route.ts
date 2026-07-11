import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { exportQuizSessionExcel } from "@/lib/excel";

// GET /api/courses/[id]/quiz/[sessionId]/export — 导出单次答题详情
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

  const session = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    include: {
      course: {
        include: { students: true },
      },
      submissions: {
        include: { student: true },
      },
    },
  });

  if (!session || session.courseId !== id) {
    return NextResponse.json({ success: false, error: "答题记录不存在" }, { status: 404 });
  }

  const submittedStudentIds = new Map(
    session.submissions.map((s) => [s.studentId, { answer: s.answer, score: s.score }])
  );
  const submitted: { studentId: string; name: string; answer: string; score: number | null }[] = [];
  const notSubmitted: { studentId: string; name: string }[] = [];

  for (const student of session.course.students) {
    if (submittedStudentIds.has(student.id)) {
      const sub = submittedStudentIds.get(student.id)!;
      submitted.push({
        studentId: student.studentId,
        name: student.name,
        answer: sub.answer,
        score: sub.score,
      });
    } else {
      notSubmitted.push({
        studentId: student.studentId,
        name: student.name,
      });
    }
  }

  const sessionLabel = `Quiz ${new Date(session.startTime).toISOString().slice(0, 10)}`;
  const data = exportQuizSessionExcel(submitted, notSubmitted, sessionLabel);

  return new NextResponse(data as unknown as BodyInit, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(course.name + '-答题详情')}.xlsx"`,
    },
  });
}
