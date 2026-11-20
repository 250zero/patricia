import { Hono, type Context } from "hono";
import { sql } from "../config/db.ts";
import { authMiddleware, requireRole } from "../middleware/auth.middleware.ts";

export const usersRouter = new Hono();

// Solo Super Admin (Rol 3) puede gestionar usuarios
usersRouter.use("*", authMiddleware(), requireRole(3));

// GET /api/v1/users — Listado de usuarios con roles y permisos
usersRouter.get("/", async (c: Context) => {
  try {
    const userRows = await sql`
      SELECT 
        u.id,
        u.email,
        u.full_name,
        u.is_active,
        u.created_at,
        r.id as role_id,
        r.name as role_name,
        ur.is_primary
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      ORDER BY u.created_at ASC
    `;

    // Agrupar roles por usuario
    const userMap = new Map<string, Record<string, unknown>>();
    for (const row of userRows) {
      if (!userMap.has(row.id)) {
        userMap.set(row.id, {
          id: row.id,
          email: row.email,
          fullName: row.full_name,
          isActive: row.is_active,
          createdAt: row.created_at,
          roles: [],
        });
      }
      if (row.role_id) {
        const u = userMap.get(row.id)!;
        (u.roles as { id: number; name: string; isPrimary: boolean }[]).push({
          id: row.role_id,
          name: row.role_name,
          isPrimary: row.is_primary,
        });
      }
    }

    return c.json({ users: Array.from(userMap.values()) });
  } catch (err: unknown) {
    console.error("Error al listar usuarios:", err);
    return c.json({ error: "Error al cargar usuarios." }, 500);
  }
});

// PATCH /api/v1/users/:id/role — Cambiar rol primario de un usuario
usersRouter.patch("/:id/role", async (c: Context) => {
  try {
    const targetUserId = c.req.param("id")!;
    const body = await c.req.json();
    const newRoleId = Number(body.roleId);

    if (![1, 2, 3].includes(newRoleId)) {
      return c.json({ error: "Rol inválido. Debe ser 1 (Empleado), 2 (Contador) o 3 (Super Admin)." }, 400);
    }

    // Actualizar o insertar rol
    await sql`
      INSERT INTO user_roles (user_id, role_id, is_primary)
      VALUES (${targetUserId}, ${newRoleId}, true)
      ON CONFLICT (user_id, role_id) DO UPDATE SET is_primary = true
    `;

    // Asegurar que otros roles no queden como primarios si se desea rol unico
    await sql`
      UPDATE user_roles
      SET is_primary = false
      WHERE user_id = ${targetUserId} AND role_id <> ${newRoleId}
    `;

    c.set("auditEntityId", targetUserId);
    c.set("auditEntityType", "user_role_change");

    return c.json({ success: true, message: "Rol actualizado exitosamente." });
  } catch (err: unknown) {
    console.error("Error al actualizar rol de usuario:", err);
    return c.json({ error: "Error al actualizar rol." }, 500);
  }
});

// GET /api/v1/users/audit-logs — Bitácora de auditoría inmutable
usersRouter.get("/audit-logs", async (c: Context) => {
  try {
    const limit = Math.min(Number(c.req.query("limit")) || 50, 100);
    const offset = Number(c.req.query("offset")) || 0;
    const actorId = c.req.query("actor_id");

    const logs = await sql`
      SELECT 
        l.id,
        l.entity_type,
        l.entity_id,
        l.action,
        l.client_ip::text as client_ip,
        l.user_agent,
        l.changes,
        l.created_at,
        u.email as actor_email,
        u.full_name as actor_name
      FROM receipt_audit_logs l
      LEFT JOIN users u ON l.actor_id = u.id
      ${actorId ? sql`WHERE l.actor_id = ${actorId}` : sql``}
      ORDER BY l.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return c.json({ logs });
  } catch (err: unknown) {
    console.error("Error al consultar bitácora de auditoría:", err);
    return c.json({ error: "Error al cargar auditoría." }, 500);
  }
});
