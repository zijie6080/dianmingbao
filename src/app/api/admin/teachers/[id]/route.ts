import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isUniqueViolation, jsonError, readJson, withApi } from "@/lib/api";

/** 只允许管理员操作「教师」账号，不能操作管理员（包括自己） */
async function authorizeTarget(id: string): Promise<Response | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return jsonError("无权限", 403);
  if (id === user.userId) return jsonError("不能操作自己的账号", 400);

  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!target) return jsonError("教师不存在", 404);
  if (target.role !== "TEACHER") return jsonError("不能操作管理员账号", 403);
  return null;
}

export const DELETE = withApi(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const denied = await authorizeTarget(id);
  if (denied) return denied;

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
});

const updateSchema = z.object({
  name: z.string().trim().min(1, "请输入姓名").max(50).optional(),
  email: z.string().trim().toLowerCase().email("请输入有效的邮箱").max(200).optional(),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
});

export const PUT = withApi(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const denied = await authorizeTarget(id);
  if (denied) return denied;

  const parsed = updateSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(parsed.error.issues[0].message, 400);

  try {
    await prisma.user.update({ where: { id }, data: parsed.data });
  } catch (error) {
    if (isUniqueViolation(error)) return jsonError("该邮箱已被其他账号使用", 409);
    throw error;
  }
  return NextResponse.json({ success: true });
});

const passwordSchema = z.object({
  password: z.string().min(6, "密码至少6位").max(100, "密码最多100位"),
});

export const PATCH = withApi(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const denied = await authorizeTarget(id);
  if (denied) return denied;

  const parsed = passwordSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(parsed.error.issues[0].message, 400);

  const hashedPassword = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.update({ where: { id }, data: { password: hashedPassword } });
  return NextResponse.json({ success: true, message: "密码已重置" });
});
