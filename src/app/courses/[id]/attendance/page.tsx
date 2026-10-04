import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, ArrowLeft, ClipboardCheck, Download, TrendingUp } from "lucide-react";
import { getSessionCounts, getStudentStats, sessionRate } from "@/lib/stats";
import { closeExpiredAttendanceSessions } from "@/lib/attendance";
import { formatHourMinute, formatMonthDay } from "@/lib/format";

export default async function AttendancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const course = await prisma.course.findUnique({
    where: { id },
    include: { _count: { select: { students: true } } },
  });
  if (!course || course.userId !== user.userId) notFound();

  await closeExpiredAttendanceSessions(id);

  const sessions = await prisma.attendanceSession.findMany({
    where: { courseId: id },
    orderBy: { startTime: "desc" },
  });

  const [stats, counts] = await Promise.all([
    getStudentStats(id),
    getSessionCounts(sessions.map((s) => s.id)),
  ]);
  const lowAttendance = sessions.length > 0 ? stats.filter((s) => s.attendanceRate < 60) : [];

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Button variant="ghost" size="sm" className="-ml-2 mb-3 gap-1 rounded-lg text-muted-foreground" asChild>
            <Link href={`/courses/${id}`}>
              <ArrowLeft className="h-4 w-4" />
              {course.name}
            </Link>
          </Button>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">考勤统计</h1>
            {stats.length > 0 && (
              <Button variant="outline" className="gap-1 rounded-xl" asChild>
                <a href={`/api/courses/${id}/export`} download>
                  <Download className="h-4 w-4" />
                  导出Excel
                </a>
              </Button>
            )}
          </div>
          {lowAttendance.length > 0 && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                {lowAttendance.length} 名学生出勤率低于 60%：
                {lowAttendance.slice(0, 8).map((s) => s.name).join("、")}
                {lowAttendance.length > 8 && " 等"}
              </p>
            </div>
          )}
        </div>

        <Tabs defaultValue="stats" className="w-full">
          <TabsList className="mb-6 rounded-xl">
            <TabsTrigger value="stats" className="rounded-lg">
              学期统计
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg">
              签到记录（{sessions.length}）
            </TabsTrigger>
          </TabsList>

          {/* 签到记录列表 */}
          <TabsContent value="history">
            {sessions.length === 0 ? (
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardContent className="flex flex-col items-center gap-4 py-16">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                    <ClipboardCheck className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="font-medium">还没有签到记录</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => {
                  const c = counts.get(session.id) ?? { present: 0, leave: 0 };
                  const rate = sessionRate(c.present, c.leave, course._count.students);
                  return (
                    <Link key={session.id} href={`/courses/${id}/attendance/${session.id}`} className="block">
                      <Card className="group rounded-xl border-0 shadow-sm transition-all hover:shadow-md">
                        <CardContent className="flex items-center justify-between p-5">
                          <div className="flex items-center gap-4">
                            <div
                              className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                                session.status === "active" ? "bg-green-50" : "bg-muted"
                              }`}
                            >
                              <ClipboardCheck
                                className={`h-6 w-6 ${
                                  session.status === "active"
                                    ? "text-green-600"
                                    : "text-muted-foreground"
                                }`}
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">
                                  {formatMonthDay(session.startTime)}{" "}
                                  签到
                                </p>
                                {session.status === "active" && (
                                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 rounded-lg text-xs">
                                    进行中
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {formatHourMinute(session.startTime)}{" "}
                                · {c.present}/{course._count.students} 人签到
                                {c.leave > 0 && ` · ${c.leave} 人请假`}
                                · 出勤率 {rate.toFixed(0)}%
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
          </TabsContent>

          {/* 学期统计 */}
          <TabsContent value="stats">
            {stats.length === 0 || sessions.length === 0 ? (
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardContent className="flex flex-col items-center gap-4 py-16">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                    <TrendingUp className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="font-medium">还没有统计数据</p>
                  <p className="text-sm text-muted-foreground">发起签到后自动生成统计</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="rounded-2xl border-0 shadow-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>学号</TableHead>
                      <TableHead>姓名</TableHead>
                      <TableHead className="text-center">出勤次数</TableHead>
                      <TableHead className="hidden text-center sm:table-cell">迟到</TableHead>
                      <TableHead className="hidden text-center sm:table-cell">请假</TableHead>
                      <TableHead className="text-center">缺席次数</TableHead>
                      <TableHead className="text-center">出勤率</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.map((s) => (
                      <TableRow key={s.studentId}>
                        <TableCell className="font-mono text-sm">{s.studentNum}</TableCell>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="rounded-lg bg-green-50 text-green-700">
                            {s.presentCount}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden text-center sm:table-cell">{s.lateCount}</TableCell>
                        <TableCell className="hidden text-center sm:table-cell">{s.leaveCount}</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="secondary"
                            className={`rounded-lg ${s.absentCount > 0 ? "bg-red-50 text-red-700" : ""}`}
                          >
                            {s.absentCount}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`font-semibold ${
                              s.attendanceRate >= 80
                                ? "text-green-600"
                                : s.attendanceRate >= 60
                                ? "text-orange-600"
                                : "text-red-600"
                            }`}
                          >
                            {s.attendanceRate.toFixed(1)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
