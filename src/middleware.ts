import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// 需要登录才能访问的路径
const protectedPaths = ["/dashboard", "/courses", "/admin"];
const protectedApiPaths = ["/api/courses", "/api/admin"];

// 公开路径（无需登录）
const publicPaths = ["/login", "/register", "/api/auth", "/api/attend", "/attend", "/api/check-session", "/api/qr", "/quiz", "/api/quiz-submit", "/api/check-quiz"];

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret"
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 静态资源直接放行
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/public") ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|ico|json)$/)
  ) {
    return NextResponse.next();
  }

  // 公开路径直接放行
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));
  const isRoot = pathname === "/";

  // 需要检查的API路径
  const isProtectedApi = protectedApiPaths.some((p) => pathname.startsWith(p));
  const isProtectedPage = protectedPaths.some((p) => pathname.startsWith(p));

  if (isPublic || isRoot) {
    return NextResponse.next();
  }

  // 需要保护的路由
  if (isProtectedApi || isProtectedPage) {
    const token = request.cookies.get("dmb-token")?.value;

    if (!token) {
      if (isProtectedApi) {
        return NextResponse.json({ success: false, error: "请先登录" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }

    try {
      await jwtVerify(token, JWT_SECRET);
      return NextResponse.next();
    } catch {
      // Token 无效或过期
      if (isProtectedApi) {
        return NextResponse.json(
          { success: false, error: "登录已过期，请重新登录" },
          { status: 401 }
        );
      }
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("dmb-token");
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
