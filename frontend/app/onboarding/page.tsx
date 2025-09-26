// frontend/app/onboarding/page.tsx
import { supabaseServerReadonly } from "@/lib/supabase/server-readonly";

export default async function OnboardingPage() {
  const supabase = supabaseServerReadonly();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const greeting = user?.user_metadata?.first_name
    ? `Hei, ${user.user_metadata.first_name}!`
    : "Hei!";

  return (
    <main className="p-xl flex-v gap-md">
      <h1 className="display2">{greeting}</h1>
      <p className="body color-light__onsurfacevariant">
        Vi gjør onboarding-flyten klar. Legg til den informasjonen du trenger
        her senere.
      </p>
    </main>
  );
}
