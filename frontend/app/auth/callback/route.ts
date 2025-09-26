import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Session } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

type CookiePayload = { name: string; value: string; options: CookieOptions };

function createSupabaseRouteClient(request: NextRequest) {
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

function safeRedirect(url: URL, fallback = "/") {
  const nextParam = url.searchParams.get("next") ?? fallback;
  return nextParam.startsWith("/") ? nextParam : fallback;
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const errorDescription = requestUrl.searchParams.get("error_description");
  const { supabase, applyCookies } = createSupabaseRouteClient(request);

  if (errorDescription) {
    const redirectTarget = new URL(
      `/login?error=${encodeURIComponent(errorDescription)}`,
      requestUrl.origin,
    );
    return applyCookies(NextResponse.redirect(redirectTarget));
  }

  const code = requestUrl.searchParams.get("code");
  if (code) {
    try {
      await supabase.auth.exchangeCodeForSession(code);
    } catch (error) {
      const fallback = new URL(
        `/login?error=${encodeURIComponent("Kunne ikke fullføre innloggingen.")}`,
        requestUrl.origin,
      );
      return applyCookies(NextResponse.redirect(fallback));
    }
  }

  const redirectPath = safeRedirect(requestUrl);
  const redirectTo = new URL(redirectPath, requestUrl.origin);
  return applyCookies(NextResponse.redirect(redirectTo));
}

type AuthStatePayload = {
  event: string;
  session: Session | null;
};

export async function POST(request: NextRequest) {
  let payload: AuthStatePayload;
  try {
    payload = (await request.json()) as AuthStatePayload;
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "Ugyldig forespørsel" },
      { status: 400 },
    );
  }

  const { event, session } = payload;
  const { supabase, applyCookies } = createSupabaseRouteClient(request);

  try {
    if (event === "SIGNED_OUT") {
      await supabase.auth.signOut();
    } else if (session) {
      await supabase.auth.setSession(session);
    }
    return applyCookies(NextResponse.json({ ok: true }));
  } catch (error: any) {
    return applyCookies(
      NextResponse.json(
        { ok: false, error: error?.message ?? "Kunne ikke oppdatere sesjonen" },
        { status: 400 },
      ),
    );
  }
}
