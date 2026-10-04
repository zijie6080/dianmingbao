"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <div>
        <h1 className="text-xl font-semibold">页面出了点问题</h1>
        <p className="mt-1 text-sm text-muted-foreground">可能是网络波动或服务器繁忙，请稍后重试。</p>
        {error.digest && <p className="mt-2 font-mono text-xs text-muted-foreground">错误编号：{error.digest}</p>}
      </div>
      <div className="flex gap-2">
        <Button className="rounded-xl" onClick={() => unstable_retry()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          重试
        </Button>
        <Button variant="outline" className="rounded-xl" asChild>
          <Link href="/dashboard">回到首页</Link>
        </Button>
      </div>
    </div>
  );
}
