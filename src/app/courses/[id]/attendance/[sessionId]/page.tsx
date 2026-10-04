import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSessionDetail } from "@/lib/attendance";
import { formatFullDate, formatHourMinute, formatTime } from "@/lib/format";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SupplementButton, UndoCheckInButton } from "@/components/attendance/supplement-button";
import { ArrowLeft, Users, UserCheck, UserX, TrendingUp, Clock, Download } from "lucide-react";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id, sessionId } = await params;

  const course = await prisma.course.findUnique({ where: { id } });
  if (!course || course.userId !== user.userId) notFound();

  const detail = await getSessionDetail(sessionId);
  if (!detail || detail.session.courseId !== id) notFound();

  const { session, present, absent, totalStudents } = detail;
  const rate = totalStudents > 0 ? (present.length / totalStudents) * 100 : 0;
  const lateCount = present.filter((s) => s.recordType === "late").length;

  const summary = [
    { label: "应到", value: totalStudents, icon: Users, tone: "bg-blue-50 text-blue-600" },
    { label: "实到", value: present.length, icon: UserCheck, tone: "bg-green-50 text-green-600" },
    { label: "缺席", value: absent.length, icon: UserX, tone: "bg-red-50 text-red-600" },
    { label: "出勤率", value: `${rate.toFixed(1)}%`, icon: TrendingUp, tone: "bg-orange-50 text-orange-600" },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Button variant="ghost" size="sm" className="-ml-2 mb-3 gap-1 rounded-lg text-muted-foreground" asChild>
          <Link href={`/courses/${id}`}>
            <ArrowLeft className="h-4 w-4" />
            {course.name}
          </Link>
        </Button>

        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">签到详情</h1>
              {session.status === "active" && (
                <Badge className="rounded-lg bg-green-100 text-green-700 hover:bg-green-100">进行中</Badge>
              )}
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {formatFullDate(session.startTime)} {formatHourMinute(session.startTime)} · 时长 {session.duration} 分钟
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-1 rounded-lg" asChild>
            <a href={`/api/courses/${id}/attendance/${sessionId}/export`} download>
              <Download className="h-4 w-4" />
              导出Excel
            </a>
          </Button>
        </div>

        {/* Summary */}
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {summary.map((s) => (
            <Card key={s.label} className="rounded-2xl border-0 shadow-sm">
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.tone}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-xl font-bold tabular-nums">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Absent first：老师最关心谁没来 */}
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <UserX className="h-5 w-5 text-red-600" />
                未签到（{absent.length}）
              </CardTitle>
              {absent.length > 0 && (
                <p className="text-xs text-muted-foreground">学生确实到场但未能扫码，可点击「补签」（记为迟到）</p>
              )}
            </CardHeader>
            <CardContent>
              {absent.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">全部到齐 🎉</p>
              ) : (
                <ul className="divide-y divide-border">
                  {absent.map((s) => (
                    <li key={s.id} className="flex items-center gap-3 py-2 text-sm">
                      <span className="w-24 shrink-0 truncate font-mono text-xs text-muted-foreground">{s.studentId}</span>
                      <span className="font-medium">{s.name}</span>
                      <SupplementButton courseId={id} sessionId={sessionId} studentId={s.id} studentName={s.name} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <UserCheck className="h-5 w-5 text-green-600" />
                已签到（{present.length}
                {lateCount > 0 && <span className="font-normal text-orange-600">，其中迟到 {lateCount}</span>}）
              </CardTitle>
            </CardHeader>
            <CardContent>
              {present.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">暂无签到记录</p>
              ) : (
                <ul className="divide-y divide-border">
                  {present.map((s) => (
                    <li key={s.id} className="flex items-center gap-3 py-2 text-sm">
                      <span className="w-24 shrink-0 truncate font-mono text-xs text-muted-foreground">{s.studentId}</span>
                      <span className="font-medium">{s.name}</span>
                      {s.recordType === "late" && (
                        <Badge variant="secondary" className="rounded-lg bg-orange-50 text-xs text-orange-700">
                          迟到
                        </Badge>
                      )}
                      <span className="ml-auto text-xs tabular-nums text-muted-foreground">{formatTime(s.timestamp)}</span>
                      <UndoCheckInButton courseId={id} sessionId={sessionId} studentId={s.id} studentName={s.name} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
