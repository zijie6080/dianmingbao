"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, BookOpen, ClipboardCheck, GraduationCap } from "lucide-react";

export default function AdminDashboard() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats").then((r) => r.json()).then((d) => { if (d.success) setData(d.data); });
  }, []);

  if (!data) return <div className="space-y-6"><Skeleton className="h-32 w-full rounded-2xl" /><Skeleton className="h-64 w-full rounded-2xl" /></div>;

  const d = data as Record<string, unknown>;
  const recentTeachers = (d.recentTeachers as Array<Record<string, unknown>>) || [];
  const recentSessions = (d.recentSessions as Array<Record<string, unknown>>) || [];

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl mb-2">管理后台</h1>
      <p className="text-muted-foreground mb-8">点名宝 · 系统管理</p>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
        {[
          { label: "教师总数", value: d.teacherCount as number, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "课程总数", value: d.courseCount as number, icon: BookOpen, color: "text-green-600", bg: "bg-green-50" },
          { label: "学生总数", value: d.studentCount as number, icon: GraduationCap, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "签到总次数", value: d.sessionCount as number, icon: ClipboardCheck, color: "text-orange-600", bg: "bg-orange-50" },
        ].map((s) => (
          <Card key={s.label} className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-3xl font-bold">{String(s.value)}</p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${s.bg}`}>
                  <s.icon className={`h-6 w-6 ${s.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">最近注册教师</h3>
            {recentTeachers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">暂无</p>
            ) : (
              <div className="space-y-2">
                {recentTeachers.map((t: Record<string, unknown>) => (
                  <div key={t.id as string} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm bg-muted/30">
                    <div>
                      <span className="font-medium">{t.name as string}</span>
                      <span className="text-muted-foreground ml-2">{t.email as string}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="rounded-lg text-xs">{t.courseCount as number} 门课</Badge>
                      <Badge className={`rounded-lg text-xs ${t.status === "ACTIVE" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                        {t.status === "ACTIVE" ? "正常" : "禁用"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">最近签到记录</h3>
            {recentSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">暂无</p>
            ) : (
              <div className="space-y-2">
                {recentSessions.map((s: Record<string, unknown>) => (
                  <div key={s.id as string} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm bg-muted/30">
                    <div>
                      <span className="font-medium">{s.courseName as string}</span>
                      <span className="text-muted-foreground ml-2 text-xs">
                        {new Date(s.startTime as string).toLocaleString("zh-CN")}
                      </span>
                    </div>
                    <Badge variant="secondary" className="rounded-lg text-xs">{s.checkInCount as number} 人</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
