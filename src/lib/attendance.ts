import { prisma } from "./prisma";
import { createAccessTicket, createQrAuth, verifyAccessTicket, verifyQrAuth } from "./qr-auth";

/** 生成唯一的签到Token */
export function generateToken(): string {
  return crypto.randomUUID();
}

export function createAttendQrAuth(token: string) {
  return createQrAuth("attend", token);
}

export function verifyAttendQrAuth(token: string, bucket: number, signature: string): boolean {
  return verifyQrAuth("attend", token, bucket, signature);
}

export function createAttendAccessTicket(sessionId: string, expiresAt: Date): string {
  return createAccessTicket("attend", sessionId, expiresAt);
}

export function verifyAttendAccessTicket(ticket: string, sessionId: string): boolean {
  return verifyAccessTicket("attend", ticket, sessionId);
}

/** 本轮签到的截止时间 */
export function attendanceDeadline(session: { startTime: Date; duration: number }): Date {
  return new Date(session.startTime.getTime() + session.duration * 60_000);
}

/** 若签到已超时，把状态改为 ended；返回最新状态 */
export async function expireIfOverdue<T extends { id: string; status: string; startTime: Date; duration: number; endTime: Date | null }>(
  session: T
): Promise<T> {
  if (session.status !== "active") return session;
  const deadline = attendanceDeadline(session);
  if (Date.now() < deadline.getTime()) return session;
  await prisma.attendanceSession.updateMany({
    where: { id: session.id, status: "active" },
    data: { status: "ended", endTime: deadline },
  });
  return { ...session, status: "ended", endTime: deadline };
}

/** 把该课程已超时但仍标记为 active 的签到结束掉（懒结束，无需定时任务） */
export async function closeExpiredAttendanceSessions(courseId: string) {
  const active = await prisma.attendanceSession.findMany({
    where: { courseId, status: "active" },
    select: { id: true, status: true, startTime: true, duration: true, endTime: true },
  });
  await Promise.all(active.map((s) => expireIfOverdue(s)));
}

/** 创建签到任务 */
export async function createAttendanceSession(courseId: string, duration: number) {
  // 先自动结束该课程所有活跃的签到，再创建新的（同一事务，避免出现两个进行中的签到）
  const [, session] = await prisma.$transaction([
    prisma.attendanceSession.updateMany({
      where: { courseId, status: "active" },
      data: { status: "ended", endTime: new Date() },
    }),
    prisma.attendanceSession.create({
      data: { courseId, token: generateToken(), duration, status: "active" },
    }),
  ]);

  return session;
}

/** 获取活跃签到任务 */
export async function getActiveSession(courseId: string) {
  return prisma.attendanceSession.findFirst({
    where: { courseId, status: "active" },
    include: {
      _count: { select: { records: true } },
      course: {
        include: { _count: { select: { students: true } } },
      },
    },
  });
}

/** 通过Token获取签到任务 */
export async function getSessionByToken(token: string) {
  return prisma.attendanceSession.findUnique({
    where: { token },
    include: {
      course: {
        include: {
          user: { select: { name: true } },
        },
      },
    },
  });
}

/** 结束签到（只结束仍在进行中的，重复点击不会覆盖结束时间） */
export async function endSession(sessionId: string) {
  return prisma.attendanceSession.updateMany({
    where: { id: sessionId, status: "active" },
    data: { status: "ended", endTime: new Date() },
  });
}

/** 获取签到详情（已到 / 未到） */
export async function getSessionDetail(sessionId: string) {
  const found = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
    include: {
      course: {
        include: {
          students: { orderBy: { studentId: "asc" } },
        },
      },
      records: {
        select: { studentId: true, type: true, timestamp: true },
      },
    },
  });

  if (!found) return null;
  const session = await expireIfOverdue(found);

  // 建立学生ID → 签到记录的映射（含类型）
  const recordMap = new Map(
    session.records.map((r) => [r.studentId, { type: r.type, timestamp: r.timestamp }])
  );
  type WithRecord = typeof session.course.students[number] & { recordType: string; timestamp: Date };
  const present: WithRecord[] = [];
  const leave: WithRecord[] = [];
  const absent: typeof session.course.students = [];

  for (const student of session.course.students) {
    const record = recordMap.get(student.id);
    if (!record) {
      absent.push(student);
    } else if (record.type === "leave") {
      leave.push({ ...student, recordType: record.type, timestamp: record.timestamp });
    } else {
      present.push({ ...student, recordType: record.type, timestamp: record.timestamp });
    }
  }

  const toDTO = (s: WithRecord) => ({
    id: s.id,
    studentId: s.studentId,
    name: s.name,
    courseId: s.courseId,
    recordType: s.recordType,
    timestamp: s.timestamp.toISOString(),
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  });

  return {
    session: {
      id: session.id,
      courseId: session.courseId,
      token: session.token,
      startTime: session.startTime.toISOString(),
      endTime: session.endTime?.toISOString() || null,
      duration: session.duration,
      status: session.status,
      checkInCount: present.length,
      totalStudents: session.course.students.length,
      createdAt: session.createdAt.toISOString(),
    },
    course: {
      name: session.course.name,
      semester: session.course.semester,
    },
    present: present.map(toDTO),
    leave: leave.map(toDTO),
    absent: absent.map((s) => ({
      id: s.id,
      studentId: s.studentId,
      name: s.name,
      courseId: s.courseId,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
    totalStudents: session.course.students.length,
  };
}
