"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchJson } from "@/lib/client";

export type SessionKind = "attend" | "quiz";

export interface SessionInfo {
  courseName: string;
  teacherName: string;
  duration: number;
  endsAt: string;
  accessTicket: string;
}

export interface DoneMarker {
  name: string;
  time: string;
}

interface State {
  status: "loading" | "ready" | "error";
  info: SessionInfo | null;
  error: string;
  code?: string;
  done: DoneMarker | null;
  /** 上次在本设备填写的姓名，用于预填 */
  savedName: string;
}

const ENDPOINT: Record<SessionKind, string> = {
  attend: "/api/check-session",
  quiz: "/api/check-quiz",
};

function ticketKey(kind: SessionKind, token: string) {
  return `dmb-${kind}-ticket-${token}`;
}

function doneCookie(kind: SessionKind, token: string) {
  // 沿用旧 Cookie 名，升级后已签到的设备仍能识别
  return kind === "attend" ? `attended_${token}` : `quiz_${token}`;
}

function readDone(kind: SessionKind, token: string): DoneMarker | null {
  const name = doneCookie(kind, token);
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  if (!match) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1]));
    if (parsed && typeof parsed.name === "string") return parsed;
  } catch {
    // 旧版本写入的是 "1"
  }
  return { name: "", time: "" };
}

/** 记录「本设备已完成」，刷新页面后直接显示结果 */
export function markDone(kind: SessionKind, token: string, marker: DoneMarker) {
  const value = encodeURIComponent(JSON.stringify(marker));
  document.cookie = `${doneCookie(kind, token)}=${value}; path=/; max-age=86400; samesite=lax`;
}

function readCachedTicket(kind: SessionKind, token: string): SessionInfo | null {
  try {
    const raw = sessionStorage.getItem(ticketKey(kind, token));
    if (!raw) return null;
    const info = JSON.parse(raw) as SessionInfo;
    return Date.parse(info.endsAt) > Date.now() ? info : null;
  } catch {
    return null;
  }
}

/**
 * 扫码后校验二维码签名并换取访问凭证。
 * 凭证缓存在 sessionStorage：学生刷新页面时，即使二维码已经刷新也不会被拦住。
 */
export function useSessionTicket(kind: SessionKind, token: string) {
  const [state, setState] = useState<State>({
    status: "loading",
    info: null,
    error: "",
    done: null,
    savedName: "",
  });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    (async () => {
      const query = new URLSearchParams(window.location.search);
      query.set("token", token);
      const res = await fetchJson<SessionInfo>(`${ENDPOINT[kind]}?${query.toString()}`);
      if (cancelled) return;

      const done = readDone(kind, token);
      const savedName = loadSavedName();

      if (res.ok && res.data) {
        try {
          sessionStorage.setItem(ticketKey(kind, token), JSON.stringify(res.data));
        } catch {
          // ignore
        }
        setState({ status: "ready", info: res.data, error: "", done, savedName });
        return;
      }

      // 二维码过期但本页之前已拿到凭证（例如刷新页面）
      if (res.code === "QR_EXPIRED") {
        const cached = readCachedTicket(kind, token);
        if (cached) {
          setState({ status: "ready", info: cached, error: "", done, savedName });
          return;
        }
      }

      setState({
        status: "error",
        info: null,
        error: res.error || "链接无效或已过期",
        code: res.code ?? (res.status === 0 ? "NETWORK" : undefined),
        done,
        savedName,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [kind, token, reloadKey]);

  const reload = useCallback(() => {
    setState((prev) => ({ ...prev, status: "loading" }));
    setReloadKey((k) => k + 1);
  }, []);

  const setDone = useCallback(
    (marker: DoneMarker) => {
      markDone(kind, token, marker);
      setState((prev) => ({ ...prev, done: marker }));
    },
    [kind, token]
  );

  return { ...state, reload, setDone };
}

const NAME_KEY = "dmb-student-name";

/** 记住学生上次填写的姓名，下次签到免输入 */
export function loadSavedName(): string {
  try {
    return localStorage.getItem(NAME_KEY) || "";
  } catch {
    return "";
  }
}

export function saveName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    // ignore
  }
}
