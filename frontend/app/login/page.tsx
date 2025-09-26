import dynamic from "next/dynamic";
import { supabaseServerReadonly } from "@/lib/supabase/server-readonly";
import { redirect } from "next/navigation";

const LoginView = dynamic(() => import("./LoginView"), { ssr: false });

type SearchParams = Record<string, string | string[] | undefined>;

function extractParam(value: string | string[] | undefined) {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function sanitizePath(path?: string) {
  if (!path || !path.startsWith("/")) return "/";
  return path;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = supabaseServerReadonly();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const nextParam = sanitizePath(extractParam(searchParams.next));
  const errorParam = extractParam(searchParams.error);

  if (user) {
    redirect(nextParam || "/");
  }

  return <LoginView nextPath={nextParam} initialError={errorParam} />;
}
