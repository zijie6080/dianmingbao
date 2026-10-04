import { cn } from "@/lib/utils";

export interface TrendPoint {
  /** x 轴标签，如 10/4 */
  label: string;
  /** 0–100 */
  value: number;
  /** 悬停提示第二行，如「9/12 人签到」 */
  detail?: string;
}

/**
 * 出勤率趋势柱状图（单序列，单一色相）。
 * 规范：柱宽 ≤24px、顶部 4px 圆角、柱间 2px 留白、发丝级网格线、稀疏标签、
 * 悬停 / 键盘聚焦显示提示；每根柱子带 aria-label，下方签到列表即表格视图。
 */
export function TrendColumns({
  points,
  height = 160,
  className,
}: {
  points: TrendPoint[];
  height?: number;
  className?: string;
}) {
  const showEvery = points.length <= 8 ? 1 : Math.ceil(points.length / 6);
  return (
    <div className={cn("flex gap-3", className)}>
      {/* y 轴刻度 */}
      <div className="num relative w-8 shrink-0 text-right text-[11px] text-muted-foreground" style={{ height }}>
        {[100, 50, 0].map((v) => (
          <span key={v} className="absolute right-0 -translate-y-1/2" style={{ top: `${100 - v}%` }}>
            {v}%
          </span>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div className="relative" style={{ height }}>
          {[0, 50, 100].map((v) => (
            <div key={v} className="absolute inset-x-0 h-px bg-border" style={{ top: `${100 - v}%` }} aria-hidden />
          ))}
          <div className="absolute inset-0 flex items-end gap-[2px]" role="list" aria-label="出勤率趋势">
            {points.map((p, i) => (
              <div key={i} role="listitem" className="group relative flex h-full flex-1 items-end justify-center">
                <div
                  tabIndex={0}
                  aria-label={`${p.label}：出勤率 ${p.value.toFixed(0)}%${p.detail ? `，${p.detail}` : ""}`}
                  className="w-full max-w-6 rounded-t-[4px] bg-primary/85 outline-none transition-colors group-hover:bg-primary focus-visible:bg-primary focus-visible:ring-2 focus-visible:ring-ring/30"
                  style={{ height: `${Math.max(p.value, 1.5)}%` }}
                />
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-[#2F2E2B] px-2.5 py-1.5 text-xs text-white shadow-lg group-hover:block group-focus-within:block">
                  <p className="font-medium">
                    {p.label} · <span className="num">{p.value.toFixed(0)}%</span>
                  </p>
                  {p.detail && <p className="text-white/70">{p.detail}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="num mt-1.5 flex gap-[2px] text-[11px] text-muted-foreground" aria-hidden>
          {points.map((p, i) => (
            <span key={i} className="flex-1 truncate text-center">
              {i % showEvery === 0 || i === points.length - 1 ? p.label : ""}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** 迷你趋势柱：历史用浅色，最近一次用强调色（统计卡片的 sparkline 规范） */
export function MiniBars({
  values,
  height = 28,
  className,
  label,
}: {
  values: number[];
  height?: number;
  className?: string;
  label?: string;
}) {
  if (values.length === 0) return null;
  return (
    <div
      className={cn("flex items-end gap-[2px]", className)}
      style={{ height }}
      role="img"
      aria-label={label ?? `最近 ${values.length} 次出勤率：${values.map((v) => `${v.toFixed(0)}%`).join("、")}`}
    >
      {values.map((v, i) => (
        <span
          key={i}
          className={cn("w-[5px] rounded-t-[2px]", i === values.length - 1 ? "bg-primary" : "bg-[#C7D6EF]")}
          style={{ height: `${Math.max(v, 4)}%` }}
        />
      ))}
    </div>
  );
}

/** 进度条：填充色表达状态（达标 / 关注 / 偏低），轨道为同色系浅色 */
export function RateMeter({ rate, className }: { rate: number; className?: string }) {
  const fill = rate >= 80 ? "var(--tone-green)" : rate >= 60 ? "var(--tone-orange)" : "var(--tone-red)";
  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-secondary", className)} aria-hidden>
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, rate))}%`, background: fill }} />
    </div>
  );
}
