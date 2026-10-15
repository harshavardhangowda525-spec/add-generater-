"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { MetaDTO, StatsDTO } from "@/lib/types";
import { BellIcon, ChevronDown, UserIcon } from "./Icons";
import { Logo } from "./Logo";

export function AppNav({ email }: { email: string }) {
  const [menu, setMenu] = useState(false);
  const [providers, setProviders] = useState<MetaDTO["providers"] | null>(null);
  const [due, setDue] = useState(0);

  useEffect(() => {
    api<MetaDTO>("/api/meta").then((m) => setProviders(m.providers)).catch(() => {});
    const loadDue = () => api<{ stats: StatsDTO }>("/api/stats").then((r) => setDue(r.stats.followUpsDue)).catch(() => {});
    loadDue();
    const t = setInterval(loadDue, 60000);
    return () => clearInterval(t);
  }, []);

  const configured = providers?.filter((p) => p.configured) ?? [];
  const status =
    providers == null
      ? { text: "Checking…", dot: "bg-slate-400" }
      : configured.length
        ? { text: `${configured.length} data source${configured.length > 1 ? "s" : ""} online`, dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" }
        : { text: "No data source", dot: "bg-rose-400" };

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <header className="sticky top-0 z-30 border-b border-sky-400/10 bg-ink/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-3 sm:px-6">
        <Link href="/" aria-label="Infinity Lead Finder home" className="flex items-center gap-4">
          <Logo />
          <span className="hidden h-6 w-px bg-sky-400/20 sm:block" />
          <span className="hidden text-base font-semibold text-white sm:block">Infinity Lead Finder</span>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <Link href="/leads?followUp=due&website=any" className="icon-btn relative h-9 w-9 border border-sky-400/15" aria-label={`${due} follow-ups due`} title={`${due} follow-ups due`}>
            <BellIcon className="h-[18px] w-[18px]" />
            {due > 0 && <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-brand px-1 text-center text-[10px] font-bold leading-[18px] text-white">{due}</span>}
          </Link>
          <span
            className="hidden items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/5 px-3 py-1.5 text-xs text-slate-200 sm:inline-flex"
            title={configured.map((p) => p.label).join(", ") || "Configure a provider in the server environment"}
          >
            <span className={`h-2 w-2 rounded-full ${status.dot}`} />
            {status.text}
          </span>
          <div className="relative">
            <button className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-slate-300 hover:bg-white/5" onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu} aria-label="Account menu">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-sky-400/30 bg-sky-400/10"><UserIcon /></span>
              <ChevronDown className="h-4 w-4" />
            </button>
            {menu && (
              <>
                <button className="fixed inset-0 z-20 cursor-default" aria-label="Close menu" onClick={() => setMenu(false)} />
                <div role="menu" className="menu w-56" onClick={() => setMenu(false)}>
                  <div className="truncate border-b border-sky-400/10 px-3 py-2 text-xs text-slate-400">{email}</div>
                  <Link role="menuitem" className="menu-item" href="/">Dashboard</Link>
                  <Link role="menuitem" className="menu-item" href="/leads">Leads CRM</Link>
                  <Link role="menuitem" className="menu-item" href="/history">Search History</Link>
                  <button role="menuitem" className="menu-item text-rose-300" onClick={logout}>Log out</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
