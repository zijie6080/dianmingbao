import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error("JWT_SECRET must be set");
}

const JWT_SECRET = new TextEncoder().encode(jwtSecret);
const TOKEN_NAME = "dmb-token";
const EXPIRES_IN = "7d";

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  /** 签发时间（秒） */
  iat?: number;
}

/** 签发 JWT Token */
export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(EXPIRES_IN)
    .sign(JWT_SECRET);
}

/** 验证 JWT Token */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: (payload.role as string) || "TEACHER",
      iat: typeof payload.iat === "number" ? payload.iat : undefined,
    };
  } catch {
    return null;
  }
}

/** 获取当前登录用户（服务端组件 / API） */
export async function getCurrentUser(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_NAME)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { email: true, role: true, status: true, updatedAt: true },
  });
  if (!user || user.status !== "ACTIVE") return null;

  // 账号信息（如密码）在登录之后被修改过：旧登录态全部失效
  // iat 精度为秒，留 1 秒余量，避免刚重置密码后签发的新 Token 被误判
  if (payload.iat !== undefined && payload.iat * 1000 + 1000 <= user.updatedAt.getTime()) {
    return null;
  }

  return {
    userId: payload.userId,
    email: user.email,
    role: user.role,
  };
}

/** 设置登录 Cookie */
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: "/",
  });
}

/** 清除登录 Cookie */
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

export { TOKEN_NAME };
