// frontend/app/shifts/page.tsx
import { supabaseServer } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/supabase";

export default async function ShiftsPage() {
  const supa = supabaseServer();

  const { data, error } = await supa
    .from<"user_shifts", Database["public"]["Tables"]["user_shifts"]["Row"]>("user_shifts")
    .select("*")
    .order("start_time", { ascending: false })
    .limit(50);

  if (error) throw error;
  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}
