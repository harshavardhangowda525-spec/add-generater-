import { describe, expect, it, vi } from 'vitest';
import { normaliseIndianMobile, validateEnquiry, emptyEnquiry, type EnquiryInput } from '../../src/lib/validation';
import { submitEnquiry, toRow } from '../../src/lib/enquiry';
import { whatsappLink, telLink, directionsLink } from '../../src/lib/contact';

const ALLOWED = { goals: ['strength', 'general', 'coaching', 'mobility', 'membership', 'other'], experience: ['new', 'some', 'experienced'], methods: ['phone', 'whatsapp', 'email'] };
const valid: EnquiryInput = { ...emptyEnquiry, fullName: 'Asha Rao', phone: '98765 43210', goal: 'strength', contactMethod: 'phone', consent: true };

describe('normaliseIndianMobile', () => {
  it.each([
    ['98765 43210', '+919876543210'],
    ['+91 98765-43210', '+919876543210'],
    ['919876543210', '+919876543210'],
    ['09876543210', '+919876543210'],
    ['(987) 654 3210', '+919876543210'],
  ])('accepts %s', (raw, out) => expect(normaliseIndianMobile(raw)).toBe(out));

  it.each(['12345', '5876543210', '98765432101', 'abcdefghij', '+1 415 555 0100', '98765x43210'])('rejects %s', (raw) =>
    expect(normaliseIndianMobile(raw)).toBeNull(),
  );
});

describe('validateEnquiry', () => {
  it('passes a complete enquiry', () => expect(validateEnquiry(valid, ALLOWED)).toEqual({}));

  it('flags every required field on an empty form', () => {
    const e = validateEnquiry(emptyEnquiry, ALLOWED);
    expect(Object.keys(e).sort()).toEqual(['consent', 'contactMethod', 'fullName', 'goal', 'phone']);
  });

  it('requires an email when email is the preferred contact method', () => {
    expect(validateEnquiry({ ...valid, contactMethod: 'email' }, ALLOWED).email).toBeDefined();
    expect(validateEnquiry({ ...valid, contactMethod: 'email', email: 'a@b.co' }, ALLOWED)).toEqual({});
  });

  it('rejects an invalid optional email and unknown options', () => {
    const e = validateEnquiry({ ...valid, email: 'not-an-email', goal: 'hack' }, ALLOWED);
    expect(e.email).toBeDefined();
    expect(e.goal).toBeDefined();
  });
});

describe('contact links', () => {
  it('builds a digits-only WhatsApp link with the encoded message', () => {
    const url = new URL(whatsappLink());
    expect(url.origin + url.pathname).toBe('https://wa.me/917624886713');
    expect(url.searchParams.get('text')).toContain("I'm interested in learning more");
  });
  it('uses E.164 for click-to-call', () => expect(telLink).toBe('tel:+917624886713'));
  it('points directions at the exact address', () => {
    const dest = new URL(directionsLink).searchParams.get('destination');
    expect(dest).toContain('1791, 19th Main Road');
    expect(dest).toContain('560102');
  });
});

describe('submitEnquiry', () => {
  const env = { url: 'https://example.supabase.co', anonKey: 'anon' };

  it('reports not-configured without credentials and never calls the network', async () => {
    const f = vi.fn();
    expect(await submitEnquiry(valid, {}, f as unknown as typeof fetch)).toEqual({ ok: false, reason: 'not-configured' });
    expect(f).not.toHaveBeenCalled();
  });

  it('succeeds only on HTTP 201 and sends a normalised row', async () => {
    const f = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
    expect(await submitEnquiry(valid, env, f)).toEqual({ ok: true });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('https://example.supabase.co/rest/v1/enquiries');
    expect(JSON.parse(init.body).phone).toBe('+919876543210');
    expect(init.headers.Prefer).toBe('return=minimal');
  });

  it.each([200, 400, 401, 409, 500])('treats HTTP %i as a failure', async (status) => {
    const f = vi.fn().mockResolvedValue(new Response(null, { status }));
    expect((await submitEnquiry(valid, env, f)).ok).toBe(false);
  });

  it('treats a network error as a failure', async () => {
    const f = vi.fn().mockRejectedValue(new TypeError('offline'));
    expect(await submitEnquiry(valid, env, f)).toEqual({ ok: false, reason: 'network' });
  });

  it('maps blank optional fields to null', () => {
    const row = toRow(valid);
    expect(row.email).toBeNull();
    expect(row.experience).toBeNull();
    expect(row.message).toBeNull();
  });
});
