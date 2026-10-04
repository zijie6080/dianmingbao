import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** 品牌标识：方形「点」字，替代通用的学士帽图标 */
export function BrandMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center rounded-[6px] bg-primary font-semibold text-white", className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.58), lineHeight: 1 }}
    >
      点
    </span>
  );
}

export function Brand({ size = 24, href = "/" }: { size?: number; href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 font-semibold tracking-tight text-foreground">
      <BrandMark size={size} />
      <span style={{ fontSize: Math.round(size * 0.66) }}>点名宝</span>
    </Link>
  );
}

export interface Crumb {
  href?: string;
  label: string;
}

/** 页面标题区：面包屑 + 标题 + 描述 + 右侧操作 */
export function PageHeader({
  crumbs,
  cover,
  icon,
  title,
  description,
  meta,
  actions,
}: {
  crumbs?: Crumb[];
  /** Notion 式封面（标题上方） */
  cover?: ReactNode;
  /** 标题上方的大图标，带封面时会压在封面下沿 */
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6">
      {crumbs && crumbs.length > 0 && (
        <nav aria-label="面包屑" className="mb-3 flex flex-wrap items-center gap-1 text-[13px] text-muted-foreground">
          {crumbs.map((c, i) => (
            <span key={i} className="inline-flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
              {c.href ? (
                <Link href={c.href} className="rounded px-1 py-0.5 hover:bg-secondary hover:text-foreground">
                  {c.label}
                </Link>
              ) : (
                <span className="px-1 text-foreground">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      {cover}
      {icon && <div className={cn("relative mb-3", cover ? "-mt-8 ml-4" : "")}>{icon}</div>}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {meta && <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">{meta}</div>}
          {description && <p className="mt-1.5 text-[13px] text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export interface StatItem {
  label: string;
  value: ReactNode;
  /** 紧跟数字的单位，如「次」「人」 */
  unit?: string;
  hint?: ReactNode;
  tone?: "default" | "green" | "red" | "orange";
}

const toneClass = {
  default: "text-foreground",
  green: "text-tone-green",
  red: "text-tone-red",
  orange: "text-tone-orange",
} as const;

/** 一排安静的统计数字（带分隔线），不用彩色图标卡片 */
export function StatStrip({ items, className }: { items: StatItem[]; className?: string }) {
  const cols = items.length >= 5 ? "sm:grid-cols-5" : items.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-4";
  return (
    <dl
      className={cn(
        "grid grid-cols-2 overflow-hidden rounded-lg border border-border bg-background",
        cols,
        "[&>div]:border-border max-sm:[&>div:nth-child(odd)]:border-r max-sm:[&>div:nth-child(n+3)]:border-t sm:[&>div:not(:first-child)]:border-l",
        className
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="px-4 py-3.5">
          <dt className="text-[13px] text-muted-foreground">{item.label}</dt>
          <dd className={cn("num mt-1 text-[22px] font-semibold leading-tight", toneClass[item.tone ?? "default"])}>
            {item.value}
            {item.unit && <span className="ml-1 text-[13px] font-normal text-muted-foreground">{item.unit}</span>}
          </dd>
          {item.hint && <dd className="mt-0.5 text-xs text-muted-foreground">{item.hint}</dd>}
        </div>
      ))}
    </dl>
  );
}

/** 内容分组：小标题 + 可选操作 */
export function Section({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mt-8", className)}>
      {(title || action) && (
        <div className="mb-2.5 flex items-end justify-between gap-3">
          <div>
            {title && <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>}
            {description && <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** 带细边框的列表容器 */
export function ListBox({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("divide-y divide-border overflow-hidden rounded-lg border border-border bg-background", className)}>{children}</div>;
}

/** 空状态：文字为主，克制的图标 */
export function EmptyState({
  icon,
  illustration,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  /** 插画（优先于 icon） */
  illustration?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center rounded-lg border border-dashed border-border px-6 py-12 text-center", className)}>
      {illustration ? (
        <div className="mb-4">{illustration}</div>
      ) : (
        icon && <div className="mb-3 text-muted-foreground/70 [&_svg]:h-6 [&_svg]:w-6">{icon}</div>
      )}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">{description}</p>}
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

/** 出勤率文字颜色：≥80 绿、≥60 橙、其余红 */
export function rateTone(rate: number): "green" | "orange" | "red" {
  if (rate >= 80) return "green";
  if (rate >= 60) return "orange";
  return "red";
}

export function RateText({ rate, empty = false }: { rate: number; empty?: boolean }) {
  if (empty) return <span className="num text-muted-foreground">—</span>;
  return <span className={cn("num font-medium", toneClass[rateTone(rate)])}>{rate.toFixed(0)}%</span>;
}
