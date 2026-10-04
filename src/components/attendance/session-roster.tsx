"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ListBox, Section, StatStrip, rateTone } from "@/components/app/ui";
import { markStudent, removeRecord, type MarkType } from "@/lib/attendance-actions";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export type RecordType = "normal" | "late" | "leave";

export interface RosterStudent {
  id: string;
  studentId: string;
  name: string;
  recordType: RecordType | null;
  timestamp: string | null;
}

/**
 * 签到详情的名单区（含统计数字）。
 * 补签 / 请假 / 撤销都是乐观更新：点了立刻移到对应分组，失败再回滚；提示条里可「撤回」。
 */
export function SessionRoster({
  courseId,
  sessionId,
  students,
}: {
  courseId: string;
  sessionId: string;
  students: RosterStudent[];
}) {
  const router = useRouter();
  const [state, setState] = useState<Record<string, { type: RecordType | null; timestamp: string | null }>>(() =>
    Object.fromEntries(students.map((s) => [s.id, { type: s.recordType, timestamp: s.timestamp }]))
  );

  const setType = (id: string, type: RecordType | null) =>
    setState((prev) => ({
      ...prev,
      [id]: { type, timestamp: type ? prev[id]?.timestamp ?? new Date().toISOString() : null },
    }));

  const withState = students.map((s) => ({ ...s, ...state[s.id] }));
  const present = withState.filter((s) => s.type === "normal" || s.type === "late");
  const leave = withState.filter((s) => s.type === "leave");
  const absent = withState.filter((s) => !s.type);
  const lateCount = present.filter((s) => s.type === "late").length;
  const expected = students.length - leave.length;
  const rate = students.length === 0 ? 0 : expected <= 0 ? 100 : (present.length / expected) * 100;

  const mark = (s: RosterStudent, type: MarkType) =>
    markStudent({
      courseId,
      sessionId,
      studentId: s.id,
      name: s.name,
      type,
      onChange: (t) => {
        setType(s.id, t);
        router.refresh();
      },
    });

  const remove = (s: RosterStudent & { type: RecordType | null }, what?: string) =>
    removeRecord({
      courseId,
      sessionId,
      studentId: s.id,
      name: s.name,
      what,
      previous: s.type ?? undefined,
      onChange: (t) => {
        setType(s.id, t);
        router.refresh();
      },
    });

  return (
    <>
      <StatStrip
        items={[
          { label: "应到", value: expected, hint: leave.length > 0 ? `${leave.length} 人请假未计入` : undefined },
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
          <p className="rounded-lg border border-border px-4 py-6 text-center text-[13px] text-muted-foreground animate-in fade-in duration-300">
            全部到齐
          </p>
        ) : (
          <ListBox>
            {absent.map((s) => (
              <Row key={s.id} studentId={s.studentId} name={s.name}>
                <ActionButton onClick={() => mark(s, "leave")}>请假</ActionButton>
                <ActionButton primary onClick={() => mark(s, "late")}>
                  补签
                </ActionButton>
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
                <ActionButton primary onClick={() => mark(s, "late")}>
                  改为补签
                </ActionButton>
                <ActionButton danger onClick={() => remove(s, "请假")}>
                  撤销
                </ActionButton>
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
                tag={s.type === "late" ? <span className="tag tag-orange">迟到</span> : undefined}
                time={s.timestamp ? formatTime(s.timestamp) : undefined}
              >
                <ActionButton danger onClick={() => remove(s)}>
                  撤销
                </ActionButton>
              </Row>
            ))}
          </ListBox>
        )}
      </Section>
    </>
  );
}

function ActionButton({
  children,
  onClick,
  primary,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
  danger?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn(
        "h-7 px-2 text-xs",
        primary ? "text-primary hover:text-primary" : danger ? "text-muted-foreground hover:text-destructive" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </Button>
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
    <div className="flex items-center gap-3 px-4 py-2 text-sm animate-in fade-in slide-in-from-top-1 duration-200">
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
