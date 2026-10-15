import { ArrowUpRight, MessageCircle, Navigation, Phone, Globe } from 'lucide-react';
import { business } from '../config/site';
import { directionsLink, telLink, whatsappLink } from '../lib/contact';
import { MaskHeadline, Reveal, SectionIndex } from '../components/motion';

const actions = [
  { label: 'Call', detail: business.phoneDisplay, href: telLink, Icon: Phone, external: false },
  { label: 'WhatsApp', detail: 'Message the team', href: whatsappLink(), Icon: MessageCircle, external: true },
  { label: 'Directions', detail: 'HSR Layout, Bengaluru', href: directionsLink, Icon: Navigation, external: true },
  { label: 'Website', detail: business.existingWebsite.replace(/^https?:\/\//, ''), href: business.existingWebsite, Icon: Globe, external: true },
];

export function Contact() {
  return (
    <section id="contact" aria-labelledby="contact-title" className="bg-ink py-24 sm:py-32">
      <div className="container-x">
        <SectionIndex n="09" label="Contact" />
        <MaskHeadline id="contact-title" lines={[<>Talk to us<span className="text-signal">.</span></>]} className="mt-10 text-[clamp(3rem,9vw,7rem)] text-white" />
        <ul className="mt-14 grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
          {actions.map(({ label, detail, href, Icon, external }, i) => (
            <li key={label} className="bg-ink">
              <Reveal delay={i * 0.06} y={16} className="h-full">
                <a
                  href={href}
                  {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className="group flex h-full min-h-44 flex-col justify-between p-7 transition-colors duration-500 hover:bg-graphite"
                >
                  <span className="flex items-center justify-between text-white/50 group-hover:text-signal">
                    <Icon size={22} />
                    <ArrowUpRight size={18} className="transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1" />
                  </span>
                  <span>
                    <span className="display block text-4xl text-white">{label}</span>
                    <span className="mt-2 block text-white/55">{detail}</span>
                    {external && <span className="sr-only">(opens in a new tab)</span>}
                  </span>
                </a>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
