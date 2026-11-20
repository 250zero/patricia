-- =====================================================================
-- Patricia Migration 0002_accountant_approval.sql — SoD Cuatro Ojos y RLS
-- =====================================================================

-- Compatibilidad universal: Crea schema auth y funcion uid() solo si no existen
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
        EXECUTE 'CREATE SCHEMA auth';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'auth' AND p.proname = 'uid') THEN
        EXECUTE $fn$
            CREATE FUNCTION auth.uid() RETURNS UUID AS $body$
            BEGIN
                RETURN NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID;
            EXCEPTION WHEN OTHERS THEN
                RETURN NULL;
            END;
            $body$ LANGUAGE plpgsql STABLE;
        $fn$;
    END IF;
END;
$$;

-- Habilitar RLS en tablas transaccionales (el backend como servicio de aplicacion gobierna con BYPASSRLS)
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
   IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'patricia_user') THEN
      ALTER ROLE patricia_user BYPASSRLS;
   END IF;
END
$$;

-- 1. Politicas para Receipts
-- Los usuarios regulares ven sus propios recibos; Contadores y Super Admins ven todos
DROP POLICY IF EXISTS receipts_select_policy ON receipts;
CREATE POLICY receipts_select_policy ON receipts
    FOR SELECT
    USING (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() AND ur.role_id IN (2, 3)
        )
    );

DROP POLICY IF EXISTS receipts_insert_policy ON receipts;
CREATE POLICY receipts_insert_policy ON receipts
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS receipts_update_policy ON receipts;
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
