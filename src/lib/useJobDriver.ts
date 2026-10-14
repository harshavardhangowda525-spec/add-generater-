"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "./client";
import type { JobDTO } from "./types";

/**
 * While a job is "running", keep calling its step endpoint. Each call does a
 * bounded slice of work server-side. If the tab closes, the job stays saved and
 * continues when you return (or immediately, if the background worker runs).
 */
export function useJobDriver(initial: JobDTO | null, onProgress?: (j: JobDTO) => void) {
  const [job, setJob] = useState<JobDTO | null>(initial);
  const [stepError, setStepError] = useState<string | null>(null);
  const cb = useRef(onProgress);
  cb.current = onProgress;

  useEffect(() => setJob(initial), [initial]);

  const id = job?.id;
  const running = job?.status === "running";
  useEffect(() => {
    if (!id || !running) return;
    let stop = false;
    let failures = 0;
    (async () => {
      while (!stop) {
        try {
          const { job: next } = await api<{ job: JobDTO }>(`/api/searches/${id}/step`, { method: "POST" });
          failures = 0;
          setStepError(null);
          if (stop) return;
          setJob(next);
          cb.current?.(next);
          if (next.status !== "running") return;
          // Another runner (worker/other tab) holds the lock — poll gently.
          await new Promise((r) => setTimeout(r, 1500));
        } catch (err) {
          failures++;
          setStepError((err as Error).message);
          await new Promise((r) => setTimeout(r, Math.min(30000, 2000 * 2 ** failures)));
        }
      }
    })();
    return () => {
      stop = true;
    };
  }, [id, running]);

  async function act(action: "pause" | "resume" | "cancel") {
    if (!job) return;
    const { job: next } = await api<{ job: JobDTO }>(`/api/searches/${job.id}`, { method: "POST", json: { action } });
    setJob(next);
    cb.current?.(next);
  }

  return { job, setJob, act, stepError };
}
