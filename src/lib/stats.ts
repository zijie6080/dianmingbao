import { prisma } from "./prisma";
import type { StudentStats, DashboardData, CourseDTO } from "@/types";

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

  // 统计每个学生的签到次数（正常 + 迟到都算出勤）
  const presentMap = new Map<string, number>();
  const lateMap = new Map<string, number>();
  for (const r of records) {
    if (r.type === "late") {
      lateMap.set(r.studentId, (lateMap.get(r.studentId) || 0) + 1);
    } else {
      presentMap.set(r.studentId, (presentMap.get(r.studentId) || 0) + 1);
    }
  }

  return students.map((s) => {
    const normalCount = presentMap.get(s.id) || 0;
    const lateCount = lateMap.get(s.id) || 0;
    const totalPresent = normalCount + lateCount; // 迟到也算出勤
    return {
      studentId: s.id,
      studentNum: s.studentId,
      name: s.name,
      totalSessions,
      presentCount: totalPresent,
      lateCount,
      absentCount: Math.max(0, totalSessions - totalPresent),
      attendanceRate: totalSessions > 0 ? (totalPresent / totalSessions) * 100 : 0,
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
    select: { courseId: true, _count: { select: { records: true } } },
  });

  const recordCounts = new Map<string, number[]>();
  for (const s of sessions) {
    const list = recordCounts.get(s.courseId) ?? [];
    list.push(s._count.records);
    recordCounts.set(s.courseId, list);
  }

  return courses.map((course) => {
    const counts = recordCounts.get(course.id) ?? [];
    const students = course._count.students;
    const rate =
      students > 0 && counts.length > 0
        ? counts.reduce((sum, n) => sum + Math.min(1, n / students) * 100, 0) / counts.length
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
