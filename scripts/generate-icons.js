#!/usr/bin/env node
/**
 * Generates all app icon sizes from scratch using only Node.js built-ins.
 * No npm dependencies required.
 *
 * Output:
 *   assets/icon.png         512×512  (main icon for Linux / reference)
 *   assets/icon.ico         multi-size ICO: 16,32,48,64,128,256 (Windows)
 *   assets/icons/16.png
 *   assets/icons/32.png
 *   assets/icons/48.png
 *   assets/icons/64.png
 *   assets/icons/128.png
 *   assets/icons/256.png
 *   assets/icons/512.png
 */

'use strict';

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ── Palette ──────────────────────────────────────────────────────────────────
const FROM = [99, 102, 241];   // #6366f1  primary-500
const TO   = [67,  56, 202];   // #4338ca  primary-700

// ── Math helpers ─────────────────────────────────────────────────────────────
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp  = (a, b, t)   => a + (b - a) * t;

function lerpRGB(c1, c2, t) {
  return [
    Math.round(lerp(c1[0], c2[0], t)),
    Math.round(lerp(c1[1], c2[1], t)),
    Math.round(lerp(c1[2], c2[2], t)),
  ];
}

/** Distance from point (px,py) to line segment (ax,ay)→(bx,by). */
function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-10) return Math.hypot(px - ax, py - ay);
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / lenSq, 0, 1);
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

/** Signed distance field for a rounded rectangle [0,w]×[0,h] with radius r. */
function sdfRRect(x, y, w, h, r) {
  const qx = Math.abs(x - w * 0.5) - w * 0.5 + r;
  const qy = Math.abs(y - h * 0.5) - h * 0.5 + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) +
         Math.min(Math.max(qx, qy), 0) - r;
}

// ── Icon path in 24×24 coordinate space ──────────────────────────────────────
// SVG: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
// Decoded segments:
//   (13,7)→(21,7)   horizontal arrow bar (top)
//   (21,7)→(21,15)  vertical arrow bar  (right)
//   (21,7)→(13,15)  chart line segment 1
//   (13,15)→(9,11)  chart line segment 2
//   (9,11)→(3,17)   chart line segment 3
const SEGS = [
  [13, 7,  21,  7],
  [21, 7,  21, 15],
  [21, 7,  13, 15],
  [13, 15,  9, 11],
  [ 9, 11,  3, 17],
];

// ── Pixel renderer ────────────────────────────────────────────────────────────
/**
 * Render the icon at `size`×`size` pixels.
 * Returns a Buffer of RGBA bytes (size × size × 4).
 */
function renderAt(size) {
  const buf  = Buffer.alloc(size * size * 4);
  const s    = size / 24;                           // 24→size scale
  const r    = size * 0.18;                          // corner radius (~18%)
  const lw   = Math.max(2.0, size * 0.082);          // stroke width
  const half = lw / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const cx  = x + 0.5, cy = y + 0.5;           // pixel centre

      // Background rounded-rect SDF
      const sd = sdfRRect(cx, cy, size, size, r);
      if (sd > 1.0) { buf[idx + 3] = 0; continue; } // fully outside

      const bgAlpha = clamp(1.0 - sd, 0, 1);

      // Diagonal gradient colour
      const t  = clamp((x / (size - 1) + y / (size - 1)) / 2, 0, 1);
      const bg = lerpRGB(FROM, TO, t);

      // Nearest path distance
      let minD = Infinity;
      for (const [ax, ay, bx, by] of SEGS) {
        const d = distSeg(cx, cy, ax * s, ay * s, bx * s, by * s);
        if (d < minD) minD = d;
      }

      // Anti-aliased stroke alpha
      const pA = clamp(half + 1 - minD, 0, 1);

      buf[idx]     = Math.round(lerp(bg[0], 255, pA));
      buf[idx + 1] = Math.round(lerp(bg[1], 255, pA));
      buf[idx + 2] = Math.round(lerp(bg[2], 255, pA));
      buf[idx + 3] = Math.round(bgAlpha * 255);
    }
  }
  return buf;
}

