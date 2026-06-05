import { prisma } from "./prisma";
import type { StudentStats, DashboardData } from "@/types";

/** 计算单个课程的每个学生的考勤统计 */
export async function getStudentStats(courseId: string): Promise<StudentStats[]> {
  const sessions = await prisma.attendanceSession.findMany({
    where: { courseId },
    select: { id: true },
  });

  const totalSessions = sessions.length;
  if (totalSessions === 0) return [];

  const sessionIds = sessions.map((s) => s.id);

  const students = await prisma.student.findMany({
    where: { courseId },
    orderBy: { studentId: "asc" },
  });

  // 获取所有签到记录（含类型）
  const records = await prisma.attendanceRecord.findMany({
    where: { sessionId: { in: sessionIds } },
    select: { studentId: true, type: true },
  });

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
      absentCount: totalSessions - totalPresent,
      attendanceRate: totalSessions > 0 ? (totalPresent / totalSessions) * 100 : 0,
    };
  });
}

/** 获取仪表盘数据 */
export async function getDashboardData(userId: string): Promise<DashboardData> {
  const courses = await prisma.course.findMany({
    where: { userId },
    include: {
      _count: { select: { students: true, attendanceSessions: true } },
      attendanceSessions: {
        select: {
          id: true,
          _count: { select: { records: true } },
          course: { select: { _count: { select: { students: true } } } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const courseCount = courses.length;
  const studentCount = courses.reduce((sum, c) => sum + c._count.students, 0);
  const semesterSessionCount = courses.reduce(
    (sum, c) => sum + c._count.attendanceSessions,
    0
  );

  // 计算平均出勤率
  let totalRate = 0;
  let rateCount = 0;
  for (const course of courses) {
    for (const session of course.attendanceSessions) {
      const totalStudents = session.course._count.students;
      if (totalStudents > 0) {
        totalRate += (session._count.records / totalStudents) * 100;
        rateCount++;
      }
    }
  }
  const averageAttendanceRate = rateCount > 0 ? totalRate / rateCount : 0;

  const recentCourses = await Promise.all(
    courses.slice(0, 5).map(async (c) => {
      const sessions = await prisma.attendanceSession.findMany({
        where: { courseId: c.id },
        select: {
          _count: { select: { records: true } },
        },
      });

      const studentTotal = c._count.students;
      let totalSessionRate = 0;
      let sessionCount = 0;
      for (const s of sessions) {
        if (studentTotal > 0) {
          totalSessionRate += (s._count.records / studentTotal) * 100;
          sessionCount++;
        }
      }

      return {
        id: c.id,
        name: c.name,
        semester: c.semester,
        userId: c.userId,
        studentCount: c._count.students,
        sessionCount: c._count.attendanceSessions,
        averageAttendanceRate: sessionCount > 0 ? totalSessionRate / sessionCount : 0,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      };
    })
  );

  return {
    courseCount,
    studentCount,
    semesterSessionCount,
    averageAttendanceRate,
    recentCourses,
  };
}
