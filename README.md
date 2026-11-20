# 🧾 Patricia — Escáner Inteligente de Facturas y Recibos con IA

> **Patricia:** Solución corporativa PWA Mobile-First para captura y escaneo inteligente de facturas y comprobantes fiscales DGII mediante Inteligencia Artificial Multimodal (Google Gemini Flash), validación algorítmica de RNC Módulo 11, bandeja contable con Segregación de Funciones (SoD / Cuatro Ojos) y arquitectura de alta concurrencia sobre Deno y PostgreSQL en 5FN.

[![Producción en Vivo](https://img.shields.io/badge/Producci%C3%B3n-patricia.vis7ar.com-059669?style=for-the-badge&logo=googlechrome&logoColor=white)](https://patricia.vis7ar.com)
[![API Health](https://img.shields.io/badge/API%20Health-200%20OK-blue?style=for-the-badge&logo=deno&logoColor=white)](https://patricia.vis7ar.com/api/v1/health)
[![Backend Runtime](https://img.shields.io/badge/Backend-Deno%202.x%20%2B%20Hono-black?style=for-the-badge&logo=deno&logoColor=white)](https://deno.com)
[![Frontend](https://img.shields.io/badge/Frontend-Angular%2019%20PWA-dd0031?style=for-the-badge&logo=angular&logoColor=white)](https://angular.dev)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%205FN-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)

---

## 🚀 1. Enlaces y Accesos a Producción

La plataforma se encuentra desplegada y operativa en alta disponibilidad sobre el servidor cloud Visar:

* **Frontend Web & PWA:** [https://patricia.vis7ar.com](https://patricia.vis7ar.com)
* **API Backend (Deno BFF):** [https://patricia.vis7ar.com/api/v1/health](https://patricia.vis7ar.com/api/v1/health)
* **Servidor Host:** Droplet Ubuntu Linux en Visar (`159.203.103.8`, puerto interno `3002` bajo reverse proxy Nginx con SSL Certbot).

---

## 👥 2. Credenciales y Matriz de Acceso (Usuarios Sembrados)

El sistema cuenta con **4 usuarios precargados** para cubrir la matriz completa de roles, permisos y validaciones de Segregación de Funciones:

| Rol | Usuario | Contraseña | Capacidades y Alcance |
| :--- | :--- | :--- | :--- |
| 👑 **Super Admin** | `admin@patricia.vis7ar.com` | `Patricia2026!` | Acceso maestro (`*:*`), gestión de usuarios y roles (`/users`), acceso exclusivo a la **Bitácora de Auditoría en Tiempo Real** con IP real (`inet`), y resolución de contingencias. |
| 💼 **Contador** | `contador@patricia.vis7ar.com` | `Patricia2026!` | Bandeja contable (`/accounting`), **Visor fotográfico con zoom y rotación 90°**, inserción de comentarios contables, dictamen (Aprobar/Rechazar) con **bloqueo estricto de auto-aprobación SoD**, y exportación **CSV con UTF-8 BOM**. |
| 👤 **Empleado 1** | `empleado1@patricia.vis7ar.com` | `Patricia2026!` | Captura con cámara/archivo (`/capture`), extracción con IA Gemini Flash, listado de gastos (`/expenses`) con **comentarios contables visibles**. |
| 👤 **Empleado 2** | `empleado2@patricia.vis7ar.com` | `Patricia2026!` | Captura y consulta de comprobantes propios para escenarios multi-usuario. |

> *Nota:* La pantalla de inicio de sesión dispone de botones de acceso rápido que rellenan automáticamente las credenciales de cada rol con un solo clic.

---

## 🎯 3. Características Principales del Producto

1. **Registro e Inicio de Sesión con Supabase Auth (`RF-01`):**
   - Pantalla dual de **Iniciar Sesión** y **Crear Cuenta** conectada a Supabase Auth, más botones de acceso rápido para pruebas multi-rol.
2. **Captura Fotográfica Mobile-First, Compresión en Cliente e IA Multimodal (`RF-05` a `RF-17`):**
   - Captura desde cámara trasera del teléfono o galería, previsualización y **compresión automática en el cliente mediante `<canvas>`** (máximo `1600 px` por lado en JPEG `< 1.5 MB`) con barra de progreso real e historial de reducción.
   - Extracción en tiempo real mediante **Google Gemini Flash** (cascada de modelos multimodales): Nombre del emisor, RNC/Cédula, NCF/e-CF, Fecha, **Categoría sugerida editable** (`alimentos`, `combustible`, `transporte`, `oficina`, `servicios`, `otros`), Subtotal, ITBIS (18%), Total y desglose de líneas de detalle (`receipt_items`).
   - Detección automática de **posibles duplicados** (mismo comercio, fecha y total), comprobantes borrosos e imágenes que no son recibos (`confidence_score`).
3. **Validación Fiscal DGII Estricta:**
   - Algoritmo de verificación de **RNC por Módulo 11** ponderado.
   - Clasificación entre **Recibo Informal** (omite RNC/NCF opcionales) y **Factura Fiscal** (`B01`, `B13`, `B15`, `E31`), más cuadre aritmético reactivo (`Subtotal + ITBIS == Total`, tolerancia `±0.05 DOP`).
4. **Historial de Gastos, Resumen Mensual y Edición/Eliminación (`RF-21` a `RF-25`):**
   - Tarjeta de **Resumen Mensual por Categoría** con barras de distribución porcentual, miniaturas ampliables con zoom, buscador combinable por comercio/RNC/NCF/categoría/estado/fechas, y edición o eliminación de borradores (limpiando el objeto físico en Supabase Storage).
5. **Bandeja de Revisión Contable y Visor Fotográfico con URLs Firmadas (`RF-03`, `CS-01`):**
   - Bandeja exclusiva para el Contador con filtros combinables (`Pendiente`, `Aprobado`, `Rechazado`, categoría, fechas y búsqueda).
   - Visor con **URLs firmadas directas de Supabase Storage**, **zoom incremental** y **rotación de 90°**, más bloqueo de botones y `textarea` en modo solo lectura una vez emitido el dictamen.
6. **Segregación de Funciones (SoD / Cuatro Ojos) con Doble Candado:**
   - Ningún usuario (incluyendo contadores) puede aprobar un comprobante que él mismo haya registrado.
   - Doble blindaje: Validación a nivel de aplicación en el servicio Deno (`403 Forbidden`) y a nivel relacional con trigger nativo en PostgreSQL (`trg_check_sod_review`).
7. **Comunicación Bidireccional y Exportación CSV Compatible con Excel (`RF-26`):**
   - Comentarios contables sincronizados en la vista de Gastos del empleado y descarga autenticada de reportes CSV filtrados con prefijo **UTF-8 BOM (`\uFEFF`)**.
8. **PWA Instalable, Offline-First y Bitácora Super Admin:**
   - Service Worker (`sw.js`), `manifest.webmanifest`, caché local en IndexedDB con banner de red, y bitácora en tiempo real para Super Admin con IP nativa `inet`.

---

## 🏛️ 4. Arquitectura del Sistema y Stack Tecnológico

### Diagrama de Arquitectura de Producción:
```
                      ┌───────────────────────────────────────┐
                      │    Navegador / Celular (PWA)          │
                      │    https://patricia.vis7ar.com        │
                      └──────────────────┬────────────────────┘
                                         │ HTTPS (443)
                                         ▼
                      ┌───────────────────────────────────────┐
                      │         Nginx Reverse Proxy           │
                      │    (Servidor Visar 159.203.103.8)     │
                      └──────────┬─────────────────┬──────────┘
                                 │                 │
                Estáticos PWA    │                 │ Proxy /api/v1/*
               (/var/www/...)    ▼                 ▼ (Puerto 3002)
                      ┌──────────────────┐  ┌─────────────────────────┐
                      │  Angular 19 PWA  │  │   Deno + Hono Backend   │
                      │ Standalone+OnPush│  │(patricia-backend.service│
                      └──────────────────┘  └──────────────┬──────────┘
                                                           │
                                ┌──────────────────────────┴──────────────────────────┐
                                │                                                     │
                                ▼                                                     ▼
                ┌───────────────────────────────┐                     ┌───────────────────────────────┐
                │     PostgreSQL en 5FN         │                     │  Google Gemini Flash API      │
                │  (patricia_db / Supabase)     │                     │  (Extracción Multimodal IA)   │
                └───────────────────────────────┘                     └───────────────────────────────┘
```

### Componentes del Stack:
* **Frontend:** Angular 19.2 (Standalone Components, Signals, `ChangeDetectionStrategy.OnPush`, Tailwind CSS 3.4, PWA Service Worker).
* **Backend:** Deno 2.x, Framework Hono 4.6, Web Crypto API nativa (`crypto.subtle` para tokens JWT HS256), Zod para validación de contratos.
* **Base de Datos:** PostgreSQL en 5FN (Quinta Forma Normal), tipos optimizados (`inet`, `smallint`, `numeric(12,2)`), Row Level Security (RLS) y Triggers transaccionales.
* **Inteligencia Artificial:** Google Gemini Flash (`gemini-3.8-flash`) para análisis de visión y estructuración JSON de comprobantes.
* **Infraestructura:** Servidor Ubuntu Linux en Visar, Nginx 1.26, Systemd y Certbot SSL (Let's Encrypt).

### Decisiones Arquitectónicas Clave (ADRs):
1. **ADR-001: Runtime Deno 2.x + Hono para el BFF**
   - *Decisión:* Prescindir de Node.js en backend para aprovechar el sandbox seguro por permisos de Deno, ejecución directa de TypeScript sin transpilación previa, consumo mínimo de RAM (~35 MB) y arranque instantáneo (<30 ms).
2. **ADR-002: Base de Datos Relacional en 5FN**
   - *Decisión:* Separación estricta entre comprobantes (`receipts`), líneas de detalle (`receipt_items`), comentarios (`receipt_comments`), roles (`roles`), permisos (`permissions`) y auditoría (`receipt_audit_logs`). Enums mapeados a enteros `smallint` (`1=Recibo Informal, 2=Factura Fiscal; 1=Borrador, 2=Enviado, 3=Aprobado, 4=Rechazado`).
3. **ADR-003: Autenticación WebCrypto Nativa HMAC-SHA256**
   - *Decisión:* Cero dependencias externas para la firma y verificación de tokens JWT, utilizando directamente `crypto.subtle` de la Web Crypto API estándar.
4. **ADR-004: Segregación de Funciones (SoD) con Doble Candado**
   - *Decisión:* Validación en capa de aplicación (`accounting.service.ts`) con respuesta `403 Forbidden`, complementada con un Trigger en PostgreSQL (`trg_check_sod_review`) que aborta cualquier intento de auto-aprobación a nivel de base de datos.

---

## 💻 5. Guía de Configuración y Ejecución en Local (Paso a Paso)

Sigue estos pasos para clonar, configurar y ejecutar el proyecto completo en tu entorno de desarrollo local.

### Prerrequisitos del Sistema:
* **Deno:** Versión 2.x instalada ([instalar Deno](https://deno.land)).
* **Node.js:** Versión 20+ y `npm` ([instalar Node](https://nodejs.org)) para la compilación y herramientas de desarrollo de Angular.
* **PostgreSQL:** Versión 15+ local o un proyecto en Supabase Cloud.
* **Git:** Para clonar el repositorio.

---

### Paso 1: Clonar el Repositorio
```bash
git clone https://github.com/250zero/patricia.git
cd patricia
```

---

### Paso 2: Configuración de Variables de Entorno (`.env`)
Copia la plantilla de ejemplo `.env.example` para generar tu archivo `.env` en la raíz del proyecto:

```bash
# En Windows (PowerShell):
Copy-Item .env.example .env

# En Linux / macOS:
cp .env.example .env
```

Edita el archivo `.env` configurando tus credenciales locales o de base de datos:

| Variable | Descripción | Ejemplo / Valor por Defecto |
| :--- | :--- | :--- |
| `PORT` | Puerto de escucha del backend Deno | `3002` |
| `DATABASE_URL` | Cadena de conexión directa a PostgreSQL | `postgresql://postgres:tu_password@localhost:5432/patricia_db` |
| `SUPABASE_URL` | URL de API Supabase (opcional si usas Postgres local) | `https://tu-proyecto.supabase.co` |
| `SUPABASE_ANON_KEY` | Clave anónima pública de Supabase | `tu_supabase_anon_key` |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio de Supabase | `tu_supabase_service_role_key` |
| `LLM_PROVIDER` | Proveedor del modelo de IA multimodal | `gemini` |
| `LLM_API_KEY` | Llave de API de Google AI Studio / Gemini | `tu_gemini_api_key` |
| `JWT_SECRET` | Clave secreta para la firma WebCrypto de JWT | `patricia-secret-dev-2026-financial-audit` |

---

### Paso 3: Inicialización de la Base de Datos y Semillas (Seeds)

Crea la base de datos `patricia_db` y aplica las migraciones SQL en orden:

```bash
# 1. Crear base de datos local
psql -U postgres -c "CREATE DATABASE patricia_db;"

# 2. Aplicar Migración DDL Inicial (tablas, RLS, triggers)
psql -U postgres -d patricia_db -f supabase/migrations/0001_init.sql

# 3. Aplicar Migración de Aprobación Contable y Comentarios
psql -U postgres -d patricia_db -f supabase/migrations/0002_accountant_approval.sql

# 4. Sembrar Roles, Permisos y los 4 Usuarios Demo
psql -U postgres -d patricia_db -f supabase/seed.sql
```

*(Alternativamente, si usas Supabase CLI: ejecuta `npx supabase db push`)*.

---

### Paso 4: Ejecutar el Backend en Deno (BFF)

Abre una terminal en la raíz del proyecto y arranca el backend con recarga automática:

```bash
cd backend
deno task dev
```

El servidor iniciará en el puerto configurado:
```
[Patricia Backend] Escuchando en http://localhost:3002
```

Puedes verificar su estado ejecutando:
```bash
curl http://localhost:3002/api/v1/health
# Respuesta: {"status":"healthy","service":"patricia-backend",...}
```

---

### Paso 5: Ejecutar el Frontend Angular 19 PWA

En una segunda terminal, dirígete a la carpeta `pwa`, instala las dependencias de npm e inicia el servidor de desarrollo:

```bash
cd pwa
npm install
npm start
```

El comando `npm start` ejecuta automáticamente `ng serve --proxy-config proxy.conf.json`. Todas las peticiones a `/api/*` se redirigirán de manera transparente hacia el backend en `http://localhost:3002`.

Abre tu navegador en:
👉 **[http://localhost:4200](http://localhost:4200)**

---

### Paso 6: Verificación Integral del Entorno Local
1. Ingresa a `http://localhost:4200` y haz clic en el botón de acceso rápido **Contador** o **Empleado 1**.
2. En la vista **Captura**, sube cualquier fotografía de recibo o factura para observar la extracción en tiempo real con IA.
3. Inicia sesión como **Contador** para verificar la bandeja contable, abrir el visor fotográfico con rotación y comprobar el bloqueo estricto de auto-aprobación SoD.

---

## 🧪 6. Suite de Pruebas Automatizadas

El proyecto incluye pruebas automatizadas que cubren las reglas fiscales dominicanas, criptografía nativa y lógica de negocio:

```bash
# Ejecutar suite de pruebas en Deno desde la raíz
deno test --config backend/deno.json tests/unit_and_integration.test.ts
```

### Cobertura de la Suite de Pruebas:
* ✅ **DGII:** Validación de RNC por algoritmo Módulo 11 (ponderación oficial).
* ✅ **DGII:** Validación de estructura formal de comprobantes NCF (`B01`) y electrónicos e-CF (`E31`).
* ✅ **Contabilidad:** Cuadre Aritmético Subtotal + ITBIS (18%) == Total general con tolerancia de centavos.
* ✅ **Seguridad SoD:** Bloqueo inmutable de auto-aprobación del revisor contable (Principio de Cuatro Ojos).
* ✅ **Seguridad Auth:** Emisión, firma y verificación de tokens JWT con WebCrypto nativo sin dependencias de Node.
* ✅ **Reportes:** Prefijo UTF-8 BOM (`\uFEFF`) en exportación CSV para compatibilidad nativa con Microsoft Excel.

---

## 🌐 7. Catálogo de Endpoints de la API Backend

Todos los endpoints de negocio operan bajo el prefijo `/api/v1/`:

| Método | Endpoint | Protección | Descripción |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/health` | Pública | Estado de salud del servicio, conexión PostgreSQL y timestamp. |
| `POST` | `/api/v1/auth/register` | Pública | Registro de nuevo usuario en Supabase Auth con rol inicial Empleado (`1`). |
| `POST` | `/api/v1/auth/login` | Pública | Login con credenciales; emite JWT (Supabase / WebCrypto) con roles y permisos. |
| `GET` | `/api/v1/auth/me` | Bearer Token | Retorna el perfil del usuario autenticado y sus permisos activos. |
| `POST` | `/api/v1/auth/switch-role` | Bearer Token | Cambia el rol activo del usuario entre sus roles asignados. |
| `POST` | `/api/v1/receipts/process-image` | Bearer Token | Sube la foto comprimida a Supabase Storage, invoca Gemini Flash OCR, sugiere categoría y alerta posibles duplicados. |
| `POST` | `/api/v1/receipts` | Bearer Token | Guarda un comprobante con su categoría y líneas de detalle en PostgreSQL. |
| `GET` | `/api/v1/receipts` | Bearer Token | Lista comprobantes con filtros combinables (`status`, `document_type`, `category`, `search`, `from_date`, `to_date`) y URLs firmadas. |
| `GET` | `/api/v1/receipts/:id` | Bearer Token | Ficha detallada de un comprobante con líneas, URL firmada (`image_url`) y comentarios. |
| `PUT` | `/api/v1/receipts/:id` | Bearer Token | Actualiza datos de un comprobante en estado Borrador (`status = 1`). |
| `DELETE` | `/api/v1/receipts/:id` | Bearer Token | Elimina un borrador y remueve su archivo físico de Supabase Storage / disco. |
| `POST` | `/api/v1/receipts/:id/submit` | Bearer Token | Envía un borrador a la bandeja de Contabilidad (`status = 2`). |
| `GET` | `/api/v1/receipts/:id/image` | Bearer Token | Redirige (`302`) a la URL firmada de Supabase Storage o sirve el binario local. |
| `GET` | `/api/v1/accounting/inbox` | Rol Contador / Admin | Bandeja de revisión contable con filtros combinables y URLs firmadas. |
| `POST` | `/api/v1/accounting/:id/review` | Rol Contador / Admin | Dictamina comprobante (`approve`/`reject`) validando el candado SoD Cuatro Ojos. |
| `POST` | `/api/v1/accounting/:id/comments` | Rol Contador / Admin | Añade un comentario contable u observación sincronizada a Gastos. |
| `GET` | `/api/v1/accounting/export` | Rol Contador / Admin | Exporta el rango y filtros seleccionados a CSV con codificación UTF-8 BOM. |
| `GET` | `/api/v1/users` | Rol Super Admin | Lista completa de colaboradores y roles asignados. |
| `PATCH` | `/api/v1/users/:id/role` | Rol Super Admin | Actualiza el rol primario asignado a un usuario. |
| `GET` | `/api/v1/users/audit-logs` | Rol Super Admin | Bitácora en tiempo real con IP real `inet`, método, ruta y usuario. |

---

## 🛠️ 8. Guía de Despliegue en Servidor de Producción (Visar / Linux)

### Prerrequisitos en el Servidor Visar:
* Servidor Ubuntu Linux (`159.203.103.8`) con Nginx, Deno 2.x y PostgreSQL instalados.
* Llave SSH autorizada en `~/.ssh/id_ed25519_visar`.
* Certificados SSL gestionados mediante Certbot.

### Despliegue Automatizado en 1 Solo Paso:
Ejecuta desde la raíz del proyecto en PowerShell:
```powershell
powershell -ExecutionPolicy Bypass -File scripts\deploy-visar.ps1
```

Este script ejecuta de manera orquestada:
1. Compilación de producción de Angular PWA (`npm run build -- --configuration production`).
2. Sincronización de estáticos en `/var/www/patricia.vis7ar.com/dist/patricia/browser/`.
3. Sincronización del backend Deno y variables `.env` en `/var/www/patricia.vis7ar.com/backend/`.
4. Recarga del servicio systemd `/etc/systemd/system/patricia-backend.service`.
5. Verificación de sintaxis y recarga de Nginx (`nginx -t && systemctl reload nginx`).

### Comandos de Operación y Monitoreo en el Servidor:
```bash
# Ver estado del servicio backend
systemctl status patricia-backend

# Monitorear logs en vivo del backend
journalctl -u patricia-backend -f

# Reiniciar servicio
systemctl restart patricia-backend

# Comprobar salud local por socket HTTP
curl -s http://127.0.0.1:3002/api/v1/health
```

---

## 🔮 9. Roadmap de Producto y Futuros Features (Pendientes Identificados)

### Pendientes Funcionales del Alcance (Backlog Priorizado):
1. **Soporte Multi-Imagen y PDF Multipágina por Gasto (`RF-09`):** Permitir adjuntar 2 o más fotografías por un mismo comprobante extenso mediante una tabla relacional `receipt_attachments` vinculada a Supabase Storage.
2. **Agente Conversacional para Consultas sobre Gastos (`RF-27`):** Asistente en lenguaje natural (*"¿Cuánto gasté en combustible este mes?"*) respaldado por tool-calling SQL seguro sobre PostgreSQL.
3. **Cola de Captura Offline con Sincronización Automática (`RF-31`):** Almacenamiento de fotografías en `IndexedDB` cuando el usuario no tiene señal móvil y subida diferida automática vía *Background Sync API* al recuperar conexión.
4. **Extracción Explícita de Propina Legal (10%) y Método de Pago (`RF-11` granular):** Desglose separado de propina legal y medio de pago (`Efectivo`, `Tarjeta`, `Transferencia`) dentro del formulario de revisión y la exportación contable.

### Evolución Corporativa de Producto:
5. **Integración Nativa con Servicios Web de Facturación Electrónica DGII (e-CF):** Conexión directa mediante certificados digitales X.509 para consulta de TrackID y estatus de aprobación de comprobantes fiscales emitidos.
6. **Notificaciones Push Multicanal (Web Push / WhatsApp Business):** Alertas inmediatas a empleados cuando un comprobante es observado o rechazado por el contador, y recordatorios preventivos de cierre contable mensual.
7. **Sincronización Bidireccional con ERPs (SAP, Odoo, Dynamics 365, QuickBooks):** Exportación automatizada de pólizas y asientos de diario contable mediante webhooks transaccionales y conectores REST/GraphQL.
8. **Geolocalización y Presupuestos por Centro de Costos:** Registro opcional de coordenadas GPS en viáticos/combustible y techos presupuestarios por departamento con alertas preventivas al 80 %.

---

## ⚡ 10. Mejoras Posibles, Auditoría de Seguridad y Optimizaciones de Arquitectura

### 🛡️ Hallazgos de la Auditoría de Seguridad y Puntos de Mejora (Hardening):
Como resultado de la revisión de seguridad estática sobre el backend Deno, la configuración de Supabase y el cliente Angular PWA, se identificaron los siguientes puntos de endurecimiento prioritario para paso a operación bancaria/corporativa estricta:

1. **SEC-P01 — Eliminación de Credenciales de Contingencia y Hash Fuerte de Contraseñas:**
   - *Hallazgo actual:* El fallback relacional en `backend/src/routes/auth.route.ts` acepta claves sembradas demo (`"Patricia2026!"` / `"password123"`) y utiliza un `JWT_SECRET` con valor por defecto de respaldo en `backend/src/services/auth.service.ts`.
   - *Mejora obligatoria:* En producción estricta, deshabilitar cualquier fallback local de contraseña plana una vez validado Supabase Auth, exigir verificación criptográfica con **Argon2id/bcrypt** y validar al arranque (`fail-fast`) la existencia de un `JWT_SECRET` de al menos 256 bits.
2. **SEC-P02 — Rate Limiting y Control de Cuotas / Costos de IA (`RF-35`):**
   - *Hallazgo actual:* No existe un limitador de peticiones por usuario o IP ante llamadas repetitivas al endpoint `/api/v1/auth/login` (fuerza bruta) ni en `/api/v1/receipts/process-image` (consumo excesivo de cuota Gemini).
   - *Mejora obligatoria:* Incorporar middleware de Rate Limiting distribuido (ej. ventana deslizante en Redis o tabla de cuotas por usuario en Postgres) limitando intentos de login por IP y procesamientos OCR diarios por usuario.
3. **SEC-P03 — Endurecimiento de Bucket Privado y Separación de `SUPABASE_SERVICE_ROLE_KEY` (`RF-03`):**
   - *Hallazgo actual:* En `.env` de entorno, `SUPABASE_SERVICE_ROLE_KEY` comparte el valor de clave pública (`sb_publishable_...`), lo que obligó a habilitar políticas amplias en `storage.objects` (`bucket_id = 'receipts'`) y `public = true` en el bucket.
   - *Mejora obligatoria:* Configurar la llave privada `service_role` exclusivamente en el servidor Deno, devolver el bucket `receipts` a `public = false` y restringir las políticas RLS de `storage.objects` al propietario por ruta `(storage.foldername(name))[1] = auth.uid()::text` o roles Contador/Admin, sirviendo imágenes únicamente mediante `createSignedUrl` de vida corta.
4. **SEC-P04 — Protección contra XSS/CSRF y Cabeceras de Seguridad HTTP:**
   - *Hallazgo actual:* El frontend almacena el token JWT y perfil en `localStorage` (`patricia_auth_token`). Un posible ataque XSS podría leerlo.
   - *Mejora obligatoria:* Migrar la sesión hacia cookies `HttpOnly; Secure; SameSite=Strict` emitidas por el BFF Deno e inyectar cabeceras `Content-Security-Policy (CSP)`, `Strict-Transport-Security (HSTS)` y `X-Frame-Options: DENY` en Nginx/Hono.
5. **SEC-P05 — Validación Estricta de Orígenes CORS y Longitud en Bitácora de Auditoría:**
   - *Hallazgo actual:* `backend/main.ts` valida CORS mediante `origin.includes("vis7ar.com")` (lo cual aceptaría un subdominio malicioso que contenga esa cadena como substring); además, rutas largas superaron ocasionalmente `receipt_audit_logs.action VARCHAR(50)` (`SQLSTATE 22001`).
   - *Mejora obligatoria:* Reemplazar la verificación de subcadena por un `Set` exacto de orígenes permitidos o regex anclado (`/^https:\/\/([a-z0-9-]+\.)?vis7ar\.com$/`), y ampliar `receipt_audit_logs.action` a `VARCHAR(150)`.

### ⚙️ Optimizaciones de Arquitectura y Escalabilidad:
1. **Caché Distribuido de Alto Rendimiento (Redis / Dragonfly):** Almacenamiento en memoria de catálogos contables, tasas de cambio oficiales del Banco Central (BCRD) y validaciones frecuentes de RNC para reducir la latencia de lectura en PostgreSQL.
2. **Cola de Mensajería Transaccional con Workers (PostgreSQL LISTEN/NOTIFY o RabbitMQ):** Desacoplar el procesamiento pesado hacia workers dedicados con reintentos exponenciales y Dead Letter Queues (DLQ).
3. **Auto-rotación EXIF y Binarización Adaptativa en WebAssembly:** Enderezar automáticamente fotos tomadas en vertical/horizontal mediante lectura de cabeceras EXIF en el navegador antes del envío.
4. **Detección Perceptual Avanzada con Embeddings (`pgvector`):** Complementar la detección actual `(comercio, fecha, total)` con embeddings visuales para detectar comprobantes fotografiados dos veces desde distinto ángulo.
5. **Auditoría Inmutable (WORM):** Sellado criptográfico periódico de `receipt_audit_logs` con hash encadenado SHA-256 para cumplimiento normativo corporativo (SOX / NIIF).

---

## 📄 11. Licencia y Gobernanza

Desarrollado bajo estándares empresariales de arquitectura limpia, patrones de alta disponibilidad y mejores prácticas de ingeniería de software para gestión financiera y cumplimiento fiscal conforme a los lineamientos corporativos de Visar.