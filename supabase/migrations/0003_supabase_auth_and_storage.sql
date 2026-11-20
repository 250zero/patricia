-- ==============================================================================
-- Migración 0003: Supabase Auth & Storage Integration para Patricia
-- ==============================================================================

-- 1. Crear Bucket Privado para Comprobantes Fiscales y Facturas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'receipts',
    'receipts',
    false,
    10485760, -- 10 MB límite por imagen
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];

-- 2. Políticas de Acceso RLS en Storage para Comprobantes (RLS ya está activo por defecto en Supabase)
DROP POLICY IF EXISTS "Usuarios autenticados suben comprobantes a receipts" ON storage.objects;
CREATE POLICY "Usuarios autenticados suben comprobantes a receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'receipts'
);

DROP POLICY IF EXISTS "Empleados y Contadores leen comprobantes de receipts" ON storage.objects;
CREATE POLICY "Empleados y Contadores leen comprobantes de receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'receipts'
);

-- 4. Trigger de Auto-Confirmación de Correo en auth.users (sin necesidad de SMTP)
CREATE OR REPLACE FUNCTION public.auto_confirm_auth_user()
RETURNS TRIGGER AS $$
BEGIN
    NEW.email_confirmed_at := COALESCE(NEW.email_confirmed_at, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_confirm_auth_user ON auth.users;
CREATE TRIGGER trg_auto_confirm_auth_user
    BEFORE INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_auth_user();

-- 5. Función de Sincronización Automática entre auth.users y public.users
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role_id INT;
    v_full_name TEXT;
BEGIN
    -- Extraer nombre y rol desde metadatos de usuario de Supabase Auth
    v_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'fullName',
        split_part(NEW.email, '@', 1)
    );
    
    -- Determinar rol: si el email contiene admin -> 3 (Super Admin); contador -> 2; de lo contrario -> 1 (Empleado)
    IF NEW.email ILIKE '%admin%' THEN
        v_role_id := 3;
    ELSIF NEW.email ILIKE '%contador%' THEN
        v_role_id := 2;
    ELSE
        v_role_id := COALESCE(
            (NEW.raw_user_meta_data->>'role_id')::INT,
            (NEW.raw_user_meta_data->>'roleId')::INT,
            1 -- 1 = Empleado
        );
    END IF;

    -- Insertar o actualizar en la tabla de dominio public.users
    INSERT INTO public.users (id, email, full_name, password_hash, is_active)
    VALUES (NEW.id, NEW.email, v_full_name, 'SUPABASE_AUTH', true)
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name;

    -- Asignar rol correspondiente en public.user_roles si no existe
    INSERT INTO public.user_roles (user_id, role_id, is_primary)
    VALUES (NEW.id, v_role_id, true)
    ON CONFLICT (user_id, role_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 6. Concesión de Permisos a Roles de Supabase
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated, service_role;
