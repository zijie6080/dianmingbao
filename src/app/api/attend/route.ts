import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isUniqueViolation, jsonError, readJson, tooManyRequests, withApi } from "@/lib/api";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { expireIfOverdue, verifyAttendAccessTicket } from "@/lib/attendance";
import { findStudentsByName } from "@/lib/names";

const checkInSchema = z.object({
  token: z.string().min(1, "签到Token不能为空").max(100),
  name: z.string().trim().min(1, "请输入姓名").max(50, "姓名过长"),
  accessTicket: z.string().min(1, "签到凭证已失效，请重新扫码").max(200),
  fingerprint: z.string().max(100).optional(),
});

// POST /api/attend — 学生签到（无需登录，只需输入姓名）
export const POST = withApi(async (request: NextRequest) => {
  const ip = getClientIp(request);
  // 同一教室常共用一个出口 IP，IP 阈值要宽松；再按设备限制连点
  const ipLimit = rateLimit(`attend:ip:${ip}`, 600, 60_000);
  if (!ipLimit.ok) return tooManyRequests(ipLimit.retryAfterSec);

  const parsed = checkInSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0].message, 400);
  }

  const { token, name, accessTicket, fingerprint } = parsed.data;

  const deviceLimit = rateLimit(`attend:dev:${fingerprint || ip}`, 10, 60_000);
  if (!deviceLimit.ok) return tooManyRequests(deviceLimit.retryAfterSec);

  // 1. 验证签到Token
  const found = await prisma.attendanceSession.findUnique({
    where: { token },
    include: { course: { include: { user: { select: { name: true } } } } },
  });

  if (!found) {
    return jsonError("无效的签到二维码", 404);
  }

  if (!verifyAttendAccessTicket(accessTicket, found.id)) {
    return jsonError("签到凭证已失效，请重新扫描老师屏幕上的二维码", 403, { code: "QR_EXPIRED" });
  }

  const session = await expireIfOverdue(found);
  if (session.status === "ended") {
    return jsonError("签到已结束", 400, { code: "ENDED" });
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
    return jsonError("名单中有同名同学，请联系老师补签", 400);
  }

  const student = students[0];
  const successBody = (timestamp: Date, already = false) =>
    NextResponse.json(
      {
        success: true,
        message: already ? "你已签到过了" : "签到成功！",
        data: {
          studentName: student.name,
          studentId: student.studentId,
          courseName: session.course.name,
          teacherName: session.course.user.name,
          timestamp: timestamp.toISOString(),
          already,
        },
      },
      { status: already ? 200 : 201 }
    );

  // 3. 防止同一学生重复签到；同一设备重复提交（如网络超时后重试）视为成功
  const existingRecord = await prisma.attendanceRecord.findUnique({
    where: { sessionId_studentId: { sessionId: session.id, studentId: student.id } },
  });
  if (existingRecord) {
    if (fingerprint && existingRecord.deviceFingerprint === fingerprint) {
      return successBody(existingRecord.timestamp, true);
    }
    return jsonError("该姓名已签到，如有疑问请联系老师", 409);
  }

  // 4. 设备防代签：同一设备本轮只能为一个人签到
  if (fingerprint) {
    const deviceRecord = await prisma.attendanceRecord.findFirst({
      where: { sessionId: session.id, deviceFingerprint: fingerprint },
      select: { id: true },
    });
    if (deviceRecord) {
      return jsonError("此设备已为其他同学签到过，请使用自己的手机签到", 409);
    }
  }

  // 5. 创建签到记录（并发重复提交由唯一索引兜底）
  try {
    const record = await prisma.attendanceRecord.create({
      data: {
        sessionId: session.id,
        studentId: student.id,
        deviceFingerprint: fingerprint || null,
      },
    });
    return successBody(record.timestamp);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return jsonError("该姓名已签到，如有疑问请联系老师", 409);
    }
    throw error;
  }
});
