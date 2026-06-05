"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QrCode, Loader2, Clock, Users, StopCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { AttendanceSessionDTO, StudentDTO } from "@/types";

const REFRESH_INTERVAL = 30; // 30秒刷新
const POLL_INTERVAL = 5000; // 5秒轮询签到记录

interface Props {
  courseId: string;
  courseName: string;
}

export function StartAttendanceDialog({ courseId, courseName }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"select" | "active">("select");
  const [duration, setDuration] = useState("5");
  const [session, setSession] = useState<AttendanceSessionDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [presentStudents, setPresentStudents] = useState<StudentDTO[]>([]);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [nonce, setNonce] = useState(0);

  // 使用 ref 保存可变值，避免 useEffect 依赖变化导致定时器反复重建
  const sessionRef = useRef<AttendanceSessionDTO | null>(null);
  const countdownRef = useRef(REFRESH_INTERVAL);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  // 同步 ref
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    countdownRef.current = countdown;
  }, [countdown]);

  // 清理所有定时器
  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // 创建签到任务
  async function startAttendance() {
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration: parseInt(duration) }),
      });
      const data = await res.json();
      if (data.success) {
        const newSession = data.data;
        setSession(newSession);
        sessionRef.current = newSession;
        setStep("active");
        setCountdown(REFRESH_INTERVAL);
        countdownRef.current = REFRESH_INTERVAL;
        setNonce(0);
        toast.success("签到已开始");
      } else {
        toast.error(data.error || "创建签到失败");
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setLoading(false);
    }
  }

  // 轮询签到记录 — 独立 effect，不依赖 session state
  useEffect(() => {
    if (step !== "active") return;

    async function pollAttendance() {
      const s = sessionRef.current;
      if (!s) return;
      try {
        const res = await fetch(`/api/courses/${courseId}/attendance/${s.id}`);
        const data = await res.json();
        if (!data.success) return;

        setPresentStudents(data.data.present || []);
        setSession((prev) =>
          prev
            ? { ...prev, checkInCount: data.data.present?.length || 0 }
            : prev
        );

        if (data.data.session.status === "ended") {
          setStep("select");
          clearTimers();
          toast.info("签到已结束");
        }
      } catch {
        // 静默处理轮询失败
      }
    }

    // 立即执行一次
    pollAttendance();
    // 每5秒轮询
    pollRef.current = setInterval(pollAttendance, POLL_INTERVAL);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [step, courseId, clearTimers]); // 不依赖 session 和 pollAttendance，只依赖稳定的值

  // 倒计时定时器 — 独立 effect，使用 ref 读取最新值
  useEffect(() => {
    if (step !== "active") return;

    timerRef.current = setInterval(() => {
      const current = countdownRef.current;
      if (current <= 1) {
        // 倒计时归零 → 刷新 nonce，重置倒计时
        setNonce((n) => n + 1);
        countdownRef.current = REFRESH_INTERVAL;
        setCountdown(REFRESH_INTERVAL);
      } else {
        countdownRef.current = current - 1;
        setCountdown(current - 1);
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [step]); // 只依赖 step，倒计时内部通过 ref 读取最新值

  // 结束签到
  async function endAttendance() {
    const s = sessionRef.current;
    if (!s) return;
    try {
      const res = await fetch(`/api/courses/${courseId}/attendance/${s.id}`, {
        method: "PUT",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("签到已结束");
        clearTimers();
        setOpen(false);
        router.push(`/courses/${courseId}/attendance/${s.id}`);
        router.refresh();
      } else {
        toast.error(data.error || "结束失败");
      }
    } catch {
      toast.error("网络错误");
    }
  }

  // 关闭弹窗时清理
  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      clearTimers();
      setStep("select");
      setSession(null);
      sessionRef.current = null;
    }
    setOpen(newOpen);
  }

  // 使用 useEffect 确保只在客户端获取 origin（避免 SSR 时空值）
  const [appUrl, setAppUrl] = useState("");
  useEffect(() => {
    setAppUrl(window.location.origin);
  }, []);
  const qrValue = session && appUrl ? `${appUrl}/attend/${session.token}?t=${nonce}` : "";
  const attendUrl = session && appUrl ? `${appUrl}/attend/${session.token}` : "";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2 rounded-xl shadow-sm">
          <QrCode className="h-4 w-4" />
          开始签到
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg rounded-2xl">
        {step === "select" ? (
          <>
            <DialogHeader>
              <DialogTitle>发起签到</DialogTitle>
              <DialogDescription>
                {courseName} · 选择签到时长后点击开始
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">签到时长</label>
                <Select value={duration} onValueChange={(value) => setDuration(value || "")}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 分钟</SelectItem>
                    <SelectItem value="5">5 分钟</SelectItem>
                    <SelectItem value="10">10 分钟</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full rounded-xl"
                size="lg"
                onClick={startAttendance}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <QrCode className="mr-2 h-5 w-5" />
                )}
                开始签到
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
                签到进行中
              </DialogTitle>
              <DialogDescription>
                {courseName} · 学生扫码即可签到
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center gap-6 py-4">
              {/* QR Code — 服务端生成 PNG，兼容所有手机扫码 */}
              <div className="rounded-2xl border-2 border-border p-3 bg-white shadow-sm">
                {qrValue ? (
                  <div key={nonce}>
                    <img
                      src={`/api/qr?url=${encodeURIComponent(qrValue)}`}
                      alt="签到二维码"
                      width={280}
                      height={280}
                      className="block"
                    />
                  </div>
                ) : (
                  <div className="flex h-[280px] w-[280px] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* 手动输入链接（备选） */}
              {attendUrl && (
                <div className="w-full rounded-xl bg-blue-50 border border-blue-200 p-3 text-center">
                  <p className="text-xs text-blue-600 mb-1">扫码失败？复制链接在浏览器打开</p>
                  <p className="text-sm font-mono font-medium text-blue-800 break-all select-all">
                    {attendUrl}
                  </p>
                </div>
              )}

              {/* Info Bar */}
              <div className="flex w-full items-center justify-center gap-6">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono font-bold text-lg tabular-nums">
                    {countdown}s
                  </span>
                  <span className="text-muted-foreground">后刷新</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">每30秒自动刷新</span>
                </div>
              </div>

              {/* Attendee Count */}
              <Card className="w-full rounded-xl border-0 bg-muted/50">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <span className="font-medium">已签到</span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-primary">
                      {session?.checkInCount || 0}
                    </span>
                    <span className="text-muted-foreground">
                      {" "}
                      / {session?.totalStudents || 0}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Present List */}
              {presentStudents.length > 0 && (
                <div className="w-full">
                  <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                    已签到学生
                  </h4>
                  <div className="max-h-32 space-y-1 overflow-y-auto">
                    {presentStudents.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm bg-green-50"
                      >
                        <span className="text-green-600">✓</span>
                        <span className="font-mono text-xs">{s.studentId}</span>
                        <span>{s.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* End Button */}
              <Button
                variant="destructive"
                className="w-full rounded-xl"
                size="lg"
                onClick={endAttendance}
              >
                <StopCircle className="mr-2 h-5 w-5" />
                结束签到
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
