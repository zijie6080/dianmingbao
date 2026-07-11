"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

interface Props {
  courseId: string;
  sessionId: string;
  submissionId: string;
  studentName: string;
  currentScore: number | null;
}

export function GradeDialog({ courseId, sessionId, submissionId, studentName, currentScore }: Props) {
  const [open, setOpen] = useState(false);
  const [score, setScore] = useState(currentScore?.toString() || "");
  const [loading, setLoading] = useState(false);

  async function handleGrade() {
    const scoreNum = parseInt(score);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      toast.error("请输入 0-100 的分数");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/courses/${courseId}/quiz/${sessionId}/score`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ submissionId, score: scoreNum }),
        }
      );
      const data = await res.json();
      if (data.success) {
        toast.success(`${studentName} 得分：${scoreNum} 分`);
        setOpen(false);
        // 刷新页面
        window.location.reload();
      } else {
        toast.error(data.error || "打分失败");
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
        <Button variant="ghost" size="sm" className="h-7 rounded-lg text-xs text-primary hover:text-primary hover:bg-blue-50">
          <Pencil className="h-3 w-3 mr-1" />
          {currentScore !== null ? `${currentScore}分` : "打分"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle>为 {studentName} 打分</DialogTitle>
          <DialogDescription>输入 0-100 的分数</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="score">分数</Label>
            <Input
              id="score"
              type="number"
              min={0}
              max={100}
              placeholder="0-100"
              className="rounded-xl text-lg py-6 text-center"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button className="rounded-xl" onClick={handleGrade} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            确认打分
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
