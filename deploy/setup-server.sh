#!/usr/bin/env bash
set -e

DOMAIN="patricia.vis7ar.com"
API_DOMAIN="api.patricia.vis7ar.com"
APP_DIR="/var/www/${DOMAIN}"

echo "=========================================="
echo "🚀 Aprovisionando Patricia en Visar (0 Docker)"
echo "   Dominio Frontend: ${DOMAIN}"
echo "   Dominio Backend:  ${API_DOMAIN}"
echo "   Puerto Deno:      3002"
echo "=========================================="

# 1. Verificar o instalar Deno
if ! command -v deno &> /dev/null; then
    echo "[1/5] Instalando Deno..."
    curl -fsSL https://deno.land/install.sh | sh
    export DENO_INSTALL="/root/.deno"
    export PATH="$DENO_INSTALL/bin:$PATH"
    echo 'export DENO_INSTALL="/root/.deno"' >> /root/.bashrc
    echo 'export PATH="$DENO_INSTALL/bin:$PATH"' >> /root/.bashrc
else
    echo "[1/5] Deno ya está disponible: $(deno --version | head -n 1)"
fi

# 2. Asegurar directorios de la aplicación
echo "[2/5] Verificando directorios en ${APP_DIR}..."
mkdir -p "${APP_DIR}/dist/patricia/browser"
mkdir -p "${APP_DIR}/backend"
mkdir -p "${APP_DIR}/deploy"
mkdir -p "${APP_DIR}/logs"

# 3. Configurar Virtual Host en Nginx
echo "[3/5] Configurando Virtual Host Nginx..."
cp /var/www/${DOMAIN}/deploy/patricia.vis7ar.com.conf /etc/nginx/sites-available/${DOMAIN}
ln -sf /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-enabled/${DOMAIN}

nginx -t
systemctl reload nginx

# 4. Configurar e Habilitar Servicio Systemd de Backend (Puerto 3002)
echo "[4/5] Configurando servicio systemd para Backend Deno (patricia-backend)..."
cp /var/www/${DOMAIN}/deploy/patricia-backend.service /etc/systemd/system/patricia-backend.service
systemctl daemon-reload
systemctl enable patricia-backend
if [ -f "${APP_DIR}/backend/main.ts" ]; then
    systemctl restart patricia-backend
    echo "Servicio patricia-backend reiniciado."
else
    echo "Aún no existe main.ts en backend, servicio habilitado para cuando se despliegue."
fi

# 5. Obtener Certificados SSL con Certbot (Let's Encrypt)
echo "[5/5] Gestionando certificados SSL Let's Encrypt para ${DOMAIN} y ${API_DOMAIN}..."
if command -v certbot &> /dev/null; then
    certbot --nginx -d "${DOMAIN}" -d "${API_DOMAIN}" --non-interactive --agree-tos --register-unsafely-without-email || true
else
    echo "Instalando Certbot..."
    apt-get update && apt-get install -y certbot python3-certbot-nginx
    certbot --nginx -d "${DOMAIN}" -d "${API_DOMAIN}" --non-interactive --agree-tos --register-unsafely-without-email || true
fi

echo "=========================================="
echo "🎉 Aprovisionamiento de Patricia completado!"
echo "   PWA: https://${DOMAIN}"
echo "   API: https://${API_DOMAIN}"
echo "=========================================="
