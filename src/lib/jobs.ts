import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "./db";
import { searchJobs, type JobCursor, type JobLogEntry, type SearchJob, type SearchParams } from "./db/schema";
import { planTiles } from "./geocode";
import { ProviderError } from "./http";
import { saveLead } from "./leads-store";
import { resolveNiche } from "./niches";
import { evaluateBusiness } from "./pipeline";
import { configuredProviders, getProvider } from "./providers";

const LOCK_SECONDS = 180;

export async function createJob(userId: string, params: SearchParams) {
  const [job] = await db
    .insert(searchJobs)
    .values({ userId, params, target: params.target, status: "running", log: [entry("info", `Search created: ${describe(params)}`)] })
    .returning();
  return job;
}

export function describe(p: SearchParams) {
  const niche = p.niche === "custom" ? p.customNiche : p.niche;
  const where = [p.area, p.city, p.state, p.country].filter(Boolean).join(", ");
  return `${p.target} × ${niche} in ${where}`;
}

function entry(level: JobLogEntry["level"], message: string): JobLogEntry {
  return { at: new Date().toISOString(), level, message };
}

/** Atomically claim a running job so a browser step and the worker never process it at once. */
async function claim(jobId: string, userId?: string): Promise<SearchJob | null> {
  const rows = await db
    .update(searchJobs)
    .set({ lockedUntil: sql`now() + make_interval(secs => ${LOCK_SECONDS})` })
    .where(
      and(
        eq(searchJobs.id, jobId),
        userId ? eq(searchJobs.userId, userId) : undefined,
        eq(searchJobs.status, "running"),
        sql`(${searchJobs.lockedUntil} is null or ${searchJobs.lockedUntil} < now())`,
      ),
    )
    .returning();
  return rows[0] ?? null;
}

/**
 * Run one time-boxed slice of a search job. Safe to call repeatedly from the
 * browser, a cron, or the worker; progress lives in the database so the job
 * survives refreshes, restarts and pauses.
 */
export async function runJobStep(jobId: string, opts: { userId?: string; budgetMs?: number } = {}): Promise<SearchJob | null> {
  const budgetMs = opts.budgetMs ?? (Number(process.env.JOB_STEP_SECONDS) || 20) * 1000;
  const job = await claim(jobId, opts.userId);
  if (!job) return getJob(jobId, opts.userId);

  const started = Date.now();
  const params = job.params;
  const log: JobLogEntry[] = [...job.log];
  const counters = {
    foundCount: job.foundCount,
    scannedCount: job.scannedCount,
    duplicateCount: job.duplicateCount,
    skippedNoPhone: job.skippedNoPhone,
    skippedWebsite: job.skippedWebsite,
    skippedOther: job.skippedOther,
    requestCount: job.requestCount,
  };
  let cursor = job.cursor;
  let status: SearchJob["status"] = "running";
  let stopReason: string | null = null;

  const pushLog = (level: JobLogEntry["level"], msg: string) => {
    log.push(entry(level, msg));
    if (log.length > 200) log.splice(0, log.length - 200);
  };

  try {
    if (!cursor) {
      const wanted = params.providers?.length ? params.providers : null;
      const providers = configuredProviders().filter((p) => !wanted || wanted.includes(p.name));
      if (providers.length === 0) {
        throw new ProviderError(
          "No data provider is configured. Set GOOGLE_PLACES_API_KEY or GEOAPIFY_API_KEY, or enable OpenStreetMap (OSM_ENABLED=true).",
          "auth",
        );
      }
      const plan = await planTiles(params);
      plan.notes.forEach((n) => pushLog("info", n));
      cursor = {
        tiles: plan.tiles,
        providerOrder: providers.map((p) => p.name),
        providers: Object.fromEntries(providers.map((p) => [p.name, { tileIdx: 0, page: null, done: false, limited: false }])),
      } satisfies JobCursor;
      pushLog("info", `Providers: ${providers.map((p) => p.label).join(", ")}. ${plan.tiles.length} search areas planned.`);
    }

    const niche = resolveNiche(params.niche, params.customNiche);

    // Always fetch at least one page per step so every step makes progress.
    let pagesThisStep = 0;
    while ((pagesThisStep === 0 || Date.now() - started < budgetMs) && counters.foundCount < job.target) {
      pagesThisStep++;
      const name = cursor.providerOrder.find((n) => !cursor!.providers[n].done && !cursor!.providers[n].limited);
      if (!name) break;
      const provider = getProvider(name);
      const pc = cursor.providers[name];
      if (!provider || !provider.isConfigured()) {
        pc.limited = true;
        pushLog("warn", `${name} is no longer configured; skipping it.`);
        continue;
      }
      const tile = cursor.tiles[pc.tileIdx];
      try {
        const res = await provider.searchPage({ niche, tile, params, page: pc.page, phoneRequired: true });
        counters.requestCount += res.requests;
        let newHere = 0;
        for (const b of res.items) {
          if (counters.foundCount >= job.target) break;
          counters.scannedCount++;
          const ev = await evaluateBusiness(b, params, provider.attribution);
          if (!ev.eligible) {
            if (ev.reason === "no_phone") counters.skippedNoPhone++;
            else if (ev.reason === "website") counters.skippedWebsite++;
            else counters.skippedOther++;
            continue;
          }
          const saved = await saveLead({ ...ev.lead, userId: job.userId, searchJobId: job.id }, {
            provider: b.provider,
            sourceId: b.sourceId,
            raw: b.raw,
          });
          if (saved.outcome === "inserted") {
            counters.foundCount++;
            newHere++;
          } else counters.duplicateCount++;
        }
        pushLog("info", `${provider.label} · ${tile.label}${pc.page ? ` · page ${pageNo(pc.page)}` : ""}: ${res.items.length} businesses checked, ${newHere} new leads.`);
        if (res.nextPage) pc.page = res.nextPage;
        else {
          pc.page = null;
          pc.tileIdx++;
          if (pc.tileIdx >= cursor.tiles.length) {
            pc.done = true;
            pushLog("info", `${provider.label}: all ${cursor.tiles.length} search areas covered.`);
          }
        }
      } catch (err) {
        if (!(err instanceof ProviderError)) throw err;
        counters.requestCount++;
        if (err.kind === "quota" || err.kind === "rate_limit" || err.kind === "auth") {
          pc.limited = true;
          pushLog("error", `${err.message} — paused this provider. Resume the search later to continue from ${tile.label}.`);
        } else {
          pushLog("warn", `${err.message} — skipped ${tile.label}.`);
          pc.page = null;
          pc.tileIdx++;
          if (pc.tileIdx >= cursor.tiles.length) pc.done = true;
        }
      }
    }

    if (counters.foundCount >= job.target) {
      status = "completed";
      stopReason = `Target reached: ${counters.foundCount} new leads.`;
    } else {
      const states = cursor.providerOrder.map((n) => cursor!.providers[n]);
      const active = states.some((s) => !s.done && !s.limited);
      if (!active) {
        const limited = cursor.providerOrder.filter((n) => cursor!.providers[n].limited);
        status = limited.length ? "limited" : "exhausted";
        stopReason = limited.length
          ? `Stopped at ${counters.foundCount} of ${job.target}: provider limit reached (${limited.map((n) => getProvider(n)?.label ?? n).join(", ")}). Resume later or configure another provider.`
          : `Only ${counters.foundCount} of ${job.target} matching leads found — every search area was covered. Try nearby cities, another niche, or relax the filters.`;
      }
    }
    if (stopReason) pushLog(status === "completed" ? "info" : "warn", stopReason);
  } catch (err) {
    status = "failed";
    stopReason = err instanceof Error ? err.message : String(err);
    pushLog("error", stopReason);
  }

  const finished = status !== "running";
  const [updated] = await db
    .update(searchJobs)
    .set({
      ...counters,
      cursor,
      log,
      // Don't clobber a pause/cancel the user made while this step was running.
      status: sql`case when ${searchJobs.status} = 'running' then ${status} else ${searchJobs.status} end`,
      stopReason: stopReason ?? job.stopReason,
      finishedAt: finished ? new Date() : null,
      lockedUntil: null,
      updatedAt: new Date(),
    })
    .where(eq(searchJobs.id, job.id))
    .returning();
  return updated;
}

