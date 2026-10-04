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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

/** 根据当前日期生成学期选项：上一学期、本学期、之后两个学期 */
function buildSemesters(now = new Date()): { options: string[]; current: string } {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  // 2-7 月为春季学期，8-12 月为秋季学期，1 月仍属上一年秋季
  const currentYear = month === 1 ? year - 1 : year;
  const currentIsSpring = month >= 2 && month <= 7;
  const list: string[] = [];
  let y = currentYear;
  let spring = currentIsSpring;
  // 从上一学期开始
  if (spring) { y -= 1; spring = false; } else { spring = true; }
  for (let i = 0; i < 4; i++) {
    list.push(`${y}${spring ? "春季" : "秋季"}`);
    if (spring) { spring = false; } else { spring = true; y += 1; }
  }
  return { options: list, current: `${currentYear}${currentIsSpring ? "春季" : "秋季"}` };
}

/** 新建课程。variant：button 主按钮 / icon 侧边栏小加号 / sidebar 侧边栏文字入口 */
export function CreateCourseDialog({ variant = "button" }: { variant?: "button" | "icon" | "sidebar" }) {
  const [{ options: semesters, current }] = useState(() => buildSemesters());
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [semester, setSemester] = useState(current);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (!name.trim() || !semester) {
      toast.error("请填写课程名称和学期");
      return;
    }
    setLoading(true);

    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), semester }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("课程创建成功，下一步：添加学生名单");
        setOpen(false);
        setName("");
        router.push(`/courses/${data.data.id}/students`);
      } else {
        toast.error(data.error || "创建失败");
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === "icon" ? (
          <button
            aria-label="新建课程"
            title="新建课程"
            className="rounded p-1 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        ) : variant === "sidebar" ? (
          <button className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-sm text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground">
            <Plus className="h-4 w-4" />
            新建第一门课程
          </button>
        ) : (
          <Button className="gap-1.5">
            <Plus className="h-4 w-4" />
            新建课程
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>新建课程</DialogTitle>
          <DialogDescription>创建后下一步导入学生名单</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="courseName">课程名称</Label>
              <Input
                id="courseName"
                placeholder="例如：高等数学"
                
                value={name}
                maxLength={50}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="semester">学期</Label>
              <Select value={semester} onValueChange={(value) => setSemester(value || "")}>
                <SelectTrigger id="semester" >
                  <SelectValue placeholder="选择学期" />
                </SelectTrigger>
                <SelectContent>
                  {semesters.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline"  onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button type="submit"  disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              创建
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
