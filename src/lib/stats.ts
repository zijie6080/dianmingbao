import { prisma } from "./prisma";
import type { StudentStats, DashboardData, CourseDTO } from "@/types";

/** 签到记录类型：normal 正常、late 迟到（补签）、leave 请假/公假 */
export const RECORD_LEAVE = "leave";

/** 统计「出勤」时使用的条件：请假不算出勤 */
export const PRESENT_RECORD_WHERE = { type: { not: RECORD_LEAVE } };

/**
 * 单次签到的出勤率：请假的学生不计入应到人数。
 * 全员请假时返回 100（没有人缺勤）。
 */
export function sessionRate(present: number, leave: number, students: number): number {
  const expected = students - leave;
  if (students <= 0) return 0;
  if (expected <= 0) return 100;
  return Math.min(100, (present / expected) * 100);
}

/** 批量获取每次签到的出勤 / 请假人数（一次查询） */
export async function getSessionCounts(
  sessionIds: string[]
): Promise<Map<string, { present: number; leave: number }>> {
  const map = new Map<string, { present: number; leave: number }>();
  for (const id of sessionIds) map.set(id, { present: 0, leave: 0 });
  if (sessionIds.length === 0) return map;

  const groups = await prisma.attendanceRecord.groupBy({
    by: ["sessionId", "type"],
    where: { sessionId: { in: sessionIds } },
    _count: { _all: true },
  });
  for (const g of groups) {
    const entry = map.get(g.sessionId);
    if (!entry) continue;
    if (g.type === RECORD_LEAVE) entry.leave += g._count._all;
    else entry.present += g._count._all;
  }
  return map;
}

/**
 * 计算单个课程每个学生的考勤统计。
 * 还没有发起过签到时，也会返回学生名单（各项为 0），方便导出空白考勤表。
 */
export async function getStudentStats(courseId: string): Promise<StudentStats[]> {
  const [totalSessions, students, records] = await Promise.all([
    prisma.attendanceSession.count({ where: { courseId } }),
    prisma.student.findMany({
      where: { courseId },
      orderBy: { studentId: "asc" },
      select: { id: true, studentId: true, name: true },
    }),
    prisma.attendanceRecord.findMany({
      where: { session: { courseId } },
      select: { studentId: true, type: true },
    }),
  ]);

  // 统计每个学生的签到次数（正常 + 迟到都算出勤；请假单独统计，不算缺勤）
  const presentMap = new Map<string, number>();
  const lateMap = new Map<string, number>();
  const leaveMap = new Map<string, number>();
  const bump = (map: Map<string, number>, id: string) => map.set(id, (map.get(id) || 0) + 1);
  for (const r of records) {
    if (r.type === "late") bump(lateMap, r.studentId);
    else if (r.type === RECORD_LEAVE) bump(leaveMap, r.studentId);
    else bump(presentMap, r.studentId);
  }

  return students.map((s) => {
    const normalCount = presentMap.get(s.id) || 0;
    const lateCount = lateMap.get(s.id) || 0;
    const leaveCount = leaveMap.get(s.id) || 0;
    const totalPresent = normalCount + lateCount; // 迟到也算出勤
    const expected = totalSessions - leaveCount; // 请假的场次不计入应到
    return {
      studentId: s.id,
      studentNum: s.studentId,
      name: s.name,
      totalSessions,
      presentCount: totalPresent,
      lateCount,
      leaveCount,
      absentCount: Math.max(0, expected - totalPresent),
      attendanceRate: totalSessions === 0 ? 0 : expected <= 0 ? 100 : (totalPresent / expected) * 100,
    };
  });
}

export type CourseSummary = CourseDTO & { quizCount: number };

/**
 * 一次性获取教师所有课程的概要（学生数、签到数、答题数、平均出勤率）。
 * 固定 2 次查询，不随课程数量增长（避免 N+1）。
 */
export async function getCourseSummaries(userId: string): Promise<CourseSummary[]> {
  const courses = await prisma.course.findMany({
    where: { userId },
    include: {
      _count: { select: { students: true, attendanceSessions: true, quizSessions: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  if (courses.length === 0) return [];

  const sessions = await prisma.attendanceSession.findMany({
    where: { courseId: { in: courses.map((c) => c.id) } },
    select: { id: true, courseId: true },
  });
  const counts = await getSessionCounts(sessions.map((s) => s.id));

  const sessionsByCourse = new Map<string, { present: number; leave: number }[]>();
  for (const s of sessions) {
    const list = sessionsByCourse.get(s.courseId) ?? [];
    list.push(counts.get(s.id) ?? { present: 0, leave: 0 });
    sessionsByCourse.set(s.courseId, list);
  }

  return courses.map((course) => {
    const list = sessionsByCourse.get(course.id) ?? [];
    const students = course._count.students;
    const rate =
      students > 0 && list.length > 0
        ? list.reduce((sum, c) => sum + sessionRate(c.present, c.leave, students), 0) / list.length
        : 0;
    return {
      id: course.id,
      name: course.name,
      semester: course.semester,
      userId: course.userId,
      studentCount: students,
      sessionCount: course._count.attendanceSessions,
      quizCount: course._count.quizSessions,
      averageAttendanceRate: rate,
      createdAt: course.createdAt.toISOString(),
      updatedAt: course.updatedAt.toISOString(),
    };
  });
}

/** 获取仪表盘数据 */
export async function getDashboardData(userId: string): Promise<DashboardData> {
  const courses = await getCourseSummaries(userId);

  const courseCount = courses.length;
  const studentCount = courses.reduce((sum, c) => sum + c.studentCount, 0);
  const semesterSessionCount = courses.reduce((sum, c) => sum + c.sessionCount, 0);

  // 平均出勤率：按签到次数加权
  const weighted = courses.reduce(
    (acc, c) =>
      c.studentCount > 0 && c.sessionCount > 0
        ? { total: acc.total + c.averageAttendanceRate * c.sessionCount, n: acc.n + c.sessionCount }
        : acc,
    { total: 0, n: 0 }
  );

  return {
    courseCount,
    studentCount,
    semesterSessionCount,
    averageAttendanceRate: weighted.n > 0 ? weighted.total / weighted.n : 0,
    recentCourses: courses.slice(0, 6),
  };
}
