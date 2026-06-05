import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, BookOpen, Users, ClipboardCheck, ArrowRight } from "lucide-react";
import { CreateCourseDialog } from "@/components/courses/course-form";

export default async function CoursesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const courses = await prisma.course.findMany({
    where: { userId: user.userId },
    include: {
      _count: { select: { students: true, attendanceSessions: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  // 计算每个课程的平均出勤率
  const coursesWithRate = await Promise.all(
    courses.map(async (course) => {
      const sessions = await prisma.attendanceSession.findMany({
        where: { courseId: course.id },
        select: { _count: { select: { records: true } } },
      });
      let totalRate = 0;
      let count = 0;
      for (const s of sessions) {
        if (course._count.students > 0) {
          totalRate += (s._count.records / course._count.students) * 100;
          count++;
        }
      }
      return {
        ...course,
        studentCount: course._count.students,
        sessionCount: course._count.attendanceSessions,
        averageAttendanceRate: count > 0 ? totalRate / count : 0,
      };
    })
  );

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">课程管理</h1>
            <p className="text-muted-foreground">管理你的课程，发起签到</p>
          </div>
          <CreateCourseDialog />
        </div>

        {/* Course List */}
        {coursesWithRate.length === 0 ? (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="flex flex-col items-center gap-4 py-20">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted">
                <BookOpen className="h-10 w-10 text-muted-foreground" />
              </div>
              <div className="text-center">
                <h2 className="text-xl font-semibold">还没有课程</h2>
                <p className="mt-1 text-muted-foreground">创建第一门课程，开始你的教学之旅</p>
              </div>
              <CreateCourseDialog />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {coursesWithRate.map((course) => (
              <Link key={course.id} href={`/courses/${course.id}`}>
                <Card className="group h-full rounded-2xl border-0 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
                  <CardContent className="p-6">
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold group-hover:text-primary transition-colors">
                          {course.name}
                        </h3>
                        <Badge variant="secondary" className="mt-1.5 rounded-lg font-normal">
                          {course.semester}
                        </Badge>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 transition-all group-hover:opacity-100" />
                    </div>
                    <div className="grid grid-cols-3 gap-4 rounded-xl bg-muted/50 p-3 text-center">
                      <div>
                        <div className="flex items-center justify-center gap-1">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          <p className="text-lg font-bold">{course.studentCount}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">学生</p>
                      </div>
                      <div>
                        <div className="flex items-center justify-center gap-1">
                          <ClipboardCheck className="h-3.5 w-3.5 text-muted-foreground" />
                          <p className="text-lg font-bold">{course.sessionCount}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">签到</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold">
                          {course.averageAttendanceRate.toFixed(0)}%
                        </p>
                        <p className="text-xs text-muted-foreground">出勤率</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
