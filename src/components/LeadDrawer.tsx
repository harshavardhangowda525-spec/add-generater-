"use client";

import { useEffect, useState } from "react";
import { api, fmtDate, fmtDateTime } from "@/lib/client";
import { LEAD_STATUS_LABELS, PROVIDER_LABELS } from "@/lib/labels";
import type { LeadDTO } from "@/lib/types";
import { CloseIcon, InstagramIcon, MapPinIcon, PhoneIcon, WhatsAppIcon } from "./Icons";
import { QualityBadge, WebsiteBadge } from "./LeadBadges";

type Source = { provider: string; sourceId: string; createdAt: string };

/**
 * Lead details body: website status + evidence, CRM notes, status update,
 * follow-up and the full provider record. Used docked on the dashboard and
 * inside the slide-over drawer elsewhere.
 */
export function LeadDetail({ leadId, onClose, onChange, focusFollowUp }: { leadId: string; onClose?: () => void; onChange: (l: LeadDTO) => void; focusFollowUp?: boolean }) {
  const [lead, setLead] = useState<LeadDTO | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [notes, setNotes] = useState("");
  const [follow, setFollow] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setLead(null);
    setMsg(null);
    api<{ lead: LeadDTO; sources: Source[] }>(`/api/leads/${leadId}`)
      .then(({ lead, sources }) => {
        setLead(lead);
        setSources(sources);
        setNotes(lead.notes ?? "");
        setFollow(lead.followUpAt ? lead.followUpAt.slice(0, 10) : "");
      })
      .catch((e) => setMsg(e.message));
  }, [leadId]);

  async function save(patch: Record<string, unknown>) {
    setSaving(true);
    setMsg(null);
    try {
      const { lead: l } = await api<{ lead: LeadDTO }>(`/api/leads/${leadId}`, { method: "PATCH", json: patch });
      setLead(l);
      onChange(l);
      setMsg("Saved");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-sky-400/10 px-4 py-3">
        <h2 className="panel-title">Lead Details</h2>
        {onClose && <button className="icon-btn" onClick={onClose} aria-label="Close details"><CloseIcon /></button>}
      </div>
      {!lead && !msg && <div className="space-y-3 p-4">{[1, 2, 3, 4].map((i) => <div key={i} className="h-6 animate-pulse rounded bg-white/5" />)}</div>}
      {!lead && msg && <p className="p-4 text-sm text-rose-300">{msg}</p>}
      {lead && (
        <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm">
          <div>
            <h3 className="text-lg font-bold leading-tight text-white">{lead.name}</h3>
            <p className="mt-0.5 text-xs text-slate-400">{lead.category ?? ""}</p>
            {lead.phoneE164 ? (
              <a className="mt-2 inline-block font-semibold tabular-nums text-sky-200 hover:text-white" href={`tel:${lead.phoneE164}`}>{lead.phoneDisplay ?? lead.phoneE164}</a>
            ) : (
              <p className="mt-2 text-slate-500">Phone Unavailable</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {lead.phoneE164 && <a className="btn-primary px-3 py-1.5" href={`tel:${lead.phoneE164}`}><PhoneIcon /> Call</a>}
              {lead.phoneE164 && lead.phoneType === "mobile" && <a className="btn-secondary px-3 py-1.5" target="_blank" rel="noreferrer" href={`https://wa.me/${lead.phoneE164.replace("+", "")}`}><WhatsAppIcon /> WhatsApp</a>}
              {lead.instagramUrl && <a className="btn-secondary px-3 py-1.5" target="_blank" rel="noreferrer" href={lead.instagramUrl}><InstagramIcon /> Instagram</a>}
              {lead.profileUrl && <a className="btn-secondary px-3 py-1.5" target="_blank" rel="noreferrer" href={lead.profileUrl}><MapPinIcon /> Profile</a>}
            </div>
          </div>

          <Section title="Website Status">
            <div className="flex flex-wrap gap-2">
              <WebsiteBadge lead={lead} />
              <QualityBadge score={lead.qualityScore} />
            </div>
            <p className="mt-2 text-xs text-slate-400">{lead.websiteEvidence}</p>
            {lead.websiteUrl && <a className="mt-1 block truncate text-xs text-sky-300 hover:underline" href={lead.websiteUrl} target="_blank" rel="noreferrer">{lead.websiteUrl}</a>}
          </Section>

          <Section title="CRM Notes">
            <textarea id="notes" rows={4} className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="CRM notes — call outcome, decision maker, budget…" aria-label="CRM notes" />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button className="btn-primary px-3 py-1.5" disabled={saving} onClick={() => save({ notes })}>Save notes</button>
              {lead.status !== "contacted" && <button className="btn-secondary px-3 py-1.5" disabled={saving} onClick={() => save({ status: "contacted" })}>Mark as contacted</button>}
              {msg && <span className="text-xs text-slate-400">{msg}</span>}
            </div>
          </Section>

          <Section title="Status Update">
            <select aria-label="Status update" className="input" value={lead.status} onChange={(e) => save({ status: e.target.value })}>
              {Object.entries(LEAD_STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </Section>

          <Section title="Follow-up">
            <div className="flex gap-2">
              <input id="follow" type="date" aria-label="Follow-up date" className="input [color-scheme:dark]" autoFocus={focusFollowUp} value={follow} onChange={(e) => setFollow(e.target.value)} />
              <button className="btn-secondary shrink-0 px-3" disabled={saving} onClick={() => save({ followUpAt: follow || null, ...(follow && lead.status === "new" ? { status: "interested" } : {}) })}>Schedule</button>
            </div>
          </Section>

          <details className="rounded-xl border border-sky-400/10 bg-ink-900/40 p-3">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-400">Full record</summary>
            <dl className="mt-3 grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 text-xs">
              <Row k="Phone (listed)" v={lead.phoneRaw} />
              <Row k="Phone type" v={lead.phoneType === "mobile" ? "Mobile" : lead.phoneType === "fixed_line" ? "Landline" : "Unknown"} />
              <Row k="Address" v={lead.address} />
              <Row k="Locality" v={lead.locality} />
              <Row k="City" v={[lead.city, lead.state, lead.country].filter(Boolean).join(", ")} />
              {lead.websiteCheckedAt && <Row k="Site checked" v={fmtDateTime(lead.websiteCheckedAt)} />}
              <Row k="Facebook" v={lead.facebookUrl} />
              <Row k="Opening hours" v={lead.openingHours} />
              {lead.rating != null && <Row k="Rating" v={`${lead.rating} ★ (${lead.ratingCount ?? 0})`} />}
              <Row k="Date found" v={fmtDate(lead.createdAt)} />
              <Row k="Contacted" v={lead.contactedAt ? fmtDateTime(lead.contactedAt) : "Not yet"} />
              <Row k="Sources" v={sources.map((s) => `${PROVIDER_LABELS[s.provider] ?? s.provider} (${s.sourceId})`).join(", ") || PROVIDER_LABELS[lead.source]} />
              {lead.attribution && <Row k="Attribution" v={lead.attribution} />}
            </dl>
            <p className="mt-3 text-[11px] text-slate-500">Phone numbers are as publicly listed by the data provider and have not been verified by a live call.</p>
          </details>
          <a className="btn-ghost px-0 text-xs" href={`/api/leads/export?ids=${lead.id}`}>Export this lead (CSV)</a>
        </div>
      )}
    </div>
  );
}

/** Slide-over version for the Leads CRM page and small screens. */
export function LeadDrawer(props: { leadId: string; onClose: () => void; onChange: (l: LeadDTO) => void; focusFollowUp?: boolean }) {
  const { onClose } = props;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label="Lead details">
      <button className="absolute inset-0 bg-ink/70 backdrop-blur-sm" aria-label="Close" onClick={onClose} />
      <aside className="relative h-full w-full max-w-md border-l border-sky-400/20 bg-ink-800 shadow-glow">
        <LeadDetail {...props} />
      </aside>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-sky-400/10 pt-3">
      <h4 className="mb-2 text-sm font-semibold text-slate-200">{title}</h4>
      {children}
    </section>
  );
}

function Row({ k, v }: { k: string; v: string | null | undefined }) {
  return (
    <>
      <dt className="text-slate-500">{k}</dt>
      <dd className="break-words text-slate-200">{v || "—"}</dd>
    </>
  );
}
