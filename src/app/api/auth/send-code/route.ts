import { randomInt } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendVerificationCode } from "@/lib/email";
import { jsonError, readJson, tooManyRequests, withApi } from "@/lib/api";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("请输入有效的邮箱地址").max(200),
});

// POST /api/auth/send-code — 发送邮箱验证码
export const POST = withApi(async (request: NextRequest) => {
  // 防止被用来批量发邮件（会消耗邮件额度、影响发信信誉）
  const ipLimit = rateLimit(`send-code:ip:${getClientIp(request)}`, 5, 10 * 60_000);
  if (!ipLimit.ok) return tooManyRequests(ipLimit.retryAfterSec, "发送太频繁，请稍后再试");

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0].message, 400);
  }

  const { email } = parsed.data;

  const registered = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });
  if (registered) {
    return jsonError("该邮箱已注册，请直接登录", 409);
  }

  // 60 秒内只发一次；每小时最多 5 次（数据库计数，多实例下也有效）
  const [recent, hourlyCount] = await Promise.all([
    prisma.emailVerification.findFirst({
      where: { email, used: false, createdAt: { gt: new Date(Date.now() - 60 * 1000) } },
      select: { id: true },
    }),
    prisma.emailVerification.count({
      where: { email, createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } },
    }),
  ]);

  if (recent) {
    return NextResponse.json({ success: true, message: "验证码已发送，请检查邮箱" });
  }
  if (hourlyCount >= 5) {
    return tooManyRequests(3600, "该邮箱请求验证码次数过多，请 1 小时后再试");
  }

  const code = String(randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10分钟有效

  const result = await sendVerificationCode(email, code);

  // 只有真正发出（或开发模式）才保存，避免发送失败也占用冷却时间
  if (result.success) {
    await prisma.emailVerification.create({ data: { email, code, expiresAt } });
  }

  if (result.dev) {
    return NextResponse.json({
      success: true,
      message: `[开发模式] 验证码已生成，请查看控制台`,
      dev: true,
      code, // 仅开发环境返回验证码方便测试
    });
  }

  if (!result.success) {
    return jsonError(result.error || "邮件发送失败，请稍后重试", 502);
  }

  return NextResponse.json({ success: true, message: "验证码已发送，请检查邮箱" });
});
