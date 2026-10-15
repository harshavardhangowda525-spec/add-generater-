"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { ImportDialog } from "@/components/ImportDialog";
import { LeadDrawer } from "@/components/LeadDrawer";
import { QualityBadge, StatusSelect, WebsiteBadge } from "@/components/LeadBadges";
import { api, fmtDate } from "@/lib/client";
import { LEAD_STATUS_LABELS } from "@/lib/labels";
import { NICHES } from "@/lib/niches";
import type { LeadDTO, MetaDTO } from "@/lib/types";

type Filters = {
  q: string;
  niche: string;
  city: string;
  phone: string;
  instagram: string;
  website: string;
  status: string;
  followUp: string;
  minQuality: string;
  jobId: string;
};

// The primary list: phone number required, no listed website.
const DEFAULT_FILTERS: Filters = { q: "", niche: "", city: "", phone: "has", instagram: "any", website: "no_website", status: "any", followUp: "any", minQuality: "", jobId: "" };
const FILTER_KEYS = Object.keys(DEFAULT_FILTERS) as (keyof Filters)[];

const COLUMNS: { key: string; label: string; sort?: string; cls?: string }[] = [
  { key: "name", label: "Business Name", sort: "name" },
  { key: "category", label: "Category", sort: "category" },
  { key: "phone", label: "Phone", sort: "phone" },
  { key: "city", label: "City / Locality", sort: "city" },
  { key: "website", label: "Website", sort: "website" },
  { key: "instagram", label: "Instagram" },
  { key: "profile", label: "Profile" },
  { key: "quality", label: "Quality", sort: "quality" },
  { key: "status", label: "Status", sort: "status" },
  { key: "createdAt", label: "Date Found", sort: "createdAt" },
  { key: "actions", label: "Actions", cls: "text-right" },
];

const nicheLabel = (n: string | null) => (n ? NICHES.find((x) => x.key === n)?.label ?? n : "—");

function LeadsPageInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const filters: Filters = useMemo(() => {
    const f = { ...DEFAULT_FILTERS };
    for (const k of FILTER_KEYS) {
      const v = sp.get(k);
      if (v !== null) f[k] = v;
    }
    return f;
  }, [sp]);
  const sort = sp.get("sort") ?? "createdAt";
  const dir = (sp.get("dir") as "asc" | "desc") ?? "desc";
  const page = Number(sp.get("page")) || 1;
  const pageSize = Number(sp.get("pageSize")) || 50;

  const [rows, setRows] = useState<LeadDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawer, setDrawer] = useState<{ id: string; followUp?: boolean } | null>(null);
  const [importing, setImporting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [meta, setMeta] = useState<MetaDTO | null>(null);
  const [qDraft, setQDraft] = useState(filters.q);
  const [showFilters, setShowFilters] = useState(false);

  const queryString = useMemo(() => {
    const qs = new URLSearchParams();
    for (const k of FILTER_KEYS) if (filters[k] && filters[k] !== "any") qs.set(k, filters[k]);
    return qs;
  }, [filters]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams(queryString);
      qs.set("sort", sort);
      qs.set("dir", dir);
      qs.set("page", String(page));
      qs.set("pageSize", String(pageSize));
      const r = await api<{ rows: LeadDTO[]; total: number }>(`/api/leads?${qs}`);
      setRows(r.rows);
      setTotal(r.total);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [queryString, sort, dir, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    api<MetaDTO>("/api/meta").then(setMeta).catch(() => {});
  }, []);
  useEffect(() => setQDraft(filters.q), [filters.q]);
  useEffect(() => {
    const t = setTimeout(() => qDraft !== filters.q && update({ q: qDraft }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDraft]);

  function update(patch: Record<string, string>, resetPage = true) {
    const qs = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      const def = (DEFAULT_FILTERS as Record<string, string>)[k];
      if (v === def || (v === "" && def === undefined)) qs.delete(k);
      else qs.set(k, v);
    }
    if (resetPage && !("page" in patch)) qs.delete("page");
    router.replace(`/leads?${qs}`, { scroll: false });
    setSelected(new Set());
  }

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function patchLead(id: string, patch: Record<string, unknown>) {
    try {
      const { lead } = await api<{ lead: LeadDTO }>(`/api/leads/${id}`, { method: "PATCH", json: patch });
      setRows((rs) => rs.map((r) => (r.id === id ? lead : r)));
    } catch (e) {
      flash((e as Error).message);
    }
  }

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      flash(`Copied ${what}`);
    } catch {
      window.prompt("Copy:", text);
    }
  }

  async function copySelectedPhones() {
    const qs = new URLSearchParams({ ids: [...selected].join(","), pageSize: "500", phone: "has" });
    const r = await api<{ rows: LeadDTO[] }>(`/api/leads?${qs}`);
    const phones = r.rows.map((l) => l.phoneE164).filter(Boolean);
    copy(phones.join("\n"), `${phones.length} phone numbers`);
  }

  async function bulk(action: "status" | "delete", status?: string) {
    if (action === "delete" && !window.confirm(`Delete ${selected.size} leads permanently?`)) return;
    try {
      const r = await api<{ updated: number }>("/api/leads/bulk", { method: "POST", json: { ids: [...selected], action, status } });
      flash(`${r.updated} leads ${action === "delete" ? "deleted" : "updated"}`);
      setSelected(new Set());
      load();
    } catch (e) {
      flash((e as Error).message);
    }
  }

  function exportUrl(scope: "filtered" | "selected" | "eligible" | "all") {
    if (scope === "selected") return `/api/leads/export?ids=${[...selected].join(",")}`;
    if (scope === "filtered") return `/api/leads/export?scope=filtered&${queryString}`;
    return `/api/leads/export?scope=${scope}`;
  }

  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const isPrimary = filters.phone === "has" && filters.website === "no_website";
  const niches = Array.from(new Set([...(meta?.values.niches ?? [])]));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">Leads CRM</h1>
          <p className="text-sm text-slate-400">
            {loading ? "Loading…" : `${total.toLocaleString("en-IN")} leads match`}
            {isPrimary && " · primary list: phone number + no listed website"}
            {filters.jobId && (
              <>
                {" · from one search "}
                <button className="text-sky-300 hover:underline" onClick={() => update({ jobId: "" })}>show all</button>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={() => setImporting(true)}>Import CSV</button>
          <ExportMenu urls={exportUrl} count={total} />
        </div>
      </div>

      {/* Filters — collapsible on small screens */}
      <div className="flex gap-2 lg:hidden">
        <input aria-label="Search leads" className="input" placeholder="Search name, phone, locality…" value={qDraft} onChange={(e) => setQDraft(e.target.value)} />
        <button className="btn-secondary shrink-0" onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>Filters {showFilters ? "▴" : "▾"}</button>
      </div>
      <div className={`card gap-3 p-4 sm:grid-cols-2 lg:grid lg:grid-cols-5 xl:grid-cols-9 ${showFilters ? "grid" : "hidden"}`}>
        <div className="hidden lg:col-span-2 lg:block xl:col-span-2">
          <label className="label" htmlFor="q">Search</label>
          <input id="q" className="input" placeholder="Name, phone, locality, notes…" value={qDraft} onChange={(e) => setQDraft(e.target.value)} />
        </div>
        <Sel id="f-niche" label="Niche" value={filters.niche} onChange={(v) => update({ niche: v })} options={[["", "All niches"], ...niches.map((n) => [n, nicheLabel(n)] as [string, string])]} />
        <Sel id="f-city" label="City" value={filters.city} onChange={(v) => update({ city: v })} options={[["", "All cities"], ...(meta?.values.cities ?? []).map((c) => [c, c] as [string, string])]} />
        <Sel id="f-phone" label="Phone" value={filters.phone} onChange={(v) => update({ phone: v })} options={[["has", "Has phone"], ["none", "Phone Unavailable"], ["any", "Any"]]} />
        <Sel id="f-web" label="Website status" value={filters.website} onChange={(v) => update({ website: v })} options={[["no_website", "No Website Listed"], ["weak", "None or weak"], ["available", "Website Available"], ["unreachable", "Website Unreachable"], ["unknown", "Status Unknown"], ["any", "Any"]]} />
        <Sel id="f-ig" label="Instagram" value={filters.instagram} onChange={(v) => update({ instagram: v })} options={[["any", "Any"], ["has", "Has Instagram"], ["none", "No Instagram"]]} />
        <Sel id="f-status" label="Lead status" value={filters.status} onChange={(v) => update({ status: v })} options={[["any", "All statuses"], ...Object.entries(LEAD_STATUS_LABELS)]} />
        <Sel id="f-follow" label="Follow-up" value={filters.followUp} onChange={(v) => update({ followUp: v })} options={[["any", "Any"], ["due", "Due now"], ["scheduled", "Scheduled"]]} />
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="sticky top-[60px] z-20 flex flex-wrap items-center gap-2 rounded-xl bg-ink-700 px-4 py-2.5 text-sm text-white shadow-lg">
          <span className="font-semibold">{selected.size} selected</span>
          <a className="rounded-lg bg-white/10 px-3 py-1.5 hover:bg-white/20" href={exportUrl("selected")}>Export selected</a>
          <button className="rounded-lg bg-white/10 px-3 py-1.5 hover:bg-white/20" onClick={copySelectedPhones}>Copy phone numbers</button>
          <select className="rounded-lg border-0 bg-white/10 py-1.5 text-sm text-white" value="" onChange={(e) => e.target.value && bulk("status", e.target.value)} aria-label="Set status for selected">
            <option value="" className="text-slate-100">Set status…</option>
            {Object.entries(LEAD_STATUS_LABELS).map(([k, l]) => <option key={k} value={k} className="text-slate-100">{l}</option>)}
          </select>
          <button className="rounded-lg px-3 py-1.5 text-red-300 hover:bg-white/10" onClick={() => bulk("delete")}>Delete</button>
          <button className="ml-auto rounded-lg px-3 py-1.5 hover:bg-white/10" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}

      {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error} <button className="ml-2 underline" onClick={load}>Retry</button></div>}

      {/* Desktop table */}
      <div className="card hidden overflow-x-auto lg:block">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-sky-400/15 bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="w-8 py-3 pl-3 pr-1">
                <input type="checkbox" aria-label="Select all on page" checked={allOnPage} onChange={() => setSelected(allOnPage ? new Set() : new Set(rows.map((r) => r.id)))} />
              </th>
              {COLUMNS.map((c) => (
                <th key={c.key} className={`whitespace-nowrap px-2 py-3 font-semibold ${c.cls ?? ""}`}>
                  {c.sort ? (
                    <button className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-white" onClick={() => update({ sort: c.sort!, dir: sort === c.sort && dir === "desc" ? "asc" : "desc" }, false)}>
                      {c.label}
                      <span className="text-[10px]">{sort === c.sort ? (dir === "asc" ? "▲" : "▼") : "↕"}</span>
                    </button>
                  ) : c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-400/10">
            {loading && rows.length === 0 && Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}><td colSpan={COLUMNS.length + 1} className="px-3 py-3"><div className="h-5 animate-pulse rounded bg-white/5" /></td></tr>
            ))}
            {rows.map((l) => (
              <tr key={l.id} className={`hover:bg-sky-400/5 ${selected.has(l.id) ? "bg-sky-400/10" : ""}`}>
                <td className="px-2 py-2.5"><input type="checkbox" aria-label={`Select ${l.name}`} checked={selected.has(l.id)} onChange={() => toggle(l.id)} /></td>
                <td className="min-w-[150px] max-w-[220px] px-2 py-2.5">
                  <button className="text-left font-semibold text-white hover:text-sky-200" onClick={() => setDrawer({ id: l.id })}>{l.name}</button>
                  {l.notes && <div className="truncate text-xs text-slate-500" title={l.notes}>📝 {l.notes}</div>}
                </td>
                <td className="max-w-[120px] px-2 py-2.5 text-slate-300"><div className="truncate" title={l.category ?? ""}>{l.category ?? nicheLabel(l.niche)}</div></td>
                <td className="whitespace-nowrap px-2 py-2.5 tabular-nums">
                  {l.phoneE164 ? <a className="text-sky-300 hover:underline" href={`tel:${l.phoneE164}`}>{l.phoneDisplay ?? l.phoneE164}</a> : <span className="text-slate-500">Phone Unavailable</span>}
                </td>
                <td className="max-w-[130px] px-2 py-2.5 text-slate-300"><div className="truncate" title={[l.locality, l.city].filter(Boolean).join(", ")}>{[l.locality, l.city].filter(Boolean).join(", ") || "—"}</div></td>
                <td className="px-2 py-2.5"><WebsiteBadge lead={l} /></td>
                <td className="px-2 py-2.5">{l.instagramUrl ? <a className="text-sky-300 hover:underline" target="_blank" rel="noreferrer" href={l.instagramUrl}>Open</a> : <span className="text-slate-600">—</span>}</td>
                <td className="px-2 py-2.5">{l.profileUrl ? <a className="text-sky-300 hover:underline" target="_blank" rel="noreferrer" href={l.profileUrl}>Open</a> : <span className="text-slate-600">—</span>}</td>
                <td className="px-2 py-2.5"><QualityBadge score={l.qualityScore} /></td>
                <td className="px-2 py-2.5"><StatusSelect className="max-w-[150px]" value={l.status} onChange={(s) => patchLead(l.id, { status: s })} /></td>
                <td className="whitespace-nowrap px-2 py-2.5 text-slate-400">{fmtDate(l.createdAt)}</td>
                <td className="px-2 py-2.5"><RowActions lead={l} onCopy={copy} onDetails={(f) => setDrawer({ id: l.id, followUp: f })} onContacted={() => patchLead(l.id, { status: "contacted" })} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 && <Empty isPrimary={isPrimary} />}
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 lg:hidden">
        {rows.length > 0 && (
          <label className="flex items-center gap-2 px-1 text-sm text-slate-300">
            <input type="checkbox" checked={allOnPage} onChange={() => setSelected(allOnPage ? new Set() : new Set(rows.map((r) => r.id)))} /> Select all on this page
          </label>
        )}
        {rows.map((l) => (
          <div key={l.id} className={`card p-4 ${selected.has(l.id) ? "ring-2 ring-sky-400" : ""}`}>
            <div className="flex items-start gap-3">
              <input type="checkbox" className="mt-1" aria-label={`Select ${l.name}`} checked={selected.has(l.id)} onChange={() => toggle(l.id)} />
              <div className="min-w-0 flex-1">
                <button className="text-left font-semibold text-white" onClick={() => setDrawer({ id: l.id })}>{l.name}</button>
                <p className="truncate text-xs text-slate-400">{[l.category ?? (l.niche ? nicheLabel(l.niche) : null), [l.locality, l.city].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <WebsiteBadge lead={l} />
                  <QualityBadge score={l.qualityScore} />
                  <StatusSelect value={l.status} onChange={(s) => patchLead(l.id, { status: s })} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {l.phoneE164 ? <a className="btn-primary py-1.5" href={`tel:${l.phoneE164}`}>Call {l.phoneDisplay}</a> : <span className="text-xs text-slate-500">Phone Unavailable</span>}
                  <RowActions lead={l} onCopy={copy} onDetails={(f) => setDrawer({ id: l.id, followUp: f })} onContacted={() => patchLead(l.id, { status: "contacted" })} />
                </div>
                <p className="mt-2 text-[11px] text-slate-500">Found {fmtDate(l.createdAt)}</p>
              </div>
            </div>
          </div>
        ))}
        {!loading && rows.length === 0 && <div className="card"><Empty isPrimary={isPrimary} /></div>}
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300">
          <div className="flex items-center gap-2">
            Rows per page
            <select className="input w-auto py-1" value={pageSize} onChange={(e) => update({ pageSize: e.target.value }, true)}>
              {[25, 50, 100, 250, 500].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-secondary py-1" disabled={page <= 1} onClick={() => update({ page: String(page - 1) }, false)}>← Prev</button>
            <span>Page {page} of {pages}</span>
            <button className="btn-secondary py-1" disabled={page >= pages} onClick={() => update({ page: String(page + 1) }, false)}>Next →</button>
          </div>
        </div>
      )}

      {drawer && <LeadDrawer leadId={drawer.id} focusFollowUp={drawer.followUp} onClose={() => setDrawer(null)} onChange={(l) => setRows((rs) => rs.map((r) => (r.id === l.id ? l : r)))} />}
      {importing && <ImportDialog onClose={() => setImporting(false)} onDone={load} />}
      {toast && <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-ink-700 px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
}

function RowActions({ lead, onCopy, onDetails, onContacted }: { lead: LeadDTO; onCopy: (t: string, w: string) => void; onDetails: (followUp?: boolean) => void; onContacted: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-flex justify-end lg:w-full">
      <button className="btn-secondary px-2.5 py-1.5" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>Actions ▾</button>
      {open && (
        <>
          <button className="fixed inset-0 z-10 cursor-default" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div role="menu" className="absolute right-0 top-full z-20 mt-1 w-52 overflow-hidden rounded-lg border border-sky-400/15 bg-ink-800 py-1 text-sm shadow-lg" onClick={() => setOpen(false)}>
            {lead.phoneE164 && <MenuLink href={`tel:${lead.phoneE164}`}>📞 Call</MenuLink>}
            {lead.instagramUrl && <MenuLink href={lead.instagramUrl} external>📷 Open Instagram</MenuLink>}
            {lead.profileUrl && <MenuLink href={lead.profileUrl} external>📍 Open business profile</MenuLink>}
            {lead.phoneE164 && <MenuBtn onClick={() => onCopy(lead.phoneE164!, "phone number")}>📋 Copy phone number</MenuBtn>}
            <MenuBtn onClick={() => onDetails()}>🔎 View details</MenuBtn>
            {lead.status !== "contacted" && <MenuBtn onClick={onContacted}>✅ Mark as contacted</MenuBtn>}
            <MenuBtn onClick={() => onDetails(true)}>📅 Schedule follow-up</MenuBtn>
            <MenuLink href={`/api/leads/export?ids=${lead.id}`}>⬇️ Export lead</MenuLink>
          </div>
        </>
      )}
    </div>
  );
}

const MenuLink = ({ href, external, children }: { href: string; external?: boolean; children: React.ReactNode }) => (
  <a role="menuitem" href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} className="block px-3 py-2 text-slate-200 hover:bg-sky-400/5">{children}</a>
);
const MenuBtn = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
  <button role="menuitem" onClick={onClick} className="block w-full px-3 py-2 text-left text-slate-200 hover:bg-sky-400/5">{children}</button>
);

function ExportMenu({ urls, count }: { urls: (s: "filtered" | "eligible" | "all") => string; count: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button className="btn-primary" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>Export CSV ▾</button>
      {open && (
        <>
          <button className="fixed inset-0 z-10 cursor-default" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div role="menu" className="absolute right-0 top-full z-20 mt-1 w-72 overflow-hidden rounded-lg border border-sky-400/15 bg-ink-800 py-1 text-sm shadow-lg" onClick={() => setOpen(false)}>
            <MenuLink href={urls("filtered")}><strong>Filtered view</strong><span className="block text-xs text-slate-400">The {count.toLocaleString("en-IN")} leads matching current filters</span></MenuLink>
            <MenuLink href={urls("eligible")}><strong>All eligible leads</strong><span className="block text-xs text-slate-400">Every lead with a phone number and no listed website</span></MenuLink>
            <a
              role="menuitem"
              href={urls("all")}
              className="block px-3 py-2 text-slate-200 hover:bg-sky-400/5"
              onClick={(e) => { if (!window.confirm("Export ALL leads, including ones with websites or without phone numbers?")) e.preventDefault(); }}
            >
              <strong>Everything</strong><span className="block text-xs text-slate-400">All leads, ignoring filters</span>
            </a>
          </div>
        </>
      )}
    </div>
  );
}

function Sel({ id, label, value, onChange, options }: { id: string; label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <select id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

function Empty({ isPrimary }: { isPrimary: boolean }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="font-semibold text-white">No leads match these filters.</p>
      <p className="mt-1 text-sm text-slate-400">
        {isPrimary ? "Run a search on the Find Leads page to collect businesses without websites." : "Try relaxing the filters."}
      </p>
      <a href="/" className="btn-primary mt-4">Find Leads</a>
    </div>
  );
}

export default function LeadsPage() {
  return (
    <Suspense fallback={<div className="card p-8 text-center text-sm text-slate-400">Loading leads…</div>}>
      <LeadsPageInner />
    </Suspense>
  );
}
