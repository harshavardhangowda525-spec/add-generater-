// Supabase Edge Function: emails staff when a new enquiry is saved.
//
// Triggered by a Database Webhook (Database → Webhooks) on INSERT into
// public.enquiries. Secrets are set with `supabase secrets set` and are
// never exposed to the browser:
//   RESEND_API_KEY        — https://resend.com API key
//   NOTIFY_TO             — comma-separated staff email addresses
//   NOTIFY_FROM           — verified sender, e.g. "RK Fitness Website <enquiries@yourdomain.com>"
//   WEBHOOK_SECRET        — shared secret, sent by the webhook as the x-webhook-secret header

type Enquiry = {
  id: string;
  created_at: string;
  full_name: string;
  phone: string;
  email: string | null;
  fitness_goal: string;
  experience: string | null;
  contact_method: string;
  message: string | null;
};

const GOALS: Record<string, string> = {
  strength: 'Strength and muscle development',
  general: 'General fitness',
  coaching: 'Personalized coaching',
  mobility: 'Mobility and movement',
  membership: 'Membership information',
  other: 'Other',
};

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const secret = Deno.env.get('WEBHOOK_SECRET');
  if (!secret || req.headers.get('x-webhook-secret') !== secret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  const row = payload?.record as Enquiry | undefined;
  if (payload?.type !== 'INSERT' || payload?.table !== 'enquiries' || !row) {
    return new Response('Ignored', { status: 200 });
  }

  const apiKey = Deno.env.get('RESEND_API_KEY');
  const to = (Deno.env.get('NOTIFY_TO') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const from = Deno.env.get('NOTIFY_FROM');
  if (!apiKey || !to.length || !from) return new Response('Notification not configured', { status: 500 });

  const rows: [string, string][] = [
    ['Name', row.full_name],
    ['Phone', row.phone],
    ['Email', row.email ?? '—'],
    ['Goal', GOALS[row.fitness_goal] ?? row.fitness_goal],
    ['Experience', row.experience ?? '—'],
    ['Preferred contact', row.contact_method],
    ['Message', row.message ?? '—'],
    ['Received', new Date(row.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })],
  ];
  const html = `<h2>New website enquiry</h2><table cellpadding="6">${rows
    .map(([k, v]) => `<tr><td><strong>${esc(k)}</strong></td><td>${esc(v)}</td></tr>`)
    .join('')}</table>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject: `New enquiry: ${row.full_name}`, html }),
  });

  // A non-2xx response makes the webhook log the failure for staff to review.
  return new Response(res.ok ? 'Sent' : 'Email provider error', { status: res.ok ? 200 : 502 });
});
