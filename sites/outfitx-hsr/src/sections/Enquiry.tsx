import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, CircleAlert, LoaderCircle, MessageCircle, Phone } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { business, contactMethods, experienceLevels, fitnessGoals } from '../config/site';
import { submitEnquiry, type SubmitResult } from '../lib/enquiry';
import { telLink, whatsappLink } from '../lib/contact';
import { usePrefill } from '../lib/prefill';
import { emptyEnquiry, LIMITS, validateEnquiry, type EnquiryErrors, type EnquiryInput } from '../lib/validation';
import { EASE, MaskHeadline, Reveal, SectionIndex } from '../components/motion';

const ALLOWED = {
  goals: fitnessGoals.map((g) => g.value as string),
  experience: experienceLevels.map((g) => g.value as string),
  methods: contactMethods.map((g) => g.value as string),
};

const FAILURE_COPY: Record<Exclude<SubmitResult, { ok: true }>['reason'], string> = {
  'not-configured': 'Online enquiries are not connected yet, so your details have not been sent.',
  network: 'We could not reach our server. Check your connection and try again.',
  rejected: 'Your enquiry could not be saved. Please try again in a moment.',
};

type Status = { state: 'idle' } | { state: 'submitting' } | { state: 'success' } | { state: 'error'; message: string };

function Field({ id, label, optional, error, children }: { id: string; label: string; optional?: boolean; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="eyebrow flex items-baseline justify-between text-white/60">
        <span>{label}</span>
        {optional && <span className="text-[0.6rem] tracking-[0.2em] text-white/35">Optional</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-2 flex items-start gap-1.5 text-sm text-[#ff6b63]">
          <CircleAlert size={14} className="mt-0.5 shrink-0" aria-hidden /> {error}
        </p>
      )}
    </div>
  );
}

