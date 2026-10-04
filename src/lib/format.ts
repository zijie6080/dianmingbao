/**
 * 日期时间格式化，统一使用北京时间。
 *
 * 服务端组件运行在 Vercel（UTC 时区），直接调用 toLocaleString 会比北京时间慢 8 小时，
 * 早上 8 点前的课还会显示成前一天。所有展示与导出都应走这里。
 */
export const APP_TIME_ZONE = "Asia/Shanghai";

type DateInput = Date | string | number;

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

/** 10月4日 */
export function formatMonthDay(value: DateInput): string {
  return toDate(value).toLocaleDateString("zh-CN", {
    timeZone: APP_TIME_ZONE,
    month: "long",
    day: "numeric",
  });
}

/** 2026年10月4日 */
export function formatFullDate(value: DateInput): string {
  return toDate(value).toLocaleDateString("zh-CN", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** 2026/10/4 */
export function formatShortDate(value: DateInput): string {
  return toDate(value).toLocaleDateString("zh-CN", { timeZone: APP_TIME_ZONE });
}

/** 14:05 */
export function formatHourMinute(value: DateInput): string {
  return toDate(value).toLocaleTimeString("zh-CN", {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** 14:05:09 */
export function formatTime(value: DateInput): string {
  return toDate(value).toLocaleTimeString("zh-CN", { timeZone: APP_TIME_ZONE, hour12: false });
}

/** 2026/10/4 14:05:09 */
export function formatDateTime(value: DateInput): string {
  return toDate(value).toLocaleString("zh-CN", { timeZone: APP_TIME_ZONE, hour12: false });
}

/** 2026-10-04（北京时间），用于文件名、工作表名 */
export function formatIsoDate(value: DateInput): string {
  // en-CA 输出 YYYY-MM-DD
  return toDate(value).toLocaleDateString("en-CA", { timeZone: APP_TIME_ZONE });
}

/** 把 YYYY-MM-DD 解析为北京时间当天的起止时刻；格式不对返回 null */
export function parseDayRange(day: string): { start: Date; end: Date } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const start = new Date(`${day}T00:00:00+08:00`);
  if (Number.isNaN(start.getTime())) return null;
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1) };
}

/** 秒数 → 2:05 */
export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
