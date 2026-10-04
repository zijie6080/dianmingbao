"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";
import { ListBox, PageHeader, Section, StatStrip } from "@/components/app/ui";
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
        <Button variant="outline"  onClick={() => setReloadKey((k) => k + 1)}>
          <RefreshCw className="mr-2 h-4 w-4" />
          重试
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="管理后台" description="点名宝 · 系统概览" />
      <StatStrip
        items={[
          { label: "教师", value: data.teacherCount },
          { label: "课程", value: data.courseCount },
          { label: "学生", value: data.studentCount },
          { label: "累计签到", value: data.sessionCount },
        ]}
      />
      <div className="mt-8 grid gap-x-8 lg:grid-cols-2">
        <Section title="最近注册教师" className="mt-0">
          {data.recentTeachers.length === 0 ? (
            <p className="rounded-lg border border-border px-4 py-6 text-center text-[13px] text-muted-foreground">暂无</p>
          ) : (
            <ListBox>
              {data.recentTeachers.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{t.name}</p>
                    <p className="truncate text-[13px] text-muted-foreground">{t.email}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="num text-[13px] text-muted-foreground">{t.courseCount} 门课</span>
                    <span className={`tag ${t.status === "ACTIVE" ? "tag-green" : "tag-red"}`}>
                      {t.status === "ACTIVE" ? "正常" : "已禁用"}
                    </span>
                  </div>
                </div>
              ))}
            </ListBox>
          )}
        </Section>

        <Section title="最近签到" className="mt-8 lg:mt-0">
          {data.recentSessions.length === 0 ? (
            <p className="rounded-lg border border-border px-4 py-6 text-center text-[13px] text-muted-foreground">暂无</p>
          ) : (
            <ListBox>
              {data.recentSessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{s.courseName}</p>
                    <p className="num text-[13px] text-muted-foreground">{formatDateTime(s.startTime)}</p>
                  </div>
                  <span className="num text-[13px] text-muted-foreground">{s.checkInCount} 人签到</span>
                </div>
              ))}
            </ListBox>
          )}
        </Section>
      </div>
    </div>
  );
}
