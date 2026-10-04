import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "overview", label: "概览", path: "" },
  { key: "students", label: "学生名单", path: "/students" },
  { key: "stats", label: "考勤统计", path: "/attendance" },
] as const;

export type CourseTabKey = (typeof TABS)[number]["key"];

/** 课程内的二级导航（飞书 / Notion 式下划线标签） */
export function CourseTabs({ courseId, active }: { courseId: string; active: CourseTabKey }) {
  return (
    <nav aria-label="课程导航" className="-mt-2 mb-6 flex gap-5 border-b border-border">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={`/courses/${courseId}${t.path}`}
          aria-current={active === t.key ? "page" : undefined}
          className={cn(
            "-mb-px border-b-2 py-2 text-sm transition-colors",
            active === t.key
              ? "border-foreground font-medium text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
