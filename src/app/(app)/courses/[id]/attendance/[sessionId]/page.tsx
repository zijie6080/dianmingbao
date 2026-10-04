import { redirect, notFound } from "next/navigation";
import { Download } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSessionDetail } from "@/lib/attendance";
import { formatHourMinute, formatMonthDayWeekday, formatTime } from "@/lib/format";
import { sessionRate } from "@/lib/stats";
import { Button } from "@/components/ui/button";
import { ListBox, PageHeader, Section, StatStrip, rateTone } from "@/components/app/ui";
import { SupplementButton, UndoCheckInButton } from "@/components/attendance/supplement-button";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id, sessionId } = await params;

  const course = await prisma.course.findUnique({ where: { id } });
  if (!course || course.userId !== user.userId) notFound();

  const detail = await getSessionDetail(sessionId);
  if (!detail || detail.session.courseId !== id) notFound();

  const { session, present, leave, absent, totalStudents } = detail;
  const rate = sessionRate(present.length, leave.length, totalStudents);
  const lateCount = present.filter((s) => s.recordType === "late").length;
  const btn = { courseId: id, sessionId };

  return (
    <>
      <PageHeader
        crumbs={[{ href: "/courses", label: "全部课程" }, { href: `/courses/${id}`, label: course.name }, { label: "签到详情" }]}
        title={`${formatMonthDayWeekday(session.startTime)} 签到`}
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
            <a href={`/api/courses/${id}/attendance/${sessionId}/export`} download>
              <Download className="h-4 w-4" />
              导出 Excel
            </a>
          </Button>
        }
      />

      <StatStrip
        items={[
          { label: "应到", value: totalStudents - leave.length, hint: leave.length > 0 ? `${leave.length} 人请假未计入` : undefined },
          { label: "实到", value: present.length, hint: lateCount > 0 ? `含迟到 ${lateCount} 人` : undefined },
          { label: "缺席", value: absent.length, tone: absent.length > 0 ? "red" : "default" },
          { label: "出勤率", value: `${rate.toFixed(1)}%`, tone: rateTone(rate) },
        ]}
      />

      <Section
        title={`未签到 · ${absent.length}`}
        description={absent.length > 0 ? "到场但没扫上码点「补签」（记为迟到）；有假条点「请假」（不算缺勤）。" : undefined}
      >
        {absent.length === 0 ? (
          <p className="rounded-lg border border-border px-4 py-6 text-center text-[13px] text-muted-foreground">全部到齐</p>
        ) : (
          <ListBox>
            {absent.map((s) => (
              <Row key={s.id} studentId={s.studentId} name={s.name}>
                <SupplementButton {...btn} studentId={s.id} studentName={s.name} type="leave" />
                <SupplementButton {...btn} studentId={s.id} studentName={s.name} />
              </Row>
            ))}
          </ListBox>
        )}
      </Section>

      {leave.length > 0 && (
        <Section title={`请假 / 公假 · ${leave.length}`} description="不算缺勤，也不计入本次应到人数。">
          <ListBox>
            {leave.map((s) => (
              <Row key={s.id} studentId={s.studentId} name={s.name} tag={<span className="tag tag-blue">请假</span>}>
                <SupplementButton {...btn} studentId={s.id} studentName={s.name} />
                <UndoCheckInButton {...btn} studentId={s.id} studentName={s.name} what="请假" />
              </Row>
            ))}
          </ListBox>
        </Section>
      )}

      <Section title={`已签到 · ${present.length}`}>
        {present.length === 0 ? (
          <p className="rounded-lg border border-border px-4 py-6 text-center text-[13px] text-muted-foreground">暂无签到</p>
        ) : (
          <ListBox>
            {present.map((s) => (
              <Row
                key={s.id}
                studentId={s.studentId}
                name={s.name}
                tag={s.recordType === "late" ? <span className="tag tag-orange">迟到</span> : undefined}
                time={formatTime(s.timestamp)}
              >
                <UndoCheckInButton {...btn} studentId={s.id} studentName={s.name} />
              </Row>
            ))}
          </ListBox>
        )}
      </Section>
    </>
  );
}

function Row({
  studentId,
  name,
  tag,
  time,
  children,
}: {
  studentId: string;
  name: string;
  tag?: React.ReactNode;
  time?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 text-sm">
      <span className="num w-24 shrink-0 truncate text-[13px] text-muted-foreground">{studentId}</span>
      <span className="font-medium">{name}</span>
      {tag}
      <span className="ml-auto flex items-center gap-1">
        {time && <span className="num mr-2 text-xs text-muted-foreground">{time}</span>}
        {children}
      </span>
    </div>
  );
}
