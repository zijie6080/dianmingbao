"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Settings, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  courseId: string;
  courseName: string;
  courseSemester: string;
}

export function EditCourseDialog({ courseId, courseName, courseSemester }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(courseName);
  const [semester, setSemester] = useState(courseSemester);
  const [loading, setLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, semester }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("课程已更新");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(data.error || "更新失败");
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/courses/${courseId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("课程已删除");
        router.push("/courses");
        router.refresh();
      } else {
        toast.error(data.error || "删除失败");
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  return (
    <>
      {/* Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-1.5">
            <Settings className="h-4 w-4" />
            设置
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>课程设置</DialogTitle>
            <DialogDescription>修改课程信息</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editName">课程名称</Label>
                <Input
                  id="editName"
                  
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editSemester">学期</Label>
                <Input
                  id="editSemester"
                  
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter className="flex justify-between">
              <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" className="gap-1.5">
                    <Trash2 className="h-4 w-4" />
                    删除课程
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent >
                  <AlertDialogHeader>
                    <AlertDialogTitle>确认删除？</AlertDialogTitle>
                    <AlertDialogDescription>
                      将永久删除「{courseName}」及其所有学生和签到数据。此操作不可撤销。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel >取消</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-white hover:bg-destructive/90"
                      onClick={handleDelete}
                      disabled={deleting}
                    >
                      {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      确认删除
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <div className="flex gap-2">
                <Button type="button" variant="outline"  onClick={() => setOpen(false)}>
                  取消
                </Button>
                <Button type="submit"  disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  保存
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
