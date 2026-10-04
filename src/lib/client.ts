"use client";

export interface ApiResult<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
  code?: string;
  message?: string;
}

/**
 * 带超时的 JSON 请求。
 * - 网络断开 / 超时 / 服务端返回 HTML 错误页时都不会抛异常，统一返回 { ok: false, error }
 * - 默认 15 秒超时，避免弱网下按钮一直转圈
 */
export async function fetchJson<T = unknown>(
  url: string,
  init: RequestInit & { timeoutMs?: number; json?: unknown } = {}
): Promise<ApiResult<T>> {
  const { timeoutMs = 15_000, json, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...rest,
      headers: json !== undefined ? { "Content-Type": "application/json", ...rest.headers } : rest.headers,
      body: json !== undefined ? JSON.stringify(json) : rest.body,
      signal: controller.signal,
    });

    let body: { success?: boolean; data?: T; error?: string; code?: string; message?: string } | null = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }

    if (!body) {
      return {
        ok: false,
        status: res.status,
        error: res.status === 429 ? "操作太频繁，请稍后再试" : "服务器开小差了，请稍后重试",
      };
    }

    if (res.status === 401 && typeof window !== "undefined" && !url.startsWith("/api/auth")) {
      // 登录过期：跳回登录页
      const from = window.location.pathname + window.location.search;
      window.location.href = `/login?from=${encodeURIComponent(from)}`;
    }

    return {
      ok: res.ok && body.success !== false,
      status: res.status,
      data: body.data,
      error: body.error,
      code: body.code,
      message: body.message,
    };
  } catch (error) {
    const aborted = error instanceof DOMException && error.name === "AbortError";
    return {
      ok: false,
      status: 0,
      error: aborted ? "请求超时，请检查网络后重试" : "网络连接失败，请检查网络后重试",
    };
  } finally {
    clearTimeout(timer);
  }
}

const DEVICE_KEY = "dmb-device-id";

/**
 * 每台设备一个随机 ID（localStorage + Cookie 双份保存）。
 * 用于「同一设备只能为一人签到」。不用浏览器特征哈希：同型号手机特征完全相同，会误伤正常学生。
 */
export function getDeviceId(): string {
  let id = "";
  try {
    id = localStorage.getItem(DEVICE_KEY) || "";
  } catch {
    // 隐私模式等情况下 localStorage 不可用
  }
  if (!id) {
    const match = document.cookie.match(new RegExp(`(?:^|; )${DEVICE_KEY}=([^;]+)`));
    id = match ? decodeURIComponent(match[1]) : "";
  }
  if (!/^[\w-]{8,64}$/.test(id)) {
    // randomUUID 仅在 HTTPS 下可用，HTTP 局域网调试时降级
    id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  }
  try {
    localStorage.setItem(DEVICE_KEY, id);
  } catch {
    // ignore
  }
  document.cookie = `${DEVICE_KEY}=${encodeURIComponent(id)}; path=/; max-age=31536000; samesite=lax`;
  return id;
}
