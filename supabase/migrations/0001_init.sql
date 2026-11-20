-- =====================================================================
-- Patricia Migration 0001_init.sql — Esquema 5FN, Seguridad y Roles
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Tabla de Usuarios
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabla de Roles (1 = Empleado, 2 = Contador, 3 = Super Admin)
CREATE TABLE IF NOT EXISTS roles (
    id SMALLINT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT
);

-- 3. Tabla de Permisos Granulares
CREATE TABLE IF NOT EXISTS permissions (
    id SMALLINT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT
);

-- 4. Asignacion Rol-Permiso
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id SMALLINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id SMALLINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 5. Asignacion Usuario-Rol (Multi-Rol con Rol Primario)
CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id SMALLINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (user_id, role_id)
);

-- 6. Tabla de Comprobantes (Recibos y Facturas)
-- document_type: 1 = recibo, 2 = factura
-- status: 1 = draft, 2 = submitted, 3 = approved, 4 = rejected
CREATE TABLE IF NOT EXISTS receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    document_type SMALLINT NOT NULL CHECK (document_type IN (1, 2)),
    merchant_name VARCHAR(255) NOT NULL,
    rnc VARCHAR(20),
    ncf VARCHAR(25),
    currency_code CHAR(3) NOT NULL DEFAULT 'DOP',
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    itbis NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    status SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (1, 2, 3, 4)),
    image_path TEXT,
    ocr_raw_json JSONB,
    reviewer_id UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Lineas de Detalle de Comprobante
CREATE TABLE IF NOT EXISTS receipt_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
    line_number SMALLINT NOT NULL,
    description TEXT NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
    unit_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    itbis NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Comentarios y Notas Contables (Sincronizados a Gastos)
CREATE TABLE IF NOT EXISTS receipt_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    comment TEXT NOT NULL,
    is_accounting_note BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Auditoria Desacoplada (IP nativa inet, User-Agent, cero triggers)
CREATE TABLE IF NOT EXISTS receipt_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    actor_id UUID REFERENCES users(id),
    client_ip INET,
    user_agent TEXT,
    changes JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices para alto rendimiento
CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_status ON receipts(status);
CREATE INDEX IF NOT EXISTS idx_receipts_document_type ON receipts(document_type);
CREATE INDEX IF NOT EXISTS idx_receipt_comments_receipt_id ON receipt_comments(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_audit_logs_entity ON receipt_audit_logs(entity_type, entity_id);
