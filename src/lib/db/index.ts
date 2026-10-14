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
  return postgres(url, { max: 10, prepare: false });
}

export const sqlClient = globalThis.__ilfSql ?? createClient();
if (process.env.NODE_ENV !== "production") globalThis.__ilfSql = sqlClient;

export const db = drizzle(sqlClient, { schema });
export { schema };
