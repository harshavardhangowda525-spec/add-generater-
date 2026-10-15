import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { SiteImage } from '../config/site';
import { EASE } from './motion';

type Props = { items: SiteImage[]; index: number | null; onClose: () => void; onIndex: (i: number) => void };

/** Full-screen image viewer: keyboard arrows, Escape, swipe, and focus is kept inside. */
export function Lightbox({ items, index, onClose, onIndex }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const open = index !== null;
  const go = (d: number) => index !== null && onIndex((index + d + items.length) % items.length);

  useEffect(() => {
    if (!open) return;
    const returnTo = document.activeElement as HTMLElement | null;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      returnTo?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Tab' && dialogRef.current) {
        const els = [...dialogRef.current.querySelectorAll<HTMLElement>('button')];
        const i = els.indexOf(document.activeElement as HTMLElement);
        if (e.shiftKey && i <= 0) {
          e.preventDefault();
          els[els.length - 1].focus();
        } else if (!e.shiftKey && i === els.length - 1) {
          e.preventDefault();
          els[0].focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  const item = index !== null ? items[index] : null;

  return (
    <AnimatePresence>
      {open && item && (
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Image viewer"
          className="fixed inset-0 z-[70] flex flex-col bg-ink/97"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="container-x flex h-16 shrink-0 items-center justify-between text-white/70">
            <span className="eyebrow tabular-nums" aria-live="polite">
              {String(index + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
            </span>
            <button ref={closeRef} type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center hover:text-white" aria-label="Close image viewer">
              <X size={24} />
            </button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6 sm:px-20">
            <AnimatePresence mode="wait" initial={false}>
              <motion.figure
                key={item.src}
                className="flex h-full max-h-full w-full flex-col items-center justify-center"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.45, ease: EASE }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.25}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -60) go(1);
                  else if (info.offset.x > 60) go(-1);
                }}
              >
                <img src={item.src} alt={item.alt} className="max-h-[calc(100%-3rem)] max-w-full select-none object-contain" draggable={false} />
                <figcaption className="mt-4 max-w-2xl text-center text-sm text-white/60">
                  {item.alt}
                  {!item.isRealFacility && <span className="ml-2 text-white/40">· Demonstration image</span>}
                </figcaption>
              </motion.figure>
            </AnimatePresence>
            <button type="button" onClick={() => go(-1)} aria-label="Previous image" className="absolute left-2 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center border border-white/20 text-white transition-colors hover:border-white sm:flex lg:left-6">
              <ChevronLeft size={22} />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Next image" className="absolute right-2 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center border border-white/20 text-white transition-colors hover:border-white sm:flex lg:right-6">
              <ChevronRight size={22} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
