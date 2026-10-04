import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <SearchX className="h-7 w-7" />
      </div>
      <div>
        <h1 className="text-xl font-semibold">页面不存在</h1>
        <p className="mt-1 text-sm text-muted-foreground">链接可能已失效，或者这门课程已被删除。</p>
      </div>
      <Button  asChild>
        <Link href="/dashboard">回到首页</Link>
      </Button>
    </div>
  );
}
