import { createClient } from "@supabase/supabase-js";
import type { Context } from "hono";
import { ENV } from "./env.ts";

if (!ENV.SUPABASE_URL || !ENV.SUPABASE_ANON_KEY) {
  console.warn("⚠️ SUPABASE_URL o SUPABASE_ANON_KEY no están configuradas en el entorno.");
}

// Cliente público / anónimo para autenticación de usuarios (login / register)
export const supabase = createClient(
  ENV.SUPABASE_URL || "https://placeholder.supabase.co",
  ENV.SUPABASE_ANON_KEY || "placeholder-anon-key",
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

// Cliente administrativo con service_role (para operaciones privilegiadas de backend y Storage seguro)
export const supabaseAdmin = createClient(
  ENV.SUPABASE_URL || "https://placeholder.supabase.co",
  ENV.SUPABASE_SERVICE_ROLE_KEY || ENV.SUPABASE_ANON_KEY || "placeholder-service-key",
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

// Cliente scoped con el Bearer token JWT de la petición
export function getSupabaseUserClient(authHeader?: string) {
  return createClient(
    ENV.SUPABASE_URL || "https://placeholder.supabase.co",
    ENV.SUPABASE_ANON_KEY || "placeholder-anon-key",
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: authHeader ? { Authorization: authHeader } : {},
      },
    }
  );
}

// Helper para extraer cliente desde el Contexto de Hono
export function getSupabaseForRequest(c: Context) {
  return getSupabaseUserClient(c.req.header("Authorization"));
}
