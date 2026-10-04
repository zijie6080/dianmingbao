import { Skeleton } from "@/components/ui/skeleton";

/** 页面加载骨架屏（侧边栏由布局提供，这里只占位内容区） */
export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-7 w-56" />
      </div>
      <Skeleton className="h-20 w-full rounded-lg" />
      <div className="space-y-px overflow-hidden rounded-lg border border-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-none" />
        ))}
      </div>
    </div>
  );
}
