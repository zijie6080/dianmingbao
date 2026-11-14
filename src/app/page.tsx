import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check, ShieldCheck, CalendarCheck, MessageSquareText, Smartphone } from "lucide-react";
import { Brand, BrandMark } from "@/components/app/ui";
import { DonateDialog } from "@/components/shared/donate-widget";
import { ThemeToggle } from "@/components/theme";

const siteUrl = "https://dianmingbao.tech";
const seoTitle = "点名宝 - 免费在线点名、课堂二维码签到与考勤管理";
const seoDescription = "点名宝是专为大学教师设计的免费在线课堂签到工具。老师导入学生名单、投屏动态二维码，学生微信扫码签到，无需注册或下载 App；支持缺勤统计、补签、请假、课堂答题与 Excel 考勤导出。";

export const metadata: Metadata = {
  title: seoTitle,
  description: seoDescription,
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: siteUrl,
    siteName: "点名宝",
    title: seoTitle,
    description: seoDescription,
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "点名宝" }],
  },
  twitter: {
    card: "summary",
    title: seoTitle,
    description: seoDescription,
    images: ["/icon-512.png"],
  },
};

const faq = [
  { question: "点名宝是什么？", answer: "点名宝是一款面向大学教师的在线课堂点名和考勤工具。老师创建课程、导入学生名单并发起二维码签到，学生扫码后提交签到，老师可查看出勤情况和导出考勤记录。" },
  { question: "点名宝收费吗？学生需要注册或下载 App 吗？", answer: "点名宝目前免费使用。教师需要注册账号；学生无需注册账号或下载 App，使用微信扫一扫即可打开网页完成签到。" },
  { question: "如何用点名宝进行课堂二维码签到？", answer: "教师注册后创建课程，导入包含学号和姓名的 Excel 名单，再发起签到并投屏二维码。学生扫码并按页面提示填写姓名等信息，老师可查看实时签到结果。" },
  { question: "点名宝可以防止学生代签吗？", answer: "点名宝使用定期刷新的动态二维码和同一设备每轮签到限制，降低长期转发旧截图和同设备代签的风险。但这些机制不能完全杜绝实时转发、借用设备等代签行为，仍建议结合课堂现场管理。" },
  { question: "可以查看缺勤记录或导出考勤表吗？", answer: "可以。教师可以查看签到历史、缺勤名单和学期出勤率，处理补签与请假，并导出 Excel 考勤统计表。" },
  { question: "点名宝还支持哪些课堂互动？", answer: "除了课堂扫码签到，点名宝支持随机点名和课堂答题，教师可以查看答案、评分并导出记录。" },
];

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": siteUrl + "/#website",
      name: "点名宝",
      alternateName: "Dianmingbao",
      url: siteUrl,
      inLanguage: "zh-CN",
    },
    {
      "@type": "WebApplication",
      "@id": siteUrl + "/#app",
      name: "点名宝",
      alternateName: "Dianmingbao",
      url: siteUrl,
      description: seoDescription,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web browser",
      inLanguage: "zh-CN",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "CNY" },
      featureList: ["课堂二维码签到", "学生名单 Excel 导入", "缺勤和出勤率统计", "补签与请假", "课堂随机点名", "课堂答题", "Excel 考勤导出"],
    },
  ],
};

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
        return <span key={i} className={filled ? "bg-[var(--qr-ink)]" : ""} />;
      })}
    </div>
  );
}

function ProductMock() {
  const names = ["张一鸣", "李思", "王雨桐", "赵晨", "陈子涵", "刘洋"];
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background shadow-[0_24px_48px_-24px_rgba(15,15,15,0.18)]">
      <div className="flex items-center gap-1.5 border-b border-border bg-muted px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--hover-border)]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--hover-border)]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--hover-border)]" />
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
          <p className="mt-auto pt-5 text-xs text-muted-foreground">二维码每 30 秒刷新，旧码限时失效</p>
        </div>
      </div>
    </div>
  );
}

