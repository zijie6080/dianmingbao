import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppSidebar } from "@/components/app/app-sidebar";

/** 教师端外壳：左侧栏（导航 + 我的课程），右侧内容 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const current = await getCurrentUser();
  if (!current) redirect("/login");

  const [user, courses] = await Promise.all([
    prisma.user.findUnique({ where: { id: current.userId }, select: { name: true, email: true, role: true } }),
    prisma.course.findMany({
      where: { userId: current.userId },
      select: { id: true, name: true, semester: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);
  if (!user) redirect("/login");

  return (
    <div className="min-h-dvh bg-background">
      <AppSidebar user={user} courses={courses} />
      <div className="lg:pl-60">
        <main className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-8 sm:pt-10">{children}</main>
      </div>
    </div>
  );
}
