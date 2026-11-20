import { sql } from "../config/db.ts";
import { getReceiptSignedUrl } from "./receipts.service.ts";
import type { UserSession } from "./auth.service.ts";

export interface ReviewReceiptInput {
  action: "approve" | "reject";
  comment?: string;
}

export async function getAccountingInbox(filters?: {
  status?: number;
  document_type?: number;
  search?: string;
  from_date?: string;
  to_date?: string;
}) {
  const query = sql`
    SELECT 
      r.id,
      r.document_type,
      r.merchant_name,
      r.rnc,
      r.ncf,
      r.currency_code,
      r.issue_date,
      r.subtotal,
      r.itbis,
      r.total,
      r.status,
      r.image_path,
      r.created_at,
      u.id as submitter_id,
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
    ${filters?.status ? sql`AND r.status = ${filters.status}` : sql`AND r.status IN (2, 3, 4)`}
    ${filters?.document_type ? sql`AND r.document_type = ${filters.document_type}` : sql``}
    ${filters?.search ? sql`AND (r.merchant_name ILIKE ${'%' + filters.search + '%'} OR r.rnc ILIKE ${'%' + filters.search + '%'} OR r.ncf ILIKE ${'%' + filters.search + '%'})` : sql``}
    ${filters?.from_date ? sql`AND r.issue_date >= ${filters.from_date}` : sql``}
    ${filters?.to_date ? sql`AND r.issue_date <= ${filters.to_date}` : sql``}
    ORDER BY r.created_at DESC
  `;

  const rows = await query;
  return await Promise.all(
    rows.map(async (r: any) => ({
      ...r,
      image_url: r.image_path ? await getReceiptSignedUrl(r.image_path) : null,
    }))
  );
}

export async function reviewReceipt(receiptId: string, reviewer: UserSession, input: ReviewReceiptInput) {
  // 1. Obtener comprobante existente
  const rows = await sql`
    SELECT * FROM receipts WHERE id = ${receiptId}
  `;
  if (!rows || rows.length === 0) {
    throw new Error("Comprobante no encontrado.");
  }
  const receipt = rows[0];

  // 2. Validar Segregacion de Funciones (SoD / Cuatro Ojos)
  const isSuperAdmin = reviewer.activeRole.id === 3;
  if (!isSuperAdmin && receipt.user_id === reviewer.id) {
    throw new Error("Violación de Segregación de Funciones (SoD Cuatro Ojos): Un contador no puede aprobar ni rechazar sus propios comprobantes.");
  }

  const newStatus = input.action === "approve" ? 3 : 4; // 3 = approved, 4 = rejected

  // 3. Actualizar estado y revisor
  const updated = await sql`
    UPDATE receipts
    SET 
      status = ${newStatus},
      reviewer_id = ${reviewer.id},
      reviewed_at = NOW(),
      updated_at = NOW()
    WHERE id = ${receiptId}
    RETURNING *
  `;

  // 4. Registrar comentario contable si fue proporcionado
  if (input.comment && input.comment.trim()) {
    await sql`
      INSERT INTO receipt_comments (
        receipt_id,
        user_id,
        comment,
        is_accounting_note
      ) VALUES (
        ${receiptId},
        ${reviewer.id},
        ${input.comment.trim()},
        true
      )
    `;
  }

  return updated[0];
}

export async function addAccountingComment(receiptId: string, author: UserSession, commentText: string) {
  if (!commentText || !commentText.trim()) {
    throw new Error("El comentario no puede estar vacío.");
  }

  const inserted = await sql`
    INSERT INTO receipt_comments (
      receipt_id,
      user_id,
      comment,
      is_accounting_note
    ) VALUES (
      ${receiptId},
      ${author.id},
      ${commentText.trim()},
      ${author.activeRole.id === 2 || author.activeRole.id === 3}
    )
    RETURNING *
  `;

  return inserted[0];
}

export async function exportAccountingCsv(filters?: {
  from_date?: string;
  to_date?: string;
  document_type?: number;
  status?: number;
}): Promise<string> {
  const records = await sql`
    SELECT 
      r.issue_date,
      CASE WHEN r.document_type = 2 THEN 'Factura' ELSE 'Recibo' END as tipo_documento,
      r.merchant_name,
      COALESCE(r.rnc, 'N/A') as rnc,
      COALESCE(r.ncf, 'N/A') as ncf,
      r.currency_code,
      r.subtotal,
      r.itbis,
      r.total,
      CASE 
        WHEN r.status = 1 THEN 'Borrador'
        WHEN r.status = 2 THEN 'Enviado'
        WHEN r.status = 3 THEN 'Aprobado'
        WHEN r.status = 4 THEN 'Rechazado'
        ELSE 'Desconocido'
      END as estado,
      u.full_name as empleado,
      COALESCE(rev.full_name, 'Sin revisar') as revisor,
      r.created_at
    FROM receipts r
    JOIN users u ON r.user_id = u.id
    LEFT JOIN users rev ON r.reviewer_id = rev.id
    WHERE 1=1
    ${filters?.status ? sql`AND r.status = ${filters.status}` : sql``}
    ${filters?.document_type ? sql`AND r.document_type = ${filters.document_type}` : sql``}
    ${filters?.from_date ? sql`AND r.issue_date >= ${filters.from_date}` : sql``}
    ${filters?.to_date ? sql`AND r.issue_date <= ${filters.to_date}` : sql``}
    ORDER BY r.issue_date DESC, r.created_at DESC
  `;

  // Encabezados con formato DGII / Excel RD
  const headers = [
    "Fecha Emision",
    "Tipo Comprobante",
    "Comercio / Proveedor",
    "RNC",
    "NCF",
    "Moneda",
    "Subtotal",
    "ITBIS (18%)",
    "Total",
    "Estado",
    "Empleado Emisor",
    "Contador Revisor",
  ];

  const rows = records.map((r: Record<string, unknown>) => [
    `"${r.issue_date}"`,
    `"${r.tipo_documento}"`,
    `"${String(r.merchant_name).replace(/"/g, '""')}"`,
    `"${r.rnc}"`,
    `"${r.ncf}"`,
    `"${r.currency_code}"`,
    Number(r.subtotal).toFixed(2),
    Number(r.itbis).toFixed(2),
    Number(r.total).toFixed(2),
    `"${r.estado}"`,
    `"${String(r.empleado).replace(/"/g, '""')}"`,
    `"${String(r.revisor).replace(/"/g, '""')}"`,
  ]);

  // UTF-8 BOM (\uFEFF) para garantizar apertura correcta de caracteres y acentos en Excel Windows
  const bom = "\uFEFF";
  const csvContent = [headers.join(","), ...rows.map((row: string[]) => row.join(","))].join("\r\n");

  return bom + csvContent;
}
