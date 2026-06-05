import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { DonateWidget } from "@/components/shared/donate-widget";
import "./globals.css";

export const metadata: Metadata = {
  title: "点名宝 — 极简课堂签到",
  description: "专为大学教师设计的极简课堂签到工具，30秒发起签到，课后自动统计出勤情况。",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full bg-[#F8FAFC]">
        <TooltipProvider>
          {children}
          <DonateWidget />
          <Toaster position="top-center" richColors />
        </TooltipProvider>
      </body>
    </html>
  );
}
