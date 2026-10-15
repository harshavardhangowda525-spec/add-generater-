type P = { className?: string };
const base = (className = "h-4 w-4") => ({
  className,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const PhoneIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" /></svg>
);
export const NoteIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
);
export const InstagramIcon = ({ className }: P) => (
  <svg {...base(className)}><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" /></svg>
);
export const BanIcon = ({ className }: P) => (
  <svg {...base(className)}><circle cx="12" cy="12" r="9" /><path d="m5.7 5.7 12.6 12.6" /></svg>
);
export const BellIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" /></svg>
);
export const UserIcon = ({ className }: P) => (
  <svg {...base(className)}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
);
export const TrendIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="m22 7-8.5 8.5-5-5L2 17" /><path d="M16 7h6v6" /></svg>
);
export const QuestionIcon = ({ className }: P) => (
  <svg {...base(className)}><circle cx="12" cy="12" r="9" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></svg>
);
export const ChevronDown = ({ className }: P) => (
  <svg {...base(className)}><path d="m6 9 6 6 6-6" /></svg>
);
export const CloseIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M18 6 6 18M6 6l12 12" /></svg>
);
export const MapPinIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></svg>
);
export const CopyIcon = ({ className }: P) => (
  <svg {...base(className)}><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
);
export const SpinnerIcon = ({ className = "h-4 w-4" }: P) => (
  <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none" aria-hidden><circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" /><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
);
export const WhatsAppIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M3 21l1.7-4.9A8.5 8.5 0 1 1 8 19.6z" /><path d="M9 10c0 3 2 5 5 5l1-1.5-2-1-1 1c-1-.4-1.6-1-2-2l1-1-1-2z" /></svg>
);
