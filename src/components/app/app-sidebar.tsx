"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, Heart, Home, LogOut, Menu, Shield, X } from "lucide-react";
import { Brand } from "@/components/app/ui";
import { CreateCourseDialog } from "@/components/courses/course-form";
import { DonateDialog } from "@/components/shared/donate-widget";
import { cn } from "@/lib/utils";

export interface SidebarCourse {
  id: string;
  name: string;
  semester: string;
}

export interface SidebarUser {
  name: string;
  email: string;
  role: string;
}

function NavLink({
  href,
  active,
  children,
  onNavigate,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-8 items-center gap-2 rounded-md px-2 text-sm transition-colors",
        active
          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
      )}
    >
      {children}
    </Link>
  );
}

function SidebarContent({
  user,
  courses,
  onNavigate,
}: {
  user: SidebarUser;
  courses: SidebarCourse[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pb-3 pt-4">
        <Brand href="/dashboard" size={24} />
      </div>

      <nav className="space-y-0.5 px-2">
        <NavLink href="/dashboard" active={pathname === "/dashboard"} onNavigate={onNavigate}>
          <Home className="h-4 w-4 opacity-70" />
          首页
        </NavLink>
        <NavLink href="/courses" active={pathname === "/courses"} onNavigate={onNavigate}>
          <BookOpen className="h-4 w-4 opacity-70" />
          全部课程
        </NavLink>
      </nav>

      <div className="mt-5 flex items-center justify-between px-4 pb-1">
        <span className="text-xs font-medium text-muted-foreground">我的课程</span>
        <CreateCourseDialog variant="icon" />
      </div>
      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
        {courses.length === 0 ? (
          <CreateCourseDialog variant="sidebar" />
        ) : (
          courses.map((c) => {
            const active = pathname === `/courses/${c.id}` || pathname.startsWith(`/courses/${c.id}/`);
            return (
              <NavLink key={c.id} href={`/courses/${c.id}`} active={active} onNavigate={onNavigate}>
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] font-medium",
                    active ? "bg-primary text-white" : "bg-[var(--tag-gray-bg)] text-[var(--tag-gray-fg)]"
                  )}
                >
                  {c.name.slice(0, 1)}
                </span>
                <span className="truncate">{c.name}</span>
              </NavLink>
            );
          })
        )}
      </nav>

      <div className="border-t border-sidebar-border px-2 py-2">
        {user.role === "ADMIN" && (
          <NavLink href="/admin" active={false} onNavigate={onNavigate}>
            <Shield className="h-4 w-4 opacity-70" />
            管理后台
          </NavLink>
        )}
        <DonateDialog>
          <button className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent/70">
            <Heart className="h-4 w-4 opacity-70" />
            赞赏支持
          </button>
        </DonateDialog>
        <div className="mt-1 flex items-center gap-2 rounded-md px-2 py-1.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--tag-gray-bg)] text-xs font-medium text-[var(--tag-gray-fg)]">
            {user.name.slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          <button
            onClick={logout}
            title="退出登录"
            aria-label="退出登录"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** 教师端外壳：桌面端固定左侧栏，移动端顶部栏 + 抽屉 */
export function AppSidebar({ user, courses }: { user: SidebarUser; courses: SidebarCourse[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-sidebar-border bg-sidebar lg:block">
        <SidebarContent user={user} courses={courses} />
      </aside>

      <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur lg:hidden">
        <Brand href="/dashboard" size={22} />
        <button
          onClick={() => setOpen(true)}
          aria-label="打开菜单"
          className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="导航菜单">
          <div className="absolute inset-0 bg-[rgba(15,15,15,0.35)]" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-sidebar shadow-xl">
            <button
              onClick={() => setOpen(false)}
              aria-label="关闭菜单"
              className="absolute right-3 top-3.5 rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent user={user} courses={courses} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
