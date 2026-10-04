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
  const router = useRouter();

  async function handleGrade(e?: React.FormEvent) {
    e?.preventDefault();
    if (loading) return;
    const scoreNum = Number(score);
    if (score.trim() === "" || !Number.isInteger(scoreNum) || scoreNum < 0 || scoreNum > 100) {
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
        // 只刷新服务端数据，不整页重载
        router.refresh();
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
        {currentScore !== null ? (
          <button className="num tag tag-green h-6 px-2 hover:opacity-80" title="修改分数">
            {currentScore} 分
          </button>
        ) : (
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
            <Pencil className="h-3 w-3" />
            评分
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>为 {studentName} 打分</DialogTitle>
          <DialogDescription>输入 0-100 的分数</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleGrade}>
          <div className="space-y-3 py-2">
            <Label htmlFor="score">分数</Label>
            <Input
              id="score"
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              placeholder="0-100"
              className="py-6 text-center text-lg"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              autoFocus
            />
            <div className="grid grid-cols-5 gap-2">
              {[0, 60, 80, 90, 100].map((v) => (
                <Button
                  key={v}
                  type="button"
                  variant={score === String(v) ? "secondary" : "outline"}
                  size="sm"
                  className="rounded-lg"
                  onClick={() => setScore(String(v))}
                >
                  {v}
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline"  onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button type="submit"  disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              确认打分
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
