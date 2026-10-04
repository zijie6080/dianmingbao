"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

/** 赞赏支持：放在侧边栏底部 / 页脚的一个文字入口，点击后弹出赞赏码 */
export function DonateDialog({ children }: { children: ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>赞赏支持</DialogTitle>
          <DialogDescription>点名宝免费使用。如果它帮到了你，欢迎请作者喝杯咖啡。</DialogDescription>
        </DialogHeader>
        <Image src="/donate-qr.png" alt="赞赏码" width={256} height={343} className="mx-auto h-auto w-full max-w-60 rounded-md" />
      </DialogContent>
    </Dialog>
  );
}
