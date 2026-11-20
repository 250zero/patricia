import { ENV } from "../config/env.ts";

export interface ExtractedReceiptData {
  merchant_name: string;
  rnc: string | null;
  ncf: string | null;
  document_type: 1 | 2; // 1 = recibo, 2 = factura
  currency_code: string;
  issue_date: string;
  subtotal: number;
  itbis: number;
  total: number;
  confidence_score: number;
  items: {
    description: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    itbis: number;
    total: number;
  }[];
  is_balanced: boolean;
  notes?: string;
}

// Algoritmo de validacion RNC Republica Dominicana (Modulo 11 para 9 digitos)
export function isValidRnc(rncStr?: string | null): boolean {
  if (!rncStr) return false;
  const clean = rncStr.replace(/[^0-9]/g, "");
  if (clean.length !== 9) return false;

  const weights = [7, 9, 8, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += parseInt(clean[i], 10) * weights[i];
  }
  const remainder = sum % 11;
  let checkDigit = 11 - remainder;
  if (remainder === 0) checkDigit = 2;
  else if (remainder === 1) checkDigit = 1;

  return checkDigit === parseInt(clean[8], 10);
}

// Validacion basica de formato NCF / e-CF (B01..B16 o E31..E47)
export function isValidNcf(ncfStr?: string | null): boolean {
  if (!ncfStr) return false;
  const clean = ncfStr.trim().toUpperCase();
  // Formato tradicional B + 2 digitos tipo + 8 digitos secuencial (11 caracteres)
  const isTraditional = /^B[0-9]{10}$/.test(clean);
  // Formato electronico e-CF E + 2 digitos tipo + 10 digitos secuencial (13 caracteres)
  const isElectronic = /^E[0-9]{12}$/.test(clean);
  return isTraditional || isElectronic;
}

