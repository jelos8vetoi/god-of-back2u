// Сборка icon.ico из отрисованных размеров: 16–128 как 32-битные BMP (из сырых RGBA), 256 как PNG.
// Запуск: node tools/make-ico.js папка-с-icon-N.rgba-и-icon-256.png выход.ico
const fs = require('fs'), path = require('path');
const [dir, outFile] = process.argv.slice(2), imgs = [];
for (const S of [16, 24, 32, 48, 64, 128]) {
  const rgba = fs.readFileSync(path.join(dir, 'icon-' + S + '.rgba')), row = S * 4, mask = Math.ceil(S / 32) * 4 * S;
  const hdr = Buffer.alloc(40); hdr.writeUInt32LE(40, 0); hdr.writeInt32LE(S, 4); hdr.writeInt32LE(S * 2, 8); hdr.writeUInt16LE(1, 12); hdr.writeUInt16LE(32, 14); hdr.writeUInt32LE(row * S + mask, 20);
  const px = Buffer.alloc(row * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const s = (y * S + x) * 4, d = ((S - 1 - y) * S + x) * 4; px[d] = rgba[s + 2]; px[d + 1] = rgba[s + 1]; px[d + 2] = rgba[s]; px[d + 3] = rgba[s + 3]; }
  imgs.push({ S, data: Buffer.concat([hdr, px, Buffer.alloc(mask)]) });
}
imgs.push({ S: 256, data: fs.readFileSync(path.join(dir, 'icon-256.png')) });
const head = Buffer.alloc(6); head.writeUInt16LE(1, 2); head.writeUInt16LE(imgs.length, 4);
let off = 6 + 16 * imgs.length; const dirs = [];
for (const im of imgs) { const e = Buffer.alloc(16); e[0] = im.S >= 256 ? 0 : im.S; e[1] = im.S >= 256 ? 0 : im.S; e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6); e.writeUInt32LE(im.data.length, 8); e.writeUInt32LE(off, 12); off += im.data.length; dirs.push(e); }
fs.writeFileSync(outFile, Buffer.concat([head, ...dirs, ...imgs.map(i => i.data)]));
console.log(outFile, imgs.map(i => i.S).join(','), fs.statSync(outFile).size + ' байт');
