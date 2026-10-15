import { images } from '../config/site';
import { DrawLine, EditorialImage, MaskHeadline, Reveal, SectionIndex } from '../components/motion';

function BigNumber({ n, className = '' }: { n: string; className?: string }) {
  return (
    <span aria-hidden className={`display block select-none leading-none text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.28)] ${className}`}>
      {n}
    </span>
  );
}

export function Philosophy() {
  return (
    <section id="philosophy" aria-labelledby="philosophy-title" className="relative overflow-hidden bg-ink py-24 sm:py-32 lg:py-40">
      <div className="container-x">
        <SectionIndex n="02" label="Training philosophy" />
        <MaskHeadline
          id="philosophy-title"
          lines={['Form.', 'Movement.', <>Strength<span className="text-signal">.</span></>]}
          className="mt-10 text-[clamp(3.2rem,10vw,8rem)] text-white"
        />
      </div>

      {/* 01 — Technique first: tall image left, oversized numeral and copy right */}
      <article aria-labelledby="p1" className="container-x mt-24 grid items-end gap-10 sm:mt-32 lg:grid-cols-12 lg:gap-12">
        <EditorialImage image={images.form} className="aspect-[4/5] lg:col-span-5" />
        <div className="lg:col-span-6 lg:col-start-7 lg:pb-10">
          <BigNumber n="01" className="text-[8rem] sm:text-[11rem]" />
          <p className="eyebrow mt-2 text-signal">Technique first</p>
          <MaskHeadline as="h3" id="p1" lines={['Form matters.']} className="mt-4 text-[clamp(2.8rem,7vw,5.5rem)] text-white" />
          <Reveal>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-white/70">
              Build your training around sound technique, controlled movement, and attention to the details that make every repetition count.
            </p>
          </Reveal>
        </div>
      </article>

      {/* 02 — Move with purpose: full-bleed landscape with an overlapping text panel */}
      <article aria-labelledby="p2" className="relative mt-28 sm:mt-40">
        <div className="container-x">
          <EditorialImage image={images.mobility} className="aspect-[4/3] w-full sm:aspect-[16/8]" parallax={0.06} tagClassName="right-3 top-3" />
        </div>
        <div className="container-x relative -mt-20 sm:-mt-32">
          <div className="ml-auto max-w-xl bg-graphite p-8 sm:p-12 lg:mr-10">
            <div className="flex items-start justify-between gap-6">
              <p className="eyebrow text-signal">Move with purpose</p>
              <BigNumber n="02" className="-mt-2 text-[4.5rem]" />
            </div>
            <MaskHeadline as="h3" id="p2" lines={['Better movement.', 'Better training.']} className="mt-4 text-[clamp(2.4rem,5.5vw,4rem)] text-white" />
            <DrawLine className="my-7 w-14 text-white/40" />
            <Reveal>
              <p className="text-lg leading-relaxed text-white/70">Give movement quality, mobility, and stability a place in your training approach.</p>
            </Reveal>
          </div>
        </div>
      </article>

      {/* 03 — Build real strength: copy left, offset portrait right with a red rule */}
      <article aria-labelledby="p3" className="container-x mt-28 grid items-center gap-12 sm:mt-40 lg:grid-cols-12">
        <div className="order-2 lg:order-1 lg:col-span-6">
          <BigNumber n="03" className="text-[8rem] sm:text-[11rem]" />
          <p className="eyebrow mt-2 text-signal">Build real strength</p>
          <MaskHeadline as="h3" id="p3" lines={['Progress', 'with purpose.']} className="mt-4 text-[clamp(2.8rem,7vw,5.5rem)] text-white" />
          <Reveal>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-white/70">
              Approach strength training with consistency, thoughtful progression, and a focus on your individual goals.
            </p>
          </Reveal>
        </div>
        <div className="relative order-1 lg:order-2 lg:col-span-5 lg:col-start-8">
          <span aria-hidden className="absolute -left-4 top-10 bottom-10 w-[3px] bg-signal sm:-left-6" />
          <EditorialImage image={images.strength} className="aspect-[4/5]" />
        </div>
      </article>
    </section>
  );
}
