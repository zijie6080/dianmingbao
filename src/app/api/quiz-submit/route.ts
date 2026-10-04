import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isUniqueViolation, jsonError, readJson, tooManyRequests, withApi } from "@/lib/api";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { quizDeadline, verifyQuizAccessTicket } from "@/lib/quiz";
import { findStudentsByName } from "@/lib/names";

const quizSubmitSchema = z.object({
  token: z.string().min(1, "答题Token不能为空").max(100),
  name: z.string().trim().min(1, "请输入姓名").max(50, "姓名过长"),
  answer: z.string().trim().min(1, "请输入答案").max(5000, "答案最多 5000 字"),
  accessTicket: z.string().min(1, "答题凭证已失效，请重新扫码").max(200),
  fingerprint: z.string().max(100).optional(),
});

// POST /api/quiz-submit — 学生提交答案（无需登录，只需输入姓名和答案）
export const POST = withApi(async (request: NextRequest) => {
  const ip = getClientIp(request);
  const ipLimit = rateLimit(`quiz:ip:${ip}`, 600, 60_000);
  if (!ipLimit.ok) return tooManyRequests(ipLimit.retryAfterSec);

  const parsed = quizSubmitSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0].message, 400);
  }

  const { token, name, answer, accessTicket, fingerprint } = parsed.data;

  const deviceLimit = rateLimit(`quiz:dev:${fingerprint || ip}`, 10, 60_000);
  if (!deviceLimit.ok) return tooManyRequests(deviceLimit.retryAfterSec);

  // 1. 验证答题Token
  const session = await prisma.quizSession.findUnique({
    where: { token },
    include: { course: { include: { user: { select: { name: true } } } } },
  });

  if (!session) {
    return jsonError("无效的答题二维码", 404);
  }

  if (!verifyQuizAccessTicket(accessTicket, session.id)) {
    return jsonError("答题凭证已失效，请重新扫描老师屏幕上的二维码", 403, { code: "QR_EXPIRED" });
  }

  if (session.status === "ended") {
    return jsonError("答题已结束", 400, { code: "ENDED" });
  }

  // 检查答题是否超时
  const sessionEnd = quizDeadline(session);
  if (Date.now() >= sessionEnd.getTime()) {
    await prisma.quizSession.updateMany({
      where: { id: session.id, status: "active" },
      data: { status: "ended", endTime: sessionEnd },
    });
    return jsonError("答题已超时结束", 400, { code: "ENDED" });
  }

  // 2. 根据姓名查找学生（同一课程内，忽略空格和大小写）
  let students = await prisma.student.findMany({
    where: { courseId: session.courseId, name },
    select: { id: true, name: true, studentId: true },
  });
  if (students.length === 0) {
    const roster = await prisma.student.findMany({
      where: { courseId: session.courseId },
      select: { id: true, name: true, studentId: true },
    });
    students = findStudentsByName(roster, name);
  }

  if (students.length === 0) {
    return jsonError("姓名不在课程名单中，请检查是否有错别字", 400);
  }

  if (students.length > 1) {
    return jsonError("名单中有同名同学，请联系老师确认", 400);
  }

  const student = students[0];
  const successBody = (saved: { answer: string; timestamp: Date }, already = false) =>
    NextResponse.json(
      {
        success: true,
        message: already ? "你已提交过答案了" : "提交成功！",
        data: {
          studentName: student.name,
          studentId: student.studentId,
          courseName: session.course.name,
          teacherName: session.course.user.name,
          answer: saved.answer,
          timestamp: saved.timestamp.toISOString(),
          already,
        },
      },
      { status: already ? 200 : 201 }
    );

  // 3. 防止同一学生重复提交；同一设备重复提交（如网络超时后重试）视为成功
  const existingSubmission = await prisma.quizSubmission.findUnique({
    where: { sessionId_studentId: { sessionId: session.id, studentId: student.id } },
  });
  if (existingSubmission) {
    if (fingerprint && existingSubmission.deviceFingerprint === fingerprint) {
      return successBody(existingSubmission, true);
    }
    return jsonError("该姓名已提交过答案，如有疑问请联系老师", 409);
  }

  // 4. 设备防代答：同一设备本轮只能为一个人提交
  if (fingerprint) {
    const deviceSubmission = await prisma.quizSubmission.findFirst({
      where: { sessionId: session.id, deviceFingerprint: fingerprint },
      select: { id: true },
    });
    if (deviceSubmission) {
      return jsonError("此设备已为其他同学提交过，请使用自己的手机答题", 409);
    }
  }

  // 5. 创建答题记录（并发重复提交由唯一索引兜底）
  try {
    const submission = await prisma.quizSubmission.create({
      data: {
        sessionId: session.id,
        studentId: student.id,
        answer,
        deviceFingerprint: fingerprint || null,
      },
    });
    return successBody(submission);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return jsonError("该姓名已提交过答案，如有疑问请联系老师", 409);
    }
    throw error;
  }
});
