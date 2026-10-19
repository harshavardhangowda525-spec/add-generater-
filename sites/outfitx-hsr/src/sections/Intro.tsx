import { ArrowRight } from 'lucide-react';
import { images } from '../config/site';
import { DrawLine, EditorialImage, MaskHeadline, Reveal, SectionIndex } from '../components/motion';

export function Intro() {
  return (
    <section id="approach" aria-labelledby="intro-title" className="relative bg-paper py-24 text-ink sm:py-32 lg:py-40">
      <div className="container-x grid gap-14 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-7 lg:pr-6">
          <SectionIndex n="01" label="Our approach" tone="dark" />
          <MaskHeadline
            id="intro-title"
            lines={["Don't just", 'go through', <>the motions<span className="text-signal">.</span></>]}
            className="mt-10 text-[clamp(3.4rem,11vw,9rem)]"
          />
          <div className="mt-12 grid gap-10 sm:grid-cols-[auto_1fr] sm:gap-8">
            <DrawLine className="mt-3 hidden w-16 text-ink sm:block" />
            <Reveal>
              <p className="max-w-xl text-lg leading-relaxed text-ink/75 sm:text-xl">
                Every session should have a purpose. Build strength, improve movement, and develop better training habits through a focused approach that puts technique and individual needs at the centre.
              </p>
              <a href="#philosophy" className="cta-line eyebrow mt-10 inline-flex items-center gap-3 py-2 text-ink">
                Discover RK Fitness <ArrowRight size={14} />
              </a>
            </Reveal>
          </div>
        </div>
        <div className="relative lg:col-span-5">
          <EditorialImage image={images.intro} className="aspect-[4/5] w-full lg:mt-24" />
          <span aria-hidden className="display pointer-events-none absolute -left-3 -top-10 text-[7rem] leading-none text-ink/[0.06] sm:text-[10rem] lg:-left-16 lg:top-0">
            X
          </span>
        </div>
      </div>
    </section>
  );
}
