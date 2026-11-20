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

1. **Captura Fotográfica Mobile-First e IA Multimodal:**
   - Ingesta de recibos y facturas físicas desde la cámara del teléfono o subida de archivos (PNG, JPG, WebP).
   - Extracción de datos en tiempo real mediante **Google Gemini Flash**: Nombre del emisor, RNC/Cédula, NCF/e-CF, Fecha, Subtotal, ITBIS (18%), Total, desglose de líneas de detalle y clasificación automática del gasto.
2. **Validación Fiscal DGII Estricta:**
   - Algoritmo de verificación de **RNC por Módulo 11** ponderado.
   - Detección y tipado de formatos oficiales DGII: **Facturas de Crédito Fiscal (`B01`)**, Comprobantes Gubernamentales (`B15`), Gastos Menores (`B13`) y comprobantes electrónicos **e-CF (`E31`)**.
   - Cuadre aritmético contable automatizado: `Subtotal + ITBIS (18%) == Total` con tolerancia de redondeo de `±0.05 DOP`.
3. **Bandeja de Revisión Contable y Visor Fotográfico:**
   - Bandeja exclusiva para el Contador con filtros por estado (`Pendiente`, `Aprobado`, `Rechazado`), búsqueda de proveedores y rangos de fecha.
   - Visor de imagen integrado con **zoom incremental (1x a 3x)** y **rotación continua a 90°** para auditoría visual cómoda de comprobantes rotados o arrugados.
4. **Segregación de Funciones (SoD / Cuatro Ojos) con Doble Candado:**
   - Ningún usuario (incluyendo contadores o administradores) puede aprobar un comprobante que él mismo haya registrado.
   - Doble blindaje: Validación a nivel de aplicación en el servicio Deno (`403 Forbidden`) y a nivel relacional con trigger nativo en PostgreSQL (`trg_check_sod_review`).
5. **Comunicación Bidireccional de Observaciones:**
   - El contador puede ingresar comentarios o motivos de rechazo en cada comprobante.
   - Los empleados visualizan dichos comentarios directamente en su historial de gastos sin fricción.
6. **Exportación Financiera Compatible con Microsoft Excel:**
   - Generación de reportes tabulares en formato CSV con el prefijo obligatorio **UTF-8 BOM (`\uFEFF`)**, evitando problemas de codificación de caracteres en español (acentos, 'ñ', símbolos monetarios).
7. **PWA Instalable y Funcionamiento Offline-First:**
   - Service Worker seguro (`sw.js`) y `manifest.webmanifest` con iconos en múltiples densidades (192px, 512px, maskable).
   - Caché local mediante IndexedDB con banner reactivo de pérdida y recuperación de conectividad.
8. **Bitácora de Auditoría Super Admin:**
   - Panel en tiempo real de trazabilidad que registra método HTTP, ruta, estatus, usuario ejecutor, dirección IP real almacenada en tipo nativo `inet` de PostgreSQL y marca de tiempo.

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
| `GET` | `/api/v1/health` | Pública | Estado de salud del servicio, timestamp y versión. |
| `POST` | `/api/v1/auth/login` | Pública | Login con credenciales; emite JWT con roles y permisos. |
| `GET` | `/api/v1/auth/me` | Bearer Token | Retorna el perfil del usuario autenticado y sus permisos activos. |
| `POST` | `/api/v1/auth/logout` | Bearer Token | Revocación y cierre de sesión. |
| `POST` | `/api/v1/receipts/extract` | Bearer Token | Procesa fotografía mediante Gemini Flash y devuelve datos estructurados. |
| `POST` | `/api/v1/receipts` | Bearer Token | Guarda un comprobante y sus líneas de detalle en la base de datos. |
| `GET` | `/api/v1/receipts` | Bearer Token | Lista comprobantes del usuario con filtros por estado y fecha. |
| `GET` | `/api/v1/receipts/:id` | Bearer Token | Ficha detallada de un comprobante con líneas, imagen y comentarios. |
| `POST` | `/api/v1/receipts/:id/comments` | Bearer Token | Añade un comentario contable u observación al comprobante. |
| `GET` | `/api/v1/accounting/inbox` | Rol Contador | Bandeja de revisión contable de comprobantes enviados por empleados. |
| `POST` | `/api/v1/accounting/review` | Rol Contador | Dictamina comprobante (Aprobar/Rechazar) validando el candado SoD. |
| `GET` | `/api/v1/accounting/export/csv` | Rol Contador | Exporta reporte consolidado en CSV con codificación UTF-8 BOM. |
| `GET` | `/api/v1/users` | Rol Super Admin | Lista completa de colaboradores y roles asignados. |
| `GET` | `/api/v1/audit-logs` | Rol Super Admin | Bitácora en tiempo real con IP real `inet`, método, ruta y usuario. |

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

