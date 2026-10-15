import { images, coaches, coachingSteps, isVisible, PROPOSAL_MODE } from '../config/site';
import { useEnquire } from '../lib/prefill';
import { DrawLine, EditorialImage, MaskHeadline, PendingBadge, Reveal, SectionIndex } from '../components/motion';

export function Coaching() {
  const enquire = useEnquire();
  const visibleCoaches = coaches.filter(isVisible);

  return (
    <section id="coaching" aria-labelledby="coaching-title" className="relative bg-ink py-24 sm:py-32 lg:py-40">
      <div className="container-x grid gap-16 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-6">
          <SectionIndex n="04" label="Coaching" />
          <MaskHeadline id="coaching-title" lines={['Your goals.', <>Your approach<span className="text-signal">.</span></>]} className="mt-10 text-[clamp(3.2rem,9vw,7.5rem)] text-white" />
          <Reveal>
            <p className="mt-8 max-w-lg text-lg leading-relaxed text-white/70">
              Training should account for your goals, experience, movement ability, and individual needs.
            </p>
          </Reveal>
          <EditorialImage image={images.coaching} className="mt-14 aspect-square w-full max-w-xl" />
        </div>

        <div className="lg:col-span-5 lg:col-start-8 lg:pt-40">
          {PROPOSAL_MODE && <PendingBadge className="mb-8">Proposed messaging · owner to confirm process</PendingBadge>}
          <ol className="border-t border-white/15">
            {coachingSteps.map((s, i) => (
              <li key={s.title} className="group border-b border-white/15">
                <Reveal delay={i * 0.05} y={18} className="flex gap-6 py-7">
                  <span className="display w-10 shrink-0 text-2xl text-white/30 transition-colors group-hover:text-signal">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{s.title}</h3>
                    <p className="mt-1.5 leading-relaxed text-white/60">{s.text}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
          <button type="button" onClick={() => enquire('coaching')} className="eyebrow mt-12 inline-flex bg-white px-7 py-4 text-ink transition-colors hover:bg-signal hover:text-white">
            Ask about coaching
          </button>
        </div>
      </div>

      {/* Coach profiles: only verified details are ever shown. */}
      {(visibleCoaches.length > 0 || PROPOSAL_MODE) && (
        <div className="container-x mt-24 sm:mt-32">
          <div className="flex items-center gap-4 text-white/60">
            <h3 className="eyebrow">The coaches</h3>
            <DrawLine className="flex-1" />
          </div>
          {visibleCoaches.length === 0 ? (
            <div className="mt-10 flex flex-col gap-4 border border-dashed border-white/20 p-8 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-xl text-white/65">
                Coach profiles — name, photo, verified qualifications, specialties and biography — will appear here once the owner confirms them.
              </p>
              <PendingBadge />
            </div>
          ) : (
            <ul className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              {visibleCoaches.map((c) => (
                <li key={c.name}>
                  {c.photo && <EditorialImage image={c.photo} className="aspect-[4/5]" />}
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <h4 className="display text-4xl text-white">{c.name}</h4>
                    {!c.confirmed && <PendingBadge />}
                  </div>
                  <p className="eyebrow mt-2 text-signal">{c.role}</p>
                  <p className="mt-4 leading-relaxed text-white/70">{c.bio}</p>
                  {c.qualifications.length > 0 && (
                    <p className="mt-4 text-sm text-white/55">
                      <span className="font-semibold text-white/80">Qualifications:</span> {c.qualifications.join(' · ')}
                    </p>
                  )}
                  {c.specialties.length > 0 && (
                    <p className="mt-2 text-sm text-white/55">
                      <span className="font-semibold text-white/80">Specialties:</span> {c.specialties.join(' · ')}
                    </p>
                  )}
                  {c.availability && <p className="mt-2 text-sm text-white/55">{c.availability}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
