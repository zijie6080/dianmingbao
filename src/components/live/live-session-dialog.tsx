"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  Copy,
  Expand,
  HelpCircle,
  Loader2,
  QrCode,
  RefreshCw,
  StopCircle,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { fetchJson } from "@/lib/client";
import { formatCountdown } from "@/lib/format";
import { useNow } from "@/lib/use-now";

export type LiveKind = "attend" | "quiz";

interface QrAuth {
  bucket: number;
  signature: string;
  expiresAt: number;
  expiresIn: number;
}

interface LiveSession {
  id: string;
  token: string;
  startTime: string;
  duration: number;
  status: string;
  totalStudents: number;
  qrAuth?: QrAuth | null;
}

interface Participant {
  id: string;
  studentId: string;
  name: string;
  timestamp?: string;
}

const POLL_INTERVAL = 5000;
const DURATIONS = [3, 5, 10, 15];

const TEXT: Record<
  LiveKind,
  { noun: string; verb: string; done: string; api: string; page: string; path: string; icon: typeof QrCode }
> = {
  attend: { noun: "签到", verb: "签到", done: "已签到", api: "attendance", page: "attendance", path: "attend", icon: QrCode },
  quiz: { noun: "答题", verb: "答题", done: "已提交", api: "quiz", page: "quiz", path: "quiz", icon: HelpCircle },
};

interface Props {
  kind: LiveKind;
  courseId: string;
  courseName: string;
  /** 课程学生人数为 0 时禁止发起 */
  studentCount?: number;
  triggerClassName?: string;
}

