/**
 * 姓名归一化：去掉所有空白（含全角空格），英文统一小写。
 * 学生输入「张 三」、「张三 」、名单里是「张三」都能匹配上。
 */
export function normalizeName(name: string): string {
  return name.replace(/[\s　]+/g, "").toLowerCase();
}

/** 存库前清理：首尾空白去掉，中间连续空白合并为一个 */
export function cleanText(value: string): string {
  return value.replace(/[\s　]+/g, " ").trim();
}

/** 在名单中按归一化姓名查找 */
export function findStudentsByName<T extends { name: string }>(students: T[], input: string): T[] {
  const target = normalizeName(input);
  if (!target) return [];
  return students.filter((s) => normalizeName(s.name) === target);
}
