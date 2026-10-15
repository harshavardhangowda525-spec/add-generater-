import { handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { leadsToCsv } from "@/lib/csv";
import { allMatchingLeads, filtersFromSearchParams, leadFilterSchema } from "@/lib/leads-query";

/**
 * scope=filtered (default): exactly the rows matching the dashboard filters (+ ids if selected)
 * scope=eligible: every lead with a phone number and no listed website
 * scope=all: everything, only when explicitly requested
 */
export const GET = handler(async (req: Request) => {
  const user = await requireUser();
  const sp = new URL(req.url).searchParams;
  const scope = sp.get("scope") ?? "filtered";
  const filters =
    scope === "all"
      ? leadFilterSchema.parse({})
      : scope === "eligible"
        ? leadFilterSchema.parse({ phone: "has", website: "no_website" })
        : filtersFromSearchParams(sp);
  const rows = await allMatchingLeads(user.id, filters);
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(leadsToCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="infinity-leads-${scope}-${stamp}.csv"`,
      "X-Lead-Count": String(rows.length),
      "Cache-Control": "no-store",
    },
  });
});