// ── High-quality box-filter downsampler ───────────────────────────────────────
function downsample(src, srcSz, dstSz) {
  const dst   = Buffer.alloc(dstSz * dstSz * 4);
  const ratio = srcSz / dstSz;

  for (let dy = 0; dy < dstSz; dy++) {
    for (let dx = 0; dx < dstSz; dx++) {
      let rr = 0, gg = 0, bb = 0, aa = 0, wt = 0;

      const x0 = dx * ratio,       y0 = dy * ratio;
      const x1 = (dx + 1) * ratio, y1 = (dy + 1) * ratio;

      for (let sy = Math.floor(y0); sy < Math.ceil(y1); sy++) {
        const wy = Math.min(sy + 1, y1) - Math.max(sy, y0);
        for (let sx = Math.floor(x0); sx < Math.ceil(x1); sx++) {
          const w  = wy * (Math.min(sx + 1, x1) - Math.max(sx, x0));
          const i  = (clamp(sy, 0, srcSz - 1) * srcSz + clamp(sx, 0, srcSz - 1)) * 4;
          rr += src[i]     * w;
          gg += src[i + 1] * w;
          bb += src[i + 2] * w;
          aa += src[i + 3] * w;
          wt += w;
        }
      }

      const i      = (dy * dstSz + dx) * 4;
      dst[i]     = Math.round(rr / wt);
      dst[i + 1] = Math.round(gg / wt);
      dst[i + 2] = Math.round(bb / wt);
      dst[i + 3] = Math.round(aa / wt);
    }
  }
  return dst;
}

// ── PNG encoder (built-in zlib only) ─────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const tb = Buffer.from(type, 'ascii');
  const lb = Buffer.allocUnsafe(4); lb.writeUInt32BE(data.length);
  const cb = Buffer.allocUnsafe(4); cb.writeUInt32BE(crc32(Buffer.concat([tb, data])));
  return Buffer.concat([lb, tb, data, cb]);
}

function encodePNG(rgba, w, h) {
  // Build filter-0 (None) scanlines
  const rows = [];
  for (let y = 0; y < h; y++) {
    const row = Buffer.allocUnsafe(w * 4 + 1);
    row[0] = 0;  // filter type: None
    rgba.copy(row, 1, y * w * 4, (y + 1) * w * 4);
    rows.push(row);
  }
  const raw        = Buffer.concat(rows);
  const compressed = zlib.deflateSync(raw, { level: 9 });

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6;   // 8-bit RGBA
  ihdr[10] = ihdr[11] = ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),  // PNG signature
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── ICO encoder (embeds PNG data directly — Win Vista+) ──────────────────────
function encodeICO(entries) {
  // entries: [{ size, png }]
  const count  = entries.length;
  const hdrSz  = 6 + count * 16;
  let   offset = hdrSz;

  const dirs = entries.map(({ size, png }) => {
    const d = Buffer.allocUnsafe(16);
    d[0] = size >= 256 ? 0 : size;   // 0 = 256
    d[1] = size >= 256 ? 0 : size;
    d[2] = 0; d[3] = 0;
    d.writeUInt16LE(1,  4);           // colour planes
    d.writeUInt16LE(32, 6);           // bits per pixel
    d.writeUInt32LE(png.length, 8);
    d.writeUInt32LE(offset, 12);
    offset += png.length;
    return d;
  });

  const hdr = Buffer.allocUnsafe(6);
  hdr.writeUInt16LE(0, 0);           // reserved
  hdr.writeUInt16LE(1, 2);           // type: 1 = icon
  hdr.writeUInt16LE(count, 4);

  return Buffer.concat([hdr, ...dirs, ...entries.map(e => e.png)]);
}

// ── Main ─────────────────────────────────────────────────────────────────────
const ASSETS  = path.join(__dirname, '../assets');
const ICONDIR = path.join(ASSETS, 'icons');

fs.mkdirSync(ICONDIR, { recursive: true });

console.log('Rendering master at 512×512…');
const master = renderAt(512);

const ALL_SIZES = [16, 32, 48, 64, 128, 256, 512];
const pngCache  = {};

for (const sz of ALL_SIZES) {
  process.stdout.write(`  ${sz}×${sz}… `);
  const rgba     = sz === 512 ? master : downsample(master, 512, sz);
  const png      = encodePNG(rgba, sz, sz);
  pngCache[sz]   = png;
  const outFile  = path.join(ICONDIR, `${sz}.png`);
  fs.writeFileSync(outFile, png);
  console.log('✓');
}

// Main PNG (512px)
fs.writeFileSync(path.join(ASSETS, 'icon.png'), pngCache[512]);
console.log('\nassets/icon.png        ✓  (512×512)');

// Multi-size ICO for Windows
const ICO_SIZES  = [16, 32, 48, 64, 128, 256];
const icoEntries = ICO_SIZES.map(sz => ({ size: sz, png: pngCache[sz] }));
const icoBuffer  = encodeICO(icoEntries);
fs.writeFileSync(path.join(ASSETS, 'icon.ico'), icoBuffer);
console.log(`assets/icon.ico        ✓  (${ICO_SIZES.join(', ')}px)`);

console.log('\nAll icons generated successfully.');
