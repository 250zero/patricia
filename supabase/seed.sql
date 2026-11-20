-- =====================================================================
-- Patricia Seed Data (seed.sql) — Roles, Permisos y 4 Usuarios Iniciales
-- Idempotente (ON CONFLICT DO NOTHING / UPDATE)
-- =====================================================================

-- 1. Roles Fijos
INSERT INTO roles (id, name, description) VALUES
    (1, 'Empleado', 'Captura comprobantes, edita borradores y envia a revision'),
    (2, 'Contador', 'Revisa recibos/facturas, inspecciona capturas, anota comentarios y aprueba/rechaza'),
    (3, 'Super Admin', 'Administrador maestro con acceso irrestricto, gestion de usuarios y resolucion SoD')
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- 2. Permisos Granulares
INSERT INTO permissions (id, code, description) VALUES
    (1, 'receipts:create', 'Permiso para capturar y crear comprobantes'),
    (2, 'receipts:edit', 'Permiso para editar comprobantes en borrador'),
    (3, 'receipts:view', 'Permiso para visualizar sus propios comprobantes'),
    (4, 'accounting:review', 'Permiso para bandeja contable y dictamen (aprobar/rechazar)'),
    (5, 'accounting:comment', 'Permiso para agregar notas y comentarios contables'),
    (6, 'accounting:export', 'Permiso para exportar libros auxiliares a CSV'),
    (7, 'users:manage', 'Permiso para crear y gestionar usuarios y permisos')
ON CONFLICT (id) DO UPDATE SET 
    code = EXCLUDED.code,
    description = EXCLUDED.description;

-- 3. Mapeo de Permisos a Roles
-- Empleado (1)
INSERT INTO role_permissions (role_id, permission_id) VALUES
    (1, 1), (1, 2), (1, 3)
ON CONFLICT DO NOTHING;

-- Contador (2)
INSERT INTO role_permissions (role_id, permission_id) VALUES
    (2, 1), (2, 2), (2, 3), (2, 4), (2, 5), (2, 6)
ON CONFLICT DO NOTHING;

-- Super Admin (3): Todos los permisos
INSERT INTO role_permissions (role_id, permission_id) VALUES
    (3, 1), (3, 2), (3, 3), (3, 4), (3, 5), (3, 6), (3, 7)
ON CONFLICT DO NOTHING;

-- 4. Creacion de los 4 Usuarios del Sistema (Contraseñas hasheadas fijas: 'Patricia2026!')
-- Password hash generado con bcrypt: $2b$10$wK1bYg84T5iL1K1jGj5tUuLhGgP1tZt4B5R7z0c8u1r9V3s0x4T1G (o placeholder seguro)
INSERT INTO users (id, email, full_name, password_hash, is_active) VALUES
    ('00000000-0000-0000-0000-000000000001', 'admin@patricia.vis7ar.com', 'Adalberto SuperAdmin', '$2b$10$EPb8tQZfHkM9xJ3qM7Jt9edpYtM4mU8Q1nZ8fP5eX2y9v6r3s0x4T', true),
    ('00000000-0000-0000-0000-000000000002', 'contador@patricia.vis7ar.com', 'Lic. Carmen Contadora', '$2b$10$EPb8tQZfHkM9xJ3qM7Jt9edpYtM4mU8Q1nZ8fP5eX2y9v6r3s0x4T', true),
    ('00000000-0000-0000-0000-000000000003', 'empleado1@patricia.vis7ar.com', 'Juan Empleado Ventas', '$2b$10$EPb8tQZfHkM9xJ3qM7Jt9edpYtM4mU8Q1nZ8fP5eX2y9v6r3s0x4T', true),
    ('00000000-0000-0000-0000-000000000004', 'empleado2@patricia.vis7ar.com', 'Maria Empleada Compras', '$2b$10$EPb8tQZfHkM9xJ3qM7Jt9edpYtM4mU8Q1nZ8fP5eX2y9v6r3s0x4T', true)
ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    is_active = EXCLUDED.is_active;

-- 5. Asignacion de Roles a los 4 Usuarios
INSERT INTO user_roles (user_id, role_id, is_primary) VALUES
    ('00000000-0000-0000-0000-000000000001', 3, true), -- Super Admin
    ('00000000-0000-0000-0000-000000000002', 2, true), -- Contador
    ('00000000-0000-0000-0000-000000000003', 1, true), -- Empleado 1
    ('00000000-0000-0000-0000-000000000004', 1, true)  -- Empleado 2
ON CONFLICT (user_id, role_id) DO NOTHING;
