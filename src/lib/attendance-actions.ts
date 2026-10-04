"use client";

import { toast } from "sonner";
import { fetchJson } from "@/lib/client";

export type MarkType = "late" | "leave";

interface RemovedRecord {
  type: "normal" | "late" | "leave";
  timestamp: string;
  deviceFingerprint: string | null;
}

const url = (courseId: string, sessionId: string) => `/api/courses/${courseId}/attendance/${sessionId}/supplement`;

/**
 * 标记补签 / 请假，立即生效；提示条里带「撤回」。
 * onChange 用于乐观更新：成功时以新状态调用，失败或撤回时以 null（回到未签到）调用。
 */
export async function markStudent(opts: {
  courseId: string;
  sessionId: string;
  studentId: string;
  name: string;
  type: MarkType;
  onChange?: (state: MarkType | null) => void;
}): Promise<boolean> {
  const { courseId, sessionId, studentId, name, type, onChange } = opts;
  onChange?.(type);
  const res = await fetchJson(url(courseId, sessionId), { method: "POST", json: { studentId, type } });
  if (!res.ok) {
    onChange?.(null);
    toast.error(res.error || "操作失败");
    return false;
  }
  toast.success(type === "leave" ? `${name} 已标记请假` : `${name} 已补签（迟到）`, {
    action: {
      label: "撤回",
      onClick: async () => {
        onChange?.(null);
        const undo = await fetchJson(url(courseId, sessionId), { method: "DELETE", json: { studentId } });
        if (!undo.ok) {
          onChange?.(type);
          toast.error(undo.error || "撤回失败");
        }
      },
    },
  });
  return true;
}

/**
 * 撤销某位学生本次的签到 / 请假（不再弹确认框）；提示条里带「撤回」，按原样恢复。
 * onChange：撤销后以 null 调用，撤回成功后以原类型调用。
 */
export async function removeRecord(opts: {
  courseId: string;
  sessionId: string;
  studentId: string;
  name: string;
  what?: string;
  onChange?: (state: RemovedRecord["type"] | null) => void;
  previous?: RemovedRecord["type"];
}): Promise<boolean> {
  const { courseId, sessionId, studentId, name, what = "签到", onChange, previous } = opts;
  onChange?.(null);
  const res = await fetchJson<RemovedRecord>(url(courseId, sessionId), { method: "DELETE", json: { studentId } });
  if (!res.ok || !res.data) {
    if (previous) onChange?.(previous);
    toast.error(res.error || "撤销失败");
    return false;
  }
  const removed = res.data;
  toast(`已撤销 ${name} 的${what}`, {
    action: {
      label: "撤回",
      onClick: async () => {
        onChange?.(removed.type);
        const restore = await fetchJson(url(courseId, sessionId), {
          method: "POST",
          json: { studentId, restore: removed },
        });
        if (!restore.ok) {
          onChange?.(null);
          toast.error(restore.error || "撤回失败");
        }
      },
    },
  });
  return true;
}
