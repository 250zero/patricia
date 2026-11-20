import { load } from "jsr:@std/dotenv@^0.225.8";
import postgres from "npm:postgres@^3.4.5";

try {
  await load({ export: true, envPath: ".env" });
} catch {
  // En caso de que no exista .env en root
}

const dbUrl = Deno.env.get("DATABASE_URL");
if (!dbUrl) {
  console.error("❌ DATABASE_URL no encontrada en .env");
  Deno.exit(1);
}

console.log("🌱 Conectando a Supabase Cloud para ejecutar seeds de Patricia...");
const sql = postgres(dbUrl, { ssl: "require" });

try {
  const seedSql = await Deno.readTextFile("supabase/seed.sql");
  await sql.unsafe(seedSql);
  console.log("✅ Seeds de Patricia ejecutados exitosamente en Supabase Cloud!");
} catch (err) {
  console.error("❌ Error al ejecutar seeds:", err);
} finally {
  await sql.end();
}
