"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/app/auth-shell";
import { fetchJson } from "@/lib/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (!email.trim() || !password) {
      setError("请输入邮箱和密码");
      return;
    }
    setError("");
    setLoading(true);
    const res = await fetchJson<{ name: string; role: string }>("/api/auth/login", {
      method: "POST",
      json: { email: email.trim(), password },
    });
    if (res.ok && res.data) {
      toast.success(`欢迎回来，${res.data.name}`);
      // 登录过期被踢回来时，回到原来的页面
      const from = new URLSearchParams(window.location.search).get("from");
      const safeFrom = from && from.startsWith("/") && !from.startsWith("//") ? from : null;
      router.push(safeFrom || (res.data.role === "ADMIN" ? "/admin" : "/dashboard"));
      router.refresh();
      return;
    }
    setLoading(false);
    setError(res.error || "登录失败，请重试");
  }

  return (
    <AuthShell
      title="登录点名宝"
      description="使用注册邮箱登录教师账号"
      footer={
        <>
          还没有账号？
          <Link href="/register" className="font-medium text-primary hover:underline">
            免费注册
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email">邮箱</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="name@school.edu.cn"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="password">密码</Label>
            <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
              忘记密码？
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          登录
        </Button>
      </form>
    </AuthShell>
  );
}
