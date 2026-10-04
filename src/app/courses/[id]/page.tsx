import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { closeExpiredAttendanceSessions } from "@/lib/attendance";
import { closeExpiredQuizSessions } from "@/lib/quiz";
import { formatHourMinute, formatMonthDay } from "@/lib/format";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  ClipboardCheck,
  TrendingUp,
  ArrowLeft,
  Download,
  HelpCircle,
  BarChart3,
  ChevronRight,
  UserPlus,
} from "lucide-react";
import { EditCourseDialog } from "@/components/courses/course-actions";
import { StartAttendanceDialog } from "@/components/attendance/qr-display";
import { StartQuizDialog } from "@/components/quiz/start-quiz-dialog";

function rateColor(rate: number) {
  if (rate >= 80) return "text-green-600";
  if (rate >= 60) return "text-orange-600";
  return "text-red-600";
}

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
      _count: { select: { students: true } },
    },
  });

  if (!course || course.userId !== user.userId) notFound();

  // 已超时的签到/答题自动标记为结束，列表中不会一直显示「进行中」
  await Promise.all([closeExpiredAttendanceSessions(id), closeExpiredQuizSessions(id)]);

  const [sessions, quizSessions] = await Promise.all([
    prisma.attendanceSession.findMany({
      where: { courseId: id },
      include: { _count: { select: { records: true } } },
      orderBy: { startTime: "desc" },
    }),
    prisma.quizSession.findMany({
      where: { courseId: id },
      include: { _count: { select: { submissions: true } } },
      orderBy: { startTime: "desc" },
    }),
  ]);

  const studentCount = course._count.students;
  const rateOf = (n: number) => (studentCount > 0 ? Math.min(100, (n / studentCount) * 100) : 0);
  const avgRate =
    sessions.length > 0
      ? sessions.reduce((sum, s) => sum + rateOf(s._count.records), 0) / sessions.length
      : 0;

  const stats = [
    { label: "学生", value: studentCount, icon: Users, color: "text-blue-600" },
    { label: "签到", value: sessions.length, icon: ClipboardCheck, color: "text-purple-600" },
    { label: "答题", value: quizSessions.length, icon: HelpCircle, color: "text-orange-600" },
    {
      label: "平均出勤率",
      value: sessions.length > 0 ? `${avgRate.toFixed(0)}%` : "—",
      icon: TrendingUp,
      color: "text-green-600",
    },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Button variant="ghost" size="sm" className="-ml-2 mb-3 gap-1 rounded-lg text-muted-foreground" asChild>
          <Link href="/courses">
            <ArrowLeft className="h-4 w-4" />
            全部课程
          </Link>
        </Button>

        {/* Course Header */}
        <Card className="mb-6 rounded-2xl border-0 shadow-sm">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">{course.name}</h1>
                <Badge variant="secondary" className="mt-2 rounded-lg font-normal">
                  {course.semester}
                </Badge>
              </div>
              <EditCourseDialog courseId={id} courseName={course.name} courseSemester={course.semester} />
            </div>

            {/* 主要操作 */}
            <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <StartAttendanceDialog courseId={id} courseName={course.name} studentCount={studentCount} />
              <StartQuizDialog courseId={id} courseName={course.name} studentCount={studentCount} />
              <Button variant="outline" className="gap-2 rounded-xl" asChild>
                <Link href={`/courses/${id}/students`}>
                  <Users className="h-4 w-4" />
                  学生名单
                </Link>
              </Button>
              <Button variant="outline" className="gap-2 rounded-xl" asChild>
                <Link href={`/courses/${id}/attendance`}>
                  <BarChart3 className="h-4 w-4" />
                  考勤统计
                </Link>
              </Button>
            </div>

            {studentCount === 0 && (
              <div className="mt-4 flex flex-col gap-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">第一步：添加学生名单</p>
                  <p className="text-xs text-muted-foreground">
                    学生签到时按姓名匹配名单，添加后即可发起签到（支持 Excel 批量导入）
                  </p>
                </div>
                <Button size="sm" className="shrink-0 gap-1 rounded-lg" asChild>
                  <Link href={`/courses/${id}/students`}>
                    <UserPlus className="h-4 w-4" />
                    添加学生
                  </Link>
                </Button>
              </div>
            )}

            {/* Stats Row */}
            <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-muted/50 p-4 sm:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label} className="text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <s.icon className={`h-4 w-4 ${s.color}`} />
                    <p className="text-2xl font-bold tabular-nums">{s.value}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Records Tabs */}
        <Tabs defaultValue="attendance">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <TabsList className="rounded-xl">
              <TabsTrigger value="attendance" className="gap-1.5 rounded-lg">
                <ClipboardCheck className="h-4 w-4" />
                签到记录
              </TabsTrigger>
              <TabsTrigger value="quiz" className="gap-1.5 rounded-lg">
                <HelpCircle className="h-4 w-4" />
                答题记录
              </TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1 rounded-lg text-xs" asChild>
                <a href={`/api/courses/${id}/export`} download>
                  <Download className="h-3.5 w-3.5" />
                  导出考勤
                </a>
              </Button>
              {quizSessions.length > 0 && (
                <Button variant="outline" size="sm" className="gap-1 rounded-lg text-xs" asChild>
                  <a href={`/api/courses/${id}/quiz/export`} download>
                    <Download className="h-3.5 w-3.5" />
                    导出答题
                  </a>
                </Button>
              )}
            </div>
          </div>

          <TabsContent value="attendance">
            {sessions.length === 0 ? (
              <EmptyState
                icon={<ClipboardCheck className="h-7 w-7 text-muted-foreground" />}
                title="还没有签到记录"
                description={studentCount === 0 ? "添加学生后即可发起签到" : "点击上方「开始签到」发起第一次签到"}
              />
            ) : (
              <div className="space-y-2">
                {sessions.map((session) => (
                  <RecordRow
                    key={session.id}
                    href={`/courses/${id}/attendance/${session.id}`}
                    title={`${formatMonthDay(session.startTime)} 签到`}
                    time={formatHourMinute(session.startTime)}
                    active={session.status === "active"}
                    count={session._count.records}
                    total={studentCount}
                    countLabel="人签到"
                    rate={rateOf(session._count.records)}
                    icon={<ClipboardCheck className="h-5 w-5" />}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="quiz">
            {quizSessions.length === 0 ? (
              <EmptyState
                icon={<HelpCircle className="h-7 w-7 text-muted-foreground" />}
                title="还没有答题记录"
                description="上课提问时点击「开始答题」，学生扫码提交答案"
              />
            ) : (
              <div className="space-y-2">
                {quizSessions.map((session) => (
                  <RecordRow
                    key={session.id}
                    href={`/courses/${id}/quiz/${session.id}`}
                    title={`${formatMonthDay(session.startTime)} 答题`}
                    time={formatHourMinute(session.startTime)}
                    active={session.status === "active"}
                    count={session._count.submissions}
                    total={studentCount}
                    countLabel="人提交"
                    rate={rateOf(session._count.submissions)}
                    icon={<HelpCircle className="h-5 w-5" />}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="rounded-2xl border-0 shadow-sm">
      <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">{icon}</div>
        <div>
          <p className="font-medium">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function RecordRow({
  href,
  title,
  time,
  active,
  count,
  total,
  countLabel,
  rate,
  icon,
}: {
  href: string;
  title: string;
  time: string;
  active: boolean;
  count: number;
  total: number;
  countLabel: string;
  rate: number;
  icon: React.ReactNode;
}) {
  return (
    <Link href={href} className="block">
      <Card className="group rounded-xl border-0 shadow-sm transition-shadow hover:shadow-md">
        <CardContent className="flex items-center gap-3 p-4">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              active ? "bg-green-50 text-green-600" : "bg-muted text-muted-foreground"
            }`}
          >
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium">{title}</p>
              {active && (
                <Badge className="rounded-lg bg-green-100 text-xs text-green-700 hover:bg-green-100">进行中</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {time} · {count}/{total} {countLabel}
            </p>
          </div>
          <span className={`text-sm font-semibold tabular-nums ${rateColor(rate)}`}>{rate.toFixed(0)}%</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </CardContent>
      </Card>
    </Link>
  );
}
