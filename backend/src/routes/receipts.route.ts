import { Hono, type Context } from "hono";
import { authMiddleware } from "../middleware/auth.middleware.ts";
import { processReceiptWithGemini } from "../services/gemini.service.ts";
import {
  saveReceiptImage,
  getReceiptImageBytes,
  createReceipt,
  getReceipts,
  getReceiptById,
  submitReceipt,
} from "../services/receipts.service.ts";
import type { UserSession } from "../services/auth.service.ts";

export const receiptsRouter = new Hono();

// Todos los endpoints de recibos requieren usuario autenticado
receiptsRouter.use("*", authMiddleware());

// POST /api/v1/receipts/process-image — Procesamiento de imagen con Gemini Flash OCR
receiptsRouter.post("/process-image", async (c: Context) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return c.json({ error: "No se proporcionó ningún archivo de imagen." }, 400);
    }

    if (file.size > 10 * 1024 * 1024) {
      return c.json({ error: "El archivo excede el tamaño máximo permitido de 10 MB." }, 400);
    }

    const mimeType = file.type || "image/jpeg";
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    const user = c.get("user") as UserSession | undefined;
    const ext = file.name.split(".").pop() || "jpg";
    const imagePath = await saveReceiptImage(bytes, ext, user?.id);

    // Convertir a Base64 de forma eficiente y segura para fotos grandes
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const base64 = btoa(binary);

    // Invocar OCR estructurado de Gemini con cascada de modelos
    const extractedData = await processReceiptWithGemini(base64, mimeType);

    return c.json({
      success: true,
      image_path: imagePath,
      extracted_data: extractedData,
    });
  } catch (err: unknown) {
    console.error("Error al procesar comprobante con IA:", err);
    return c.json({
      error: "Error durante el procesamiento del comprobante.",
      details: err instanceof Error ? err.message : String(err),
    }, 500);
  }
});

// POST /api/v1/receipts — Guardar comprobante
receiptsRouter.post("/", async (c: Context) => {
  try {
    const user = c.get("user") as UserSession;
    const body = await c.req.json();

    if (!body.merchant_name || !body.subtotal || !body.total) {
      return c.json({ error: "Faltan campos requeridos (comercio, subtotal o total)." }, 400);
    }

    const receipt = await createReceipt(body, user.id);
    c.set("auditEntityId", (receipt as any).id);
    c.set("auditEntityType", "receipt");

    return c.json({ success: true, receipt }, 201);
  } catch (err: unknown) {
    console.error("Error al crear comprobante:", err);
    return c.json({ error: "Error al guardar comprobante." }, 500);
  }
});

// GET /api/v1/receipts — Lista de comprobantes
receiptsRouter.get("/", async (c: Context) => {
  try {
    const user = c.get("user") as UserSession;
    const statusParam = c.req.query("status");
    const docTypeParam = c.req.query("document_type");
    const searchParam = c.req.query("search");

    const filters = {
      status: statusParam ? parseInt(statusParam, 10) : undefined,
      document_type: docTypeParam ? parseInt(docTypeParam, 10) : undefined,
      search: searchParam || undefined,
    };

    const receipts = await getReceipts(user, filters);
    return c.json({ receipts });
  } catch (err: unknown) {
    console.error("Error al listar comprobantes:", err);
    return c.json({ error: "Error al consultar comprobantes." }, 500);
  }
});

// GET /api/v1/receipts/:id — Detalle completo de un comprobante
receiptsRouter.get("/:id", async (c: Context) => {
  try {
    const user = c.get("user") as UserSession;
    const id = c.req.param("id")!;

    const receipt = await getReceiptById(id, user);
    if (!receipt) {
      return c.json({ error: "Comprobante no encontrado." }, 404);
    }

    return c.json({ receipt });
  } catch (err: unknown) {
    console.error("Error al obtener detalle de comprobante:", err);
    return c.json({ error: "Error al consultar detalle del comprobante." }, 500);
  }
});

// POST /api/v1/receipts/:id/submit — Enviar comprobante a Contabilidad
receiptsRouter.post("/:id/submit", async (c: Context) => {
  try {
    const user = c.get("user") as UserSession;
    const id = c.req.param("id")!;

    const updated = await submitReceipt(id, user.id);
    if (!updated) {
      return c.json({ error: "No se pudo enviar el comprobante. Verifique que exista y esté en borrador." }, 400);
    }

    c.set("auditEntityId", id);
    c.set("auditEntityType", "receipt");

    return c.json({ success: true, receipt: updated });
  } catch (err: unknown) {
    console.error("Error al enviar comprobante a contabilidad:", err);
    return c.json({ error: "Error al enviar comprobante." }, 500);
  }
});

// GET /api/v1/receipts/:id/image — Descarga segura de la imagen del comprobante
receiptsRouter.get("/:id/image", async (c: Context) => {
  try {
    const user = c.get("user") as UserSession;
    const id = c.req.param("id")!;

    const receipt = await getReceiptById(id, user);
    if (!receipt || !(receipt as any).image_path) {
      return c.json({ error: "Imagen no disponible para este comprobante." }, 404);
    }

    const bytes = await getReceiptImageBytes((receipt as any).image_path);
    if (!bytes) {
      return c.json({ error: "Archivo de imagen no encontrado en almacenamiento." }, 404);
    }

    return new Response(bytes as any, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (err: unknown) {
    console.error("Error al servir imagen:", err);
    return c.json({ error: "Error al cargar imagen." }, 500);
  }
});
