import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getStudentStats } from "@/lib/stats";
import { exportAttendanceExcel } from "@/lib/excel";
import { logError, withApi, xlsxResponse } from "@/lib/api";
import { formatIsoDate } from "@/lib/format";

export const GET = withApi(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "请先登录" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course || course.userId !== user.userId) {
      return NextResponse.json({ success: false, error: "课程不存在" }, { status: 404 });
    }

    const stats = await getStudentStats(id);
    const data = exportAttendanceExcel(stats);
    return xlsxResponse(data, `${course.name}-考勤统计-${formatIsoDate(new Date())}`);
  } catch (err) {
    logError("export-attendance", err, { courseId: (await params).id });
    return NextResponse.json({ success: false, error: "导出失败，请稍后重试" }, { status: 500 });
  }
});
