import { redirect, notFound } from "next/navigation";
import { Download } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSessionDetail } from "@/lib/attendance";
import { formatHourMinute, formatMonthDayWeekday } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/ui";
import { SessionRoster, type RecordType } from "@/components/attendance/session-roster";

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

  const { session, present, leave, absent } = detail;

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

      <SessionRoster
        courseId={id}
        sessionId={sessionId}
        students={[
          ...present.map((s) => ({ ...s, recordType: s.recordType as RecordType, timestamp: s.timestamp })),
          ...leave.map((s) => ({ ...s, recordType: "leave" as const, timestamp: s.timestamp })),
          ...absent.map((s) => ({ ...s, recordType: null, timestamp: null })),
        ].sort((a, b) => a.studentId.localeCompare(b.studentId))}
      />
    </>
  );
}

