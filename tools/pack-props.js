// Упаковка статичных моделей .gltf (+ .bin) в один файл models/props.js.
// Текстура набора (одна на папку) сохраняется один раз в window.GLBTEX, модели ссылаются на неё через window.GLBPACK.
// Запуск: node tools/pack-props.js папка1 папка2 ...   — берёт все .gltf из папок, ключ = "p_" + имя файла.
const fs = require('fs'), path = require('path');
let out = '', tex = {}, packs = {}, total = 0;
for (const dir of process.argv.slice(2)) {
  const pack = path.basename(dir);
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.gltf'))) {
    const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    let bin = Buffer.concat(j.buffers.map(b => fs.readFileSync(path.join(dir, decodeURIComponent(b.uri)))));
    let off = 0; const offs = j.buffers.map(b => { const o = off; off += b.byteLength; return o; });
    for (const v of j.bufferViews) { v.byteOffset = (v.byteOffset || 0) + offs[v.buffer]; v.buffer = 0; }
    const imgs = j.images || [];
    if (imgs.length === 1 && imgs[0].uri) {
      // одна общая текстура набора: выносим её, в материалах оставляем только параметры
      const png = path.join(dir, decodeURIComponent(imgs[0].uri));
      if (!tex[pack]) tex[pack] = fs.readFileSync(png).toString('base64');
      delete j.images; delete j.textures; delete j.samplers;
      for (const m of j.materials || []) if (m.pbrMetallicRoughness) delete m.pbrMetallicRoughness.baseColorTexture;
      packs['p_' + f.replace('.gltf', '')] = pack;
    } else if (imgs.length) {
      // нестандартный случай — оставляем текстуры внутри модели
      for (const im of imgs) if (im.uri) {
        const data = fs.readFileSync(path.join(dir, decodeURIComponent(im.uri))), p = (4 - bin.length % 4) % 4;
        if (p) bin = Buffer.concat([bin, Buffer.alloc(p)]);
        j.bufferViews.push({ buffer: 0, byteOffset: bin.length, byteLength: data.length }); im.bufferView = j.bufferViews.length - 1; im.mimeType = 'image/png'; delete im.uri; bin = Buffer.concat([bin, data]);
      }
      console.warn('свои текстуры:', f);
    }
    { const p = (4 - bin.length % 4) % 4; if (p) bin = Buffer.concat([bin, Buffer.alloc(p)]); }
    j.buffers = [{ byteLength: bin.length }];
    let js = Buffer.from(JSON.stringify(j)); js = Buffer.concat([js, Buffer.alloc((4 - js.length % 4) % 4, 0x20)]);
    const head = Buffer.alloc(12); head.writeUInt32LE(0x46546C67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(28 + js.length + bin.length, 8);
    const h1 = Buffer.alloc(8); h1.writeUInt32LE(js.length, 0); h1.writeUInt32LE(0x4E4F534A, 4);
    const h2 = Buffer.alloc(8); h2.writeUInt32LE(bin.length, 0); h2.writeUInt32LE(0x004E4942, 4);
    const glb = Buffer.concat([head, h1, js, h2, bin]); total += glb.length;
    out += '(window.GLB=window.GLB||{})["p_' + f.replace('.gltf', '') + '"]="' + glb.toString('base64') + '";\n';
  }
}
out = 'window.GLBTEX=' + JSON.stringify(tex) + ';\nwindow.GLBPACK=' + JSON.stringify(packs) + ';\n' + out;
fs.writeFileSync(path.join('models', 'props.js'), out);
console.log('моделей:', Object.keys(packs).length, '· наборов текстур:', Object.keys(tex).length, '· геометрия', (total / 1024 | 0) + ' KB · файл', (out.length / 1024 | 0) + ' KB');
