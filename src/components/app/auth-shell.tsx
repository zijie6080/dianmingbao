import type { ReactNode } from "react";
import { Brand } from "@/components/app/ui";

/** Shared, task-first shell for login, registration and recovery. */
export function AuthShell({ title, description, children, footer }: {
  title: string; description?: ReactNode; children: ReactNode; footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="px-6 py-6 sm:px-10"><Brand size={28} /></header>
      <main className="flex flex-1 justify-center px-6 pb-16 pt-8 sm:pt-[8vh]">
        <div className="w-full max-w-[400px]">
          <h1 className="text-[28px] font-semibold tracking-tight">{title}</h1>
          {description && <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{description}</p>}
          <div className="mt-8 [&_input]:min-h-11 [&_input]:text-base [&_button]:min-h-11">{children}</div>
          {footer && <div className="mt-7 border-t border-border pt-6 text-sm text-muted-foreground">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
