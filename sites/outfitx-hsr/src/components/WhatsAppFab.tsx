import { whatsappLink } from '../lib/contact';

/** Floating WhatsApp button. Uses the official glyph shape, drawn inline. */
export function WhatsAppFab() {
  return (
    <a
      href={whatsappLink()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with RK Fitness Center-Gym on WhatsApp (opens in a new tab)"
      className="group fixed bottom-4 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_10px_30px_-8px_rgba(0,0,0,0.6)] transition-transform duration-300 hover:scale-105 active:scale-95 sm:bottom-6 sm:right-6"
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
    >
      <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden fill="currentColor">
        <path d="M16.04 3C9.4 3 4 8.36 4 14.97c0 2.11.56 4.17 1.62 5.99L4 29l8.27-2.16a12.1 12.1 0 0 0 3.77.6h.01c6.63 0 12.03-5.37 12.03-11.98C28.08 8.36 22.68 3 16.04 3Zm0 21.9h-.01c-1.18 0-2.34-.21-3.43-.63l-.6-.23-4.9 1.28 1.31-4.76-.32-.6a9.86 9.86 0 0 1-1.38-5.02c0-5.46 4.48-9.9 9.34-9.9 5.47 0 9.35 4.44 9.35 9.9 0 5.47-4.4 9.96-9.36 9.96Zm5.43-7.42c-.3-.15-1.76-.86-2.03-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.15-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.76-1.66-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.48.71.31 1.27.49 1.7.63.72.23 1.37.2 1.88.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.08-.13-.28-.2-.57-.35Z" />
      </svg>
      <span className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap bg-white px-3 py-2 text-xs font-semibold text-ink opacity-0 transition-opacity group-hover:opacity-100 sm:block">
        Chat on WhatsApp
      </span>
    </a>
  );
}