export function Enquiry() {
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;
  const [values, setValues] = useState<EnquiryInput>(emptyEnquiry);
  const [errors, setErrors] = useState<EnquiryErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState<Status>({ state: 'idle' });
  const [honeypot, setHoneypot] = useState('');
  const inFlight = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const prefill = usePrefill();

  useEffect(() => {
    if (prefill && ALLOWED.goals.includes(prefill.goal)) setValues((v) => ({ ...v, goal: prefill.goal }));
  }, [prefill]);

  useEffect(() => {
    if (status.state === 'success') successRef.current?.focus();
  }, [status.state]);

  const set = <K extends keyof EnquiryInput>(key: K, value: EnquiryInput[K]) => {
    const next = { ...values, [key]: value };
    setValues(next);
    // After the first submit attempt, re-validate live so errors clear as they are fixed.
    if (submitted) setErrors(validateEnquiry(next, ALLOWED));
  };

  const errProps = (name: keyof EnquiryInput) => ({
    'aria-invalid': errors[name] ? (true as const) : undefined,
    'aria-describedby': errors[name] ? `${id(name)}-error` : undefined,
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (inFlight.current || status.state === 'success') return;
    setSubmitted(true);
    const found = validateEnquiry(values, ALLOWED);
    setErrors(found);
    if (Object.keys(found).length) {
      const first = Object.keys(found)[0];
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    // Bots fill hidden fields; quietly drop the submission without claiming success.
    if (honeypot) {
      setStatus({ state: 'error', message: FAILURE_COPY.rejected });
      return;
    }
    inFlight.current = true;
    setStatus({ state: 'submitting' });
    const result = await submitEnquiry(values);
    inFlight.current = false;
    setStatus(result.ok ? { state: 'success' } : { state: 'error', message: FAILURE_COPY[result.reason] });
  }

  const busy = status.state === 'submitting';

  return (
    <section id="enquire" aria-labelledby="enquire-title" className="grain relative overflow-hidden bg-graphite py-24 sm:py-32 lg:py-40">
      <div className="container-x relative z-[2] grid gap-16 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-5">
          <SectionIndex n="07" label="Membership enquiries" />
          <MaskHeadline id="enquire-title" lines={['Ready to', 'train with', <>intent<span className="text-signal">?</span></>]} className="mt-10 text-[clamp(3.2rem,9vw,7rem)] text-white" />
          <Reveal>
            <p className="mt-8 max-w-md text-lg leading-relaxed text-white/70">
              Tell us what you're working towards. Connect with the OUTFIT X team to explore your training options.
            </p>
            <div className="mt-10 space-y-3 border-t border-white/10 pt-8 text-white/70">
              <p className="eyebrow text-white/45">Prefer to talk now?</p>
              <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="cta-line flex w-fit items-center gap-2 py-1 text-white">
                <MessageCircle size={16} /> WhatsApp the team <span className="sr-only">(opens in a new tab)</span>
              </a>
              <a href={telLink} className="cta-line flex w-fit items-center gap-2 py-1 text-white">
                <Phone size={16} /> {business.phoneDisplay}
              </a>
            </div>
          </Reveal>
        </div>

        <div className="lg:col-span-6 lg:col-start-7">
          <AnimatePresence mode="wait" initial={false}>
            {status.state === 'success' ? (
              <motion.div
                key="success"
                ref={successRef}
                tabIndex={-1}
                role="status"
                className="border border-white/15 bg-ink p-8 outline-none sm:p-12"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: EASE }}
              >
                <span className="flex h-14 w-14 items-center justify-center bg-signal text-white">
                  <Check size={26} />
                </span>
                <h3 className="display mt-8 text-5xl text-white">Enquiry received.</h3>
                <p className="mt-5 text-lg leading-relaxed text-white/70">
                  Thanks, {values.fullName.trim().split(/\s+/)[0]}. Your enquiry has been saved and the OUTFIT X team will contact you by{' '}
                  {contactMethods.find((m) => m.value === values.contactMethod)?.label.toLowerCase()}.
                </p>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                ref={formRef}
                noValidate
                onSubmit={onSubmit}
                aria-describedby={`${uid}-required-note`}
                className="space-y-9"
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.4 }}
              >
                <p id={`${uid}-required-note`} className="text-sm text-white/45">
                  Fields marked optional can be left blank. Everything else is required.
                </p>

                <div className="grid gap-9 sm:grid-cols-2">
                  <Field id={id('fullName')} label="Full name" error={errors.fullName}>
                    <input id={id('fullName')} name="fullName" className="field" autoComplete="name" maxLength={LIMITS.fullName} value={values.fullName} onChange={(e) => set('fullName', e.target.value)} required {...errProps('fullName')} />
                  </Field>
                  <Field id={id('phone')} label="Phone number" error={errors.phone}>
                    <input id={id('phone')} name="phone" type="tel" inputMode="tel" className="field" autoComplete="tel" placeholder="98765 43210" maxLength={20} value={values.phone} onChange={(e) => set('phone', e.target.value)} required {...errProps('phone')} />
                  </Field>
                </div>

                <Field id={id('email')} label="Email address" optional={values.contactMethod !== 'email'} error={errors.email}>
                  <input id={id('email')} name="email" type="email" inputMode="email" className="field" autoComplete="email" maxLength={LIMITS.email} value={values.email} onChange={(e) => set('email', e.target.value)} {...errProps('email')} />
                </Field>

                <div className="grid gap-9 sm:grid-cols-2">
                  <Field id={id('goal')} label="Fitness goal" error={errors.goal}>
                    <select id={id('goal')} name="goal" className="field cursor-pointer" value={values.goal} onChange={(e) => set('goal', e.target.value)} required {...errProps('goal')}>
                      <option value="" disabled>Select a goal</option>
                      {fitnessGoals.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                    </select>
                  </Field>
                  <Field id={id('experience')} label="Training experience" optional error={errors.experience}>
                    <select id={id('experience')} name="experience" className="field cursor-pointer" value={values.experience} onChange={(e) => set('experience', e.target.value)} {...errProps('experience')}>
                      <option value="">Select experience</option>
                      {experienceLevels.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                    </select>
                  </Field>
                </div>

                <fieldset aria-describedby={errors.contactMethod ? `${id('contactMethod')}-error` : undefined}>
                  <legend className="eyebrow text-white/60">Preferred contact method</legend>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {contactMethods.map((m, i) => (
                      <label key={m.value} className="relative cursor-pointer">
                        <input
                          type="radio"
                          name="contactMethod"
                          value={m.value}
                          checked={values.contactMethod === m.value}
                          onChange={() => set('contactMethod', m.value)}
                          className="peer sr-only"
                          {...(i === 0 ? errProps('contactMethod') : {})}
                        />
                        <span className="block border border-white/25 px-5 py-3 text-sm font-medium text-white/75 transition-colors peer-checked:border-white peer-checked:bg-white peer-checked:text-ink peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-signal hover:border-white/60">
                          {m.label}
                        </span>
                      </label>
                    ))}
                  </div>
                  {errors.contactMethod && (
                    <p id={`${id('contactMethod')}-error`} className="mt-2 flex items-start gap-1.5 text-sm text-[#ff6b63]">
                      <CircleAlert size={14} className="mt-0.5 shrink-0" aria-hidden /> {errors.contactMethod}
                    </p>
                  )}
                </fieldset>

                <Field id={id('message')} label="Message" optional error={errors.message}>
                  <textarea id={id('message')} name="message" rows={3} className="field resize-y" maxLength={LIMITS.message} value={values.message} onChange={(e) => set('message', e.target.value)} {...errProps('message')} />
                  <p className="mt-1 text-right text-xs tabular-nums text-white/35" aria-hidden>{values.message.length}/{LIMITS.message}</p>
                </Field>

                {/* Honeypot: hidden from people and assistive tech; bots tend to fill it. */}
                <div aria-hidden className="absolute left-[-9999px] h-px w-px overflow-hidden">
                  <label htmlFor={id('company')}>Company</label>
                  <input id={id('company')} name="company" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
                </div>

                <div>
                  <label className="flex cursor-pointer items-start gap-4">
                    <input
                      type="checkbox"
                      name="consent"
                      checked={values.consent}
                      onChange={(e) => set('consent', e.target.checked)}
                      className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-signal"
                      {...errProps('consent')}
                      aria-describedby={[errors.consent ? `${id('consent')}-error` : '', `${uid}-privacy`].filter(Boolean).join(' ')}
                    />
                    <span className="text-sm leading-relaxed text-white/70">
                      I agree to be contacted by OUTFIT X HSR about my enquiry by my preferred contact method.
                    </span>
                  </label>
                  <p id={`${uid}-privacy`} className="ml-9 mt-2 text-xs text-white/45">
                    See how we handle your details in our <Link to="/privacy" className="underline underline-offset-2 hover:text-white">privacy policy</Link>.
                  </p>
                  {errors.consent && (
                    <p id={`${id('consent')}-error`} className="ml-9 mt-2 flex items-start gap-1.5 text-sm text-[#ff6b63]">
                      <CircleAlert size={14} className="mt-0.5 shrink-0" aria-hidden /> {errors.consent}
                    </p>
                  )}
                </div>

                <div aria-live="assertive">
                  {status.state === 'error' && (
                    <div role="alert" className="border border-signal/60 bg-signal/10 p-5 text-sm text-white">
                      <p className="flex items-start gap-2 font-medium">
                        <CircleAlert size={16} className="mt-0.5 shrink-0 text-signal" aria-hidden /> {status.message}
                      </p>
                      <p className="mt-2 text-white/70">You can also reach the team directly:</p>
                      <div className="mt-3 flex flex-wrap gap-3">
                        <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="eyebrow inline-flex items-center gap-2 bg-white px-4 py-3 text-ink">
                          <MessageCircle size={14} /> WhatsApp
                        </a>
                        <a href={telLink} className="eyebrow inline-flex items-center gap-2 border border-white/30 px-4 py-3 text-white">
                          <Phone size={14} /> Call
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  aria-disabled={busy}
                  className="group eyebrow flex w-full items-center justify-center gap-3 bg-white px-8 py-5 text-ink transition-colors duration-300 hover:bg-signal hover:text-white disabled:cursor-wait disabled:opacity-70 sm:w-auto"
                >
                  {busy ? (
                    <>
                      <LoaderCircle size={16} className="animate-spin" /> Sending…
                    </>
                  ) : (
                    <>
                      Send enquiry <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
