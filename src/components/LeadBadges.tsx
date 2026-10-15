import type { LeadDTO } from "@/lib/types";
import { LEAD_STATUS_LABELS, WEBSITE_STATUS_LABELS } from "@/lib/labels";
import { qualityLabel } from "@/lib/quality";

const WEB_CLS: Record<LeadDTO["websiteStatus"], string> = {
  no_website: "bg-emerald-100 text-emerald-800",
  available: "bg-slate-100 text-slate-700",
  unreachable: "bg-amber-100 text-amber-800",
  unknown: "bg-slate-100 text-slate-500",
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
  const cls = l === "High" ? "bg-blue-100 text-blue-800" : l === "Medium" ? "bg-sky-50 text-sky-700" : "bg-slate-100 text-slate-500";
  return <span className={`badge ${cls}`} title={`Quality score ${score}/100`}>{l} · {score}</span>;
}

export const STATUS_CLS: Record<LeadDTO["status"], string> = {
  new: "bg-slate-100 text-slate-700",
  ready: "bg-blue-50 text-blue-700",
  contacted: "bg-indigo-100 text-indigo-700",
  interested: "bg-amber-100 text-amber-800",
  demo_scheduled: "bg-purple-100 text-purple-700",
  proposal_sent: "bg-cyan-100 text-cyan-800",
  converted: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-50 text-red-600",
};

export function StatusSelect({ value, onChange, className = "" }: { value: LeadDTO["status"]; onChange: (s: LeadDTO["status"]) => void; className?: string }) {
  return (
    <select
      aria-label="Lead status"
      value={value}
      onChange={(e) => onChange(e.target.value as LeadDTO["status"])}
      className={`cursor-pointer rounded-full border-0 py-0.5 pl-2 pr-7 text-xs font-medium focus:ring-2 focus:ring-brand/30 ${STATUS_CLS[value]} ${className}`}
    >
      {Object.entries(LEAD_STATUS_LABELS).map(([k, l]) => (
        <option key={k} value={k}>{l}</option>
      ))}
    </select>
  );
}
