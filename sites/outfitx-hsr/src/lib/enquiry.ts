import { normaliseIndianMobile, type EnquiryInput } from './validation';

export type SubmitResult = { ok: true } | { ok: false; reason: 'not-configured' | 'network' | 'rejected' };

type Env = { url?: string; anonKey?: string };

export function enquiryBackendConfigured(env: Env = readEnv()): boolean {
  return Boolean(env.url && env.anonKey);
}

function readEnv(): Env {
  return { url: import.meta.env.VITE_SUPABASE_URL, anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY };
}

/** Database row shape for public.enquiries. */
export function toRow(v: EnquiryInput) {
  return {
    full_name: v.fullName.trim(),
    phone: normaliseIndianMobile(v.phone),
    email: v.email.trim() || null,
    fitness_goal: v.goal,
    experience: v.experience || null,
    contact_method: v.contactMethod,
    message: v.message.trim() || null,
    consent: v.consent,
    source_page: typeof window !== 'undefined' ? window.location.pathname : null,
  };
}

/**
 * Inserts an enquiry through Supabase's REST API with the public anon key.
 * Row Level Security allows the anon role to INSERT only — it cannot read,
 * update or delete enquiries. Resolves ok only when the database confirms
 * the insert (HTTP 201); anything else is reported as a failure.
 */
export async function submitEnquiry(
  v: EnquiryInput,
  env: Env = readEnv(),
  fetchImpl: typeof fetch = fetch,
): Promise<SubmitResult> {
  if (!env.url || !env.anonKey) return { ok: false, reason: 'not-configured' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetchImpl(`${env.url.replace(/\/$/, '')}/rest/v1/enquiries`, {
      method: 'POST',
      headers: {
        apikey: env.anonKey,
        Authorization: `Bearer ${env.anonKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(toRow(v)),
      signal: controller.signal,
    });
    return res.status === 201 ? { ok: true } : { ok: false, reason: 'rejected' };
  } catch {
    return { ok: false, reason: 'network' };
  } finally {
    clearTimeout(timer);
  }
}
