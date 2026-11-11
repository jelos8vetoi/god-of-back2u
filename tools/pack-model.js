// Упаковка .glb в models/<имя>.js (base64), чтобы игра грузила модель при запуске с диска.
// Заодно вырезает анимации, которых нет в списке KEEP (если список пуст — оставляет все).
// Запуск: node tools/pack-model.js путь/к/модели.glb имя [анимация1,анимация2,...]
const fs = require('fs'), path = require('path');
const [src, name, keepArg] = process.argv.slice(2);
if (!src || !name) { console.error('usage: node tools/pack-model.js file.glb name [anim1,anim2]'); process.exit(1); }
const KEEP = keepArg ? keepArg.split(',') : null;
const b = fs.readFileSync(src), jl = b.readUInt32LE(12), j = JSON.parse(b.slice(20, 20 + jl).toString());
const bin = b.slice(20 + jl + 8, 20 + jl + 8 + b.readUInt32LE(20 + jl));
if (KEEP && j.animations) j.animations = j.animations.filter(a => KEEP.includes(a.name));
const usedA = new Set(), add = v => { if (v != null) usedA.add(v); };
for (const m of j.meshes || []) for (const p of m.primitives) { Object.values(p.attributes).forEach(add); add(p.indices); (p.targets || []).forEach(t => Object.values(t).forEach(add)); }
for (const s of j.skins || []) add(s.inverseBindMatrices);
for (const a of j.animations || []) for (const s of a.samplers) { add(s.input); add(s.output); }
const aMap = {}, accs = []; [...usedA].sort((x, y) => x - y).forEach(i => { aMap[i] = accs.length; accs.push(j.accessors[i]); });
const usedV = new Set(); for (const a of accs) if (a.bufferView != null) usedV.add(a.bufferView);
for (const im of j.images || []) if (im.bufferView != null) usedV.add(im.bufferView);
const vMap = {}, views = [], parts = []; let off = 0;
[...usedV].sort((x, y) => x - y).forEach(i => {
  const v = j.bufferViews[i], data = bin.slice(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength), pad = (4 - data.length % 4) % 4;
  vMap[i] = views.length; views.push(Object.assign({}, v, { buffer: 0, byteOffset: off })); parts.push(data, Buffer.alloc(pad)); off += data.length + pad;
});
for (const a of accs) if (a.bufferView != null) a.bufferView = vMap[a.bufferView];
for (const im of j.images || []) if (im.bufferView != null) im.bufferView = vMap[im.bufferView];
const R = v => v == null ? v : aMap[v];
for (const m of j.meshes || []) for (const p of m.primitives) { for (const k in p.attributes) p.attributes[k] = R(p.attributes[k]); if (p.indices != null) p.indices = R(p.indices); for (const t of p.targets || []) for (const k in t) t[k] = R(t[k]); }
for (const s of j.skins || []) if (s.inverseBindMatrices != null) s.inverseBindMatrices = R(s.inverseBindMatrices);
for (const a of j.animations || []) for (const s of a.samplers) { s.input = R(s.input); s.output = R(s.output); }
j.accessors = accs; j.bufferViews = views; const nb = Buffer.concat(parts); j.buffers = [{ byteLength: nb.length }];
let js = Buffer.from(JSON.stringify(j)); js = Buffer.concat([js, Buffer.alloc((4 - js.length % 4) % 4, 0x20)]);
const head = Buffer.alloc(12); head.writeUInt32LE(0x46546C67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + nb.length, 8);
const h1 = Buffer.alloc(8); h1.writeUInt32LE(js.length, 0); h1.writeUInt32LE(0x4E4F534A, 4);
const h2 = Buffer.alloc(8); h2.writeUInt32LE(nb.length, 0); h2.writeUInt32LE(0x004E4942, 4);
const glb = Buffer.concat([head, h1, js, h2, nb]);
fs.mkdirSync('models', { recursive: true });
fs.writeFileSync(path.join('models', name + '.js'), '(window.GLB=window.GLB||{})["' + name + '"]="' + glb.toString('base64') + '";\n');
console.log(name, (b.length / 1024 | 0) + ' KB ->', (glb.length / 1024 | 0) + ' KB, анимации:', (j.animations || []).map(a => a.name).join(','));
