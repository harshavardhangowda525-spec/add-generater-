import { Link, useLocation } from 'react-router-dom';
import { agency, business, navLinks } from '../config/site';
import { directionsLink, reviewsLink, telLink } from '../lib/contact';
import { Wordmark } from './Wordmark';

export function Footer() {
  const onHome = useLocation().pathname === '/';
  const year = new Date().getFullYear();
  const linkCls = 'text-white/60 transition-colors hover:text-white';

  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-ink pt-20 sm:pt-28">
      <div className="container-x grid gap-14 pb-16 sm:grid-cols-2 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Link to="/" className="text-4xl text-white" aria-label={`${business.name} — home`}>
            <Wordmark />
          </Link>
          <p className="mt-6 max-w-xs leading-relaxed text-white/55">Purposeful training in HSR Layout, Bengaluru. Technique first, strength built to last.</p>
        </div>

        <nav aria-label="Footer" className="lg:col-span-2">
          <h2 className="eyebrow text-white/40">Explore</h2>
          <ul className="mt-5 space-y-3">
            {navLinks.map((l) => (
              <li key={l.id}>
                {onHome ? <a href={`#${l.id}`} className={linkCls}>{l.label}</a> : <Link to={`/#${l.id}`} className={linkCls}>{l.label}</Link>}
              </li>
            ))}
            <li>{onHome ? <a href="#enquire" className={linkCls}>Enquire</a> : <Link to="/#enquire" className={linkCls}>Enquire</Link>}</li>
          </ul>
        </nav>

        <div className="lg:col-span-3">
          <h2 className="eyebrow text-white/40">Visit</h2>
          <address className="mt-5 not-italic leading-relaxed text-white/60">
            {business.address.lines.map((l) => <span key={l} className="block">{l}</span>)}
          </address>
          <a href={directionsLink} target="_blank" rel="noopener noreferrer" className="cta-line mt-4 inline-block py-1 text-sm text-white">
            Get directions<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>

        <div className="lg:col-span-3">
          <h2 className="eyebrow text-white/40">Contact</h2>
          <ul className="mt-5 space-y-3">
            <li><a href={telLink} className={linkCls}>{business.phoneDisplay}</a></li>
            <li><a href={business.existingWebsite} target="_blank" rel="noopener noreferrer" className={linkCls}>{business.existingWebsite.replace(/^https?:\/\//, '')}</a></li>
            <li><a href={reviewsLink} target="_blank" rel="noopener noreferrer" className={linkCls}>Google reviews</a></li>
            <li><Link to="/privacy" className={linkCls}>Privacy policy</Link></li>
          </ul>
        </div>
      </div>

      <div className="container-x flex flex-col gap-3 border-t border-white/10 py-7 pb-24 text-xs text-white/40 sm:flex-row sm:justify-between sm:pb-7">
        <p>© {year} {business.name}. All rights reserved.</p>
        <p>Website by {agency.name}</p>
      </div>

      <p aria-hidden className="display pointer-events-none -mb-[0.18em] select-none whitespace-nowrap text-center text-[23vw] leading-none text-white/[0.04]">
        RK Fitness
      </p>
    </footer>
  );
}
