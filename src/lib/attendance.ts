import { prisma } from "./prisma";

/** 生成唯一的签到Token */
export function generateToken(): string {
  return crypto.randomUUID();
}

/** 创建签到任务 */
export async function createAttendanceSession(courseId: string, duration: number) {
  // 先自动结束该课程所有活跃的签到
  await prisma.attendanceSession.updateMany({
    where: { courseId, status: "active" },
    data: { status: "ended", endTime: new Date() },
  });

  const token = generateToken();
  const session = await prisma.attendanceSession.create({
    data: {
      courseId,
      token,
      duration,
      status: "active",
    },
  });

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

/** 结束签到 */
export async function endSession(sessionId: string) {
  return prisma.attendanceSession.update({
    where: { id: sessionId },
    data: { status: "ended", endTime: new Date() },
  });
}

/** 获取签到详情（已到 / 未到） */
export async function getSessionDetail(sessionId: string) {
  const session = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
    include: {
      course: {
        include: {
          students: { orderBy: { studentId: "asc" } },
        },
      },
      records: {
        include: { student: true },
      },
    },
  });

  if (!session) return null;

  // 建立学生ID → 签到记录的映射（含类型）
  const recordMap = new Map(
    session.records.map((r) => [r.studentId, { type: r.type }])
  );
  const presentStudentIds = new Set(recordMap.keys());
  const present: (typeof session.course.students[number] & { recordType: string })[] = [];
  const absent: typeof session.course.students = [];

  for (const student of session.course.students) {
    if (presentStudentIds.has(student.id)) {
      present.push({ ...student, recordType: recordMap.get(student.id)!.type });
    } else {
      absent.push(student);
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
      checkInCount: session.records.length,
      totalStudents: session.course.students.length,
      createdAt: session.createdAt.toISOString(),
    },
    course: {
      name: session.course.name,
      semester: session.course.semester,
    },
    present: present.map((s) => ({
      id: s.id,
      studentId: s.studentId,
      name: s.name,
      courseId: s.courseId,
      recordType: s.recordType,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
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
