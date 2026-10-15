"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";

const LINKS = [
  { href: "/", label: "Find Leads" },
  { href: "/leads", label: "Leads CRM" },
  { href: "/history", label: "Search History" },
];

export function AppNav({ email }: { email: string }) {
  const path = usePathname();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }
  return (
    <header className="sticky top-0 z-30 bg-navy text-white shadow">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" aria-label="Home"><Logo light /></Link>
        <nav className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
          {LINKS.map((l) => {
            const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href} className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${active ? "bg-white/15 text-white" : "text-blue-100 hover:bg-white/10"}`}>
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="hidden text-blue-200 md:inline">{email}</span>
          <button onClick={logout} className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold hover:bg-white/10">Log out</button>
        </div>
      </div>
    </header>
  );
}
