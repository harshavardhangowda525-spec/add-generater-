import { ArrowUpRight, Clock, Globe, MapPin, Navigation, Phone } from 'lucide-react';
import { business, hours, PROPOSAL_MODE } from '../config/site';
import { directionsLink, mapEmbedSrc, telLink } from '../lib/contact';
import { MaskHeadline, PendingBadge, Reveal, SectionIndex } from '../components/motion';

export function Location() {
  const site = business.existingWebsite.replace(/^https?:\/\//, '');
  return (
    <section id="location" aria-labelledby="location-title" className="bg-paper py-24 text-ink sm:py-32 lg:py-40">
      <div className="container-x">
        <SectionIndex n="08" label="Location" tone="dark" />
        <MaskHeadline id="location-title" lines={['Find your next', <>training space<span className="text-signal">.</span></>]} className="mt-10 text-[clamp(3rem,9vw,7.5rem)]" />

        <div className="mt-16 grid gap-12 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <dl className="divide-y divide-ink/15 border-y border-ink/15">
              <div className="flex gap-5 py-6">
                <dt className="pt-1"><MapPin size={18} aria-label="Address" /></dt>
                <dd>
                  <address className="not-italic text-lg leading-relaxed">
                    {business.address.lines.map((l) => <span key={l} className="block">{l}</span>)}
                  </address>
                </dd>
              </div>
              <div className="flex gap-5 py-6">
                <dt className="pt-1"><Phone size={18} aria-label="Phone" /></dt>
                <dd><a href={telLink} className="cta-line text-lg">{business.phoneDisplay}</a></dd>
              </div>
              <div className="flex gap-5 py-6">
                <dt className="pt-1"><Globe size={18} aria-label="Website" /></dt>
                <dd><a href={business.existingWebsite} target="_blank" rel="noopener noreferrer" className="cta-line text-lg">{site}</a></dd>
              </div>
              <div className="flex gap-5 py-6">
                <dt className="pt-1"><Clock size={18} aria-label="Opening hours" /></dt>
                <dd className="text-lg">
                  {hours.confirmed && hours.weekly.length > 0 ? (
                    <table className="text-base">
                      <tbody>
                        {hours.weekly.map((h) => (
                          <tr key={h.day}><th scope="row" className="pr-6 text-left font-medium">{h.day}</th><td>{h.hours}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <>
                      <p>Please call to confirm current opening hours.</p>
                      {PROPOSAL_MODE && (
                        <div className="mt-3 space-y-2">
                          <p className="text-base text-ink/60">{hours.listingNote}</p>
                          <PendingBadge>Weekly schedule to be confirmed</PendingBadge>
                        </div>
                      )}
                    </>
                  )}
                </dd>
              </div>
            </dl>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <a href={directionsLink} target="_blank" rel="noopener noreferrer" className="group eyebrow inline-flex items-center justify-center gap-2 bg-ink px-7 py-4 text-white transition-colors hover:bg-signal">
                <Navigation size={14} /> Get directions
                <span className="sr-only">(opens Google Maps in a new tab)</span>
              </a>
              <a href={telLink} className="eyebrow inline-flex items-center justify-center gap-2 border border-ink/30 px-7 py-4 transition-colors hover:border-ink">
                <Phone size={14} /> Call now
              </a>
            </div>
          </Reveal>

          <Reveal className="lg:col-span-7" delay={0.1}>
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-ink/10 lg:aspect-auto lg:h-full lg:min-h-[480px]">
              <iframe
                title={`Map showing ${business.name}, ${business.address.street}`}
                src={mapEmbedSrc}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="absolute inset-0 h-full w-full border-0 grayscale-[85%] contrast-[1.05] transition-[filter] duration-700 hover:grayscale-0"
                allowFullScreen
              />
            </div>
            <a href={directionsLink} target="_blank" rel="noopener noreferrer" className="cta-line eyebrow mt-5 inline-flex items-center gap-2 py-1">
              Open in Google Maps <ArrowUpRight size={13} />
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
