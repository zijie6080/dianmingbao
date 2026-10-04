import { Resend } from "resend";
import { logError } from "./api";

const SEND_TIMEOUT_MS = 10_000;

type SendResult = { success: boolean; dev?: boolean; error?: string; messageId?: string };

export type CodePurpose = "register" | "reset";

const PURPOSE_TEXT: Record<CodePurpose, { subject: string; intro: string }> = {
  register: { subject: "点名宝 - 邮箱验证码", intro: "你正在注册点名宝，邮箱验证码是：" },
  reset: { subject: "点名宝 - 重置密码验证码", intro: "你正在重置点名宝账号的密码，验证码是：" },
};

/** 发送验证码邮件 */
export async function sendVerificationCode(
  email: string,
  code: string,
  purpose: CodePurpose = "register"
): Promise<SendResult> {
  const text = PURPOSE_TEXT[purpose];
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || apiKey === "your-resend-api-key") {
    // 生产环境绝不能走开发模式：否则验证码会直接返回给前端，任何人都能注册
    if (process.env.NODE_ENV === "production") {
      logError("email", new Error("RESEND_API_KEY is not configured"));
      return { success: false, error: "邮件服务暂不可用，请联系管理员" };
    }
    console.log(`[DEV] ${purpose} code for ${email}: ${code}`);
    return { success: true, dev: true };
  }

  const resend = new Resend(apiKey);

  try {
    const sending = resend.emails.send({
      from: "点名宝 <noreply@dianmingbao.tech>",
      to: email,
      subject: text.subject,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #2563EB;">点名宝</h2>
          <p>${text.intro}</p>
          <div style="background: #F1F5F9; border-radius: 12px; padding: 16px; text-align: center; margin: 16px 0;">
            <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1E293B;">${code}</span>
          </div>
          <p style="color: #94A3B8; font-size: 14px;">验证码 10 分钟内有效，请勿转发给他人。如果不是你本人操作，请忽略这封邮件。</p>
        </div>
      `,
    });
    // 第三方服务卡住时不要拖到函数超时
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Resend timeout")), SEND_TIMEOUT_MS)
    );
    const { data, error } = await Promise.race([sending, timeout]);

    if (error) {
      logError("email", new Error(error.message), { provider: "resend" });
      return { success: false, error: "邮件发送失败，请检查邮箱地址或稍后重试" };
    }

    return { success: true, dev: false, messageId: data?.id };
  } catch (err) {
    logError("email", err, { provider: "resend" });
    return { success: false, error: "邮件发送失败，请稍后重试" };
  }
}
