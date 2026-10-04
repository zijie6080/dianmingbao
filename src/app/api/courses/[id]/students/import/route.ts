import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { parseStudentExcel } from "@/lib/excel";
import { jsonError, logError, withApi } from "@/lib/api";
import { cleanText } from "@/lib/names";

const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2MB，足够上千名学生
const MAX_ROWS = 2000;

// POST /api/courses/[id]/students/import — 批量导入学生
export const POST = withApi(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await getCurrentUser();
  if (!user) {
    return jsonError("请先登录", 401);
  }

  const { id } = await params;
  const course = await prisma.course.findUnique({ where: { id } });
  if (!course || course.userId !== user.userId) {
    return jsonError("课程不存在", 404);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("请上传Excel文件", 400);
  }
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return jsonError("请上传Excel文件", 400);
  }

  const lowerName = file.name.toLowerCase();
  if (!lowerName.endsWith(".xlsx") && !lowerName.endsWith(".xls")) {
    return jsonError("仅支持 .xlsx / .xls 文件", 400);
  }

  if (file.size > MAX_FILE_BYTES) {
    return jsonError("文件过大，请控制在 2MB 以内", 400);
  }

  let rows: { studentId: string; name: string }[];
  try {
    rows = parseStudentExcel(await file.arrayBuffer());
  } catch (error) {
    logError("import-parse", error, { courseId: id });
    return jsonError("无法读取文件，请确认是有效的 Excel 文件（可下载模板参考）", 400);
  }

  if (rows.length === 0) {
    return jsonError("文件中没有有效数据，请确保包含「学号」和「姓名」列", 400);
  }
  if (rows.length > MAX_ROWS) {
    return jsonError(`单次最多导入 ${MAX_ROWS} 名学生`, 400);
  }

  const errors: { row: number; studentId: string; reason: string }[] = [];
  const seen = new Set<string>();
  const valid: { studentId: string; name: string; courseId: string }[] = [];
  let duplicatedInFile = 0;

  rows.forEach((r, i) => {
    const rowNo = i + 2; // Excel 行号（第1行是表头）
    const studentId = r.studentId.trim();
    const name = cleanText(r.name);
    if (studentId.length > 30 || name.length > 50) {
      errors.push({ row: rowNo, studentId, reason: "学号或姓名过长" });
      return;
    }
    if (seen.has(studentId)) {
      duplicatedInFile++;
      return;
    }
    seen.add(studentId);
    valid.push({ studentId, name, courseId: id });
  });

  // 一次批量写入；已存在的学号自动跳过（数据库唯一索引保证并发安全）
  const result = await prisma.student.createMany({ data: valid, skipDuplicates: true });
  const imported = result.count;

  return NextResponse.json({
    success: true,
    data: {
      total: rows.length,
      imported,
      skipped: valid.length - imported + duplicatedInFile,
      errors,
    },
  });
});
