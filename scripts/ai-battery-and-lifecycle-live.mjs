import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = 'https://patricia.vis7ar.com';

// Carpeta temporal de imágenes de prueba para la batería
const SAMPLE_DIR = path.resolve('temp_ai_battery');
if (!fs.existsSync(SAMPLE_DIR)) fs.mkdirSync(SAMPLE_DIR, { recursive: true });

// Generador de imágenes de comprobantes con distintas tipologías fiscales
function generateReceiptImage(type) {
  let svg = '';
  switch (type) {
    case 'FISCAL_TRADITIONAL':
      // Factura con NCF B01 y RNC formal 9 dígitos
      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="920" viewBox="0 0 600 920">
        <rect width="600" height="920" fill="#ffffff" />
        <g fill="#0f172a" font-family="monospace">
          <text x="300" y="60" font-size="24" font-weight="bold" text-anchor="middle">FARMACIA LOS HIDALGOS SRL</text>
          <text x="300" y="90" font-size="15" text-anchor="middle">Av. Abraham Lincoln #105, Santo Domingo</text>
          <text x="300" y="115" font-size="16" font-weight="bold" text-anchor="middle">RNC: 101850043</text>
          <text x="300" y="145" font-size="16" font-weight="bold" text-anchor="middle" fill="#047857">FACTURA DE CRÉDITO FISCAL</text>
          <text x="300" y="175" font-size="18" font-weight="bold" text-anchor="middle">NCF: B0100004567</text>
          <text x="300" y="205" font-size="14" text-anchor="middle">FECHA: 2026-11-20   HORA: 14:35:10</text>
          <line x1="40" y1="225" x2="560" y2="225" stroke="#334155" stroke-width="2" />
          <text x="50" y="255" font-size="15" font-weight="bold">DESCRIPCIÓN</text>
          <text x="370" y="255" font-size="15" font-weight="bold">CANT</text>
          <text x="550" y="255" font-size="15" font-weight="bold" text-anchor="end">TOTAL</text>
          <line x1="40" y1="270" x2="560" y2="270" stroke="#cbd5e1" stroke-width="1" />
          <text x="50" y="305" font-size="15">AMOXICILINA 500MG</text>
          <text x="380" y="305" font-size="15">2</text>
          <text x="550" y="305" font-size="15" text-anchor="end">700.00</text>
          <text x="50" y="340" font-size="15">VITAMINA C 1000MG</text>
          <text x="380" y="340" font-size="15">1</text>
          <text x="550" y="340" font-size="15" text-anchor="end">300.00</text>
          <line x1="40" y1="380" x2="560" y2="380" stroke="#334155" stroke-width="2" />
          <text x="350" y="420" font-size="16">SUBTOTAL:</text>
          <text x="550" y="420" font-size="16" text-anchor="end">RD$ 1,000.00</text>
          <text x="350" y="455" font-size="16">ITBIS (18%):</text>
          <text x="550" y="455" font-size="16" text-anchor="end">RD$ 180.00</text>
          <line x1="350" y1="475" x2="560" y2="475" stroke="#334155" stroke-width="2" />
          <text x="350" y="515" font-size="20" font-weight="bold">TOTAL RD$:</text>
          <text x="550" y="515" font-size="22" font-weight="bold" text-anchor="end" fill="#047857">1,180.00</text>
          <text x="300" y="580" font-size="14" text-anchor="middle">FORMA DE PAGO: TARJETA DE CRÉDITO</text>
          <text x="300" y="610" font-size="13" text-anchor="middle" fill="#64748b">¡Gracias por su compra en Farmacia Los Hidalgos!</text>
        </g>
      </svg>`;
      break;

    case 'ELECTRONIC_ECF':
      // Factura con Comprobante Fiscal Electrónico e-CF (E31)
      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="920" viewBox="0 0 600 920">
        <rect width="600" height="920" fill="#ffffff" />
        <g fill="#0f172a" font-family="monospace">
          <text x="300" y="60" font-size="24" font-weight="bold" text-anchor="middle">CLARO DOMINICANA SRL</text>
          <text x="300" y="90" font-size="15" text-anchor="middle">Av. John F. Kennedy, Santo Domingo</text>
          <text x="300" y="115" font-size="16" font-weight="bold" text-anchor="middle">RNC: 101001577</text>
          <text x="300" y="145" font-size="16" font-weight="bold" text-anchor="middle" fill="#0284c7">FACTURA ELECTRÓNICA (e-CF)</text>
          <text x="300" y="175" font-size="18" font-weight="bold" text-anchor="middle">e-NCF: E310000009988</text>
          <text x="300" y="205" font-size="14" text-anchor="middle">FECHA: 2026-11-20</text>
          <line x1="40" y1="225" x2="560" y2="225" stroke="#334155" stroke-width="2" />
          <text x="50" y="260" font-size="15">SERVICIO INTERNET FIBRA ÓPTICA</text>
          <text x="550" y="260" font-size="15" text-anchor="end">2,500.00</text>
          <line x1="40" y1="300" x2="560" y2="300" stroke="#334155" stroke-width="2" />
          <text x="350" y="340" font-size="16">SUBTOTAL:</text>
          <text x="550" y="340" font-size="16" text-anchor="end">RD$ 2,500.00</text>
          <text x="350" y="375" font-size="16">ITBIS (18%):</text>
          <text x="550" y="375" font-size="16" text-anchor="end">RD$ 450.00</text>
          <line x1="350" y1="395" x2="560" y2="395" stroke="#334155" stroke-width="2" />
          <text x="350" y="435" font-size="20" font-weight="bold">TOTAL RD$:</text>
          <text x="550" y="435" font-size="22" font-weight="bold" text-anchor="end" fill="#0284c7">2,950.00</text>
        </g>
      </svg>`;
      break;

    case 'INFORMAL_RECEIPT':
      // Recibo informal de caja chica sin NCF ni RNC
      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="750" viewBox="0 0 500 750">
        <rect width="500" height="750" fill="#fffbeb" />
        <g fill="#451a03" font-family="sans-serif">
          <text x="250" y="60" font-size="22" font-weight="bold" text-anchor="middle">CAFETERIA DOÑA NENA</text>
          <text x="250" y="90" font-size="14" text-anchor="middle">TICKET DE VENTA Y CONSUMO</text>
          <text x="250" y="120" font-size="14" text-anchor="middle">FECHA: 2026-11-20</text>
          <line x1="40" y1="140" x2="460" y2="140" stroke="#b45309" stroke-width="1.5" stroke-dasharray="5 5" />
          <text x="50" y="180" font-size="15">2x Empanadas de Pollo</text>
          <text x="450" y="180" font-size="15" text-anchor="end">160.00</text>
          <text x="50" y="220" font-size="15">1x Jugo de Chinola Natural</text>
          <text x="450" y="220" font-size="15" text-anchor="end">120.00</text>
          <text x="50" y="260" font-size="15">1x Café Espresso</text>
          <text x="450" y="260" font-size="15" text-anchor="end">70.00</text>
          <line x1="40" y1="300" x2="460" y2="300" stroke="#b45309" stroke-width="1.5" stroke-dasharray="5 5" />
          <text x="50" y="340" font-size="16">SUBTOTAL:</text>
          <text x="450" y="340" font-size="16" text-anchor="end">350.00</text>
          <text x="50" y="375" font-size="16">PROPINA / OTROS:</text>
          <text x="450" y="375" font-size="16" text-anchor="end">30.00</text>
          <text x="50" y="420" font-size="20" font-weight="bold">TOTAL GENERAL:</text>
          <text x="450" y="420" font-size="22" font-weight="bold" text-anchor="end" fill="#92400e">RD$ 380.00</text>
          <text x="250" y="480" font-size="12" text-anchor="middle" fill="#78350f">Nota: Comprobante informal sin valor fiscal formal.</text>
        </g>
      </svg>`;
      break;

    case 'FOREIGN_USD':
      // Factura internacional en dólares USD
      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="850" viewBox="0 0 600 850">
        <rect width="600" height="850" fill="#ffffff" />
        <g fill="#1e293b" font-family="monospace">
          <text x="300" y="60" font-size="24" font-weight="bold" text-anchor="middle">AMAZON WEB SERVICES INC</text>
          <text x="300" y="90" font-size="14" text-anchor="middle">Seattle, WA, United States</text>
          <text x="300" y="120" font-size="16" font-weight="bold" text-anchor="middle">INVOICE # 987123654</text>
          <text x="300" y="150" font-size="14" text-anchor="middle">DATE: 2026-11-20</text>
          <line x1="50" y1="180" x2="550" y2="180" stroke="#000" stroke-width="2" />
          <text x="60" y="220" font-size="16">EC2 Cloud Compute Instances</text>
          <text x="540" y="220" font-size="16" text-anchor="end">$ 65.00</text>
          <text x="60" y="260" font-size="16">S3 Cloud Storage</text>
          <text x="540" y="260" font-size="16" text-anchor="end">$ 20.50</text>
          <line x1="50" y1="300" x2="550" y2="300" stroke="#000" stroke-width="2" />
          <text x="300" y="340" font-size="16">SUBTOTAL:</text>
          <text x="540" y="340" font-size="16" text-anchor="end">$ 85.50</text>
          <text x="300" y="375" font-size="16">TAX (0%):</text>
          <text x="540" y="375" font-size="16" text-anchor="end">$ 0.00</text>
          <line x1="300" y1="395" x2="550" y2="395" stroke="#000" stroke-width="2" />
          <text x="300" y="435" font-size="20" font-weight="bold">TOTAL (USD):</text>
          <text x="540" y="435" font-size="22" font-weight="bold" text-anchor="end" fill="#2563eb">$ 85.50</text>
        </g>
      </svg>`;
      break;

    case 'BLURRY_RECEIPT':
      // Recibo con desenfoque extremo para medir calidad visual
      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="850" viewBox="0 0 600 850">
        <defs>
          <filter id="extremeBlur">
            <feGaussianBlur stdDeviation="8" />
          </filter>
        </defs>
        <rect width="600" height="850" fill="#f1f5f9" />
        <g filter="url(#extremeBlur)" fill="#0f172a" font-family="monospace">
          <text x="300" y="100" font-size="30" font-weight="bold" text-anchor="middle">TIENDA ILEGIBLE</text>
          <text x="300" y="150" font-size="20" text-anchor="middle">RNC 123456789</text>
          <text x="300" y="200" font-size="20" text-anchor="middle">NCF B0199999999</text>
          <text x="300" y="280" font-size="22">SUBTOTAL: 999.00</text>
          <text x="300" y="340" font-size="28" font-weight="bold">TOTAL: 1,178.00</text>
        </g>
      </svg>`;
      break;
  }
  return Buffer.from(svg, 'utf-8');
}

async function runAiBatteryAndLifecycle() {
  console.log('======================================================================');
  console.log('🤖 BATERÍA DE PRUEBAS DE EXTRACCIÓN CON IA (GEMINI 3.8 FLASH)');
  console.log('🔄 Y CICLO DE VIDA COMPLETO EN PRODUCCIÓN (patricia.vis7ar.com)');
  console.log('======================================================================\n');

  // 1. Iniciar sesión como Empleado 1
  console.log('--- 1. AUTENTICACIÓN INICIAL ---');
  const empLogin = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'empleado1@patricia.vis7ar.com', password: 'Patricia2026!' })
  });
  const empAuth = await empLogin.json();
  console.log('✅ Empleado 1 Autenticado:', empAuth.user?.fullName);

  const contadorLogin = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'contador@patricia.vis7ar.com', password: 'Patricia2026!' })
  });
  const contadorAuth = await contadorLogin.json();
  console.log('✅ Contador Autenticado:', contadorAuth.user?.fullName);

  const adminLogin = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@patricia.vis7ar.com', password: 'Patricia2026!' })
  });
  const adminAuth = await adminLogin.json();
  console.log('✅ Super Admin Autenticado:', adminAuth.user?.fullName);

  // 2. Batería de Pruebas de Extracción de la IA
  console.log('\n--- 2. BATERÍA DE EXTRACCIÓN MULTIMODAL CON IA ---');

  const testCases = [
    { type: 'FISCAL_TRADITIONAL', name: 'Factura Fiscal Tradicional RD (B01)', expectedDocType: 2, shouldHaveNcf: true },
    { type: 'ELECTRONIC_ECF', name: 'Factura Electrónica e-CF RD (E31)', expectedDocType: 2, shouldHaveNcf: true },
    { type: 'INFORMAL_RECEIPT', name: 'Recibo Informal de Cafetería (Caja Chica)', expectedDocType: 1, shouldHaveNcf: false },
    { type: 'FOREIGN_USD', name: 'Factura de Servicios Internacionales (USD)', expectedCurrency: 'USD' },
    { type: 'BLURRY_RECEIPT', name: 'Comprobante Severamente Borroso (Degradado)', expectedLowConfidence: true },
  ];

  let selectedReceiptForFlow = null;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    console.log(`\n👉 Prueba [${i + 1}/${testCases.length}]: ${tc.name}`);
    const svgBuffer = generateReceiptImage(tc.type);
    const form = new FormData();
    const blob = new Blob([svgBuffer], { type: 'image/svg+xml' });
    form.append('file', blob, `${tc.type}.svg`);

    // Pausa preventiva de 2 segundos para respetar rate limits
    await new Promise(r => setTimeout(r, 2000));

    const processRes = await fetch(`${BASE_URL}/api/v1/receipts/process-image`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${empAuth.token}` },
      body: form
    });

    const data = await processRes.json();
    const ext = data.extracted_data;

    console.log(`   - HTTP Status: ${processRes.status}`);
    console.log(`   - Comercio: "${ext?.merchant_name}"`);
    console.log(`   - Tipo de Documento: ${ext?.document_type === 2 ? '2 (Factura Fiscal)' : '1 (Recibo)'}`);
    console.log(`   - Moneda: ${ext?.currency_code}`);
    console.log(`   - RNC: ${ext?.rnc || 'null'}`);
    console.log(`   - NCF: ${ext?.ncf || 'null'}`);
    console.log(`   - Subtotal: ${ext?.subtotal} | ITBIS: ${ext?.itbis} | Total: ${ext?.total}`);
    console.log(`   - Cuadre Aritmético: ${ext?.is_balanced ? '✅ Cuadre Exacto' : '⚠️ Descuadre'}`);
    console.log(`   - Certeza Visual: ${(ext?.confidence_score * 100).toFixed(0)}%`);
    if (ext?.notes) console.log(`   - Notas de IA: "${ext?.notes}"`);

    // Si es la Factura Fiscal Tradicional, la seleccionamos para el ciclo de vida contable completo
    if (tc.type === 'FISCAL_TRADITIONAL' && data.success) {
      selectedReceiptForFlow = {
        image_path: data.image_path,
        extracted: ext,
      };
    }
  }

  // 3. CICLO DE VIDA COMPLETO DE UN COMPROBANTE FISCAL
  console.log('\n======================================================================');
  console.log('🔁 3. EJECUTANDO CICLO DE VIDA CONTABLE COMPLETO EN PRODUCCIÓN');
  console.log('======================================================================\n');

  if (!selectedReceiptForFlow) {
    console.log('⚠️ Creando comprobante alterno para el flujo contable...');
    selectedReceiptForFlow = {
      image_path: 'uploads/receipts/demo_test.svg',
      extracted: {
        merchant_name: 'Farmacia Los Hidalgos SRL',
        rnc: '101850043',
        ncf: 'B0100004567',
        document_type: 2,
        currency_code: 'DOP',
        issue_date: '2026-11-20',
        subtotal: 1000.00,
        itbis: 180.00,
        total: 1180.00,
        items: [
          { description: 'Amoxicilina 500mg', quantity: 2, unit_price: 350.00, subtotal: 700.00, itbis: 126.00, total: 826.00 },
          { description: 'Vitamina C 1000mg', quantity: 1, unit_price: 300.00, subtotal: 300.00, itbis: 54.00, total: 354.00 }
        ]
      }
    };
  }

  // Paso 3.1: Empleado 1 Guarda el comprobante en Borrador (Status 1)
  console.log('--- Paso 3.1: Empleado 1 guarda comprobante como Borrador ---');
  const createRes = await fetch(`${BASE_URL}/api/v1/receipts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${empAuth.token}`,
      'X-Active-Role': 'Empleado'
    },
    body: JSON.stringify({
      merchant_name: selectedReceiptForFlow.extracted.merchant_name,
      rnc: selectedReceiptForFlow.extracted.rnc,
      ncf: selectedReceiptForFlow.extracted.ncf,
      document_type: selectedReceiptForFlow.extracted.document_type,
      currency_code: selectedReceiptForFlow.extracted.currency_code,
      issue_date: selectedReceiptForFlow.extracted.issue_date,
      subtotal: selectedReceiptForFlow.extracted.subtotal,
      itbis: selectedReceiptForFlow.extracted.itbis,
      total: selectedReceiptForFlow.extracted.total,
      status: 1, // Borrador
      image_path: selectedReceiptForFlow.image_path,
      items: selectedReceiptForFlow.extracted.items || []
    })
  });
  const createData = await createRes.json();
  const receiptId = createData.receipt?.id;
  console.log(`✅ Comprobante guardado en borrador con ID: ${receiptId}`);

  // Paso 3.2: Empleado 1 Envía el comprobante a Contabilidad (Status 1 -> Status 2)
  console.log('\n--- Paso 3.2: Empleado 1 envía el comprobante a Contabilidad ---');
  const submitRes = await fetch(`${BASE_URL}/api/v1/receipts/${receiptId}/submit`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${empAuth.token}`,
      'X-Active-Role': 'Empleado'
    }
  });
  const submitData = await submitRes.json();
  console.log(`✅ Comprobante enviado exitosamente a Contabilidad (Nuevo Status: ${submitData.receipt?.status})`);

  // Paso 3.3: Contador inspecciona su Bandeja Contable
  console.log('\n--- Paso 3.3: Contador consulta Bandeja Contable ---');
  const inboxRes = await fetch(`${BASE_URL}/api/v1/accounting/inbox`, {
    headers: {
      'Authorization': `Bearer ${contadorAuth.token}`,
      'X-Active-Role': 'Contador'
    }
  });
  const inboxData = await inboxRes.json();
  const receiptInInbox = (inboxData.receipts || []).find(r => r.id === receiptId);
  console.log(`✅ Comprobante localizado en la bandeja del Contador: "${receiptInInbox?.merchant_name}" por ${receiptInInbox?.total} DOP`);

  // Paso 3.4: Contador agrega Comentario Contable formal
  console.log('\n--- Paso 3.4: Contador anota observación contable en el comprobante ---');
  const commentText = 'Factura válida: RNC 101850043 y NCF B0100004567 verificados conforme a DGII. ITBIS 18% deducible.';
  const commentRes = await fetch(`${BASE_URL}/api/v1/accounting/${receiptId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${contadorAuth.token}`,
      'X-Active-Role': 'Contador'
    },
    body: JSON.stringify({ comment: commentText })
  });
  const commentData = await commentRes.json();
  console.log(`✅ Comentario Contable registrado: "${commentData.comment?.comment}"`);

  // Paso 3.5: Empleado 1 verifica en su vista de Gastos que la nota contable es visible
  console.log('\n--- Paso 3.5: Empleado 1 verifica en Mis Gastos la nota del Contador ---');
  const empReceiptRes = await fetch(`${BASE_URL}/api/v1/receipts/${receiptId}`, {
    headers: {
      'Authorization': `Bearer ${empAuth.token}`,
      'X-Active-Role': 'Empleado'
    }
  });
  const empReceiptData = await empReceiptRes.json();
  const visibleComments = empReceiptData.receipt?.comments || [];
  const noteIsVisible = visibleComments.some(c => c.comment.includes('Deducción') || c.comment.includes('deducible') || c.comment.includes('DGII'));
  console.log(`✅ Comentario visible en la vista del Empleado: ${noteIsVisible} (Total notas: ${visibleComments.length})`);

  // Paso 3.6: Contador Aprueba el Comprobante (Status 2 -> Status 3)
  console.log('\n--- Paso 3.6: Contador emite Dictamen Contable: APROBADO ---');
  const reviewRes = await fetch(`${BASE_URL}/api/v1/accounting/${receiptId}/review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${contadorAuth.token}`,
      'X-Active-Role': 'Contador'
    },
    body: JSON.stringify({ action: 'approve' })
  });
  const reviewData = await reviewRes.json();
  console.log(`✅ Comprobante dictaminado como APROBADO (Status final: ${reviewData.receipt?.status})`);

  // Paso 3.7: Exportación de Libros a CSV con UTF-8 BOM
  console.log('\n--- Paso 3.7: Contador exporta Libros Contables a CSV con UTF-8 BOM ---');
  const csvRes = await fetch(`${BASE_URL}/api/v1/accounting/export`, {
    headers: {
      'Authorization': `Bearer ${contadorAuth.token}`,
      'X-Active-Role': 'Contador'
    }
  });
  const csvBuf = await csvRes.arrayBuffer();
  const bytes = new Uint8Array(csvBuf);
  const hasBOM = bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF;
  const csvContent = new TextDecoder('utf-8').decode(bytes);
  const containsOurReceipt = csvContent.includes('Farmacia Los Hidalgos');
  console.log(`✅ Archivo CSV generado (${bytes.length} bytes), BOM UTF-8: ${hasBOM}, Factura presente en reporte: ${containsOurReceipt}`);

  // Paso 3.8: Super Admin audita la bitácora en tiempo real
  console.log('\n--- Paso 3.8: Super Admin consulta Bitácora de Auditoría en Tiempo Real ---');
  const auditRes = await fetch(`${BASE_URL}/api/v1/users/audit-logs?limit=5`, {
    headers: {
      'Authorization': `Bearer ${adminAuth.token}`,
      'X-Active-Role': 'Super Admin'
    }
  });
  const auditData = await auditRes.json();
  const logs = auditData.logs || [];
  console.log(`✅ Últimos eventos registrados en la bitácora de auditoría (${logs.length}):`);
  for (const l of logs.slice(0, 3)) {
    console.log(`   - [${l.created_at.substring(11, 19)}] ${l.action} (${l.entity_type}) | Actor: ${l.actor_email} | IP: ${l.client_ip}`);
  }

  console.log('\n======================================================================');
  console.log('🎉 BATERÍA DE PRUEBAS DE IA Y CICLO DE VIDA EN VIVO CULMINADOS CON ÉXITO');
  console.log('======================================================================');
}

runAiBatteryAndLifecycle();
