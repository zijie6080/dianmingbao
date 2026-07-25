import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "./prisma";

/** 生成唯一答题Token（直接复用 attendance 里的） */
export function generateToken(): string {
  return crypto.randomUUID();
}

const QR_WINDOW_MS = 30_000;

function signQuizValue(value: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET must be set");
  return createHmac("sha256", secret).update(value).digest("hex");
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createQuizQrAuth(token: string) {
  const bucket = Math.floor(Date.now() / QR_WINDOW_MS);
  return {
    bucket,
    signature: signQuizValue(`qr:${token}:${bucket}`).slice(0, 24),
    expiresAt: (bucket + 1) * QR_WINDOW_MS,
  };
}

export function verifyQuizQrAuth(token: string, bucket: number, signature: string): boolean {
  if (!Number.isInteger(bucket)) return false;
  const currentBucket = Math.floor(Date.now() / QR_WINDOW_MS);
  if (bucket < currentBucket - 1 || bucket > currentBucket) return false;
  const expected = signQuizValue(`qr:${token}:${bucket}`).slice(0, 24);
  return safeEqual(signature, expected);
}

export function createQuizAccessTicket(sessionId: string, expiresAt: Date): string {
  const expires = expiresAt.getTime();
  const signature = signQuizValue(`ticket:${sessionId}:${expires}`).slice(0, 32);
  return `${expires}.${signature}`;
}

export function verifyQuizAccessTicket(ticket: string, sessionId: string): boolean {
  const [expiresText, signature] = ticket.split(".");
  const expires = Number(expiresText);
  if (!Number.isFinite(expires) || expires < Date.now() || !signature) return false;
  const expected = signQuizValue(`ticket:${sessionId}:${expires}`).slice(0, 32);
  return safeEqual(signature, expected);
}

/** 创建答题任务 */
export async function createQuizSession(courseId: string, duration: number) {
  // 先自动结束该课程所有活跃的答题
  await prisma.quizSession.updateMany({
    where: { courseId, status: "active" },
    data: { status: "ended", endTime: new Date() },
  });

  const token = generateToken();
  const session = await prisma.quizSession.create({
    data: {
      courseId,
      token,
      duration,
      status: "active",
    },
  });

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

/** 结束答题 */
export async function endQuizSession(sessionId: string) {
  return prisma.quizSession.update({
    where: { id: sessionId },
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
    const expiresAt = new Date(session.startTime.getTime() + session.duration * 60_000);
    if (Date.now() >= expiresAt.getTime()) {
      await prisma.quizSession.update({
        where: { id: session.id },
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
