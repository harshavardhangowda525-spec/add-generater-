import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useRef, type ReactNode } from 'react';
import type { SiteImage } from '../config/site';

export const EASE = [0.16, 1, 0.3, 1] as const;
const VIEWPORT = { once: true, margin: '0px 0px -12% 0px' } as const;

/** Fades and lifts content as it enters the viewport. */
export function Reveal({ children, delay = 0, className, y = 28 }: { children: ReactNode; delay?: number; className?: string; y?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT}
      transition={{ duration: 0.9, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Masked, staggered headline reveal. Each line slides up from behind a mask.
 * The full text stays in the DOM as one heading for screen readers and SEO.
 */
export function MaskHeadline({
  lines,
  as: Tag = 'h2',
  className = '',
  lineClassName = '',
  delay = 0,
  animateOnMount = false,
  id,
}: {
  lines: ReactNode[];
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
  lineClassName?: string;
  delay?: number;
  animateOnMount?: boolean;
  id?: string;
}) {
  // The trigger lives on the heading: each line starts fully clipped by its mask,
  // so an IntersectionObserver on the line itself would never report it visible.
  const MotionTag = motion[Tag];
  const trigger = animateOnMount ? { animate: 'show' } : { whileInView: 'show', viewport: VIEWPORT };
  return (
    <MotionTag id={id} className={`display ${className}`} initial="hidden" {...trigger}>
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.06em]">
          <motion.span
            className={`block ${lineClassName}`}
            variants={{ hidden: { y: '105%' }, show: { y: '0%' } }}
            transition={{ duration: 1, ease: EASE, delay: delay + i * 0.11 }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </MotionTag>
  );
}

/** A horizontal rule that draws itself from the left. */
export function DrawLine({ className = '', delay = 0 }: { className?: string; delay?: number }) {
  return (
    <motion.span
      aria-hidden
      className={`block h-px origin-left bg-current ${className}`}
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={VIEWPORT}
      transition={{ duration: 1.4, ease: EASE, delay }}
    />
  );
}

/** Label shown on AI-generated / stock imagery so it is never mistaken for the real facility. */
export function DemoTag({ image, className = '' }: { image: SiteImage; className?: string }) {
  if (image.isRealFacility) return null;
  return (
    <span
      className={`pointer-events-none absolute z-[2] bg-ink/70 px-2 py-1 text-[0.6rem] font-medium uppercase tracking-[0.18em] text-white/70 backdrop-blur-sm ${className || 'bottom-3 left-3'}`}
    >
      Demonstration image
    </span>
  );
}

/**
 * Image that reveals with a clip-path wipe, then drifts with subtle parallax.
 * Lazy-loaded unless `priority` is set.
 */
export function EditorialImage({
  image,
  className = '',
  imgClassName = '',
  priority = false,
  parallax = 0.08,
  tagClassName,
}: {
  image: SiteImage;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  parallax?: number;
  tagClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [`-${parallax * 100}%`, `${parallax * 100}%`]);

  return (
    <motion.div
      ref={ref}
      className={`relative overflow-hidden bg-graphite ${className}`}
      initial={{ clipPath: 'inset(12% 0% 12% 0%)' }}
      whileInView={{ clipPath: 'inset(0% 0% 0% 0%)' }}
      viewport={VIEWPORT}
      transition={{ duration: 1.3, ease: EASE }}
    >
      <motion.img
        src={image.src}
        alt={image.alt}
        width={image.width}
        height={image.height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        style={reduce ? undefined : { y, scale: 1 + parallax * 2 }}
        className={`h-full w-full object-cover ${imgClassName}`}
      />
      <DemoTag image={image} className={tagClassName} />
    </motion.div>
  );
}

/** Small section index: "01 — Approach" with a drawn rule. */
export function SectionIndex({ n, label, tone = 'light' }: { n: string; label: string; tone?: 'light' | 'dark' }) {
  return (
    <div className={`flex items-center gap-4 ${tone === 'light' ? 'text-white/60' : 'text-ink/55'}`}>
      <span className="eyebrow tabular-nums">{n}</span>
      <DrawLine className="w-10 sm:w-16" />
      <span className="eyebrow">{label}</span>
    </div>
  );
}

export function PendingBadge({ children = 'Awaiting owner confirmation', className = '' }: { children?: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 border border-signal/60 px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-signal ${className}`}>
      <span aria-hidden className="h-1.5 w-1.5 bg-signal" />
      {children}
    </span>
  );
}
