import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const checkInSchema = z.object({
  token: z.string().min(1, "签到Token不能为空"),
  name: z.string().min(1, "请输入姓名"),
  fingerprint: z.string().optional(),
});

// POST /api/attend — 学生签到（无需登录，只需输入姓名）
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

    const { token, name, fingerprint } = parsed.data;

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
      await prisma.attendanceSession.update({
        where: { id: session.id },
        data: { status: "ended", endTime: sessionEnd },
      });
      return NextResponse.json(
        { success: false, error: "签到已超时结束" },
        { status: 400 }
      );
    }

    // 2. 设备指纹防代签：同一设备只能签到一次
    if (fingerprint) {
      const deviceRecord = await prisma.attendanceRecord.findFirst({
        where: {
          sessionId: session.id,
          deviceFingerprint: fingerprint,
        },
      });

      if (deviceRecord) {
        return NextResponse.json(
          { success: false, error: "此设备已签到过，请使用自己的手机签到" },
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

    // 4. 防止同一学生重复签到
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

    // 5. 创建签到记录（包含设备指纹）
    const record = await prisma.attendanceRecord.create({
      data: {
        sessionId: session.id,
        studentId: student.id,
        deviceFingerprint: fingerprint || null,
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
