import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

function checkAdmin(user: { role: string } | null) {
  if (!user || user.role !== "ADMIN") return false;
  return true;
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!checkAdmin(user)) return NextResponse.json({ success: false, error: "无权限" }, { status: 403 });

  const search = request.nextUrl.searchParams.get("search") || "";
  const where: Record<string, unknown> = { role: "TEACHER" };
  if (search) {
    where.OR = [{ name: { contains: search } }, { email: { contains: search } }];
  }

  const teachers = await prisma.user.findMany({
    where, orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true,
      _count: { select: { courses: true } },
    },
  });

  return NextResponse.json({ success: true, data: teachers.map((t) => ({
    ...t, courseCount: t._count.courses, createdAt: t.createdAt.toISOString(),
  })) });
}

const createSchema = z.object({
  name: z.string().min(1), email: z.string().email(), password: z.string().min(6),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!checkAdmin(user)) return NextResponse.json({ success: false, error: "无权限" }, { status: 403 });

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return NextResponse.json({ success: false, error: "邮箱已存在" }, { status: 409 });

  const hashedPassword = await bcrypt.hash(parsed.data.password, 10);
  const teacher = await prisma.user.create({
    data: { ...parsed.data, password: hashedPassword, role: "TEACHER", status: "ACTIVE" },
  });

  return NextResponse.json({ success: true, data: { id: teacher.id, name: teacher.name, email: teacher.email } }, { status: 201 });
}
