"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Users, BookOpen, ClipboardCheck, Settings, GraduationCap,
  LogOut, ChevronLeft,
} from "lucide-react";

export function AdminSidebar() {
  const pathname = usePathname();

  const items = [
    { href: "/admin", label: "仪表盘", icon: LayoutDashboard },
    { href: "/admin/teachers", label: "教师管理", icon: Users },
    { href: "/admin/courses", label: "课程管理", icon: BookOpen },
    { href: "/admin/attendance", label: "签到记录", icon: ClipboardCheck },
    { href: "/admin/settings", label: "系统设置", icon: Settings },
  ];

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 border-r border-border bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 px-6 border-b border-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div>
          <span className="text-lg font-bold tracking-tight">点名宝</span>
          <span className="ml-1.5 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">管理</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                size="sm"
                className={`w-full justify-start gap-3 rounded-lg ${isActive ? "font-medium" : ""}`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-3">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-3 rounded-lg text-muted-foreground">
            <ChevronLeft className="h-4 w-4" />
            返回教师端
          </Button>
        </Link>
        <Button
          variant="ghost" size="sm"
          className="w-full justify-start gap-3 rounded-lg text-muted-foreground mt-1"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          退出登录
        </Button>
      </div>
    </aside>
  );
}
