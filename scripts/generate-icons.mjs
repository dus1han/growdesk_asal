// Generates the extension's PNG icons so the repo needs no binary assets.
// Draws a rounded blue tile with a white check mark, then encodes RGBA -> PNG.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(HERE, '..', 'public', 'icons');

const BG = [26, 109, 214];
const FG = [255, 255, 255];

const crc32Table = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = crc32Table[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y += 1) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0; // no filter
    rgba.copy(raw, rowStart + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Signed distance from a point to a line segment, used to stroke the check. */
function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function drawIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const radius = size * 0.22;
  const stroke = Math.max(1.1, size * 0.1);
  // Check-mark control points, expressed as fractions of the tile.
  const p = (fx, fy) => [fx * size, fy * size];
  const [ax, ay] = p(0.28, 0.52);
  const [bx, by] = p(0.44, 0.68);
  const [cx, cy] = p(0.74, 0.34);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const px = x + 0.5;
      const py = y + 0.5;

      // Rounded-rectangle coverage.
      const qx = Math.abs(px - size / 2) - (size / 2 - radius);
      const qy = Math.abs(py - size / 2) - (size / 2 - radius);
      const outside =
        Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius;
      const tileAlpha = Math.min(1, Math.max(0, 0.5 - outside));
      if (tileAlpha <= 0) continue;

      const checkDistance = Math.min(
        distanceToSegment(px, py, ax, ay, bx, by),
        distanceToSegment(px, py, bx, by, cx, cy),
      );
      const checkAlpha = Math.min(1, Math.max(0, stroke / 2 - checkDistance + 0.5));

      const offset = (y * size + x) * 4;
      for (let ch = 0; ch < 3; ch += 1) {
        rgba[offset + ch] = Math.round(BG[ch] + (FG[ch] - BG[ch]) * checkAlpha);
      }
      rgba[offset + 3] = Math.round(tileAlpha * 255);
    }
  }
  return encodePng(size, rgba);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const size of [16, 32, 48, 128]) {
  const file = resolve(OUT_DIR, `icon${size}.png`);
  writeFileSync(file, drawIcon(size));
  console.log(`icon ${size}x${size} -> ${file}`);
}
