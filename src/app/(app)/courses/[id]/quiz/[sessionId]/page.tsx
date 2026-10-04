import { redirect, notFound } from "next/navigation";
import { Download } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getQuizSessionDetail } from "@/lib/quiz";
import { formatHourMinute, formatMonthDayWeekday, formatTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ListBox, PageHeader, Section, StatStrip } from "@/components/app/ui";
import { GradeDialog } from "@/components/quiz/grade-dialog";

export default async function QuizSessionDetailPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id, sessionId } = await params;

  const course = await prisma.course.findUnique({ where: { id } });
  if (!course || course.userId !== user.userId) notFound();

  const detail = await getQuizSessionDetail(sessionId);
  if (!detail || detail.session.courseId !== id) notFound();

  const { session, submitted, notSubmitted, totalStudents } = detail;
  const rate = totalStudents > 0 ? (submitted.length / totalStudents) * 100 : 0;
  const graded = submitted.filter((s) => s.score !== null);
  const avgScore = graded.length > 0 ? graded.reduce((sum, s) => sum + (s.score ?? 0), 0) / graded.length : null;

  return (
    <>
      <PageHeader
        crumbs={[{ href: "/courses", label: "全部课程" }, { href: `/courses/${id}`, label: course.name }, { label: "答题详情" }]}
        title={`${formatMonthDayWeekday(session.startTime)} 答题`}
        meta={
          <>
            {session.status === "active" ? <span className="tag tag-green">进行中</span> : <span className="tag tag-gray">已结束</span>}
            <span className="num">
              {formatHourMinute(session.startTime)} 开始 · 时长 {session.duration} 分钟
            </span>
          </>
        }
        actions={
          <Button variant="outline" className="gap-1.5" asChild>
            <a href={`/api/courses/${id}/quiz/${sessionId}/export`} download>
              <Download className="h-4 w-4" />
              导出 Excel
            </a>
          </Button>
        }
      />

      <StatStrip
        items={[
          { label: "已提交", value: submitted.length, hint: `共 ${totalStudents} 人` },
          { label: "提交率", value: `${rate.toFixed(0)}%` },
          { label: "已评分", value: `${graded.length}/${submitted.length}` },
          { label: "平均分", value: avgScore === null ? "—" : avgScore.toFixed(1) },
        ]}
      />

      <Section title={`答案 · ${submitted.length}`} description={submitted.length > 0 ? "点击右侧分数为学生评分。" : undefined}>
        {submitted.length === 0 ? (
          <p className="rounded-lg border border-border px-4 py-6 text-center text-[13px] text-muted-foreground">还没有学生提交</p>
        ) : (
          <ListBox>
            {submitted.map((s) => (
              <div key={s.id} className="px-4 py-3">
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-medium">{s.name}</span>
                  <span className="num text-[13px] text-muted-foreground">{s.studentId}</span>
                  <span className="num text-xs text-muted-foreground">{formatTime(s.timestamp)}</span>
                  <span className="ml-auto">
                    <GradeDialog
                      courseId={id}
                      sessionId={sessionId}
                      submissionId={s.submissionId}
                      studentName={s.name}
                      currentScore={s.score}
                    />
                  </span>
                </div>
                <p className="mt-1.5 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-foreground">{s.answer}</p>
              </div>
            ))}
          </ListBox>
        )}
      </Section>

      {notSubmitted.length > 0 && (
        <Section title={`未提交 · ${notSubmitted.length}`}>
          <div className="flex flex-wrap gap-1.5">
            {notSubmitted.map((s) => (
              <span key={s.id} className="tag tag-gray h-6 px-2" title={s.studentId}>
                {s.name}
              </span>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}