export async function processReceiptWithGemini(
  imageBase64: string,
  mimeType = "image/jpeg"
): Promise<ExtractedReceiptData> {
  const apiKey = ENV.LLM_API_KEY;
  if (!apiKey) {
    throw new Error("Clave de LLM (LLM_API_KEY) no configurada en el servidor.");
  }

  // Cascada de modelos multimodales de visión para máxima disponibilidad y velocidad
  // gemini-3.5-flash-lite responde en ~1.5s con excelente precisión de OCR; gemini-3.5-flash como respaldo robusto
  const modelsToTry = [
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-flash-latest"
  ];

  const systemInstruction = `
Eres un experto auditor contable y fiscal especializado en comprobantes de República Dominicana (DGII).
Tu labor es extraer de forma estructurada, exacta y sin alucinaciones todos los campos de la imagen de un recibo o factura.

REGLAS FISCALES Y CLASIFICACIÓN (RD):
1. 'document_type':
   - 2 (Factura): Si el comprobante posee NCF (Número de Comprobante Fiscal iniciando en B o E) y/o RNC formal de empresa comercial.
   - 1 (Recibo): Si es un recibo informal, ticket de caja chica, conduce, nota de entrega sin validez fiscal formal o pago simple.
2. 'merchant_name': Nombre comercial o razón social que figura en el encabezado del comprobante.
3. 'rnc': Número de Registro Nacional de Contribuyentes (normalmente 9 dígitos numéricos). Si no es legible o no existe, usa null.
4. 'ncf': Número de Comprobante Fiscal (ej: B0100000001, B0200000001, E310000000001). Si no es legible, usa null.
5. 'currency_code': 'DOP' (predeterminado), 'USD' o 'EUR'.
6. 'issue_date': Formato 'YYYY-MM-DD'. Si no es legible en el comprobante, usa la fecha actual.
7. 'subtotal': Importe monetario antes de impuestos. Si no es legible, usa 0.
8. 'itbis': Impuesto a la Transferencia de Bienes Industrializados y Servicios (18% en RD o 0 si está exento).
9. 'total': Importe final pagado (debe coincidir con subtotal + itbis).
10. 'items': Lista detallada de productos/servicios con cantidad, descripción, precio unitario e importes legibles.

REGLAS DE CALIDAD VISUAL, IMÁGENES BORROSAS Y ANTI-ALUCINACIÓN:
11. 'confidence_score': Evalúa rigurosamente la nitidez y certeza de los datos extraídos (0.0 a 1.0):
    - Si la imagen es NÍTIDA y completamente legible: asigna entre 0.85 y 1.0.
    - Si la imagen es BORROSA, desenfocada, movida, con baja resolución, sombras o texto borroso: asigna un valor ENTRE 0.30 y 0.65.
    - Si la imagen NO es un recibo ni factura: asigna MENOS de 0.30.
12. 'notes': Explica el estado de la imagen.
    - Si la imagen es borrosa: 'Imagen borrosa / ilegible: los textos o importes presentan falta de nitidez; se requiere confirmación manual.'
    - Si no es un recibo: 'La imagen no corresponde a un comprobante de gasto ni factura.'
    - Si es nítida: null.
13. CERO ALUCINACIONES: Si un monto o campo no es nítido debido al desenfoque, NO inventes cifras; devuélvelo como 0 o null.

DEBES RESPONDER EXCLUSIVAMENTE CON UN OBJETO JSON VÁLIDO.
`;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          { text: "Analiza y extrae con máxima fidelidad visual todos los datos contables de este comprobante en formato JSON." },
          {
            inlineData: {
              mimeType: mimeType,
              data: imageBase64,
            },
          },
        ],
      },
    ],
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  };

  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[Gemini OCR] Modelo ${model} devolvió ${response.status}: ${errText.substring(0, 120)}`);
        // Si el modelo da 503 (alta demanda) o 429, probar el siguiente de la cascada
        lastError = new Error(`Modelo ${model} devolvió status ${response.status}`);
        continue;
      }

      const data = await response.json();
      const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!candidateText) {
        throw new Error(`Gemini (${model}) no devolvió texto en candidates.`);
      }

      const rawParsed = JSON.parse(candidateText);

      const subtotal = Number(rawParsed.subtotal || 0);
      const itbis = Number(rawParsed.itbis || 0);
      const total = Number(rawParsed.total || subtotal + itbis);
      const isBalanced = Math.abs(subtotal + itbis - total) < 0.05;

      const items = Array.isArray(rawParsed.items)
        ? rawParsed.items.map((it: Record<string, unknown>) => ({
            description: String(it.description || "Artículo"),
            quantity: Number(it.quantity || 1),
            unit_price: Number(it.unit_price || it.total || 0),
            subtotal: Number(it.subtotal || it.total || 0),
            itbis: Number(it.itbis || 0),
            total: Number(it.total || 0),
          }))
        : [];

      console.log(`[Gemini OCR] Extracción exitosa con modelo ${model}: ${rawParsed.merchant_name || "Desconocido"}, Total: ${total}`);

      return {
        merchant_name: String(rawParsed.merchant_name || "").trim() || "Comercio no identificado",
        rnc: rawParsed.rnc ? String(rawParsed.rnc).trim() : null,
        ncf: rawParsed.ncf ? String(rawParsed.ncf).trim() : null,
        document_type: rawParsed.document_type === 2 ? 2 : 1,
        currency_code: String(rawParsed.currency_code || "DOP").toUpperCase(),
        issue_date: String(rawParsed.issue_date || new Date().toISOString().substring(0, 10)),
        subtotal,
        itbis,
        total,
        confidence_score: Number(rawParsed.confidence_score || 0.85),
        items,
        is_balanced: isBalanced,
        notes: rawParsed.notes || (rawParsed.confidence_score < 0.7 ? "Comprobante con baja nitidez detectada." : undefined),
      };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[Gemini OCR] Error intentando modelo ${model}:`, lastError.message);
    }
  }

  // Si todos los modelos de IA fallaron, informar el error real sin inventar datos fijos falsos
  console.error("Fallo general en todos los modelos de Gemini Vision:", lastError);
  throw new Error(`No fue posible procesar la imagen con la IA (${lastError?.message || "Servicio no disponible"}). Por favor reintente o complete los campos manualmente.`);
}
