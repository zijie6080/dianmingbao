"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchJson } from "@/lib/client";
import { markStudent, type MarkType } from "@/lib/attendance-actions";
import { cn } from "@/lib/utils";

interface Student {
  id: string;
  studentId: string;
  name: string;
}

interface Detail {
  present: Student[];
  leave: Student[];
  absent: Student[];
  totalStudents: number;
}

/**
 * 签到结束后的「点名核对」：大字列出未签到的学生，老师照着念：
 * 人在的点「到了」（记迟到），有假条的点「请假」，没人应的留着就是缺勤。
 */
export function RollCall({
  courseId,
  sessionId,
  onDone,
}: {
  courseId: string;
  sessionId: string;
  onDone: () => void;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  // 本次核对中被处理过的学生：id → 状态（null 表示又撤回了）
  const [marks, setMarks] = useState<Record<string, MarkType | null>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetchJson<Detail>(`/api/courses/${courseId}/attendance/${sessionId}`);
      if (cancelled) return;
      if (res.ok && res.data) setDetail(res.data);
      else setError(res.error || "加载失败");
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId, sessionId]);

  if (!detail) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
        {error ? <p className="text-sm">{error}</p> : <Loader2 className="h-6 w-6 animate-spin" />}
        {error && (
          <Button variant="outline" onClick={onDone}>
            查看详情
          </Button>
        )}
      </div>
    );
  }

  const pending = detail.absent.filter((s) => !marks[s.id]);
  const handled = detail.absent.length - pending.length;
  const late = Object.values(marks).filter((m) => m === "late").length;
  const leave = Object.values(marks).filter((m) => m === "leave").length;
  const present = detail.present.length + late;

  function mark(s: Student, type: MarkType) {
    void markStudent({
      courseId,
      sessionId,
      studentId: s.id,
      name: s.name,
      type,
      onChange: (state) => setMarks((m) => ({ ...m, [s.id]: state })),
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">点名核对</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            照着念名字：人在点「到了」（记迟到），有假条点「请假」，没人应的留着即为缺勤。
          </p>
        </div>
        <p className="num text-sm text-muted-foreground">
          实到 <span className="text-lg font-semibold text-foreground">{present}</span> / {detail.totalStudents - detail.leave.length - leave}
          {leave + detail.leave.length > 0 && ` · 请假 ${leave + detail.leave.length}`}
        </p>
      </div>

      {pending.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-10 text-center animate-in fade-in zoom-in-95 duration-300">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--tag-green-bg)] text-[var(--tag-green-fg)]">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <p className="font-medium">{detail.absent.length === 0 ? "全员到齐" : "核对完成"}</p>
          {handled > 0 && <p className="text-[13px] text-muted-foreground">本次核对补签 {late} 人，请假 {leave} 人</p>}
        </div>
      ) : (
        <>
          <p className="mt-5 text-xs font-medium text-muted-foreground">
            还有 {pending.length} 人未签到{handled > 0 && ` · 已核对 ${handled} 人`}
          </p>
          <ul className="mt-2 grid max-h-[50dvh] gap-2 overflow-y-auto sm:grid-cols-2">
            {pending.map((s) => (
              <li
                key={s.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg border border-border px-3 py-2.5",
                  "animate-in fade-in slide-in-from-bottom-1 duration-200"
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold leading-tight">{s.name}</p>
                  <p className="num text-xs text-muted-foreground">{s.studentId}</p>
                </div>
                <Button size="sm" className="h-8" onClick={() => mark(s, "late")}>
                  到了
                </Button>
                <Button size="sm" variant="outline" className="h-8" onClick={() => mark(s, "leave")}>
                  请假
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}

      <Button className="mt-5 w-full" variant={pending.length === 0 ? "default" : "outline"} onClick={onDone}>
        {pending.length === 0 ? "完成，查看签到详情" : "跳过，其余记为缺勤"}
      </Button>
    </div>
  );
}
