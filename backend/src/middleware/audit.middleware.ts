import type { Context, MiddlewareHandler, Next } from "hono";
import { sql } from "../config/db.ts";

function sanitizePayload(body: unknown): unknown {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return body;
  }
  const clone: Record<string, unknown> = { ...(body as Record<string, unknown>) };
  for (const secretKey of ["password", "token", "refreshToken", "access_token", "refresh_token"]) {
    if (secretKey in clone) {
      clone[secretKey] = "[REDACTED]";
    }
  }
  return clone;
}

export const auditMiddleware = (): MiddlewareHandler => {
  return async (c: Context, next: Next) => {
    const method = c.req.method;
    const path = c.req.path;

    // Capturar y normalizar IP para tipo inet nativo de PostgreSQL
    const rawIp =
      c.req.header("x-forwarded-for")?.split(",")[0].trim() ||
      c.req.header("cf-connecting-ip") ||
      c.req.header("x-real-ip") ||
      "127.0.0.1";

    const cleanIp =
      rawIp.includes(":") && !rawIp.includes("[") && rawIp.indexOf(":") === rawIp.lastIndexOf(":")
        ? rawIp.split(":")[0]
        : rawIp;

    const rawUa = c.req.header("user-agent") || "Unknown";
    const userAgent = rawUa.length > 500 ? rawUa.substring(0, 500) : rawUa;

    let reqBody: unknown = null;
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      try {
        reqBody = sanitizePayload(await c.req.json());
      } catch {
        // Ignorar cuerpos multipart o no JSON
      }
    }

    // Ejecutar endpoint de negocio primero
    await next();

    // Registrar en auditoría de forma no bloqueante solo si la operación fue exitosa
    if (c.res.status >= 200 && c.res.status < 400 && !path.includes("/health")) {
      const userId = (c.get("userId") as string | undefined) || null;
      const entityId = (c.get("auditEntityId") as string | undefined) || crypto.randomUUID();
      const entityType = (c.get("auditEntityType") as string | undefined) || (path.includes("/receipts") ? "receipt" : "system");

      // Inserción asíncrona desvinculada del ciclo HTTP
      sql`
        INSERT INTO receipt_audit_logs (
          entity_type,
          entity_id,
          action,
          actor_id,
          client_ip,
          user_agent,
          changes
        ) VALUES (
          ${entityType},
          ${entityId},
          ${`${method} ${path}`},
          ${userId},
          ${cleanIp}::inet,
          ${userAgent},
          ${sql.json(((reqBody as any) || {}) as any)}
        )
      `.catch((err: unknown) => {
        console.error("⚠️ Error en auditoría desacoplada:", err);
      });
    }
  };
};
