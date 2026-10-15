"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DashboardLeads } from "@/components/DashboardLeads";
import { JobMini } from "@/components/JobProgress";
import { LeadDetail, LeadDrawer } from "@/components/LeadDrawer";
import { SearchForm, type SearchFormValues } from "@/components/SearchForm";
import { StatsBar } from "@/components/StatsBar";
import { api } from "@/lib/client";
import type { JobDTO, MetaDTO, StatsDTO } from "@/lib/types";
import { useJobDriver } from "@/lib/useJobDriver";

/** Docked details panel needs room for three columns; below that it becomes a slide-over. */
function useWide() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return wide;
}

export default function DashboardPage() {
  const [meta, setMeta] = useState<MetaDTO | null>(null);
  const [stats, setStats] = useState<StatsDTO | null>(null);
  const [initialJob, setInitialJob] = useState<JobDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const wide = useWide();

  const refreshStats = useCallback(() => api<{ stats: StatsDTO }>("/api/stats").then((r) => setStats(r.stats)).catch(() => {}), []);
  const { job, act } = useJobDriver(initialJob, (j) => {
    // Refresh the table and counters as new leads arrive.
    refreshStats();
    setRefreshKey((k) => k + 1);
    if (j.status !== "running") setRefreshKey((k) => k + 1);
  });

  useEffect(() => {
    api<MetaDTO>("/api/meta").then(setMeta).catch((e) => setError(e.message));
    refreshStats();
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
          reachKm: Number(v.reachKm),
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
  const searching = job?.status === "running";

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="pt-2 text-center">
        <h1 className="inline-block rounded-xl border border-sky-300/50 bg-ink-900/60 px-5 py-2 text-2xl font-bold tracking-tight text-white shadow-glow-strong sm:px-7 sm:text-4xl">
          Find Opportunities. Build Connections.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm text-slate-300 sm:text-base">
          Discover real local businesses, identify prospects without listed websites, and turn verified leads into customers.
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <button className="btn-primary px-5" onClick={() => { document.getElementById("target")?.focus(); document.getElementById("search-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
            Find New Leads
          </button>
          <Link className="btn-secondary px-5" href="/leads">View Saved Leads</Link>
        </div>
      </section>

      {noProviders && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          <strong>No data provider configured.</strong> Add <code>GOOGLE_PLACES_API_KEY</code> or <code>GEOAPIFY_API_KEY</code> to the server environment, or set <code>OSM_ENABLED=true</code>, then redeploy.
        </div>
      )}
      {error && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>}

      <div className="grid items-start gap-4 lg:grid-cols-[250px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)_290px]">
        {/* Left: search */}
        <aside id="search-panel" className="scroll-mt-20 lg:sticky lg:top-20">
          <SearchForm meta={meta} busy={starting || searching} searching={searching} onSubmit={start}>
            {job && <JobMini job={job} onAction={(a) => act(a).catch((e) => setError(e.message))} />}
          </SearchForm>
        </aside>

        {/* Centre: stats + table */}
        <section className="min-w-0 space-y-4">
          <StatsBar stats={stats} />
          <DashboardLeads selectedId={selected} onSelect={setSelected} refreshKey={refreshKey} onChanged={refreshStats} />
          {meta && (
            <p className="text-center text-xs text-slate-500">
              Business data: {[...new Set(meta.providers.filter((p) => p.configured).flatMap((p) => p.attribution.split(" · ")))].join(" · ") || "—"}
            </p>
          )}
        </section>

        {/* Right: docked details (wide screens) */}
        {wide && (
          <aside className="card-glow sticky top-20 hidden max-h-[calc(100vh-6rem)] overflow-hidden xl:block">
            {selected ? (
              <LeadDetail key={selected} leadId={selected} onClose={() => setSelected(null)} onChange={() => { setRefreshKey((k) => k + 1); refreshStats(); }} />
            ) : (
              <div className="flex h-full min-h-[320px] flex-col">
                <div className="border-b border-sky-400/10 px-4 py-3"><h2 className="panel-title">Lead Details</h2></div>
                <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
                  <div className="mb-3 h-10 w-10 rotate-45 rounded-sm border border-sky-400/30 bg-sky-400/10 shadow-glow" />
                  <p className="text-sm text-slate-300">Select a lead to see its details,</p>
                  <p className="text-sm text-slate-400">add CRM notes and update its status.</p>
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      {!wide && selected && (
        <LeadDrawer leadId={selected} onClose={() => setSelected(null)} onChange={() => { setRefreshKey((k) => k + 1); refreshStats(); }} />
      )}
    </div>
  );
}
