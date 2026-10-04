// 端到端冒烟测试：对运行中的服务发起真实请求（需要数据库）。
//
// 用法：
//   BASE_URL=http://localhost:3000 E2E_EMAIL=teacher@example.com E2E_PASSWORD=xxx npm run test:e2e
//
// 账号可以是已存在的教师账号；若服务端处于开发模式（未配置 RESEND_API_KEY 且非 production），
// 不提供账号时会自动注册一个临时教师。测试会创建并在结束时删除一门测试课程。
import { test, before, after } from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL || "http://localhost:3000";
let cookie = "";
let courseId = "";

async function api(path, { method = "GET", json, body, headers = {}, auth = true } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(auth && cookie ? { Cookie: cookie } : {}),
      // 每个测试请求使用独立 IP，避免触发按 IP 的限流
      "x-forwarded-for": headers["x-forwarded-for"] || `10.${rand()}.${rand()}.${rand()}`,
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : body,
    redirect: "manual",
  });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie?.startsWith("dmb-token=")) cookie = setCookie.split(";")[0];
  const type = res.headers.get("content-type") || "";
  const data = type.includes("json") ? await res.json() : null;
  return { status: res.status, data, headers: res.headers, res };
}

function rand() {
  return Math.floor(Math.random() * 250) + 1;
}

const uid = Date.now().toString(36);

before(async () => {
  const health = await api("/api/health", { auth: false });
  assert.equal(health.status, 200, "服务未启动或数据库不可用");

  if (process.env.E2E_EMAIL && process.env.E2E_PASSWORD) {
    const login = await api("/api/auth/login", {
      method: "POST",
      json: { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD },
    });
    assert.equal(login.status, 200, `登录失败：${JSON.stringify(login.data)}`);
    return;
  }

  const email = `e2e-${uid}@example.com`;
  const sent = await api("/api/auth/send-code", { method: "POST", json: { email } });
  assert.ok(sent.data?.dev, "非开发模式请提供 E2E_EMAIL / E2E_PASSWORD");
  const reg = await api("/api/auth/register", {
    method: "POST",
    json: { email, password: "secret123", name: "测试老师", code: sent.data.code },
  });
  assert.equal(reg.status, 200, JSON.stringify(reg.data));
});

after(async () => {
  if (courseId) await api(`/api/courses/${courseId}`, { method: "DELETE" });
});

test("鉴权：未登录访问受保护接口返回 401", async () => {
  const res = await api("/api/courses", { auth: false });
  assert.equal(res.status, 401);
  const page = await api("/dashboard", { auth: false });
  assert.equal(page.status, 307);
  assert.match(page.headers.get("location"), /\/login\?from=%2Fdashboard/);
});

test("输入校验：非法 JSON 和空字段返回 400 而不是 500", async () => {
  const bad = await api("/api/courses", { method: "POST", body: "{oops", headers: { "Content-Type": "application/json" } });
  assert.equal(bad.status, 400);
  const empty = await api("/api/courses", { method: "POST", json: { name: "  ", semester: "2026秋季" } });
  assert.equal(empty.status, 400);
});

