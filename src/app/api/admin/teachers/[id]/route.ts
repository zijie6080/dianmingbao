import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

function checkAdmin(user: { role: string } | null) {
  if (!user || user.role !== "ADMIN") return false;
  return true;
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!checkAdmin(user)) return NextResponse.json({ success: false, error: "无权限" }, { status: 403 });
  const { id } = await params;
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!checkAdmin(user)) return NextResponse.json({ success: false, error: "无权限" }, { status: 403 });
  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });

  await prisma.user.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!checkAdmin(user)) return NextResponse.json({ success: false, error: "无权限" }, { status: 403 });
  const { id } = await params;
  const body = await request.json();
  if (!body.password || body.password.length < 6) {
    return NextResponse.json({ success: false, error: "密码至少6位" }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(body.password, 10);
  await prisma.user.update({ where: { id }, data: { password: hashedPassword } });
  return NextResponse.json({ success: true, message: "密码已重置" });
}