/** 学生端手机小样：签到成功页 */
function PhoneMock() {
  return (
    <div className="w-[168px] rounded-[30px] border-[7px] border-[var(--device-frame)] bg-background shadow-[0_24px_48px_-16px_rgba(15,15,15,0.35)]">
      <div className="mx-auto mt-1.5 h-1.5 w-12 rounded-full bg-[var(--device-frame)]" />
      <div className="px-4 pb-6 pt-4">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold">
          <BrandMark size={14} />
          点名宝
        </div>
        <div className="mt-6 flex flex-col items-center text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--tag-green-bg)] text-[var(--tag-green-fg)]">
            <Check className="h-5 w-5" />
          </span>
          <p className="mt-3 text-sm font-semibold">签到成功</p>
          <p className="mt-1 text-[11px]">王雨桐 <span className="text-muted-foreground">2024303</span></p>
          <p className="text-[11px] text-muted-foreground">高等数学</p>
          <p className="num mt-3 text-[10px] text-muted-foreground">签到时间 10:02:17</p>
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
  { icon: ShieldCheck, title: "防代签", desc: "二维码每 30 秒更换，旧码一分钟内失效；同一部手机每轮只能为一人签到，降低代签风险。" },
  { icon: CalendarCheck, title: "补签与请假", desc: "没扫上码的学生可手动补签（记迟到）；有假条的标记请假，不计缺勤。" },
  { icon: MessageSquareText, title: "课堂答题", desc: "课上随时提问，学生扫码提交答案，老师逐条查看、评分并导出。" },
  { icon: Smartphone, title: "学生零门槛", desc: "学生不用下载 App、不用注册账号，打开微信扫码就能签到。" },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Brand size={26} />
        <nav className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" asChild>
            <Link href="/login">登录</Link>
          </Button>
          <Button asChild>
            <Link href="/register">免费注册</Link>
          </Button>
        </nav>
      </header>

      <main>
        <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-0"
          style={{
            backgroundImage:
              "linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            maskImage: "radial-gradient(ellipse 70% 60% at 70% 40%, black 30%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 70% 40%, black 30%, transparent 75%)",
          }}
        />
        <section className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 pb-28 pt-12 lg:grid-cols-[1fr_1.1fr] lg:pt-20">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-medium text-[var(--brand-ink)]"><span className="h-1.5 w-1.5 rounded-full bg-[var(--brand)]" />给大学老师的在线点名与课堂签到工具</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              上课点名，
              <br />
              <span className="bg-[linear-gradient(transparent_62%,var(--highlight)_62%)] px-1 [-webkit-box-decoration-break:clone] [box-decoration-break:clone]">扫一下</span>就好。
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
              点名宝是免费的在线点名和课堂考勤工具。老师投屏动态二维码，学生微信扫码签到；迟到、请假、缺勤自动统计，期末一键导出 Excel 考勤表。
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
          <div className="relative">
            <ProductMock />
            <div className="absolute -bottom-16 -right-2 hidden sm:block lg:-right-6">
              <PhoneMock />
            </div>
          </div>
        </section>
        </div>

        <section className="border-y border-border bg-muted">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 className="text-2xl font-semibold tracking-tight">三步用起来</h2>
            <ol className="mt-8 grid gap-8 sm:grid-cols-3">
              {steps.map((s, i) => (
                <li key={s.title}>
                  <span className="num text-sm font-semibold text-[var(--brand-ink)]">0{i + 1}</span>
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
              <div key={f.title} className="flex gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-foreground">
                  <f.icon className="h-[18px] w-[18px]" />
                </span>
                <div>
                <h3 className="text-base font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div
            className="mt-16 flex flex-col items-start gap-5 overflow-hidden rounded-2xl p-8 text-white sm:flex-row sm:items-center sm:justify-between sm:p-10"
            style={{
              backgroundColor: "var(--brand)",
              backgroundImage: "radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1.2px)",
              backgroundSize: "16px 16px",
            }}
          >
            <div>
              <p className="text-2xl font-semibold tracking-tight">下节课就能用上</p>
              <p className="mt-1.5 text-white/75">注册 → 导入名单 → 开始签到，准备工作不到 2 分钟。</p>
            </div>
            <Button size="lg" className="bg-white text-[#3A2F94] hover:bg-white/90 active:bg-white/80" asChild>
              <Link href="/register">免费注册</Link>
            </Button>
          </div>
        </section>
        <section id="faq" aria-labelledby="faq-heading" className="mx-auto max-w-6xl border-t border-border px-6 py-16">
          <h2 id="faq-heading" className="text-2xl font-semibold tracking-tight">课堂签到常见问题</h2>
          <div className="mt-6 divide-y divide-border">
            {faq.map((item) => (
              <div key={item.question} className="py-5">
                <h3 className="text-base font-semibold">{item.question}</h3>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-[13px] text-muted-foreground">
          <span>点名宝 · {new Date().getFullYear()}</span>
          <Link href="/#faq" className="hover:text-foreground">使用帮助</Link>
          <DonateDialog>
            <button className="hover:text-foreground">赞赏支持</button>
          </DonateDialog>
        </div>
      </footer>
    </div>
  );
}
