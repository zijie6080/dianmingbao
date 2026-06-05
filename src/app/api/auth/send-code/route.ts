import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendVerificationCode } from "@/lib/email";

const schema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
});

// POST /api/auth/send-code — 发送邮箱验证码
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    // 检查是否已有未过期的验证码（防止频繁发送）
    const recent = await prisma.emailVerification.findFirst({
      where: {
        email,
        used: false,
        expiresAt: { gt: new Date(Date.now() - 9 * 60 * 1000) }, // 1分钟内不重发
      },
    });

    if (recent) {
      return NextResponse.json({
        success: true,
        message: "验证码已发送，请检查邮箱",
      });
    }

    // 生成6位验证码
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10分钟有效

    // 保存到数据库
    await prisma.emailVerification.create({
      data: { email, code, expiresAt },
    });

    // 发送邮件
    const result = await sendVerificationCode(email, code);

    if (result.dev) {
      return NextResponse.json({
        success: true,
        message: `[开发模式] 验证码已生成，请查看控制台`,
        dev: true,
        code, // 开发环境返回验证码方便测试
      });
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "邮件发送失败" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "验证码已发送，请检查邮箱",
    });
  } catch (error) {
    console.error("Send code error:", error);
    return NextResponse.json(
      { success: false, error: "发送失败，请稍后重试" },
      { status: 500 }
    );
  }
}
