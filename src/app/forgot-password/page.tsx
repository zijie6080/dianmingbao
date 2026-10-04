"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { AuthShell } from "@/components/app/auth-shell";
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
    <AuthShell
      title="找回密码"
      description="向注册邮箱发送验证码，验证后设置新密码"
      footer={
        <>
          想起来了？
          <Link href="/login" className="font-medium text-primary hover:underline">
            返回登录
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email">注册邮箱</Label>
          <div className="flex gap-2">
            <Input id="email" type="email" autoComplete="email" placeholder="name@school.edu.cn" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
            <Button type="button" variant="outline" className="h-9 w-24 shrink-0" onClick={sendCode} disabled={sending || countdown > 0}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : countdown > 0 ? `${countdown}s` : codeSent ? "重新发送" : "发送验证码"}
            </Button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="code">验证码</Label>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="邮件中的 6 位数字"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">新密码</Label>
          <Input id="password" type="password" autoComplete="new-password" placeholder="至少 6 位" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm">确认新密码</Label>
          <Input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          重置密码并登录
        </Button>
        <p className="text-xs text-muted-foreground">重置后，其他设备上的登录会自动退出。</p>
      </form>
    </AuthShell>
  );
}
