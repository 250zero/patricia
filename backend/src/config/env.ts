import { load } from "@std/dotenv";

// Cargar variables de .env buscando en rutas relativas comunes
const envPaths = ["./.env", "../.env", "../../.env"];
for (const p of envPaths) {
  try {
    const stat = Deno.statSync(p);
    if (stat.isFile) {
      const loaded = await load({ export: true, envPath: p });
      if (Object.keys(loaded).length > 0) {
        break;
      }
    }
  } catch {
    // Continuar buscando en la siguiente ruta
  }
}

export const ENV = {
  PORT: Number(Deno.env.get("PORT") || "3002"),
  SUPABASE_PROJECT_REF: Deno.env.get("SUPABASE_PROJECT_REF") || "",
  SUPABASE_URL: Deno.env.get("SUPABASE_URL") || "",
  SUPABASE_ANON_KEY: Deno.env.get("SUPABASE_ANON_KEY") || "",
  SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
  DATABASE_URL: Deno.env.get("DATABASE_URL") || "",
  SUPABASE_DB_PASSWORD: Deno.env.get("SUPABASE_DB_PASSWORD") || "",
  LLM_PROVIDER: Deno.env.get("LLM_PROVIDER") || "gemini",
  LLM_API_KEY: Deno.env.get("LLM_API_KEY") || "",
  NODE_ENV: Deno.env.get("NODE_ENV") || "development",
};
