import type { Context, MiddlewareHandler, Next } from "hono";
import { verifyJwtToken, getUserProfile, type UserSession } from "../services/auth.service.ts";

export interface AuthenticatedContext extends Context {
  user?: UserSession;
}

export const authMiddleware = (): MiddlewareHandler => {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ error: "No autorizado. Token no proporcionado." }, 401);
    }

    const token = authHeader.substring(7).trim();
    const payload = await verifyJwtToken(token);
    if (!payload || !payload.sub) {
      return c.json({ error: "Token inválido o expirado." }, 401);
    }

    const userProfile = await getUserProfile(String(payload.sub));
    if (!userProfile) {
      return c.json({ error: "Usuario inactivo o no encontrado." }, 401);
    }

    // Permitir conmutar rol activo si se envía X-Active-Role
    const requestedRoleHeader = c.req.header("X-Active-Role");
    if (requestedRoleHeader) {
      const roleId = parseInt(requestedRoleHeader, 10);
      const matchingRole = userProfile.roles.find((r) => r.id === roleId);
      if (matchingRole) {
        userProfile.activeRole = matchingRole;
      }
    }

    c.set("user", userProfile);
    c.set("userId", userProfile.id);
    c.set("activeRoleId", userProfile.activeRole.id);

    await next();
  };
};

export const requireRole = (...allowedRoles: number[]): MiddlewareHandler => {
  return async (c: Context, next: Next) => {
    const user = c.get("user") as UserSession | undefined;
    if (!user) {
      return c.json({ error: "No autenticado." }, 401);
    }

    const hasRole = allowedRoles.includes(user.activeRole.id) || user.activeRole.id === 3; // Super Admin siempre tiene acceso
    if (!hasRole) {
      return c.json({
        error: "Acceso denegado. Se requiere un rol superior.",
        requiredRoles: allowedRoles,
        currentRole: user.activeRole.name,
      }, 403);
    }

    await next();
  };
};

export const requirePermission = (permissionCode: string): MiddlewareHandler => {
  return async (c: Context, next: Next) => {
    const user = c.get("user") as UserSession | undefined;
    if (!user) {
      return c.json({ error: "No autenticado." }, 401);
    }

    const hasPermission = user.permissions.includes(permissionCode) || user.activeRole.id === 3;
    if (!hasPermission) {
      return c.json({
        error: `Acceso denegado. Requiere el permiso: ${permissionCode}`,
      }, 403);
    }

    await next();
  };
};
