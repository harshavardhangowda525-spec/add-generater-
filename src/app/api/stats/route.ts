import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { leadStats } from "@/lib/leads-query";

export const GET = handler(async () => {
  const user = await requireUser();
  return NextResponse.json({ stats: await leadStats(user.id) });
});
