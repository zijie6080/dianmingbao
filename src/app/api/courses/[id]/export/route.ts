import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getStudentStats } from "@/lib/stats";
import { exportAttendanceExcel } from "@/lib/excel";

// GET /api/courses/[id]/export — 导出考勤Excel
export async function GET(
  _request: NextRequest,
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

  const stats = await getStudentStats(id);

  if (stats.length === 0) {
    return NextResponse.json(
      { success: false, error: "没有学生数据可导出" },
      { status: 400 }
    );
  }

  const data = exportAttendanceExcel(stats, course.name);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NextResponse(data as any, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(course.name)}-考勤统计.xlsx"`,
    },
  });
}
