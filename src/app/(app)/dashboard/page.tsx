import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Megaphone } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/stats";
import { prisma } from "@/lib/prisma";
import { formatMonthDayWeekday, greeting } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ListBox, PageHeader, RateText, Section, StatStrip } from "@/components/app/ui";
import { CreateCourseDialog } from "@/components/courses/course-form";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [data, profile, announcement] = await Promise.all([
    getDashboardData(user.userId),
    prisma.user.findUnique({ where: { id: user.userId }, select: { name: true } }),
    prisma.appConfig.findUnique({ where: { key: "announcement" }, select: { value: true } }),
  ]);

  const now = new Date();
  const hasSessions = data.semesterSessionCount > 0;

  return (
    <>
      <PageHeader
        title={`${greeting(now)}，${profile?.name || "老师"}`}
        description={formatMonthDayWeekday(now)}
        actions={data.courseCount > 0 ? <CreateCourseDialog /> : undefined}
      />

      {announcement?.value.trim() && (
        <div className="mb-6 flex items-start gap-2.5 rounded-lg bg-muted px-4 py-3 text-sm text-foreground">
          <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="whitespace-pre-wrap">{announcement.value}</p>
        </div>
      )}

      {data.courseCount === 0 ? (
        <GettingStarted />
      ) : (
        <>
          <StatStrip
            items={[
              { label: "课程", value: data.courseCount },
              { label: "学生", value: data.studentCount },
              { label: "累计签到", value: data.semesterSessionCount, unit: "次" },
              {
                label: "平均出勤率",
                value: hasSessions ? `${data.averageAttendanceRate.toFixed(1)}%` : "—",
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
            <ListBox>
              {data.recentCourses.map((course) => (
                <Link
                  key={course.id}
                  href={`/courses/${course.id}`}
                  className="group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{course.name}</p>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">
                      {course.semester} · {course.studentCount} 名学生 · 签到 {course.sessionCount} 次
                    </p>
                  </div>
                  <div className="text-right">
                    <RateText rate={course.averageAttendanceRate} empty={course.sessionCount === 0} />
                    <p className="text-xs text-muted-foreground">出勤率</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))}
            </ListBox>
          </Section>
        </>
      )}
    </>
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
    <div className="rounded-lg border border-border p-6 sm:p-8">
      <h2 className="text-lg font-semibold">三步开始使用</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">第一次上课前花 2 分钟准备好名单，之后每节课 30 秒发起签到。</p>
      <ol className="mt-6 space-y-5">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-3">
            <span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-xs font-medium text-muted-foreground">
              {i + 1}
            </span>
            <div>
              <p className="font-medium">{s.title}</p>
              <p className="text-[13px] text-muted-foreground">{s.desc}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-7">
        <CreateCourseDialog />
      </div>
    </div>
  );
}
