"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/app/auth-shell";
import { fetchJson } from "@/lib/client";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  async function sendCode() {
    if (sendingCode || countdown > 0) return;
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("请先输入正确的邮箱");
      return;
    }
    setError("");
    setSendingCode(true);
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.dev ? `开发模式验证码：${data.code}` : "验证码已发送，请查收邮件");
        setCountdown(60);
        timerRef.current = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1 && timerRef.current) clearInterval(timerRef.current);
            return Math.max(0, prev - 1);
          });
        }, 1000);
      } else {
        setError(data.error || "发送失败");
      }
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setSendingCode(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (!name.trim()) return setError("请输入姓名");
    if (code.length !== 6) return setError("请输入6位验证码");
    if (password.length < 6) return setError("密码至少6位");
    setError("");
    setLoading(true);
    const res = await fetchJson("/api/auth/register", {
      method: "POST",
      json: { name: name.trim(), email: email.trim(), password, code },
    });
    if (res.ok) {
      toast.success("注册成功");
      router.push("/dashboard");
      router.refresh();
      return;
    }
    setLoading(false);
    setError(res.error || "注册失败，请重试");
  }

  return (
    <AuthShell
      title="创建教师账号"
      description="免费使用，注册只需一分钟"
      footer={
        <>
          已有账号？
          <Link href="/login" className="font-medium text-primary hover:underline">
            直接登录
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="name">姓名</Label>
          <Input id="name" autoComplete="name" placeholder="学生签到页会显示你的姓名" value={name} maxLength={50} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">邮箱</Label>
          <div className="flex gap-2">
            <Input id="email" type="email" autoComplete="email" placeholder="name@school.edu.cn" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button type="button" variant="outline" className="h-9 w-24 shrink-0" onClick={sendCode} disabled={sendingCode || countdown > 0}>
              {sendingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : countdown > 0 ? `${countdown}s` : "发送验证码"}
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
            value={code}
            maxLength={6}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">密码</Label>
          <Input id="password" type="password" autoComplete="new-password" placeholder="至少 6 位" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          注册
        </Button>
      </form>
    </AuthShell>
  );
}
