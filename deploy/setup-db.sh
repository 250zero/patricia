#!/usr/bin/env bash
set -e

echo "=== Configurando y Migrando Base de Datos PostgreSQL para Patricia en Visar ==="

sudo -u postgres psql << 'EOF'
DO $$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'patricia_user') THEN
      CREATE ROLE patricia_user WITH LOGIN PASSWORD 'PatriciaSecure2026!';
   END IF;
END
$$;

SELECT 'CREATE DATABASE patricia_db OWNER patricia_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'patricia_db')\gexec

GRANT ALL PRIVILEGES ON DATABASE patricia_db TO patricia_user;
ALTER DATABASE patricia_db OWNER TO patricia_user;
EOF

echo "--- Aplicando Migracion 0001_init.sql ---"
sudo -u postgres psql -d patricia_db -f /var/www/patricia.vis7ar.com/supabase/migrations/0001_init.sql

echo "--- Aplicando Migracion 0002_accountant_approval.sql ---"
sudo -u postgres psql -d patricia_db -f /var/www/patricia.vis7ar.com/supabase/migrations/0002_accountant_approval.sql

echo "--- Sembrando Roles, Permisos y los 4 Usuarios Iniciales (seed.sql) ---"
sudo -u postgres psql -d patricia_db -f /var/www/patricia.vis7ar.com/supabase/seed.sql

echo "--- Concediendo permisos a patricia_user ---"
sudo -u postgres psql -d patricia_db << 'EOF'
GRANT ALL ON ALL TABLES IN SCHEMA public TO patricia_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO patricia_user;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO patricia_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO patricia_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO patricia_user;
EOF

echo "--- Verificando Tablas y Usuarios Creados ---"
sudo -u postgres psql -d patricia_db -c "SELECT email, full_name, is_active FROM users ORDER BY created_at;"
sudo -u postgres psql -d patricia_db -c "SELECT r.name as rol, count(ur.user_id) as usuarios FROM roles r LEFT JOIN user_roles ur ON r.id = ur.role_id GROUP BY r.id, r.name ORDER BY r.id;"

echo "✅ Migraciones y Seeds de Patricia completados al 100% en PostgreSQL!"
