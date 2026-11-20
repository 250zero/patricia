import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { ENV } from "./src/config/env.ts";
import { healthRouter } from "./src/routes/health.route.ts";

const app = new Hono();

// Middlewares globales
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: (origin: string | undefined) => {
      if (
        !origin ||
        origin.includes("localhost") ||
        origin.includes("127.0.0.1") ||
        origin.includes("vis7ar.com")
      ) {
        return origin;
      }
      return "https://patricia.vis7ar.com";
    },
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Active-Role", "X-User-Id"],
    exposeHeaders: ["Content-Length", "X-Request-Id"],
    maxAge: 86400,
    credentials: true,
  })
);

// Rutas base de la API
app.route("/api/health", healthRouter);
app.route("/api/v1/health", healthRouter);

// Ruta raiz informativa
app.get("/", (c: Context) => {
  return c.json({
    name: "Patricia Backend API — Escaner de Recibos y Facturas con IA",
    version: "1.0.0",
    service: "patricia-backend",
    port: ENV.PORT,
    endpoints: [
      "/api/v1/health",
      "/api/v1/auth/login",
      "/api/v1/receipts/process-image",
      "/api/v1/accounting/review",
      "/api/v1/accounting/export",
    ],
  });
});

console.log(`🚀 Patricia Backend iniciado en http://0.0.0.0:${ENV.PORT}`);

Deno.serve({ port: ENV.PORT }, app.fetch);
