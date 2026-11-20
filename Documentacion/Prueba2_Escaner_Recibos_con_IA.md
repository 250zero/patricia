Prueba técnica 2: Escáner de recibos con IA (PWA)

# Prueba técnica 2: Escáner de recibos con IA (PWA)

Nov 19, 2026

## Objetivo y contexto

Construir en 8 horas o menos una PWA móvil donde una persona fotografía un recibo o factura, una IA con visión extrae los datos, el usuario los revisa y se guardan en Supabase junto con la imagen.

Escenario: eres el apoyo de operaciones de una pequeña empresa dominicana. El equipo acumula recibos en el bolsillo y en chats, y a fin de mes nadie sabe cuánto se gastó ni en qué. Tu app debe capturar el recibo en el momento, extraer los datos con IA y dejar un registro ordenado y exportable.

La prueba mide cinco cosas: almacenamiento y seguridad, cámara en una PWA, uso de visión con salida estructurada y validada, diseño de la pantalla de revisión y criterio ante datos dudosos.

## Reglas de la prueba

- Tiempo máximo: 8 horas, incluidos 30 minutos iniciales para leer y escribir un plan.
- Stack: libre en el frontend. Es obligatorio usar Supabase (Postgres, Auth y Storage) y publicar la app en una URL pública.
- IA: puede usar asistentes de código. En la revisión final deberá explicar cada parte de lo que entregó.
- API de IA con visión: Claude, OpenAI o Gemini. La llave nunca va en el navegador; debe vivir en una Edge Function o backend.
- Imágenes de muestra: el evaluador entrega 6 fotos de recibos. No deben contener datos reales de personas.
- Contexto local: moneda por defecto DOP, ITBIS de 18 %, y los campos RNC y NCF aparecen en facturas formales.
- Alcance: es mejor hacer menos funciones y que funcionen que muchas a medias. Lo que no alcance a hacer debe quedar anotado en el README.

Page 1 of 8

Prueba técnica 2: Escáner de recibos con IA (PWA)

## Requerimientos funcionales

La app está completa cuando cumple todos los requerimientos Obligatorios. Los Deseables sirven para diferenciar a los candidatos.

### A. Cuentas y seguridad

| ID | Requerimiento | Criterio de aceptación | Prioridad |
|---|---|---|---|
| RF-01 | Registro e inicio de sesión con Supabase Auth | Un usuario nuevo se registra, cierra sesión y vuelve a entrar | Obligatorio |
| RF-02 | Políticas RLS en las tablas de gastos | El usuario A no ve ni modifica gastos del usuario B, ni llamando la API directamente | Obligatorio |
| RF-03 | Bucket de imágenes privado con políticas de Storage | Las fotos solo se ven con URL firmada y solo las de su dueño | Obligatorio |
| RF-04 | Roles empleado y contador | El contador ve los gastos de todos; el empleado solo los suyos | Deseable |

Page 2 of 8

Prueba técnica 2: Escáner de recibos con IA (PWA)

### B. Captura del recibo

| ID | Requerimiento | Criterio de aceptación | Prioridad |
|---|---|---|---|
| RF-05 | Tomar foto con la cámara del celular o elegir una de la galería | Desde el móvil abre la cámara trasera; si el permiso se niega, ofrece la galería y explica por qué | Obligatorio |
| RF-06 | Vista previa con opción de repetir | El usuario ve la foto antes de procesarla y puede descartarla | Obligatorio |
| RF-07 | Reducir y comprimir la imagen en el cliente antes de subirla | La imagen subida no supera 1600 px por lado ni 1.5 MB | Obligatorio |
| RF-08 | Subir la imagen a Supabase Storage con indicador de progreso | Se ve el avance y el error si la subida falla, con opción de reintentar | Obligatorio |
| RF-09 | Varias fotos o un PDF por gasto | Un recibo largo puede tener 2 o más imágenes | Deseable |

### C. Extracción con IA

