import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AdminSidebar } from "@/components/layout/admin-sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // 服务端校验管理员身份，普通教师直接回到教师端
  const user = await getCurrentUser();
  if (!user) redirect("/login?from=/admin");
  if (user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <div className="lg:pl-60">
        <main className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-8 sm:pt-10">{children}</main>
      </div>
    </div>
  );
}
