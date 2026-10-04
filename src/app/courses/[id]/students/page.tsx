"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
  RefreshCw,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { fetchJson } from "@/lib/client";
import type { ImportResult, StudentDTO } from "@/types";

export default function StudentsPage() {
  const { id: courseId } = useParams<{ id: string }>();
  const [students, setStudents] = useState<StudentDTO[]>([]);
  const [search, setSearch] = useState("");
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState("");
  const [courseName, setCourseName] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

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
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<StudentDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 一次加载全部学生，搜索在前端完成（避免每次按键请求、响应乱序）
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [studentsRes, courseRes] = await Promise.all([
        fetchJson<StudentDTO[]>(`/api/courses/${courseId}/students`),
        fetchJson<{ name: string }>(`/api/courses/${courseId}`),
      ]);
      if (cancelled) return;
      if (courseRes.ok && courseRes.data) setCourseName(courseRes.data.name);
      if (studentsRes.ok && studentsRes.data) {
        setStudents(studentsRes.data);
        setLoadState("ready");
      } else {
        setLoadError(studentsRes.error || "加载学生列表失败");
        setLoadState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) => s.studentId.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    );
  }, [students, search]);

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
    if (submitting) return;
    if (!formStudentId.trim() || !formName.trim()) {
      toast.error("请填写学号和姓名");
      return;
    }
    setSubmitting(true);

    const body = { studentId: formStudentId.trim(), name: formName.trim() };
    const res = editingStudent
      ? await fetchJson<StudentDTO>(`/api/courses/${courseId}/students/${editingStudent.id}`, {
          method: "PUT",
          json: body,
        })
      : await fetchJson<StudentDTO>(`/api/courses/${courseId}/students`, { method: "POST", json: body });

    setSubmitting(false);
    if (res.ok && res.data) {
      const saved = res.data;
      toast.success(editingStudent ? "学生信息已更新" : `已添加 ${saved.name}`);
      setStudents((prev) => {
        const next = editingStudent
          ? prev.map((s) => (s.id === saved.id ? saved : s))
          : [...prev, saved];
        return next.sort((a, b) => a.studentId.localeCompare(b.studentId));
      });
      if (editingStudent) {
        setDialogOpen(false);
      } else {
        // 连续添加：清空表单，保持弹窗打开
        setFormStudentId("");
        setFormName("");
      }
    } else {
      toast.error(res.error || "操作失败");
    }
  }

  // Import
  async function handleImport() {
    if (!importFile || importing) return;
    setImporting(true);
    const formData = new FormData();
    formData.append("file", importFile);
    const res = await fetchJson<ImportResult>(`/api/courses/${courseId}/students/import`, {
      method: "POST",
      body: formData,
      timeoutMs: 60_000,
    });
    setImporting(false);
    if (res.ok && res.data) {
      setImportResult(res.data);
      toast.success(`成功导入 ${res.data.imported} 人`);
      reload();
    } else {
      toast.error(res.error || "导入失败");
    }
  }

  function closeImport(open: boolean) {
    setImportOpen(open);
    if (!open) {
      setImportFile(null);
      setImportResult(null);
    }
  }

  // Delete
  async function handleDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    const res = await fetchJson(`/api/courses/${courseId}/students/${deleteTarget.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      toast.success(`已删除 ${deleteTarget.name}`);
      setStudents((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } else {
      toast.error(res.error || "删除失败");
    }
  }

  const templateUrl = `/api/courses/${courseId}/students/template`;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Button variant="ghost" size="sm" className="-ml-2 mb-3 gap-1 rounded-lg text-muted-foreground" asChild>
          <Link href={`/courses/${courseId}`}>
            <ArrowLeft className="h-4 w-4" />
            {courseName || "返回课程"}
          </Link>
        </Button>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">学生名单</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {loadState === "ready" ? `共 ${students.length} 人 · 学生签到时按姓名匹配` : " "}
            </p>
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

        {students.length > 0 && (
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索学号或姓名"
              className="rounded-xl pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}

        <Card className="overflow-hidden rounded-2xl border-0 shadow-sm">
          {loadState === "loading" ? (
            <CardContent className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded-lg" />
              ))}
            </CardContent>
          ) : loadState === "error" ? (
            <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
              <p className="text-sm text-muted-foreground">{loadError}</p>
              <Button variant="outline" className="rounded-xl" onClick={reload}>
                <RefreshCw className="mr-2 h-4 w-4" />
                重新加载
              </Button>
            </CardContent>
          ) : filtered.length === 0 ? (
            <CardContent className="flex flex-col items-center gap-4 py-14">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                <Users className="h-7 w-7 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="font-medium">{search ? "没有找到匹配的学生" : "还没有添加学生"}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {search ? "换个关键词试试" : "推荐用 Excel 批量导入，几秒完成整个班级"}
                </p>
              </div>
              {!search && (
                <div className="flex flex-wrap justify-center gap-2">
                  <Button className="rounded-xl" onClick={() => setImportOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    导入Excel
                  </Button>
                  <Button variant="outline" className="rounded-xl" onClick={openAdd}>
                    <Plus className="mr-2 h-4 w-4" />
                    手动添加
                  </Button>
                </div>
              )}
            </CardContent>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="hidden w-14 sm:table-cell">#</TableHead>
                  <TableHead>学号</TableHead>
                  <TableHead>姓名</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((student, index) => (
                  <TableRow key={student.id}>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">{index + 1}</TableCell>
                    <TableCell className="font-mono text-sm">{student.studentId}</TableCell>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 rounded-lg"
                          aria-label={`编辑 ${student.name}`}
                          onClick={() => openEdit(student)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 rounded-lg text-destructive hover:text-destructive"
                          aria-label={`删除 ${student.name}`}
                          onClick={() => setDeleteTarget(student)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* Delete confirm */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>删除学生？</AlertDialogTitle>
              <AlertDialogDescription>
                将删除「{deleteTarget?.name}（{deleteTarget?.studentId}）」及其所有签到和答题记录，此操作不可撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">取消</AlertDialogCancel>
              <AlertDialogAction
                className="rounded-xl bg-destructive hover:bg-destructive/90"
                onClick={(e) => {
                  e.preventDefault();
                  void handleDelete();
                }}
                disabled={deleting}
              >
                {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                确认删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="rounded-2xl sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingStudent ? "编辑学生" : "添加学生"}</DialogTitle>
              <DialogDescription>
                {editingStudent ? "修改学号或姓名" : "保存后可继续添加下一位"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="studentId">学号</Label>
                  <Input
                    id="studentId"
                    placeholder="例如：2024001"
                    className="rounded-xl"
                    maxLength={30}
                    value={formStudentId}
                    onChange={(e) => setFormStudentId(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="studentName">姓名</Label>
                  <Input
                    id="studentName"
                    placeholder="例如：张三"
                    className="rounded-xl"
                    maxLength={50}
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => setDialogOpen(false)}>
                  {editingStudent ? "取消" : "完成"}
                </Button>
                <Button type="submit" className="rounded-xl" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingStudent ? "保存" : "添加"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Import Dialog */}
        <Dialog open={importOpen} onOpenChange={closeImport}>
          <DialogContent className="rounded-2xl sm:max-w-md">
            <DialogHeader>
              <DialogTitle>从 Excel 导入学生</DialogTitle>
              <DialogDescription>表格需包含「学号」和「姓名」两列，第一行为表头</DialogDescription>
            </DialogHeader>

            {importResult ? (
              <div className="space-y-3 py-2">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-green-50 p-3">
                    <p className="text-2xl font-bold text-green-700">{importResult.imported}</p>
                    <p className="text-xs text-green-700">成功导入</p>
                  </div>
                  <div className="rounded-xl bg-muted p-3">
                    <p className="text-2xl font-bold">{importResult.skipped}</p>
                    <p className="text-xs text-muted-foreground">学号重复跳过</p>
                  </div>
                  <div className="rounded-xl bg-red-50 p-3">
                    <p className="text-2xl font-bold text-red-700">{importResult.errors.length}</p>
                    <p className="text-xs text-red-700">格式有误</p>
                  </div>
                </div>
                {importResult.errors.length > 0 && (
                  <ul className="max-h-32 space-y-1 overflow-y-auto rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
                    {importResult.errors.map((err) => (
                      <li key={err.row}>
                        第 {err.row} 行 {err.studentId}：{err.reason}
                      </li>
                    ))}
                  </ul>
                )}
                <DialogFooter>
                  <Button className="w-full rounded-xl sm:w-auto" onClick={() => closeImport(false)}>
                    完成
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <>
                <div className="space-y-4 py-2">
                  <label
                    htmlFor="import-file"
                    className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-6 text-center transition-colors hover:border-primary/50 hover:bg-muted/40"
                  >
                    <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm font-medium">{importFile ? importFile.name : "点击选择 Excel 文件"}</span>
                    <span className="text-xs text-muted-foreground">支持 .xlsx / .xls，最大 2MB</span>
                    <input
                      id="import-file"
                      type="file"
                      accept=".xlsx,.xls"
                      className="sr-only"
                      onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    />
                  </label>
                  <a
                    href={templateUrl}
                    download
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <Download className="h-4 w-4" />
                    下载导入模板
                  </a>
                  <p className="text-xs text-muted-foreground">已存在的学号会自动跳过，不会重复导入。</p>
                </div>
                <DialogFooter>
                  <Button variant="outline" className="rounded-xl" onClick={() => closeImport(false)}>
                    取消
                  </Button>
                  <Button className="rounded-xl" onClick={handleImport} disabled={importing || !importFile}>
                    {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    开始导入
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
