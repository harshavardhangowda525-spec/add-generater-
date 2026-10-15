"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { JOB_STATUS_UI, JobProgress } from "@/components/JobProgress";
import { api, fmtDateTime } from "@/lib/client";
import type { JobDTO } from "@/lib/types";
import { useJobDriver } from "@/lib/useJobDriver";

export default function HistoryPage() {
  const [jobs, setJobs] = useState<JobDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openJob, setOpenJob] = useState<JobDTO | null>(null);
  const { job, act, stepError } = useJobDriver(openJob, (j) => setJobs((js) => js?.map((x) => (x.id === j.id ? j : x)) ?? js));

  useEffect(() => {
    api<{ jobs: JobDTO[] }>("/api/searches").then((r) => setJobs(r.jobs)).catch((e) => setError(e.message));
  }, []);

  const totals = (jobs ?? []).reduce((a, j) => ({ found: a.found + j.foundCount, scanned: a.scanned + j.scannedCount, requests: a.requests + j.requestCount }), { found: 0, scanned: 0, requests: 0 });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white sm:text-2xl">Search History</h1>
        <p className="text-sm text-slate-400">
          {jobs ? `${jobs.length} searches · ${totals.found.toLocaleString("en-IN")} new leads · ${totals.scanned.toLocaleString("en-IN")} businesses checked · ${totals.requests.toLocaleString("en-IN")} API requests` : "Loading…"}
        </p>
      </div>
      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}
      {job && <JobProgress job={job} onAction={(a) => act(a).catch((e) => setError(e.message))} stepError={stepError} />}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-sky-400/15 bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Started</th>
              <th className="px-4 py-3">Search</th>
              <th className="px-4 py-3">Filters</th>
              <th className="px-4 py-3 text-right">Found / Target</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-400/10">
            {(jobs ?? []).map((j) => {
              const p = j.params;
              const ui = JOB_STATUS_UI[j.status];
              return (
                <tr key={j.id} className="hover:bg-sky-400/5">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-400">{fmtDateTime(j.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium capitalize text-white">{p.niche === "custom" ? p.customNiche : p.niche.replace(/_/g, " ")}</div>
                    <div className="text-xs text-slate-400">{[p.area, p.city, p.state, p.country].filter(Boolean).join(", ")}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    Website: {p.websiteFilter === "none" ? "none only" : p.websiteFilter} · Instagram: {p.instagramFilter}
                    {p.minQuality ? ` · quality ≥ ${p.minQuality}` : ""}
                    {p.checkWebsites ? " · sites checked" : ""}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums"><strong>{j.foundCount}</strong> / {j.target}</td>
                  <td className="px-4 py-3"><span className={`badge ${ui.cls}`} title={j.stopReason ?? undefined}>{ui.label}</span></td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button className="btn-ghost text-xs" onClick={() => setOpenJob(j)}>Details</button>
                    {j.foundCount > 0 && <Link className="btn-ghost text-xs" href={`/leads?jobId=${j.id}`}>Leads</Link>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {jobs && jobs.length === 0 && <p className="p-8 text-center text-sm text-slate-400">No searches yet. <Link className="text-sky-300" href="/">Run your first search</Link>.</p>}
      </div>
    </div>
  );
}
