// frontend/middleware.ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

type CookiePayload = { name: string; value: string; options: CookieOptions };

function createMiddlewareSupabase(request: NextRequest) {
  const pendingCookies: CookiePayload[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll().map(({ name, value }) => ({ name, value }));
        },
        setAll(cookies) {
          pendingCookies.splice(0, pendingCookies.length, ...cookies);
        },
      },
    },
  );

  const applyCookies = (response: NextResponse) => {
    pendingCookies.forEach(({ name, value, options }) => {
      response.cookies.set({ name, value, ...options });
    });
    return response;
  };

  return { supabase, applyCookies };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/auth/callback") || pathname.startsWith("/login")) {
    return NextResponse.next();
  }

  const { supabase, applyCookies } = createMiddlewareSupabase(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return applyCookies(NextResponse.redirect(redirectUrl));
  }

  return applyCookies(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next|favicon|icon|apple-icon|marketing).*)"],
};
