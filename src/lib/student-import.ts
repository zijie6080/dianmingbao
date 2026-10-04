import { prisma } from "@/lib/prisma";
import { cleanText } from "@/lib/names";
import type { ImportResult } from "@/types";

export const MAX_IMPORT_ROWS = 2000;

/**
 * 批量导入学生（Excel 上传和粘贴名单共用）：
 * 校验长度、文件内去重，一次 createMany，已存在的学号由唯一索引自动跳过。
 */
export async function importStudentRows(
  courseId: string,
  rows: { studentId: string; name: string }[],
  /** 第一条数据对应的行号（Excel 第 1 行是表头，所以是 2） */
  firstRowNumber = 2
): Promise<ImportResult> {
  const errors: ImportResult["errors"] = [];
  const seen = new Set<string>();
  const valid: { studentId: string; name: string; courseId: string }[] = [];
  let duplicatedInInput = 0;

  rows.forEach((r, i) => {
    const rowNo = i + firstRowNumber;
    const studentId = r.studentId.trim();
    const name = cleanText(r.name);
    if (!studentId || !name) {
      errors.push({ row: rowNo, studentId, reason: "缺少学号或姓名" });
      return;
    }
    if (studentId.length > 30 || name.length > 50) {
      errors.push({ row: rowNo, studentId, reason: "学号或姓名过长" });
      return;
    }
    if (seen.has(studentId)) {
      duplicatedInInput++;
      return;
    }
    seen.add(studentId);
    valid.push({ studentId, name, courseId });
  });

  const result = valid.length > 0 ? await prisma.student.createMany({ data: valid, skipDuplicates: true }) : { count: 0 };

  return {
    total: rows.length,
    imported: result.count,
    skipped: valid.length - result.count + duplicatedInInput,
    errors,
  };
}
