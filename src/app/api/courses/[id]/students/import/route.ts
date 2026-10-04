import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { parseStudentExcel } from "@/lib/excel";
import { jsonError, logError, withApi } from "@/lib/api";
import { importStudentRows, MAX_IMPORT_ROWS } from "@/lib/student-import";

const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2MB，足够上千名学生

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
  if (rows.length > MAX_IMPORT_ROWS) {
    return jsonError(`单次最多导入 ${MAX_IMPORT_ROWS} 名学生`, 400);
  }

  return NextResponse.json({ success: true, data: await importStudentRows(id, rows) });
});
