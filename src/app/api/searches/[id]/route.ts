import { NextResponse } from "next/server";
import { z } from "zod";
import { handler } from "@/lib/api";
import { HttpError, requireUser } from "@/lib/auth";
import { getJob, setJobState } from "@/lib/jobs";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const job = z.string().uuid().safeParse(id).success ? await getJob(id, user.id) : null;
  if (!job) throw new HttpError(404, "Search not found");
  return NextResponse.json({ job });
});

const body = z.object({ action: z.enum(["pause", "resume", "cancel"]) });

export const POST = handler(async (req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const { action } = body.parse(await req.json());
  const job = z.string().uuid().safeParse(id).success ? await setJobState(id, user.id, action) : null;
  if (!job) throw new HttpError(404, "Search not found");
  return NextResponse.json({ job });
});
