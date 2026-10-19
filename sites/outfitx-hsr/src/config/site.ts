/**
 * RK Fitness Center-Gym — central site configuration.
 *
 * Everything the gym owner may want to change lives here: contact details,
 * hours, training options, coaches, gallery images and review figures.
 *
 * Any item with `confirmed: false` is NOT shown on the public site. It only
 * appears (clearly labelled "Awaiting owner confirmation") when the site is
 * built with VITE_PROPOSAL_MODE=true for the demo shown to the owner.
 * Once the owner confirms an item, set `confirmed: true`.
 */

export const PROPOSAL_MODE = import.meta.env.VITE_PROPOSAL_MODE === 'true';

/** Show an item publicly, or in proposal mode with a confirmation label. */
export function isVisible(item: { confirmed: boolean }): boolean {
  return item.confirmed || PROPOSAL_MODE;
}

// ── Business ────────────────────────────────────────────────────────

export const business = {
  name: 'RK Fitness Center-Gym',
  wordmark: 'RK Fitness',
  locality: 'HSR Layout',
  city: 'Bengaluru',
  category: 'Gym',
  /** Displayed format. */
  phoneDisplay: '+91 76248 86713',
  /** E.164, used for tel: links. */
  phoneE164: '+917624886713',
  /** Digits only, used for wa.me links. */
  whatsappDigits: '917624886713',
  whatsappMessage:
    "Hi RK Fitness Center-Gym team! I'm interested in learning more about your training options and membership. Could you please share the details?",
  existingWebsite: 'https://theoutfitx.com',
  address: {
    lines: ['4th Floor, 1791, 19th Main Road', 'Vanganahalli, 1st Sector, HSR Layout', 'Bengaluru, Karnataka 560102'],
    street: '4th Floor, 1791, 19th Main Road, Vanganahalli, 1st Sector, HSR Layout',
    locality: 'Bengaluru',
    region: 'Karnataka',
    postalCode: '560102',
    country: 'IN',
  },
  /** Exact address used as the map / directions destination (address only, so Maps resolves it reliably). */
  mapQuery:
    '4th Floor, 1791, 19th Main Road, Vanganahalli, 1st Sector, HSR Layout, Bengaluru, Karnataka 560102',
} as const;

// ── Reviews ─────────────────────────────────────────────────────────

export const reviews = {
  /** Supplied Google rating and count. Update these as they change. */
  rating: 4.9,
  count: 30,
  source: 'Google',
  /**
   * Verified Google Business Profile / reviews URL. Until the owner supplies
   * it, the CTA opens a Google Maps search for the exact business listing.
   */
  googleReviewsUrl: null as string | null,
  /** Themes taken from the supplied reviews. These are summaries, not quotes. */
  themes: [
    { title: 'Serious, focused training', note: 'Sessions with intent, not just reps.' },
    { title: 'Attention to form', note: 'Technique and exercise form are watched closely.' },
    { title: 'Passionate, patient coaching', note: 'Coaches who take time to explain.' },
    { title: 'Personalised workouts', note: 'Training built around individual needs.' },
    { title: 'Strength training', note: 'A strong focus on building real strength.' },
    { title: 'Mobility and stability', note: 'Movement quality is part of the work.' },
  ],
  /**
   * Verbatim review excerpts. Only add text copied exactly from a public
   * review, with the reviewer's name as shown on Google. Never rewrite.
   */
  excerpts: [] as { text: string; author: string; confirmed: boolean }[],
};

// ── Opening hours ───────────────────────────────────────────────────

export type DayHours = { day: string; hours: string };

export const hours = {
  /** Set to true once the owner confirms the complete weekly schedule. */
  confirmed: false,
  weekly: [] as DayHours[],
  /** From the supplied listing; not a full schedule. Proposal mode only. */
  listingNote: 'The listing shows a closing time of 8:45 PM.',
};

// ── Images ──────────────────────────────────────────────────────────

export type SiteImage = {
  src: string;
  alt: string;
  /** true = an actual photograph of RK Fitness supplied by the owner. */
  isRealFacility: boolean;
  width: number;
  height: number;
};

/** Prefixes a public/ path with the deploy base, so images work under a subpath (e.g. GitHub Pages). */
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;

const demo = (src: string, alt: string, width: number, height: number): SiteImage => ({
  src: asset(src),
  alt,
  isRealFacility: false,
  width,
  height,
});

/**
 * All imagery used on the site. These are AI-generated demonstration images,
 * NOT photographs of RK Fitness. Replace each with the owner's real photos and
 * set isRealFacility: true so the "Demonstration image" label disappears.
 */
export const images = {
  hero: demo('/images/hero-deadlift.webp', 'Athlete holding a loaded barbell at the top of a deadlift in a dark gym, lit from the side', 1024, 576),
  intro: demo('/images/intro-chalk.webp', 'Chalked hands gripping a knurled barbell in a cloud of chalk dust', 768, 1024),
  form: demo('/images/form-squat.webp', 'Woman holding the bottom of a barbell back squat under a single overhead light', 768, 1024),
  mobility: demo('/images/mobility.webp', 'Man performing a controlled lunge mobility drill with arms extended', 1024, 768),
  strength: demo('/images/strength-press.webp', 'Man pressing a heavy dumbbell overhead in a dark gym', 768, 1024),
  coaching: demo('/images/coaching.webp', 'Coach standing beside a client performing a kettlebell goblet squat', 1024, 1024),
  rack: demo('/images/gallery-rack.webp', 'Rows of squat racks and loaded barbells under linear ceiling lights', 1024, 576),
  plates: demo('/images/gallery-plates.webp', 'Close-up of black bumper plates stacked on a rack', 768, 1024),
  kettlebells: demo('/images/gallery-kettlebell.webp', 'A line of kettlebells on a rubber gym floor under a spotlight', 1024, 1024),
  ropes: demo('/images/gallery-rope.webp', 'Athlete working battle ropes in a dark gym', 768, 1024),
} satisfies Record<string, SiteImage>;

