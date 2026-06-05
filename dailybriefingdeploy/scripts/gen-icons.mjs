// Dependency-free PWA icon generator. Renders a MIT-red "plate" mark and writes
// PNGs to public/. Run: node scripts/gen-icons.mjs
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const crcTable = (() => {
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
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length >>> 0, 0);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function makePNG(size, draw) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const px = draw(x, y, size);
      const o = y * stride + 1 + x * 4;
      raw[o] = px[0];
      raw[o + 1] = px[1];
      raw[o + 2] = px[2];
      raw[o + 3] = px[3];
    }
  }
  const idat = deflateSync(raw, { level: 9 });
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

const RED = [163, 31, 52, 255]; // MIT cardinal #A31F34
const WHITE = [255, 255, 255, 255];

// `scale` shrinks the plate toward center for the maskable safe zone.
function plateDraw(scale) {
  const dish = 0.62 * scale;
  const groove = 0.7 * scale;
  const rim = 0.82 * scale;
  return (x, y, size) => {
    const c = (size - 1) / 2;
    const d = Math.hypot(x - c, y - c) / (size / 2);
    if (d <= dish) return WHITE;
    if (d <= groove) return RED;
    if (d <= rim) return WHITE;
    return RED;
  };
}

writeFileSync(new URL('../public/icon-192.png', import.meta.url), makePNG(192, plateDraw(1)));
writeFileSync(new URL('../public/icon-512.png', import.meta.url), makePNG(512, plateDraw(1)));
writeFileSync(new URL('../public/icon-512-maskable.png', import.meta.url), makePNG(512, plateDraw(0.78)));
writeFileSync(new URL('../public/apple-touch-icon.png', import.meta.url), makePNG(180, plateDraw(1)));
console.log('Wrote icon-192, icon-512, icon-512-maskable, apple-touch-icon to public/');