| ID | Requerimiento | Criterio de aceptación | Prioridad |
|---|---|---|---|
| RF-10 | Envío de la imagen a un modelo con visión desde una Edge Function o backend | La llave no aparece en el navegador | Obligatorio |
| RF-11 | Campos extraídos: comercio, fecha, moneda, subtotal, impuesto (ITBIS), propina, total, método de pago, RNC y NCF cuando existan | Con un recibo nítido, al menos 7 de esos campos salen correctos | Obligatorio |
| RF-12 | Respuesta en JSON validada contra un esquema (por ejemplo Zod) | Si el JSON es inválido, se reintenta una vez y si falla el gasto queda en estado "requiere revisión" | Obligatorio |
| RF-13 | Categoría sugerida (alimentos, combustible, transporte, oficina, servicios, otros) | Cada gasto llega con una categoría editable | Obligatorio |

Page 3 of 8

Prueba técnica 2: Escáner de recibos con IA (PWA)

| ID | Requerimiento | Criterio de aceptación | Prioridad |
|---|---|---|---|
| RF-14 | Nivel de confianza y campos dudosos resaltados | Los campos con baja confianza se marcan en la pantalla de revisión | Obligatorio |
| RF-15 | Detección de imagen que no es un recibo o es ilegible | Muestra un mensaje claro y deja los campos vacíos; nunca inventa datos | Obligatorio |
| RF-16 | Validación aritmética | Si subtotal + impuesto + propina no coincide con el total, se avisa al usuario | Obligatorio |
| RF-17 | Líneas de detalle (descripción, cantidad, precio) | Se muestran y se guardan en una tabla relacionada | Deseable |

### D. Revisión y guardado

| ID | Requerimiento | Criterio de aceptación | Prioridad |
|---|---|---|---|
| RF-18 | Pantalla de revisión con la imagen junto a un formulario editable precargado | El usuario corrige cualquier campo antes de guardar | Obligatorio |
| RF-19 | Estados del gasto: borrador y confirmado | Solo los confirmados cuentan en los totales | Obligatorio |
| RF-20 | Aviso de posible duplicado | Subir el mismo recibo dos veces (mismo comercio, fecha y total, o misma imagen) muestra una advertencia | Obligatorio |
| RF-21 | Editar y eliminar un gasto | Eliminar también borra la imagen de Storage y pide confirmación | Obligatorio |

### E. Listado y reportes

| ID | Requerimiento | Criterio de aceptación | Prioridad |
|---|---|---|---|
| RF-22 | Lista de gastos con miniatura, comercio, fecha, total y categoría | Se ordena por fecha, de lo más reciente a lo más antiguo | Obligatorio |

Page 4 of 8

Prueba técnica 2: Escáner de recibos con IA (PWA)

| ID | Requerimiento | Criterio de aceptación | Prioridad |
|---|---|---|---|
| RF-23 | Filtros por rango de fechas, categoría y estado, y búsqueda por comercio | Los filtros se combinan entre sí | Obligatorio |
| RF-24 | Detalle del gasto con la imagen ampliable | Se puede hacer zoom en el recibo original | Obligatorio |
| RF-25 | Resumen del mes: total y total por categoría con un gráfico simple | Los números coinciden con la suma de los gastos confirmados | Obligatorio |
| RF-26 | Exportar a CSV el rango seleccionado | El archivo abre bien en Excel con tildes y columnas separadas | Obligatorio |
| RF-27 | Preguntas en lenguaje natural sobre los gastos (agente) | "¿Cuánto gasté en combustible este mes?" responde con una consulta real y segura, no con un número inventado | Deseable |

### F. Móvil y PWA

| ID | Requerimiento | Criterio de aceptación | Prioridad |
|---|---|---|---|
| RF-28 | Diseño mobile-first | Usable en 360 px de ancho, con botones táctiles cómodos | Obligatorio |
| RF-29 | App instalable: manifest, íconos 192 y 512 px, service worker | Se añade a la pantalla de inicio y abre en modo standalone | Obligatorio |
| RF-30 | Modo sin conexión básico | Sin red, la app abre y muestra los gastos ya cargados con un aviso | Obligatorio |
| RF-31 | Cola de captura sin conexión | Una foto tomada sin red se guarda en el dispositivo y se procesa al volver la conexión | Deseable |
| RF-32 | Estados de carga, vacío y error en todas las pantallas | Ninguna pantalla queda en blanco o congelada | Obligatorio |

Page 5 of 8

Prueba técnica 2: Escáner de recibos con IA (PWA)

