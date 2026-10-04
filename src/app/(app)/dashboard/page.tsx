import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ChevronRight, Megaphone } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/stats";
import { prisma } from "@/lib/prisma";
import { courseColor } from "@/lib/course-color";
import { formatMonthDay, formatMonthDayWeekday, greeting } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { PageHeader, RateText, Section, StatStrip } from "@/components/app/ui";
import { CourseAvatar } from "@/components/app/course-visuals";
import { MiniBars, RateMeter } from "@/components/app/charts";
import { CreateCourseDialog } from "@/components/courses/course-form";
import { StartAttendanceDialog } from "@/components/attendance/qr-display";
import type { DashboardData } from "@/types";

type CourseCard = DashboardData["recentCourses"][number];

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [data, profile, announcement] = await Promise.all([
    getDashboardData(user.userId),
    prisma.user.findUnique({ where: { id: user.userId }, select: { name: true } }),
    prisma.appConfig.findUnique({ where: { key: "announcement" }, select: { value: true } }),
  ]);

  const now = new Date();
  const courses = data.recentCourses;
  // 「继续上课」：优先正在签到的课程，其次最近上过的课
  const focus =
    courses.find((c) => c.hasActiveSession) ??
    [...courses].filter((c) => c.lastSessionAt).sort((a, b) => b.lastSessionAt!.localeCompare(a.lastSessionAt!))[0] ??
    courses[0];

  return (
    <>
      <PageHeader
        title={`${greeting(now)}，${profile?.name || "老师"}`}
        description={formatMonthDayWeekday(now)}
        actions={data.courseCount > 0 ? <CreateCourseDialog /> : undefined}
      />

      {announcement?.value.trim() && (
        <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-border bg-muted px-4 py-3 text-sm">
          <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="whitespace-pre-wrap">{announcement.value}</p>
        </div>
      )}

      {data.courseCount === 0 ? (
        <GettingStarted />
      ) : (
        <>
          {focus && <FocusCard course={focus} />}

          <StatStrip
            className="mt-6"
            items={[
              { label: "课程", value: data.courseCount, unit: "门" },
              { label: "学生", value: data.studentCount, unit: "人" },
              { label: "累计签到", value: data.semesterSessionCount, unit: "次" },
              {
                label: "平均出勤率",
                value: data.semesterSessionCount > 0 ? `${data.averageAttendanceRate.toFixed(1)}%` : "—",
              },
            ]}
          />

          <Section
            title="我的课程"
            action={
              <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
                <Link href="/courses">
                  全部课程
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            }
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {courses.slice(0, 6).map((c) => (
                <CourseTile key={c.id} course={c} />
              ))}
            </div>
          </Section>
        </>
      )}
    </>
  );
}

/** 「继续上课」卡片：课程色浅底，主操作直接发起签到 */
function FocusCard({ course }: { course: CourseCard }) {
  const color = courseColor(course.id);
  const last = course.recentRates.at(-1);
  return (
    <div
      className="relative overflow-hidden rounded-xl border p-5 sm:p-6"
      style={{
        backgroundColor: color.tint,
        borderColor: `${color.base}26`,
        backgroundImage: `radial-gradient(${color.base}1f 1px, transparent 1.2px)`,
        backgroundSize: "14px 14px",
        backgroundPosition: "right top",
      }}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <CourseAvatar id={course.id} name={course.name} size={48} />
          <div className="min-w-0">
            <p className="text-xs font-medium" style={{ color: color.base }}>
              {course.hasActiveSession ? "签到进行中" : "继续上课"}
            </p>
            <h2 className="mt-0.5 truncate text-xl font-semibold tracking-tight">{course.name}</h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {course.studentCount} 名学生
              {course.lastSessionAt
                ? ` · 上次签到 ${formatMonthDay(course.lastSessionAt)}${last !== undefined ? `，出勤 ${last.toFixed(0)}%` : ""}`
                : " · 还没有发起过签到"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <StartAttendanceDialog courseId={course.id} courseName={course.name} studentCount={course.studentCount} />
          <Button variant="outline" className="gap-1.5 bg-background/80" asChild>
            <Link href={`/courses/${course.id}`}>
              进入课程
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function CourseTile({ course }: { course: CourseCard }) {
  const hasData = course.sessionCount > 0 && course.studentCount > 0;
  return (
    <Link
      href={`/courses/${course.id}`}
      className="group flex flex-col rounded-xl border border-border bg-background p-4 transition-all hover:border-[#D3D2CE] hover:shadow-[0_4px_16px_-8px_rgba(15,15,15,0.15)]"
    >
      <div className="flex items-start gap-3">
        <CourseAvatar id={course.id} name={course.name} size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{course.name}</p>
          <p className="text-[13px] text-muted-foreground">{course.semester}</p>
        </div>
        {course.hasActiveSession && <span className="tag tag-green">签到中</span>}
      </div>

      <div className="mt-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-xl">
            <RateText rate={course.averageAttendanceRate} empty={!hasData} />
          </p>
          <p className="text-xs text-muted-foreground">平均出勤率</p>
        </div>
        {course.recentRates.length >= 3 ? (
          <MiniBars values={course.recentRates} />
        ) : (
          <span className="text-xs text-muted-foreground">{hasData ? "签到 3 次后显示趋势" : "暂无签到"}</span>
        )}
      </div>
      <RateMeter rate={hasData ? course.averageAttendanceRate : 0} className="mt-3" />

      <p className="mt-3 flex items-center justify-between text-[13px] text-muted-foreground">
        <span>
          {course.studentCount} 名学生 · 签到 {course.sessionCount} 次
        </span>
        <ChevronRight className="h-4 w-4 opacity-60 transition-transform group-hover:translate-x-0.5" />
      </p>
    </Link>
  );
}

/** 首次使用：三步引导，代替空白页 */
function GettingStarted() {
  const steps = [
    { title: "新建课程", desc: "填写课程名称和学期，几秒完成。" },
    { title: "导入学生名单", desc: "上传 Excel（学号 + 姓名），学生签到时按姓名匹配。" },
    { title: "上课发起签到", desc: "投屏二维码，学生微信扫码，课后一键导出考勤表。" },
  ];
  return (
    <div
      className="overflow-hidden rounded-xl border border-[#2F6FD626] p-6 sm:p-8"
      style={{
        backgroundColor: "#F5F8FD",
        backgroundImage: "radial-gradient(#2F6FD61f 1px, transparent 1.2px)",
        backgroundSize: "14px 14px",
      }}
    >
      <h2 className="text-xl font-semibold tracking-tight">三步开始使用点名宝</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">第一次上课前花 2 分钟准备好名单，之后每节课 30 秒发起签到。</p>
      <ol className="mt-6 grid gap-3 sm:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className="rounded-lg border border-border bg-background p-4">
            <span className="num flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
              {i + 1}
            </span>
            <p className="mt-3 font-medium">{s.title}</p>
            <p className="mt-1 text-[13px] text-muted-foreground">{s.desc}</p>
          </li>
        ))}
      </ol>
      <div className="mt-6">
        <CreateCourseDialog />
      </div>
    </div>
  );
}
