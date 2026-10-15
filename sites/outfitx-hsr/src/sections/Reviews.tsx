import { ArrowUpRight, Star } from 'lucide-react';
import { reviews } from '../config/site';
import { reviewsLink } from '../lib/contact';
import { MaskHeadline, Reveal, SectionIndex } from '../components/motion';

function Stars({ rating }: { rating: number }) {
  return (
    <span className="relative inline-flex" role="img" aria-label={`${rating} out of 5 stars`}>
      <span className="flex gap-1 text-white/15">
        {Array.from({ length: 5 }, (_, i) => <Star key={i} size={22} fill="currentColor" strokeWidth={0} />)}
      </span>
      <span className="absolute inset-0 flex gap-1 overflow-hidden text-signal" style={{ width: `${(rating / 5) * 100}%` }}>
        {Array.from({ length: 5 }, (_, i) => <Star key={i} size={22} fill="currentColor" strokeWidth={0} className="shrink-0" />)}
      </span>
    </span>
  );
}

export function Reviews() {
  const excerpts = reviews.excerpts.filter((e) => e.confirmed);
  return (
    <section id="reviews" aria-labelledby="reviews-title" className="bg-ink py-24 sm:py-32 lg:py-40">
      <div className="container-x grid gap-16 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-5">
          <SectionIndex n="06" label="Reviews" />
          <h2 id="reviews-title" className="sr-only">Reviews and ratings</h2>
          <Reveal className="mt-12">
            <p className="display flex items-baseline gap-3 text-white">
              <span className="text-[clamp(7rem,22vw,13rem)] leading-none">{reviews.rating.toFixed(1)}</span>
              <span className="text-4xl text-white/40">/ 5</span>
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <Stars rating={reviews.rating} />
              <span className="text-white/65">
                {reviews.count} {reviews.source} reviews
              </span>
            </div>
            <a href={reviewsLink} target="_blank" rel="noopener noreferrer" className="group eyebrow mt-12 inline-flex items-center gap-2 border border-white/30 px-6 py-4 text-white transition-colors hover:border-white hover:bg-white hover:text-ink">
              Explore Google reviews <ArrowUpRight size={14} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </Reveal>
        </div>

        <div className="lg:col-span-6 lg:col-start-7">
          <MaskHeadline lines={['What members', <>talk about<span className="text-signal">.</span></>]} as="h3" className="text-[clamp(2.6rem,6vw,4.8rem)] text-white" />
          <p className="mt-5 text-sm text-white/45">Recurring themes summarised from {reviews.source} reviews. These are not direct quotes.</p>
          <ul className="mt-10 grid gap-px bg-white/10 sm:grid-cols-2">
            {reviews.themes.map((t, i) => (
              <li key={t.title} className="bg-ink">
                <Reveal delay={(i % 2) * 0.06} y={16} className="h-full p-6 sm:p-7">
                  <span className="display text-lg text-signal">{String(i + 1).padStart(2, '0')}</span>
                  <h4 className="mt-3 text-lg font-semibold text-white">{t.title}</h4>
                  <p className="mt-1.5 text-white/55">{t.note}</p>
                </Reveal>
              </li>
            ))}
          </ul>
          {excerpts.length > 0 && (
            <ul className="mt-14 space-y-10">
              {excerpts.map((e) => (
                <li key={e.text}>
                  <blockquote className="border-l-2 border-signal pl-6">
                    <p className="text-xl leading-relaxed text-white/85">“{e.text}”</p>
                    <footer className="eyebrow mt-4 text-white/50">— {e.author}, {reviews.source} review</footer>
                  </blockquote>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
