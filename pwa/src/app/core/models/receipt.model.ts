export type DocumentType = 1 | 2; // 1 = Recibo, 2 = Factura
export type ReceiptStatus = 1 | 2 | 3 | 4; // 1 = Borrador, 2 = Enviado, 3 = Aprobado, 4 = Rechazado
export type ReceiptListItem = Receipt;

export interface ReceiptItem {
  id?: string;
  receipt_id?: string;
  line_number: number;
  description: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  itbis: number;
  total: number;
}

export interface ReceiptComment {
  id: string;
  receipt_id: string;
  user_id: string;
  author_name: string;
  author_email: string;
  author_role?: number;
  comment: string;
  is_accounting_note: boolean;
  created_at: string;
}

export interface Receipt {
  id: string;
  user_id: string;
  submitter_name?: string;
  submitter_email?: string;
  reviewer_name?: string;
  document_type: DocumentType;
  merchant_name: string;
  rnc: string | null;
  ncf: string | null;
  currency_code: string;
  issue_date: string;
  subtotal: number;
  itbis: number;
  total: number;
  status: ReceiptStatus;
  image_path: string | null;
  image_url?: string | null;
  items_count?: number;
  comments_count?: number;
  latest_accounting_note?: string | null;
  items?: ReceiptItem[];
  comments?: ReceiptComment[];
  is_balanced?: boolean;
  created_at: string;
  updated_at?: string;
}
