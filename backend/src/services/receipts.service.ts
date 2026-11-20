import { sql } from "../config/db.ts";
import { supabaseAdmin, supabase } from "../config/supabase.ts";
import { ENV } from "../config/env.ts";
import type { ExtractedReceiptData } from "./gemini.service.ts";
import type { UserSession } from "./auth.service.ts";

const UPLOADS_DIR = Deno.env.get("UPLOADS_DIR") || "./uploads/receipts";
const STORAGE_BUCKET = "receipts";

// Asegurar carpeta de almacenamiento local de respaldo
export async function ensureUploadsDir() {
  try {
    await Deno.mkdir(UPLOADS_DIR, { recursive: true });
  } catch {
    // Ya existe
  }
}

/**
 * Guarda la imagen en Supabase Storage (bucket privado 'receipts') con fallback a disco local
 */
export async function saveReceiptImage(fileBytes: Uint8Array, extension = "jpg", userId?: string): Promise<string> {
  const filename = `${crypto.randomUUID()}.${extension}`;
  const storagePath = userId ? `${userId}/${filename}` : filename;

  // Si Supabase está configurado, subir al bucket 'receipts'
  if (ENV.SUPABASE_URL && !ENV.SUPABASE_URL.includes("placeholder")) {
    try {
      const mimeType = extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : extension === "pdf" ? "application/pdf" : "image/jpeg";
      const { data, error } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, fileBytes, {
          contentType: mimeType,
          upsert: true,
        });

      if (!error && data?.path) {
        return `supabase://${STORAGE_BUCKET}/${data.path}`;
      }
      console.warn("⚠️ Error subiendo a Supabase Storage, recurriendo a disco local:", error?.message);
    } catch (err) {
      console.warn("⚠️ Excepción en Supabase Storage, usando disco local:", err);
    }
  }

  // Fallback a almacenamiento local en disco
  await ensureUploadsDir();
  const filePath = `${UPLOADS_DIR}/${filename}`;
  await Deno.writeFile(filePath, fileBytes);
  return filename;
}

/**
 * Obtiene los bytes de la imagen desde Supabase Storage o desde disco local
 */
export async function getReceiptImageBytes(imagePathOrFilename: string): Promise<Uint8Array | null> {
  try {
    // Si la ruta indica almacenamiento en Supabase Storage
    if (imagePathOrFilename.startsWith(`supabase://${STORAGE_BUCKET}/`)) {
      const relPath = imagePathOrFilename.replace(`supabase://${STORAGE_BUCKET}/`, "");
      const { data, error } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .download(relPath);

      if (!error && data) {
        const buffer = await data.arrayBuffer();
        return new Uint8Array(buffer);
      }
    }

    // Fallback a disco local
    const clean = imagePathOrFilename.replace(/[^a-zA-Z0-9._-]/g, "");
    return await Deno.readFile(`${UPLOADS_DIR}/${clean}`);
  } catch {
    return null;
  }
}

/**
 * Genera una URL firmada de lectura temporal para visualización segura en el visor
 */
export async function getReceiptSignedUrl(imagePathOrFilename?: string | null, expiresInSeconds = 86400): Promise<string | null> {
  if (!imagePathOrFilename) return null;
  if (imagePathOrFilename.startsWith("http://") || imagePathOrFilename.startsWith("https://")) {
    return imagePathOrFilename;
  }
  if (imagePathOrFilename.startsWith(`supabase://${STORAGE_BUCKET}/`)) {
    const relPath = imagePathOrFilename.replace(`supabase://${STORAGE_BUCKET}/`, "");
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(relPath, expiresInSeconds);

    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }
    // Fallback a URL publica si createSignedUrl da error
    const pub = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(relPath);
    if (pub?.data?.publicUrl) {
      return pub.data.publicUrl;
    }
  }
  return null;
}

export interface CreateReceiptInput {
  merchant_name: string;
  rnc?: string | null;
  ncf?: string | null;
  document_type: 1 | 2; // 1 = recibo, 2 = factura
  category?: string;
  currency_code?: string;
  issue_date?: string;
  subtotal: number;
  itbis: number;
  total: number;
  image_path?: string | null;
  ocr_raw_json?: Record<string, unknown> | null;
  status?: 1 | 2; // 1 = draft, 2 = submitted
  items?: {
    description: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    itbis: number;
    total: number;
  }[];
}

export async function findDuplicateReceipt(
  userId: string,
  merchantName: string,
  issueDate: string,
  total: number
) {
  if (!merchantName || !total || total <= 0) return null;
  const rows = await sql`
    SELECT id, merchant_name, issue_date, total, created_at
    FROM receipts
    WHERE user_id = ${userId}
      AND LOWER(TRIM(merchant_name)) = LOWER(TRIM(${merchantName}))
      AND issue_date = ${issueDate}
      AND ABS(total - ${total}) < 0.05
    ORDER BY created_at DESC
    LIMIT 1
  `;
  return rows.length > 0 ? rows[0] : null;
}

