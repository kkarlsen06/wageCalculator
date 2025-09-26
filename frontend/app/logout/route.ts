import { NextResponse } from "next/server";
import { supabaseForRoute } from "@/lib/supabase/route";

export async function GET(req: Request) {
  const supabase = supabaseForRoute();
  try {
    await supabase.auth.signOut();
  } catch {
    // If sign-out fails, continue redirecting to login to avoid trapping the user
  }
  return NextResponse.redirect(new URL("/login", req.url), { status: 302 });
}