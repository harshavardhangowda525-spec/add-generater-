import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { isVisible, trainingOptions } from '../config/site';
import { useEnquire } from '../lib/prefill';
import { EditorialImage, MaskHeadline, PendingBadge, Reveal, SectionIndex } from '../components/motion';

export function Training() {
  const enquire = useEnquire();
  const options = trainingOptions.filter(isVisible);

  return (
    <section id="training" aria-labelledby="training-title" className="bg-paper py-24 text-ink sm:py-32 lg:py-40">
      <div className="container-x">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <SectionIndex n="03" label="Training options" tone="dark" />
            <MaskHeadline id="training-title" lines={['Ways to', <>train<span className="text-signal">.</span></>]} className="mt-10 text-[clamp(3.4rem,10vw,8rem)]" />
          </div>
          <Reveal className="max-w-sm">
            <p className="text-lg leading-relaxed text-ink/70">Choose a starting point. The team will help you find the right fit for your goals and experience.</p>
          </Reveal>
        </div>

        {options.length === 0 ? (
          <Reveal className="mt-16 border-t border-ink/15 pt-10">
            <p className="max-w-xl text-lg text-ink/75">Talk to the OUTFIT X team about the training options that suit you.</p>
            <button type="button" onClick={() => enquire('membership')} className="cta-line eyebrow mt-8 py-2">
              Ask about training options
            </button>
          </Reveal>
        ) : (
          <ol className="mt-20 space-y-24 sm:mt-28 sm:space-y-36">
            {options.map((o, i) => {
              const flip = i % 2 === 1;
              return (
                <li key={o.slug} className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
                  <Link
                    to={`/training/${o.slug}`}
                    aria-label={`${o.title} — details`}
                    tabIndex={-1}
                    className={`group block overflow-hidden lg:col-span-7 ${flip ? 'lg:order-2 lg:col-start-6' : ''}`}
                  >
                    <EditorialImage
                      image={o.image}
                      className={`${i % 3 === 0 ? 'aspect-[16/11]' : 'aspect-[5/4]'} w-full`}
                      imgClassName="transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
                    />
                  </Link>
                  <div className={`lg:col-span-5 ${flip ? 'lg:order-1' : ''}`}>
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="display text-5xl text-ink/20">{String(i + 1).padStart(2, '0')}</span>
                      {!o.confirmed && <PendingBadge />}
                    </div>
                    <h3 className="display mt-4 text-[clamp(2.6rem,6vw,4.6rem)]">{o.title}</h3>
                    <p className="mt-5 max-w-md text-lg leading-relaxed text-ink/70">{o.summary}</p>
                    <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
                      <Link to={`/training/${o.slug}`} className="group eyebrow inline-flex items-center gap-2 bg-ink px-6 py-4 text-white transition-colors hover:bg-signal">
                        Learn more <ArrowUpRight size={14} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </Link>
                      <button type="button" onClick={() => enquire(o.enquiryGoal)} className="cta-line eyebrow py-2">
                        Enquire
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
