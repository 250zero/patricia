import { sql } from "../config/db.ts";
import type { ExtractedReceiptData } from "./gemini.service.ts";
import type { UserSession } from "./auth.service.ts";

const UPLOADS_DIR = Deno.env.get("UPLOADS_DIR") || "./uploads/receipts";

// Asegurar carpeta de almacenamiento de comprobantes
export async function ensureUploadsDir() {
  try {
    await Deno.mkdir(UPLOADS_DIR, { recursive: true });
  } catch {
    // Ya existe
  }
}

export async function saveReceiptImage(fileBytes: Uint8Array, extension = "jpg"): Promise<string> {
  await ensureUploadsDir();
  const filename = `${crypto.randomUUID()}.${extension}`;
  const filePath = `${UPLOADS_DIR}/${filename}`;
  await Deno.writeFile(filePath, fileBytes);
  return filename;
}

export async function getReceiptImageBytes(filename: string): Promise<Uint8Array | null> {
  try {
    const clean = filename.replace(/[^a-zA-Z0-9._-]/g, "");
    return await Deno.readFile(`${UPLOADS_DIR}/${clean}`);
  } catch {
    return null;
  }
}

export interface CreateReceiptInput {
  merchant_name: string;
  rnc?: string | null;
  ncf?: string | null;
  document_type: 1 | 2; // 1 = recibo, 2 = factura
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

export async function createReceipt(input: CreateReceiptInput, userId: string) {
  const isBalanced = Math.abs(input.subtotal + input.itbis - input.total) < 0.05;
  const status = input.status || 1; // Por defecto draft

  const inserted = await sql`
    INSERT INTO receipts (
      user_id,
      document_type,
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

export async function getReceipts(user: UserSession, filters?: { status?: number; document_type?: number; search?: string }) {
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
    ${filters?.search ? sql`AND (r.merchant_name ILIKE ${'%' + filters.search + '%'} OR r.rnc ILIKE ${'%' + filters.search + '%'} OR r.ncf ILIKE ${'%' + filters.search + '%'})` : sql``}
    ORDER BY r.created_at DESC
  `;

  return await baseQuery;
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

  return {
    ...receipt,
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
