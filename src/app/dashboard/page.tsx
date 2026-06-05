import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Navbar } from "@/components/layout/navbar";
import { BookOpen, Users, ClipboardCheck, TrendingUp, Plus, ArrowRight } from "lucide-react";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const data = await getDashboardData(user.userId);

  const stats = [
    {
      title: "课程数量",
      value: data.courseCount,
      icon: BookOpen,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "学生总人数",
      value: data.studentCount,
      icon: Users,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "本学期签到次数",
      value: data.semesterSessionCount,
      icon: ClipboardCheck,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      title: "平均出勤率",
      value: `${data.averageAttendanceRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">仪表盘</h1>
            <p className="text-muted-foreground">
              欢迎回来，{user.email}。以下是你的教学概览。
            </p>
          </div>
          <Button className="rounded-xl gap-2" asChild>
            <Link href="/courses">
              <Plus className="h-4 w-4" />
              管理课程
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title} className="rounded-2xl border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bg}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Courses */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">最近课程</h2>
            <Button variant="ghost" size="sm" className="gap-1 rounded-lg" asChild>
              <Link href="/courses">
                查看全部
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {data.recentCourses.length === 0 ? (
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardContent className="flex flex-col items-center gap-4 py-16">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                  <BookOpen className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="font-medium">还没有课程</p>
                  <p className="text-sm text-muted-foreground">创建你的第一门课程开始使用</p>
                </div>
                <Button className="rounded-xl" asChild>
                  <Link href="/courses">创建课程</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.recentCourses.map((course) => (
                <Link key={course.id} href={`/courses/${course.id}`}>
                  <Card className="group h-full rounded-2xl border-0 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
                    <CardContent className="p-6">
                      <div className="mb-4 flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold group-hover:text-primary transition-colors">
                            {course.name}
                          </h3>
                          <Badge variant="secondary" className="mt-1 rounded-lg font-normal">
                            {course.semester}
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-bold">{course.studentCount}</p>
                          <p className="text-xs text-muted-foreground">学生</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{course.sessionCount}</p>
                          <p className="text-xs text-muted-foreground">签到</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold">
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
        </div>
      </main>
    </div>
  );
}
