import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/app/ui";
import { DonateDialog } from "@/components/shared/donate-widget";

/** 伪二维码图案（确定性生成，仅用于产品示意） */
function FakeQr() {
  const size = 21;
  const cells: boolean[] = [];
  let seed = 7;
  for (let i = 0; i < size * size; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    cells.push(seed / 233280 > 0.52);
  }
  const finder = (r: number, c: number) => {
    const inBox = (r0: number, c0: number) => r >= r0 && r < r0 + 7 && c >= c0 && c < c0 + 7;
    const boxes: [number, number][] = [[0, 0], [0, size - 7], [size - 7, 0]];
    for (const [r0, c0] of boxes) {
      if (inBox(r0, c0)) {
        const rr = r - r0;
        const cc = c - c0;
        const ring = rr === 0 || rr === 6 || cc === 0 || cc === 6;
        const core = rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4;
        return ring || core;
      }
    }
    return null;
  };
  return (
    <div className="grid aspect-square w-full" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }} aria-hidden>
      {cells.map((on, i) => {
        const r = Math.floor(i / size);
        const c = i % size;
        const f = finder(r, c);
        const filled = f === null ? on : f;
        return <span key={i} className={filled ? "bg-[#37352F]" : ""} />;
      })}
    </div>
  );
}

function ProductMock() {
  const names = ["张一鸣", "李思", "王雨桐", "赵晨", "陈子涵", "刘洋"];
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background shadow-[0_24px_48px_-24px_rgba(15,15,15,0.18)]">
      <div className="flex items-center gap-1.5 border-b border-border bg-muted px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#E3E2DF]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#E3E2DF]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#E3E2DF]" />
        <span className="ml-3 text-xs text-muted-foreground">高等数学 · 周三 第 3–4 节</span>
      </div>
      <div className="grid gap-6 p-6 sm:grid-cols-[180px_1fr]">
        <div className="mx-auto w-40 rounded-lg border border-border p-3 sm:w-full">
          <FakeQr />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2 text-sm">
            <span className="h-2 w-2 rounded-full bg-[#448361]" />
            <span className="font-medium">签到进行中</span>
            <span className="num ml-auto text-muted-foreground">剩余 2:41</span>
          </div>
          <p className="num mt-5 text-4xl font-semibold tracking-tight">
            38 <span className="text-lg font-normal text-muted-foreground">/ 45 已签到</span>
          </p>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-secondary">
            <div className="h-full w-[84%] rounded-full bg-primary" />
          </div>
          <div className="mt-5 flex flex-wrap gap-1.5">
            {names.map((n) => (
              <span key={n} className="tag tag-green h-6 px-2">
                {n}
              </span>
            ))}
            <span className="tag tag-gray h-6 px-2">+32</span>
          </div>
          <p className="mt-auto pt-5 text-xs text-muted-foreground">二维码每 30 秒刷新，截图转发无效</p>
        </div>
      </div>
    </div>
  );
}

const steps = [
  { title: "导入名单", desc: "上传班级 Excel（学号 + 姓名），一次准备，整个学期复用。" },
  { title: "投屏扫码", desc: "上课点「开始签到」，把二维码投到屏幕上，学生用微信扫一扫、输入姓名即可。" },
  { title: "课后导出", desc: "迟到、请假、缺勤自动统计，期末一键导出考勤表交给教务。" },
];

const features = [
  { title: "防代签", desc: "二维码每 30 秒更换，截图转发一分钟内失效；同一部手机每轮只能为一人签到。" },
  { title: "补签与请假", desc: "没扫上码的学生可手动补签（记迟到）；有假条的标记请假，不计缺勤。" },
  { title: "课堂答题", desc: "课上随时提问，学生扫码提交答案，老师逐条查看、评分并导出。" },
  { title: "学生零门槛", desc: "学生不用下载 App、不用注册账号，打开微信扫码就能签到。" },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Brand size={26} />
        <nav className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/login">登录</Link>
          </Button>
          <Button asChild>
            <Link href="/register">免费注册</Link>
          </Button>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-12 lg:grid-cols-[1fr_1.1fr] lg:pt-20">
          <div>
            <p className="text-sm font-medium text-primary">给大学老师的课堂签到工具</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              上课点名，
              <br />
              扫一下就好。
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
              老师投屏二维码，学生微信扫码签到。迟到、请假、缺勤自动统计，期末一键导出考勤表。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href="/register">免费开始使用</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">已有账号，登录</Link>
              </Button>
            </div>
            <p className="mt-4 text-[13px] text-muted-foreground">完全免费 · 学生无需注册 · 电脑和手机都能用</p>
          </div>
          <ProductMock />
        </section>

        <section className="border-t border-border bg-muted">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 className="text-2xl font-semibold tracking-tight">三步用起来</h2>
            <ol className="mt-8 grid gap-8 sm:grid-cols-3">
              {steps.map((s, i) => (
                <li key={s.title}>
                  <span className="num text-sm font-medium text-muted-foreground">0{i + 1}</span>
                  <h3 className="mt-2 text-base font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">为真实的课堂设计</h2>
          <div className="mt-8 grid gap-x-12 gap-y-8 sm:grid-cols-2">
            {features.map((f) => (
              <div key={f.title} className="border-l-2 border-border pl-4">
                <h3 className="text-base font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-14 flex flex-col items-start gap-4 rounded-xl border border-border p-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-semibold">下节课就能用上</p>
              <p className="mt-1 text-sm text-muted-foreground">注册 → 导入名单 → 开始签到，准备工作不到 2 分钟。</p>
            </div>
            <Button size="lg" asChild>
              <Link href="/register">免费注册</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-[13px] text-muted-foreground">
          <span>点名宝 · {new Date().getFullYear()}</span>
          <DonateDialog>
            <button className="hover:text-foreground">赞赏支持</button>
          </DonateDialog>
        </div>
      </footer>
    </div>
  );
}
