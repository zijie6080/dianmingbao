"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Loader2, Mail, Lock, User, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  async function sendCode() {
    if (!email) {
      toast.error("请先输入邮箱");
      return;
    }
    setSendingCode(true);
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.dev ? `开发模式，验证码：${data.code}` : "验证码已发送，请检查邮箱");
        // 倒计时60秒
        setCountdown(60);
        timerRef.current = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              if (timerRef.current) clearInterval(timerRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        toast.error(data.error || "发送失败");
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setSendingCode(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { toast.error("密码至少6位"); return; }
    if (code.length !== 6) { toast.error("请输入6位验证码"); return; }
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, code }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("注册成功！");
        router.push("/dashboard");
        router.refresh();
      } else {
        toast.error(data.error || "注册失败");
      }
    } catch {
      toast.error("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8FAFC] px-4">
      <Link href="/" className="mb-8 flex items-center gap-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
          <GraduationCap className="h-6 w-6" />
        </div>
        <span className="text-xl font-bold tracking-tight">点名宝</span>
      </Link>

      <Card className="w-full max-w-md rounded-2xl shadow-sm">
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-2xl font-bold">注册</CardTitle>
          <CardDescription>创建你的教师账号，开始使用点名宝</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">姓名</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="name" type="text" placeholder="你的姓名"
                  className="pl-10 rounded-xl" value={name}
                  onChange={(e) => setName(e.target.value)} required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email" type="email" placeholder="teacher@university.edu.cn"
                    className="pl-10 rounded-xl" value={email}
                    onChange={(e) => setEmail(e.target.value)} required
                  />
                </div>
                <Button
                  type="button" variant="outline" className="rounded-xl shrink-0"
                  onClick={sendCode} disabled={sendingCode || countdown > 0}
                >
                  {sendingCode ? <Loader2 className="h-4 w-4 animate-spin" /> :
                   countdown > 0 ? `${countdown}s` : "发送验证码"}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">验证码</Label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="code" type="text" placeholder="请输入6位验证码"
                  className="pl-10 rounded-xl" value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6} autoComplete="one-time-code"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password" type="password" placeholder="至少6位密码"
                  className="pl-10 rounded-xl" value={password}
                  onChange={(e) => setPassword(e.target.value)} required minLength={6}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 pt-6">
            <Button type="submit" className="w-full rounded-xl" size="lg" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              注册
            </Button>
            <p className="text-sm text-muted-foreground">
              已有账号？{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                立即登录
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
