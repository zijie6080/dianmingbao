import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const quizSubmitSchema = z.object({
  token: z.string().min(1, "答题Token不能为空"),
  name: z.string().min(1, "请输入姓名"),
  answer: z.string().min(1, "请输入答案"),
  fingerprint: z.string().optional(),
});

// POST /api/quiz-submit — 学生提交答案（无需登录，只需输入姓名和答案）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = quizSubmitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { token, name, answer, fingerprint } = parsed.data;

    // 1. 验证答题Token
    const session = await prisma.quizSession.findUnique({
      where: { token },
      include: { course: { include: { user: { select: { name: true } } } } },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "无效的答题二维码" },
        { status: 404 }
      );
    }

    if (session.status === "ended") {
      return NextResponse.json(
        { success: false, error: "答题已结束" },
        { status: 400 }
      );
    }

    // 检查答题是否超时
    const sessionEnd = new Date(session.startTime);
    sessionEnd.setMinutes(sessionEnd.getMinutes() + session.duration);
    if (new Date() > sessionEnd) {
      await prisma.quizSession.update({
        where: { id: session.id },
        data: { status: "ended", endTime: sessionEnd },
      });
      return NextResponse.json(
        { success: false, error: "答题已超时结束" },
        { status: 400 }
      );
    }

    // 2. 设备指纹防代答：同一设备只能提交一次
    if (fingerprint) {
      const deviceSubmission = await prisma.quizSubmission.findFirst({
        where: {
          sessionId: session.id,
          deviceFingerprint: fingerprint,
        },
      });

      if (deviceSubmission) {
        return NextResponse.json(
          { success: false, error: "此设备已提交过，请使用自己的手机答题" },
          { status: 409 }
        );
      }
    }

    // 3. 根据姓名查找学生（同一课程内）
    const students = await prisma.student.findMany({
      where: {
        courseId: session.courseId,
        name,
      },
    });

    if (students.length === 0) {
      return NextResponse.json(
        { success: false, error: "姓名不在课程名单中，请检查后重试" },
        { status: 400 }
      );
    }

    if (students.length > 1) {
      return NextResponse.json(
        { success: false, error: "存在同名同学，请联系老师确认" },
        { status: 400 }
      );
    }

    const student = students[0];

    // 4. 防止同一学生重复提交
    const existingSubmission = await prisma.quizSubmission.findUnique({
      where: {
        sessionId_studentId: {
          sessionId: session.id,
          studentId: student.id,
        },
      },
    });

    if (existingSubmission) {
      return NextResponse.json(
        { success: false, error: "你已提交过答案了" },
        { status: 409 }
      );
    }

    // 5. 创建答题记录（包含答案和设备指纹）
    const submission = await prisma.quizSubmission.create({
      data: {
        sessionId: session.id,
        studentId: student.id,
        answer,
        deviceFingerprint: fingerprint || null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "提交成功！",
        data: {
          studentName: student.name,
          studentId: student.studentId,
          courseName: session.course.name,
          teacherName: session.course.user.name,
          answer,
          timestamp: submission.timestamp.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Quiz submit error:", error);
    return NextResponse.json(
      { success: false, error: "提交失败，请稍后重试" },
      { status: 500 }
    );
  }
}
