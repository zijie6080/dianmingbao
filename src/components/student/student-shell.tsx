import type { ReactNode } from "react";
import { BrandMark } from "@/components/app/ui";

/** 学生端页面外壳：手机上是干净的整页，桌面上是居中的细边框卡片 */
export function StudentShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background sm:items-center sm:justify-center sm:bg-muted sm:px-4 sm:py-10">
      <div className="w-full sm:max-w-[420px]">
        <div className="flex items-center gap-2 px-6 pb-2 pt-6 sm:px-0 sm:pb-4 sm:pt-0">
          <BrandMark size={22} />
          <span className="text-[15px] font-semibold tracking-tight">点名宝</span>
        </div>
        <div className="px-6 pb-10 pt-4 sm:rounded-xl sm:border sm:border-border sm:bg-background sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}

const toneStyles = {
  success: "bg-[var(--tag-green-bg)] text-[var(--tag-green-fg)]",
  error: "bg-[var(--tag-red-bg)] text-[var(--tag-red-fg)]",
  warning: "bg-[var(--tag-orange-bg)] text-[var(--tag-orange-fg)]",
  muted: "bg-secondary text-muted-foreground",
} as const;

/** 结果 / 错误状态展示 */
export function StatusView({
  icon,
  tone,
  title,
  children,
}: {
  icon: ReactNode;
  tone: keyof typeof toneStyles;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <div className={`flex h-14 w-14 items-center justify-center rounded-full [&_svg]:h-7 [&_svg]:w-7 ${toneStyles[tone]}`}>
        {icon}
      </div>
      <div className="w-full space-y-1.5">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {children}
      </div>
    </div>
  );
}
