"use client";

import { useEffect, useState } from "react";
import { api, fmtDate, fmtDateTime } from "@/lib/client";
import { PROVIDER_LABELS } from "@/lib/labels";
import type { LeadDTO } from "@/lib/types";
import { QualityBadge, StatusSelect, WebsiteBadge } from "./LeadBadges";

type Source = { provider: string; sourceId: string; createdAt: string };

export function LeadDrawer({ leadId, onClose, onChange, focusFollowUp }: { leadId: string; onClose: () => void; onChange: (l: LeadDTO) => void; focusFollowUp?: boolean }) {
  const [lead, setLead] = useState<LeadDTO | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [notes, setNotes] = useState("");
  const [follow, setFollow] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api<{ lead: LeadDTO; sources: Source[] }>(`/api/leads/${leadId}`).then(({ lead, sources }) => {
      setLead(lead);
      setSources(sources);
      setNotes(lead.notes ?? "");
      setFollow(lead.followUpAt ? lead.followUpAt.slice(0, 10) : "");
    }).catch((e) => setMsg(e.message));
  }, [leadId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label="Lead details">
      <button className="absolute inset-0 bg-navy/40" aria-label="Close" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-lg flex-col overflow-y-auto bg-white shadow-xl">
        <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-slate-100 bg-white px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-navy">{lead?.name ?? "Loading…"}</h2>
            <p className="text-sm text-slate-500">{lead?.category ?? ""}</p>
          </div>
          <button className="btn-ghost" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {lead && (
          <div className="space-y-5 px-5 py-4 text-sm">
            <div className="flex flex-wrap gap-2">
              <StatusSelect value={lead.status} onChange={(s) => save({ status: s })} />
              <WebsiteBadge lead={lead} />
              <QualityBadge score={lead.qualityScore} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {lead.phoneE164 ? <a className="btn-primary" href={`tel:${lead.phoneE164}`}>Call {lead.phoneDisplay}</a> : <span className="btn-secondary opacity-60">Phone Unavailable</span>}
              {lead.phoneE164 && lead.phoneType === "mobile" && <a className="btn-secondary" target="_blank" rel="noreferrer" href={`https://wa.me/${lead.phoneE164.replace("+", "")}`}>WhatsApp</a>}
              {lead.instagramUrl && <a className="btn-secondary" target="_blank" rel="noreferrer" href={lead.instagramUrl}>Instagram</a>}
              {lead.profileUrl && <a className="btn-secondary" target="_blank" rel="noreferrer" href={lead.profileUrl}>Business profile</a>}
            </div>

            <dl className="grid grid-cols-[130px_1fr] gap-x-3 gap-y-2">
              <Row k="Phone (normalised)" v={lead.phoneE164 ?? "Phone Unavailable"} />
              <Row k="Phone (as listed)" v={lead.phoneRaw} />
              <Row k="Phone type" v={lead.phoneType === "mobile" ? "Mobile" : lead.phoneType === "fixed_line" ? "Landline" : "Unknown"} />
              <Row k="Address" v={lead.address} />
              <Row k="Locality" v={lead.locality} />
              <Row k="City" v={[lead.city, lead.state, lead.country].filter(Boolean).join(", ")} />
              <Row k="Website URL" v={lead.websiteUrl} />
              <Row k="Website evidence" v={lead.websiteEvidence} />
              {lead.websiteCheckedAt && <Row k="Checked at" v={fmtDateTime(lead.websiteCheckedAt)} />}
              <Row k="Facebook" v={lead.facebookUrl} />
              <Row k="Opening hours" v={lead.openingHours} />
              {lead.rating != null && <Row k="Rating" v={`${lead.rating} ★ (${lead.ratingCount ?? 0} reviews)`} />}
              <Row k="Date found" v={fmtDate(lead.createdAt)} />
              <Row k="Contacted" v={lead.contactedAt ? fmtDateTime(lead.contactedAt) : "Not yet"} />
              <Row k="Sources" v={sources.map((s) => `${PROVIDER_LABELS[s.provider] ?? s.provider} (${s.sourceId})`).join(", ") || PROVIDER_LABELS[lead.source]} />
              {lead.attribution && <Row k="Attribution" v={lead.attribution} />}
            </dl>
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              Phone numbers are as publicly listed by the data provider. They have not been verified by a live call.
            </p>

            <div>
              <label className="label" htmlFor="follow">Follow-up date</label>
              <div className="flex gap-2">
                <input id="follow" type="date" className="input" autoFocus={focusFollowUp} value={follow} onChange={(e) => setFollow(e.target.value)} />
                <button className="btn-secondary" disabled={saving} onClick={() => save({ followUpAt: follow || null, ...(follow && lead.status === "new" ? { status: "interested" } : {}) })}>Schedule</button>
              </div>
            </div>
            <div>
              <label className="label" htmlFor="notes">Notes</label>
              <textarea id="notes" rows={5} className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Call notes, decision maker, budget…" />
              <div className="mt-2 flex items-center gap-3">
                <button className="btn-primary" disabled={saving} onClick={() => save({ notes })}>Save notes</button>
                {lead.status !== "contacted" && <button className="btn-secondary" disabled={saving} onClick={() => save({ status: "contacted" })}>Mark as contacted</button>}
                {msg && <span className="text-xs text-slate-500">{msg}</span>}
              </div>
            </div>
            <a className="btn-ghost text-xs" href={`/api/leads/export?ids=${lead.id}`}>Export this lead (CSV)</a>
          </div>
        )}
        {!lead && msg && <p className="p-5 text-sm text-red-600">{msg}</p>}
      </aside>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string | null | undefined }) {
  return (
    <>
      <dt className="text-slate-500">{k}</dt>
      <dd className="break-words text-slate-800">{v || "—"}</dd>
    </>
  );
}
