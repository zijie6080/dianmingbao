"use client";

import { useSyncExternalStore } from "react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

/** 深色模式：默认跟随系统，可在侧边栏切换 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}

const subscribe = () => () => {};
/** 只在客户端为 true，避免主题图标的水合不一致 */
function useIsClient() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

const OPTIONS = [
  { value: "light", label: "浅色", icon: Sun },
  { value: "dark", label: "深色", icon: Moon },
  { value: "system", label: "跟随系统", icon: Monitor },
] as const;

/** 三段式外观切换（侧边栏底部） */
export function ThemeSwitcher({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const isClient = useIsClient();
  const current = isClient ? theme ?? "system" : "system";
  return (
    <div role="radiogroup" aria-label="外观" className={cn("flex rounded-md bg-sidebar-accent/60 p-0.5", className)}>
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={current === o.value}
          title={o.label}
          aria-label={o.label}
          onClick={() => setTheme(o.value)}
          className={cn(
            "flex h-6 flex-1 items-center justify-center rounded text-muted-foreground transition-colors",
            current === o.value ? "bg-background text-foreground shadow-sm" : "hover:text-foreground"
          )}
        >
          <o.icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}

/** 单按钮切换（首页顶部） */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const isClient = useIsClient();
  const dark = isClient && resolvedTheme === "dark";
  return (
    <button
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? "切换到浅色模式" : "切换到深色模式"}
      title={dark ? "浅色模式" : "深色模式"}
      className={cn("rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground", className)}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
