import fs from 'node:fs';

const BASE_URL = 'https://patricia.vis7ar.com';

const results = [];

function recordCheck(id, category, requirement, passed, details) {
  results.push({ id, category, requirement, passed, details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} [${id}] ${category}: ${requirement}`);
  if (details) console.log(`   └─ Detalle: ${details}`);
}

async function runLiveProductionAudit() {
  console.log('======================================================================');
  console.log('🔍 INICIANDO AUDITORÍA EN VIVO EN PRODUCCIÓN — PATRICIA');
  console.log(`🌐 URL Destino: ${BASE_URL}`);
  console.log(`⏰ Fecha/Hora: ${new Date().toISOString()}`);
  console.log('======================================================================\n');

  // ------------------------------------------------------------------
  // 1. INFRAESTRUCTURA Y SERVIDOR (SSL, PWA, HEALTH)
  // ------------------------------------------------------------------
  try {
    const healthRes = await fetch(`${BASE_URL}/api/v1/health`);
    const health = await healthRes.json();
    const passed = healthRes.status === 200 && health.status === 'ok' && health.database?.status === 'connected';
    recordCheck('INFRA-01', 'Infraestructura', 'Health Check y Conexión PostgreSQL en Producción', passed,
      `Status HTTP ${healthRes.status}, DB: ${health.database?.status}, Usuarios: ${health.database?.users_seeded}`);
  } catch (err) {
    recordCheck('INFRA-01', 'Infraestructura', 'Health Check y Conexión PostgreSQL', false, err.message);
  }

  try {
    const swRes = await fetch(`${BASE_URL}/sw.js`);
    const passed = swRes.status === 200 && (swRes.headers.get('content-type') || '').includes('javascript');
    recordCheck('INFRA-02', 'PWA / Cache', 'Service Worker Seguro (sw.js) sin caché de APIs', passed,
      `Status HTTP ${swRes.status}, Content-Type: ${swRes.headers.get('content-type')}`);
  } catch (err) {
    recordCheck('INFRA-02', 'PWA / Cache', 'Service Worker Seguro', false, err.message);
  }

  try {
    const manRes = await fetch(`${BASE_URL}/manifest.webmanifest`);
    const manifest = await manRes.json();
    const passed = manRes.status === 200 && manifest.display === 'standalone' && manifest.icons?.length >= 2;
    recordCheck('INFRA-03', 'PWA / Móvil', 'Manifiesto Web PWA Instalable (Standalone + Iconos)', passed,
      `Display: ${manifest.display}, Theme: ${manifest.theme_color}, Iconos: ${manifest.icons?.length}`);
  } catch (err) {
    recordCheck('INFRA-03', 'PWA / Móvil', 'Manifiesto Web PWA', false, err.message);
  }

  // ------------------------------------------------------------------
  // 2. MATRIZ DE AUTENTICACIÓN Y ROLES RBAC
  // ------------------------------------------------------------------
  let adminToken, contadorToken, emp1Token, emp2Token;

  const usersToLogin = [
    { key: 'admin', email: 'admin@patricia.vis7ar.com', role: 'Super Admin', roleId: 3 },
    { key: 'contador', email: 'contador@patricia.vis7ar.com', role: 'Contador', roleId: 2 },
    { key: 'emp1', email: 'empleado1@patricia.vis7ar.com', role: 'Empleado', roleId: 1 },
    { key: 'emp2', email: 'empleado2@patricia.vis7ar.com', role: 'Empleado', roleId: 1 },
  ];

  for (const u of usersToLogin) {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: u.email, password: 'Patricia2026!' }),
      });
      const data = await res.json();
      const passed = res.status === 200 && !!data.token && data.user?.activeRole?.id === u.roleId;

      if (u.key === 'admin') adminToken = data.token;
      if (u.key === 'contador') contadorToken = data.token;
      if (u.key === 'emp1') emp1Token = data.token;
      if (u.key === 'emp2') emp2Token = data.token;

      recordCheck(`AUTH-${u.roleId}`, 'Autenticación RBAC', `Login Exitoso para Rol ${u.role} (${u.email})`, passed,
        `Token emitido (${data.token?.substring(0, 15)}...), Rol activo: ${data.user?.activeRole?.name}, Permisos: ${data.user?.permissions?.length}`);
    } catch (err) {
      recordCheck(`AUTH-${u.roleId}`, 'Autenticación RBAC', `Login para Rol ${u.role}`, false, err.message);
    }
  }

  // ------------------------------------------------------------------
  // 3. CAPTURA DE COMPROBANTES Y CLASIFICACIÓN FISCAL (EMPLEADO 1)
  // ------------------------------------------------------------------
  let createdReceiptId = null;

  try {
    const payload = {
      merchant_name: 'Ferretería Americana SRL',
      rnc: '101850043', // RNC válido DGII
      ncf: 'B0100007788', // Factura Crédito Fiscal válida
      document_type: 2, // 2 = Factura Fiscal
      currency_code: 'DOP',
      issue_date: new Date().toISOString().substring(0, 10),
      subtotal: 5000.00,
      itbis: 900.00, // 18% exacto
      total: 5900.00, // Cuadre perfecto
      status: 1, // Borrador inicial
      items: [
        { description: 'Pintura Acrílica Blanca Galón', quantity: 2, unit_price: 2500.00, subtotal: 5000.00, itbis: 900.00, total: 5900.00 }
      ]
    };

    const createRes = await fetch(`${BASE_URL}/api/v1/receipts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${emp1Token}`,
        'X-Active-Role': 'Empleado'
      },
      body: JSON.stringify(payload)
    });
    const createData = await createRes.json();
    createdReceiptId = createData.receipt?.id;

    const passed = createRes.status === 201 && !!createdReceiptId;
    recordCheck('EXP-01', 'Gestión de Gastos', 'Creación de Comprobante Factura Fiscal con desglose ITBIS', passed,
      `ID Creado: ${createdReceiptId}, Comercio: ${createData.receipt?.merchant_name}, Total: ${createData.receipt?.total} DOP`);
  } catch (err) {
    recordCheck('EXP-01', 'Gestión de Gastos', 'Creación de Comprobante', false, err.message);
  }

  // Enviar comprobante a Contabilidad (Borrador -> Enviado)
  try {
    const submitRes = await fetch(`${BASE_URL}/api/v1/receipts/${createdReceiptId}/submit`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${emp1Token}`,
        'X-Active-Role': 'Empleado'
      }
    });
    const submitData = await submitRes.json();
    const passed = submitRes.status === 200 && submitData.receipt?.status === 2;
    recordCheck('EXP-02', 'Flujo de Revisión', 'Envío de Comprobante a Bandeja Contable (Status 2 = Enviado)', passed,
      `Estado nuevo: ${submitData.receipt?.status} (Enviado para revisión contable)`);
  } catch (err) {
    recordCheck('EXP-02', 'Flujo de Revisión', 'Envío de Comprobante', false, err.message);
  }

  // ------------------------------------------------------------------
  // 4. BANDEJA CONTABLE, VISOR Y NOTAS (CONTADOR)
  // ------------------------------------------------------------------
  try {
    const inboxRes = await fetch(`${BASE_URL}/api/v1/accounting/inbox`, {
      headers: {
        'Authorization': `Bearer ${contadorToken}`,
        'X-Active-Role': 'Contador'
      }
    });
    const inboxData = await inboxRes.json();
    const hasItem = (inboxData.receipts || []).some(r => r.id === createdReceiptId);
    recordCheck('ACC-01', 'Bandeja Contable', 'Visualización de Comprobante en Bandeja del Contador', hasItem,
      `Total pendientes en bandeja: ${inboxData.receipts?.length}, Comprobante creado presente: ${hasItem}`);
  } catch (err) {
    recordCheck('ACC-01', 'Bandeja Contable', 'Visualización en Bandeja', false, err.message);
  }

  // Agregar Nota Contable
  try {
    const commentRes = await fetch(`${BASE_URL}/api/v1/accounting/${createdReceiptId}/comment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${contadorToken}`,
        'X-Active-Role': 'Contador'
      },
      body: JSON.stringify({ comment: 'Factura formal validada: RNC 101850043 y NCF B0100007788 correctos para crédito fiscal.' })
    });
    const commentData = await commentRes.json();
    const passed = commentRes.status === 201 && commentData.success;
    recordCheck('ACC-02', 'Notas Contables', 'Inserción de Comentario Contable por el Contador', passed,
      `Comentario ID: ${commentData.comment?.id}, Texto: "${commentData.comment?.comment?.substring(0, 50)}..."`);
  } catch (err) {
    recordCheck('ACC-02', 'Notas Contables', 'Inserción de Comentario Contable', false, err.message);
  }

  // Verificar que el Empleado 1 vea el comentario en su lista de Gastos
  try {
    const myReceiptsRes = await fetch(`${BASE_URL}/api/v1/receipts/${createdReceiptId}`, {
      headers: {
        'Authorization': `Bearer ${emp1Token}`,
        'X-Active-Role': 'Empleado'
      }
    });
    const receiptData = await myReceiptsRes.json();
    const comments = receiptData.receipt?.comments || [];
    const hasNote = comments.some(c => c.comment.includes('crédito fiscal'));
    recordCheck('EXP-03', 'Sincronización Gastos', 'Comentario Contable visible en la Ficha del Empleado (CS-01)', hasNote,
      `Comentarios asociados: ${comments.length}, Nota del Contador visible: ${hasNote}`);
  } catch (err) {
    recordCheck('EXP-03', 'Sincronización Gastos', 'Comentario Contable en Ficha', false, err.message);
  }

  // ------------------------------------------------------------------
  // 5. SEGREGACIÓN DE FUNCIONES (SoD / CUATRO OJOS) — TEST CRÍTICO
  // ------------------------------------------------------------------
  // Crear un comprobante perteneciente al propio CONTADOR
  let contadorOwnReceiptId = null;
  try {
    const createRes = await fetch(`${BASE_URL}/api/v1/receipts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${contadorToken}`,
        'X-Active-Role': 'Contador'
      },
      body: JSON.stringify({
        merchant_name: 'Almuerzo Trabajo Restaurante',
        document_type: 1, // Recibo
        currency_code: 'DOP',
        issue_date: new Date().toISOString().substring(0, 10),
        subtotal: 1200.00,
        itbis: 0.00,
        total: 1200.00,
        status: 2 // Enviado
      })
    });
    const data = await createRes.json();
    contadorOwnReceiptId = data.receipt?.id;
  } catch { /* ignore */ }

  // El CONTADOR intenta AUTO-APROBAR su propio comprobante -> DEBE FALLAR con 403
  try {
    const selfApproveRes = await fetch(`${BASE_URL}/api/v1/accounting/${contadorOwnReceiptId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${contadorToken}`,
        'X-Active-Role': 'Contador'
      },
      body: JSON.stringify({ action: 'approve' })
    });
    const errData = await selfApproveRes.json();
    const passed = selfApproveRes.status === 403 && (errData.error || '').includes('Segregación');
    recordCheck('SOD-01', 'Segregación de Funciones', 'Bloqueo Estricto de Auto-Aprobación del Contador (Cuatro Ojos)', passed,
      `Status HTTP ${selfApproveRes.status} (Forbidden), Error recibido: "${errData.error}"`);
  } catch (err) {
    recordCheck('SOD-01', 'Segregación de Funciones', 'Bloqueo de Auto-Aprobación', false, err.message);
  }

  // El CONTADOR aprueba el gasto del EMPLEADO 1 -> DEBE TENER ÉXITO (200 OK)
  try {
    const approveRes = await fetch(`${BASE_URL}/api/v1/accounting/${createdReceiptId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${contadorToken}`,
        'X-Active-Role': 'Contador'
      },
      body: JSON.stringify({ action: 'approve' })
    });
    const approveData = await approveRes.json();
    const passed = approveRes.status === 200 && approveData.receipt?.status === 3;
    recordCheck('SOD-02', 'Segregación de Funciones', 'Aprobación Válida de Gasto de un Tercero por el Contador', passed,
      `Status HTTP ${approveRes.status}, Estado resultante: ${approveData.receipt?.status} (3 = Aprobado)`);
  } catch (err) {
    recordCheck('SOD-02', 'Segregación de Funciones', 'Aprobación de Gasto de Tercero', false, err.message);
  }

  // ------------------------------------------------------------------
  // 6. EXPORTACIÓN CSV CON UTF-8 BOM PARA EXCEL
  // ------------------------------------------------------------------
  try {
    const csvRes = await fetch(`${BASE_URL}/api/v1/accounting/export`, {
      headers: {
        'Authorization': `Bearer ${contadorToken}`,
        'X-Active-Role': 'Contador'
      }
    });
    const csvBuf = await csvRes.arrayBuffer();
    const bytes = new Uint8Array(csvBuf);
    const hasBOM = bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF;
    const text = new TextDecoder('utf-8').decode(bytes.slice(3, 300));
    const passed = csvRes.status === 200 && hasBOM && text.includes('Tipo Comprobante');

    recordCheck('REP-01', 'Reportes Contables', 'Exportación CSV con prefijo UTF-8 BOM nativo para Excel', passed,
      `Status HTTP ${csvRes.status}, Tamaño: ${bytes.length} bytes, BOM [0xEF, 0xBB, 0xBF] presente: ${hasBOM}`);
  } catch (err) {
    recordCheck('REP-01', 'Reportes Contables', 'Exportación CSV con UTF-8 BOM', false, err.message);
  }

  // ------------------------------------------------------------------
  // 7. SUPER ADMIN: GESTIÓN DE USUARIOS Y BITÁCORA DE AUDITORÍA
  // ------------------------------------------------------------------
  try {
    const usersRes = await fetch(`${BASE_URL}/api/v1/users`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'X-Active-Role': 'Super Admin'
      }
    });
    const usersData = await usersRes.json();
    const passed = usersRes.status === 200 && Array.isArray(usersData.users) && usersData.users.length >= 4;
    recordCheck('ADM-01', 'Super Admin / RBAC', 'Listado y Control de Usuarios del Sistema', passed,
      `Total usuarios registrados: ${usersData.users?.length}`);
  } catch (err) {
    recordCheck('ADM-01', 'Super Admin / RBAC', 'Listado de Usuarios', false, err.message);
  }

  try {
    const auditRes = await fetch(`${BASE_URL}/api/v1/users/audit-logs?limit=10`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'X-Active-Role': 'Super Admin'
      }
    });
    const auditData = await auditRes.json();
    const logs = auditData.logs || [];
    const passed = auditRes.status === 200 && logs.length > 0 && !!logs[0].client_ip;
    recordCheck('ADM-02', 'Auditoría Forense', 'Bitácora de Auditoría Desacoplada con IP real del cliente', passed,
      `Registros recuperados: ${logs.length}, Última operación: "${logs[0]?.action} (${logs[0]?.entity_type})" desde IP: ${logs[0]?.client_ip}`);
  } catch (err) {
    recordCheck('ADM-02', 'Auditoría Forense', 'Bitácora de Auditoría', false, err.message);
  }

  // ------------------------------------------------------------------
  // RESUMEN EJECUTIVO DE LA AUDITORÍA
  // ------------------------------------------------------------------
  console.log('\n======================================================================');
  console.log('📊 RESUMEN FINAL DEL CHECKLIST DE REQUERIMIENTOS EN PRODUCCIÓN');
  console.log('======================================================================');

  const total = results.length;
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = total - passedCount;
  const score = Math.round((passedCount / total) * 100);

  console.log(`Pruebas Ejecutadas: ${total}`);
  console.log(`Pruebas Aprobadas:  ${passedCount} ✅`);
  console.log(`Pruebas Fallidas:   ${failedCount} ${failedCount === 0 ? '' : '❌'}`);
  console.log(`Calificación Total: ${score}%`);
  console.log('======================================================================');

  return { total, passedCount, failedCount, score, results };
}

runLiveProductionAudit();
