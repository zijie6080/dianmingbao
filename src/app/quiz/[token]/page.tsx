"use client";

import { useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Clock, Loader2, QrCode, RefreshCw, Smartphone, WifiOff, XCircle } from "lucide-react";
import { StatusView, StudentShell } from "@/components/student/student-shell";
import { CourseAvatar } from "@/components/app/course-visuals";
import { saveName, useSessionTicket } from "@/components/student/use-session-ticket";
import { fetchJson, getDeviceId } from "@/lib/client";
import { formatCountdown, formatTime } from "@/lib/format";
import { useNow } from "@/lib/use-now";

const MAX_ANSWER = 5000;

interface QuizResult {
  studentName: string;
  studentId: string;
  courseName: string;
  answer: string;
  timestamp: string;
  already?: boolean;
}

export default function QuizPage() {
  const { token } = useParams<{ token: string }>();
  const session = useSessionTicket("quiz", token);
  const [nameInput, setName] = useState<string | null>(null);
  const name = nameInput ?? session.savedName;
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [result, setResult] = useState<QuizResult | null>(null);
  const submittingRef = useRef(false);
  const now = useNow(1000, session.status === "ready" && !result);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedAnswer = answer.trim();
    if (!trimmedName) {
      setFormError("请输入你的姓名");
      return;
    }
    if (!trimmedAnswer) {
      setFormError("请输入你的答案");
      return;
    }
    if (!session.info || submittingRef.current) return;

    submittingRef.current = true;
    setSubmitting(true);
    setFormError("");

    const res = await fetchJson<QuizResult>("/api/quiz-submit", {
      method: "POST",
      json: {
        token,
        name: trimmedName,
        answer: trimmedAnswer,
        accessTicket: session.info.accessTicket,
        fingerprint: getDeviceId(),
      },
    });

    submittingRef.current = false;
    setSubmitting(false);

    if (res.ok && res.data) {
      saveName(trimmedName);
      setResult(res.data);
      session.setDone({ name: res.data.studentName, time: res.data.timestamp });
    } else {
      // 答案保留在输入框中，不会因为失败而丢失
      setFormError(res.error || "提交失败，请重试");
    }
  }

  if (session.status === "loading") {
    return (
      <StudentShell>
        <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
          <Loader2 className="h-7 w-7 animate-spin" />
          <p className="text-sm">正在加载答题信息…</p>
        </div>
      </StudentShell>
    );
  }

  if (result) {
    return (
      <StudentShell>
        <StatusView
          tone="success"
          icon={<CheckCircle2 className="h-9 w-9" />}
          title={result.already ? "你已经提交过了" : "提交成功"}
        >
          <p className="text-base font-medium">
            {result.studentName}
            <span className="ml-1 text-sm font-normal text-muted-foreground">{result.studentId}</span>
          </p>
          <p className="text-sm text-muted-foreground">{result.courseName}</p>
          <p className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap break-words bg-muted/60 px-3 py-2 text-left text-sm">
            {result.answer}
          </p>
          <p className="pt-2 text-xs text-muted-foreground">提交时间 {formatTime(result.timestamp)}</p>
        </StatusView>
      </StudentShell>
    );
  }

  if (session.done) {
    return (
      <StudentShell>
        <StatusView tone="success" icon={<Smartphone className="h-8 w-8" />} title="本设备已提交答案">
          {session.done.name && <p className="text-base font-medium">{session.done.name}</p>}
          {session.done.time && (
            <p className="text-xs text-muted-foreground">提交时间 {formatTime(session.done.time)}</p>
          )}
          <p className="pt-2 text-sm text-muted-foreground">每台手机每轮只能为一位同学提交</p>
        </StatusView>
      </StudentShell>
    );
  }

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
          title={isNetwork ? "网络连接失败" : isExpiredQr ? "二维码已过期" : "无法答题"}
        >
          <p className="text-sm text-muted-foreground">{session.error}</p>
          {(isNetwork || isExpiredQr) && (
            <div className="pt-3">
              {isNetwork ? (
                <Button variant="outline"  onClick={session.reload}>
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

  const secondsLeft = (Date.parse(session.info.endsAt) - now) / 1000;
  return (
    <StudentShell>
      <div className="mb-7">
        <div className="mb-4 flex items-center gap-2">
          <CourseAvatar id={session.info.courseName} name={session.info.courseName} size={40} />
          <span className="tag tag-gray">课堂答题</span>
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{session.info.courseName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">授课教师：{session.info.teacherName}</p>
        <div
          className={`num mt-3 inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium ${
            secondsLeft < 60 ? "bg-[var(--tag-red-bg)] text-[var(--tag-red-fg)]" : "bg-secondary text-muted-foreground"
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          {secondsLeft > 0 ? `剩余 ${formatCountdown(secondsLeft)}` : "答题即将结束"}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="name">姓名</Label>
          <Input
            id="name"
            placeholder="请输入名单上的姓名"
            className="h-12 text-lg"
            value={name}
            maxLength={50}
            autoComplete="name"
            onChange={(e) => {
              setName(e.target.value);
              if (formError) setFormError("");
            }}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="answer">答案</Label>
            <span className="text-xs text-muted-foreground">
              {answer.length}/{MAX_ANSWER}
            </span>
          </div>
          <Textarea
            id="answer"
            placeholder="请输入你的答案"
            className="min-h-[140px] text-base"
            value={answer}
            maxLength={MAX_ANSWER}
            onChange={(e) => {
              setAnswer(e.target.value);
              if (formError) setFormError("");
            }}
          />
        </div>
        {formError && (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        )}
        <Button type="submit" className="h-12 w-full text-base" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
          {submitting ? "提交中…" : "提交答案"}
        </Button>
        <p className="text-xs text-muted-foreground">提交后不可修改，每台手机每轮只能为一位同学提交</p>
      </form>
    </StudentShell>
  );
}
