"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";
import { LEAD_STATUS_LABELS } from "@/lib/labels";
import type { LeadDTO } from "@/lib/types";
import { BanIcon, CopyIcon, InstagramIcon, NoteIcon, PhoneIcon } from "./Icons";
import { STATUS_CLS, WebsiteBadge } from "./LeadBadges";

const PAGE_SIZE = 25;

/** The dashboard's lead table: primary list by default, row selection drives the details panel. */
export function DashboardLeads({ selectedId, onSelect, refreshKey, onChanged }: { selectedId: string | null; onSelect: (id: string) => void; refreshKey: number; onChanged: () => void }) {
  const [rows, setRows] = useState<LeadDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [qLive, setQLive] = useState("");
  const [website, setWebsite] = useState("no_website");
  const [status, setStatus] = useState("any");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" }>({ key: "createdAt", dir: "desc" });
  const [page, setPage] = useState(1);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setQLive(q);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const filterQs = useMemo(() => {
    const qs = new URLSearchParams({ phone: "has" });
    if (qLive) qs.set("q", qLive);
    if (website !== "any") qs.set("website", website);
    if (status !== "any") qs.set("status", status);
    return qs;
  }, [qLive, website, status]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams(filterQs);
      qs.set("sort", sort.key);
      qs.set("dir", sort.dir);
      qs.set("page", String(page));
      qs.set("pageSize", String(PAGE_SIZE));
      const r = await api<{ rows: LeadDTO[]; total: number }>(`/api/leads?${qs}`);
      setRows(r.rows);
      setTotal(r.total);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filterQs, sort, page]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 2200);
  }

  async function patch(id: string, body: Record<string, unknown>) {
    try {
      const { lead } = await api<{ lead: LeadDTO }>(`/api/leads/${id}`, { method: "PATCH", json: body });
      setRows((rs) => rs.map((r) => (r.id === id ? lead : r)));
      onChanged();
    } catch (e) {
      flash((e as Error).message);
    }
  }

  async function copyPhones() {
    const phones = rows.filter((r) => checked.has(r.id) && r.phoneE164).map((r) => r.phoneE164!);
    try {
      await navigator.clipboard.writeText(phones.join("\n"));
      flash(`Copied ${phones.length} phone numbers`);
    } catch {
      window.prompt("Copy:", phones.join("\n"));
    }
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const allChecked = rows.length > 0 && rows.every((r) => checked.has(r.id));
  const toggle = (id: string) =>
    setChecked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const sortBtn = (key: string, label: string) => (
    <button className="inline-flex items-center gap-1 hover:text-white" onClick={() => setSort((s) => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }))}>
      {label}
      <span className="text-[9px] text-sky-300">{sort.key === key ? (sort.dir === "asc" ? "▲" : "▼") : ""}</span>
    </button>
  );

  return (
    <div className="card-glow relative flex min-h-[420px] flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-sky-400/10 px-4 py-3">
        <h2 className="panel-title mr-auto">Lead Table <span className="ml-1 font-normal normal-case tracking-normal text-slate-400">· {loading ? "…" : `${total.toLocaleString("en-IN")} leads`}</span></h2>
        <input aria-label="Search leads" className="input h-8 w-full py-1 sm:w-48" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Website status filter" className="input h-8 w-auto py-1" value={website} onChange={(e) => { setWebsite(e.target.value); setPage(1); }}>
          <option value="no_website">No Website Listed</option>
          <option value="weak">None or weak</option>
          <option value="available">Website Available</option>
          <option value="unreachable">Website Unreachable</option>
          <option value="any">Any website status</option>
        </select>
        <select aria-label="Lead status filter" className="input h-8 w-auto py-1" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="any">All statuses</option>
          {Object.entries(LEAD_STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>

      {checked.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-sky-400/10 bg-sky-400/5 px-4 py-2 text-xs">
          <span className="font-semibold text-white">{checked.size} selected</span>
          <a className="btn-secondary px-2 py-1 text-xs" href={`/api/leads/export?ids=${[...checked].join(",")}`}>Export CSV</a>
          <button className="btn-secondary px-2 py-1 text-xs" onClick={copyPhones}><CopyIcon className="h-3.5 w-3.5" /> Copy phones</button>
          <button className="btn-ghost ml-auto px-2 py-1 text-xs" onClick={() => setChecked(new Set())}>Clear</button>
        </div>
      )}

      {error && <p role="alert" className="m-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error} <button className="underline" onClick={load}>Retry</button></p>}

      {/* Desktop table */}
      <div className="hidden flex-1 overflow-x-auto md:block">
        <table className="w-full text-left text-[13px]">
          <thead className="text-xs text-slate-400">
            <tr className="border-b border-sky-400/10">
              <th className="w-8 py-2.5 pl-3"><input type="checkbox" className="accent-sky-400" aria-label="Select all" checked={allChecked} onChange={() => setChecked(allChecked ? new Set() : new Set(rows.map((r) => r.id)))} /></th>
              <th className="px-1.5 py-2.5 font-semibold">{sortBtn("name", "Business Name")}</th>
              <th className="px-1.5 py-2.5 font-semibold">Phone</th>
              <th className="px-1.5 py-2.5 font-semibold">{sortBtn("city", "Location")}</th>
              <th className="px-1.5 py-2.5 font-semibold">{sortBtn("website", "Website Status")}</th>
              <th className="px-1.5 py-2.5 font-semibold">Instagram</th>
              <th className="px-1.5 py-2.5 font-semibold">{sortBtn("status", "Lead Status")}</th>
              <th className="px-1.5 py-2.5 pr-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-sky-400/5">
                  {Array.from({ length: 8 }).map((__, j) => <td key={j} className="px-2 py-3.5"><div className="h-2.5 animate-pulse rounded-full bg-white/10" /></td>)}
                </tr>
              ))}
            {rows.map((l) => {
              const active = l.id === selectedId;
              return (
                <tr key={l.id} onClick={() => onSelect(l.id)} className={`cursor-pointer border-b border-sky-400/5 transition ${active ? "bg-sky-400/10 shadow-[inset_2px_0_0_0_#38BDF8]" : "hover:bg-white/[0.03]"}`}>
                  <td className="py-2.5 pl-3" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="accent-sky-400" aria-label={`Select ${l.name}`} checked={checked.has(l.id)} onChange={() => toggle(l.id)} />
                  </td>
                  <td className="max-w-[170px] px-1.5 py-2.5"><div className="truncate font-medium text-white" title={l.name}>{l.name}</div></td>
                  <td className="whitespace-nowrap px-1.5 py-2.5 tabular-nums text-slate-200">{l.phoneDisplay ?? l.phoneE164}</td>
                  <td className="max-w-[120px] px-1.5 py-2.5 text-slate-300"><div className="truncate">{l.locality || l.city || "—"}</div></td>
                  <td className="px-1.5 py-2.5"><WebsiteBadge lead={l} /></td>
                  <td className="px-1.5 py-2.5" onClick={(e) => e.stopPropagation()}>
                    {l.instagramUrl ? (
                      <a className="inline-flex items-center gap-1 text-slate-200 hover:text-sky-200" href={l.instagramUrl} target="_blank" rel="noreferrer"><InstagramIcon className="h-3.5 w-3.5" /> Instagram</a>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-1.5 py-2.5"><span className={`badge rounded-full ${STATUS_CLS[l.status]}`}>{LEAD_STATUS_LABELS[l.status]}</span></td>
                  <td className="px-1.5 py-1.5 pr-3" onClick={(e) => e.stopPropagation()}>
                    <RowIcons lead={l} onNotes={() => onSelect(l.id)} onReject={() => patch(l.id, { status: "rejected" })} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && rows.length === 0 && <EmptyState filtered={website !== "no_website" || status !== "any" || !!qLive} />}
      </div>

      {/* Mobile cards */}
      <div className="divide-y divide-sky-400/10 md:hidden">
        {rows.map((l) => (
          <div key={l.id} className={`p-4 ${l.id === selectedId ? "bg-sky-400/10" : ""}`} onClick={() => onSelect(l.id)}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-semibold text-white">{l.name}</div>
                <div className="text-xs text-slate-400">{l.locality || l.city}</div>
              </div>
              <span className={`badge shrink-0 rounded-full ${STATUS_CLS[l.status]}`}>{LEAD_STATUS_LABELS[l.status]}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2"><WebsiteBadge lead={l} /></div>
            <div className="mt-3 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
              <a className="btn-primary px-3 py-1.5" href={`tel:${l.phoneE164}`}><PhoneIcon /> {l.phoneDisplay ?? l.phoneE164}</a>
              <RowIcons lead={l} onNotes={() => onSelect(l.id)} onReject={() => patch(l.id, { status: "rejected" })} hideCall />
            </div>
          </div>
        ))}
        {!loading && rows.length === 0 && <EmptyState filtered={website !== "no_website" || status !== "any" || !!qLive} />}
      </div>

      {total > PAGE_SIZE && (
        <div className="mt-auto flex items-center justify-between border-t border-sky-400/10 px-4 py-2.5 text-xs text-slate-400">
          <Link href="/leads" className="text-sky-300 hover:underline">Open full CRM →</Link>
          <div className="flex items-center gap-2">
            <button className="btn-secondary px-2 py-1 text-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
            <span>{page} / {pages}</span>
            <button className="btn-secondary px-2 py-1 text-xs" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next →</button>
          </div>
        </div>
      )}
      {toast && <div className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-lg border border-sky-400/30 bg-ink-700 px-3 py-1.5 text-xs text-white shadow-glow">{toast}</div>}
    </div>
  );
}

function RowIcons({ lead, onNotes, onReject, hideCall }: { lead: LeadDTO; onNotes: () => void; onReject: () => void; hideCall?: boolean }) {
  return (
    <div className="flex items-center">
      {!hideCall && <a className="icon-btn" href={`tel:${lead.phoneE164}`} title="Call" aria-label={`Call ${lead.name}`}><PhoneIcon /></a>}
      <button className="icon-btn" onClick={onNotes} title="Notes & details" aria-label={`Notes for ${lead.name}`}><NoteIcon /></button>
      {lead.instagramUrl ? (
        <a className="icon-btn" href={lead.instagramUrl} target="_blank" rel="noreferrer" title="Open Instagram" aria-label={`Instagram of ${lead.name}`}><InstagramIcon /></a>
      ) : (
        <span className="icon-btn cursor-default opacity-30" title="No Instagram listed"><InstagramIcon /></span>
      )}
      <button className="icon-btn hover:text-rose-300" onClick={onReject} disabled={lead.status === "rejected"} title="Mark as rejected" aria-label={`Reject ${lead.name}`}><BanIcon /></button>
    </div>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="px-6 py-14 text-center">
      <p className="font-semibold text-white">{filtered ? "No leads match these filters." : "No leads yet."}</p>
      <p className="mt-1 text-sm text-slate-400">
        {filtered ? "Try relaxing the filters." : "Choose a location and niche on the left and click Find Leads."}
      </p>
    </div>
  );
}
