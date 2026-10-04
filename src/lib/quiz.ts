import { prisma } from "./prisma";
import { createAccessTicket, createQrAuth, verifyAccessTicket, verifyQrAuth } from "./qr-auth";

/** 生成唯一答题Token */
export function generateToken(): string {
  return crypto.randomUUID();
}

export function createQuizQrAuth(token: string) {
  return createQrAuth("quiz", token);
}

export function verifyQuizQrAuth(token: string, bucket: number, signature: string): boolean {
  return verifyQrAuth("quiz", token, bucket, signature);
}

export function createQuizAccessTicket(sessionId: string, expiresAt: Date): string {
  return createAccessTicket("quiz", sessionId, expiresAt);
}

export function verifyQuizAccessTicket(ticket: string, sessionId: string): boolean {
  return verifyAccessTicket("quiz", ticket, sessionId);
}

/** 本轮答题的截止时间 */
export function quizDeadline(session: { startTime: Date; duration: number }): Date {
  return new Date(session.startTime.getTime() + session.duration * 60_000);
}

/** 把该课程已超时但仍标记为 active 的答题结束掉（懒结束，无需定时任务） */
export async function closeExpiredQuizSessions(courseId: string) {
  const active = await prisma.quizSession.findMany({
    where: { courseId, status: "active" },
    select: { id: true, startTime: true, duration: true },
  });
  const now = Date.now();
  await Promise.all(
    active
      .filter((s) => now >= quizDeadline(s).getTime())
      .map((s) =>
        prisma.quizSession.updateMany({
          where: { id: s.id, status: "active" },
          data: { status: "ended", endTime: quizDeadline(s) },
        })
      )
  );
}

/** 创建答题任务 */
export async function createQuizSession(courseId: string, duration: number) {
  // 先自动结束该课程所有活跃的答题，再创建新的（同一事务，避免出现两个进行中的答题）
  const [, session] = await prisma.$transaction([
    prisma.quizSession.updateMany({
      where: { courseId, status: "active" },
      data: { status: "ended", endTime: new Date() },
    }),
    prisma.quizSession.create({
      data: { courseId, token: generateToken(), duration, status: "active" },
    }),
  ]);

  return session;
}

/** 获取活跃答题任务 */
export async function getActiveQuizSession(courseId: string) {
  return prisma.quizSession.findFirst({
    where: { courseId, status: "active" },
    include: {
      _count: { select: { submissions: true } },
      course: {
        include: { _count: { select: { students: true } } },
      },
    },
  });
}

/** 通过Token获取答题任务 */
export async function getQuizSessionByToken(token: string) {
  return prisma.quizSession.findUnique({
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

/** 结束答题（只结束仍在进行中的，重复点击不会覆盖结束时间） */
export async function endQuizSession(sessionId: string) {
  return prisma.quizSession.updateMany({
    where: { id: sessionId, status: "active" },
    data: { status: "ended", endTime: new Date() },
  });
}

/** 获取答题详情（已提交 / 未提交） */
export async function getQuizSessionDetail(sessionId: string) {
  let session = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    include: {
      course: {
        include: {
          students: { orderBy: { studentId: "asc" } },
        },
      },
      submissions: {
        include: { student: true },
      },
    },
  });

  if (!session) return null;

  if (session.status === "active") {
    const expiresAt = quizDeadline(session);
    if (Date.now() >= expiresAt.getTime()) {
      await prisma.quizSession.updateMany({
        where: { id: session.id, status: "active" },
        data: { status: "ended", endTime: expiresAt },
      });
      session = { ...session, status: "ended", endTime: expiresAt };
    }
  }

  // 建立学生ID → 提交记录的映射（包含 submissionId 用于打分）
  const submissionMap = new Map(
    session.submissions.map((s) => [s.studentId, { submissionId: s.id, answer: s.answer, score: s.score, timestamp: s.timestamp.toISOString() }])
  );
  const submittedStudentIds = new Set(submissionMap.keys());
  const submitted: (typeof session.course.students[number] & { submissionId: string; answer: string; score: number | null; timestamp: string })[] = [];
  const notSubmitted: typeof session.course.students = [];

  for (const student of session.course.students) {
    if (submittedStudentIds.has(student.id)) {
      const sub = submissionMap.get(student.id)!;
      submitted.push({ ...student, submissionId: sub.submissionId, answer: sub.answer, score: sub.score, timestamp: sub.timestamp });
    } else {
      notSubmitted.push(student);
    }
  }

  return {
    session: {
      id: session.id,
      courseId: session.courseId,
      token: session.token,
      startTime: session.startTime.toISOString(),
      endTime: session.endTime?.toISOString() || null,
      duration: session.duration,
      status: session.status,
      submissionCount: session.submissions.length,
      totalStudents: session.course.students.length,
      createdAt: session.createdAt.toISOString(),
    },
    course: {
      name: session.course.name,
      semester: session.course.semester,
    },
    submitted: submitted.map((s) => ({
      id: s.id,
      studentId: s.studentId,
      name: s.name,
      courseId: s.courseId,
      submissionId: s.submissionId,
      answer: s.answer,
      score: s.score,
      timestamp: s.timestamp,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
    notSubmitted: notSubmitted.map((s) => ({
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
