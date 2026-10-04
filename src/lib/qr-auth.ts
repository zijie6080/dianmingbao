import { createHmac, timingSafeEqual } from "crypto";

/**
 * 动态二维码签名：二维码中的链接携带 (时间片, 签名)，每 30 秒换一次。
 * 学生扫码后用有效签名换取一张「访问凭证」（有效期到本轮签到/答题结束），
 * 提交时校验凭证。这样拍照转发、远程分享的旧二维码最多 60 秒后就失效。
 */

export const QR_WINDOW_MS = 30_000;

/** 不同用途使用不同前缀，防止答题二维码被拿去签到 */
export type QrScope = "quiz" | "attend";

const PREFIX: Record<QrScope, { qr: string; ticket: string }> = {
  // 答题沿用原有前缀，保证已发出的二维码/凭证在升级后仍有效
  quiz: { qr: "qr", ticket: "ticket" },
  attend: { qr: "attend-qr", ticket: "attend-ticket" },
};

function sign(value: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET must be set");
  return createHmac("sha256", secret).update(value).digest("hex");
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface QrAuth {
  bucket: number;
  signature: string;
  /** 当前二维码失效的绝对时间（服务器时钟） */
  expiresAt: number;
  /** 距离二维码刷新的毫秒数，前端用它做倒计时，避免客户端时钟误差 */
  expiresIn: number;
}

export function createQrAuth(scope: QrScope, token: string, now = Date.now()): QrAuth {
  const bucket = Math.floor(now / QR_WINDOW_MS);
  const expiresAt = (bucket + 1) * QR_WINDOW_MS;
  return {
    bucket,
    signature: sign(`${PREFIX[scope].qr}:${token}:${bucket}`).slice(0, 24),
    expiresAt,
    expiresIn: expiresAt - now,
  };
}

/** 允许当前和上一个时间片（扫码时恰好刷新也不会失败） */
export function verifyQrAuth(
  scope: QrScope,
  token: string,
  bucket: number,
  signature: string,
  now = Date.now()
): boolean {
  if (!Number.isInteger(bucket) || !signature) return false;
  const currentBucket = Math.floor(now / QR_WINDOW_MS);
  if (bucket < currentBucket - 1 || bucket > currentBucket) return false;
  const expected = sign(`${PREFIX[scope].qr}:${token}:${bucket}`).slice(0, 24);
  return safeEqual(signature, expected);
}

export function createAccessTicket(scope: QrScope, sessionId: string, expiresAt: Date): string {
  const expires = expiresAt.getTime();
  const signature = sign(`${PREFIX[scope].ticket}:${sessionId}:${expires}`).slice(0, 32);
  return `${expires}.${signature}`;
}

export function verifyAccessTicket(
  scope: QrScope,
  ticket: string,
  sessionId: string,
  now = Date.now(),
  options: { ignoreExpiry?: boolean } = {}
): boolean {
  const [expiresText, signature] = ticket.split(".");
  const expires = Number(expiresText);
  if (!Number.isFinite(expires) || !signature) return false;
  if (!options.ignoreExpiry && expires < now) return false;
  const expected = sign(`${PREFIX[scope].ticket}:${sessionId}:${expires}`).slice(0, 32);
  return safeEqual(signature, expected);
}
