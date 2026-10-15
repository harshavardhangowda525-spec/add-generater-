import { NextResponse } from "next/server";
import { z } from "zod";
import { handler } from "@/lib/api";
import { HttpError, requireUser } from "@/lib/auth";
import { createJob, listJobs } from "@/lib/jobs";
import { NICHE_MAP } from "@/lib/niches";
import { configuredProviders } from "@/lib/providers";

const body = z
  .object({
    country: z.string().trim().min(2).max(60).default("India"),
    state: z.string().trim().max(60).default("Karnataka"),
    city: z.string().trim().min(2).max(80).default("Bengaluru"),
    area: z.string().trim().max(100).optional().transform((v) => v || undefined),
    niche: z.string().trim().min(1).max(60),
    customNiche: z.string().trim().max(60).optional().transform((v) => v || undefined),
    target: z.coerce.number().int().positive("must be a positive whole number").max(1_000_000),
    websiteFilter: z.enum(["none", "weak", "all"]).default("none"),
    instagramFilter: z.enum(["any", "has", "none"]).default("any"),
    minQuality: z.coerce.number().int().min(0).max(100).optional(),
    checkWebsites: z.boolean().default(false),
    reachKm: z.coerce.number().int().min(0).max(100).default(0),
    providers: z.array(z.string()).optional(),
  })
  .refine((b) => b.niche !== "custom" || !!b.customNiche, { message: "Enter a custom niche", path: ["customNiche"] })
  .refine((b) => b.niche === "custom" || NICHE_MAP.has(b.niche), { message: "Unknown niche", path: ["niche"] });

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const params = body.parse(await req.json());
  if (configuredProviders().length === 0) {
    throw new HttpError(400, "No data provider is configured on the server. Add GOOGLE_PLACES_API_KEY or GEOAPIFY_API_KEY, or set OSM_ENABLED=true.");
  }
  const job = await createJob(user.id, params);
  return NextResponse.json({ job }, { status: 201 });
});

export const GET = handler(async () => {
  const user = await requireUser();
  return NextResponse.json({ jobs: await listJobs(user.id) });
});
