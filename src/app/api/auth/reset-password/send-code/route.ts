import { randomInt } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendVerificationCode } from "@/lib/email";
import { jsonError, readJson, tooManyRequests, withApi } from "@/lib/api";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { resetCodeKey } from "@/lib/password-reset";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("请输入有效的邮箱地址").max(200),
});

const GENERIC_MESSAGE = "如果该邮箱已注册，验证码已发送，请查收邮件（含垃圾箱）";

// POST /api/auth/reset-password/send-code — 发送重置密码验证码
export const POST = withApi(async (request: NextRequest) => {
  const ipLimit = rateLimit(`reset-code:ip:${getClientIp(request)}`, 5, 10 * 60_000);
  if (!ipLimit.ok) return tooManyRequests(ipLimit.retryAfterSec, "发送太频繁，请稍后再试");

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(parsed.error.issues[0].message, 400);
  const { email } = parsed.data;

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { status: true },
  });
  // 不透露邮箱是否注册：未注册时也返回同样的提示
  if (!user) return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
  if (user.status !== "ACTIVE") return jsonError("账号已被禁用，请联系管理员", 403);

  const key = resetCodeKey(email);
  const [recent, hourlyCount] = await Promise.all([
    prisma.emailVerification.findFirst({
      where: { email: key, used: false, createdAt: { gt: new Date(Date.now() - 60 * 1000) } },
      select: { id: true },
    }),
    prisma.emailVerification.count({
      where: { email: key, createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } },
    }),
  ]);
  if (recent) return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
  if (hourlyCount >= 5) return tooManyRequests(3600, "请求次数过多，请 1 小时后再试");

  const code = String(randomInt(100000, 1000000));
  const result = await sendVerificationCode(email, code, "reset");
  if (result.success) {
    await prisma.emailVerification.create({
      data: { email: key, code, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
    });
  }

  if (result.dev) {
    return NextResponse.json({ success: true, message: "[开发模式] 验证码已生成", dev: true, code });
  }
  if (!result.success) return jsonError(result.error || "邮件发送失败，请稍后重试", 502);

  return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
});