### G. Despliegue y calidad

| ID | Requerimiento | Criterio de aceptación | Prioridad |
|---|---|---|---|
| RF-33 | Publicación en URL pública | El evaluador abre el enlace desde su celular y la app funciona | Obligatorio |
| RF-34 | Esquema de base de datos versionado en el repositorio | El SQL o las migraciones permiten recrear tablas y políticas desde cero | Obligatorio |
| RF-35 | Control de costos de la IA: límite de tamaño de imagen y de procesamientos por usuario | Un usuario no puede disparar cientos de llamadas seguidas | Deseable |

## Plan de tareas sugerido

Los tiempos son una guía, no una obligación. El candidato decide su propio orden y se evalúa si lo justifica.

### Fase 0: plan (0:00 a 0:30)

- Leer el brief y escribir un plan de una página con lo que hará y lo que dejará fuera
- Crear el repositorio y el proyecto de Supabase con un bucket privado
- Probar la API de visión con una foto de muestra antes de construir la interfaz

### Fase 1: base (0:30 a 1:30)

- Crear el proyecto frontend y conectar Supabase
- Implementar registro, inicio de sesión y rutas protegidas (RF-01)
- Diseñar las tablas (por ejemplo expenses y expense_items) y las políticas RLS y de Storage (RF-02, RF-03)

### Fase 2: captura y almacenamiento (1:30 a 3:30)

- Captura con cámara o galería, vista previa y repetir (RF-05, RF-06)
- Compresión en el cliente y subida a Storage con progreso (RF-07, RF-08)
- Lista de gastos con miniaturas y detalle con zoom (RF-22, RF-24)

Page 6 of 8

Prueba técnica 2: Escáner de recibos con IA (PWA)

- Diseño mobile-first con estados de carga, vacío y error (RF-28, RF-32)

### Fase 3: cambio sorpresa (3:30 a 4:00)

- Recibir el cambio, estimar el impacto y avisar al evaluador qué hará y qué no

### Fase 4: extracción con IA (4:00 a 6:30)

- Edge Function que recibe la imagen y llama al modelo con visión (RF-10)
- Definir el esquema JSON de salida y validarlo, con un reintento (RF-11, RF-12)
- Pantalla de revisión con campos precargados y dudosos resaltados (RF-14, RF-18)
- Validación aritmética, no-recibo y duplicados (RF-15, RF-16, RF-20)
- Categoría sugerida y estados borrador y confirmado (RF-13, RF-19)
- Resumen del mes y exportación a CSV (RF-25, RF-26)

### Fase 5: PWA y despliegue (6:30 a 7:30)

- Manifest, íconos y service worker con modo sin conexión básico (RF-29, RF-30)
- Publicar en URL pública y probar la instalación y la cámara en un celular real (RF-33)

### Fase 6: cierre (7:30 a 8:00)

- README con instrucciones, decisiones y lista de lo que quedó fuera
- Video de 3 a 5 minutos mostrando el flujo completo en el celular
- Crear dos usuarios de prueba para el evaluador

## Cambio sorpresa

A las 3:30 h el evaluador entrega este mensaje, sin avisar antes: "Contabilidad necesita aprobar los gastos antes de que cuenten. Agrega un rol de contador que vea los gastos de todos y pueda aprobarlos o rechazarlos con un comentario."

Alternativas si se quiere variar la prueba:

- Soporte de gastos en USD y DOP con una tasa de cambio editable.
- Varias fotos por gasto.

Page 7 of 8

Prueba técnica 2: Escáner de recibos con IA (PWA)

## Entregables

1. URL pública de la app, probada en un celular.
2. Repositorio Git con el historial de commits y el SQL o las migraciones de tablas, políticas RLS y Storage.
3. README con instrucciones para correrla, decisiones tomadas, y una lista honesta de lo que quedó fuera.
4. Dos usuarios de prueba (con contraseña) para que el evaluador compruebe el aislamiento de datos.
5. Video de 3 a 5 minutos mostrando el flujo completo desde el celular: foto, extracción, revisión, guardado y exportación.
6. Revisión en vivo de 20 minutos: el candidato explica una decisión técnica y hace un cambio pequeño pedido por el evaluador.

Page 8 of 8
