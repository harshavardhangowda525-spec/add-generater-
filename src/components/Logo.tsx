export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 48 24" className="h-7 w-14 shrink-0 drop-shadow-[0_0_6px_rgba(56,189,248,0.6)]" aria-hidden>
        <defs>
          <linearGradient id="inf" x1="0" x2="1">
            <stop offset="0" stopColor="#60A5FA" />
            <stop offset="1" stopColor="#38BDF8" />
          </linearGradient>
        </defs>
        <path d="M6 12c0-3.6 2.8-6 6-6 6 0 10 12 18 12 3.4 0 6-2.6 6-6s-2.6-6-6-6c-8 0-12 12-18 12-3.2 0-6-2.4-6-6z" fill="none" stroke="url(#inf)" strokeWidth="3.2" strokeLinecap="round" />
      </svg>
      {!compact && (
        <div className="leading-none">
          <div className="text-base font-bold text-white">Infinity</div>
          <div className="mt-0.5 text-[10px] text-slate-400">Web &amp; Apps</div>
        </div>
      )}
    </div>
  );
}
