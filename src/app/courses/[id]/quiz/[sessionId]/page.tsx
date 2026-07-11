import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getQuizSessionDetail } from "@/lib/quiz";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GradeDialog } from "@/components/quiz/grade-dialog";
import {
  ArrowLeft,
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  Clock,
  Download,
} from "lucide-react";

export default async function QuizSessionDetailPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id, sessionId } = await params;

  const course = await prisma.course.findUnique({ where: { id } });
  if (!course || course.userId !== user.userId) notFound();

  const detail = await getQuizSessionDetail(sessionId);
  if (!detail || detail.session.courseId !== id) notFound();

  const { session, submitted, notSubmitted, totalStudents } = detail;
  const rate = totalStudents > 0 ? (submitted.length / totalStudents) * 100 : 0;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" className="gap-1 rounded-lg mb-2" asChild>
              <Link href={`/courses/${id}`}>
                <ArrowLeft className="h-4 w-4" />
                返回课程详情
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="gap-1 rounded-lg" asChild>
              <a href={`/api/courses/${id}/quiz/${sessionId}/export`}>
                <Download className="h-4 w-4" />
                导出Excel
              </a>
            </Button>
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">答题详情</h1>
          <p className="text-muted-foreground">
            {course.name} · {new Date(session.startTime).toLocaleDateString("zh-CN", {
              year: "numeric", month: "long", day: "numeric",
            })}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">应到人数</p>
                  <p className="text-xl font-bold">{totalStudents}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
                  <UserCheck className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">已提交</p>
                  <p className="text-xl font-bold text-green-600">{submitted.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
                  <UserX className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">未提交</p>
                  <p className="text-xl font-bold text-red-600">{notSubmitted.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">提交率</p>
                  <p className="text-xl font-bold text-orange-600">{rate.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
                  <Clock className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">答题时长</p>
                  <p className="text-xl font-bold">{session.duration} 分钟</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lists */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Submitted */}
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserCheck className="h-5 w-5 text-green-600" />
                已提交 ({submitted.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {submitted.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">暂无提交记录</p>
              ) : (
                <div className="space-y-3">
                  {submitted.map((s) => (
                    <div key={s.id} className="rounded-xl border bg-muted/30 p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-green-600">✓</span>
                          <span className="font-mono text-xs text-muted-foreground">{s.studentId}</span>
                          <span className="font-medium">{s.name}</span>
                        </div>
                        <GradeDialog
                          courseId={id}
                          sessionId={sessionId}
                          submissionId={s.id}
                          studentName={s.name}
                          currentScore={s.score}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground ml-7 whitespace-pre-wrap break-words">
                        {s.answer}
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-1 ml-7">
                        {new Date(s.timestamp).toLocaleTimeString("zh-CN")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Not Submitted */}
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserX className="h-5 w-5 text-red-600" />
                未提交 ({notSubmitted.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {notSubmitted.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">全部提交！ 🎉</p>
              ) : (
                <div className="space-y-1">
                  {notSubmitted.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm">
                      <span className="text-red-400">✗</span>
                      <span className="font-mono text-xs text-muted-foreground">{s.studentId}</span>
                      <span className="font-medium">{s.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
