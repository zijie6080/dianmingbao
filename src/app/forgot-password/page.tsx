"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Loader2, Mail, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { fetchJson } from "@/lib/client";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [sending, setSending] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  function startCountdown() {
    setCountdown(60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1 && timerRef.current) clearInterval(timerRef.current);
        return Math.max(0, prev - 1);
      });
    }, 1000);
  }

  async function sendCode() {
    if (sending || countdown > 0) return;
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("请先输入正确的邮箱");
      return;
    }
    setError("");
    setSending(true);
    const res = await fetchJson<never>("/api/auth/reset-password/send-code", {
      method: "POST",
      json: { email: email.trim() },
    });
    setSending(false);
    if (res.ok) {
      setCodeSent(true);
      startCountdown();
      toast.success(res.message || "验证码已发送");
    } else {
      setError(res.error || "发送失败，请稍后重试");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (code.length !== 6) return setError("请输入6位验证码");
    if (password.length < 6) return setError("新密码至少6位");
    if (password !== confirm) return setError("两次输入的密码不一致");
    setError("");
    setSubmitting(true);
    const res = await fetchJson<{ role: string }>("/api/auth/reset-password", {
      method: "POST",
      json: { email: email.trim(), code, password },
    });
    setSubmitting(false);
    if (res.ok) {
      toast.success("密码已重置，已为你自动登录");
      router.push(res.data?.role === "ADMIN" ? "/admin" : "/dashboard");
      router.refresh();
    } else {
      setError(res.error || "重置失败，请重试");
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-10">
      <Link href="/" className="mb-8 flex items-center gap-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
          <GraduationCap className="h-6 w-6" />
        </div>
        <span className="text-xl font-bold tracking-tight">点名宝</span>
      </Link>

      <Card className="w-full max-w-md rounded-2xl shadow-sm">
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-2xl font-bold">找回密码</CardTitle>
          <CardDescription>通过注册邮箱接收验证码，设置新密码</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit} noValidate>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">注册邮箱</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="teacher@university.edu.cn"
                    className="rounded-xl pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 rounded-xl"
                  onClick={sendCode}
                  disabled={sending || countdown > 0}
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : countdown > 0 ? `${countdown}s` : codeSent ? "重新发送" : "发送验证码"}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">验证码</Label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="6位验证码"
                  className="rounded-xl pl-10"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">新密码</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="至少6位"
                  className="rounded-xl pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">确认新密码</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  placeholder="再输入一次"
                  className="rounded-xl pl-10"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <p className="text-xs text-muted-foreground">重置后，其他设备上的登录会自动退出。</p>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 pt-6">
            <Button type="submit" className="w-full rounded-xl" size="lg" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              重置密码并登录
            </Button>
            <p className="text-sm text-muted-foreground">
              想起来了？{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                返回登录
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
