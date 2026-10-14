import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { handler } from "@/lib/api";
import { createSession, HttpError, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

const body = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(200) });

export const POST = handler(async (req: Request) => {
  const { email, password } = body.parse(await req.json());
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !(await verifyPassword(password, user.passwordHash))) throw new HttpError(401, "Incorrect email or password.");
  await createSession(user.id);
  return NextResponse.json({ ok: true });
});
