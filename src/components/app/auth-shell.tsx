import type { ReactNode } from "react";
import { Brand } from "@/components/app/ui";

/** 登录 / 注册 / 找回密码：白底、窄表单、无卡片 */
export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="px-6 py-5">
        <Brand size={24} />
      </header>
      <main className="flex flex-1 items-start justify-center px-6 pb-16 pt-[8vh]">
        <div className="w-full max-w-[360px]">
          <h1 className="text-[26px] font-semibold tracking-tight">{title}</h1>
          {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-sm text-muted-foreground">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
