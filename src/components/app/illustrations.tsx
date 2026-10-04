/**
 * 空状态插画：细线条 + 一处靛紫点缀，与界面同一种线宽和圆角。
 * 颜色全部用 CSS 变量，浅色 / 深色模式自动适配。
 */

const line = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};
const accent = { fill: "var(--brand-soft)", stroke: "var(--brand)", strokeWidth: 1.5 };
const paper = { fill: "var(--background)", stroke: "currentColor", strokeWidth: 1.5 };

function Frame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <svg viewBox="0 0 160 120" width={160} height={120} role="img" aria-label={label} className="text-muted-foreground/70">
      <ellipse cx="80" cy="108" rx="54" ry="5" fill="var(--secondary)" />
      {children}
    </svg>
  );
}

/** 课堂：投屏上的二维码 + 签到对勾 */
export function ClassroomIllustration() {
  return (
    <Frame label="课堂签到插画">
      <rect x="22" y="18" width="104" height="70" rx="6" {...paper} />
      <path d="M22 30h104" {...line} />
      <circle cx="30" cy="24" r="1.6" fill="currentColor" />
      <circle cx="36" cy="24" r="1.6" fill="currentColor" />
      <rect x="34" y="38" width="38" height="38" rx="3" {...accent} />
      {[0, 1, 2].map((r) =>
        [0, 1, 2].map((c) =>
          (r + c) % 2 === 0 ? (
            <rect key={`${r}${c}`} x={39 + c * 10} y={43 + r * 10} width="7" height="7" rx="1" fill="var(--brand)" />
          ) : null
        )
      )}
      <path d="M82 46h30M82 56h22M82 66h26" {...line} />
      <circle cx="122" cy="84" r="13" fill="var(--brand)" />
      <path d="M116 84l4.5 4.5L129 80" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M74 88v12M62 100h24" {...line} />
    </Frame>
  );
}

/** 学生名单：表格 + 两个人像 */
export function RosterIllustration() {
  return (
    <Frame label="学生名单插画">
      <rect x="40" y="14" width="80" height="88" rx="6" {...paper} />
      <rect x="52" y="26" width="34" height="6" rx="3" fill="var(--brand)" opacity={0.85} />
      {[44, 58, 72, 86].map((y) => (
        <g key={y}>
          <circle cx="57" cy={y + 1} r="4" {...line} />
          <path d={`M66 ${y + 1}h40`} {...line} />
        </g>
      ))}
      <circle cx="122" cy="36" r="9" {...accent} />
      <path d="M108 62c0-8 6.3-13 14-13s14 5 14 13" {...accent} />
      <circle cx="30" cy="62" r="7" {...paper} />
      <path d="M19 84c0-6.5 5-10.5 11-10.5S41 77.5 41 84" {...paper} />
    </Frame>
  );
}

/** 签到记录：手机 + 签到成功 */
export function CheckInIllustration() {
  return (
    <Frame label="签到记录插画">
      <rect x="58" y="10" width="46" height="92" rx="9" {...paper} />
      <path d="M74 17h14" {...line} />
      <circle cx="81" cy="48" r="13" {...accent} />
      <path d="M75.5 48l4 4 7.5-8" fill="none" stroke="var(--brand)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M70 72h22M73 80h16" {...line} />
      <rect x="22" y="36" width="26" height="26" rx="3" {...paper} />
      <path d="M28 42h5v5h-5zM37 51h5v5h-5zM28 51h3M40 42h2" {...line} />
      <path d="M112 40l12-6M112 52h14M112 64l12 6" {...line} />
    </Frame>
  );
}

/** 统计：柱状图 + 上升折线 */
export function StatsIllustration() {
  return (
    <Frame label="统计插画">
      <rect x="24" y="14" width="112" height="84" rx="6" {...paper} />
      <path d="M38 84h84" {...line} />
      {[
        [44, 58],
        [60, 48],
        [76, 62],
        [92, 40],
        [108, 30],
      ].map(([x, y], i) => (
        <rect key={x} x={x} y={y} width="10" height={84 - y} rx="2" fill={i === 4 ? "var(--brand)" : "var(--brand-soft)"} stroke="var(--brand)" strokeWidth={1.5} />
      ))}
      <path d="M49 50l16-10 16 12 16-20 16-10" {...line} />
      <circle cx="113" cy="22" r="3" fill="var(--background)" stroke="currentColor" strokeWidth={1.5} />
    </Frame>
  );
}

/** 课堂答题：两个对话气泡 */
export function QuizIllustration() {
  return (
    <Frame label="课堂答题插画">
      <path d="M26 24h68a6 6 0 016 6v30a6 6 0 01-6 6H52l-12 10V66H26a6 6 0 01-6-6V30a6 6 0 016-6z" {...paper} />
      <path d="M34 38h48M34 50h32" {...line} />
      <path d="M72 58h60a6 6 0 016 6v22a6 6 0 01-6 6h-6v10l-12-10H72a6 6 0 01-6-6V64a6 6 0 016-6z" {...accent} />
      <path d="M80 72h40M80 82h24" fill="none" stroke="var(--brand)" strokeWidth={1.5} strokeLinecap="round" />
    </Frame>
  );
}
