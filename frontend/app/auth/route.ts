import { NextRequest, NextResponse } from "next/server";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const access_token = searchParams.get("access_token");
  const refresh_token = searchParams.get("refresh_token");
  const error = searchParams.get("error");

  if (error || !access_token || !refresh_token) {
    return NextResponse.redirect(new URL("/auth/login?error=oauth_failed", request.url));
  }

  const response = NextResponse.redirect(new URL("/dashboard", request.url));

  response.cookies.set("access_token", access_token, {
    ...COOKIE_OPTS,
    maxAge: 60 * 300,
  });

  response.cookies.set("refresh_token", refresh_token, {
    ...COOKIE_OPTS,
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}