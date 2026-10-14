import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { handler } from "@/lib/api";
import { HttpError, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { LEAD_STATUSES, leads, leadSources } from "@/lib/db/schema";

type Ctx = { params: Promise<{ id: string }> };

async function own(ctx: Ctx, userId: string) {
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) throw new HttpError(404, "Lead not found");
  const [lead] = await db.select().from(leads).where(and(eq(leads.id, id), eq(leads.userId, userId))).limit(1);
  if (!lead) throw new HttpError(404, "Lead not found");
  return lead;
}

export const GET = handler(async (_req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const lead = await own(ctx, user.id);
  const sources = await db
    .select({ provider: leadSources.provider, sourceId: leadSources.sourceId, createdAt: leadSources.createdAt })
    .from(leadSources)
    .where(eq(leadSources.leadId, lead.id));
  return NextResponse.json({ lead, sources });
});

const patch = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  notes: z.string().max(5000).nullable().optional(),
  followUpAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).nullable().optional(),
});

export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const lead = await own(ctx, user.id);
  const p = patch.parse(await req.json());
  const set: Partial<typeof leads.$inferInsert> = { updatedAt: new Date() };
  if (p.status) {
    set.status = p.status;
    if (p.status === "contacted" && !lead.contactedAt) set.contactedAt = new Date();
  }
  if (p.notes !== undefined) set.notes = p.notes;
  if (p.followUpAt !== undefined) set.followUpAt = p.followUpAt ? new Date(p.followUpAt) : null;
  const [updated] = await db.update(leads).set(set).where(eq(leads.id, lead.id)).returning();
  return NextResponse.json({ lead: updated });
});

export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const lead = await own(ctx, user.id);
  await db.delete(leads).where(eq(leads.id, lead.id));
  return NextResponse.json({ ok: true });
});
