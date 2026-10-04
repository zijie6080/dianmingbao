/**
 * 解析粘贴的学生名单（来自 Excel / 微信 / Word / 教务系统网页）。
 * 支持：「学号 姓名」「姓名 学号」、Tab / 逗号 / 空格分隔、表头行、带序号列。
 */
export interface ParsedRoster {
  rows: { studentId: string; name: string }[];
  invalid: { line: number; text: string }[];
}

const ID_RE = /^[A-Za-z]{0,4}\d[\dA-Za-z_-]{1,29}$/;

export function parseRosterText(text: string): ParsedRoster {
  const rows: ParsedRoster["rows"] = [];
  const invalid: ParsedRoster["invalid"] = [];

  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    // 表头行
    if (/学号|姓名|序号/.test(line) && !/\d{4,}/.test(line)) return;

    const tokens = line
      .split(/[\t,，;；|]+|\s+/)
      .map((t) => t.trim())
      .filter(Boolean);

    // 候选学号：含数字的字母数字串；多个时取最长的（短的通常是序号）
    const idCandidates = tokens.filter((t) => ID_RE.test(t));
    const studentId = [...idCandidates].sort((a, b) => b.length - a.length)[0];
    // 序号（如 1、2.、03）不算姓名
    const nameParts = tokens.filter((t) => t !== studentId && !/^\d{1,3}[.、)]?$/.test(t) && !ID_RE.test(t));
    const name = nameParts.join(" ").trim();

    if (studentId && studentId.length >= 3 && name) {
      rows.push({ studentId, name });
    } else {
      invalid.push({ line: i + 1, text: line });
    }
  });

  return { rows, invalid };
}