export async function createReceipt(input: CreateReceiptInput, userId: string) {
  const isBalanced = Math.abs(input.subtotal + input.itbis - input.total) < 0.05;
  const status = input.status || 1; // Por defecto draft
  const category = (input.category || "otros").toLowerCase().trim();

  const inserted = await sql`
    INSERT INTO receipts (
      user_id,
      document_type,
      category,
      merchant_name,
      rnc,
      ncf,
      currency_code,
      issue_date,
      subtotal,
      itbis,
      total,
      status,
      image_path,
      ocr_raw_json
    ) VALUES (
      ${userId},
      ${input.document_type},
      ${category},
      ${input.merchant_name},
      ${input.rnc || null},
      ${input.ncf || null},
      ${input.currency_code || 'DOP'},
      ${input.issue_date || new Date().toISOString().substring(0, 10)},
      ${input.subtotal},
      ${input.itbis},
      ${input.total},
      ${status},
      ${input.image_path || null},
      ${sql.json((input.ocr_raw_json || {}) as any)}
    )
    RETURNING *
  `;

  const receipt = inserted[0];

  // Insertar lineas de detalle si existen
  if (input.items && input.items.length > 0) {
    for (let i = 0; i < input.items.length; i++) {
      const it = input.items[i];
      await sql`
        INSERT INTO receipt_items (
          receipt_id,
          line_number,
          description,
          quantity,
          unit_price,
          subtotal,
          itbis,
          total
        ) VALUES (
          ${receipt.id},
          ${i + 1},
          ${it.description},
          ${it.quantity},
          ${it.unit_price},
          ${it.subtotal},
          ${it.itbis},
          ${it.total}
        )
      `;
    }
  }

  return { ...receipt, is_balanced: isBalanced };
}

export async function getReceipts(
  user: UserSession,
  filters?: {
    status?: number;
    document_type?: number;
    category?: string;
    search?: string;
    from_date?: string;
    to_date?: string;
  }
) {
  const isStaff = user.activeRole.id === 2 || user.activeRole.id === 3; // Contador o Super Admin

  const baseQuery = sql`
    SELECT 
      r.*,
      u.full_name as submitter_name,
      u.email as submitter_email,
      rev.full_name as reviewer_name,
      (SELECT count(*)::int FROM receipt_items WHERE receipt_id = r.id) as items_count,
      (SELECT count(*)::int FROM receipt_comments WHERE receipt_id = r.id) as comments_count,
      (SELECT comment FROM receipt_comments WHERE receipt_id = r.id AND is_accounting_note = true ORDER BY created_at DESC LIMIT 1) as latest_accounting_note
    FROM receipts r
    JOIN users u ON r.user_id = u.id
    LEFT JOIN users rev ON r.reviewer_id = rev.id
    WHERE 1=1
    ${isStaff ? sql`` : sql`AND r.user_id = ${user.id}`}
    ${filters?.status ? sql`AND r.status = ${filters.status}` : sql``}
    ${filters?.document_type ? sql`AND r.document_type = ${filters.document_type}` : sql``}
    ${filters?.category ? sql`AND r.category = ${filters.category}` : sql``}
    ${filters?.from_date ? sql`AND r.issue_date >= ${filters.from_date}` : sql``}
    ${filters?.to_date ? sql`AND r.issue_date <= ${filters.to_date}` : sql``}
    ${filters?.search ? sql`AND (r.merchant_name ILIKE ${'%' + filters.search + '%'} OR r.rnc ILIKE ${'%' + filters.search + '%'} OR r.ncf ILIKE ${'%' + filters.search + '%'})` : sql``}
    ORDER BY r.created_at DESC
  `;

  const rows = await baseQuery;
  return await Promise.all(
    rows.map(async (r: any) => ({
      ...r,
      image_url: r.image_path ? await getReceiptSignedUrl(r.image_path) : null,
    }))
  );
}

