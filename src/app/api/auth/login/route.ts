import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, setAuthCookie } from "@/lib/auth";
import { jsonError, readJson, tooManyRequests, withApi } from "@/lib/api";
import { getClientIp, rateLimit, resetRateLimit } from "@/lib/rate-limit";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("请输入有效的邮箱地址").max(200),
  password: z.string().min(1, "请输入密码").max(200),
});

export const POST = withApi(async (request: NextRequest) => {
  const ipLimit = rateLimit(`login:ip:${getClientIp(request)}`, 30, 60_000);
  if (!ipLimit.ok) return tooManyRequests(ipLimit.retryAfterSec);

  const parsed = loginSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0].message, 400);
  }

  const { email, password } = parsed.data;

  // 同一邮箱 15 分钟内最多失败 10 次，防暴力破解
  const emailKey = `login:email:${email}`;
  const emailLimit = rateLimit(emailKey, 10, 15 * 60_000);
  if (!emailLimit.ok) {
    return tooManyRequests(emailLimit.retryAfterSec, "密码错误次数过多，请 15 分钟后再试");
  }

  // 邮箱大小写不敏感（兼容历史数据中的大写邮箱）
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return jsonError("邮箱或密码错误", 401);
  }

  if (user.status === "DISABLED") {
    return jsonError("账号已被禁用，请联系管理员", 403);
  }

  resetRateLimit(emailKey);

  const token = await signToken({ userId: user.id, email: user.email, role: user.role });
  await setAuthCookie(token);

  return NextResponse.json({
    success: true,
    data: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
});
