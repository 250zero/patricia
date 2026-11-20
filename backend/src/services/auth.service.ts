import { sql } from "../config/db.ts";
import { supabase } from "../config/supabase.ts";
import { ENV } from "../config/env.ts";

export interface UserSession {
  id: string;
  email: string;
  fullName: string;
  roles: { id: number; name: string; isPrimary: boolean }[];
  activeRole: { id: number; name: string };
  permissions: string[];
}

const JWT_SECRET = Deno.env.get("JWT_SECRET") || "patricia-super-secret-key-2026-financial-audit";

// Generar HMAC-SHA256 Token usando Web Crypto API nativa de Deno
export async function createJwtToken(payload: Record<string, unknown>, expiresInSec = 86400): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const exp = now + expiresInSec;
  const fullPayload = { ...payload, iat: now, exp };

  const encoder = new TextEncoder();
  const b64Header = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const b64Payload = btoa(JSON.stringify(fullPayload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const data = `${b64Header}.${b64Payload}`;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const b64Sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${data}.${b64Sig}`;
}

// Verificar Token (Soporta tokens nativos de Supabase Auth y tokens WebCrypto)
export async function verifyJwtToken(token: string): Promise<Record<string, unknown> | null> {
  // 1. Si Supabase está configurado, intentar validar contra Supabase Auth
  if (ENV.SUPABASE_URL && !ENV.SUPABASE_URL.includes("placeholder")) {
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data?.user) {
        return {
          sub: data.user.id,
          email: data.user.email,
          aud: data.user.aud,
          role: data.user.role,
        };
      }
    } catch {
      // Continuar con verificación HMAC local
    }
  }

  // 2. Verificación HMAC local
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [b64Header, b64Payload, b64Sig] = parts;
    const data = `${b64Header}.${b64Payload}`;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    // Reconstruir binario de firma
    const rawSig = atob(b64Sig.replace(/-/g, "+").replace(/_/g, "/"));
    const sigBytes = new Uint8Array(rawSig.length);
    for (let i = 0; i < rawSig.length; i++) {
      sigBytes[i] = rawSig.charCodeAt(i);
    }

    const isValid = await crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(data));
    if (!isValid) return null;

    const payload = JSON.parse(atob(b64Payload.replace(/-/g, "+").replace(/_/g, "/")));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Expirado
    }

    return payload;
  } catch {
    return null;
  }
}

// Obtener detalles completos de un usuario con roles y permisos
export async function getUserProfile(userId: string): Promise<UserSession | null> {
  const users = await sql`
    SELECT id, email, full_name, is_active
    FROM users
    WHERE id = ${userId} AND is_active = true
  `;
  if (!users || users.length === 0) return null;
  const user = users[0];

  const roleRows = await sql`
    SELECT r.id, r.name, ur.is_primary
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = ${userId}
    ORDER BY ur.is_primary DESC, r.id ASC
  `;

  const roles = roleRows.map((r: any) => ({
    id: r.id,
    name: r.name,
    isPrimary: r.is_primary,
  }));

  const activeRole = roles.find((r: { isPrimary: boolean }) => r.isPrimary) || roles[0] || { id: 1, name: "Empleado" };

  const permissionRows = await sql`
    SELECT DISTINCT p.code
    FROM role_permissions rp
    JOIN permissions p ON rp.permission_id = p.id
    WHERE rp.role_id IN ${sql(roles.map((r: { id: number }) => r.id))}
  `;

  const permissions = permissionRows.map((p: any) => p.code as string);

  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    roles,
    activeRole,
    permissions,
  };
}
