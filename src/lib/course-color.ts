/**
 * 课程识别色（飞书式：每门课一个颜色）。
 * 6 个色相已通过 dataviz 校验脚本（亮度带、色度、色盲区分、对比度全部 PASS）。
 * 刻意不含红色：红色保留给「缺勤 / 低出勤」等状态。
 * 颜色跟随课程本身（按 id 哈希），不随排序变化。
 */
export const COURSE_COLORS = [
  { base: "#2F6FD6", tint: "#EAF1FC" }, // 蓝
  { base: "#C8661A", tint: "#FBF0E6" }, // 橙
  { base: "#00918F", tint: "#E3F4F3" }, // 青
  { base: "#7357C9", tint: "#F0ECFA" }, // 紫
  { base: "#2E8B57", tint: "#E7F3EC" }, // 绿
  { base: "#B84A9C", tint: "#F8EAF4" }, // 品红
] as const;

export type CourseColor = (typeof COURSE_COLORS)[number];

export function courseColor(key: string): CourseColor {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return COURSE_COLORS[h % COURSE_COLORS.length];
}

/** 课程色的浅底：与页面背景混合，浅色 / 深色模式下都柔和 */
export function courseTint(base: string, percent?: number): string {
  const strength = percent === undefined ? "var(--tint-strength)" : `${percent}%`;
  return `color-mix(in srgb, ${base} ${strength}, var(--background))`;
}
