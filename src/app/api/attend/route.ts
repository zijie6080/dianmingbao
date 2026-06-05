import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const checkInSchema = z.object({
  token: z.string().min(1, "签到Token不能为空"),
  studentId: z.string().min(1, "请输入学号"),
  name: z.string().min(1, "请输入姓名"),
});

// POST /api/attend — 学生签到（无需登录）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = checkInSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { token, studentId, name } = parsed.data;

    // 1. 验证签到Token
    const session = await prisma.attendanceSession.findUnique({
      where: { token },
      include: { course: { include: { user: { select: { name: true } } } } },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "无效的签到二维码" },
        { status: 404 }
      );
    }

    if (session.status === "ended") {
      return NextResponse.json(
        { success: false, error: "签到已结束" },
        { status: 400 }
      );
    }

    // 检查签到是否超时
    const sessionEnd = new Date(session.startTime);
    sessionEnd.setMinutes(sessionEnd.getMinutes() + session.duration);
    if (new Date() > sessionEnd) {
      // 自动结束签到
      await prisma.attendanceSession.update({
        where: { id: session.id },
        data: { status: "ended", endTime: sessionEnd },
      });
      return NextResponse.json(
        { success: false, error: "签到已超时结束" },
        { status: 400 }
      );
    }

    // 2. 验证学生身份（学号 + 课程匹配，再验证姓名）
    const student = await prisma.student.findUnique({
      where: {
        courseId_studentId: {
          courseId: session.courseId,
          studentId,
        },
      },
    });

    if (!student) {
      return NextResponse.json(
        { success: false, error: "学号不存在，请检查后重试" },
        { status: 400 }
      );
    }

    if (student.name !== name) {
      return NextResponse.json(
        { success: false, error: `姓名不匹配：学号 ${studentId} 对应的是「${student.name}」，你输入的是「${name}」` },
        { status: 400 }
      );
    }

    // 3. 防止重复签到
    const existingRecord = await prisma.attendanceRecord.findUnique({
      where: {
        sessionId_studentId: {
          sessionId: session.id,
          studentId: student.id,
        },
      },
    });

    if (existingRecord) {
      return NextResponse.json(
        { success: false, error: "你已签到过了" },
        { status: 409 }
      );
    }

    // 4. 创建签到记录
    const record = await prisma.attendanceRecord.create({
      data: {
        sessionId: session.id,
        studentId: student.id,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "签到成功！",
        data: {
          studentName: student.name,
          studentId: student.studentId,
          courseName: session.course.name,
          teacherName: session.course.user.name,
          timestamp: record.timestamp.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Check-in error:", error);
    return NextResponse.json(
      { success: false, error: "签到失败，请稍后重试" },
      { status: 500 }
    );
  }
}