test("完整签到流程", async (t) => {
  const course = await api("/api/courses", { method: "POST", json: { name: `E2E课程-${uid}`, semester: "2026秋季" } });
  assert.equal(course.status, 201);
  courseId = course.data.data.id;

  await t.test("没有学生时不能发起签到", async () => {
    const res = await api(`/api/courses/${courseId}/attendance`, { method: "POST", json: { duration: 5 } });
    assert.equal(res.status, 400);
  });

  await t.test("下载模板并导入（含重复学号）", async () => {
    const tpl = await api(`/api/courses/${courseId}/students/template`);
    assert.equal(tpl.status, 200);
    assert.match(tpl.headers.get("content-disposition"), /filename\*=UTF-8''/);
    const buf = await tpl.res.arrayBuffer();
    const form = new FormData();
    form.append("file", new Blob([buf]), "students.xlsx");
    const first = await api(`/api/courses/${courseId}/students/import`, { method: "POST", body: form });
    assert.equal(first.status, 200, JSON.stringify(first.data));
    assert.equal(first.data.data.imported, 2);
    const form2 = new FormData();
    form2.append("file", new Blob([buf]), "students.xlsx");
    const again = await api(`/api/courses/${courseId}/students/import`, { method: "POST", body: form2 });
    assert.equal(again.data.data.imported, 0);
    assert.equal(again.data.data.skipped, 2);

    const notExcel = new FormData();
    notExcel.append("file", new Blob(["hello"]), "a.txt");
    const rejected = await api(`/api/courses/${courseId}/students/import`, { method: "POST", body: notExcel });
    assert.equal(rejected.status, 400);
  });

  await t.test("手动添加学生，重复学号 409", async () => {
    for (const [studentId, name] of [["2024003", "王五"], ["2024004", "Li Lei"]]) {
      const res = await api(`/api/courses/${courseId}/students`, { method: "POST", json: { studentId, name } });
      assert.equal(res.status, 201);
    }
    const dup = await api(`/api/courses/${courseId}/students`, { method: "POST", json: { studentId: "2024003", name: "X" } });
    assert.equal(dup.status, 409);
  });

  const started = await api(`/api/courses/${courseId}/attendance`, { method: "POST", json: { duration: 5 } });
  assert.equal(started.status, 201);
  const session = started.data.data;
  assert.ok(session.qrAuth?.signature, "签到应返回动态二维码签名");

  let ticket = "";
  await t.test("二维码：无签名 / 错误签名被拒绝，正确签名换取凭证", async () => {
    const noSig = await api(`/api/check-session?token=${session.token}`, { auth: false });
    assert.equal(noSig.status, 400);
    assert.equal(noSig.data.code, "QR_EXPIRED");
    const badSig = await api(`/api/check-session?token=${session.token}&t=${session.qrAuth.bucket}&sig=deadbeef`, { auth: false });
    assert.equal(badSig.status, 400);
    const ok = await api(`/api/check-session?token=${session.token}&t=${session.qrAuth.bucket}&sig=${session.qrAuth.signature}`, { auth: false });
    assert.equal(ok.status, 200);
    ticket = ok.data.data.accessTicket;
    assert.ok(ticket);
  });

  const attend = (name, fingerprint, accessTicket = ticket) =>
    api("/api/attend", { method: "POST", auth: false, json: { token: session.token, name, accessTicket, fingerprint } });

  await t.test("学生签到：姓名容错、幂等重试、防代签", async () => {
    assert.equal((await attend("张三", "dev-a", "")).status, 400, "没有凭证必须拒绝");
    assert.equal((await attend("张三", "dev-a", "123.abc")).status, 403, "伪造凭证必须拒绝");
    assert.equal((await attend(" 张 三 ", "dev-a")).status, 201);
    const retry = await attend("张三", "dev-a");
    assert.equal(retry.status, 200, "同设备重试应视为成功");
    assert.equal(retry.data.data.already, true);
    assert.equal((await attend("张三", "dev-b")).status, 409, "他人设备不能重复签同一姓名");
    assert.equal((await attend("李四", "dev-a")).status, 409, "同一设备不能替别人签到");
    assert.equal((await attend("不存在", "dev-c")).status, 400);
    assert.equal((await attend("lilei", "dev-d")).status, 201, "英文名大小写/空格容错");
  });

  await t.test("并发：同一学生 20 个请求同时到达，只成功一次且没有 500", async () => {
    const results = await Promise.all(Array.from({ length: 20 }, (_, i) => attend("王五", `race-${i}`)));
    const statuses = results.map((r) => r.status);
    assert.equal(statuses.filter((s) => s === 201).length, 1, statuses.join(","));
    assert.ok(statuses.every((s) => s === 201 || s === 409), statuses.join(","));
  });

  await t.test("教师查看详情、补签、撤销", async () => {
    const detail = await api(`/api/courses/${courseId}/attendance/${session.id}`);
    assert.equal(detail.status, 200);
    assert.equal(detail.data.data.present.length, 3);
    assert.ok(detail.data.data.qrAuth, "进行中应返回新的二维码签名");
    const li = detail.data.data.absent.find((s) => s.name === "李四");
    const sup = () => api(`/api/courses/${courseId}/attendance/${session.id}/supplement`, { method: "POST", json: { studentId: li.id } });
    assert.equal((await sup()).status, 200);
    assert.equal((await sup()).status, 409);
    const undo = await api(`/api/courses/${courseId}/attendance/${session.id}/supplement`, { method: "DELETE", json: { studentId: li.id } });
    assert.equal(undo.status, 200);
  });

  await t.test("结束签到可重复点击；结束后不能再签", async () => {
    assert.equal((await api(`/api/courses/${courseId}/attendance/${session.id}`, { method: "PUT" })).status, 200);
    assert.equal((await api(`/api/courses/${courseId}/attendance/${session.id}`, { method: "PUT" })).status, 200);
    const late = await attend("李四", "dev-z");
    assert.equal(late.status, 400);
    assert.equal(late.data.code, "ENDED");
  });

  await t.test("导出：课程统计 / 单次详情", async () => {
    for (const path of [`/api/courses/${courseId}/export`, `/api/courses/${courseId}/attendance/${session.id}/export`]) {
      const res = await api(path);
      assert.equal(res.status, 200, path);
      assert.match(res.headers.get("content-type"), /spreadsheetml/);
      assert.ok((await res.res.arrayBuffer()).byteLength > 1000);
    }
    const stats = await api(`/api/courses/${courseId}/attendance/stats`);
    const zhang = stats.data.data.find((s) => s.name === "张三");
    assert.equal(zhang.presentCount, 1);
    assert.equal(zhang.attendanceRate, 100);
  });
});

