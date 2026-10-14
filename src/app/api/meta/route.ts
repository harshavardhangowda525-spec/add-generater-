import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { distinctValues } from "@/lib/leads-query";
import { NICHES } from "@/lib/niches";
import { ALL_PROVIDERS } from "@/lib/providers";

// Only reports whether each provider is configured — never the key itself.
export const GET = handler(async () => {
  const user = await requireUser();
  return NextResponse.json({
    user,
    providers: ALL_PROVIDERS.map((p) => ({ name: p.name, label: p.label, attribution: p.attribution, configured: p.isConfigured() })),
    niches: NICHES.map((n) => ({ key: n.key, label: n.label })),
    values: await distinctValues(user.id),
  });
});
