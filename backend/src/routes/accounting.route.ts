import { Hono, type Context } from "hono";
import { authMiddleware, requireRole } from "../middleware/auth.middleware.ts";
import {
  getAccountingInbox,
  reviewReceipt,
  addAccountingComment,
  exportAccountingCsv,
} from "../services/accounting.service.ts";
import type { UserSession } from "../services/auth.service.ts";

export const accountingRouter = new Hono();

// Todos los endpoints de Contabilidad requieren rol de Contador (2) o Super Admin (3)
accountingRouter.use("*", authMiddleware(), requireRole(2, 3));

// GET /api/v1/accounting/inbox — Bandeja contable
accountingRouter.get("/inbox", async (c: Context) => {
  try {
    const status = c.req.query("status") ? parseInt(c.req.query("status")!, 10) : undefined;
    const documentType = c.req.query("document_type") ? parseInt(c.req.query("document_type")!, 10) : undefined;
    const search = c.req.query("search");
    const fromDate = c.req.query("from_date");
    const toDate = c.req.query("to_date");

    const receipts = await getAccountingInbox({
      status,
      document_type: documentType,
      search,
      from_date: fromDate,
      to_date: toDate,
    });

    return c.json({ receipts });
  } catch (err: unknown) {
    console.error("Error al consultar bandeja contable:", err);
    return c.json({ error: "Error al cargar bandeja contable." }, 500);
  }
});

// POST /api/v1/accounting/:id/review — Dictaminar comprobante (Aprobar o Rechazar con SoD)
accountingRouter.post("/:id/review", async (c: Context) => {
  try {
    const user = c.get("user") as UserSession;
    const id = c.req.param("id")!;
    const body = await c.req.json();

    if (!body.action || !["approve", "reject"].includes(body.action)) {
      return c.json({ error: "Acción inválida. Debe ser 'approve' o 'reject'." }, 400);
    }

    const updated = await reviewReceipt(id, user, {
      action: body.action,
      comment: body.comment,
    });

    c.set("auditEntityId", id);
    c.set("auditEntityType", "accounting_review");

    return c.json({ success: true, receipt: updated });
  } catch (err: unknown) {
    console.error("Error al dictaminar comprobante:", err);
    const msg = err instanceof Error ? err.message : String(err);
    const statusCode = msg.includes("SoD") ? 403 : 500;
    return c.json({ error: msg }, statusCode);
  }
});

// POST /api/v1/accounting/:id/comments — Anotar comentario contable visible en Gastos
accountingRouter.post("/:id/comments", async (c: Context) => {
  try {
    const user = c.get("user") as UserSession;
    const id = c.req.param("id")!;
    const body = await c.req.json();

    if (!body.comment || !body.comment.trim()) {
      return c.json({ error: "El comentario no puede estar vacío." }, 400);
    }

    const comment = await addAccountingComment(id, user, body.comment);
    return c.json({ success: true, comment }, 201);
  } catch (err: unknown) {
    console.error("Error al registrar comentario contable:", err);
    return c.json({ error: "Error al guardar comentario contable." }, 500);
  }
});

// GET /api/v1/accounting/export — Exportación a CSV con UTF-8 BOM
accountingRouter.get("/export", async (c: Context) => {
  try {
    const fromDate = c.req.query("from_date");
    const toDate = c.req.query("to_date");
    const documentType = c.req.query("document_type") ? parseInt(c.req.query("document_type")!, 10) : undefined;
    const status = c.req.query("status") ? parseInt(c.req.query("status")!, 10) : undefined;

    const csvData = await exportAccountingCsv({
      from_date: fromDate,
      to_date: toDate,
      document_type: documentType,
      status,
    });

    const dateStr = new Date().toISOString().substring(0, 10);
    const filename = `patricia_libros_contables_${dateStr}.csv`;

    return new Response(csvData, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (err: unknown) {
    console.error("Error al exportar CSV contable:", err);
    return c.json({ error: "Error al generar archivo CSV." }, 500);
  }
});
