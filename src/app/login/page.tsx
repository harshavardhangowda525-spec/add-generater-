"use client";

import { useState } from "react";
import { Logo } from "@/components/Logo";
import { api } from "@/lib/client";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(`/api/auth/${mode}`, { method: "POST", json: mode === "signup" ? { email, password, name } : { email, password } });
      window.location.href = "/";
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col lg:flex-row">
      <section className="flex flex-col justify-between border-b border-sky-400/15 bg-ink-900/70 px-6 py-8 text-white backdrop-blur lg:w-[44%] lg:border-b-0 lg:border-r lg:px-12 lg:py-12">
        <Logo />
        <div className="my-10 max-w-md lg:my-0">
          <h1 className="text-2xl font-bold leading-tight sm:text-3xl">Find local businesses that need a website — with real phone numbers.</h1>
          <p className="mt-4 text-sm text-slate-300">
            Search real provider data by city, locality and niche. Keep only businesses with no listed website and a public phone
            number, then track every call in your CRM.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-slate-300">
            <li>✓ Real data from Google Places, Geoapify and OpenStreetMap</li>
            <li>✓ Evidence-based website status — never guessed</li>
            <li>✓ Duplicate-free, persistent lead database</li>
          </ul>
        </div>
        <p className="hidden text-xs text-slate-500 lg:block">© {new Date().getFullYear()} Infinity Web &amp; Apps</p>
      </section>
      <section className="flex flex-1 items-center justify-center px-4 py-10">
        <form onSubmit={submit} className="card w-full max-w-sm p-6">
          <h2 className="text-lg font-bold text-white">{mode === "login" ? "Sign in" : "Create your account"}</h2>
          <p className="mb-5 mt-1 text-sm text-slate-400">
            {mode === "login" ? "Welcome back. Your leads are waiting." : "Your leads are private to your account."}
          </p>
          {mode === "signup" && (
            <div className="mb-3">
              <label className="label" htmlFor="name">Name</label>
              <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </div>
          )}
          <div className="mb-3">
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="mb-4">
            <label className="label" htmlFor="password">Password</label>
            <input id="password" type="password" required minLength={mode === "signup" ? 8 : 1} className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} />
          </div>
          {error && <p role="alert" className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
          <button className="btn-primary w-full" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button>
          <button type="button" className="mt-3 w-full text-center text-sm text-sky-300 hover:underline" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); }}>
            {mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
