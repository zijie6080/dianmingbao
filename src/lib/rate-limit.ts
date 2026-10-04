/**
 * 轻量级内存限流（固定窗口）。
 *
 * 注意：在 Vercel 等 Serverless 环境中，每个实例各自计数，
 * 所以这是「尽力而为」的防护：足以挡住单个脚本的暴力尝试和误操作连点，
 * 但不是全局精确限流。需要更强保证时，可替换为 Upstash Redis 等共享存储。
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const MAX_KEYS = 10_000;
const store = new Map<string, Bucket>();

function sweep(now: number) {
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key);
  }
  // 极端情况下仍然过大：直接清空，防止内存无限增长
  if (store.size > MAX_KEYS) store.clear();
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

/** 在 windowMs 内最多允许 limit 次 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  if (store.size > MAX_KEYS / 2) sweep(now);

  let bucket = store.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    store.set(key, bucket);
  }
  bucket.count++;

  return {
    ok: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

/** 清除某个 key 的计数（例如登录成功后） */
export function resetRateLimit(key: string) {
  store.delete(key);
}

/** 获取客户端 IP（Vercel / 反向代理） */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}
