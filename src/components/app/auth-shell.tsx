import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { Brand, BrandMark } from "@/components/app/ui";

/** 左侧品牌面板：深蓝底 + 点阵纹理 + 一张产品小样（仅大屏显示） */
function BrandPanel() {
  const points = ["动态二维码，截图转发 1 分钟内失效", "迟到、请假、缺勤自动统计", "期末一键导出考勤表"];
  return (
    <aside
      className="relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex"
      style={{
        backgroundColor: "#4338A6",
        backgroundImage: "radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1.2px)",
        backgroundSize: "16px 16px",
      }}
    >
      <div className="flex items-center gap-2 text-lg font-semibold">
        <BrandMark size={28} className="bg-white text-[#4338A6]" />
        点名宝
      </div>

      <div>
        <h2 className="max-w-sm text-3xl font-semibold leading-snug tracking-tight">
          上课点名，
          <br />
          扫一下就好。
        </h2>
        <ul className="mt-6 space-y-2.5 text-[15px] text-white/85">
          {points.map((p) => (
            <li key={p} className="flex items-center gap-2.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15">
                <Check className="h-3 w-3" />
              </span>
              {p}
            </li>
          ))}
        </ul>

        {/* 产品小样：一张签到进度卡片 */}
        <div className="mt-10 max-w-sm rounded-xl bg-background p-5 text-foreground shadow-[0_24px_48px_-16px_rgba(0,0,0,0.35)]">
          <div className="flex items-center gap-2 text-sm">
            <span className="h-2 w-2 rounded-full bg-[#448361]" />
            <span className="font-medium">高等数学 · 签到进行中</span>
            <span className="num ml-auto text-xs text-muted-foreground">剩余 2:41</span>
          </div>
          <p className="num mt-4 text-3xl font-semibold">
            38 <span className="text-base font-normal text-muted-foreground">/ 45 已签到</span>
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
            <div className="h-full w-[84%] rounded-full bg-primary" />
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {["张一鸣", "李思", "王雨桐", "赵晨"].map((n) => (
              <span key={n} className="tag tag-green h-6 px-2">
                {n}
              </span>
            ))}
            <span className="tag tag-gray h-6 px-2">+34</span>
          </div>
        </div>
      </div>

      <p className="text-sm text-white/60">给大学老师的课堂签到工具 · 完全免费</p>
    </aside>
  );
}

/** 登录 / 注册 / 找回密码 */
export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[minmax(420px,5fr)_7fr]">
      <BrandPanel />
      <div className="flex flex-col">
        <header className="px-6 py-5 lg:hidden">
          <Brand size={24} />
        </header>
        <main className="flex flex-1 items-start justify-center px-6 pb-16 pt-[6vh] lg:items-center lg:pt-0">
          <div className="w-full max-w-[360px]">
            <h1 className="text-[26px] font-semibold tracking-tight">{title}</h1>
            {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-8 text-sm text-muted-foreground">{footer}</div>}
          </div>
        </main>
      </div>
    </div>
  );
}
