import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GraduationCap, QrCode, BarChart3, Users } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Nav */}
      <header className="border-b border-border bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">点名宝</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="rounded-lg" asChild>
              <Link href="/login">登录</Link>
            </Button>
            <Button size="sm" className="rounded-lg" asChild>
              <Link href="/register">免费注册</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-1.5 text-sm text-muted-foreground shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-green-500" />
            专为大学教师设计
          </div>

          <h1 className="mb-6 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            极简课堂签到
            <br />
            <span className="text-primary">30秒发起签到</span>
          </h1>

          <p className="mb-10 text-lg leading-relaxed text-muted-foreground sm:text-xl">
            专为大学教师设计的极简课堂签到工具。
            <br className="hidden sm:block" />
            无需复杂设置，扫码即签到，课后自动统计出勤情况。
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" className="h-12 rounded-xl px-8 text-base" asChild>
              <Link href="/register">免费开始使用</Link>
            </Button>
            <Button variant="outline" size="lg" className="h-12 rounded-xl px-8 text-base" asChild>
              <Link href="/login">已有账号？登录</Link>
            </Button>
          </div>

          <div className="mt-20 grid gap-8 sm:grid-cols-3">
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-white p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-primary">
                <QrCode className="h-6 w-6" />
              </div>
              <h3 className="font-semibold">动态二维码签到</h3>
              <p className="text-sm text-muted-foreground">自动生成动态二维码，每30秒刷新，安全防作弊</p>
            </div>
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-white p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-600">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="font-semibold">Excel导入学生</h3>
              <p className="text-sm text-muted-foreground">批量导入学生名单，一键管理，支持模板下载</p>
            </div>
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-white p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h3 className="font-semibold">自动统计导出</h3>
              <p className="text-sm text-muted-foreground">自动计算出勤率，支持导出Excel，学期总结无忧</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        点名宝 · 极简课堂签到工具 · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
