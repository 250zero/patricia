-- =====================================================================
-- Patricia Migration 0002_accountant_approval.sql — SoD Cuatro Ojos y RLS
-- =====================================================================

-- Habilitar RLS en tablas transaccionales
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Politicas para Receipts
-- Los usuarios regulares ven sus propios recibos; Contadores y Super Admins ven todos
CREATE POLICY receipts_select_policy ON receipts
    FOR SELECT
    USING (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() AND ur.role_id IN (2, 3)
        )
    );

CREATE POLICY receipts_insert_policy ON receipts
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY receipts_update_policy ON receipts
    FOR UPDATE
    USING (
        -- El creador puede actualizar si esta en borrador
        (auth.uid() = user_id AND status = 1)
        -- O un Contador/Super Admin puede dictaminar (cambiar estado)
        OR EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() AND ur.role_id IN (2, 3)
        )
    );

-- Regla de Segregacion de Funciones (SoD Cuatro Ojos):
-- Un usuario NO puede revisarse (aprobar o rechazar) sus propios comprobantes,
-- a menos que sea Super Admin (Rol 3) para casos extraordinarios de contadores.
CREATE OR REPLACE FUNCTION check_sod_review_rule()
RETURNS TRIGGER AS $$
DECLARE
    is_super_admin BOOLEAN;
BEGIN
    IF NEW.status IN (3, 4) AND OLD.status <> NEW.status THEN
        -- Verificar si el revisor es Super Admin
        SELECT EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = NEW.reviewer_id AND ur.role_id = 3
        ) INTO is_super_admin;

        IF NOT is_super_admin AND NEW.user_id = NEW.reviewer_id THEN
            RAISE EXCEPTION 'Violacion de SoD (Cuatro Ojos): Un contador no puede aprobar ni rechazar sus propios comprobantes.'
                USING ERRCODE = '23514';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_sod_review ON receipts;
CREATE TRIGGER trg_check_sod_review
    BEFORE UPDATE ON receipts
    FOR EACH ROW
    WHEN (NEW.status IN (3, 4))
    EXECUTE FUNCTION check_sod_review_rule();
