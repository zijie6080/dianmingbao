"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Loader2, Pencil, Trash2, KeyRound, Ban, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { fetchJson } from "@/lib/client";
import { formatShortDate } from "@/lib/format";

interface Teacher {
  id: string; name: string; email: string; role: string; status: string;
  courseCount: number; createdAt: string;
}

export default function AdminTeachers() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);

  const [pwTarget, setPwTarget] = useState<Teacher | null>(null);
  const [newPw, setNewPw] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Teacher | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // 输入停顿 300ms 后再搜索
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      const res = await fetchJson<Teacher[]>(`/api/admin/teachers?${params}`);
      if (cancelled) return;
      if (res.ok && res.data) setTeachers(res.data);
      else toast.error(res.error || "加载失败");
      setLoading(false);
    }, search ? 300 : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!form.name.trim() || !form.email.trim() || (!editing && form.password.length < 6)) {
      toast.error(editing ? "请填写姓名和邮箱" : "请填写完整，密码至少6位");
      return;
    }
    setSubmitting(true);
    const res = editing
      ? await fetchJson(`/api/admin/teachers/${editing.id}`, { method: "PUT", json: { name: form.name, email: form.email } })
      : await fetchJson("/api/admin/teachers", { method: "POST", json: form });
    setSubmitting(false);
    if (res.ok) {
      toast.success(editing ? "已更新" : "已创建");
      setDialogOpen(false);
      reload();
    } else {
      toast.error(res.error || "操作失败");
    }
  }

  async function toggleStatus(teacher: Teacher) {
    if (busyId) return;
    setBusyId(teacher.id);
    const next = teacher.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    const res = await fetchJson(`/api/admin/teachers/${teacher.id}`, { method: "PUT", json: { status: next } });
    setBusyId(null);
    if (res.ok) {
      toast.success(next === "DISABLED" ? `已禁用 ${teacher.name}` : `已启用 ${teacher.name}`);
      reload();
    } else {
      toast.error(res.error || "操作失败");
    }
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!pwTarget) return;
    if (newPw.length < 6) { toast.error("密码至少6位"); return; }
    const res = await fetchJson(`/api/admin/teachers/${pwTarget.id}`, { method: "PATCH", json: { password: newPw } });
    if (res.ok) { toast.success("密码已重置"); setPwTarget(null); setNewPw(""); }
    else toast.error(res.error || "重置失败");
  }

  async function deleteTeacher() {
    if (!deleteTarget) return;
    const res = await fetchJson(`/api/admin/teachers/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("已删除"); setDeleteTarget(null); reload(); }
    else toast.error(res.error || "删除失败");
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">教师管理</h1>
          <p className="text-muted-foreground">管理所有教师账号</p>
        </div>
        <Button className="gap-1" onClick={() => { setEditing(null); setForm({ name: "", email: "", password: "" }); setDialogOpen(true); }}>
          <Plus className="h-4 w-4" />创建教师
        </Button>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="搜索姓名或邮箱" className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <CardContent className="py-16 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></CardContent>
        ) : teachers.length === 0 ? (
          <CardContent className="py-16 text-center text-muted-foreground">{search ? "没有匹配的教师" : "暂无教师"}</CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>姓名</TableHead>
                <TableHead className="hidden md:table-cell">邮箱</TableHead>
                <TableHead>课程</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="hidden md:table-cell">注册时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teachers.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground md:hidden">{t.email}</div>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{t.email}</TableCell>
                  <TableCell>{t.courseCount}</TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${t.status === "ACTIVE" ? "bg-[var(--tag-green-bg)] text-[var(--tag-green-fg)]" : "bg-[var(--tag-red-bg)] text-[var(--tag-red-fg)]"}`}>
                      {t.status === "ACTIVE" ? "正常" : "禁用"}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground md:table-cell">{formatShortDate(t.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-8 rounded-lg" title="编辑" onClick={() => { setEditing(t); setForm({ name: t.name, email: t.email, password: "" }); setDialogOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 rounded-lg" title="重置密码" onClick={() => { setPwTarget(t); setNewPw(""); }}>
                        <KeyRound className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 rounded-lg" title={t.status === "ACTIVE" ? "禁用" : "启用"} disabled={busyId === t.id} onClick={() => toggleStatus(t)}>
                        {t.status === "ACTIVE" ? <Ban className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 rounded-lg text-destructive" title="删除" onClick={() => setDeleteTarget(t)}>
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent >
          <AlertDialogHeader>
            <AlertDialogTitle>删除教师</AlertDialogTitle>
            <AlertDialogDescription>
              将永久删除「{deleteTarget?.name}」及其全部课程、学生和签到数据，不可恢复。若只是暂停使用，建议改为「禁用」。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel >取消</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={deleteTeacher}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editing ? "编辑教师" : "创建教师"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-2">
              <div className="space-y-2"><Label htmlFor="t-name">姓名</Label><Input id="t-name"  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="t-email">邮箱</Label><Input id="t-email"  type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              {!editing && <div className="space-y-2"><Label htmlFor="t-pw">初始密码</Label><Input id="t-pw"  type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="至少6位" /></div>}
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline"  onClick={() => setDialogOpen(false)}>取消</Button>
              <Button type="submit"  disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editing ? "保存" : "创建"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pwTarget} onOpenChange={(v) => !v && setPwTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>重置「{pwTarget?.name}」的密码</DialogTitle></DialogHeader>
          <form onSubmit={resetPassword}>
            <div className="space-y-2 py-2"><Label htmlFor="new-pw">新密码</Label><Input id="new-pw"  type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="至少6位" /></div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline"  onClick={() => setPwTarget(null)}>取消</Button>
              <Button type="submit" >确认</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
