import { NextResponse } from "next/server";
import { z } from "zod";
import { handler } from "@/lib/api";
import { HttpError, requireUser } from "@/lib/auth";
import { runJobStep } from "@/lib/jobs";

export const maxDuration = 60;

/** Advance a running search by one time-boxed slice. Idempotent and lock-protected. */
export const POST = handler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) throw new HttpError(404, "Search not found");
  const job = await runJobStep(id, { userId: user.id });
  if (!job) throw new HttpError(404, "Search not found");
  return NextResponse.json({ job });
});
