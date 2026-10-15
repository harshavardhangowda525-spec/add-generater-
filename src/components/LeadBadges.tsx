import type { LeadDTO } from "@/lib/types";
import { LEAD_STATUS_LABELS, WEBSITE_STATUS_LABELS } from "@/lib/labels";
import { qualityLabel } from "@/lib/quality";

const WEB_CLS: Record<LeadDTO["websiteStatus"], string> = {
  no_website: "border-orange-400/50 bg-orange-500/10 text-orange-300",
  available: "border-emerald-400/50 bg-emerald-500/10 text-emerald-300",
  unreachable: "border-rose-400/50 bg-rose-500/10 text-rose-300",
  unknown: "border-slate-400/40 bg-slate-500/10 text-slate-300",
};

export function WebsiteBadge({ lead }: { lead: Pick<LeadDTO, "websiteStatus" | "websiteWeak" | "websiteEvidence"> }) {
  return (
    <span className={`badge ${WEB_CLS[lead.websiteStatus]}`} title={lead.websiteEvidence ?? undefined}>
      {WEBSITE_STATUS_LABELS[lead.websiteStatus]}
      {lead.websiteWeak ? " · weak" : ""}
    </span>
  );
}

export function QualityBadge({ score }: { score: number }) {
  const l = qualityLabel(score);
  const cls = l === "High" ? "border-sky-400/50 bg-sky-400/10 text-sky-200" : l === "Medium" ? "border-indigo-400/40 bg-indigo-400/10 text-indigo-200" : "border-slate-400/30 bg-slate-400/10 text-slate-400";
  return <span className={`badge ${cls}`} title={`Quality score ${score}/100`}>{l} · {score}</span>;
}

export const STATUS_CLS: Record<LeadDTO["status"], string> = {
  new: "border-slate-400/40 bg-slate-400/10 text-slate-200",
  ready: "border-sky-400/60 bg-sky-400/10 text-sky-200",
  contacted: "border-emerald-400/60 bg-emerald-400/10 text-emerald-200",
  interested: "border-cyan-400/60 bg-cyan-400/10 text-cyan-200",
  demo_scheduled: "border-violet-400/60 bg-violet-400/10 text-violet-200",
  proposal_sent: "border-blue-400/60 bg-blue-500/15 text-blue-200",
  converted: "border-emerald-300/70 bg-emerald-400/20 text-emerald-100",
  rejected: "border-rose-400/50 bg-rose-500/10 text-rose-300",
};

export function StatusSelect({ value, onChange, className = "" }: { value: LeadDTO["status"]; onChange: (s: LeadDTO["status"]) => void; className?: string }) {
  return (
    <select
      aria-label="Lead status"
      value={value}
      onChange={(e) => onChange(e.target.value as LeadDTO["status"])}
      className={`cursor-pointer appearance-none rounded-full border px-2.5 py-0.5 text-xs font-medium outline-none focus:shadow-glow ${STATUS_CLS[value]} ${className}`}
    >
      {Object.entries(LEAD_STATUS_LABELS).map(([k, l]) => (
        <option key={k} value={k}>{l}</option>
      ))}
    </select>
  );
}