export function LiveSessionDialog({ kind, courseId, courseName, studentCount, triggerClassName }: Props) {
  const t = TEXT[kind];
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"loading" | "select" | "active" | "ended">("select");
  const [duration, setDuration] = useState(5);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [session, setSession] = useState<LiveSession | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [qr, setQr] = useState<{ auth: QrAuth; receivedAt: number } | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [pollError, setPollError] = useState(false);

  const sessionRef = useRef<LiveSession | null>(null);
  const pollingRef = useRef(false);
  // 投屏时弹窗是关闭的（模态弹窗会让外部元素不可点击），但签到仍需继续轮询
  const visible = open || fullscreen;
  const now = useNow(500, visible && step === "active");

  const applyQr = useCallback((auth: QrAuth | null | undefined) => {
    if (auth) setQr({ auth, receivedAt: Date.now() });
  }, []);

  const activate = useCallback(
    (s: LiveSession) => {
      sessionRef.current = s;
      setSession(s);
      setParticipants([]);
      applyQr(s.qrAuth);
      setStep("active");
    },
    [applyQr]
  );

  // 拉取最新进度 + 新的二维码签名
  const poll = useCallback(async () => {
    const s = sessionRef.current;
    if (!s || pollingRef.current) return;
    pollingRef.current = true;
    const res = await fetchJson<{
      session: { status: string };
      present?: Participant[];
      submitted?: Participant[];
      totalStudents: number;
      qrAuth: QrAuth | null;
    }>(`/api/courses/${courseId}/${t.api}/${s.id}`, { timeoutMs: 10_000 });
    pollingRef.current = false;
    if (sessionRef.current?.id !== s.id) return;

    if (!res.ok || !res.data) {
      setPollError(true);
      return;
    }
    setPollError(false);
    const list = (kind === "attend" ? res.data.present : res.data.submitted) ?? [];
    setParticipants(
      [...list].sort((a, b) => (b.timestamp ?? "").localeCompare(a.timestamp ?? ""))
    );
    setSession((prev) => (prev ? { ...prev, totalStudents: res.data!.totalStudents } : prev));
    applyQr(res.data.qrAuth);
    if (res.data.session.status === "ended") {
      // 轮询只在弹窗或投屏可见时运行，因此这里直接回到弹窗显示结果
      setStep("ended");
      setFullscreen(false);
      setOpen(true);
    }
  }, [applyQr, courseId, kind, t.api]);

  // 打开弹窗时：如果有进行中的签到/答题，直接恢复显示
  async function handleOpenChange(next: boolean) {
    if (!next) {
      setOpen(false);
      setFullscreen(false);
      if (step === "active") {
        toast.info(`${t.noun}仍在进行中，再次点击「开始${t.verb}」可回到二维码`);
      }
      if (step === "ended") {
        router.refresh();
      }
      return;
    }
    setOpen(true);
    setStep("loading");
    const res = await fetchJson<LiveSession[]>(`/api/courses/${courseId}/${t.api}`);
    const active = res.ok ? res.data?.find((s) => s.status === "active") : undefined;
    if (active) {
      activate(active);
    } else {
      sessionRef.current = null;
      setSession(null);
      setStep("select");
    }
  }

  async function start() {
    if (starting) return;
    setStarting(true);
    const res = await fetchJson<LiveSession>(`/api/courses/${courseId}/${t.api}`, {
      method: "POST",
      json: { duration },
    });
    setStarting(false);
    if (res.ok && res.data) {
      activate(res.data);
      toast.success(`${t.noun}已开始`);
      router.refresh();
    } else {
      toast.error(res.error || `发起${t.noun}失败`);
    }
  }

  async function end() {
    const s = sessionRef.current;
    if (!s || ending) return;
    setEnding(true);
    const res = await fetchJson(`/api/courses/${courseId}/${t.api}/${s.id}`, { method: "PUT" });
    setEnding(false);
    if (res.ok) {
      toast.success(`${t.noun}已结束`);
      sessionRef.current = null;
      setOpen(false);
      setFullscreen(false);
      setStep("select");
      router.push(`/courses/${courseId}/${t.page}/${s.id}`);
      router.refresh();
    } else {
      toast.error(res.error || "结束失败，请重试");
    }
  }

  // 每 5 秒轮询；页面切到后台时暂停，回到前台立即刷新
  useEffect(() => {
    if (!visible || step !== "active") return;
    const tick = () => {
      if (!document.hidden) void poll();
    };
    tick();
    const timer = setInterval(tick, POLL_INTERVAL);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [visible, step, poll]);

  // 二维码到期的瞬间立即换新（不必等下一次轮询）
  const qrSecondsLeft = qr ? Math.max(0, (qr.auth.expiresIn - (now - qr.receivedAt)) / 1000) : 0;
  const qrExpired = !!qr && qrSecondsLeft <= 0;
  useEffect(() => {
    if (visible && step === "active" && qrExpired) void poll();
  }, [visible, step, qrExpired, poll]);

  function enterProjector() {
    setFullscreen(true);
    setOpen(false);
  }

  const exitProjector = useCallback(() => {
    setFullscreen(false);
    setOpen(true);
  }, []);

  // 投屏模式下按 Esc 退出
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") exitProjector();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen, exitProjector]);

  // 以服务器时间计算剩余时长，避免老师电脑时钟不准
  const serverOffset = qr ? qr.auth.expiresAt - qr.auth.expiresIn - qr.receivedAt : 0;
  const endsAt = session ? Date.parse(session.startTime) + session.duration * 60_000 : 0;
  const sessionSecondsLeft = session ? Math.max(0, (endsAt - (now + serverOffset)) / 1000) : 0;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const qrUrl =
    session && qr ? `${origin}/${t.path}/${session.token}?t=${qr.auth.bucket}&sig=${qr.auth.signature}` : "";
  const qrImage = qrUrl ? `/api/qr?url=${encodeURIComponent(qrUrl)}` : "";

  const total = session?.totalStudents ?? 0;
  const count = participants.length;
  const percent = total > 0 ? Math.min(100, Math.round((count / total) * 100)) : 0;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(qrUrl);
      toast.success("链接已复制（1 分钟内有效）");
    } catch {
      toast.error("复制失败，请长按二维码下方链接手动复制");
    }
  }

  const TriggerIcon = t.icon;
  const noStudents = studentCount === 0;

  const qrBox = (size: string) => (
    <div className={`relative flex items-center justify-center rounded-2xl bg-white p-3 ring-1 ring-border ${size}`}>
      {qrImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- 动态生成的 PNG，无需 next/image 优化
        <img src={qrImage} alt={`${t.noun}二维码`} className="h-full w-full object-contain" />
      ) : (
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      )}
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange} disablePointerDismissal={step === "active"}>
        <DialogTrigger asChild>
          <Button
            className={`gap-2 rounded-xl ${triggerClassName ?? ""}`}
            disabled={noStudents}
            title={noStudents ? "请先添加学生" : undefined}
          >
            <TriggerIcon className="h-4 w-4" />
            开始{t.verb}
          </Button>
        </DialogTrigger>

        <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-2xl sm:max-w-md">
          {step === "loading" && (
            <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
              <DialogTitle className="sr-only">加载中</DialogTitle>
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">加载中…</p>
            </div>
          )}

          {step === "select" && (
            <>
              <DialogHeader>
                <DialogTitle>发起{t.noun}</DialogTitle>
                <DialogDescription>{courseName} · 选择时长，学生扫码即可{t.verb}</DialogDescription>
              </DialogHeader>
              <div className="space-y-5 pt-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t.noun}时长</p>
                  <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label={`${t.noun}时长`}>
                    {DURATIONS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        role="radio"
                        aria-checked={duration === d}
                        onClick={() => setDuration(d)}
                        className={`rounded-xl border py-2.5 text-sm font-medium transition-colors ${
                          duration === d
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        {d} 分钟
                      </button>
                    ))}
                  </div>
                </div>
                <Button className="h-11 w-full rounded-xl" onClick={start} disabled={starting}>
                  {starting ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <TriggerIcon className="mr-2 h-5 w-5" />
                  )}
                  开始{t.verb}
                </Button>
              </div>
            </>
          )}

          {step === "active" && session && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
                  </span>
                  {t.noun}进行中
                  <span className="ml-auto mr-6 font-mono text-sm font-normal tabular-nums text-muted-foreground">
                    剩余 {formatCountdown(sessionSecondsLeft)}
                  </span>
                </DialogTitle>
                <DialogDescription>{courseName} · 请学生用微信扫码</DialogDescription>
              </DialogHeader>

              <div className="flex flex-col items-center gap-4">
                {qrBox("aspect-square w-full max-w-[300px]")}

                <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5" />
                    {Math.ceil(qrSecondsLeft)} 秒后刷新（防截图转发）
                  </span>
                  <span className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-7 rounded-lg px-2 text-xs" onClick={copyLink}>
                      <Copy className="mr-1 h-3.5 w-3.5" />
                      复制链接
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 rounded-lg px-2 text-xs"
                      onClick={enterProjector}
                    >
                      <Expand className="mr-1 h-3.5 w-3.5" />
                      投屏
                    </Button>
                  </span>
                </div>

                {/* 进度 */}
                <div className="w-full rounded-xl bg-muted/60 p-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-medium">{t.done}</span>
                    <span>
                      <span className="text-2xl font-bold tabular-nums text-primary">{count}</span>
                      <span className="text-sm text-muted-foreground"> / {total}</span>
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
                  </div>
                  {pollError && (
                    <p className="mt-2 text-xs text-amber-600">网络不稳定，正在重试…（不影响学生{t.verb}）</p>
                  )}
                </div>

                {participants.length > 0 && (
                  <div className="w-full">
                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">最新{t.done}</p>
                    <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
                      {participants.map((p) => (
                        <span key={p.id} className="rounded-lg bg-green-50 px-2 py-1 text-xs text-green-700">
                          {p.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <Button variant="destructive" className="h-11 w-full rounded-xl" onClick={end} disabled={ending}>
                  {ending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <StopCircle className="mr-2 h-5 w-5" />}
                  结束{t.noun}并查看结果
                </Button>
              </div>
            </>
          )}

          {step === "ended" && session && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <DialogTitle>{t.noun}已结束</DialogTitle>
                <DialogDescription className="mt-1">
                  {t.done} {count} / {total} 人
                </DialogDescription>
              </div>
              <Button
                className="w-full rounded-xl"
                onClick={() => {
                  setOpen(false);
                  router.push(`/courses/${courseId}/${t.page}/${session.id}`);
                }}
              >
                查看详情
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 投屏模式：大二维码，方便教室后排扫码 */}
      {fullscreen && step === "active" && session && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6 bg-white p-6">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 rounded-full"
            onClick={exitProjector}
            aria-label="退出投屏"
          >
            <X className="h-6 w-6" />
          </Button>
          <div className="text-center">
            <p className="text-2xl font-bold sm:text-3xl">{courseName} · 扫码{t.verb}</p>
            <p className="mt-2 text-muted-foreground">
              剩余 {formatCountdown(sessionSecondsLeft)} · 二维码 {Math.ceil(qrSecondsLeft)} 秒后刷新
            </p>
          </div>
          {qrBox("aspect-square w-[min(70dvh,85vw)]")}
          <p className="text-3xl font-bold tabular-nums">
            <span className="text-primary">{count}</span>
            <span className="text-xl text-muted-foreground"> / {total} {t.done}</span>
          </p>
        </div>
      )}
    </>
  );
}
