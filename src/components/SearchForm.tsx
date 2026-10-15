"use client";

import { useState } from "react";
import type { MetaDTO } from "@/lib/types";
import { SpinnerIcon } from "./Icons";

export type SearchFormValues = {
  country: string;
  state: string;
  city: string;
  area: string;
  niche: string;
  customNiche: string;
  target: string;
  websiteFilter: "none" | "weak" | "all";
  instagramFilter: "any" | "has" | "none";
  minQuality: string;
  checkWebsites: boolean;
  reachKm: string;
};

const DEFAULTS: SearchFormValues = {
  country: "India",
  state: "Karnataka",
  city: "Bengaluru",
  area: "",
  niche: "gym",
  customNiche: "",
  target: "100",
  websiteFilter: "none",
  instagramFilter: "any",
  minQuality: "",
  checkWebsites: false,
  reachKm: "0",
};

/** Vertical "Search & Filters" panel. `children` renders under the button (live progress). */
export function SearchForm({ meta, busy, searching, onSubmit, children }: { meta: MetaDTO | null; busy: boolean; searching?: boolean; onSubmit: (v: SearchFormValues) => void; children?: React.ReactNode }) {
  const [v, setV] = useState<SearchFormValues>(DEFAULTS);
  const set = <K extends keyof SearchFormValues>(k: K, val: SearchFormValues[K]) => setV((p) => ({ ...p, [k]: val }));
  const targetNum = Number(v.target);
  const targetValid = Number.isInteger(targetNum) && targetNum > 0;
  const configured = meta?.providers.filter((p) => p.configured) ?? [];

  return (
    <form
      className="card-glow flex flex-col gap-3 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (targetValid) onSubmit(v);
      }}
    >
      <h2 className="panel-title">Search &amp; Filters</h2>

      <Field label="Country" id="country"><input id="country" className="input" value={v.country} onChange={(e) => set("country", e.target.value)} required /></Field>
      <Field label="State" id="state"><input id="state" className="input" value={v.state} onChange={(e) => set("state", e.target.value)} /></Field>
      <Field label="City" id="city"><input id="city" className="input" value={v.city} onChange={(e) => set("city", e.target.value)} required /></Field>
      <Field label="Area / locality (optional)" id="area"><input id="area" className="input" placeholder="e.g. HSR Layout" value={v.area} onChange={(e) => set("area", e.target.value)} /></Field>

      <Field label="Search reach" id="reachKm">
        <select id="reachKm" className="input" value={v.reachKm} onChange={(e) => set("reachKm", e.target.value)}>
          <option value="0">City only</option>
          <option value="10">City + 10 km around</option>
          <option value="25">City + 25 km around</option>
          <option value="50">City + 50 km around</option>
        </select>
        {v.reachKm !== "0" && <p className="mt-1 text-[11px] text-slate-500">The city is searched first, then the surrounding area until your target is reached.</p>}
      </Field>

      <Field label="Business Niche" id="niche">
        <select id="niche" className="input" value={v.niche} onChange={(e) => set("niche", e.target.value)}>
          {(meta?.niches ?? []).map((n) => <option key={n.key} value={n.key}>{n.label}</option>)}
          <option value="custom">Custom niche…</option>
        </select>
      </Field>
      {v.niche === "custom" && (
        <Field label="Custom niche" id="customNiche"><input id="customNiche" className="input" placeholder="e.g. yoga studio" value={v.customNiche} onChange={(e) => set("customNiche", e.target.value)} required /></Field>
      )}

      <Field label="Number of leads required" id="target">
        <input id="target" className="input" inputMode="numeric" type="number" min={1} step={1} value={v.target} onChange={(e) => set("target", e.target.value)} required aria-invalid={!targetValid} />
        {!targetValid && <p className="mt-1 text-xs text-rose-300">Enter any positive whole number.</p>}
      </Field>

      <Field label="Website status" id="websiteFilter">
        <select id="websiteFilter" className="input" value={v.websiteFilter} onChange={(e) => set("websiteFilter", e.target.value as SearchFormValues["websiteFilter"])}>
          <option value="none">No website only</option>
          <option value="weak">Weak website (none / free page / down)</option>
          <option value="all">All</option>
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Instagram" id="instagramFilter">
          <select id="instagramFilter" className="input" value={v.instagramFilter} onChange={(e) => set("instagramFilter", e.target.value as SearchFormValues["instagramFilter"])}>
            <option value="any">Any</option>
            <option value="has">Has</option>
            <option value="none">None</option>
          </select>
        </Field>
        <Field label="Min. quality" id="minQuality">
          <select id="minQuality" className="input" value={v.minQuality} onChange={(e) => set("minQuality", e.target.value)}>
            <option value="">Any</option>
            <option value="45">Medium+</option>
            <option value="70">High</option>
          </select>
        </Field>
      </div>
      <p className="flex items-center justify-between rounded-lg border border-sky-400/10 bg-ink-900/50 px-3 py-2 text-xs">
        <span className="text-slate-400">Phone number</span>
        <span className="font-semibold text-emerald-300">Required ✓</span>
      </p>

      <label className="flex items-start gap-2 text-xs text-slate-400">
        <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-sky-400/30 bg-ink-900 accent-sky-400" checked={v.checkWebsites} onChange={(e) => set("checkWebsites", e.target.checked)} />
        <span>Check whether listed websites load (slower; unreachable sites are never called “No Website”).</span>
      </label>

      <button type="submit" className="btn-primary relative mt-1 w-full py-2.5 text-base" disabled={busy || !targetValid || (meta !== null && configured.length === 0)}>
        Find Leads
        {(busy || searching) && <SpinnerIcon className="absolute right-3 h-5 w-5" />}
      </button>

      {children}
    </form>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      {children}
    </div>
  );
}
