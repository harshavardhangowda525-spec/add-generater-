import type { StatsDTO } from "@/lib/types";

export function StatsBar({ stats }: { stats: StatsDTO | null }) {
  const items: [string, number | undefined, string?][] = [
    ["Total unique leads", stats?.total],
    ["With phone numbers", stats?.withPhone],
    ["No website listed", stats?.noWebsite],
    ["With Instagram", stats?.withInstagram],
    ["Contacted", stats?.contacted],
    ["Follow-ups due", stats?.followUpsDue, stats && stats.followUpsDue > 0 ? "text-amber-600" : undefined],
    ["Remaining to target", stats?.remaining, "text-brand"],
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
      {items.map(([label, value, cls]) => (
        <div key={label} className="card px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
          <div className={`mt-1 text-2xl font-bold tabular-nums ${cls ?? "text-navy"}`}>{value == null ? <span className="inline-block h-6 w-10 animate-pulse rounded bg-slate-200" /> : value.toLocaleString("en-IN")}</div>
        </div>
      ))}
    </div>
  );
}
