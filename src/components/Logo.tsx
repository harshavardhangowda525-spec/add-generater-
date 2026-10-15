export function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 64 64" className="h-8 w-8 shrink-0" aria-hidden>
        <rect width="64" height="64" rx="14" fill={light ? "#ffffff" : "#0A2540"} />
        <path d="M20 32c0-5 4-9 8.5-9 7 0 9.5 18 16.5 18 4.5 0 7-4 7-9s-2.5-9-7-9c-7 0-9.5 18-16.5 18C24 41 20 37 20 32z" fill="none" stroke="#2563EB" strokeWidth="5" strokeLinecap="round" />
      </svg>
      <div className="leading-tight">
        <div className={`text-sm font-bold ${light ? "text-white" : "text-navy"}`}>Infinity Lead Finder</div>
        <div className={`text-[11px] ${light ? "text-blue-200" : "text-slate-500"}`}>Infinity Web &amp; Apps</div>
      </div>
    </div>
  );
}
