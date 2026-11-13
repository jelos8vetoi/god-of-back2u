// Перепаковка фрагментированного MP4 (MediaRecorder) в обычный MP4 с полной длительностью и moov в начале. Без перекодирования.
// node remux.js in.mp4 out.mp4
const fs = require('fs');
const [inp, outp] = process.argv.slice(2), b = fs.readFileSync(inp);
const kids = (o, e) => { const r = []; while (o < e) { let sz = b.readUInt32BE(o), h = 8; if (sz === 1) { sz = Number(b.readBigUInt64BE(o + 8)); h = 16; } if (sz === 0) sz = e - o; r.push({ type: b.toString('ascii', o + 4, o + 8), o, s: o + h, e: o + sz }); o += sz; } return r; };
const find = (list, t) => list.find(x => x.type === t), raw = x => b.slice(x.o, x.e);
const top = kids(0, b.length), moov = find(top, 'moov'), mk = kids(moov.s, moov.e);
const trex = {}; { const mvex = find(mk, 'mvex'); if (mvex) for (const t of kids(mvex.s, mvex.e).filter(x => x.type === 'trex')) trex[b.readUInt32BE(t.s + 4)] = { dur: b.readUInt32BE(t.s + 12), size: b.readUInt32BE(t.s + 16), flags: b.readUInt32BE(t.s + 20) }; }
const tracks = {};
for (const tr of mk.filter(x => x.type === 'trak')) {
  const tk = kids(tr.s, tr.e), tkhd = find(tk, 'tkhd'), id = b.readUInt32BE(tkhd.s + (b[tkhd.s] ? 20 : 12));
  const mdia = find(tk, 'mdia'), md = kids(mdia.s, mdia.e), mdhd = find(md, 'mdhd'), hdlr = find(md, 'hdlr'), minf = find(md, 'minf'), mi = kids(minf.s, minf.e);
  const stbl = find(mi, 'stbl'), stsd = find(kids(stbl.s, stbl.e), 'stsd');
  tracks[id] = { id, tkhd: raw(tkhd), mdhd: raw(mdhd), hdlr: raw(hdlr), mh: raw(mi.find(x => x.type === 'vmhd' || x.type === 'smhd')), dinf: raw(find(mi, 'dinf')), stsd: raw(stsd),
    ts: b.readUInt32BE(mdhd.s + (b[mdhd.s] ? 20 : 12)), kind: b.toString('ascii', hdlr.s + 8, hdlr.s + 12), samples: [] };
}
for (const mf of top.filter(x => x.type === 'moof')) for (const tf of kids(mf.s, mf.e).filter(x => x.type === 'traf')) {
  const tk = kids(tf.s, tf.e), tfhd = find(tk, 'tfhd'), fl = b.readUInt32BE(tfhd.s) & 0xffffff, id = b.readUInt32BE(tfhd.s + 4), T = tracks[id], d = trex[id] || {};
  let p = tfhd.s + 8, base = mf.o; if (fl & 1) { base = Number(b.readBigUInt64BE(p)); p += 8; } if (fl & 2) p += 4;
  let ddur = d.dur, dsize = d.size, dflags = d.flags; if (fl & 8) { ddur = b.readUInt32BE(p); p += 4; } if (fl & 0x10) { dsize = b.readUInt32BE(p); p += 4; } if (fl & 0x20) { dflags = b.readUInt32BE(p); p += 4; }
  for (const tr of tk.filter(x => x.type === 'trun')) {
    const v = b[tr.s], f = b.readUInt32BE(tr.s) & 0xffffff, n = b.readUInt32BE(tr.s + 4); let q = tr.s + 8, off = base;
    if (f & 1) { off = base + b.readInt32BE(q); q += 4; } let first = null; if (f & 4) { first = b.readUInt32BE(q); q += 4; }
    for (let i = 0; i < n; i++) {
      let dur = ddur, size = dsize, flags = i === 0 && first != null ? first : dflags, cto = 0;
      if (f & 0x100) { dur = b.readUInt32BE(q); q += 4; } if (f & 0x200) { size = b.readUInt32BE(q); q += 4; } if (f & 0x400) { flags = b.readUInt32BE(q); q += 4; } if (f & 0x800) { cto = v ? b.readInt32BE(q) : b.readUInt32BE(q); q += 4; }
      T.samples.push({ off, size, dur, sync: !(flags & 0x10000), cto }); off += size;
    }
  }
}
const box = (type, ...parts) => { const body = Buffer.concat(parts.map(x => Buffer.isBuffer(x) ? x : Buffer.from(x))); const h = Buffer.alloc(8); h.writeUInt32BE(8 + body.length, 0); h.write(type, 4); return Buffer.concat([h, body]); };
const full = (type, ver, flags, ...parts) => { const h = Buffer.alloc(4); h.writeUInt32BE((ver << 24) | flags, 0); return box(type, h, ...parts); };
const u32 = (...v) => { const x = Buffer.alloc(4 * v.length); v.forEach((n, i) => x.writeUInt32BE(n >>> 0, i * 4)); return x; };
const ids = Object.keys(tracks).map(Number).sort((a, b2) => a - b2);
const order = ids.map(id => tracks[id]);
function build(offsets) {
  let maxMs = 0; const traks = [];
  order.forEach((T, ti) => {
    const total = T.samples.reduce((s, x) => s + x.dur, 0), ms = Math.round(total * 1000 / T.ts); maxMs = Math.max(maxMs, ms);
    const stts = []; for (const s of T.samples) { const l = stts[stts.length - 1]; if (l && l[1] === s.dur) l[0]++; else stts.push([1, s.dur]); }
    const parts = [T.stsd, full('stts', 0, 0, u32(stts.length), ...stts.map(x => u32(x[0], x[1])))];
    if (T.samples.some(s => s.cto)) { const ct = []; for (const s of T.samples) { const l = ct[ct.length - 1]; if (l && l[1] === s.cto) l[0]++; else ct.push([1, s.cto]); } parts.push(full('ctts', 0, 0, u32(ct.length), ...ct.map(x => u32(x[0], x[1])))); }
    if (T.kind === 'vide') { const ss = T.samples.map((s, i) => s.sync ? i + 1 : 0).filter(Boolean); parts.push(full('stss', 0, 0, u32(ss.length), u32(...ss))); }
    parts.push(full('stsc', 0, 0, u32(1, 1, 1, 1)), full('stsz', 0, 0, u32(0, T.samples.length), u32(...T.samples.map(s => s.size))), full('stco', 0, 0, u32(T.samples.length), u32(...offsets[ti])));
    const mdhd = Buffer.from(T.mdhd); if (mdhd[8] === 0) mdhd.writeUInt32BE(total, 8 + 16); else mdhd.writeBigUInt64BE(BigInt(total), 8 + 24);
    const tkhd = Buffer.from(T.tkhd); if (tkhd[8] === 0) tkhd.writeUInt32BE(ms, 8 + 20); else tkhd.writeBigUInt64BE(BigInt(ms), 8 + 28);
    tkhd.writeUInt32BE((tkhd.readUInt32BE(8) & 0xff000000) | 3, 8);   // включена и в фильме
    traks.push(box('trak', tkhd, box('mdia', mdhd, T.hdlr, box('minf', T.mh, T.dinf, box('stbl', ...parts)))));
  });
  const mvhd = Buffer.alloc(100); mvhd.writeUInt32BE(1000, 12); mvhd.writeUInt32BE(maxMs, 16); mvhd.writeUInt32BE(0x00010000, 20); mvhd.writeUInt16BE(0x0100, 24);
  [0x00010000, 0, 0, 0, 0x00010000, 0, 0, 0, 0x40000000].forEach((v, i) => mvhd.writeUInt32BE(v, 36 + i * 4)); mvhd.writeUInt32BE(ids[ids.length - 1] + 1, 96);
  return { moov: box('moov', full('mvhd', 0, 0, mvhd.slice(4)), ...traks), ms: maxMs };
}
const ftyp = box('ftyp', 'isom', u32(0x200), 'isomiso2avc1mp41');
const zero = order.map(T => T.samples.map(() => 0)), moovSize = build(zero).moov.length;
const dataStart = ftyp.length + moovSize + 8, offsets = [], chunks = []; let pos = dataStart;
for (const T of order) { const o = []; for (const s of T.samples) { o.push(pos); chunks.push(b.slice(s.off, s.off + s.size)); pos += s.size; } offsets.push(o); }
const { moov: newMoov, ms } = build(offsets); if (newMoov.length !== moovSize) throw new Error('moov size changed');
const mdatH = Buffer.alloc(8); mdatH.writeUInt32BE(8 + pos - dataStart, 0); mdatH.write('mdat', 4);
fs.writeFileSync(outp, Buffer.concat([ftyp, newMoov, mdatH, ...chunks]));
console.log('ok', outp, (ms / 1000).toFixed(2) + 's', order.map(T => T.kind + ':' + T.samples.length + (T.kind === 'vide' ? ' sync=' + T.samples.filter(s => s.sync).length : '')).join(' '), (fs.statSync(outp).size / 1048576).toFixed(1) + ' MB');
