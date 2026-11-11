// Упаковка статичных моделей .gltf (+ .bin + текстура) в один файл models/props.js.
// Запуск: node tools/pack-props.js папка1 папка2 ...   — берёт все .gltf из папок, ключ = "p_" + имя файла.
const fs = require('fs'), path = require('path');
let out = '';
for (const dir of process.argv.slice(2)) for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.gltf'))) {
  const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  let bin = Buffer.concat(j.buffers.map(b => fs.readFileSync(path.join(dir, decodeURIComponent(b.uri)))));
  const pad = () => { const p = (4 - bin.length % 4) % 4; if (p) bin = Buffer.concat([bin, Buffer.alloc(p)]); };
  // несколько буферов склеены подряд: сдвигаем смещения
  let off = 0; const offs = j.buffers.map(b => { const o = off; off += b.byteLength; return o; });
  for (const v of j.bufferViews) { v.byteOffset = (v.byteOffset || 0) + offs[v.buffer]; v.buffer = 0; }
  for (const im of j.images || []) if (im.uri) {
    const data = fs.readFileSync(path.join(dir, decodeURIComponent(im.uri))); pad();
    j.bufferViews.push({ buffer: 0, byteOffset: bin.length, byteLength: data.length }); im.bufferView = j.bufferViews.length - 1; im.mimeType = 'image/png'; delete im.uri; bin = Buffer.concat([bin, data]);
  }
  pad(); j.buffers = [{ byteLength: bin.length }];
  let js = Buffer.from(JSON.stringify(j)); js = Buffer.concat([js, Buffer.alloc((4 - js.length % 4) % 4, 0x20)]);
  const head = Buffer.alloc(12); head.writeUInt32LE(0x46546C67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(28 + js.length + bin.length, 8);
  const h1 = Buffer.alloc(8); h1.writeUInt32LE(js.length, 0); h1.writeUInt32LE(0x4E4F534A, 4);
  const h2 = Buffer.alloc(8); h2.writeUInt32LE(bin.length, 0); h2.writeUInt32LE(0x004E4942, 4);
  const key = 'p_' + f.replace('.gltf', '');
  out += '(window.GLB=window.GLB||{})["' + key + '"]="' + Buffer.concat([head, h1, js, h2, bin]).toString('base64') + '";\n';
  console.log(key, (bin.length / 1024 | 0) + ' KB');
}
fs.writeFileSync(path.join('models', 'props.js'), out);
