import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { isVisible, trainingOptions } from '../config/site';
import { useEnquire } from '../lib/prefill';
import { EditorialImage, MaskHeadline, PendingBadge, Reveal } from '../components/motion';
import { usePageTitle } from '../components/ScrollManager';
import { NotFound } from './NotFound';

export function TrainingDetail() {
  const { slug } = useParams();
  const enquire = useEnquire();
  const option = trainingOptions.find((o) => o.slug === slug && isVisible(o));
  usePageTitle(option ? `${option.title} | OUTFIT X HSR, Bengaluru` : 'Page not found | OUTFIT X HSR', option?.summary);
  if (!option) return <NotFound />;

  const others = trainingOptions.filter((o) => o.slug !== option.slug && isVisible(o));

  return (
    <article className="bg-ink pt-28 lg:pt-36">
      <div className="container-x">
        <Link to="/#training" className="cta-line eyebrow inline-flex items-center gap-2 py-1 text-white/70">
          <ArrowLeft size={14} /> All training options
        </Link>
        <div className="mt-12 grid gap-12 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            {!option.confirmed && <PendingBadge className="mb-6" />}
            <MaskHeadline as="h1" animateOnMount lines={[<>{option.title}<span className="text-signal">.</span></>]} className="text-[clamp(3.4rem,10vw,8rem)] text-white" />
            <p className="mt-8 max-w-xl text-xl leading-relaxed text-white/75">{option.summary}</p>
          </div>
          <Reveal className="lg:col-span-4 lg:col-start-9">
            <button type="button" onClick={() => enquire(option.enquiryGoal)} className="group eyebrow inline-flex w-full items-center justify-center gap-3 bg-white px-7 py-5 text-ink transition-colors hover:bg-signal hover:text-white">
              Enquire about {option.title} <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </button>
          </Reveal>
        </div>
      </div>

      <div className="container-x mt-16">
        <EditorialImage image={option.image} priority className="aspect-[4/3] w-full sm:aspect-[21/9]" />
      </div>

      <div className="container-x grid gap-14 py-20 sm:py-28 lg:grid-cols-12">
        <div className="space-y-6 text-lg leading-relaxed text-white/75 lg:col-span-6">
          {option.details.map((p) => <p key={p}>{p}</p>)}
        </div>
        <ul className="border-t border-white/15 lg:col-span-5 lg:col-start-8">
          {option.points.map((p) => (
            <li key={p} className="flex items-center gap-4 border-b border-white/15 py-5 text-lg text-white">
              <Check size={18} className="text-signal" aria-hidden /> {p}
            </li>
          ))}
        </ul>
      </div>

      {others.length > 0 && (
        <nav aria-label="Other training options" className="border-t border-white/10 bg-graphite py-16">
          <div className="container-x">
            <p className="eyebrow text-white/45">More ways to train</p>
            <ul className="mt-6 grid gap-px bg-white/10 sm:grid-cols-3">
              {others.map((o) => (
                <li key={o.slug} className="bg-graphite">
                  <Link to={`/training/${o.slug}`} className="group flex items-center justify-between p-6 transition-colors hover:bg-ink">
                    <span className="display text-3xl text-white">{o.title}</span>
                    <ArrowRight size={18} className="text-white/40 transition-transform group-hover:translate-x-1 group-hover:text-signal" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      )}
    </article>
  );
}