## 🔮 9. Roadmap de Producto y Futuros Features

Para las próximas versiones de la plataforma Patricia se proyectan las siguientes extensiones funcionales de alto valor empresarial:
1. **Integración Nativa con Servicios Web de Facturación Electrónica DGII (e-CF):** Conexión directa mediante certificados digitales X.509 para consulta de TrackID y estatus de aprobación de comprobantes fiscales emitidos.
2. **Notificaciones Push Multicanal (Web Push / WhatsApp Business):** Alertas inmediatas a empleados cuando un comprobante es observado o rechazado por el contador, y recordatorios preventivos de cierre contable mensual.
3. **OCR Multi-Página y Procesamiento Asíncrono de PDFs:** Pipeline con workers de fondo para desglose y conciliación de facturas corporativas multi-página, órdenes de compra y estados de cuenta en PDF.
4. **Sincronización Bidireccional con ERPs (SAP, Odoo, Dynamics 365, QuickBooks):** Exportación automatizada de pólizas y asientos de diario contable mediante webhooks transaccionales y conectores REST/GraphQL.
5. **Geolocalización y Detección Automática de Viáticos:** Registro automático de coordenadas GPS durante la captura fotográfica para cotejar gastos de transporte, dietas y combustible contra políticas de kilometraje corporativo.
6. **Presupuestos y Alertas de Desviación por Centro de Costos:** Asignación de techos presupuestarios por departamento o proyecto con alertas preventivas al alcanzar el 80% del límite mensual.

---

## ⚡ 10. Mejoras Posibles y Optimizaciones de Arquitectura

1. **Caché Distribuido de Alto Rendimiento (Redis / Dragonfly):** Almacenamiento en memoria de catálogos contables, tasas de cambio oficiales del Banco Central (BCRD) y validaciones frecuentes de RNC para reducir la latencia de lectura en PostgreSQL.
2. **Cola de Mensajería Transaccional con Workers (RabbitMQ / PostgreSQL LISTEN/NOTIFY):** Desacoplar la ingestión pesada y preprocesamiento de imágenes hacia workers dedicados con reintentos exponenciales y Dead Letter Queues (DLQ).
3. **Preprocesamiento de Imágenes en el Edge (WebAssembly / Sharp en Navegador):** Compresión inteligente, auto-rotación por orientación EXIF y binarización adaptativa directamente en el dispositivo móvil antes de la transferencia HTTP, reduciendo drásticamente el consumo de datos celulares.
4. **Detección de Gastos Duplicados y Fraude con Embeddings (`pgvector`):** Vectores de similitud perceptual e informacional para detectar automáticamente recibos fotografiados más de una vez por distintos colaboradores o proveedores duplicados.
5. **Auditoría Avanzada con Trazabilidad Inmutable (WORM):** Sellado criptográfico periódico de `receipt_audit_logs` con hash encadenado SHA-256 hacia almacenamiento inmutable para cumplimiento normativo internacional (SOX / NIIF).

---

## 📄 11. Licencia y Gobernanza

Desarrollado bajo estándares empresariales de arquitectura limpia, patrones de alta disponibilidad y mejores prácticas de ingeniería de software para gestión financiera y cumplimiento fiscal conforme a los lineamientos corporativos de Visar.