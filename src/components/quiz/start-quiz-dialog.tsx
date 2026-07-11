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
import { Loader2, Clock, Users, StopCircle, MessageSquare, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import type { QuizSessionDTO, StudentDTO } from "@/types";

const REFRESH_INTERVAL = 30;
const POLL_INTERVAL = 5000;

interface Props {
  courseId: string;
  courseName: string;
}

export function StartQuizDialog({ courseId, courseName }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"select" | "active">("select");
  const [duration, setDuration] = useState("5");
  const [session, setSession] = useState<QuizSessionDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [submittedStudents, setSubmittedStudents] = useState<
    (StudentDTO & { answer: string; score: number | null })[]
  >([]);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [nonce, setNonce] = useState(0);

  const sessionRef = useRef<QuizSessionDTO | null>(null);
  const countdownRef = useRef(REFRESH_INTERVAL);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  useEffect(() => { sessionRef.current = session; }, [session]);
  useEffect(() => { countdownRef.current = countdown; }, [countdown]);

  const clearTimers = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  async function startQuiz() {
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/quiz`, {
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
        toast.success("答题已开始");
      } else {
        toast.error(data.error || "创建答题失败");
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setLoading(false);
    }
  }

  // 轮询答题提交 — 独立 effect
  useEffect(() => {
    if (step !== "active") return;

    async function pollQuiz() {
      const s = sessionRef.current;
      if (!s) return;
      try {
        const res = await fetch(`/api/courses/${courseId}/quiz/${s.id}`);
        const data = await res.json();
        if (!data.success) return;

        setSubmittedStudents(data.data.submitted || []);
        setSession((prev) =>
          prev ? { ...prev, submissionCount: data.data.submitted?.length || 0 } : prev
        );

        if (data.data.session.status === "ended") {
          setStep("select");
          clearTimers();
          toast.info("答题已结束");
        }
      } catch {
        // 静默处理
      }
    }

    pollQuiz();
    pollRef.current = setInterval(pollQuiz, POLL_INTERVAL);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [step, courseId, clearTimers]);

  // 倒计时 — 独立 effect
  useEffect(() => {
    if (step !== "active") return;
    timerRef.current = setInterval(() => {
      const current = countdownRef.current;
      if (current <= 1) {
        setNonce((n) => n + 1);
        countdownRef.current = REFRESH_INTERVAL;
        setCountdown(REFRESH_INTERVAL);
      } else {
        countdownRef.current = current - 1;
        setCountdown(current - 1);
      }
    }, 1000);
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [step]);

  async function endQuiz() {
    const s = sessionRef.current;
    if (!s) return;
    try {
      const res = await fetch(`/api/courses/${courseId}/quiz/${s.id}`, { method: "PUT" });
      const data = await res.json();
      if (data.success) {
        toast.success("答题已结束");
        clearTimers();
        setOpen(false);
        router.push(`/courses/${courseId}/quiz/${s.id}`);
        router.refresh();
      } else {
        toast.error(data.error || "结束失败");
      }
    } catch {
      toast.error("网络错误");
    }
  }

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      clearTimers();
      setStep("select");
      setSession(null);
      sessionRef.current = null;
    }
    setOpen(newOpen);
  }

  const [appUrl, setAppUrl] = useState("");
  useEffect(() => { setAppUrl(window.location.origin); }, []);
  const qrValue = session && appUrl ? `${appUrl}/quiz/${session.token}?t=${nonce}` : "";
  const quizUrl = session && appUrl ? `${appUrl}/quiz/${session.token}` : "";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="gap-2 rounded-xl shadow-sm">
          <HelpCircle className="h-4 w-4" />
          开始答题
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg rounded-2xl">
        {step === "select" ? (
          <>
            <DialogHeader>
              <DialogTitle>发起答题</DialogTitle>
              <DialogDescription>
                {courseName} · 选择答题时长后点击开始
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">答题时长</label>
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
                onClick={startQuiz}
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <MessageSquare className="mr-2 h-5 w-5" />}
                开始答题
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
                答题进行中
              </DialogTitle>
              <DialogDescription>
                {courseName} · 学生扫码即可答题
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center gap-6 py-4">
              {/* QR Code */}
              <div className="rounded-2xl border-2 border-border p-3 bg-white shadow-sm">
                {qrValue ? (
                  <div key={nonce}>
                    <img
                      src={`/api/qr?url=${encodeURIComponent(qrValue)}`}
                      alt="答题二维码"
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

              {/* Fallback URL */}
              {quizUrl && (
                <div className="w-full rounded-xl bg-blue-50 border border-blue-200 p-3 text-center">
                  <p className="text-xs text-blue-600 mb-1">扫码失败？复制链接在浏览器打开</p>
                  <p className="text-sm font-mono font-medium text-blue-800 break-all select-all">
                    {quizUrl}
                  </p>
                </div>
              )}

              {/* Info Bar */}
              <div className="flex w-full items-center justify-center gap-6">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono font-bold text-lg tabular-nums">{countdown}s</span>
                  <span className="text-muted-foreground">后刷新</span>
                </div>
              </div>

              {/* Submission Count */}
              <Card className="w-full rounded-xl border-0 bg-muted/50">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <span className="font-medium">已提交</span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-primary">
                      {session?.submissionCount || 0}
                    </span>
                    <span className="text-muted-foreground"> / {session?.totalStudents || 0}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Submitted List */}
              {submittedStudents.length > 0 && (
                <div className="w-full">
                  <h4 className="mb-2 text-sm font-medium text-muted-foreground">已提交学生</h4>
                  <div className="max-h-32 space-y-1 overflow-y-auto">
                    {submittedStudents.map((s) => (
                      <div key={s.id} className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm bg-green-50">
                        <span className="text-green-600">✓</span>
                        <span className="font-mono text-xs">{s.studentId}</span>
                        <span>{s.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button variant="destructive" className="w-full rounded-xl" size="lg" onClick={endQuiz}>
                <StopCircle className="mr-2 h-5 w-5" />
                结束答题
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
