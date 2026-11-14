/**
 * تولید آیکن‌های PWA بدون هیچ وابستگی بیرونی.
 *
 * آیکن‌ها یک قلب کرم‌رنگ روی گرادیان سبز برند هستند و برای اندازه‌های
 * ۱۹۲، ۵۱۲، maskable و apple-touch-icon ساخته می‌شوند. چون PNG با
 * zlib داخلی Node کدگذاری می‌شود، اجرای `npm run icons` در هر محیطی
 * (بدون ابزار گرافیکی) همین فایل‌ها را بازتولید می‌کند.
 *
 * استفاده: node scripts/generate-pwa-icons.mjs
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const outputDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");

/** رنگ‌های برند (هم‌راستا با توکن‌های index.css) */
const BACKGROUND_TOP = [0x64, 0x87, 0x67];
const BACKGROUND_BOTTOM = [0x38, 0x5e, 0x3e];
const HEART_COLOR = [0xfa, 0xf9, 0xf4];

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);

  for (let n = 0; n < 256; n += 1) {
    let value = n;

    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }

    table[n] = value >>> 0;
  }

  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;

  for (let index = 0; index < buffer.length; index += 1) {
    crc = CRC_TABLE[(crc ^ buffer[index]) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, "ascii");
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);

  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function encodePng(size, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // color type: RGBA
  header[10] = 0; // compression
  header[11] = 0; // filter
  header[12] = 0; // interlace

  const rowLength = size * 4 + 1;
  const raw = Buffer.alloc(rowLength * size);

  for (let y = 0; y < size; y += 1) {
    const rowStart = y * rowLength;
    raw[rowStart] = 0; // filter type: none
    rgba.copy(raw, rowStart + 1, y * size * 4, (y + 1) * size * 4);
  }

  return Buffer.concat([
    signature,
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/**
 * قلب با معادلهٔ ضمنی (x² + y² − 1)³ − x²y³ ≤ 0 و نمونه‌برداری چندگانه
 * برای لبهٔ نرم.
 */
function renderIcon(size, heartScale) {
  const pixels = Buffer.alloc(size * size * 4);
  const samples = 3;
  const center = size / 2;
  // عرض قلب ≈ ۲٫۳ واحد؛ heartScale نسبت عرض قلب به عرض آیکن است.
  const unitPerPixel = (size * heartScale) / 2.3;

  for (let y = 0; y < size; y += 1) {
    const t = y / Math.max(size - 1, 1);
    const background = BACKGROUND_TOP.map((channel, index) =>
      Math.round(channel + (BACKGROUND_BOTTOM[index] - channel) * t),
    );

    for (let x = 0; x < size; x += 1) {
      let inside = 0;

      for (let sampleY = 0; sampleY < samples; sampleY += 1) {
        for (let sampleX = 0; sampleX < samples; sampleX += 1) {
          const pointX =
            (x + (sampleX + 0.5) / samples - center) / unitPerPixel;
          const pointY =
            -(y + (sampleY + 0.5) / samples - center) / unitPerPixel - 0.175;

          const base =
            pointX * pointX + pointY * pointY - 1;
          const value =
            base * base * base - pointX * pointX * pointY * pointY * pointY;

          if (value <= 0) {
            inside += 1;
          }
        }
      }

      const coverage = inside / (samples * samples);
      const offset = (y * size + x) * 4;

      for (let channel = 0; channel < 3; channel += 1) {
        pixels[offset + channel] = Math.round(
          background[channel] +
            (HEART_COLOR[channel] - background[channel]) * coverage,
        );
      }

      pixels[offset + 3] = 255;
    }
  }

  return pixels;
}

const TARGETS = [
  { file: "icon-192.png", size: 192, heartScale: 0.72 },
  { file: "icon-512.png", size: 512, heartScale: 0.72 },
  { file: "maskable-512.png", size: 512, heartScale: 0.52 },
  { file: "apple-touch-icon.png", size: 180, heartScale: 0.72 },
  { file: "favicon-32.png", size: 32, heartScale: 0.8 },
];

mkdirSync(outputDir, { recursive: true });

TARGETS.forEach(({ file, size, heartScale }) => {
  const png = encodePng(size, renderIcon(size, heartScale));
  writeFileSync(join(outputDir, file), png);
  console.log(`✓ ${file} (${size}×${size}, ${Math.round(png.length / 1024)} KB)`);
});

console.log(`\nآیکن‌ها در ${outputDir} ساخته شدند.`);
