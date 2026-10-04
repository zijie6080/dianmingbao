// 纯逻辑单元测试：node --test（无需数据库）
// 运行：npm test
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.JWT_SECRET ||= "unit-test-secret";

const qr = await import("../src/lib/qr-auth.ts");
const names = await import("../src/lib/names.ts");
const format = await import("../src/lib/format.ts");
const limiter = await import("../src/lib/rate-limit.ts");

test("二维码签名：当前与上一个时间片有效，更早的失效", () => {
  const t0 = 1_700_000_000_000;
  const auth = qr.createQrAuth("attend", "tok", t0);
  assert.ok(qr.verifyQrAuth("attend", "tok", auth.bucket, auth.signature, t0));
  assert.ok(qr.verifyQrAuth("attend", "tok", auth.bucket, auth.signature, t0 + qr.QR_WINDOW_MS));
  assert.equal(qr.verifyQrAuth("attend", "tok", auth.bucket, auth.signature, t0 + 2 * qr.QR_WINDOW_MS + 1), false);
  assert.ok(auth.expiresIn > 0 && auth.expiresIn <= qr.QR_WINDOW_MS);
});

test("二维码签名：不同用途 / 不同 token / 篡改签名都无效", () => {
  const now = Date.now();
  const auth = qr.createQrAuth("attend", "tok", now);
  assert.equal(qr.verifyQrAuth("quiz", "tok", auth.bucket, auth.signature, now), false);
  assert.equal(qr.verifyQrAuth("attend", "other", auth.bucket, auth.signature, now), false);
  const last = auth.signature.at(-1);
  const tampered = auth.signature.slice(0, -1) + (last === "0" ? "1" : "0");
  assert.equal(qr.verifyQrAuth("attend", "tok", auth.bucket, tampered, now), false);
  assert.equal(qr.verifyQrAuth("attend", "tok", NaN, auth.signature, now), false);
  assert.equal(qr.verifyQrAuth("attend", "tok", auth.bucket, "", now), false);
});

test("访问凭证：到期前有效、到期后失效、不能跨场次使用", () => {
  const exp = new Date(Date.now() + 60_000);
  const ticket = qr.createAccessTicket("attend", "s1", exp);
  assert.ok(qr.verifyAccessTicket("attend", ticket, "s1"));
  assert.equal(qr.verifyAccessTicket("attend", ticket, "s2"), false);
  assert.equal(qr.verifyAccessTicket("quiz", ticket, "s1"), false);
  assert.equal(qr.verifyAccessTicket("attend", ticket, "s1", exp.getTime() + 1), false);
  assert.equal(qr.verifyAccessTicket("attend", "garbage", "s1"), false);
  // 篡改过期时间
  const [, sig] = ticket.split(".");
  assert.equal(qr.verifyAccessTicket("attend", `${exp.getTime() + 999999}.${sig}`, "s1"), false);
});

test("姓名匹配：忽略空格（含全角）和英文大小写", () => {
  const roster = [{ name: "张三" }, { name: "Li Lei" }, { name: "王 五" }];
  assert.equal(names.findStudentsByName(roster, " 张 三 ").length, 1);
  assert.equal(names.findStudentsByName(roster, "lilei").length, 1);
  assert.equal(names.findStudentsByName(roster, "王　五").length, 1);
  assert.equal(names.findStudentsByName(roster, "李四").length, 0);
  assert.equal(names.findStudentsByName(roster, "   ").length, 0);
  assert.equal(names.cleanText("  张　 三  "), "张 三");
});

test("时间格式化固定为北京时间（与服务器时区无关）", () => {
  // UTC 2026-10-03 23:30 = 北京时间 10-04 07:30
  const d = new Date("2026-10-03T23:30:00Z");
  assert.equal(format.formatIsoDate(d), "2026-10-04");
  assert.equal(format.formatHourMinute(d), "07:30");
  assert.equal(format.formatCountdown(125), "2:05");
  assert.equal(format.formatCountdown(-3), "0:00");
  const range = format.parseDayRange("2026-10-04");
  assert.equal(range.start.toISOString(), "2026-10-03T16:00:00.000Z");
  assert.equal(format.parseDayRange("2026/10/04"), null);
  assert.equal(format.parseDayRange("garbage"), null);
});

test("限流：超过次数后拒绝，重置后恢复", () => {
  const key = `test-${Math.random()}`;
  for (let i = 0; i < 3; i++) assert.ok(limiter.rateLimit(key, 3, 60_000).ok);
  const blocked = limiter.rateLimit(key, 3, 60_000);
  assert.equal(blocked.ok, false);
  assert.ok(blocked.retryAfterSec >= 1);
  limiter.resetRateLimit(key);
  assert.ok(limiter.rateLimit(key, 3, 60_000).ok);
});

test("限流：获取客户端 IP", () => {
  const req = new Request("http://x", { headers: { "x-forwarded-for": "1.2.3.4, 10.0.0.1" } });
  assert.equal(limiter.getClientIp(req), "1.2.3.4");
  assert.equal(limiter.getClientIp(new Request("http://x")), "unknown");
});
