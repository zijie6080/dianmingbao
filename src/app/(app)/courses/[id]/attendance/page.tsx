import { redirect, notFound } from "next/navigation";
import { StatsIllustration } from "@/components/app/illustrations";
import { AlertTriangle, Download } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStudentStats } from "@/lib/stats";
import { closeExpiredAttendanceSessions } from "@/lib/attendance";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, RateText, StatStrip } from "@/components/app/ui";
import { CourseTabs } from "@/components/app/course-tabs";

export default async function AttendanceStatsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const course = await prisma.course.findUnique({
    where: { id },
    include: { _count: { select: { students: true, attendanceSessions: true } } },
  });
  if (!course || course.userId !== user.userId) notFound();

  await closeExpiredAttendanceSessions(id);
  const stats = await getStudentStats(id);
  const sessionCount = course._count.attendanceSessions;

  // 出勤率低的排前面，老师最需要关注
  const rows = [...stats].sort((a, b) => a.attendanceRate - b.attendanceRate || a.studentNum.localeCompare(b.studentNum));
  const low = sessionCount > 0 ? stats.filter((s) => s.attendanceRate < 60) : [];
  const perfect = sessionCount > 0 ? stats.filter((s) => s.absentCount === 0).length : 0;
  const avg = stats.length > 0 ? stats.reduce((sum, s) => sum + s.attendanceRate, 0) / stats.length : 0;

  return (
    <>
      <PageHeader
        crumbs={[{ href: "/courses", label: "全部课程" }, { href: `/courses/${id}`, label: course.name }, { label: "考勤统计" }]}
        title={course.name}
        meta={<span className="tag tag-gray">{course.semester}</span>}
        actions={
          stats.length > 0 && (
            <Button variant="outline" className="gap-1.5" asChild>
              <a href={`/api/courses/${id}/export`} download>
                <Download className="h-4 w-4" />
                导出 Excel
              </a>
            </Button>
          )
        }
      />
      <CourseTabs courseId={id} active="stats" />

      {sessionCount === 0 || stats.length === 0 ? (
        <EmptyState
          illustration={<StatsIllustration />}
          title="还没有统计数据"
          description="发起签到后，这里会自动汇总每位学生的出勤、迟到、请假和缺勤次数。"
        />
      ) : (
        <>
          <StatStrip
            items={[
              { label: "签到次数", value: sessionCount },
              { label: "平均出勤率", value: `${avg.toFixed(1)}%` },
              { label: "全勤学生", value: perfect, hint: `共 ${stats.length} 人` },
              { label: "出勤率低于 60%", value: low.length, tone: low.length > 0 ? "red" : "default" },
            ]}
          />

          {low.length > 0 && (
            <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-[var(--warn-soft-bg)] px-4 py-3 text-sm text-[var(--warn-soft-fg)]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                需要关注：{low.slice(0, 10).map((s) => s.name).join("、")}
                {low.length > 10 && ` 等 ${low.length} 人`}
              </p>
            </div>
          )}

          <div className="mt-6 overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-muted/60 text-xs text-muted-foreground">
                <tr className="[&>th]:px-4 [&>th]:py-2 [&>th]:font-normal">
                  <th className="text-left">学号</th>
                  <th className="text-left">姓名</th>
                  <th className="text-right">出勤</th>
                  <th className="text-right">迟到</th>
                  <th className="text-right">请假</th>
                  <th className="text-right">缺勤</th>
                  <th className="text-right">出勤率</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((s) => (
                  <tr key={s.studentId} className="hover:bg-muted/50 [&>td]:px-4 [&>td]:py-2.5">
                    <td className="num text-muted-foreground">{s.studentNum}</td>
                    <td className="font-medium">{s.name}</td>
                    <td className="num text-right">{s.presentCount}</td>
                    <td className="num text-right text-muted-foreground">{s.lateCount || "–"}</td>
                    <td className="num text-right text-muted-foreground">{s.leaveCount || "–"}</td>
                    <td className={`num text-right ${s.absentCount > 0 ? "text-tone-red" : "text-muted-foreground"}`}>
                      {s.absentCount || "–"}
                    </td>
                    <td className="text-right">
                      <RateText rate={s.attendanceRate} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">迟到算出勤；请假不算缺勤，也不计入应到次数。</p>
        </>
      )}
    </>
  );
}
