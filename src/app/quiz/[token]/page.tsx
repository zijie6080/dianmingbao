"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Loader2, CheckCircle2, XCircle, Clock, Smartphone } from "lucide-react";
import { toast } from "sonner";

interface SessionInfo {
  courseName: string;
  teacherName: string;
  duration: number;
  status: string;
}

// 生成设备指纹（同一手机生成的指纹相同）
function generateFingerprint(): string {
  const data = [
    navigator.userAgent,
    screen.width + "x" + screen.height,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
    navigator.hardwareConcurrency || "",
  ].join("|");

  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export default function QuizPage() {
  const { token } = useParams<{ token: string }>();
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [name, setName] = useState("");
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const fingerprintRef = useRef("");
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    data?: { studentName: string; studentId: string; courseName: string; answer: string; timestamp: string };
  } | null>(null);

  useEffect(() => {
    // 生成设备指纹
    fingerprintRef.current = generateFingerprint();

    // 读取 Cookie：此设备是否已经提交过答题
    if (document.cookie.includes(`quiz_${token}=1`)) {
      setAlreadySubmitted(true);
    }

    async function loadSessionInfo() {
      try {
        const res = await fetch(`/api/check-quiz?token=${token}`);
        const data = await res.json();
        if (data.success) setSessionInfo(data.data);
      } catch {
        // ignore
      } finally {
        setLoadingInfo(false);
      }
    }
    if (token) loadSessionInfo();
  }, [token]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("请输入你的姓名");
      return;
    }
    if (!answer.trim()) {
      toast.error("请输入你的答案");
      return;
    }

    setSubmitting(true);
    setResult(null);

    try {
      const res = await fetch("/api/quiz-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          name: name.trim(),
          answer: answer.trim(),
          fingerprint: fingerprintRef.current,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setResult({
          success: true,
          message: data.message,
          data: data.data,
        });
      } else {
        setResult({
          success: false,
          message: data.error || "提交失败",
        });
      }
      // 无论成功失败，此设备只允许提交一次
      document.cookie = `quiz_${token}=1; path=/; max-age=86400`;
      setAlreadySubmitted(true);
    } catch {
      setResult({ success: false, message: "网络错误，请稍后重试" });
      document.cookie = `quiz_${token}=1; path=/; max-age=86400`;
      setAlreadySubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingInfo) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8FAFC] px-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="mt-4 text-sm text-muted-foreground">加载答题信息...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8FAFC] px-4 py-8">
      <div className="mb-8 flex items-center gap-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
          <GraduationCap className="h-6 w-6" />
        </div>
        <span className="text-xl font-bold tracking-tight">点名宝</span>
      </div>

      <Card className="w-full max-w-md rounded-2xl shadow-sm">
        <CardHeader className="space-y-1 pb-4 text-center">
          <CardTitle className="text-xl font-bold">课堂答题</CardTitle>
          {sessionInfo ? (
            <CardDescription className="space-y-1">
              <p className="font-medium text-foreground">{sessionInfo.courseName}</p>
              <p>授课教师：{sessionInfo.teacherName}</p>
              <div className="flex items-center justify-center gap-2 text-xs">
                <Clock className="h-3 w-3" />
                <span>答题时长：{sessionInfo.duration} 分钟</span>
              </div>
            </CardDescription>
          ) : (
            <CardDescription className="text-destructive">
              答题信息无效或已过期
            </CardDescription>
          )}
        </CardHeader>

        <CardContent>
          {result ? (
            <div className="flex flex-col items-center gap-4 py-6">
              {result.success ? (
                <>
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-50">
                    <CheckCircle2 className="h-12 w-12 text-green-600" />
                  </div>
                  <div className="text-center w-full">
                    <h3 className="text-xl font-bold text-green-600">提交成功！</h3>
                    <p className="mt-1 text-muted-foreground">
                      {result.data?.studentName}
                      {result.data?.studentId && (
                        <span className="text-xs ml-1">({result.data.studentId})</span>
                      )}
                      {" · "}{result.data?.courseName}
                    </p>
                    {result.data?.answer && (
                      <p className="mt-2 rounded-lg bg-muted/50 px-3 py-2 text-sm text-left max-h-32 overflow-auto">
                        {result.data.answer}
                      </p>
                    )}
                    {result.data?.timestamp && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        提交时间：{new Date(result.data.timestamp).toLocaleTimeString("zh-CN")}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
                    <XCircle className="h-12 w-12 text-red-600" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-red-600">提交失败</h3>
                    <p className="mt-1 text-muted-foreground">{result.message}</p>
                  </div>
                </>
              )}
            </div>
          ) : alreadySubmitted ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-50">
                <Smartphone className="h-10 w-10 text-amber-600" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-amber-700">此设备已提交</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  此手机已在本轮答题中使用过
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  请使用自己的手机扫码答题，防止代答
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">你的姓名</Label>
                <Input
                  id="name"
                  placeholder="请输入你的姓名"
                  className="rounded-xl text-lg py-6 text-center"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  disabled={!sessionInfo}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="answer">你的答案</Label>
                <Textarea
                  id="answer"
                  placeholder="请输入你的答案"
                  className="rounded-xl min-h-[120px]"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  disabled={!sessionInfo}
                />
              </div>
              <Button
                type="submit"
                className="w-full rounded-xl"
                size="lg"
                disabled={submitting || !sessionInfo}
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : null}
                提交答案
              </Button>

              {!sessionInfo && (
                <p className="text-center text-sm text-destructive">
                  此答题链接无效或答题已结束
                </p>
              )}
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
