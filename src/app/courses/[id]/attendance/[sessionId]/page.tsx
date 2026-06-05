import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSessionDetail } from "@/lib/attendance";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SupplementButton } from "@/components/attendance/supplement-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  Clock,
} from "lucide-react";

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

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" className="gap-1 rounded-lg mb-2" asChild>
            <Link href={`/courses/${id}/attendance`}>
              <ArrowLeft className="h-4 w-4" />
              返回签到记录
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            签到详情
          </h1>
          <p className="text-muted-foreground">
            {course.name} · {new Date(session.startTime).toLocaleDateString("zh-CN", {
              year: "numeric",
              month: "long",
              day: "numeric",
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
                  <p className="text-xs text-muted-foreground">实到人数</p>
                  <p className="text-xl font-bold text-green-600">{present.length}</p>
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
                  <p className="text-xs text-muted-foreground">缺席人数</p>
                  <p className="text-xl font-bold text-red-600">{absent.length}</p>
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
                  <p className="text-xs text-muted-foreground">出勤率</p>
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
                  <p className="text-xs text-muted-foreground">签到时长</p>
                  <p className="text-xl font-bold">{session.duration} 分钟</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lists */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Present */}
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserCheck className="h-5 w-5 text-green-600" />
                已签到 ({present.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {present.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  暂无签到记录
                </p>
              ) : (
                <div className="space-y-1">
                  {present.map((s: Record<string, unknown> & { id: string; studentId: string; name: string; recordType?: string }) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm"
                    >
                      <span className={s.recordType === "late" ? "text-orange-500" : "text-green-600"}>
                        {s.recordType === "late" ? "⏰" : "✓"}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {s.studentId}
                      </span>
                      <span className="font-medium">{s.name}</span>
                      {s.recordType === "late" && (
                        <Badge variant="secondary" className="ml-auto rounded-lg bg-orange-50 text-orange-700 text-xs">
                          迟到
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Absent */}
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserX className="h-5 w-5 text-red-600" />
                未签到 ({absent.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {absent.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  全部到齐！ 🎉
                </p>
              ) : (
                <div className="space-y-1">
                  {absent.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm"
                    >
                      <span className="text-red-400">✗</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {s.studentId}
                      </span>
                      <span className="font-medium">{s.name}</span>
                      <SupplementButton
                        courseId={id}
                        sessionId={sessionId}
                        studentId={s.id}
                        studentName={s.name}
                      />
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
