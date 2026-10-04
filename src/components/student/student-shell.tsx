import type { ReactNode } from "react";
import { GraduationCap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/** 学生端页面外壳：品牌 + 居中卡片，手机优先 */
export function StudentShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center bg-background px-4 pb-10 pt-10 sm:justify-center sm:pt-8">
      <div className="mb-6 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
          <GraduationCap className="h-5 w-5" />
        </div>
        <span className="text-lg font-bold tracking-tight">点名宝</span>
      </div>
      <Card className="w-full max-w-md rounded-2xl border-0 shadow-sm">
        <CardContent className="p-6">{children}</CardContent>
      </Card>
    </div>
  );
}

const toneStyles = {
  success: "bg-green-50 text-green-600",
  error: "bg-red-50 text-red-600",
  warning: "bg-amber-50 text-amber-600",
  muted: "bg-muted text-muted-foreground",
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
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <div className={`flex h-16 w-16 items-center justify-center rounded-full ${toneStyles[tone]}`}>
        {icon}
      </div>
      <div className="w-full space-y-1.5">
        <h2 className="text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}
