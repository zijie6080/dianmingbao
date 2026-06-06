"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import Link from "next/link";

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
    fetch("/api/admin/teachers").then((r) => r.json()).then((d) => { if (d.success) setTeachers(d.data); });
    fetch("/api/admin/courses").then((r) => r.json()).then((d) => { if (d.success) setCourses(d.data); });
  }, []);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (teacherId) params.set("teacherId", teacherId);
    if (courseId) params.set("courseId", courseId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const res = await fetch(`/api/admin/attendance?${params}`);
    const d = await res.json();
    if (d.success) setSessions(d.data);
    setLoading(false);
  }, [teacherId, courseId, dateFrom, dateTo]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">签到记录</h1>
      <p className="text-muted-foreground mb-6">查看全站签到记录</p>

      <div className="flex flex-wrap gap-4 mb-6">
        <Select value={teacherId} onValueChange={(v) => setTeacherId(v || "")}>
          <SelectTrigger className="w-48 rounded-xl"><SelectValue placeholder="筛选教师" /></SelectTrigger>
          <SelectContent>{teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={courseId} onValueChange={(v) => setCourseId(v || "")}>
          <SelectTrigger className="w-48 rounded-xl"><SelectValue placeholder="筛选课程" /></SelectTrigger>
          <SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
        <Input type="date" className="w-40 rounded-xl" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <span className="self-center text-muted-foreground">至</span>
        <Input type="date" className="w-40 rounded-xl" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
      </div>

      {loading ? (
        <div className="py-16 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>
      ) : sessions.length === 0 ? (
        <Card className="rounded-2xl border-0 shadow-sm"><CardContent className="py-16 text-center text-muted-foreground">暂无签到记录</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <Link key={s.id} href={`/courses/${s.courseId}/attendance/${s.id}`}>
              <Card className="rounded-xl border-0 shadow-sm hover:shadow-md transition-all">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{s.courseName}</span>
                      <Badge variant="secondary" className="rounded-lg text-xs">{s.teacherName}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{new Date(s.startTime).toLocaleString("zh-CN")} · {s.duration}分钟</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{s.checkInCount}/{s.totalStudents}</p>
                    <Badge className={`rounded-lg text-xs ${s.status === "active" ? "bg-green-50 text-green-700" : "bg-muted text-muted-foreground"}`}>{s.status === "active" ? "进行中" : "已结束"}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
