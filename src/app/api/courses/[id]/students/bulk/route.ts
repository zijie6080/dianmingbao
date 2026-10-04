import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, readJson, withApi } from "@/lib/api";
import { importStudentRows, MAX_IMPORT_ROWS } from "@/lib/student-import";

const schema = z.object({
  students: z
    .array(z.object({ studentId: z.string().max(100), name: z.string().max(100) }))
    .min(1, "没有可导入的学生")
    .max(MAX_IMPORT_ROWS, `单次最多导入 ${MAX_IMPORT_ROWS} 名学生`),
});

// POST /api/courses/[id]/students/bulk — 粘贴名单批量导入
export const POST = withApi(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await getCurrentUser();
  if (!user) return jsonError("请先登录", 401);

  const { id } = await params;
  const course = await prisma.course.findUnique({ where: { id }, select: { userId: true } });
  if (!course || course.userId !== user.userId) return jsonError("课程不存在", 404);

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(parsed.error.issues[0].message, 400);

  // 粘贴的第 1 行就是数据，行号从 1 开始
  return NextResponse.json({ success: true, data: await importStudentRows(id, parsed.data.students, 1) });
});
