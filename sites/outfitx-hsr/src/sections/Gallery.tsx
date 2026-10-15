import { motion } from 'framer-motion';
import { Maximize2 } from 'lucide-react';
import { useState } from 'react';
import { gallery } from '../config/site';
import { Lightbox } from '../components/Lightbox';
import { DemoTag, EASE, MaskHeadline, PendingBadge, Reveal, SectionIndex } from '../components/motion';

/** Desktop placement for each slot; the grid is asymmetric by design. */
const DESKTOP_SLOTS = [
  'lg:col-span-8 lg:row-span-2',
  'lg:col-span-4 lg:row-span-2',
  'lg:col-span-3 lg:row-span-2',
  'lg:col-span-5 lg:row-span-2',
  'lg:col-span-4 lg:row-span-2',
  'lg:col-span-12 lg:row-span-2',
];

export function Gallery() {
  const [index, setIndex] = useState<number | null>(null);
  const items = gallery.map((g) => g.image);
  const allDemo = items.every((i) => !i.isRealFacility);

  return (
    <section id="gallery" aria-labelledby="gallery-title" className="overflow-hidden bg-graphite py-24 sm:py-32 lg:py-40">
      <div className="container-x">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <SectionIndex n="05" label="The space" />
            <MaskHeadline id="gallery-title" lines={['Inside', <>OUTFIT X<span className="text-signal">.</span></>]} className="mt-10 text-[clamp(3.4rem,10vw,8rem)] text-white" />
          </div>
          <Reveal className="max-w-sm space-y-4">
            {allDemo && <PendingBadge>Demonstration images · real photos to follow</PendingBadge>}
            <p className="text-white/60">Tap any image to view it full screen.</p>
          </Reveal>
        </div>
      </div>

      {/* Mobile: swipeable strip. Desktop: asymmetric editorial grid. */}
      <ul
        className="mt-14 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 [scrollbar-width:none] sm:px-8 lg:mx-auto lg:max-w-[1440px] lg:mt-20 lg:grid lg:auto-rows-[15vw] lg:grid-cols-12 lg:gap-4 lg:overflow-visible lg:px-14 lg:pb-0 2xl:auto-rows-[13rem] [&::-webkit-scrollbar]:hidden"
        aria-label="Gallery"
      >
        {gallery.map((g, i) => (
          <motion.li
            key={g.image.src + i}
            className={`relative w-[78vw] shrink-0 snap-center sm:w-[46vw] lg:w-auto ${DESKTOP_SLOTS[i % DESKTOP_SLOTS.length]}`}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '0px 0px -10% 0px' }}
            transition={{ duration: 1, ease: EASE, delay: (i % 3) * 0.08 }}
          >
            <button
              type="button"
              onClick={() => setIndex(i)}
              className="group relative block aspect-[4/5] h-full w-full overflow-hidden bg-ink lg:aspect-auto"
              aria-label={`View full screen: ${g.image.alt}`}
            >
              <img
                src={g.image.src}
                alt=""
                loading="lazy"
                decoding="async"
                width={g.image.width}
                height={g.image.height}
                className="h-full w-full object-cover transition-[transform,filter] duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06] lg:grayscale-[35%] lg:group-hover:grayscale-0"
              />
              <span className="absolute inset-0 bg-ink/0 transition-colors duration-500 group-hover:bg-ink/20" />
              <span className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center bg-ink/60 text-white opacity-100 backdrop-blur-sm transition-opacity duration-300 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-visible:opacity-100">
                <Maximize2 size={16} />
              </span>
              <DemoTag image={g.image} />
            </button>
          </motion.li>
        ))}
      </ul>

      <Lightbox items={items} index={index} onClose={() => setIndex(null)} onIndex={setIndex} />
    </section>
  );
}
