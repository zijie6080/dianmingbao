"use client";

import { useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Clock, Loader2, QrCode, RefreshCw, Smartphone, WifiOff, XCircle } from "lucide-react";
import { StatusView, StudentShell } from "@/components/student/student-shell";
import { saveName, useSessionTicket } from "@/components/student/use-session-ticket";
import { fetchJson, getDeviceId } from "@/lib/client";
import { formatCountdown, formatTime } from "@/lib/format";
import { useNow } from "@/lib/use-now";

interface AttendResult {
  studentName: string;
  studentId: string;
  courseName: string;
  timestamp: string;
  already?: boolean;
}

export default function AttendPage() {
  const { token } = useParams<{ token: string }>();
  const session = useSessionTicket("attend", token);
  // null = 用户还没动过输入框，此时显示上次保存的姓名
  const [nameInput, setName] = useState<string | null>(null);
  const name = nameInput ?? session.savedName;
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [result, setResult] = useState<AttendResult | null>(null);
  const submittingRef = useRef(false);
  const now = useNow(1000, session.status === "ready" && !result);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setFormError("请输入你的姓名");
      return;
    }
    if (!session.info || submittingRef.current) return;

    submittingRef.current = true;
    setSubmitting(true);
    setFormError("");

    const res = await fetchJson<AttendResult>("/api/attend", {
      method: "POST",
      json: {
        token,
        name: trimmed,
        accessTicket: session.info.accessTicket,
        fingerprint: getDeviceId(),
      },
    });

    submittingRef.current = false;
    setSubmitting(false);

    if (res.ok && res.data) {
      saveName(trimmed);
      setResult(res.data);
      session.setDone({ name: res.data.studentName, time: res.data.timestamp });
    } else {
      setFormError(res.error || "签到失败，请重试");
      if (res.code === "ENDED" || res.code === "QR_EXPIRED") session.reload();
    }
  }

  // ─── 加载中 ───
  if (session.status === "loading") {
    return (
      <StudentShell>
        <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
          <Loader2 className="h-7 w-7 animate-spin" />
          <p className="text-sm">正在加载签到信息…</p>
        </div>
      </StudentShell>
    );
  }

  // ─── 签到成功 ───
  if (result) {
    return (
      <StudentShell>
        <StatusView
          tone="success"
          icon={<CheckCircle2 className="h-9 w-9" />}
          title={result.already ? "你已经签到过了" : "签到成功"}
        >
          <p className="text-base font-medium">
            {result.studentName}
            <span className="ml-1 text-sm font-normal text-muted-foreground">{result.studentId}</span>
          </p>
          <p className="text-sm text-muted-foreground">{result.courseName}</p>
          <p className="pt-2 text-xs text-muted-foreground">签到时间 {formatTime(result.timestamp)}</p>
        </StatusView>
      </StudentShell>
    );
  }

  // ─── 本设备已签到 ───
  if (session.done) {
    return (
      <StudentShell>
        <StatusView tone="success" icon={<Smartphone className="h-8 w-8" />} title="本设备已完成签到">
          {session.done.name && <p className="text-base font-medium">{session.done.name}</p>}
          {session.done.time && (
            <p className="text-xs text-muted-foreground">签到时间 {formatTime(session.done.time)}</p>
          )}
          <p className="pt-2 text-sm text-muted-foreground">每台手机每轮只能为一位同学签到</p>
        </StatusView>
      </StudentShell>
    );
  }

  // ─── 链接无效 / 已结束 / 网络错误 ───
  if (session.status === "error" || !session.info) {
    const isNetwork = session.code === "NETWORK";
    const isExpiredQr = session.code === "QR_EXPIRED";
    return (
      <StudentShell>
        <StatusView
          tone={isNetwork ? "warning" : "error"}
          icon={
            isNetwork ? <WifiOff className="h-8 w-8" /> : isExpiredQr ? <QrCode className="h-8 w-8" /> : <XCircle className="h-8 w-8" />
          }
          title={isNetwork ? "网络连接失败" : isExpiredQr ? "二维码已过期" : "无法签到"}
        >
          <p className="text-sm text-muted-foreground">{session.error}</p>
          {(isNetwork || isExpiredQr) && (
            <div className="pt-3">
              {isNetwork ? (
                <Button variant="outline" className="rounded-xl" onClick={session.reload}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  重试
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">二维码每 30 秒刷新一次，请用微信重新扫一扫</p>
              )}
            </div>
          )}
        </StatusView>
      </StudentShell>
    );
  }

  // ─── 签到表单 ───
  const secondsLeft = (Date.parse(session.info.endsAt) - now) / 1000;
  return (
    <StudentShell>
      <div className="mb-6 text-center">
        <p className="text-sm text-muted-foreground">课堂签到</p>
        <h1 className="mt-1 text-xl font-bold">{session.info.courseName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">授课教师：{session.info.teacherName}</p>
        <div
          className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
            secondsLeft < 60 ? "bg-red-50 text-red-600" : "bg-muted text-muted-foreground"
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          {secondsLeft > 0 ? `剩余 ${formatCountdown(secondsLeft)}` : "签到即将结束"}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="name">姓名</Label>
          <Input
            id="name"
            placeholder="请输入名单上的姓名"
            className="h-12 rounded-xl text-center text-lg"
            value={name}
            maxLength={50}
            autoComplete="name"
            enterKeyHint="done"
            aria-invalid={!!formError}
            onChange={(e) => {
              setName(e.target.value);
              if (formError) setFormError("");
            }}
          />
          {formError && (
            <p role="alert" className="text-center text-sm text-destructive">
              {formError}
            </p>
          )}
        </div>
        <Button type="submit" className="h-12 w-full rounded-xl text-base" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
          {submitting ? "签到中…" : "确认签到"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">每台手机每轮只能为一位同学签到</p>
      </form>
    </StudentShell>
  );
}
