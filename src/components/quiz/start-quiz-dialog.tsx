"use client";

import { LiveSessionDialog } from "@/components/live/live-session-dialog";

interface Props {
  courseId: string;
  courseName: string;
  studentCount?: number;
}

/** 发起答题 / 显示动态二维码 */
export function StartQuizDialog(props: Props) {
  return (
    <LiveSessionDialog
      kind="quiz"
      triggerVariant="outline"
      {...props}
    />
  );
}
