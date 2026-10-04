"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, BookOpen, ClipboardCheck, GraduationCap, RefreshCw } from "lucide-react";
import { fetchJson } from "@/lib/client";
import { formatDateTime } from "@/lib/format";

interface StatsData {
  teacherCount: number;
  courseCount: number;
  studentCount: number;
  sessionCount: number;
  recentTeachers: { id: string; name: string; email: string; status: string; courseCount: number }[];
  recentSessions: { id: string; courseName: string; startTime: string; checkInCount: number; status: string }[];
}

export default function AdminDashboard() {
  const [data, setData] = useState<StatsData | null>(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetchJson<StatsData>("/api/admin/stats");
      if (cancelled) return;
      if (res.ok && res.data) {
        setData(res.data);
        setError("");
      } else {
        setError(res.error || "加载失败");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  if (error && !data) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-muted-foreground">{error}</p>
        <Button variant="outline" className="rounded-xl" onClick={() => setReloadKey((k) => k + 1)}>
          <RefreshCw className="mr-2 h-4 w-4" />
          重试
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const cards = [
    { label: "教师总数", value: data.teacherCount, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "课程总数", value: data.courseCount, icon: BookOpen, color: "text-green-600", bg: "bg-green-50" },
    { label: "学生总数", value: data.studentCount, icon: GraduationCap, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "签到总次数", value: data.sessionCount, icon: ClipboardCheck, color: "text-orange-600", bg: "bg-orange-50" },
  ];

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight sm:text-3xl">管理后台</h1>
      <p className="mb-8 text-muted-foreground">点名宝 · 系统概览</p>

      <div className="mb-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {cards.map((s) => (
          <Card key={s.label} className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold sm:text-3xl">{s.value}</p>
                </div>
                <div className={`hidden h-12 w-12 items-center justify-center rounded-xl sm:flex ${s.bg}`}>
                  <s.icon className={`h-6 w-6 ${s.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="p-6">
            <h3 className="mb-4 font-semibold">最近注册教师</h3>
            {data.recentTeachers.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">暂无</p>
            ) : (
              <div className="space-y-2">
                {data.recentTeachers.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <span className="font-medium">{t.name}</span>
                      <span className="ml-2 truncate text-muted-foreground">{t.email}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="secondary" className="rounded-lg text-xs">{t.courseCount} 门课</Badge>
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
            <h3 className="mb-4 font-semibold">最近签到</h3>
            {data.recentSessions.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">暂无</p>
            ) : (
              <div className="space-y-2">
                {data.recentSessions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm">
                    <div>
                      <span className="font-medium">{s.courseName}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{formatDateTime(s.startTime)}</span>
                    </div>
                    <Badge variant="secondary" className="rounded-lg text-xs">{s.checkInCount} 人</Badge>
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
