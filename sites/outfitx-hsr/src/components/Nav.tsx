import { AnimatePresence, motion } from 'framer-motion';
import { Menu, Phone, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { business, navLinks } from '../config/site';
import { telLink } from '../lib/contact';
import { useActiveSection, useScrolled } from '../hooks/useActiveSection';
import { EASE } from './motion';
import { Wordmark } from './Wordmark';

const SECTION_IDS = navLinks.map((l) => l.id);

type AnchorProps = { id: string; label: string; className: string; onHome: boolean; active: string; onClick?: () => void };

/** In-page anchor on the home page; router link back to the section elsewhere. */
function NavAnchor({ id, label, className, onHome, active, onClick }: AnchorProps) {
  return onHome ? (
    <a href={`#${id}`} className={className} onClick={onClick} aria-current={active === id ? 'location' : undefined}>
      {label}
    </a>
  ) : (
    <Link to={`/#${id}`} className={className} onClick={onClick}>
      {label}
    </Link>
  );
}

export function Nav() {
  const { pathname } = useLocation();
  const onHome = pathname === '/';
  const scrolled = useScrolled();
  const active = useActiveSection(SECTION_IDS, onHome);
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const solid = scrolled || !onHome || open;

  // Close the menu on route change.
  useEffect(() => setOpen(false), [pathname]);

  // Lock page scroll, close on Escape, keep focus inside the open menu.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const first = panelRef.current?.querySelector<HTMLElement>('a,button');
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
      if (e.key === 'Tab' && panelRef.current) {
        const items = [toggleRef.current, ...panelRef.current.querySelectorAll<HTMLElement>('a,button')].filter(Boolean) as HTMLElement[];
        const i = items.indexOf(document.activeElement as HTMLElement);
        if (e.shiftKey && i <= 0) {
          e.preventDefault();
          items[items.length - 1].focus();
        } else if (!e.shiftKey && i === items.length - 1) {
          e.preventDefault();
          items[0].focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500 ${
        solid ? 'border-b border-white/10 bg-ink/90 backdrop-blur-md' : 'border-b border-transparent bg-transparent'
      }`}
    >
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:bg-white focus:px-4 focus:py-2 focus:text-ink">
        Skip to content
      </a>
      <nav aria-label="Main" className="container-x flex h-16 items-center justify-between lg:h-20">
        <Link to="/" aria-label={`${business.name} — home`} className="text-[1.65rem] text-white lg:text-[1.9rem]">
          <Wordmark />
        </Link>

        <ul className="hidden items-center gap-9 lg:flex">
          {navLinks.map((l) => (
            <li key={l.id} className="relative">
              <NavAnchor onHome={onHome} active={active} id={l.id} label={l.label} className={`eyebrow py-2 transition-colors ${onHome && active === l.id ? 'text-white' : 'text-white/55 hover:text-white'}`} />
              {onHome && active === l.id && (
                <motion.span layoutId="nav-indicator" className="absolute -bottom-1 left-0 h-[2px] w-full bg-signal" transition={{ duration: 0.5, ease: EASE }} />
              )}
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <a href={telLink} className="hidden h-11 w-11 items-center justify-center text-white/70 transition-colors hover:text-white sm:flex lg:hidden" aria-label={`Call ${business.phoneDisplay}`}>
            <Phone size={18} />
          </a>
          <NavAnchor onHome={onHome} active={active}
            id="enquire"
            label="Enquire now"
            className="eyebrow hidden bg-white px-5 py-3 text-ink transition-colors hover:bg-signal hover:text-white sm:inline-block"
          />
          <button
            ref={toggleRef}
            type="button"
            className="flex h-11 w-11 items-center justify-center text-white lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>
    </header>

      {/* Rendered outside <header>: its backdrop-filter would otherwise trap this fixed panel. */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="fixed inset-x-0 bottom-0 top-16 z-[49] overflow-y-auto bg-ink lg:hidden"
            initial={{ clipPath: 'inset(0 0 100% 0)' }}
            animate={{ clipPath: 'inset(0 0 0% 0)' }}
            exit={{ clipPath: 'inset(0 0 100% 0)' }}
            transition={{ duration: 0.55, ease: EASE }}
          >
            <div className="container-x flex min-h-full flex-col justify-between py-10">
              <ul className="space-y-1">
                {navLinks.map((l, i) => (
                  <motion.li key={l.id} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 + i * 0.05, duration: 0.6, ease: EASE }}>
                    <NavAnchor onHome={onHome} active={active}
                      id={l.id}
                      label={l.label}
                      onClick={() => setOpen(false)}
                      className={`display flex items-baseline gap-4 py-2 text-[3.2rem] ${onHome && active === l.id ? 'text-white' : 'text-white/45'}`}
                    />
                  </motion.li>
                ))}
              </ul>
              <div className="mt-10 space-y-4 border-t border-white/10 pt-8">
                <NavAnchor onHome={onHome} active={active} id="enquire" label="Enquire now" onClick={() => setOpen(false)} className="eyebrow block bg-white px-5 py-4 text-center text-ink" />
                <a href={telLink} className="eyebrow flex items-center justify-center gap-2 border border-white/20 px-5 py-4 text-white">
                  <Phone size={14} /> {business.phoneDisplay}
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
