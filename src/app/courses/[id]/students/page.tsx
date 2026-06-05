"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Plus,
  Upload,
  Download,
  Search,
  Pencil,
  Trash2,
  Users,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import type { StudentDTO } from "@/types";

export default function StudentsPage() {
  const { id: courseId } = useParams<{ id: string }>();
  const [students, setStudents] = useState<StudentDTO[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [courseName, setCourseName] = useState("");

  // Add/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentDTO | null>(null);
  const [formStudentId, setFormStudentId] = useState("");
  const [formName, setFormName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Import dialog
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchStudents = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    try {
      const res = await fetch(`/api/courses/${courseId}/students?${params}`);
      const data = await res.json();
      if (data.success) setStudents(data.data);
    } catch {
      toast.error("加载学生列表失败");
    } finally {
      setLoading(false);
    }
  }, [courseId, search]);

  const fetchCourse = useCallback(async () => {
    try {
      const res = await fetch(`/api/courses/${courseId}`);
      const data = await res.json();
      if (data.success) setCourseName(data.data.name);
    } catch {}
  }, [courseId]);

  useEffect(() => {
    fetchStudents();
    fetchCourse();
  }, [fetchStudents, fetchCourse]);

  // Add / Edit
  function openAdd() {
    setEditingStudent(null);
    setFormStudentId("");
    setFormName("");
    setDialogOpen(true);
  }

  function openEdit(student: StudentDTO) {
    setEditingStudent(student);
    setFormStudentId(student.studentId);
    setFormName(student.name);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formStudentId || !formName) {
      toast.error("请填写学号和姓名");
      return;
    }
    setSubmitting(true);

    try {
      let res: Response;
      if (editingStudent) {
        res = await fetch(`/api/courses/${courseId}/students/${editingStudent.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId: formStudentId, name: formName }),
        });
      } else {
        res = await fetch(`/api/courses/${courseId}/students`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId: formStudentId, name: formName }),
        });
      }

      const data = await res.json();
      if (data.success) {
        toast.success(editingStudent ? "学生信息已更新" : "学生已添加");
        setDialogOpen(false);
        fetchStudents();
      } else {
        toast.error(data.error || "操作失败");
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setSubmitting(false);
    }
  }

  // Import
  async function handleImport() {
    if (!importFile) {
      toast.error("请选择Excel文件");
      return;
    }
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      const res = await fetch(`/api/courses/${courseId}/students/import`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          `导入完成：成功 ${data.data.imported} 人，跳过 ${data.data.skipped} 人（重复）`
        );
        setImportOpen(false);
        setImportFile(null);
        fetchStudents();
      } else {
        toast.error(data.error || "导入失败");
      }
    } catch {
      toast.error("导入失败");
    } finally {
      setImporting(false);
    }
  }

  // Delete
  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/students/${deleteId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("学生已删除");
        setDeleteId(null);
        fetchStudents();
      } else {
        toast.error(data.error || "删除失败");
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setDeleting(false);
    }
  }

  function downloadTemplate() {
    const a = document.createElement("a");
    a.href = "/api/courses/export-template";
    a.click();
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Button variant="ghost" size="sm" className="gap-1 rounded-lg mb-2" asChild>
              <Link href={`/courses/${courseId}`}>
                <ArrowLeft className="h-4 w-4" />
                返回课程
              </Link>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {courseName} · 学生管理
            </h1>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索学号或姓名..."
              className="pl-10 rounded-xl"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-1 rounded-xl" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" />
              导入Excel
            </Button>
            <Button className="gap-1 rounded-xl" onClick={openAdd}>
              <Plus className="h-4 w-4" />
              添加学生
            </Button>
          </div>
        </div>

        {/* Students Table */}
        <Card className="rounded-2xl border-0 shadow-sm">
          {loading ? (
            <CardContent className="py-16 text-center text-muted-foreground">
              <Loader2 className="mx-auto h-6 w-6 animate-spin" />
              <p className="mt-2">加载中...</p>
            </CardContent>
          ) : students.length === 0 ? (
            <CardContent className="flex flex-col items-center gap-4 py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="font-medium">
                  {search ? "没有找到匹配的学生" : "还没有添加学生"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {search ? "尝试其他搜索词" : "手动添加或通过Excel批量导入"}
                </p>
              </div>
              {!search && (
                <div className="flex gap-2">
                  <Button variant="outline" className="rounded-xl" onClick={() => setImportOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    导入Excel
                  </Button>
                  <Button className="rounded-xl" onClick={openAdd}>
                    <Plus className="mr-2 h-4 w-4" />
                    添加学生
                  </Button>
                </div>
              )}
            </CardContent>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>学号</TableHead>
                  <TableHead>姓名</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student, index) => (
                  <TableRow key={student.id}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-mono text-sm">{student.studentId}</TableCell>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 rounded-lg"
                          onClick={() => openEdit(student)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog open={deleteId === student.id} onOpenChange={(v) => !v && setDeleteId(null)}>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 rounded-lg text-destructive hover:text-destructive"
                              onClick={() => setDeleteId(student.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-2xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle>确认删除？</AlertDialogTitle>
                              <AlertDialogDescription>
                                将删除学生「{student.name}（{student.studentId}）」及其所有签到记录。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-xl">取消</AlertDialogCancel>
                              <AlertDialogAction
                                className="rounded-xl bg-destructive hover:bg-destructive/90"
                                onClick={handleDelete}
                                disabled={deleting}
                              >
                                确认删除
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle>{editingStudent ? "编辑学生" : "添加学生"}</DialogTitle>
              <DialogDescription>
                {editingStudent ? "修改学生信息" : "手动添加一名学生"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="studentId">学号</Label>
                  <Input
                    id="studentId"
                    placeholder="例如：2024001"
                    className="rounded-xl"
                    value={formStudentId}
                    onChange={(e) => setFormStudentId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="studentName">姓名</Label>
                  <Input
                    id="studentName"
                    placeholder="例如：张三"
                    className="rounded-xl"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => setDialogOpen(false)}>
                  取消
                </Button>
                <Button type="submit" className="rounded-xl" disabled={submitting}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {editingStudent ? "保存" : "添加"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Import Dialog */}
        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle>导入学生</DialogTitle>
              <DialogDescription>
                上传Excel文件（.xlsx），表格需包含「学号」和「姓名」两列
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex flex-col gap-2">
                <Label>选择文件</Label>
                <Input
                  type="file"
                  accept=".xlsx,.xls"
                  className="rounded-xl"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                />
              </div>
              <div className="rounded-xl border border-border p-4 bg-muted/30">
                <p className="text-sm font-medium mb-2">📋 文件格式要求</p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>第一列：学号</li>
                  <li>第二列：姓名</li>
                  <li>第一行为表头（自动跳过）</li>
                  <li>重复学号会自动跳过</li>
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" className="rounded-xl" onClick={() => setImportOpen(false)}>
                取消
              </Button>
              <Button className="rounded-xl" onClick={handleImport} disabled={importing || !importFile}>
                {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                开始导入
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
