/**
 * 重置密码验证码与注册验证码共用 EmailVerification 表，
 * 用 "reset:" 前缀区分，两种验证码不能互相使用（无需改表结构）。
 */
export function resetCodeKey(email: string): string {
  return `reset:${email.trim().toLowerCase()}`;
}
