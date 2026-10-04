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
  Bell,
  BellOff,
  CheckCircle2,
  Copy,
  Expand,
  HelpCircle,
  Loader2,
  Plus,
  QrCode,
  RefreshCw,
  StopCircle,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { fetchJson } from "@/lib/client";
import { formatCountdown } from "@/lib/format";
import { useNow } from "@/lib/use-now";
import { loadChimePref, playChime, saveChimePref } from "@/lib/chime";
import { cn } from "@/lib/utils";
import { RollCall } from "./roll-call";

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

type Step = "loading" | "select" | "active" | "rollcall" | "ended";

const POLL_INTERVAL = 5000;
const DURATIONS = [3, 5, 10, 15];
/** 最后多少秒进入「快结束了」状态 */
const URGENT_SECONDS = 30;

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
  /** 主操作用实心按钮，次操作用描边按钮 */
  triggerVariant?: "default" | "outline";
}

/** 每门课记住上次选择的时长，下次直接用 */
function durationKey(kind: LiveKind, courseId: string) {
  return `dmb-duration-${kind}-${courseId}`;
}
function loadDuration(kind: LiveKind, courseId: string): number {
  try {
    const v = Number(localStorage.getItem(durationKey(kind, courseId)));
    return DURATIONS.includes(v) ? v : 5;
  } catch {
    return 5;
  }
}

