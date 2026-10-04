import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, setAuthCookie } from "@/lib/auth";
import { jsonError, readJson, tooManyRequests, withApi } from "@/lib/api";
import { getClientIp, rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { resetCodeKey } from "@/lib/password-reset";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("请输入有效的邮箱地址").max(200),
  code: z.string().trim().length(6, "请输入6位验证码"),
  password: z.string().min(6, "密码至少6位").max(100, "密码最多100位"),
});

// POST /api/auth/reset-password — 用邮箱验证码重置密码，成功后自动登录
export const POST = withApi(async (request: NextRequest) => {
  const ipLimit = rateLimit(`reset:ip:${getClientIp(request)}`, 20, 10 * 60_000);
  if (!ipLimit.ok) return tooManyRequests(ipLimit.retryAfterSec);

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(parsed.error.issues[0].message, 400);
  const { email, code, password } = parsed.data;

  // 每个邮箱 10 分钟内最多尝试 10 次，防止穷举验证码
  const attemptKey = `reset:code:${email}`;
  const attempts = rateLimit(attemptKey, 10, 10 * 60_000);
  if (!attempts.ok) return tooManyRequests(attempts.retryAfterSec, "验证码错误次数过多，请稍后重新获取");

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  const verification = user
    ? await prisma.emailVerification.findFirst({
        where: { email: resetCodeKey(email), code, used: false, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
      })
    : null;
  if (!user || !verification) return jsonError("验证码错误或已过期", 400);
  if (user.status !== "ACTIVE") return jsonError("账号已被禁用，请联系管理员", 403);

  // 原子地消费验证码：并发请求只有一个能成功
  const consumed = await prisma.emailVerification.updateMany({
    where: { id: verification.id, used: false },
    data: { used: true },
  });
  if (consumed.count === 0) return jsonError("验证码已被使用，请重新获取", 400);

  // 修改密码会更新 updatedAt，之前所有设备上的登录态随之失效
  await prisma.user.update({
    where: { id: user.id },
    data: { password: await bcrypt.hash(password, 10) },
  });
  resetRateLimit(attemptKey);
  resetRateLimit(`login:email:${email}`);

  const token = await signToken({ userId: user.id, email: user.email, role: user.role });
  await setAuthCookie(token);

  return NextResponse.json({
    success: true,
    message: "密码已重置",
    data: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
});
