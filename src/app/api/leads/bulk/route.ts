import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { LEAD_STATUSES, leads } from "@/lib/db/schema";

const body = z.object({
  ids: z.array(z.string().uuid()).min(1).max(5000),
  action: z.enum(["status", "delete"]),
  status: z.enum(LEAD_STATUSES).optional(),
});

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const b = body.parse(await req.json());
  const where = and(eq(leads.userId, user.id), inArray(leads.id, b.ids));
  if (b.action === "delete") {
    const rows = await db.delete(leads).where(where).returning({ id: leads.id });
    return NextResponse.json({ updated: rows.length });
  }
  if (!b.status) return NextResponse.json({ error: "status is required" }, { status: 400 });
  const rows = await db.update(leads).set({ status: b.status, updatedAt: new Date() }).where(where).returning({ id: leads.id });
  return NextResponse.json({ updated: rows.length });
});
