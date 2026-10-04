import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, ChevronRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getCourseSummaries, type CourseSummary } from "@/lib/stats";
import { EmptyState, ListBox, PageHeader, RateText, Section } from "@/components/app/ui";
import { CourseAvatar } from "@/components/app/course-visuals";
import { CreateCourseDialog } from "@/components/courses/course-form";

export default async function CoursesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const courses = await getCourseSummaries(user.userId);

  // 按学期分组，学期内保持「最近更新在前」
  const groups = new Map<string, CourseSummary[]>();
  for (const c of courses) {
    const list = groups.get(c.semester) ?? [];
    list.push(c);
    groups.set(c.semester, list);
  }
  const semesters = [...groups.keys()].sort((a, b) => b.localeCompare(a, "zh-CN"));

  return (
    <>
      <PageHeader
        title="全部课程"
        description={courses.length > 0 ? `共 ${courses.length} 门课程` : undefined}
        actions={<CreateCourseDialog />}
      />

      {courses.length === 0 ? (
        <EmptyState
          icon={<BookOpen />}
          title="还没有课程"
          description="新建一门课程，导入学生名单后就可以在课上发起签到。"
          action={<CreateCourseDialog />}
        />
      ) : (
        semesters.map((semester, i) => (
          <Section key={semester} title={semester} className={i === 0 ? "mt-0" : undefined}>
            <ListBox>
              <div className="hidden grid-cols-[1fr_72px_72px_72px_80px_16px] items-center gap-4 bg-muted/60 px-4 py-2 text-xs text-muted-foreground sm:grid">
                <span>课程</span>
                <span className="text-right">学生</span>
                <span className="text-right">签到</span>
                <span className="text-right">答题</span>
                <span className="text-right">出勤率</span>
                <span />
              </div>
              {groups.get(semester)!.map((c) => (
                <Link
                  key={c.id}
                  href={`/courses/${c.id}`}
                  className="group grid grid-cols-[1fr_auto_16px] items-center gap-4 px-4 py-3 transition-colors hover:bg-muted sm:grid-cols-[1fr_72px_72px_72px_80px_16px]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <CourseAvatar id={c.id} name={c.name} size={32} />
                    <div className="min-w-0">
                    <p className="truncate font-medium">{c.name}</p>
                    <p className="text-[13px] text-muted-foreground sm:hidden">
                      {c.studentCount} 名学生 · 签到 {c.sessionCount} 次
                    </p>
                    </div>
                  </div>
                  <span className="num hidden text-right text-muted-foreground sm:block">{c.studentCount}</span>
                  <span className="num hidden text-right text-muted-foreground sm:block">{c.sessionCount}</span>
                  <span className="num hidden text-right text-muted-foreground sm:block">{c.quizCount}</span>
                  <span className="text-right">
                    <RateText rate={c.averageAttendanceRate} empty={c.sessionCount === 0} />
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))}
            </ListBox>
          </Section>
        ))
      )}
    </>
  );
}
