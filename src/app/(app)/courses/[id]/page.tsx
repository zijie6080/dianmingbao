import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronRight, ClipboardCheck, Download, MessageSquareText, UserPlus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { closeExpiredAttendanceSessions } from "@/lib/attendance";
import { closeExpiredQuizSessions } from "@/lib/quiz";
import { formatHourMinute, formatMonthDayWeekday } from "@/lib/format";
import { getSessionCounts, sessionRate } from "@/lib/stats";
import { Button } from "@/components/ui/button";
import { EmptyState, ListBox, PageHeader, RateText, Section, StatStrip } from "@/components/app/ui";
import { CourseTabs } from "@/components/app/course-tabs";
import { EditCourseDialog } from "@/components/courses/course-actions";
import { StartAttendanceDialog } from "@/components/attendance/qr-display";
import { StartQuizDialog } from "@/components/quiz/start-quiz-dialog";

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;

  const course = await prisma.course.findUnique({
    where: { id },
    include: { _count: { select: { students: true } } },
  });
  if (!course || course.userId !== user.userId) notFound();

  // 已超时的签到/答题自动标记为结束，列表中不会一直显示「进行中」
  await Promise.all([closeExpiredAttendanceSessions(id), closeExpiredQuizSessions(id)]);

  const [sessions, quizSessions] = await Promise.all([
    prisma.attendanceSession.findMany({ where: { courseId: id }, orderBy: { startTime: "desc" } }),
    prisma.quizSession.findMany({
      where: { courseId: id },
      include: { _count: { select: { submissions: true } } },
      orderBy: { startTime: "desc" },
    }),
  ]);

  const studentCount = course._count.students;
  const counts = await getSessionCounts(sessions.map((s) => s.id));
  const countOf = (sessionId: string) => counts.get(sessionId) ?? { present: 0, leave: 0 };
  const rateFor = (sessionId: string) => {
    const c = countOf(sessionId);
    return sessionRate(c.present, c.leave, studentCount);
  };
  const avgRate = sessions.length > 0 ? sessions.reduce((sum, s) => sum + rateFor(s.id), 0) / sessions.length : 0;

  return (
    <>
      <PageHeader
        crumbs={[{ href: "/courses", label: "全部课程" }, { label: course.name }]}
        title={course.name}
        meta={
          <>
            <span className="tag tag-gray">{course.semester}</span>
            <span>{studentCount} 名学生</span>
          </>
        }
        actions={
          <>
            <StartAttendanceDialog courseId={id} courseName={course.name} studentCount={studentCount} />
            <StartQuizDialog courseId={id} courseName={course.name} studentCount={studentCount} />
            <EditCourseDialog courseId={id} courseName={course.name} courseSemester={course.semester} />
          </>
        }
      />

      <CourseTabs courseId={id} active="overview" />

      {studentCount === 0 && (
        <div className="mb-6 flex flex-col gap-3 rounded-lg border border-border bg-muted px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">先添加学生名单</p>
            <p className="text-[13px] text-muted-foreground">学生签到时按姓名匹配名单，支持 Excel 批量导入。</p>
          </div>
          <Button size="sm" className="shrink-0 gap-1.5" asChild>
            <Link href={`/courses/${id}/students`}>
              <UserPlus className="h-4 w-4" />
              添加学生
            </Link>
          </Button>
        </div>
      )}

      <StatStrip
        items={[
          { label: "学生", value: studentCount },
          { label: "签到", value: sessions.length, unit: "次" },
          { label: "答题", value: quizSessions.length, unit: "次" },
          { label: "平均出勤率", value: sessions.length > 0 ? `${avgRate.toFixed(0)}%` : "—" },
        ]}
      />

      <Section
        title="签到记录"
        action={
          sessions.length > 0 && (
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" asChild>
              <a href={`/api/courses/${id}/export`} download>
                <Download className="h-3.5 w-3.5" />
                导出考勤
              </a>
            </Button>
          )
        }
      >
        {sessions.length === 0 ? (
          <EmptyState
            icon={<ClipboardCheck />}
            title="还没有签到记录"
            description={studentCount === 0 ? "添加学生后即可发起签到。" : "上课时点击「开始签到」，把二维码投到屏幕上。"}
          />
        ) : (
          <ListBox>
            {sessions.map((s) => {
              const c = countOf(s.id);
              return (
                <RecordRow
                  key={s.id}
                  href={`/courses/${id}/attendance/${s.id}`}
                  date={formatMonthDayWeekday(s.startTime)}
                  time={formatHourMinute(s.startTime)}
                  active={s.status === "active"}
                  detail={`${c.present}/${studentCount} 人签到${c.leave > 0 ? ` · ${c.leave} 人请假` : ""}`}
                  right={<RateText rate={rateFor(s.id)} />}
                />
              );
            })}
          </ListBox>
        )}
      </Section>

      <Section
        title="答题记录"
        action={
          quizSessions.length > 0 && (
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" asChild>
              <a href={`/api/courses/${id}/quiz/export`} download>
                <Download className="h-3.5 w-3.5" />
                导出答题
              </a>
            </Button>
          )
        }
      >
        {quizSessions.length === 0 ? (
          <EmptyState
            icon={<MessageSquareText />}
            title="还没有答题记录"
            description="课堂提问时点击「开始答题」，学生扫码提交答案，你可以逐一评分。"
          />
        ) : (
          <ListBox>
            {quizSessions.map((s) => (
              <RecordRow
                key={s.id}
                href={`/courses/${id}/quiz/${s.id}`}
                date={formatMonthDayWeekday(s.startTime)}
                time={formatHourMinute(s.startTime)}
                active={s.status === "active"}
                detail={`${s._count.submissions}/${studentCount} 人提交`}
                right={
                  <span className="num text-muted-foreground">
                    {studentCount > 0 ? Math.min(100, (s._count.submissions / studentCount) * 100).toFixed(0) : 0}%
                  </span>
                }
              />
            ))}
          </ListBox>
        )}
      </Section>
    </>
  );
}

function RecordRow({
  href,
  date,
  time,
  active,
  detail,
  right,
}: {
  href: string;
  date: string;
  time: string;
  active: boolean;
  detail: string;
  right: React.ReactNode;
}) {
  return (
    <Link href={href} className="group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 font-medium">
          {date}
          <span className="num font-normal text-muted-foreground">{time}</span>
          {active && <span className="tag tag-green">进行中</span>}
        </p>
        <p className="mt-0.5 text-[13px] text-muted-foreground">{detail}</p>
      </div>
      {right}
      <ChevronRight className="h-4 w-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
