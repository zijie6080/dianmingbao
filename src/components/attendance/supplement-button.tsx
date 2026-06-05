"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  courseId: string;
  sessionId: string;
  studentId: string;
  studentName: string;
}

export function SupplementButton({ courseId, sessionId, studentId, studentName }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSupplement() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/courses/${courseId}/attendance/${sessionId}/supplement`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId }),
        }
      );
      const data = await res.json();
      if (data.success) {
        toast.success(`${studentName} 已补签（迟到）`);
        router.refresh();
      } else {
        toast.error(data.error || "补签失败");
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 rounded-lg text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50 ml-auto"
      onClick={handleSupplement}
      disabled={loading}
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "补签"}
    </Button>
  );
}
