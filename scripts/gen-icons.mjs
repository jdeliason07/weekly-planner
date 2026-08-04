// Generates the PWA icons as PNGs with zero dependencies (zlib is built-in).
// The icon is a 32x32 pixel-art Week Machine — beige chassis, 1-bit screen
// with a segmented meter bar and two blocks — scaled nearest-neighbor so the
// pixels stay hard. Run: node scripts/gen-icons.mjs

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

// --- tiny PNG encoder ---------------------------------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // scanlines with filter byte 0
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 4);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// --- the 32x32 pixel design ----------------------------------------------
const C = {
  hi: [228, 220, 203],
  beige: [211, 201, 180],
  lo: [168, 156, 132],
  deep: [138, 127, 104],
  recess: [43, 40, 34],
  black: [0, 0, 0],
  white: [255, 255, 255],
};

const G = 32;
const px = Array.from({ length: G }, () => Array(G).fill(C.beige));

function rect(x0, y0, x1, y1, color) {
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) px[y][x] = color;
}
function outline(x0, y0, x1, y1, color) {
  for (let x = x0; x <= x1; x++) {
    px[y0][x] = color;
    px[y1][x] = color;
  }
  for (let y = y0; y <= y1; y++) {
    px[y][x0] = color;
    px[y][x1] = color;
  }
}

// chassis shading
rect(0, 0, G - 1, 1, C.hi);
rect(0, G - 2, G - 1, G - 1, C.deep);
rect(0, 2, 0, G - 3, C.hi);
rect(G - 1, 2, G - 1, G - 3, C.deep);

// screen recess + white screen
rect(3, 3, 28, 21, C.recess);
rect(4, 4, 27, 20, C.white);
outline(4, 4, 27, 20, C.black);

// meter bar across the top of the screen, segmented
outline(6, 6, 25, 9, C.black);
for (let x = 7; x <= 20; x++) {
  for (let y = 7; y <= 8; y++) {
    // three "areas": solid, checker, stripes
    if (x <= 11) px[y][x] = C.black;
    else if (x <= 16) px[y][x] = (x + y) % 2 ? C.black : C.white;
    else px[y][x] = x % 2 ? C.black : C.white;
  }
}

// two planned blocks with pattern spines
outline(6, 12, 14, 18, C.black);
rect(7, 13, 8, 17, C.black); // solid spine
outline(16, 11, 25, 18, C.black);
for (let y = 12; y <= 17; y++)
  for (let x = 17; x <= 18; x++) px[y][x] = (x + y) % 2 ? C.black : C.white;

// chin with a molded line
rect(3, 24, 28, 26, C.lo);
rect(5, 25, 12, 25, C.deep);

// vents bottom-right
for (let x = 20; x <= 27; x += 2) rect(x, 28, x, 29, C.lo);

// --- scale + write ---------------------------------------------------------
function writeIcon(size, path) {
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    const sy = Math.floor((y * G) / size);
    for (let x = 0; x < size; x++) {
      const sx = Math.floor((x * G) / size);
      const [r, g, b] = px[sy][sx];
      const i = (y * size + x) * 4;
      rgba[i] = r;
      rgba[i + 1] = g;
      rgba[i + 2] = b;
      rgba[i + 3] = 255;
    }
  }
  writeFileSync(path, encodePNG(size, size, rgba));
  console.log(`wrote ${path}`);
}

mkdirSync("public/icons", { recursive: true });
writeIcon(180, "public/icons/icon-180.png");
writeIcon(192, "public/icons/icon-192.png");
writeIcon(512, "public/icons/icon-512.png");
