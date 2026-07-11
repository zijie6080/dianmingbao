import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  ClipboardCheck,
  TrendingUp,
  QrCode,
  UserPlus,
  List,
  ArrowLeft,
  Download,
  Settings,
  HelpCircle,
} from "lucide-react";
import { EditCourseDialog } from "@/components/courses/course-actions";
import { StartAttendanceDialog } from "@/components/attendance/qr-display";
import { StartQuizDialog } from "@/components/quiz/start-quiz-dialog";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;

  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      _count: { select: { students: true, attendanceSessions: true, quizSessions: true } },
    },
  });

  if (!course || course.userId !== user.userId) notFound();

  // 获取签到记录
  const sessions = await prisma.attendanceSession.findMany({
    where: { courseId: id },
    include: {
      _count: { select: { records: true } },
    },
    orderBy: { startTime: "desc" },
  });

  // 获取答题记录
  const quizSessions = await prisma.quizSession.findMany({
    where: { courseId: id },
    include: {
      _count: { select: { submissions: true } },
    },
    orderBy: { startTime: "desc" },
  });

  // 计算平均出勤率
  let totalRate = 0;
  let rateCount = 0;
  for (const s of sessions) {
    if (course._count.students > 0) {
      totalRate += (s._count.records / course._count.students) * 100;
      rateCount++;
    }
  }
  const avgRate = rateCount > 0 ? totalRate / rateCount : 0;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back + Actions */}
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" size="sm" className="gap-1 rounded-lg" asChild>
            <Link href="/courses">
              <ArrowLeft className="h-4 w-4" />
              返回课程列表
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            {sessions.length > 0 && (
              <Button variant="outline" size="sm" className="gap-1 rounded-lg" asChild>
                <Link href={`/api/courses/${id}/export`}>
                  <Download className="h-4 w-4" />
                  导出Excel
                </Link>
              </Button>
            )}
            <EditCourseDialog courseId={id} courseName={course.name} courseSemester={course.semester} />
          </div>
        </div>

        {/* Course Header */}
        <Card className="mb-8 rounded-2xl border-0 shadow-sm">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{course.name}</h1>
                <Badge variant="secondary" className="mt-2 rounded-lg px-3 py-1 text-sm font-normal">
                  {course.semester}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <StartAttendanceDialog courseId={id} courseName={course.name} />
                <StartQuizDialog courseId={id} courseName={course.name} />
                <Button variant="outline" className="gap-2 rounded-xl" asChild>
                  <Link href={`/courses/${id}/students`}>
                    <Users className="h-4 w-4" />
                    管理学生
                  </Link>
                </Button>
              </div>
            </div>

            {/* Stats Row */}
            <div className="mt-6 grid grid-cols-4 gap-4 rounded-xl bg-muted/50 p-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <Users className="h-4 w-4 text-blue-600" />
                  <p className="text-2xl font-bold">{course._count.students}</p>
                </div>
                <p className="text-xs text-muted-foreground">学生人数</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <ClipboardCheck className="h-4 w-4 text-purple-600" />
                  <p className="text-2xl font-bold">{sessions.length}</p>
                </div>
                <p className="text-xs text-muted-foreground">签到次数</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <HelpCircle className="h-4 w-4 text-orange-600" />
                  <p className="text-2xl font-bold">{quizSessions.length}</p>
                </div>
                <p className="text-xs text-muted-foreground">答题次数</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <p className="text-2xl font-bold">{avgRate.toFixed(0)}%</p>
                </div>
                <p className="text-xs text-muted-foreground">平均出勤率</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance History */}
        <div>
          <h2 className="mb-4 text-lg font-semibold">签到记录</h2>
          {sessions.length === 0 ? (
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardContent className="flex flex-col items-center gap-4 py-16">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                  <ClipboardCheck className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="font-medium">还没有签到记录</p>
                  <p className="text-sm text-muted-foreground">
                    点击上方「开始签到」按钮发起第一次签到
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => {
                const rate =
                  course._count.students > 0
                    ? (session._count.records / course._count.students) * 100
                    : 0;
                const isActive = session.status === "active";

                return (
                  <Link key={session.id} href={`/courses/${id}/attendance/${session.id}`}>
                    <Card className="group rounded-xl border-0 shadow-sm transition-all hover:shadow-md">
                      <CardContent className="flex items-center justify-between p-5">
                        <div className="flex items-center gap-4">
                          <div
                            className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                              isActive ? "bg-green-50" : "bg-muted"
                            }`}
                          >
                            <ClipboardCheck
                              className={`h-6 w-6 ${
                                isActive ? "text-green-600" : "text-muted-foreground"
                              }`}
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">
                                {new Date(session.startTime).toLocaleDateString("zh-CN", {
                                  month: "long",
                                  day: "numeric",
                                })}{" "}
                                签到
                              </p>
                              {isActive && (
                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 rounded-lg text-xs">
                                  进行中
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {new Date(session.startTime).toLocaleTimeString("zh-CN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}{" "}
                              · {session._count.records}/{course._count.students} 人签到 · 出勤率{" "}
                              {rate.toFixed(0)}%
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="secondary"
                          className="rounded-lg text-xs"
                        >
                          时长 {session.duration} 分钟
                        </Badge>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Quiz History */}
        <div className="mt-10">
          <h2 className="mb-4 text-lg font-semibold">答题记录</h2>
          {quizSessions.length === 0 ? (
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardContent className="flex flex-col items-center gap-4 py-16">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                  <HelpCircle className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="font-medium">还没有答题记录</p>
                  <p className="text-sm text-muted-foreground">
                    点击上方「开始答题」按钮发起第一次答题
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {quizSessions.map((session) => {
                const rate =
                  course._count.students > 0
                    ? (session._count.submissions / course._count.students) * 100
                    : 0;
                const isActive = session.status === "active";

                return (
                  <Link key={session.id} href={`/courses/${id}/quiz/${session.id}`}>
                    <Card className="group rounded-xl border-0 shadow-sm transition-all hover:shadow-md">
                      <CardContent className="flex items-center justify-between p-5">
                        <div className="flex items-center gap-4">
                          <div
                            className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                              isActive ? "bg-orange-50" : "bg-muted"
                            }`}
                          >
                            <HelpCircle
                              className={`h-6 w-6 ${
                                isActive ? "text-orange-600" : "text-muted-foreground"
                              }`}
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">
                                {new Date(session.startTime).toLocaleDateString("zh-CN", {
                                  month: "long",
                                  day: "numeric",
                                })}{" "}
                                答题
                              </p>
                              {isActive && (
                                <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 rounded-lg text-xs">
                                  进行中
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {new Date(session.startTime).toLocaleTimeString("zh-CN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}{" "}
                              · {session._count.submissions}/{course._count.students} 人提交 · 提交率{" "}
                              {rate.toFixed(0)}%
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="rounded-lg text-xs">
                          时长 {session.duration} 分钟
                        </Badge>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
