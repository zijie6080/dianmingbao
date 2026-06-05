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

  // 自动检测列名（支持"学号"和"姓名"）
  const headers = Object.keys(data[0]);
  const studentIdCol =
    headers.find((h) => h.includes("学号") || h.toLowerCase() === "studentid") || headers[0];
  const nameCol =
    headers.find((h) => h.includes("姓名") || h.toLowerCase() === "name") || headers[1];

  return data.map((row, index) => ({
    studentId: String(row[studentIdCol] || "").trim(),
    name: String(row[nameCol] || "").trim(),
  })).filter(r => r.studentId && r.name);
}

/** 导出考勤统计为 Excel Buffer */
export function exportAttendanceExcel(
  stats: StudentStats[],
  courseName: string
): Buffer {
  const worksheet = XLSX.utils.json_to_sheet(
    stats.map((s) => ({
      "学号": s.studentNum,
      "姓名": s.name,
      "签到次数": s.presentCount,
      "缺席次数": s.absentCount,
      "出勤率": `${s.attendanceRate.toFixed(1)}%`,
    }))
  );

  // 设置列宽
  worksheet["!cols"] = [
    { wch: 15 }, // 学号
    { wch: 12 }, // 姓名
    { wch: 12 }, // 签到次数
    { wch: 12 }, // 缺席次数
    { wch: 12 }, // 出勤率
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "考勤统计");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return Buffer.from(buffer);
}

/** 生成 Excel 导入模板 Buffer */
export function generateStudentTemplate(): Buffer {
  const worksheet = XLSX.utils.json_to_sheet([
    { "学号": "2024001", "姓名": "张三" },
    { "学号": "2024002", "姓名": "李四" },
  ]);

  worksheet["!cols"] = [
    { wch: 15 },
    { wch: 12 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "学生名单");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return Buffer.from(buffer);
}
