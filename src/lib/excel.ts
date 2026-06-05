import * as XLSX from "xlsx";
import type { StudentStats } from "@/types";

/** 解析 Excel 文件，提取学号和姓名 */
export function parseStudentExcel(
  buffer: ArrayBuffer
): { studentId: string; name: string }[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("Excel 文件中没有找到工作表");
  }

  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
    defval: "",
  });

  if (data.length === 0) {
    throw new Error("Excel 文件中没有数据");
  }

  const headers = Object.keys(data[0]);
  const studentIdCol =
    headers.find((h) => h.includes("学号") || h.toLowerCase() === "studentid") || headers[0];
  const nameCol =
    headers.find((h) => h.includes("姓名") || h.toLowerCase() === "name") || headers[1];

  return data.map((row) => ({
    studentId: String(row[studentIdCol] || "").trim(),
    name: String(row[nameCol] || "").trim(),
  })).filter(r => r.studentId && r.name);
}

/** 导出考勤统计为 Uint8Array */
export function exportAttendanceExcel(
  stats: StudentStats[],
  _courseName: string
): Uint8Array {
  const worksheet = XLSX.utils.json_to_sheet(
    stats.map((s) => ({
      "学号": s.studentNum,
      "姓名": s.name,
      "出勤次数": s.presentCount,
      "迟到次数": s.lateCount ?? 0,
      "缺勤次数": s.absentCount,
      "总签到次数": s.totalSessions,
      "出勤率": `${s.attendanceRate.toFixed(1)}%`,
    }))
  );

  worksheet["!cols"] = [
    { wch: 15 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "考勤统计");

  // 返回 ArrayBuffer 再转 Uint8Array，避免 Buffer 兼容问题
  const arrayBuffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  return new Uint8Array(arrayBuffer);
}

/** 导出单次签到详情为 Uint8Array */
export function exportSessionDetailExcel(
  present: { studentId: string; name: string; type: string }[],
  absent: { studentId: string; name: string }[],
  sessionInfo: string
): Uint8Array {
  const rows = [
    ...present.map((s) => ({
      "状态": s.type === "late" ? "迟到（补签）" : "正常签到",
      "学号": s.studentId,
      "姓名": s.name,
    })),
    ...absent.map((s) => ({
      "状态": "缺勤",
      "学号": s.studentId,
      "姓名": s.name,
    })),
  ];

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 16 },
    { wch: 15 },
    { wch: 12 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sessionInfo);

  const arrayBuffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  return new Uint8Array(arrayBuffer);
}

/** 生成 Excel 导入模板 Buffer */
export function generateStudentTemplate(): Uint8Array {
  const worksheet = XLSX.utils.json_to_sheet([
    { "学号": "2024001", "姓名": "张三" },
    { "学号": "2024002", "姓名": "李四" },
  ]);

  worksheet["!cols"] = [{ wch: 15 }, { wch: 12 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "学生名单");

  const arrayBuffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  return new Uint8Array(arrayBuffer);
}