export function LiveSessionDialog({ kind, courseId, courseName, studentCount, triggerVariant = "default" }: Props) {
  const t = TEXT[kind];
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("select");
  const [duration, setDuration] = useState(5);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [extending, setExtending] = useState(false);
  const [session, setSession] = useState<LiveSession | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [qr, setQr] = useState<{ auth: QrAuth; receivedAt: number } | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [pollError, setPollError] = useState(false);
  const [chime, setChime] = useState(false);

  const sessionRef = useRef<LiveSession | null>(null);
  const pollingRef = useRef(false);
  const lastCountRef = useRef<number | null>(null);
  const chimeRef = useRef(false);
  // 投屏时弹窗是关闭的（模态弹窗会让外部元素不可点击），但签到仍需继续轮询
  const visible = open || fullscreen;
  const now = useNow(500, visible && step === "active");

  const applyQr = useCallback((auth: QrAuth | null | undefined) => {
    if (auth) setQr({ auth, receivedAt: Date.now() });
  }, []);

  const activate = useCallback(
    (s: LiveSession) => {
      sessionRef.current = s;
      lastCountRef.current = null;
      setSession(s);
      setParticipants([]);
      applyQr(s.qrAuth);
      setStep("active");
    },
    [applyQr]
  );

  /** 本轮结束后：签到进入点名核对，答题显示结果 */
  const finish = useCallback(() => {
    setFullscreen(false);
    setOpen(true);
    setStep(kind === "attend" ? "rollcall" : "ended");
  }, [kind]);

  // 拉取最新进度 + 新的二维码签名
  const poll = useCallback(async () => {
    const s = sessionRef.current;
    if (!s || pollingRef.current) return;
    pollingRef.current = true;
    const res = await fetchJson<{
      session: { status: string; duration: number };
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
    // 有新同学签到时播放提示音（第一次加载不响）
    if (chimeRef.current && lastCountRef.current !== null && list.length > lastCountRef.current) playChime();
    lastCountRef.current = list.length;
    setParticipants([...list].sort((a, b) => (b.timestamp ?? "").localeCompare(a.timestamp ?? "")));
    setSession((prev) =>
      prev ? { ...prev, totalStudents: res.data!.totalStudents, duration: res.data!.session.duration ?? prev.duration } : prev
    );
    applyQr(res.data.qrAuth);
    // 轮询只在弹窗或投屏可见时运行，因此这里直接回到弹窗显示结果
    if (res.data.session.status === "ended") finish();
  }, [applyQr, courseId, finish, kind, t.api]);

  // 打开弹窗时：如果有进行中的签到/答题，直接恢复显示
  async function handleOpenChange(next: boolean) {
    if (!next) {
      setOpen(false);
      setFullscreen(false);
      if (step === "active") {
        toast.info(`${t.noun}仍在进行中，再次点击「开始${t.verb}」可回到二维码`);
      }
      if (step === "rollcall" || step === "ended") {
        setStep("select");
        router.refresh();
      }
      return;
    }
    setOpen(true);
    setStep("loading");
    setDuration(loadDuration(kind, courseId));
    const pref = loadChimePref();
    setChime(pref);
    chimeRef.current = pref;
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
    try {
      localStorage.setItem(durationKey(kind, courseId), String(duration));
    } catch {
      // ignore
    }
    const res = await fetchJson<LiveSession>(`/api/courses/${courseId}/${t.api}`, {
      method: "POST",
      json: { duration },
    });
    setStarting(false);
    if (res.ok && res.data) {
      activate(res.data);
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
      finish();
      router.refresh();
    } else {
      toast.error(res.error || "结束失败，请重试");
    }
  }

  const extend = useCallback(async () => {
    const s = sessionRef.current;
    if (!s || extending) return;
    setExtending(true);
    const res = await fetchJson<{ duration: number }>(`/api/courses/${courseId}/${t.api}/${s.id}`, {
      method: "PATCH",
      json: { extendMinutes: 1 },
    });
    setExtending(false);
    if (res.ok && res.data) {
      const duration = res.data.duration;
      setSession((prev) => (prev ? { ...prev, duration } : prev));
      if (sessionRef.current) sessionRef.current = { ...sessionRef.current, duration };
      toast.success("已延长 1 分钟");
    } else {
      toast.error(res.error || "延长失败");
    }
  }, [courseId, extending, t.api]);

  function toggleChime() {
    const next = !chime;
    setChime(next);
    chimeRef.current = next;
    saveChimePref(next);
    if (next) playChime();
  }

  function goDetail() {
    const s = sessionRef.current ?? session;
    setOpen(false);
    setStep("select");
    sessionRef.current = null;
    if (s) router.push(`/courses/${courseId}/${t.page}/${s.id}`);
    router.refresh();
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

  // 以服务器时间计算剩余时长，避免老师电脑时钟不准
  const serverOffset = qr ? qr.auth.expiresAt - qr.auth.expiresIn - qr.receivedAt : 0;
  const totalSeconds = session ? session.duration * 60 : 0;
  const endsAt = session ? Date.parse(session.startTime) + session.duration * 60_000 : 0;
  const sessionSecondsLeft = session ? Math.max(0, (endsAt - (now + serverOffset)) / 1000) : 0;
  const urgent = step === "active" && sessionSecondsLeft > 0 && sessionSecondsLeft <= URGENT_SECONDS;
  const timeFraction = totalSeconds > 0 ? sessionSecondsLeft / totalSeconds : 0;

  // 时间到了：立即拉取一次，让服务端结束本轮并进入下一步
  const timeUp = step === "active" && !!session && sessionSecondsLeft <= 0;
  useEffect(() => {
    if (visible && timeUp) void poll();
  }, [visible, timeUp, poll]);

  function enterProjector() {
    setFullscreen(true);
    setOpen(false);
  }

  const exitProjector = useCallback(() => {
    setFullscreen(false);
    setOpen(true);
  }, []);

  // 快捷键：+ 延长、F 投屏切换、Esc 退出投屏（输入框中不触发）。
  // 刻意不提供「结束」快捷键：投屏电脑上误触一下会让全班签到提前结束。
  useEffect(() => {
    if (!visible || step !== "active") return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        void extend();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        if (fullscreen) exitProjector();
        else enterProjector();
      } else if (e.key === "Escape" && fullscreen) {
        exitProjector();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, step, fullscreen, extend, exitProjector]);

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
    <div
      className={cn(
        "relative flex items-center justify-center rounded-lg bg-white p-3 ring-1 ring-border transition-shadow duration-300",
        urgent && "ring-[3px] ring-[var(--tone-orange)]",
        size
      )}
    >
      {qrImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- 动态生成的 PNG，无需 next/image 优化
        <img src={qrImage} alt={`${t.noun}二维码`} className="h-full w-full object-contain" />
      ) : (
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      )}
    </div>
  );

  /** 人数：每次增加时轻轻「弹」一下 */
  const countPop = (className: string) => (
    <span key={count} className={cn("num inline-block font-semibold animate-in zoom-in-90 duration-300", className)}>
      {count}
    </span>
  );

  const timeText = (
    <span className={cn("num", urgent ? "font-medium text-tone-orange" : "text-muted-foreground")}>
      剩余 {formatCountdown(sessionSecondsLeft)}
    </span>
  );

  const nameChips = (limit: number, chipClass: string) => (
    <div className="flex flex-wrap gap-1.5">
      {participants.slice(0, limit).map((p) => (
        <span
          key={p.id}
          className={cn("tag tag-green animate-in fade-in slide-in-from-bottom-1 duration-300", chipClass)}
        >
          {p.name}
        </span>
      ))}
      {participants.length > limit && (
        <span className={cn("tag tag-gray", chipClass)}>+{participants.length - limit}</span>
      )}
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange} disablePointerDismissal={step === "active" || step === "rollcall"}>
        <DialogTrigger asChild>
          <Button
            variant={triggerVariant}
            className="gap-1.5"
            disabled={noStudents}
            title={noStudents ? "请先添加学生" : undefined}
          >
            <TriggerIcon className="h-4 w-4" />
            开始{t.verb}
          </Button>
        </DialogTrigger>

        <DialogContent className={cn("max-h-[92dvh] overflow-y-auto", step === "rollcall" ? "sm:max-w-2xl" : "sm:max-w-md")}>
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
                        className={cn(
                          "rounded-md border py-2.5 text-sm font-medium transition-colors",
                          duration === d ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted"
                        )}
                      >
                        {d} 分钟
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">进行中可随时「+1 分钟」延长</p>
                </div>
                <Button className="h-11 w-full" onClick={start} disabled={starting}>
                  {starting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <TriggerIcon className="mr-2 h-5 w-5" />}
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
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#448361] opacity-40 motion-reduce:hidden" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#448361]" />
                  </span>
                  {t.noun}进行中
                  <span className="ml-auto mr-6 text-sm font-normal">{timeText}</span>
                </DialogTitle>
                <DialogDescription>{courseName} · 请学生用微信扫码</DialogDescription>
              </DialogHeader>

              <div className="flex flex-col items-center gap-4">
                {qrBox("aspect-square w-full max-w-[300px]")}

                <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5" />
                    {Math.ceil(qrSecondsLeft)} 秒后刷新
                  </span>
                  <span className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={copyLink}>
                      <Copy className="mr-1 h-3.5 w-3.5" />
                      复制链接
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={enterProjector} title="快捷键 F">
                      <Expand className="mr-1 h-3.5 w-3.5" />
                      投屏
                    </Button>
                  </span>
                </div>

                {/* 进度 */}
                <div className="w-full rounded-lg border border-border p-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-medium">{t.done}</span>
                    <span>
                      {countPop("text-2xl text-foreground")}
                      <span className="text-sm text-muted-foreground"> / {total}</span>
                    </span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${percent}%` }} />
                  </div>
                  {pollError && (
                    <p className="mt-2 text-xs text-tone-orange">网络不稳定，正在重试…（不影响学生{t.verb}）</p>
                  )}
                </div>

                {participants.length > 0 && (
                  <div className="w-full">
                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">最新{t.done}</p>
                    <div className="max-h-28 overflow-y-auto">{nameChips(40, "h-6 px-2")}</div>
                  </div>
                )}

                <div className="grid w-full grid-cols-[auto_1fr] gap-2">
                  <Button variant="outline" className="h-11" onClick={extend} disabled={extending} title="快捷键 +">
                    {extending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    1 分钟
                  </Button>
                  <Button variant="destructive" className="h-11" onClick={end} disabled={ending}>
                    {ending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <StopCircle className="mr-2 h-5 w-5" />}
                    结束{t.noun}
                    {kind === "attend" ? "并核对" : "并查看结果"}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  快捷键：<kbd className="rounded border border-border px-1">+</kbd> 延长 1 分钟 ·{" "}
                  <kbd className="rounded border border-border px-1">F</kbd> 投屏
                </p>
              </div>
            </>
          )}

          {step === "rollcall" && session && (
            <>
              <DialogTitle className="sr-only">点名核对</DialogTitle>
              <RollCall courseId={courseId} sessionId={session.id} onDone={goDetail} />
            </>
          )}

          {step === "ended" && session && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--tag-green-bg)] text-[var(--tag-green-fg)]">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <DialogTitle>{t.noun}已结束</DialogTitle>
                <DialogDescription className="mt-1">
                  {t.done} {count} / {total} 人
                </DialogDescription>
              </div>
              <Button className="w-full" onClick={goDetail}>
                查看详情
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 投屏模式：大二维码 + 名字墙，方便教室后排扫码 */}
      {fullscreen && step === "active" && session && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-background">
          {/* 剩余时间条：最后 30 秒变橙色 */}
          <div className="h-1.5 w-full bg-secondary">
            <div
              className={cn("h-full transition-[width] duration-500 ease-linear", urgent ? "bg-[var(--tone-orange)]" : "bg-primary")}
              style={{ width: `${Math.max(0, Math.min(100, timeFraction * 100))}%` }}
            />
          </div>

          <div className="flex items-center justify-between px-6 pt-4">
            <p className="text-xl font-semibold tracking-tight sm:text-2xl">
              {courseName} · 微信扫码{t.verb}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={toggleChime} aria-label={chime ? "关闭提示音" : "开启提示音"} title={chime ? "关闭提示音" : "开启提示音"}>
                {chime ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5 text-muted-foreground" />}
              </Button>
              <Button variant="outline" onClick={extend} disabled={extending} title="快捷键 +">
                <Plus className="h-4 w-4" />1 分钟
              </Button>
              <Button variant="ghost" size="icon" onClick={exitProjector} aria-label="退出投屏" title="退出投屏（Esc）">
                <X className="h-6 w-6" />
              </Button>
            </div>
          </div>

          <div className="grid flex-1 items-center gap-8 overflow-hidden p-6 lg:grid-cols-[auto_1fr] lg:gap-12 lg:px-12">
            <div className="flex flex-col items-center gap-3">
              {qrBox("aspect-square w-[min(62dvh,80vw)]")}
              <p className="text-sm text-muted-foreground">
                {timeText} · 二维码 {Math.ceil(qrSecondsLeft)} 秒后刷新
              </p>
            </div>

            <div className="flex min-h-0 flex-col self-stretch py-4">
              <p className="text-muted-foreground">{t.done}</p>
              <p className="mt-1 leading-none">
                {countPop("text-7xl text-foreground")}
                <span className="num text-3xl text-muted-foreground"> / {total}</span>
              </p>
              <div className="mt-4 h-2 max-w-md overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${percent}%` }} />
              </div>
              {participants.length > 0 ? (
                <div className="mt-8 min-h-0 overflow-hidden">{nameChips(60, "h-9 px-3 text-base")}</div>
              ) : (
                <p className="mt-8 text-lg text-muted-foreground">等待第一位同学扫码…</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
