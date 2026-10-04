"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Search, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fetchJson } from "@/lib/client";

interface CourseItem { id: string; name: string; semester: string; teacherName: string; teacherEmail: string; studentCount: number; sessionCount: number; }

export default function AdminCourses() {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<CourseItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      const res = await fetchJson<CourseItem[]>(`/api/admin/courses?${params}`);
      if (cancelled) return;
      if (res.ok && res.data) setCourses(res.data);
      else toast.error(res.error || "加载失败");
      setLoading(false);
    }, search ? 300 : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, reloadKey]);

  async function deleteCourse() {
    if (!deleteTarget) return;
    const res = await fetchJson(`/api/admin/courses?id=${encodeURIComponent(deleteTarget.id)}`, { method: "DELETE" });
    if (res.ok) { toast.success("已删除"); setDeleteTarget(null); setReloadKey((k) => k + 1); }
    else toast.error(res.error || "删除失败");
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">课程管理</h1>
      <p className="mb-6 text-muted-foreground">查看全站课程</p>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="搜索课程名或教师" className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <CardContent className="py-16 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></CardContent>
        ) : courses.length === 0 ? (
          <CardContent className="py-16 text-center text-muted-foreground">{search ? "没有匹配的课程" : "暂无课程"}</CardContent>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>课程</TableHead><TableHead>教师</TableHead><TableHead>学生</TableHead><TableHead>签到</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
            <TableBody>
              {courses.map((c) => (
                <TableRow key={c.id}>
                  <TableCell><div className="font-medium">{c.name}</div><Badge variant="secondary" className="mt-0.5 text-xs">{c.semester}</Badge></TableCell>
                  <TableCell><div className="text-sm">{c.teacherName}</div><div className="text-xs text-muted-foreground">{c.teacherEmail}</div></TableCell>
                  <TableCell>{c.studentCount}</TableCell>
                  <TableCell>{c.sessionCount}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-8 rounded-lg text-destructive" title="删除" onClick={() => setDeleteTarget(c)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent >
          <AlertDialogHeader>
            <AlertDialogTitle>删除课程</AlertDialogTitle>
            <AlertDialogDescription>永久删除「{deleteTarget?.name}」及其所有学生、签到和答题数据，不可恢复。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel >取消</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={deleteCourse}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
