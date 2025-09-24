"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const tabs = [
  { href: "/", label: "Home" },
  { href: "/onboarding", label: "Onboarding" },
  { href: "/settings", label: "Settings" },
];
export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className="bottom-nav">
      {tabs.map(t=>(
        <Link key={t.href} href={t.href} aria-current={path===t.href?"page":undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
