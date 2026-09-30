// Generates the extension's PNG icons so the repo needs no binary assets.
// Draws the GrowDesk mark (gradient tile, white leaf), then encodes RGBA -> PNG.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(HERE, '..', 'public', 'icons');


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

/** Distance from a point to a line segment, used to stroke the mark. */
function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

// The GrowDesk mark (CRM components/ui/logo.tsx), in its 40x40 design units: a rising leaf
// stroke and its stem on a diagonal indigo-to-teal gradient tile.
const GRADIENT = [
  [0, [124, 124, 255]],
  [0.55, [91, 91, 246]],
  [1, [20, 184, 166]],
];

function gradientAt(t) {
  for (let i = 1; i < GRADIENT.length; i += 1) {
    const [t1, c1] = GRADIENT[i];
    const [t0, c0] = GRADIENT[i - 1];
    if (t <= t1) {
      const k = (t - t0) / (t1 - t0);
      return c0.map((v, ch) => v + (c1[ch] - v) * k);
    }
  }
  return GRADIENT[GRADIENT.length - 1][1];
}

function cubic(p0, p1, p2, p3, steps = 24) {
  const points = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const u = 1 - t;
    points.push([0, 1].map((k) => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k]));
  }
  return points;
}

// "M12 27c0-7.5 5.5-13 15-14-0.6 9.4-6.1 15-14 15" and "M13 28l8.5-8.5"
const LEAF = [...cubic([12, 27], [12, 19.5], [17.5, 14], [27, 13]), ...cubic([27, 13], [26.4, 22.4], [20.9, 28], [13, 28]).slice(1)];
const STEM = [[13, 28], [21.5, 19.5]];

function drawIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const unit = size / 40;
  const radius = 11 * unit;
  // Thicker than the SVG at small sizes, so the mark stays legible in the toolbar.
  const stroke = Math.max(1.35, 2.6 * unit * (size <= 16 ? 1.35 : size <= 32 ? 1.15 : 1));
  const segments = [];
  const addPolyline = (pts) => {
    for (let i = 1; i < pts.length; i += 1) segments.push([pts[i - 1][0] * unit, pts[i - 1][1] * unit, pts[i][0] * unit, pts[i][1] * unit]);
  };
  addPolyline(LEAF);
  addPolyline(STEM);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const px = x + 0.5;
      const py = y + 0.5;

      // Rounded-rectangle coverage.
      const qx = Math.abs(px - size / 2) - (size / 2 - radius);
      const qy = Math.abs(py - size / 2) - (size / 2 - radius);
      const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius;
      const tileAlpha = Math.min(1, Math.max(0, 0.5 - outside));
      if (tileAlpha <= 0) continue;

      let distance = Infinity;
      for (const [ax, ay, bx, by] of segments) distance = Math.min(distance, distanceToSegment(px, py, ax, ay, bx, by));
      const markAlpha = Math.min(1, Math.max(0, stroke / 2 - distance + 0.5));

      const bg = gradientAt((px + py) / (2 * size));
      const offset = (y * size + x) * 4;
      for (let ch = 0; ch < 3; ch += 1) rgba[offset + ch] = Math.round(bg[ch] + (255 - bg[ch]) * markAlpha);
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