export async function getReceiptById(receiptId: string, user: UserSession) {
  const isStaff = user.activeRole.id === 2 || user.activeRole.id === 3;

  const receipts = await sql`
    SELECT 
      r.*,
      u.full_name as submitter_name,
      u.email as submitter_email,
      rev.full_name as reviewer_name
    FROM receipts r
    JOIN users u ON r.user_id = u.id
    LEFT JOIN users rev ON r.reviewer_id = rev.id
    WHERE r.id = ${receiptId}
    ${isStaff ? sql`` : sql`AND r.user_id = ${user.id}`}
  `;

  if (!receipts || receipts.length === 0) return null;
  const receipt = receipts[0];

  const items = await sql`
    SELECT * FROM receipt_items
    WHERE receipt_id = ${receiptId}
    ORDER BY line_number ASC
  `;

  const comments = await sql`
    SELECT rc.*, u.full_name as author_name, u.email as author_email, ur.role_id as author_role
    FROM receipt_comments rc
    JOIN users u ON rc.user_id = u.id
    LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_primary = true
    WHERE rc.receipt_id = ${receiptId}
    ORDER BY rc.created_at ASC
  `;

  const isBalanced = Math.abs(Number(receipt.subtotal) + Number(receipt.itbis) - Number(receipt.total)) < 0.05;
  const imageUrl = receipt.image_path ? await getReceiptSignedUrl(receipt.image_path) : null;

  return {
    ...receipt,
    image_url: imageUrl,
    items,
    comments,
    is_balanced: isBalanced,
  };
}

export async function submitReceipt(receiptId: string, userId: string) {
  const updated = await sql`
    UPDATE receipts
    SET status = 2, updated_at = NOW()
    WHERE id = ${receiptId} AND user_id = ${userId} AND status = 1
    RETURNING *
  `;
  return updated.length > 0 ? updated[0] : null;
}

export async function updateReceipt(
  receiptId: string,
  user: UserSession,
  input: Partial<CreateReceiptInput>
) {
  const isSuperAdmin = user.activeRole.id === 3;
  const rows = await sql`
    SELECT * FROM receipts WHERE id = ${receiptId}
  `;
  if (!rows || rows.length === 0) {
    return null;
  }
  const existing = rows[0];
  if (!isSuperAdmin && existing.user_id !== user.id) {
    throw new Error("No tiene permisos para modificar este comprobante.");
  }
  if (!isSuperAdmin && existing.status !== 1) {
    throw new Error("Solo se pueden editar comprobantes que estén en estado Borrador.");
  }

  const nextDocType = input.document_type ?? existing.document_type;
  const nextCategory = (input.category ?? existing.category ?? "otros").toLowerCase().trim();
  const nextSubtotal = input.subtotal ?? Number(existing.subtotal);
  const nextItbis = input.itbis ?? Number(existing.itbis);
  const nextTotal = input.total ?? Number(existing.total);

  const updated = await sql`
    UPDATE receipts
    SET
      document_type = ${nextDocType},
      category = ${nextCategory},
      merchant_name = ${input.merchant_name ?? existing.merchant_name},
      rnc = ${input.rnc !== undefined ? (input.rnc || null) : existing.rnc},
      ncf = ${input.ncf !== undefined ? (input.ncf || null) : existing.ncf},
      currency_code = ${input.currency_code ?? existing.currency_code},
      issue_date = ${input.issue_date ?? existing.issue_date},
      subtotal = ${nextSubtotal},
      itbis = ${nextItbis},
      total = ${nextTotal},
      updated_at = NOW()
    WHERE id = ${receiptId}
    RETURNING *
  `;

  return updated.length > 0 ? updated[0] : null;
}

export async function deleteReceiptImage(imagePathOrFilename?: string | null) {
  if (!imagePathOrFilename) return;
  try {
    if (imagePathOrFilename.startsWith(`supabase://${STORAGE_BUCKET}/`)) {
      const relPath = imagePathOrFilename.replace(`supabase://${STORAGE_BUCKET}/`, "");
      await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([relPath]);
      return;
    }
    const clean = imagePathOrFilename.replace(/[^a-zA-Z0-9._-]/g, "");
    if (clean) {
      await Deno.remove(`${UPLOADS_DIR}/${clean}`).catch(() => {});
    }
  } catch (err) {
    console.warn("⚠️ No se pudo eliminar la imagen física del comprobante:", err);
  }
}

export async function deleteReceipt(receiptId: string, user: UserSession) {
  const isSuperAdmin = user.activeRole.id === 3;
  const rows = await sql`
    SELECT * FROM receipts WHERE id = ${receiptId}
  `;
  if (!rows || rows.length === 0) {
    return null;
  }
  const existing = rows[0];
  if (!isSuperAdmin && existing.user_id !== user.id) {
    throw new Error("No tiene permisos para eliminar este comprobante.");
  }
  if (!isSuperAdmin && existing.status !== 1) {
    throw new Error("Solo se pueden eliminar comprobantes en estado Borrador.");
  }

  await deleteReceiptImage(existing.image_path);

  const deleted = await sql`
    DELETE FROM receipts
    WHERE id = ${receiptId}
    RETURNING id
  `;
  return deleted.length > 0 ? deleted[0] : null;
}
