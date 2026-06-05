import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { parseStudentExcel } from "@/lib/excel";

// POST /api/courses/[id]/students/import — 批量导入学生
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "请先登录" }, { status: 401 });
  }

  const { id } = await params;
  const course = await prisma.course.findUnique({ where: { id } });
  if (!course || course.userId !== user.userId) {
    return NextResponse.json({ success: false, error: "课程不存在" }, { status: 404 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "请上传Excel文件" },
        { status: 400 }
      );
    }

    // 检查文件类型
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      return NextResponse.json(
        { success: false, error: "仅支持 .xlsx 文件" },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const students = parseStudentExcel(buffer);

    if (students.length === 0) {
      return NextResponse.json(
        { success: false, error: "文件中没有有效数据，请确保包含「学号」和「姓名」列" },
        { status: 400 }
      );
    }

    let imported = 0;
    let skipped = 0;
    const errors: { row: number; studentId: string; reason: string }[] = [];

    for (let i = 0; i < students.length; i++) {
      const { studentId, name } = students[i];

      try {
        // 检查学号是否已存在
        const existing = await prisma.student.findUnique({
          where: {
            courseId_studentId: { courseId: id, studentId },
          },
        });

        if (existing) {
          skipped++;
          continue;
        }

        await prisma.student.create({
          data: { studentId, name, courseId: id },
        });
        imported++;
      } catch {
        errors.push({
          row: i + 2, // Excel行号（第1行是表头）
          studentId,
          reason: "导入失败",
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: { total: students.length, imported, skipped, errors },
    });
  } catch (error) {
    console.error("Import students error:", error);
    return NextResponse.json(
      { success: false, error: "导入失败，请检查文件格式" },
      { status: 500 }
    );
  }
}
