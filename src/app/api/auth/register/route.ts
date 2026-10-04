import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, setAuthCookie } from "@/lib/auth";
import { isUniqueViolation, jsonError, readJson, tooManyRequests, withApi } from "@/lib/api";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { cleanText } from "@/lib/names";

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("请输入有效的邮箱地址").max(200),
  password: z.string().min(6, "密码至少6位").max(100, "密码最多100位"),
  name: z.string().trim().min(1, "请输入姓名").max(50, "姓名过长"),
  code: z.string().trim().length(6, "请输入6位验证码"),
});

export const POST = withApi(async (request: NextRequest) => {
  const ipLimit = rateLimit(`register:ip:${getClientIp(request)}`, 20, 10 * 60_000);
  if (!ipLimit.ok) return tooManyRequests(ipLimit.retryAfterSec);

  const parsed = registerSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0].message, 400);
  }

  const { email, password, code } = parsed.data;
  const name = cleanText(parsed.data.name);

  // 每个邮箱 10 分钟内最多尝试 10 次验证码，防止 6 位验证码被暴力穷举
  const codeLimit = rateLimit(`register:code:${email}`, 10, 10 * 60_000);
  if (!codeLimit.ok) {
    return tooManyRequests(codeLimit.retryAfterSec, "验证码错误次数过多，请稍后重新获取");
  }

  // 检查邮箱是否已注册（大小写不敏感）
  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) {
    return jsonError("该邮箱已注册，请直接登录", 409);
  }

  // 验证邮箱验证码
  const verification = await prisma.emailVerification.findFirst({
    where: { email, code, used: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!verification) {
    return jsonError("验证码错误或已过期", 400);
  }

  // 原子地标记验证码已使用：并发请求只有一个能成功
  const consumed = await prisma.emailVerification.updateMany({
    where: { id: verification.id, used: false },
    data: { used: true },
  });
  if (consumed.count === 0) {
    return jsonError("验证码已被使用，请重新获取", 400);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  let user;
  try {
    user = await prisma.user.create({
      data: { email, password: hashedPassword, name },
    });
  } catch (error) {
    if (isUniqueViolation(error)) return jsonError("该邮箱已注册，请直接登录", 409);
    throw error;
  }

  const token = await signToken({ userId: user.id, email: user.email, role: user.role });
  await setAuthCookie(token);

  return NextResponse.json({
    success: true,
    data: { id: user.id, email: user.email, name: user.name },
  });
});
