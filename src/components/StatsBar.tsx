import type { StatsDTO } from "@/lib/types";
import { InstagramIcon, PhoneIcon, QuestionIcon, TrendIcon } from "./Icons";

export function StatsBar({ stats }: { stats: StatsDTO | null }) {
  const items = [
    { label: "Total Leads", value: stats?.total, icon: <TrendIcon className="h-5 w-5" />, trend: true },
    { label: "No Website Listed", value: stats?.noWebsite, icon: <QuestionIcon className="h-5 w-5" /> },
    { label: "Leads With Phone Numbers", value: stats?.withPhone, icon: <PhoneIcon className="h-5 w-5" /> },
    { label: "Leads With Instagram", value: stats?.withInstagram, icon: <InstagramIcon className="h-5 w-5" /> },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="card-glow flex min-h-[104px] flex-col justify-between p-4">
          <div className="text-xs text-slate-300 sm:text-sm">{it.label}</div>
          <div className="mt-2 flex items-end justify-between gap-2">
            <div className="flex items-center gap-1.5 text-3xl font-bold tabular-nums text-white">
              {it.value == null ? <span className="inline-block h-8 w-16 animate-pulse rounded bg-white/10" /> : it.value.toLocaleString("en-IN")}
              {it.trend && it.value != null && it.value > 0 && <span className="text-lg text-emerald-400" aria-hidden>↑</span>}
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-400/10 text-sky-300 shadow-glow">
              {it.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
