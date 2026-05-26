import { NextRequest, NextResponse } from "next/server";

const PUBLIC_ROUTES = ["/", "/auth/login", "/auth/signup", "/auth/forgot-password", "/auth/reset-password"];
const AUTH_ROUTES   = ["/auth/login", "/auth/signup"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("access_token")?.value;
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));

  if (token && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!token && !PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};