import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ICONS_DIR = path.resolve('pwa/public/icons');
fs.mkdirSync(ICONS_DIR, { recursive: true });

// 1. Escribir SVG nítido y moderno
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#022c22" />
    </linearGradient>
    <linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981" />
      <stop offset="100%" stop-color="#06b6d4" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#10b981" flood-opacity="0.3" />
    </filter>
  </defs>

  <!-- Fondo redondeado para PWA maskable -->
  <rect width="512" height="512" rx="128" fill="url(#bgGrad)" />

  <!-- Borde decorativo -->
  <rect x="16" y="16" width="480" height="480" rx="112" fill="none" stroke="#10b981" stroke-width="4" stroke-opacity="0.25" />

  <!-- Silueta de Factura / Recibo Fiscal -->
  <g filter="url(#shadow)">
    <!-- Cuerpo del recibo -->
    <path d="M140 100 C140 88 150 78 162 78 L350 78 C362 78 372 88 372 100 L372 400 L340 380 L310 400 L280 380 L256 400 L232 380 L202 400 L172 380 L140 400 Z" fill="#1e293b" stroke="#334155" stroke-width="6" />

    <!-- Encabezado de Factura Fiscal / DGII -->
    <rect x="175" y="120" width="162" height="24" rx="6" fill="url(#primaryGrad)" />
    
    <!-- Lineas simuladas de items y RNC -->
    <line x1="175" y1="175" x2="270" y2="175" stroke="#94a3b8" stroke-width="8" stroke-linecap="round" />
    <line x1="290" y1="175" x2="337" y2="175" stroke="#10b981" stroke-width="8" stroke-linecap="round" />

    <line x1="175" y1="210" x2="250" y2="210" stroke="#64748b" stroke-width="6" stroke-linecap="round" />
    <line x1="295" y1="210" x2="337" y2="210" stroke="#64748b" stroke-width="6" stroke-linecap="round" />

    <line x1="175" y1="245" x2="260" y2="245" stroke="#64748b" stroke-width="6" stroke-linecap="round" />
    <line x1="295" y1="245" x2="337" y2="245" stroke="#64748b" stroke-width="6" stroke-linecap="round" />

    <!-- Linea divisoria punteada -->
    <line x1="175" y1="285" x2="337" y2="285" stroke="#475569" stroke-width="4" stroke-dasharray="8 6" />

    <!-- Total destacado -->
    <line x1="175" y1="325" x2="240" y2="325" stroke="#cbd5e1" stroke-width="10" stroke-linecap="round" />
    <line x1="270" y1="325" x2="337" y2="325" stroke="#34d399" stroke-width="12" stroke-linecap="round" />
  </g>

  <!-- Lente / Camara Escaner Flotante -->
  <circle cx="360" cy="360" r="76" fill="#0f172a" stroke="#10b981" stroke-width="8" filter="url(#shadow)" />
  <circle cx="360" cy="360" r="54" fill="#042f2e" />
  <!-- Rayo / Flash IA -->
  <path d="M365 325 L340 365 L360 365 L352 395 L382 355 L362 355 Z" fill="url(#primaryGrad)" />
</svg>`;

fs.writeFileSync(path.join(ICONS_DIR, 'icon.svg'), svgContent, 'utf-8');
console.log('✅ SVG icon escrito en pwa/public/icons/icon.svg');

// 2. Generador de PNG RGBA valido usando zlib nativo
function createPng(size) {
  const width = size;
  const height = size;

  // Buffer de imagen RGBA sin comprimir (con filter byte 0 por fila)
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = size * 0.44;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius) {
        // Circulo con degradado esmeralda / azul noche
        const ratio = (x + y) / (width + height);
        const r = Math.round(5 + 11 * ratio);
        const g = Math.round(150 + 35 * ratio);
        const b = Math.round(105 + 107 * (1 - ratio));
        rawData[pxOffset] = r;     // R
        rawData[pxOffset + 1] = g; // G
        rawData[pxOffset + 2] = b; // B
        rawData[pxOffset + 3] = 255; // Alpha
      } else if (dist <= radius + 3) {
        // Borde suavizado antialiasing
        rawData[pxOffset] = 16;
        rawData[pxOffset + 1] = 185;
        rawData[pxOffset + 2] = 129;
        rawData[pxOffset + 3] = 140;
      } else {
        // Transparente exterior
        rawData[pxOffset] = 15;
        rawData[pxOffset + 1] = 23;
        rawData[pxOffset + 2] = 42;
        rawData[pxOffset + 3] = 255; // Fondo solido oscuro para maskable
      }
    }
  }

  // Comprimir IDAT con zlib
  const compressedData = zlib.deflateSync(rawData);

  // Cabecera PNG y Chunks
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth
  ihdrData[9] = 6; // Color type (RGBA)
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT chunk
  const idatChunk = makeChunk('IDAT', compressedData);

  // IEND chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const length = data.length;
  const chunk = Buffer.alloc(8 + length + 4);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crc = crc32(Buffer.concat([Buffer.from(type, 'ascii'), data]));
  chunk.writeUInt32BE(crc, 8 + length);
  return chunk;
}

// Implementacion CRC32 para chunks PNG
function crc32(buf) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

const table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  table[i] = c;
}

// Generar 192 y 512
const png192 = createPng(192);
fs.writeFileSync(path.join(ICONS_DIR, 'icon-192.png'), png192);
console.log('✅ icon-192.png generado (' + png192.length + ' bytes)');

const png512 = createPng(512);
fs.writeFileSync(path.join(ICONS_DIR, 'icon-512.png'), png512);
console.log('✅ icon-512.png generado (' + png512.length + ' bytes)');