export const gallery: { image: SiteImage; layout: 'wide' | 'tall' | 'square' }[] = [
  { image: images.rack, layout: 'wide' },
  { image: images.plates, layout: 'tall' },
  { image: images.kettlebells, layout: 'square' },
  { image: images.ropes, layout: 'tall' },
  { image: images.form, layout: 'tall' },
  { image: images.mobility, layout: 'wide' },
];

// ── Training options ────────────────────────────────────────────────

export type TrainingOption = {
  slug: string;
  title: string;
  summary: string;
  /** Detail-page paragraphs. */
  details: string[];
  points: string[];
  image: SiteImage;
  /** Fitness goal pre-selected when this option's enquiry CTA is used. */
  enquiryGoal: string;
  confirmed: boolean;
};

export const trainingOptions: TrainingOption[] = [
  {
    slug: 'strength-training',
    title: 'Strength Training',
    summary: 'Build strength through sound technique, consistent work and sensible progression.',
    details: [
      'Strength training at RK Fitness centres on doing the fundamentals well: controlled movement, good positions and steady progress over time.',
      'Whether you are new to lifting or returning to it, the focus is on building a foundation you can keep developing.',
    ],
    points: ['Technique before load', 'Progression planned around you', 'Consistency over intensity for its own sake'],
    image: images.strength,
    enquiryGoal: 'strength',
    confirmed: false,
  },
  {
    slug: 'personalised-coaching',
    title: 'Personalised Coaching',
    summary: 'Training that takes your goals, experience and movement into account.',
    details: [
      'Members who have reviewed RK Fitness mention personalised workouts and attentive, patient coaching.',
      'Talk to the team about how coaching can be tailored to what you are working towards.',
    ],
    points: ['Starts with your goals', 'Exercise selection that suits you', 'Attention to form, rep by rep'],
    image: images.coaching,
    enquiryGoal: 'coaching',
    confirmed: false,
  },
  {
    slug: 'mobility-and-movement',
    title: 'Mobility & Movement',
    summary: 'Give movement quality, mobility and stability a place in your training.',
    details: [
      'Moving well supports everything else you do in the gym. Mobility and stability work can be part of a well-rounded training approach.',
      'This is general fitness training, not medical treatment or rehabilitation. If you have an injury or medical condition, speak to a qualified health professional first.',
    ],
    points: ['Controlled, deliberate movement', 'Stability alongside strength', 'Part of the plan, not an afterthought'],
    image: images.mobility,
    enquiryGoal: 'mobility',
    confirmed: false,
  },
  {
    slug: 'general-fitness',
    title: 'General Fitness',
    summary: 'Get fitter and stronger with purposeful, well-structured training.',
    details: [
      'Not every goal is a number on the bar. General fitness training helps you build capacity, confidence and habits that last.',
      'The same principles apply: purposeful sessions, good technique and steady progress.',
    ],
    points: ['Purposeful sessions', 'Habits that last', 'Progress you can see'],
    image: images.ropes,
    enquiryGoal: 'general',
    confirmed: false,
  },
];

// ── Coaches ─────────────────────────────────────────────────────────

export type Coach = {
  name: string;
  role: string;
  photo: SiteImage | null;
  /** Verified qualifications only. Leave empty rather than guess. */
  qualifications: string[];
  specialties: string[];
  bio: string;
  availability: string | null;
  confirmed: boolean;
};

/**
 * Coach profiles. A review mentions a coach named Rohith; add a profile only
 * after the owner confirms the role, biography and qualifications.
 */
export const coaches: Coach[] = [];

// ── Coaching approach (proposed messaging — owner to confirm) ───────

export const coachingSteps = [
  { title: 'Understand your goals', text: 'Start with what you want to achieve and why it matters to you.' },
  { title: 'Discuss your experience', text: 'Talk through your training history, so sessions start at the right level.' },
  { title: 'Select the right exercises', text: 'Choose movements that suit your goals, ability and individual needs.' },
  { title: 'Focus on technique', text: 'Pay close attention to form, so every repetition counts.' },
  { title: 'Review progress', text: 'Look back over time and adjust the plan as you develop.' },
];

// ── Enquiry form options ────────────────────────────────────────────

export const fitnessGoals = [
  { value: 'strength', label: 'Strength and muscle development' },
  { value: 'general', label: 'General fitness' },
  { value: 'coaching', label: 'Personalized coaching' },
  { value: 'mobility', label: 'Mobility and movement' },
  { value: 'membership', label: 'Membership information' },
  { value: 'other', label: 'Other' },
] as const;

export const experienceLevels = [
  { value: 'new', label: 'New to training' },
  { value: 'some', label: 'Some experience' },
  { value: 'experienced', label: 'Experienced' },
] as const;

export const contactMethods = [
  { value: 'phone', label: 'Phone call' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
] as const;

// ── Navigation ──────────────────────────────────────────────────────

export const navLinks = [
  { id: 'home', label: 'Home' },
  { id: 'approach', label: 'Approach' },
  { id: 'training', label: 'Training' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'contact', label: 'Contact' },
] as const;

export const agency = { name: 'Infinity Web & Apps' };
