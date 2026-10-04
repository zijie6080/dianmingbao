"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader, StatStrip } from "@/components/app/ui";
import { CourseTabs } from "@/components/app/course-tabs";
import { RosterIllustration } from "@/components/app/illustrations";
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
import { parseRosterText } from "@/lib/roster-parse";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
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
  // 删除：先从列表移除，5 秒内可撤回，之后才真正删除
  const pendingDeletes = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  // 导入方式：上传文件 / 粘贴名单
  const [importMode, setImportMode] = useState<"file" | "paste">("file");
  const [pasteText, setPasteText] = useState("");
  const pasted = useMemo(() => parseRosterText(pasteText), [pasteText]);

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
    if (importing) return;
    if (importMode === "file" && !importFile) return;
    if (importMode === "paste" && pasted.rows.length === 0) return;
    setImporting(true);
    let res;
    if (importMode === "file") {
      const formData = new FormData();
      formData.append("file", importFile!);
      res = await fetchJson<ImportResult>(`/api/courses/${courseId}/students/import`, {
        method: "POST",
        body: formData,
        timeoutMs: 60_000,
      });
    } else {
      res = await fetchJson<ImportResult>(`/api/courses/${courseId}/students/bulk`, {
        method: "POST",
        json: { students: pasted.rows },
        timeoutMs: 60_000,
      });
    }
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
      setPasteText("");
    }
  }

  // Delete：不弹确认框，先移除并提供「撤回」，5 秒后才真正删除
  const commitDelete = useCallback(
    async (student: StudentDTO) => {
      pendingDeletes.current.delete(student.id);
      const res = await fetchJson(`/api/courses/${courseId}/students/${student.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error(res.error || `删除 ${student.name} 失败`);
        setStudents((prev) => [...prev, student].sort((a, b) => a.studentId.localeCompare(b.studentId)));
      }
    },
    [courseId]
  );

  function handleDelete(student: StudentDTO) {
    setStudents((prev) => prev.filter((s) => s.id !== student.id));
    const timer = setTimeout(() => void commitDelete(student), 5000);
    pendingDeletes.current.set(student.id, timer);
    toast(`已删除 ${student.name}`, {
      description: "其签到和答题记录也会一并删除",
      duration: 5000,
      action: {
        label: "撤回",
        onClick: () => {
          clearTimeout(pendingDeletes.current.get(student.id));
          pendingDeletes.current.delete(student.id);
          setStudents((prev) => [...prev, student].sort((a, b) => a.studentId.localeCompare(b.studentId)));
        },
      },
    });
  }

  // 离开页面时，把还在「可撤回」期内的删除立即提交
  useEffect(() => {
    const pending = pendingDeletes.current;
    const flush = () => {
      for (const [id, timer] of pending) {
        clearTimeout(timer);
        void fetch(`/api/courses/${courseId}/students/${id}`, { method: "DELETE", keepalive: true });
      }
      pending.clear();
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [courseId]);

  const templateUrl = `/api/courses/${courseId}/students/template`;

  return (
    <>
        <PageHeader
          crumbs={[
            { href: "/courses", label: "全部课程" },
            { href: `/courses/${courseId}`, label: courseName || "课程" },
            { label: "学生名单" },
          ]}
          title={courseName || "学生名单"}
          description={loadState === "ready" ? `共 ${students.length} 名学生 · 学生签到时按姓名匹配名单` : "\u00a0"}
          actions={
            <>
              <Button variant="outline" className="gap-1.5" onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4" />
                批量导入
              </Button>
              <Button className="gap-1.5" onClick={openAdd}>
                <Plus className="h-4 w-4" />
                添加学生
              </Button>
            </>
          }
        />
        <CourseTabs courseId={courseId} active="students" />

        {students.length > 0 && (
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索学号或姓名"
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}

        <Card className="gap-0 overflow-hidden py-0">
          {loadState === "loading" ? (
            <CardContent className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded-lg" />
              ))}
            </CardContent>
          ) : loadState === "error" ? (
            <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
              <p className="text-sm text-muted-foreground">{loadError}</p>
              <Button variant="outline" onClick={reload}>
                <RefreshCw className="mr-2 h-4 w-4" />
                重新加载
              </Button>
            </CardContent>
          ) : filtered.length === 0 ? (
            <CardContent className="flex flex-col items-center gap-4 py-14">
              {search ? (
                <Users className="h-7 w-7 text-muted-foreground/70" />
              ) : (
                <RosterIllustration />
              )}
              <div className="text-center">
                <p className="font-medium">{search ? "没有找到匹配的学生" : "还没有添加学生"}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {search ? "换个关键词试试" : "从 Excel 复制两列粘贴进来，几秒导入整个班级"}
                </p>
              </div>
              {!search && (
                <div className="flex flex-wrap justify-center gap-2">
                  <Button onClick={() => setImportOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    批量导入
                  </Button>
                  <Button variant="outline" onClick={openAdd}>
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
                          onClick={() => handleDelete(student)}
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


        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
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
                    
                    maxLength={50}
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button type="button" variant="outline"  onClick={() => setDialogOpen(false)}>
                  {editingStudent ? "取消" : "完成"}
                </Button>
                <Button type="submit"  disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingStudent ? "保存" : "添加"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Import Dialog */}
        <Dialog open={importOpen} onOpenChange={closeImport}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>导入学生</DialogTitle>
              <DialogDescription>
                {importMode === "file" ? "上传 Excel，表格需包含「学号」和「姓名」两列" : "从微信、Word 或网页复制名单，每行一位同学"}
              </DialogDescription>
            </DialogHeader>

            {importResult ? (
              <div className="space-y-3 py-2">
                <StatStrip
                  className="sm:grid-cols-3"
                  items={[
                    { label: "成功导入", value: importResult.imported, tone: "green" },
                    { label: "已存在跳过", value: importResult.skipped },
                    { label: "格式有误", value: importResult.errors.length, tone: importResult.errors.length > 0 ? "red" : "default" },
                  ]}
                />
                {importResult.errors.length > 0 && (
                  <ul className="max-h-32 space-y-1 overflow-y-auto rounded-md bg-muted p-3 text-xs text-muted-foreground">
                    {importResult.errors.map((err) => (
                      <li key={err.row}>
                        第 {err.row} 行 {err.studentId}：{err.reason}
                      </li>
                    ))}
                  </ul>
                )}
                <DialogFooter>
                  <Button className="w-full sm:w-auto" onClick={() => closeImport(false)}>
                    完成
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 rounded-md bg-secondary p-0.5 text-sm" role="tablist" aria-label="导入方式">
                  {(
                    [
                      ["file", "上传 Excel"],
                      ["paste", "粘贴名单"],
                    ] as const
                  ).map(([mode, label]) => (
                    <button
                      key={mode}
                      role="tab"
                      aria-selected={importMode === mode}
                      onClick={() => setImportMode(mode)}
                      className={cn(
                        "h-8 rounded-[5px] transition-colors",
                        importMode === mode ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {importMode === "file" ? (
                <div className="space-y-4 py-2">
                  <label
                    htmlFor="import-file"
                    className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-input p-6 text-center transition-colors hover:border-primary/50 hover:bg-muted/40"
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
                ) : (
                  <div className="space-y-3 py-2">
                    <Textarea
                      aria-label="粘贴名单"
                      value={pasteText}
                      onChange={(e) => setPasteText(e.target.value)}
                      placeholder={"2024001 张三\n2024002 李四\n2024003 王五"}
                      className="min-h-36 font-mono text-sm"
                      autoFocus
                    />
                    {pasteText.trim() ? (
                      <div className="rounded-md border border-border">
                        <p className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
                          识别到 <span className="font-medium text-foreground">{pasted.rows.length}</span> 位同学
                          {pasted.invalid.length > 0 && (
                            <span className="text-tone-orange">，{pasted.invalid.length} 行无法识别（需同时包含学号和姓名）</span>
                          )}
                        </p>
                        <ul className="max-h-40 divide-y divide-border overflow-y-auto text-sm">
                          {pasted.rows.slice(0, 50).map((r, i) => (
                            <li key={i} className="flex gap-3 px-3 py-1.5">
                              <span className="num w-28 shrink-0 text-muted-foreground">{r.studentId}</span>
                              <span>{r.name}</span>
                            </li>
                          ))}
                          {pasted.invalid.slice(0, 5).map((x) => (
                            <li key={`x${x.line}`} className="px-3 py-1.5 text-tone-orange">
                              第 {x.line} 行：{x.text}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        支持「学号 姓名」或「姓名 学号」，Tab、空格、逗号分隔均可；表头和序号会自动忽略。
                      </p>
                    )}
                  </div>
                )}
                <DialogFooter>
                  <Button variant="outline" onClick={() => closeImport(false)}>
                    取消
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={importing || (importMode === "file" ? !importFile : pasted.rows.length === 0)}
                  >
                    {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {importMode === "paste" && pasted.rows.length > 0 ? `导入 ${pasted.rows.length} 人` : "开始导入"}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
    </>
  );
}
