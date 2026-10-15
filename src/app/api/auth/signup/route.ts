import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { handler } from "@/lib/api";
import { createSession, hashPassword, HttpError } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

const body = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, "must be at least 8 characters").max(200),
  name: z.string().trim().max(100).optional(),
});

export const POST = handler(async (req: Request) => {
  const { email, password, name } = body.parse(await req.json());
  if (process.env.ALLOW_SIGNUP === "false") {
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(users);
    if (n > 0) throw new HttpError(403, "Sign-ups are disabled on this installation.");
  }
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) throw new HttpError(409, "An account with this email already exists. Sign in instead.");
  const [user] = await db.insert(users).values({ email, name, passwordHash: await hashPassword(password) }).returning({ id: users.id });
  await createSession(user.id);
  return NextResponse.json({ ok: true });
});
