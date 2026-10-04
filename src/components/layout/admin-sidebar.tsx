"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, BookOpen, ClipboardCheck, Settings, LogOut, ArrowLeft } from "lucide-react";
import { Brand } from "@/components/app/ui";
import { ThemeSwitcher } from "@/components/theme";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "概览", icon: LayoutDashboard },
  { href: "/admin/teachers", label: "教师管理", icon: Users },
  { href: "/admin/courses", label: "课程管理", icon: BookOpen },
  { href: "/admin/attendance", label: "签到记录", icon: ClipboardCheck },
  { href: "/admin/settings", label: "系统设置", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <>
      {/* 移动端顶部导航（侧边栏只在大屏显示） */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur lg:hidden">
        <div className="flex h-12 items-center justify-between px-4">
          <span className="flex items-center gap-2">
            <Brand href="/admin" size={22} />
            <span className="tag tag-gray">管理后台</span>
          </span>
          <button onClick={handleLogout} aria-label="退出登录" className="rounded-md p-2 text-muted-foreground hover:bg-secondary">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "shrink-0 rounded-md px-2.5 py-1 text-sm",
                pathname === item.href ? "bg-secondary font-medium text-foreground" : "text-muted-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
          <Link href="/dashboard" className="shrink-0 rounded-md px-2.5 py-1 text-sm text-muted-foreground">
            教师端
          </Link>
        </nav>
      </header>

      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex items-center gap-2 px-4 pb-3 pt-4">
          <Brand href="/admin" size={24} />
          <span className="tag tag-gray">管理</span>
        </div>
        <nav className="flex-1 space-y-0.5 px-2">
          {items.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-8 items-center gap-2 rounded-md px-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4 opacity-70" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-0.5 border-t border-sidebar-border p-2">
          <div className="flex h-8 items-center justify-between gap-2 px-2 text-sm text-sidebar-foreground">
            <span>外观</span>
            <ThemeSwitcher className="w-[92px]" />
          </div>
          <Link
            href="/dashboard"
            className="flex h-8 items-center gap-2 rounded-md px-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent/70"
          >
            <ArrowLeft className="h-4 w-4 opacity-70" />
            返回教师端
          </Link>
          <button
            onClick={handleLogout}
            className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent/70"
          >
            <LogOut className="h-4 w-4 opacity-70" />
            退出登录
          </button>
        </div>
      </aside>
    </>
  );
}
