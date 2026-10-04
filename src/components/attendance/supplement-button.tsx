"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetchJson } from "@/lib/client";

interface Props {
  courseId: string;
  sessionId: string;
  studentId: string;
  studentName: string;
}

/** 手动补签（记为迟到）或标记请假/公假 */
export function SupplementButton({
  courseId,
  sessionId,
  studentId,
  studentName,
  type = "late",
}: Props & { type?: "late" | "leave" }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSupplement() {
    if (loading) return;
    setLoading(true);
    const res = await fetchJson(`/api/courses/${courseId}/attendance/${sessionId}/supplement`, {
      method: "POST",
      json: { studentId, type },
    });
    setLoading(false);
    if (res.ok) {
      toast.success(type === "leave" ? `${studentName} 已标记请假` : `${studentName} 已补签（记为迟到）`);
    } else {
      toast.error(res.error || "操作失败");
    }
    router.refresh();
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`h-7 rounded-lg px-2 text-xs ${
        type === "leave"
          ? "text-sky-700 hover:bg-sky-50 hover:text-sky-800"
          : "text-orange-600 hover:bg-orange-50 hover:text-orange-700"
      }`}
      onClick={handleSupplement}
      disabled={loading}
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : type === "leave" ? "请假" : "补签"}
    </Button>
  );
}

/** 撤销签到或请假（补签点错 / 发现代签） */
export function UndoCheckInButton({
  courseId,
  sessionId,
  studentId,
  studentName,
  what = "签到",
}: Props & { what?: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleUndo() {
    if (loading) return;
    if (!window.confirm(`确定撤销「${studentName}」的${what}吗？撤销后记为未签到。`)) return;
    setLoading(true);
    const res = await fetchJson(`/api/courses/${courseId}/attendance/${sessionId}/supplement`, {
      method: "DELETE",
      json: { studentId },
    });
    setLoading(false);
    if (res.ok) {
      toast.success(`已撤销 ${studentName} 的${what}`);
    } else {
      toast.error(res.error || "撤销失败");
    }
    router.refresh();
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 rounded-lg px-2 text-xs text-muted-foreground hover:text-destructive"
      onClick={handleUndo}
      disabled={loading}
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "撤销"}
    </Button>
  );
}
