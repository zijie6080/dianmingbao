"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Search, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface CourseItem { id: string; name: string; semester: string; teacherName: string; teacherEmail: string; studentCount: number; sessionCount: number; }

export default function AdminCourses() {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchCourses = useCallback(async () => {
    const params = new URLSearchParams(); if (search) params.set("search", search);
    const res = await fetch(`/api/admin/courses?${params}`); const d = await res.json();
    if (d.success) setCourses(d.data); setLoading(false);
  }, [search]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  async function deleteCourse(id: string) {
    await fetch(`/api/admin/courses?id=${id}`, { method: "DELETE" });
    toast.success("已删除"); fetchCourses();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">课程管理</h1>
      <p className="text-muted-foreground mb-6">查看全站课程</p>

      <div className="mb-4 max-w-sm">
        <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="搜索课程名或教师..." className="pl-10 rounded-xl" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card className="rounded-2xl border-0 shadow-sm">
        {loading ? <CardContent className="py-16 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></CardContent> : courses.length === 0 ? (
          <CardContent className="py-16 text-center text-muted-foreground">暂无课程</CardContent>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>课程</TableHead><TableHead>教师</TableHead><TableHead>学生</TableHead><TableHead>签到</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
            <TableBody>
              {courses.map((c) => (
                <TableRow key={c.id}>
                  <TableCell><div className="font-medium">{c.name}</div><Badge variant="secondary" className="rounded-lg text-xs mt-0.5">{c.semester}</Badge></TableCell>
                  <TableCell><div className="text-sm">{c.teacherName}</div><div className="text-xs text-muted-foreground">{c.teacherEmail}</div></TableCell>
                  <TableCell>{c.studentCount}</TableCell>
                  <TableCell>{c.sessionCount}</TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="h-8 rounded-lg text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
                      <AlertDialogContent className="rounded-2xl">
                        <AlertDialogHeader><AlertDialogTitle>删除课程</AlertDialogTitle><AlertDialogDescription>永久删除「{c.name}」及其所有数据。</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel className="rounded-xl">取消</AlertDialogCancel><AlertDialogAction className="rounded-xl bg-destructive" onClick={() => deleteCourse(c.id)}>删除</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
