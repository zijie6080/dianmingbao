"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Loader2, Pencil, Trash2, KeyRound, Ban } from "lucide-react";
import { toast } from "sonner";

interface Teacher {
  id: string; name: string; email: string; role: string; status: string;
  courseCount: number; createdAt: string;
}

export default function AdminTeachers() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);

  // Reset password
  const [pwOpen, setPwOpen] = useState(false);
  const [pwId, setPwId] = useState("");
  const [newPw, setNewPw] = useState("");

  const fetchTeachers = useCallback(async () => {
    const params = new URLSearchParams(); if (search) params.set("search", search);
    const res = await fetch(`/api/admin/teachers?${params}`);
    const d = await res.json();
    if (d.success) setTeachers(d.data);
    setLoading(false);
  }, [search]);

  useEffect(() => { fetchTeachers(); }, [fetchTeachers]);

  async function handleSubmit() {
    if (!form.name || !form.email || (!editing && !form.password)) { toast.error("请填写完整"); return; }
    setSubmitting(true);
    const url = editing ? `/api/admin/teachers/${editing.id}` : "/api/admin/teachers";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const d = await res.json();
    if (d.success) { toast.success(editing ? "已更新" : "已创建"); setDialogOpen(false); fetchTeachers(); }
    else toast.error(d.error);
    setSubmitting(false);
  }

  async function toggleStatus(teacher: Teacher) {
    const res = await fetch(`/api/admin/teachers/${teacher.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: teacher.status === "ACTIVE" ? "DISABLED" : "ACTIVE" }),
    });
    const d = await res.json();
    if (d.success) { toast.success(`已${teacher.status === "ACTIVE" ? "禁用" : "启用"}`); fetchTeachers(); }
  }

  async function resetPassword() {
    if (newPw.length < 6) { toast.error("密码至少6位"); return; }
    const res = await fetch(`/api/admin/teachers/${pwId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: newPw }) });
    const d = await res.json();
    if (d.success) { toast.success("密码已重置"); setPwOpen(false); setNewPw(""); }
    else toast.error(d.error);
  }

  async function deleteTeacher(id: string) {
    await fetch(`/api/admin/teachers/${id}`, { method: "DELETE" });
    toast.success("已删除"); fetchTeachers();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold">教师管理</h1><p className="text-muted-foreground">管理所有教师账号</p></div>
        <Button className="rounded-xl gap-1" onClick={() => { setEditing(null); setForm({ name: "", email: "", password: "" }); setDialogOpen(true); }}>
          <Plus className="h-4 w-4" />创建教师
        </Button>
      </div>

      <div className="mb-4 max-w-sm">
        <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="搜索姓名或邮箱..." className="pl-10 rounded-xl" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card className="rounded-2xl border-0 shadow-sm">
        {loading ? <CardContent className="py-16 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></CardContent> : teachers.length === 0 ? (
          <CardContent className="py-16 text-center text-muted-foreground">暂无教师</CardContent>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>姓名</TableHead><TableHead>邮箱</TableHead><TableHead>课程数</TableHead><TableHead>状态</TableHead><TableHead>注册时间</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
            <TableBody>
              {teachers.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="text-muted-foreground">{t.email}</TableCell>
                  <TableCell>{t.courseCount}</TableCell>
                  <TableCell><Badge className={`rounded-lg text-xs ${t.status === "ACTIVE" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{t.status === "ACTIVE" ? "正常" : "禁用"}</Badge></TableCell>
                  <TableCell className="text-muted-foreground text-xs">{new Date(t.createdAt).toLocaleDateString("zh-CN")}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-8 rounded-lg" onClick={() => { setEditing(t); setForm({ name: t.name, email: t.email, password: "" }); setDialogOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="sm" className="h-8 rounded-lg" onClick={() => { setPwId(t.id); setNewPw(""); setPwOpen(true); }}><KeyRound className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="sm" className="h-8 rounded-lg" onClick={() => toggleStatus(t)}><Ban className="h-3.5 w-3.5" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="h-8 rounded-lg text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
                        <AlertDialogContent className="rounded-2xl">
                          <AlertDialogHeader><AlertDialogTitle>删除教师</AlertDialogTitle><AlertDialogDescription>将永久删除「{t.name}」及其所有数据。</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel className="rounded-xl">取消</AlertDialogCancel><AlertDialogAction className="rounded-xl bg-destructive" onClick={() => deleteTeacher(t.id)}>删除</AlertDialogAction></AlertDialogFooter>
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader><DialogTitle>{editing ? "编辑教师" : "创建教师"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2"><Label>姓名</Label><Input className="rounded-xl" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>邮箱</Label><Input className="rounded-xl" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            {!editing && <div className="space-y-2"><Label>密码</Label><Input className="rounded-xl" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="至少6位" /></div>}
          </div>
          <DialogFooter><Button variant="outline" className="rounded-xl" onClick={() => setDialogOpen(false)}>取消</Button><Button className="rounded-xl" onClick={handleSubmit} disabled={submitting}>{editing ? "保存" : "创建"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle>重置密码</DialogTitle></DialogHeader>
          <div className="space-y-2 py-4"><Label>新密码</Label><Input className="rounded-xl" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="至少6位" /></div>
          <DialogFooter><Button variant="outline" className="rounded-xl" onClick={() => setPwOpen(false)}>取消</Button><Button className="rounded-xl" onClick={resetPassword}>确认</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
