import { Hono, type Context } from "hono";
import { sql } from "../config/db.ts";

export const healthRouter = new Hono();

healthRouter.get("/", async (c: Context) => {
  let dbStatus = "disconnected";
  let userCount = 0;
  try {
    const result = await sql`SELECT count(*)::int as total FROM users`;
    dbStatus = "connected";
    userCount = result[0]?.total ?? 0;
  } catch (err: unknown) {
    dbStatus = `error: ${err instanceof Error ? err.message : String(err)}`;
  }

  return c.json({
    status: "ok",
    service: "patricia-backend",
    version: "1.0.0",
    database: {
      status: dbStatus,
      users_seeded: userCount,
    },
    timestamp: new Date().toISOString(),
    environment: Deno.env.get("NODE_ENV") || "production",
    port: 3002,
  });
});
