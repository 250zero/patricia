import postgres from "postgres";
import { ENV } from "./env.ts";

export const sql = postgres(ENV.DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: ENV.DATABASE_URL.includes("supabase.co") ? "require" : false,
});
