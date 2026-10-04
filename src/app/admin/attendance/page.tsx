"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetchJson } from "@/lib/client";
import { formatDateTime } from "@/lib/format";

interface Teacher { id: string; name: string; }
interface CourseItem { id: string; name: string; }
interface Session { id: string; courseName: string; teacherName: string; courseId: string; teacherId: string; startTime: string; duration: number; status: string; checkInCount: number; totalStudents: number; }

export default function AdminAttendance() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [teacherId, setTeacherId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [t, c] = await Promise.all([
        fetchJson<Teacher[]>("/api/admin/teachers"),
        fetchJson<CourseItem[]>("/api/admin/courses"),
      ]);
      if (t.ok && t.data) setTeachers(t.data);
      if (c.ok && c.data) setCourses(c.data);
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const params = new URLSearchParams();
      if (teacherId) params.set("teacherId", teacherId);
      if (courseId) params.set("courseId", courseId);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const res = await fetchJson<Session[]>(`/api/admin/attendance?${params}`);
      if (cancelled) return;
      if (res.ok && res.data) setSessions(res.data);
      else toast.error(res.error || "加载失败");
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [teacherId, courseId, dateFrom, dateTo]);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">签到记录</h1>
      <p className="text-muted-foreground mb-6">查看全站最近 50 次签到</p>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Select value={teacherId} onValueChange={(v) => { setLoading(true); setTeacherId(v || ""); }}>
          <SelectTrigger className="w-48"><SelectValue placeholder="筛选教师" /></SelectTrigger>
          <SelectContent>{teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={courseId} onValueChange={(v) => { setLoading(true); setCourseId(v || ""); }}>
          <SelectTrigger className="w-48"><SelectValue placeholder="筛选课程" /></SelectTrigger>
          <SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
        <Input type="date" className="w-40" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <span className="self-center text-muted-foreground">至</span>
        <Input type="date" className="w-40" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
      </div>

      {loading ? (
        <div className="py-16 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>
      ) : sessions.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">暂无签到记录</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <Card key={s.id} >
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{s.courseName}</span>
                      <Badge variant="secondary" className="text-xs">{s.teacherName}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{formatDateTime(s.startTime)} · {s.duration}分钟</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{s.checkInCount}/{s.totalStudents}</p>
                    <Badge className={`text-xs ${s.status === "active" ? "bg-[var(--tag-green-bg)] text-[var(--tag-green-fg)]" : "bg-[var(--tag-gray-bg)] text-[var(--tag-gray-fg)]"}`}>{s.status === "active" ? "进行中" : "已结束"}</Badge>
                  </div>
                </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
