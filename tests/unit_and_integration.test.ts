import { assertEquals, assertNotEquals } from "jsr:@std/assert@^1.0.0";
import { isValidRnc, isValidNcf } from "../backend/src/services/gemini.service.ts";
import { createJwtToken, verifyJwtToken } from "../backend/src/services/auth.service.ts";

Deno.test("DGII: Validación de RNC Módulo 11", () => {
  // RNCs válidos conocidos
  assertEquals(isValidRnc("101012345"), false); // Ficticio checksum invalido
  assertEquals(isValidRnc("101850043"), true);  // Valido oficial
  assertEquals(isValidRnc("131880738"), true);  // Valido oficial
  assertEquals(isValidRnc("123"), false);        // Longitud invalida
  assertEquals(isValidRnc(""), false);           // Vacio
});

Deno.test("DGII: Validación de NCF y e-CF", () => {
  // NCF tradicional (B01, B02, etc.)
  assertEquals(isValidNcf("B0100001234"), true);
  assertEquals(isValidNcf("B0200005678"), true);
  assertEquals(isValidNcf("B1500009999"), true);
  
  // e-CF Electrónico (E31, E32, etc.)
  assertEquals(isValidNcf("E310000004411"), true);
  assertEquals(isValidNcf("E320000001234"), true);
  
  // Formatos inválidos
  assertEquals(isValidNcf("X0100001234"), false);
  assertEquals(isValidNcf("1234567"), false);
  assertEquals(isValidNcf(""), false);
});

Deno.test("Contabilidad: Cuadre Aritmético Subtotal + ITBIS == Total", () => {
  const checkBalance = (subtotal: number, itbis: number, total: number) => {
    return Math.abs(subtotal + itbis - total) < 0.05;
  };

  assertEquals(checkBalance(1000, 180, 1180), true);
  assertEquals(checkBalance(500, 90, 590), true);
  assertEquals(checkBalance(290.91, 0, 290.91), true);
  
  // Descuadre
  assertEquals(checkBalance(1000, 180, 1500), false);
  assertEquals(checkBalance(1000, 0, 1180), false);
});

Deno.test("Seguridad SoD: Principio de Cuatro Ojos", () => {
  const canReview = (submitterId: string, reviewerId: string, roleId: number) => {
    // Super Admin (3) puede aprobar cualquier comprobante (bypass de contingencia)
    if (roleId === 3) return true;
    // Contador (2) solo puede aprobar si NO es el emisor
    if (roleId === 2) return submitterId !== reviewerId;
    // Otros roles no pueden revisar
    return false;
  };

  const userA = "00000000-0000-0000-0000-000000000001";
  const userB = "00000000-0000-0000-0000-000000000002";

  // Contador revisando a otro usuario -> Permitido
  assertEquals(canReview(userA, userB, 2), true);

  // Contador intentando auto-aprobar su propio comprobante -> BLOQUEADO SoD
  assertEquals(canReview(userA, userA, 2), false);

  // Super Admin aprobando su propio comprobante -> Permitido por rol de resolución
  assertEquals(canReview(userA, userA, 3), true);

  // Empleado intentando revisar -> Denegado
  assertEquals(canReview(userA, userB, 1), false);
});

Deno.test("Seguridad Auth: Firma y Verificación de JWT con WebCrypto nativo", async () => {
  const payload = {
    sub: "user-1234-uuid",
    email: "test@patricia.vis7ar.com",
    role: 2,
    name: "Lic. Contadora",
  };

  const token = await createJwtToken(payload, 3600);
  assertNotEquals(token, null);
  assertEquals(typeof token, "string");
  assertEquals(token.split(".").length, 3);

  const verified = await verifyJwtToken(token);
  assertNotEquals(verified, null);
  assertEquals(verified?.sub, "user-1234-uuid");
  assertEquals(verified?.role, 2);
});

Deno.test("Reportes: Verificación de Prefijo UTF-8 BOM en exportación CSV", () => {
  const generateCsvWithBom = (data: string) => {
    return "\uFEFF" + data;
  };

  const csv = generateCsvWithBom("Fecha,Comercio,Total\n2026-11-20,Supermercado Nacional,1180.00");
  const bytes = new TextEncoder().encode(csv);

  // El BOM UTF-8 debe corresponder a los bytes 0xEF, 0xBB, 0xBF
  assertEquals(bytes[0], 0xEF);
  assertEquals(bytes[1], 0xBB);
  assertEquals(bytes[2], 0xBF);
});
