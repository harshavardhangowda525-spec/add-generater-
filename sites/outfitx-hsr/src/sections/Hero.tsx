import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowDownRight } from 'lucide-react';
import { useRef } from 'react';
import { business, images } from '../config/site';
import { DemoTag, EASE, MaskHeadline } from '../components/motion';
import { Wordmark } from '../components/Wordmark';

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const imgY = useTransform(scrollYProgress, [0, 1], ['0%', '18%']);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section id="home" ref={ref} aria-labelledby="hero-title" className="grain relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-ink">
      {/* Background image: mirrored so the athlete sits right and the headline gets the negative space. */}
      <motion.div className="absolute inset-0 -z-10" style={reduce ? undefined : { y: imgY }}>
        <motion.img
          src={images.hero.src}
          alt={images.hero.alt}
          width={images.hero.width}
          height={images.hero.height}
          fetchPriority="high"
          decoding="async"
          className="h-full w-full -scale-x-100 object-cover object-[30%_center] lg:object-center"
          initial={{ opacity: 0, scale: 1.14 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 2.2, ease: EASE, delay: 0.35 }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/30 lg:bg-gradient-to-r lg:from-ink lg:via-ink/70 lg:to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink to-transparent" />
      </motion.div>

      <motion.div style={reduce ? undefined : { opacity: fade }} className="container-x relative z-[2] flex flex-1 flex-col justify-end pb-24 pt-28 sm:pb-28 lg:justify-center lg:pb-20">
        {/* Wordmark reveal */}
        <motion.div
          initial={{ opacity: 0, clipPath: 'inset(0 100% 0 0)' }}
          animate={{ opacity: 1, clipPath: 'inset(0 0% 0 0)' }}
          transition={{ duration: 1, ease: EASE }}
          className="mb-6 flex items-center gap-4 text-xl text-white/80 lg:mb-8"
          aria-hidden
        >
          <Wordmark />
          <span className="h-px w-12 bg-white/40" />
        </motion.div>

        <MaskHeadline
          as="h1"
          id="hero-title"
          animateOnMount
          delay={0.35}
          lines={['Train with', <>Intent<span className="text-signal">.</span></>]}
          className="text-[clamp(4.2rem,min(17vw,19vh),12.5rem)] text-white"
        />

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.95 }}
          className="mt-6 max-w-md text-lg leading-relaxed text-white/75 sm:text-xl"
        >
          Purposeful training. Better movement. Stronger foundations.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE, delay: 1.1 }}
          className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8"
        >
          <a href="#enquire" className="group eyebrow inline-flex items-center justify-center gap-3 bg-white px-7 py-4 text-ink transition-colors duration-300 hover:bg-signal hover:text-white">
            Start your journey
            <ArrowDownRight size={16} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:translate-y-0.5" />
          </a>
          <a href="#approach" className="cta-line eyebrow self-start py-2 text-white sm:self-auto">
            Explore our approach
          </a>
        </motion.div>
      </motion.div>

      {/* Location label + scroll indicator */}
      <div className="container-x absolute inset-x-0 bottom-0 z-[2] flex items-end justify-between pb-6 sm:pb-8">
        <motion.p
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, ease: EASE, delay: 1.3 }}
          className="eyebrow pr-20 leading-relaxed text-white/60 sm:pr-0"
        >
          {business.name} · {business.city}
        </motion.p>
        <motion.a
          href="#approach"
          aria-label="Scroll to our approach"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.8 }}
          className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 text-white/60 hover:text-white sm:bottom-8 sm:flex"
        >
          <span className="eyebrow [writing-mode:vertical-rl]">Scroll</span>
          <span className="relative block h-14 w-px overflow-hidden bg-white/20">
            <motion.span
              className="absolute left-0 top-0 block h-1/2 w-px bg-white"
              animate={reduce ? undefined : { y: ['-100%', '200%'] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            />
          </span>
        </motion.a>
      </div>
      <DemoTag image={images.hero} className="right-4 top-20 sm:right-8 lg:right-14 lg:top-24" />
    </section>
  );
}
