import { Link } from 'react-router-dom';
import { business } from '../config/site';
import { telLink, whatsappLink } from '../lib/contact';
import { PendingBadge } from '../components/motion';
import { usePageTitle } from '../components/ScrollManager';
import { PROPOSAL_MODE } from '../config/site';

const sections: { h: string; body: React.ReactNode }[] = [
  {
    h: 'What we collect',
    body: (
      <p>
        When you send an enquiry we collect your name, phone number and the details you choose to share: email address, fitness goal, training experience,
        preferred contact method and your message. We also record the page you sent it from and when you sent it. We do not use advertising or analytics cookies on this website.
      </p>
    ),
  },
  {
    h: 'Why we collect it',
    body: <p>Only to reply to your enquiry and talk to you about training and membership at {business.name}. We do not sell your details or share them for marketing.</p>,
  },
  {
    h: 'How it is stored',
    body: (
      <p>
        Enquiries are stored in a secured database hosted by our service provider (Supabase). The website can add new enquiries but cannot read them back;
        only authorised {business.name} staff can view them. Staff may receive an email notification containing your enquiry so they can respond promptly.
      </p>
    ),
  },
  {
    h: 'How long we keep it',
    body: <p>We keep enquiry details only for as long as needed to respond and follow up, and delete them when they are no longer required, or sooner if you ask.</p>,
  },
  {
    h: 'Your choices',
    body: (
      <p>
        You can ask us to show, correct or delete the information we hold about you, or to stop contacting you, at any time. Call us on{' '}
        <a href={telLink} className="underline underline-offset-2">{business.phoneDisplay}</a> or{' '}
        <a href={whatsappLink('Hi OUTFIT X HSR team, I have a question about my enquiry data.')} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">message us on WhatsApp</a>.
      </p>
    ),
  },
  {
    h: 'Third-party services',
    body: (
      <p>
        The map on our website is provided by Google Maps, and the WhatsApp button opens WhatsApp. Those services have their own privacy policies. Fonts are loaded from Google Fonts.
      </p>
    ),
  },
];

export function Privacy() {
  usePageTitle('Privacy policy | OUTFIT X HSR', `How ${business.name} handles the information you share through enquiries.`);
  return (
    <article className="bg-paper pb-24 pt-32 text-ink lg:pt-40">
      <div className="container-x max-w-3xl">
        <p className="eyebrow text-ink/50">Privacy & enquiry data</p>
        <h1 className="display mt-6 text-[clamp(3.2rem,10vw,6.5rem)]">Privacy policy.</h1>
        {PROPOSAL_MODE && <PendingBadge className="mt-6">Draft · to be reviewed by the owner before launch</PendingBadge>}
        <div className="mt-14 space-y-12 text-lg leading-relaxed text-ink/75">
          {sections.map((s) => (
            <section key={s.h}>
              <h2 className="display text-3xl text-ink">{s.h}</h2>
              <div className="mt-4">{s.body}</div>
            </section>
          ))}
          <section>
            <h2 className="display text-3xl text-ink">Contact</h2>
            <address className="mt-4 not-italic">
              {business.name}
              {business.address.lines.map((l) => <span key={l} className="block">{l}</span>)}
            </address>
          </section>
        </div>
        <Link to="/" className="cta-line eyebrow mt-16 inline-block py-1">Back to home</Link>
      </div>
    </article>
  );
}
