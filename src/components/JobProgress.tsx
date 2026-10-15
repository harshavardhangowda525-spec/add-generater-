"use client";

import Link from "next/link";
import { fmtDateTime } from "@/lib/client";
import type { JobDTO } from "@/lib/types";

export const JOB_STATUS_UI: Record<JobDTO["status"], { label: string; cls: string }> = {
  running: { label: "Searching", cls: "border-sky-400/50 bg-sky-400/10 text-sky-200" },
  paused: { label: "Paused", cls: "border-slate-400/40 bg-slate-400/10 text-slate-300" },
  completed: { label: "Target reached", cls: "border-emerald-400/50 bg-emerald-400/10 text-emerald-300" },
  exhausted: { label: "No more results", cls: "border-amber-400/50 bg-amber-400/10 text-amber-300" },
  limited: { label: "Provider limit", cls: "border-orange-400/50 bg-orange-400/10 text-orange-300" },
  failed: { label: "Failed", cls: "border-rose-400/50 bg-rose-500/10 text-rose-300" },
  cancelled: { label: "Cancelled", cls: "border-slate-400/40 bg-slate-400/10 text-slate-400" },
};

export function JobProgress({ job, onAction, stepError }: { job: JobDTO; onAction: (a: "pause" | "resume" | "cancel") => void; stepError?: string | null }) {
  const pct = Math.min(100, Math.round((job.foundCount / job.target) * 100));
  const ui = JOB_STATUS_UI[job.status];
  const areas = job.cursor?.tiles.length ?? 0;
  const p = job.params;
  const where = [p.area, p.city, p.state].filter(Boolean).join(", ") + (p.reachKm ? ` (+${p.reachKm} km around)` : "");
  const niche = p.niche === "custom" ? p.customNiche : p.niche.replace(/_/g, " ");
  const recent = [...job.log].reverse().slice(0, 8);

  return (
    <div className="card overflow-hidden" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-400/10 px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={`badge ${ui.cls}`}>
              {job.status === "running" && <span className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
              {ui.label}
            </span>
            <span className="text-xs text-slate-500">Started {fmtDateTime(job.createdAt)}</span>
          </div>
          <h3 className="mt-1 font-semibold capitalize text-white">{niche} · {where}</h3>
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
          <div className="text-3xl font-bold tabular-nums text-white">
            {job.foundCount.toLocaleString("en-IN")} <span className="text-base font-medium text-slate-500">of {job.target.toLocaleString("en-IN")} requested</span>
          </div>
          <div className="text-sm font-semibold text-slate-400">{pct}%</div>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/5" role="progressbar" aria-valuenow={job.foundCount} aria-valuemin={0} aria-valuemax={job.target}>
          <div className={`h-full rounded-full transition-all ${job.status === "completed" ? "bg-emerald-400" : "bg-gradient-to-r from-brand to-glow"}`} style={{ width: `${pct}%` }} />
        </div>

        {job.stopReason && job.status !== "running" && (
          <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${job.status === "completed" ? "bg-emerald-500/10 text-emerald-200" : job.status === "failed" ? "bg-red-500/10 text-red-200" : "bg-amber-500/10 text-amber-200"}`}>
            {job.stopReason}
          </p>
        )}
        {stepError && <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-200">Connection problem: {stepError}. Retrying…</p>}

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Businesses checked" value={job.scannedCount} />
          <Stat label="Already in CRM" value={job.duplicateCount} />
          <Stat label="No phone (excluded)" value={job.skippedNoPhone} />
          <Stat label="Has website (excluded)" value={job.skippedWebsite} />
          <Stat label="Other filters" value={job.skippedOther} />
          <Stat label="API requests" value={job.requestCount} />
        </dl>
        {areas > 0 && job.cursor && (
          <p className="mt-3 text-xs text-slate-400">
            {job.cursor.providerOrder
              .map((n) => {
                const s = job.cursor!.providers[n];
                return `${n === "osm" ? "OpenStreetMap" : n === "google" ? "Google Places" : "Geoapify"}: ${s.done ? "all" : Math.min(s.tileIdx, areas)}/${areas} areas${s.limited ? " (limit hit)" : ""}`;
              })
              .join(" · ")}
          </p>
        )}
      </div>

      <details className="border-t border-sky-400/10 px-5 py-3 text-sm" open={job.status !== "completed"}>
        <summary className="cursor-pointer font-medium text-slate-300">Activity log</summary>
        <ul className="mt-2 max-h-56 space-y-1 overflow-auto font-mono text-xs">
          {recent.map((l, i) => (
            <li key={i} className={l.level === "error" ? "text-rose-300" : l.level === "warn" ? "text-amber-300" : "text-slate-400"}>
              <span className="text-slate-500">{new Date(l.at).toLocaleTimeString("en-IN")}</span> {l.message}
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
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="font-semibold tabular-nums text-slate-100">{value.toLocaleString("en-IN")}</dd>
    </div>
  );
}

/** Compact live status for the Search & Filters panel. */
export function JobMini({ job, onAction }: { job: JobDTO; onAction: (a: "pause" | "resume" | "cancel") => void }) {
  const pct = Math.min(100, Math.round((job.foundCount / job.target) * 100));
  const ui = JOB_STATUS_UI[job.status];
  const last = job.log[job.log.length - 1];
  const p = job.params;
  return (
    <div className="rounded-xl border border-sky-400/15 bg-ink-900/60 p-3 text-xs" aria-live="polite" data-testid="job-mini">
      <div className="flex items-center justify-between gap-2">
        <span className={`badge ${ui.cls}`}>{ui.label}</span>
        <span className="tabular-nums text-slate-300"><strong className="text-white">{job.foundCount}</strong> / {job.target}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full transition-all ${job.status === "completed" ? "bg-emerald-400" : "bg-gradient-to-r from-brand to-glow"}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 truncate capitalize text-slate-400">{p.niche === "custom" ? p.customNiche : p.niche.replace(/_/g, " ")} · {[p.area, p.city].filter(Boolean).join(", ")}{p.reachKm ? ` +${p.reachKm} km` : ""}</p>
      {job.status === "running" ? (
        <p className="mt-1 line-clamp-2 text-slate-400">{last?.message ?? "Connecting to provider…"}</p>
      ) : (
        job.stopReason && <p className="mt-1 line-clamp-3 text-slate-300">{job.stopReason}</p>
      )}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {job.status === "running" && <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={() => onAction("pause")}>Pause</button>}
        {["paused", "limited", "failed"].includes(job.status) && job.foundCount < job.target && (
          <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={() => onAction("resume")}>Resume</button>
        )}
        <Link className="btn-ghost px-2 py-1 text-xs" href="/history">Details</Link>
      </div>
    </div>
  );
}