function pageNo(page: string) {
  const n = Number(page);
  return Number.isFinite(n) ? Math.floor(n / 100) + 1 : "next";
}

export async function getJob(jobId: string, userId?: string) {
  const [job] = await db
    .select()
    .from(searchJobs)
    .where(and(eq(searchJobs.id, jobId), userId ? eq(searchJobs.userId, userId) : undefined))
    .limit(1);
  return job ?? null;
}

export async function listJobs(userId: string, limit = 50) {
  return db.select().from(searchJobs).where(eq(searchJobs.userId, userId)).orderBy(desc(searchJobs.createdAt)).limit(limit);
}

export async function setJobState(jobId: string, userId: string, action: "pause" | "resume" | "cancel") {
  const job = await getJob(jobId, userId);
  if (!job) return null;
  const log = [...job.log];
  let status = job.status;
  let cursor = job.cursor;
  if (action === "pause" && status === "running") {
    status = "paused";
    log.push(entry("info", "Paused by user."));
  } else if (action === "resume" && ["paused", "limited", "failed"].includes(status) && job.foundCount < job.target) {
    if (cursor) {
      // Give rate-limited providers another try from where they stopped.
      for (const n of cursor.providerOrder) cursor.providers[n].limited = false;
      cursor = { ...cursor };
    }
    if (status === "failed") cursor = null; // re-plan from scratch
    status = "running";
    log.push(entry("info", "Resumed by user."));
  } else if (action === "cancel" && !["completed", "cancelled"].includes(status)) {
    status = "cancelled";
    log.push(entry("info", "Cancelled by user."));
  } else return job;
  const [updated] = await db
    .update(searchJobs)
    .set({ status, cursor, log, finishedAt: status === "running" ? null : job.finishedAt ?? new Date(), updatedAt: new Date() })
    .where(eq(searchJobs.id, jobId))
    .returning();
  return updated;
}

/** Jobs a background worker should pick up. */
export async function runnableJobIds(limit = 5) {
  const rows = await db
    .select({ id: searchJobs.id })
    .from(searchJobs)
    .where(and(eq(searchJobs.status, "running"), sql`(${searchJobs.lockedUntil} is null or ${searchJobs.lockedUntil} < now())`))
    .orderBy(searchJobs.updatedAt)
    .limit(limit);
  return rows.map((r) => r.id);
}
