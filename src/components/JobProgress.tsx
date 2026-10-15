"use client";

import Link from "next/link";
import { fmtDateTime } from "@/lib/client";
import type { JobDTO } from "@/lib/types";

export const JOB_STATUS_UI: Record<JobDTO["status"], { label: string; cls: string }> = {
  running: { label: "Searching", cls: "bg-blue-100 text-blue-700" },
  paused: { label: "Paused", cls: "bg-slate-200 text-slate-700" },
  completed: { label: "Target reached", cls: "bg-emerald-100 text-emerald-700" },
  exhausted: { label: "No more results", cls: "bg-amber-100 text-amber-800" },
  limited: { label: "Provider limit", cls: "bg-orange-100 text-orange-800" },
  failed: { label: "Failed", cls: "bg-red-100 text-red-700" },
  cancelled: { label: "Cancelled", cls: "bg-slate-200 text-slate-600" },
};

export function JobProgress({ job, onAction, stepError }: { job: JobDTO; onAction: (a: "pause" | "resume" | "cancel") => void; stepError?: string | null }) {
  const pct = Math.min(100, Math.round((job.foundCount / job.target) * 100));
  const ui = JOB_STATUS_UI[job.status];
  const areas = job.cursor?.tiles.length ?? 0;
  const p = job.params;
  const where = [p.area, p.city, p.state].filter(Boolean).join(", ");
  const niche = p.niche === "custom" ? p.customNiche : p.niche.replace(/_/g, " ");
  const recent = [...job.log].reverse().slice(0, 8);

  return (
    <div className="card overflow-hidden" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={`badge ${ui.cls}`}>
              {job.status === "running" && <span className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
              {ui.label}
            </span>
            <span className="text-xs text-slate-400">Started {fmtDateTime(job.createdAt)}</span>
          </div>
          <h3 className="mt-1 font-semibold capitalize text-navy">{niche} · {where}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {job.status === "running" && <button className="btn-secondary" onClick={() => onAction("pause")}>Pause</button>}
          {["paused", "limited", "failed"].includes(job.status) && job.foundCount < job.target && (
            <button className="btn-primary" onClick={() => onAction("resume")}>Resume</button>
          )}
          {["running", "paused", "limited"].includes(job.status) && <button className="btn-ghost" onClick={() => onAction("cancel")}>Cancel</button>}
          {job.foundCount > 0 && <Link className="btn-secondary" href={`/leads?jobId=${job.id}`}>View {job.foundCount} leads</Link>}
        </div>
      </div>

      <div className="px-5 py-4">
        <div className="flex items-end justify-between">
          <div className="text-3xl font-bold tabular-nums text-navy">
            {job.foundCount.toLocaleString("en-IN")} <span className="text-base font-medium text-slate-400">of {job.target.toLocaleString("en-IN")} requested</span>
          </div>
          <div className="text-sm font-semibold text-slate-500">{pct}%</div>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={job.foundCount} aria-valuemin={0} aria-valuemax={job.target}>
          <div className={`h-full rounded-full transition-all ${job.status === "completed" ? "bg-emerald-500" : "bg-brand"}`} style={{ width: `${pct}%` }} />
        </div>

        {job.stopReason && job.status !== "running" && (
          <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${job.status === "completed" ? "bg-emerald-50 text-emerald-800" : job.status === "failed" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-900"}`}>
            {job.stopReason}
          </p>
        )}
        {stepError && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Connection problem: {stepError}. Retrying…</p>}

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Businesses checked" value={job.scannedCount} />
          <Stat label="Already in CRM" value={job.duplicateCount} />
          <Stat label="No phone (excluded)" value={job.skippedNoPhone} />
          <Stat label="Has website (excluded)" value={job.skippedWebsite} />
          <Stat label="Other filters" value={job.skippedOther} />
          <Stat label="API requests" value={job.requestCount} />
        </dl>
        {areas > 0 && job.cursor && (
          <p className="mt-3 text-xs text-slate-500">
            {job.cursor.providerOrder
              .map((n) => {
                const s = job.cursor!.providers[n];
                return `${n === "osm" ? "OpenStreetMap" : n === "google" ? "Google Places" : "Geoapify"}: ${s.done ? "all" : Math.min(s.tileIdx, areas)}/${areas} areas${s.limited ? " (limit hit)" : ""}`;
              })
              .join(" · ")}
          </p>
        )}
      </div>

      <details className="border-t border-slate-100 px-5 py-3 text-sm" open={job.status !== "completed"}>
        <summary className="cursor-pointer font-medium text-slate-600">Activity log</summary>
        <ul className="mt-2 max-h-56 space-y-1 overflow-auto font-mono text-xs">
          {recent.map((l, i) => (
            <li key={i} className={l.level === "error" ? "text-red-600" : l.level === "warn" ? "text-amber-700" : "text-slate-600"}>
              <span className="text-slate-400">{new Date(l.at).toLocaleTimeString("en-IN")}</span> {l.message}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-semibold tabular-nums text-slate-800">{value.toLocaleString("en-IN")}</dd>
    </div>
  );
}
