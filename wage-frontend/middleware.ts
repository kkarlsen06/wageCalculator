import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

const PUBLIC_PATHS = ["/login"];

const isPublicPath = (pathname: string) =>
  PUBLIC_PATHS.some((route) => pathname === route || pathname.startsWith(`${route}/`));

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = req.nextUrl;
  const search = req.nextUrl.search;

  const isAuthRoute = pathname.startsWith("/login");
  const isPublic = isPublicPath(pathname);

  if (!session && !isPublic) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";

    const hasRedirectTarget = pathname !== "/" && pathname !== "/login";
    if (hasRedirectTarget) {
      const target = `${pathname}${search}`;
      if (target.startsWith("/")) {
        redirectUrl.searchParams.set("redirect", target);
      }
    }

    return NextResponse.redirect(redirectUrl);
  }

  if (session && isAuthRoute) {
    const requested = req.nextUrl.searchParams.get("redirect") ?? "/";
    const destination = requested.startsWith("/") ? requested : "/";
    return NextResponse.redirect(new URL(destination, req.url));
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|assets|manifest.webmanifest|api).*)"],
};
