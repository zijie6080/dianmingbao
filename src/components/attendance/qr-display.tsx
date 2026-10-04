"use client";

import { LiveSessionDialog } from "@/components/live/live-session-dialog";

interface Props {
  courseId: string;
  courseName: string;
  studentCount?: number;
}

/** 发起签到 / 显示动态二维码 */
export function StartAttendanceDialog(props: Props) {
  return <LiveSessionDialog kind="attend" {...props} />;
}
