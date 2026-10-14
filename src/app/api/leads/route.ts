import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { filtersFromSearchParams, queryLeads } from "@/lib/leads-query";

export const GET = handler(async (req: Request) => {
  const user = await requireUser();
  const sp = new URL(req.url).searchParams;
  const filters = filtersFromSearchParams(sp);
  const result = await queryLeads(user.id, filters, {
    sort: sp.get("sort") ?? undefined,
    dir: sp.get("dir") === "asc" ? "asc" : "desc",
    page: Number(sp.get("page")) || 1,
    pageSize: Number(sp.get("pageSize")) || 50,
  });
  return NextResponse.json(result);
});
