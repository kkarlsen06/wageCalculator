// frontend/middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  if (url.pathname.startsWith("/login")) return NextResponse.next();
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
export const config = { matcher: ["/((?!_next|favicon|icon|apple-icon|marketing).*)"] };
