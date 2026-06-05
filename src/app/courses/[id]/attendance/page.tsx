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
import { ArrowLeft, ClipboardCheck, Download, Users, TrendingUp } from "lucide-react";
import { getStudentStats } from "@/lib/stats";

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

  const sessions = await prisma.attendanceSession.findMany({
    where: { courseId: id },
    include: { _count: { select: { records: true } } },
    orderBy: { startTime: "desc" },
  });

  const stats = await getStudentStats(id);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Button variant="ghost" size="sm" className="gap-1 rounded-lg mb-2" asChild>
            <Link href={`/courses/${id}`}>
              <ArrowLeft className="h-4 w-4" />
              返回课程
            </Link>
          </Button>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {course.name} · 考勤记录
            </h1>
            {stats.length > 0 && (
              <Button variant="outline" className="gap-1 rounded-xl" asChild>
                <Link href={`/api/courses/${id}/export`}>
                  <Download className="h-4 w-4" />
                  导出Excel
                </Link>
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="history" className="w-full">
          <TabsList className="mb-6 rounded-xl">
            <TabsTrigger value="history" className="rounded-lg">
              签到记录
            </TabsTrigger>
            <TabsTrigger value="stats" className="rounded-lg">
              学期统计
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
                  const rate =
                    course._count.students > 0
                      ? (session._count.records / course._count.students) * 100
                      : 0;
                  return (
                    <Link key={session.id} href={`/courses/${id}/attendance/${session.id}`}>
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
                                  {new Date(session.startTime).toLocaleDateString("zh-CN", {
                                    month: "long",
                                    day: "numeric",
                                  })}{" "}
                                  签到
                                </p>
                                {session.status === "active" && (
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
                                · {session._count.records}/{course._count.students} 人签到
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
            {stats.length === 0 ? (
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
                      <TableHead className="text-center">签到次数</TableHead>
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
