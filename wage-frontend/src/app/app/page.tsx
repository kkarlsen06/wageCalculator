import Link from "next/link";

const navigation = [
  { href: "/login", label: "Logg inn" },
  { href: "/onboarding", label: "Kom i gang" },
  { href: "/settings", label: "Innstillinger" },
];

export default function AppHome() {
  return (
    <main className="app-landing" data-testid="app-landing">
      <section className="app-landing__surface">
        <p className="app-landing__eyebrow">Wage Calculator</p>
        <h1 className="app-landing__title">Neste generasjon kalkulatoropplevelse</h1>
        <p className="app-landing__description">
          Vi holder på å flytte den eksisterende appen over til en ny plattform. I mellomtiden
          finner du innganger til de viktigste områdene her.
        </p>
        <nav aria-label="Primær navigasjon" className="app-landing__nav">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} className="app-landing__nav-link">
              {item.label}
            </Link>
          ))}
        </nav>
        <p className="app-landing__footnote">
          Du kan alltid bruke den eksisterende Vite-versjonen mens vi bygger om grensesnittet.
        </p>
      </section>
    </main>
  );
}
