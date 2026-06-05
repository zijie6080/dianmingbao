import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/** 发送验证码邮件 */
export async function sendVerificationCode(email: string, code: string) {
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === "your-resend-api-key") {
    console.log(`[DEV] Verification code for ${email}: ${code}`);
    return { success: true, dev: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: "点名宝 <noreply@dianmingbao.tech>",
      to: email,
      subject: "点名宝 - 邮箱验证码",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #2563EB;">点名宝</h2>
          <p>你的邮箱验证码是：</p>
          <div style="background: #F1F5F9; border-radius: 12px; padding: 16px; text-align: center; margin: 16px 0;">
            <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1E293B;">${code}</span>
          </div>
          <p style="color: #94A3B8; font-size: 14px;">验证码 10 分钟内有效，请勿转发给他人。</p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, dev: false };
  } catch (err) {
    console.error("Send email error:", err);
    return { success: false, error: "邮件发送失败" };
  }
}
