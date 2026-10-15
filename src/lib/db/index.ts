import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  // Reuse one pool across Next.js hot reloads in development.
  var __ilfSql: ReturnType<typeof postgres> | undefined;
}

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env and configure it.");
  // Serverless hosts (Vercel) run many short-lived instances at once, and a
  // pooler like Supabase's caps total clients, so each instance holds a single
  // connection and lets it go quickly. Long-running servers keep a small pool.
  const serverless = !!process.env.VERCEL || process.env.DB_POOL_MAX === "1";
  return postgres(url, {
    max: Number(process.env.DB_POOL_MAX) || (serverless ? 1 : 10),
    idle_timeout: serverless ? 5 : 30,
    connect_timeout: 15,
    prepare: false, // required by transaction-mode poolers (Supabase port 6543, PgBouncer)
  });
}

export const sqlClient = globalThis.__ilfSql ?? createClient();
if (process.env.NODE_ENV !== "production") globalThis.__ilfSql = sqlClient;

export const db = drizzle(sqlClient, { schema });
export { schema };
