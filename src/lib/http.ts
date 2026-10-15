/** Errors a provider raises so the job runner can report them honestly. */
export class ProviderError extends Error {
  constructor(
    message: string,
    public kind: "quota" | "rate_limit" | "auth" | "bad_request" | "upstream" | "network",
    public status?: number,
  ) {
    super(message);
  }
}

// HTTP_DELAY_SCALE lets tests shrink throttling/backoff; production uses 1.
const scale = () => Number(process.env.HTTP_DELAY_SCALE ?? 1);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms * scale()));

/** Simple per-host minimum interval between requests (provider rate limits). */
const lastCall = new Map<string, number>();
export async function throttle(key: string, minIntervalMs: number) {
  const now = Date.now();
  const interval = minIntervalMs * scale();
  const next = Math.max(now, (lastCall.get(key) ?? 0) + interval);
  lastCall.set(key, next);
  if (next > now) await new Promise((r) => setTimeout(r, next - now));
}

export type FetchRetryOptions = {
  provider: string;
  retries?: number;
  baseDelayMs?: number;
  minIntervalMs?: number;
  timeoutMs?: number;
};

/**
 * fetch with throttling, timeout and exponential backoff (with jitter) on
 * 429/5xx/network errors. Respects Retry-After. Non-retryable failures are
 * mapped to a ProviderError with a clear kind.
 */
export async function fetchWithRetry(url: string, init: RequestInit, opts: FetchRetryOptions): Promise<Response> {
  const { provider, retries = 4, baseDelayMs = 1000, minIntervalMs = 0, timeoutMs = 60000 } = opts;
  let lastErr: ProviderError | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (minIntervalMs) await throttle(provider, minIntervalMs);
    let res: Response;
    try {
      res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    } catch (err) {
      lastErr = new ProviderError(`${provider}: network error (${err instanceof Error ? err.message : err})`, "network");
      if (attempt < retries) await sleep(backoff(baseDelayMs, attempt));
      continue;
    }
    if (res.ok) return res;

    const body = await res.text().catch(() => "");
    const snippet = body.replace(/\s+/g, " ").slice(0, 200);
    if (res.status === 429 || res.status >= 500) {
      lastErr = new ProviderError(
        `${provider}: ${res.status === 429 ? "rate limit / quota reached" : "server error"} (HTTP ${res.status}) ${snippet}`,
        res.status === 429 ? "rate_limit" : "upstream",
        res.status,
      );
      if (attempt < retries) {
        const ra = Number(res.headers.get("retry-after"));
        await sleep(Number.isFinite(ra) && ra > 0 ? Math.min(ra * 1000, 60000) : backoff(baseDelayMs, attempt));
      }
      continue;
    }
    if (res.status === 401 || res.status === 403) {
      const quota = /quota|billing|exceed|limit/i.test(body);
      throw new ProviderError(
        `${provider}: ${quota ? "quota or billing limit" : "API key rejected"} (HTTP ${res.status}) ${snippet}`,
        quota ? "quota" : "auth",
        res.status,
      );
    }
    throw new ProviderError(`${provider}: request rejected (HTTP ${res.status}) ${snippet}`, "bad_request", res.status);
  }
  throw lastErr ?? new ProviderError(`${provider}: request failed`, "network");
}

function backoff(base: number, attempt: number) {
  return base * 2 ** attempt + Math.floor(Math.random() * base);
}
