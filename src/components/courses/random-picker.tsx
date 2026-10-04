"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { prefersReducedMotion } from "@/lib/chime";
import { cn } from "@/lib/utils";

export interface PickerStudent {
  id: string;
  studentId: string;
  name: string;
}

type Pool = "all" | "present";

/**
 * 随机点名：名字像老虎机一样滚动、逐渐变慢后停下。
 * 默认不重复抽取，抽过的人列在下面，可一键重置。
 */
export function RandomPickerDialog({
  students,
  presentIds,
  presentLabel,
}: {
  students: PickerStudent[];
  /** 最近一次签到到场（含迟到）的学生 id；没有签到记录时为 null */
  presentIds: string[] | null;
  /** 例如「10月4日签到到场」 */
  presentLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pool, setPool] = useState<Pool>(presentIds && presentIds.length > 0 ? "present" : "all");
  const [picked, setPicked] = useState<PickerStudent[]>([]);
  const [current, setCurrent] = useState<PickerStudent | null>(null);
  const [rolling, setRolling] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const presentSet = new Set(presentIds ?? []);
  const poolStudents = pool === "present" ? students.filter((s) => presentSet.has(s.id)) : students;
  const pickedSet = new Set(picked.map((s) => s.id));
  const candidates = poolStudents.filter((s) => !pickedSet.has(s.id));

  function stop() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setRolling(false);
  }

  function reset() {
    stop();
    setPicked([]);
    setCurrent(null);
  }

  function switchPool(next: Pool) {
    if (next === pool) return;
    reset();
    setPool(next);
  }

  function draw() {
    if (rolling || candidates.length === 0) return;
    const winner = candidates[Math.floor(Math.random() * candidates.length)];
    const finish = () => {
      timer.current = null;
      setCurrent(winner);
      setPicked((p) => [...p, winner]);
      setRolling(false);
    };

    // 人太少或用户偏好减少动态效果时，直接出结果
    if (poolStudents.length < 2 || prefersReducedMotion()) {
      finish();
      return;
    }

    setRolling(true);
    const steps = 22;
    let i = 0;
    const tick = () => {
      i += 1;
      if (i >= steps) {
        finish();
        return;
      }
      // 滚动时从整个名单里取名字，看起来更热闹；与上一个不同，避免「卡住」的错觉
      setCurrent((prev) => {
        let next = poolStudents[Math.floor(Math.random() * poolStudents.length)];
        if (next.id === prev?.id) next = poolStudents[(poolStudents.indexOf(next) + 1) % poolStudents.length];
        return next;
      });
      // 先快后慢（ease-out）：40ms → 约 320ms
      const t = i / steps;
      timer.current = setTimeout(tick, 40 + 280 * t * t * t);
    };
    tick();
  }

  const done = current && !rolling;
  const exhausted = candidates.length === 0 && poolStudents.length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) stop();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-1.5" disabled={students.length === 0}>
          <Shuffle className="h-4 w-4" />
          随机点名
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>随机点名</DialogTitle>
          <DialogDescription>抽过的同学本轮不会重复，点「重新开始」清空。</DialogDescription>
        </DialogHeader>

        {presentIds && (
          <div className="inline-flex self-start rounded-md bg-muted p-0.5 text-[13px]">
            {(
              [
                ["present", `${presentLabel ?? "最近一次签到到场"} · ${presentIds.length}`],
                ["all", `全班 · ${students.length}`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => switchPool(key)}
                className={cn(
                  "rounded px-2.5 py-1 transition-colors",
                  pool === key ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div
          className={cn(
            "relative flex h-40 flex-col items-center justify-center overflow-hidden rounded-xl border transition-colors duration-300",
            done ? "border-[var(--brand)] bg-[var(--brand-soft)]" : "border-border bg-muted/40"
          )}
          aria-live="polite"
        >
          {current ? (
            <div key={done ? `done-${current.id}` : undefined} className={cn(done && "animate-in zoom-in-90 fade-in duration-300")}>
              <p
                className={cn(
                  "text-center text-5xl font-semibold tracking-wide",
                  done ? "text-[var(--brand-ink)]" : "text-foreground/70"
                )}
              >
                {current.name}
              </p>
              <p className="num mt-2 text-center text-sm text-muted-foreground">{current.studentId}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {poolStudents.length === 0 ? "这个范围里没有学生" : `共 ${poolStudents.length} 人，点下面的按钮开始`}
            </p>
          )}
        </div>

        <Button size="lg" className="w-full gap-1.5" onClick={draw} disabled={rolling || candidates.length === 0}>
          <Shuffle className="h-4 w-4" />
          {exhausted ? "所有人都抽过了" : picked.length === 0 ? "抽一个" : "再抽一个"}
        </Button>

        {picked.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                已抽 {picked.length} 人{candidates.length > 0 && ` · 剩余 ${candidates.length} 人`}
              </span>
              <button type="button" onClick={reset} className="inline-flex items-center gap-1 hover:text-foreground">
                <RotateCcw className="h-3 w-3" />
                重新开始
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {picked.map((s, i) => (
                <span key={s.id} className="tag tag-gray animate-in fade-in zoom-in-90 duration-200">
                  <span className="num opacity-60">{i + 1}</span>
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
