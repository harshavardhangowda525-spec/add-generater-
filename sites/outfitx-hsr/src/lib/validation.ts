export type EnquiryInput = {
  fullName: string;
  phone: string;
  email: string;
  goal: string;
  experience: string;
  contactMethod: string;
  message: string;
  consent: boolean;
};

export type EnquiryErrors = Partial<Record<keyof EnquiryInput, string>>;

export const emptyEnquiry: EnquiryInput = {
  fullName: '',
  phone: '',
  email: '',
  goal: '',
  experience: '',
  contactMethod: '',
  message: '',
  consent: false,
};

export const LIMITS = { fullName: 100, email: 254, message: 1000 } as const;

/**
 * Normalises an Indian mobile number to E.164 (+91XXXXXXXXXX).
 * Accepts spaces, dashes, brackets, a leading 0, 91 or +91.
 * Returns null when the number is not a valid Indian mobile number.
 */
export function normaliseIndianMobile(raw: string): string | null {
  const trimmed = raw.trim();
  if (!/^[+\d\s()-]+$/.test(trimmed)) return null;
  let digits = trimmed.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  if (!/^[6-9]\d{9}$/.test(digits)) return null;
  return `+91${digits}`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEnquiry(v: EnquiryInput, allowed: { goals: string[]; experience: string[]; methods: string[] }): EnquiryErrors {
  const e: EnquiryErrors = {};
  const name = v.fullName.trim();
  if (!name) e.fullName = 'Please enter your full name.';
  else if (name.length < 2) e.fullName = 'Name looks too short.';
  else if (name.length > LIMITS.fullName) e.fullName = `Please keep your name under ${LIMITS.fullName} characters.`;

  if (!v.phone.trim()) e.phone = 'Please enter your phone number.';
  else if (!normaliseIndianMobile(v.phone)) e.phone = 'Enter a valid 10-digit Indian mobile number, e.g. 98765 43210.';

  const email = v.email.trim();
  if (email && (!EMAIL_RE.test(email) || email.length > LIMITS.email)) e.email = 'Enter a valid email address, or leave it blank.';

  if (!v.goal) e.goal = 'Please choose a fitness goal.';
  else if (!allowed.goals.includes(v.goal)) e.goal = 'Please choose a goal from the list.';

  if (v.experience && !allowed.experience.includes(v.experience)) e.experience = 'Please choose an option from the list.';

  if (!v.contactMethod) e.contactMethod = 'Please choose how we should contact you.';
  else if (!allowed.methods.includes(v.contactMethod)) e.contactMethod = 'Please choose an option from the list.';
  else if (v.contactMethod === 'email' && !email) e.email = 'Add your email address so we can reply by email.';

  if (v.message.length > LIMITS.message) e.message = `Please keep your message under ${LIMITS.message} characters.`;

  if (!v.consent) e.consent = 'Please confirm we may contact you about your enquiry.';
  return e;
}
