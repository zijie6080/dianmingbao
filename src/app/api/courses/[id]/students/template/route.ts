import { getCurrentUser } from "@/lib/auth";
import { generateStudentTemplate } from "@/lib/excel";
import { jsonError, withApi, xlsxResponse } from "@/lib/api";

// GET /api/courses/[id]/students/template — 下载学生名单导入模板
export const GET = withApi(async () => {
  const user = await getCurrentUser();
  if (!user) return jsonError("请先登录", 401);
  return xlsxResponse(generateStudentTemplate(), "学生名单导入模板");
});
