import { courseColor } from "@/lib/course-color";
import { cn } from "@/lib/utils";

/** 课程头像：课程色方块 + 首字 */
export function CourseAvatar({
  id,
  name,
  size = 32,
  className,
}: {
  id: string;
  name: string;
  size?: number;
  className?: string;
}) {
  const c = courseColor(id);
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center font-semibold text-white", className)}
      style={{
        width: size,
        height: size,
        background: c.base,
        borderRadius: Math.max(4, Math.round(size * 0.22)),
        fontSize: Math.round(size * 0.46),
      }}
    >
      {name.slice(0, 1)}
    </span>
  );
}

/** Notion 式页面封面：课程色浅底 + 细点阵纹理 */
export function CourseCover({ id, className }: { id: string; className?: string }) {
  const c = courseColor(id);
  return (
    <div
      aria-hidden
      className={cn("h-28 w-full rounded-xl sm:h-32", className)}
      style={{
        backgroundColor: c.tint,
        backgroundImage: `radial-gradient(${c.base}26 1px, transparent 1.2px)`,
        backgroundSize: "14px 14px",
      }}
    />
  );
}
