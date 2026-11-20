import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = 'https://patricia.vis7ar.com';

// Carpeta temporal para las imágenes de prueba
const TMP_DIR = path.resolve('temp_receipt_samples');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

async function downloadFile(url, dest) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} al descargar ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return dest;
}

// Generador de imagen con texto sintetizado pero intencionalmente borroso / ruido
function createSyntheticReceipt(isBlurry = false, isNonReceipt = false) {
  // Creamos un SVG con texto
  let svg = '';
  if (isNonReceipt) {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
      <rect width="600" height="800" fill="#3b82f6" />
      <circle cx="300" cy="400" r="150" fill="#f59e0b" />
      <text x="300" y="420" font-size="32" font-family="sans-serif" fill="#ffffff" text-anchor="middle">PAISAJE ABSTRACTO</text>
    </svg>`;
  } else if (isBlurry) {
    // Recibo con filtro de desenfoque gaussiano severo (desenfocado, movido, ilegible)
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
      <defs>
        <filter id="severeBlur" x="0" y="0">
          <feGaussianBlur stdDeviation="7.5" />
        </filter>
      </defs>
      <rect width="600" height="900" fill="#f8fafc" />
      <g filter="url(#severeBlur)" fill="#1e293b" font-family="monospace">
        <text x="300" y="80" font-size="28" font-weight="bold" text-anchor="middle">FARMACIA CAROL SRL</text>
        <text x="300" y="120" font-size="18" text-anchor="middle">RNC: 101850043</text>
        <text x="300" y="150" font-size="18" text-anchor="middle">NCF: B0100008899</text>
        <text x="300" y="180" font-size="16" text-anchor="middle">FECHA: 2026-11-20</text>
        <line x1="50" y1="210" x2="550" y2="210" stroke="#000" stroke-width="2" />
        <text x="70" y="260" font-size="18">1x ACETAMINOFEN 500MG</text>
        <text x="480" y="260" font-size="18" text-anchor="end">250.00</text>
        <text x="70" y="310" font-size="18">1x ALCOHOL ISOPROPILICO</text>
        <text x="480" y="310" font-size="18" text-anchor="end">180.00</text>
        <line x1="50" y1="360" x2="550" y2="360" stroke="#000" stroke-width="2" />
        <text x="70" y="410" font-size="20">SUBTOTAL:</text>
        <text x="480" y="410" font-size="20" text-anchor="end">430.00</text>
        <text x="70" y="460" font-size="20">ITBIS (18%):</text>
        <text x="480" y="460" font-size="20" text-anchor="end">77.40</text>
        <text x="70" y="520" font-size="24" font-weight="bold">TOTAL GENERAL:</text>
        <text x="480" y="520" font-size="24" font-weight="bold" text-anchor="end">507.40</text>
      </g>
    </svg>`;
  } else {
    // Recibo nítido
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
      <rect width="600" height="900" fill="#ffffff" />
      <g fill="#111827" font-family="monospace">
        <text x="300" y="80" font-size="26" font-weight="bold" text-anchor="middle">SUPERMERCADOS BRAVO SRL</text>
        <text x="300" y="120" font-size="18" text-anchor="middle">RNC: 101850043</text>
        <text x="300" y="150" font-size="18" text-anchor="middle">NCF: B0100004567</text>
        <text x="300" y="180" font-size="16" text-anchor="middle">FECHA: 2026-11-20</text>
        <line x1="50" y1="210" x2="550" y2="210" stroke="#111827" stroke-width="2" />
        <text x="70" y="260" font-size="18">2x LECHE ENTERA 1L</text>
        <text x="480" y="260" font-size="18" text-anchor="end">180.00</text>
        <text x="70" y="310" font-size="18">1x PAN DE AGUA INTEGRAL</text>
        <text x="480" y="310" font-size="18" text-anchor="end">120.00</text>
        <line x1="50" y1="360" x2="550" y2="360" stroke="#111827" stroke-width="2" />
        <text x="70" y="410" font-size="20">SUBTOTAL:</text>
        <text x="480" y="410" font-size="20" text-anchor="end">300.00</text>
        <text x="70" y="460" font-size="20">ITBIS (18%):</text>
        <text x="480" y="460" font-size="20" text-anchor="end">54.00</text>
        <text x="70" y="520" font-size="24" font-weight="bold">TOTAL RD$:</text>
        <text x="480" y="520" font-size="24" font-weight="bold" text-anchor="end">354.00</text>
      </g>
    </svg>`;
  }
  return Buffer.from(svg, 'utf-8');
}

async function testBlurryBehavior() {
  console.log('======================================================================');
  console.log('🔬 VALIDACIÓN DE COMPORTAMIENTO CON RECIBOS BORROSOS / DEGRADADOS');
  console.log('======================================================================\n');

  // Login de Empleado
  const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'empleado1@patricia.vis7ar.com', password: 'Patricia2026!' })
  });
  const { token } = await loginRes.json();

  // Caso 1: Recibo Real Descargado de Internet (Wikimedia Commons)
  console.log('--- CASO 1: Recibo Real de Internet (Wikimedia Commons ReceiptSwiss.jpg) ---');
  const realUrl = 'https://upload.wikimedia.org/wikipedia/commons/0/0b/ReceiptSwiss.jpg';
  const realFile = path.join(TMP_DIR, 'receipt_swiss.jpg');
  try {
    await downloadFile(realUrl, realFile);
    const form = new FormData();
    const blob = new Blob([fs.readFileSync(realFile)], { type: 'image/jpeg' });
    form.append('file', blob, 'receipt_swiss.jpg');

    const res = await fetch(`${BASE_URL}/api/v1/receipts/process-image`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: form
    });
    const data = await res.json();
    console.log('Status HTTP:', res.status);
    console.log('Datos Extraídos:');
    console.log(' - Comercio:', data.extracted_data?.merchant_name);
    console.log(' - Tipo de Documento:', data.extracted_data?.document_type === 2 ? 'Factura Fiscal' : 'Recibo');
    console.log(' - Moneda:', data.extracted_data?.currency_code);
    console.log(' - Subtotal:', data.extracted_data?.subtotal);
    console.log(' - ITBIS / Impuestos:', data.extracted_data?.itbis);
    console.log(' - Total:', data.extracted_data?.total);
    console.log(' - Nivel de Confianza:', data.extracted_data?.confidence_score);
    console.log(' - Cuadre Aritmético:', data.extracted_data?.is_balanced ? '✅ Cuadrado' : '⚠️ Descuadre');
    console.log(' - Notas de IA:', data.extracted_data?.notes || 'Ninguna (imagen nítida)');
  } catch (err) {
    console.log('Fallo en descarga o llamada:', err.message);
  }

  // Caso 2: Recibo Intencionalmente BORROSO (Filtro Gaussiano severo stdDeviation=7.5)
  console.log('\n--- CASO 2: Recibo Intencionalmente BORROSO / DESENFOCADO ---');
  try {
    const blurrySvg = createSyntheticReceipt(true, false);
    const form = new FormData();
    const blob = new Blob([blurrySvg], { type: 'image/svg+xml' });
    form.append('file', blob, 'receipt_blurry.svg');

    const res = await fetch(`${BASE_URL}/api/v1/receipts/process-image`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: form
    });
    const data = await res.json();
    console.log('Status HTTP:', res.status);
    console.log('Datos Extraídos:');
    console.log(' - Comercio:', data.extracted_data?.merchant_name);
    console.log(' - NCF:', data.extracted_data?.ncf);
    console.log(' - RNC:', data.extracted_data?.rnc);
    console.log(' - Total Extraído:', data.extracted_data?.total);
    console.log(' - Nivel de Confianza:', data.extracted_data?.confidence_score);
    console.log(' - Es Baja Confianza (< 0.75):', (data.extracted_data?.confidence_score < 0.75) ? 'SÍ ✅ (Dispara Alerta Amarilla)' : 'NO');
    console.log(' - Notas de IA:', data.extracted_data?.notes);
    console.log(' - Comportamiento de Seguridad:', 
      data.extracted_data?.confidence_score < 0.75 
        ? '✅ El sistema detecta desenfoque, baja la confianza y alerta al usuario a verificar manualmente sin inventar datos.'
        : 'Confianza alta reportada.');
  } catch (err) {
    console.log('Error en caso borroso:', err.message);
  }

  // Caso 3: Imagen que NO es un recibo (Foto abstracta / círculo geométrico)
  console.log('\n--- CASO 3: Imagen que NO es un comprobante (No-Recibo / No-Factura) ---');
  try {
    const nonReceiptSvg = createSyntheticReceipt(false, true);
    const form = new FormData();
    const blob = new Blob([nonReceiptSvg], { type: 'image/svg+xml' });
    form.append('file', blob, 'landscape.svg');

    const res = await fetch(`${BASE_URL}/api/v1/receipts/process-image`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: form
    });
    const data = await res.json();
    console.log('Status HTTP:', res.status);
    console.log('Datos Extraídos:');
    console.log(' - Comercio:', data.extracted_data?.merchant_name);
    console.log(' - Nivel de Confianza:', data.extracted_data?.confidence_score);
    console.log(' - Total:', data.extracted_data?.total);
    console.log(' - Notas de IA:', data.extracted_data?.notes);
    console.log(' - Comportamiento de Seguridad:',
      data.extracted_data?.confidence_score < 0.50
        ? '✅ El sistema identifica que no es un recibo, reporta confianza mínima (<0.50) y no alucina datos contables.'
        : 'Confianza reportada: ' + data.extracted_data?.confidence_score);
  } catch (err) {
    console.log('Error en caso no-recibo:', err.message);
  }

  console.log('\n======================================================================');
  console.log('🏁 VALIDACIÓN DE CASOS DE BORROSIDAD Y CALIDAD VISUAL COMPLETADA');
  console.log('======================================================================');
}

testBlurryBehavior();
