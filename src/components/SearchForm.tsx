"use client";

import { useState } from "react";
import type { MetaDTO } from "@/lib/types";

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
};

export function SearchForm({ meta, busy, onSubmit }: { meta: MetaDTO | null; busy: boolean; onSubmit: (v: SearchFormValues) => void }) {
  const [v, setV] = useState<SearchFormValues>(DEFAULTS);
  const set = <K extends keyof SearchFormValues>(k: K, val: SearchFormValues[K]) => setV((p) => ({ ...p, [k]: val }));
  const targetNum = Number(v.target);
  const targetValid = Number.isInteger(targetNum) && targetNum > 0;
  const configured = meta?.providers.filter((p) => p.configured) ?? [];

  return (
    <form
      className="card p-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (targetValid) onSubmit(v);
      }}
    >
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-bold text-navy">New lead search</h2>
        {meta && (
          <p className="text-xs text-slate-500">
            Data sources:{" "}
            {configured.length ? configured.map((p) => p.label).join(" · ") : <span className="font-semibold text-red-600">none configured</span>}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Country" id="country"><input id="country" className="input" value={v.country} onChange={(e) => set("country", e.target.value)} required /></Field>
        <Field label="State" id="state"><input id="state" className="input" value={v.state} onChange={(e) => set("state", e.target.value)} /></Field>
        <Field label="City" id="city"><input id="city" className="input" value={v.city} onChange={(e) => set("city", e.target.value)} required /></Field>
        <Field label="Area / locality (optional)" id="area"><input id="area" className="input" placeholder="e.g. Indiranagar" value={v.area} onChange={(e) => set("area", e.target.value)} /></Field>

        <Field label="Business niche" id="niche">
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
          {!targetValid && <p className="mt-1 text-xs text-red-600">Enter any positive whole number.</p>}
        </Field>
        <Field label="Website status" id="websiteFilter">
          <select id="websiteFilter" className="input" value={v.websiteFilter} onChange={(e) => set("websiteFilter", e.target.value as SearchFormValues["websiteFilter"])}>
            <option value="none">No website only</option>
            <option value="weak">Weak website (none, free page, unreachable)</option>
            <option value="all">All</option>
          </select>
        </Field>
        <Field label="Phone number" id="phone">
          <input id="phone" className="input" value="Required" disabled />
        </Field>
        <Field label="Instagram account" id="instagramFilter">
          <select id="instagramFilter" className="input" value={v.instagramFilter} onChange={(e) => set("instagramFilter", e.target.value as SearchFormValues["instagramFilter"])}>
            <option value="any">Any</option>
            <option value="has">Has Instagram</option>
            <option value="none">No Instagram</option>
          </select>
        </Field>
        <Field label="Minimum lead quality (optional)" id="minQuality">
          <select id="minQuality" className="input" value={v.minQuality} onChange={(e) => set("minQuality", e.target.value)}>
            <option value="">Any</option>
            <option value="45">Medium or better (45+)</option>
            <option value="70">High only (70+)</option>
          </select>
        </Field>
      </div>

      <div className="mt-5 flex flex-col gap-4 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-start gap-2 text-sm text-slate-600">
          <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand" checked={v.checkWebsites} onChange={(e) => set("checkWebsites", e.target.checked)} />
          <span>
            Check whether listed websites load
            <span className="block text-xs text-slate-400">Slower. Unreachable sites are marked “Website Unreachable”, never “No Website”.</span>
          </span>
        </label>
        <button type="submit" className="btn-primary w-full px-8 py-3 text-base sm:w-auto" disabled={busy || !targetValid || (meta !== null && configured.length === 0)}>
          {busy ? "Starting…" : "Find Leads"}
        </button>
      </div>
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
