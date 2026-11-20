import { Hono, type Context } from "hono";

export const healthRouter = new Hono();

healthRouter.get("/", (c: Context) => {
  return c.json({
    status: "ok",
    service: "patricia-backend",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    environment: Deno.env.get("NODE_ENV") || "production",
    port: 3002,
  });
});
