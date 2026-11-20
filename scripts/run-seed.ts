import { load } from "jsr:@std/dotenv@^0.225.8";
import postgres from "npm:postgres@^3.4.5";
import { createClient } from "npm:@supabase/supabase-js@^2.48.1";

try {
  await load({ export: true, envPath: ".env" });
} catch {
  // En caso de que no exista .env en root
}

const dbUrl = Deno.env.get("DATABASE_URL");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

console.log("🌱 [1/2] Conectando a PostgreSQL para ejecutar seeds relacionales (5FN)...");

if (dbUrl) {
  const isSsl = dbUrl.includes("supabase.co") || dbUrl.includes("sslmode=require");
  const sql = postgres(dbUrl, { ssl: isSsl ? "require" : false });

  try {
    const seedSql = await Deno.readTextFile("supabase/seed.sql");
    await sql.unsafe(seedSql);
    console.log("✅ Seeds DML ejecutados exitosamente en PostgreSQL!");
  } catch (err) {
    console.warn("⚠️ Aviso al ejecutar seed.sql:", err);
  } finally {
    await sql.end();
  }
} else {
  console.warn("⚠️ DATABASE_URL no configurada, omitiendo inyección DDL/DML directa.");
}

// 2. Sembrar usuarios en Supabase Auth si se suministraron credenciales de administración
if (supabaseUrl && serviceRoleKey && !supabaseUrl.includes("placeholder")) {
  console.log("👤 [2/2] Creando y auto-confirmando usuarios en Supabase Auth...");
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const demoUsers = [
    { email: "admin@patricia.vis7ar.com", password: "Patricia2026!", fullName: "Adalberto SuperAdmin", roleId: 4 },
    { email: "contador@patricia.vis7ar.com", password: "Patricia2026!", fullName: "Lic. Ramón Contable", roleId: 2 },
    { email: "empleado1@patricia.vis7ar.com", password: "Patricia2026!", fullName: "Carlos Empleado Ventas", roleId: 1 },
    { email: "empleado2@patricia.vis7ar.com", password: "Patricia2026!", fullName: "Ana Empleada Operaciones", roleId: 1 },
  ];

  for (const u of demoUsers) {
    try {
      const { data, error } = await adminClient.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: {
          full_name: u.fullName,
          role_id: u.roleId,
        },
      });
      if (error) {
        if (error.message.includes("already registered") || error.message.includes("unique")) {
          console.log(`   ℹ️ Usuario ${u.email} ya existe en Supabase Auth.`);
        } else {
          console.warn(`   ⚠️ Advertencia con ${u.email}:`, error.message);
        }
      } else {
        console.log(`   ✅ Usuario ${u.email} creado y confirmado en Supabase Auth.`);
      }
    } catch (e: unknown) {
      const err = e as Error;
      console.warn(`   ⚠️ Excepción al crear ${u.email}:`, err.message);
    }
  }
} else {
  console.log("ℹ️ SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no configurados. Omitiendo creación en Supabase Auth.");
}

console.log("🎉 Proceso de seeds completado!");