test("答题流程：发起、提交、评分、导出", async () => {
  assert.ok(courseId, "依赖签到流程创建的课程");
  const started = await api(`/api/courses/${courseId}/quiz`, { method: "POST", json: { duration: 5 } });
  assert.equal(started.status, 201);
  const s = started.data.data;
  const check = await api(`/api/check-quiz?token=${s.token}&t=${s.qrAuth.bucket}&sig=${s.qrAuth.signature}`, { auth: false });
  assert.equal(check.status, 200);
  const submit = await api("/api/quiz-submit", {
    method: "POST",
    auth: false,
    json: { token: s.token, name: "张三", answer: "42", accessTicket: check.data.data.accessTicket, fingerprint: "q-a" },
  });
  assert.equal(submit.status, 201);
  const tooLong = await api("/api/quiz-submit", {
    method: "POST",
    auth: false,
    json: { token: s.token, name: "李四", answer: "x".repeat(6000), accessTicket: check.data.data.accessTicket, fingerprint: "q-b" },
  });
  assert.equal(tooLong.status, 400);

  const detail = await api(`/api/courses/${courseId}/quiz/${s.id}`);
  const sub = detail.data.data.submitted[0];
  const graded = await api(`/api/courses/${courseId}/quiz/${s.id}/score`, { method: "PATCH", json: { submissionId: sub.submissionId, score: 90 } });
  assert.equal(graded.status, 200);
  const badScore = await api(`/api/courses/${courseId}/quiz/${s.id}/score`, { method: "PATCH", json: { submissionId: sub.submissionId, score: 101 } });
  assert.equal(badScore.status, 400);
  assert.equal((await api(`/api/courses/${courseId}/quiz/${s.id}`, { method: "PUT" })).status, 200);
  const exp = await api(`/api/courses/${courseId}/quiz/export`);
  assert.equal(exp.status, 200);
});

test("二维码图片接口只为本站链接生成", async () => {
  const foreign = await api(`/api/qr?url=${encodeURIComponent("https://evil.example.com/attend/x")}`, { auth: false });
  assert.equal(foreign.status, 400);
  const host = new URL(BASE).host;
  const own = await api(`/api/qr?url=${encodeURIComponent(`http://${host}/attend/abc?t=1&sig=x`)}`, { auth: false });
  assert.equal(own.status, 200);
  assert.equal(own.headers.get("content-type"), "image/png");
});

test("权限隔离：教师不能访问管理接口和别人的课程", async () => {
  assert.equal((await api("/api/admin/stats")).status, 403);
  assert.equal((await api("/api/admin/teachers")).status, 403);
  const other = await api("/api/courses/00000000-0000-0000-0000-000000000000");
  assert.equal(other.status, 404);
});

test("页面可正常渲染", async () => {
  for (const path of ["/", "/login", "/dashboard", "/courses", `/courses/${courseId}`, `/courses/${courseId}/students`, `/courses/${courseId}/attendance`]) {
    const res = await api(path);
    assert.equal(res.status, 200, path);
  }
  // 有 loading.tsx 时响应已开始流式输出，状态码是 200，但会渲染「页面不存在」
  const missing = await api("/courses/not-a-real-id");
  assert.match(await missing.res.text(), /页面不存在/);
  const admin = await api("/admin");
  assert.equal(admin.status, 307, "教师访问 /admin 应被重定向");
});

test("登录暴力破解会被限流", async () => {
  const email = `nobody-${uid}@example.com`;
  const statuses = [];
  for (let i = 0; i < 12; i++) {
    const res = await api("/api/auth/login", { method: "POST", auth: false, json: { email, password: "wrong" } });
    statuses.push(res.status);
  }
  assert.ok(statuses.includes(429), statuses.join(","));
});
