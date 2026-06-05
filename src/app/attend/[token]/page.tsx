"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

interface SessionInfo {
  courseName: string;
  teacherName: string;
  duration: number;
  status: string;
}

export default function AttendPage() {
  const { token } = useParams<{ token: string }>();
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    data?: { studentName: string; studentId: string; courseName: string; timestamp: string };
  } | null>(null);

  useEffect(() => {
    async function loadSessionInfo() {
      try {
        const res = await fetch(`/api/check-session?token=${token}`);
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

    setSubmitting(true);
    setResult(null);

    try {
      const res = await fetch("/api/attend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name: name.trim() }),
      });

      const data = await res.json();
      setResult({
        success: data.success,
        message: data.success ? data.message : data.error || "签到失败",
        data: data.data,
      });
    } catch {
      setResult({ success: false, message: "网络错误，请稍后重试" });
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingInfo) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8FAFC] px-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="mt-4 text-sm text-muted-foreground">加载签到信息...</p>
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
          <CardTitle className="text-xl font-bold">课堂签到</CardTitle>
          {sessionInfo ? (
            <CardDescription className="space-y-1">
              <p className="font-medium text-foreground">{sessionInfo.courseName}</p>
              <p>授课教师：{sessionInfo.teacherName}</p>
              <div className="flex items-center justify-center gap-2 text-xs">
                <Clock className="h-3 w-3" />
                <span>签到时长：{sessionInfo.duration} 分钟</span>
              </div>
            </CardDescription>
          ) : (
            <CardDescription className="text-destructive">
              签到信息无效或已过期
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
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-green-600">签到成功！</h3>
                    <p className="mt-1 text-muted-foreground">
                      {result.data?.studentName}
                      {result.data?.studentId && (
                        <span className="text-xs ml-1">({result.data.studentId})</span>
                      )}
                      {" · "}{result.data?.courseName}
                    </p>
                    {result.data?.timestamp && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        签到时间：{new Date(result.data.timestamp).toLocaleTimeString("zh-CN")}
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
                    <h3 className="text-xl font-bold text-red-600">签到失败</h3>
                    <p className="mt-1 text-muted-foreground">{result.message}</p>
                  </div>
                </>
              )}
              <Button
                className="mt-4 rounded-xl"
                variant="outline"
                onClick={() => {
                  setResult(null);
                  setName("");
                }}
              >
                重新签到
              </Button>
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
              <Button
                type="submit"
                className="w-full rounded-xl"
                size="lg"
                disabled={submitting || !sessionInfo}
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : null}
                确认签到
              </Button>

              {!sessionInfo && (
                <p className="text-center text-sm text-destructive">
                  此签到链接无效或签到已结束
                </p>
              )}
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
