import { clearAuthCookie } from "@/lib/auth";
import { NextResponse } from "next/server";
import { withApi } from "@/lib/api";

export const POST = withApi(async () => {
  await clearAuthCookie();
  return NextResponse.json({ success: true });
});
