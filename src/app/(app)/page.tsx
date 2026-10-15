"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { JobProgress } from "@/components/JobProgress";
import { SearchForm, type SearchFormValues } from "@/components/SearchForm";
import { StatsBar } from "@/components/StatsBar";
import { api } from "@/lib/client";
import type { JobDTO, MetaDTO, StatsDTO } from "@/lib/types";
import { useJobDriver } from "@/lib/useJobDriver";

export default function FindLeadsPage() {
  const [meta, setMeta] = useState<MetaDTO | null>(null);
  const [stats, setStats] = useState<StatsDTO | null>(null);
  const [initialJob, setInitialJob] = useState<JobDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const refreshStats = useCallback(() => api<{ stats: StatsDTO }>("/api/stats").then((r) => setStats(r.stats)).catch(() => {}), []);
  const { job, act, stepError } = useJobDriver(initialJob, (j) => {
    if (j.status !== "running" || j.foundCount % 5 === 0) refreshStats();
  });

  useEffect(() => {
    api<MetaDTO>("/api/meta").then(setMeta).catch((e) => setError(e.message));
    refreshStats();
    // Pick up where you left off: show the latest unfinished search.
    api<{ jobs: JobDTO[] }>("/api/searches")
      .then(({ jobs }) => setInitialJob(jobs.find((j) => ["running", "paused", "limited"].includes(j.status)) ?? jobs[0] ?? null))
      .catch(() => {});
  }, [refreshStats]);

  async function start(v: SearchFormValues) {
    setStarting(true);
    setError(null);
    try {
      const { job } = await api<{ job: JobDTO }>("/api/searches", {
        method: "POST",
        json: {
          country: v.country,
          state: v.state,
          city: v.city,
          area: v.area,
          niche: v.niche,
          customNiche: v.customNiche,
          target: Number(v.target),
          websiteFilter: v.websiteFilter,
          instagramFilter: v.instagramFilter,
          minQuality: v.minQuality ? Number(v.minQuality) : undefined,
          checkWebsites: v.checkWebsites,
        },
      });
      setInitialJob(job);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setStarting(false);
    }
  }

  const noProviders = meta && meta.providers.every((p) => !p.configured);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-navy sm:text-2xl">Find Leads</h1>
          <p className="text-sm text-slate-500">Location → niche → lead target → real businesses without listed websites, with phone numbers.</p>
        </div>
        <Link href="/leads" className="btn-secondary">Open Leads CRM →</Link>
      </div>

      <StatsBar stats={stats} />

      {noProviders && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <strong>No data provider configured.</strong> Add <code>GOOGLE_PLACES_API_KEY</code> or <code>GEOAPIFY_API_KEY</code> to the server
          environment, or set <code>OSM_ENABLED=true</code>, then restart the app. See README → Configuration.
        </div>
      )}
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      <SearchForm meta={meta} busy={starting || job?.status === "running"} onSubmit={start} />

      {job ? (
        <JobProgress job={job} onAction={(a) => act(a).catch((e) => setError(e.message))} stepError={stepError} />
      ) : (
        <div className="card p-8 text-center text-sm text-slate-500">No searches yet. Choose a location and niche above and click <strong>Find Leads</strong>.</div>
      )}

      {meta && (
        <p className="text-center text-xs text-slate-400">
          Business data: {[...new Set(meta.providers.filter((p) => p.configured).flatMap((p) => p.attribution.split(" · ")))].join(" · ") || "—"}
        </p>
      )}
    </div>
  );
}
