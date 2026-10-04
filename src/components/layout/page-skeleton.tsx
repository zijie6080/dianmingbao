import { Skeleton } from "@/components/ui/skeleton";

/** 教师端页面加载骨架屏（服务端数据加载期间显示） */
export function PageSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="h-16 border-b border-border bg-white/80" />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      </main>
    </div>
  );
}
