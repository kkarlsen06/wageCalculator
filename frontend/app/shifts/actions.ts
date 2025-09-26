"use server";
import { supabaseForRoute } from "@/lib/supabase/route";
export async function createShift(input: { start_time: string; end_time: string; break_min: number }) {
  const supa = supabaseForRoute();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) throw new Error("unauthorized");
  const { error } = await supa.from("shifts").insert({ ...input, user_id: user.id });
  if (error) throw error;
}
