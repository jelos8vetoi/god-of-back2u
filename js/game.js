(() => {
'use strict';
const $ = id => document.getElementById(id);
const C = $('c'), X = C.getContext('2d');
const W = 1280, H = 720, AW = 1900, AH = 1150, TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const ang = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const adiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return Math.abs(d); };
const show = (id, on) => $(id).classList.toggle('on', !!on);

function fit() { $('stage').style.transform = `scale(${Math.min(innerWidth / W, innerHeight / H)})`; }
addEventListener('resize', fit); fit();

/* ================= ЗВУК ================= */
let AC = null, MG = null, NB = null, muted = false;
function audio() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); MG = AC.createGain(); MG.gain.value = .5; MG.connect(AC.destination); } catch (e) { AC = null; }
}
function tone(f, d, type, v, f2, when) {
  if (!AC || muted) return;
  const t = AC.currentTime + (when || 0), o = AC.createOscillator(), g = AC.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t + d);
  g.gain.setValueAtTime(v || .2, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
  o.connect(g); g.connect(MG); o.start(t); o.stop(t + d + .02);
}
function noise(d, v, hp, when) {
  if (!AC || muted) return;
  if (!NB) { NB = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const a = NB.getChannelData(0); for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1; }
  const t = AC.currentTime + (when || 0), s = AC.createBufferSource(), g = AC.createGain(), f = AC.createBiquadFilter();
  s.buffer = NB; f.type = 'highpass'; f.frequency.value = hp || 1000;
  g.gain.setValueAtTime(v || .2, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
  s.connect(f); f.connect(g); g.connect(MG); s.start(t); s.stop(t + d + .02);
}
const sfx = {
  swing: () => noise(.09, .12, 2500),
  hit: h => { tone(h ? 95 : 170, h ? .22 : .1, 'square', .22, 45); noise(.06, .2, 800); },
  shoot: () => { tone(900, .08, 'triangle', .12, 400); },
  hurt: () => { tone(220, .25, 'sawtooth', .25, 60); noise(.15, .2, 300); },
  boom: () => { tone(110, .6, 'sine', .7, 28); noise(.25, .25, 200); },
  parry: () => { tone(1400, .15, 'square', .2, 2200); tone(700, .2, 'triangle', .2); },
  block: () => noise(.07, .18, 1500),
  ui: () => tone(660, .06, 'square', .08),
  buy: () => { tone(520, .08, 'square', .12); tone(780, .12, 'square', .12, 0, .08); },
  adlib: () => { tone(440, .18, 'sawtooth', .22, 660); tone(880, .12, 'square', .1, 0, .1); },
  rage: () => { tone(60, .9, 'sawtooth', .4, 240); noise(.5, .2, 500); },
  pick: () => tone(880, .1, 'sine', .15, 1320),
  type: () => tone(rnd(500, 620), .02, 'square', .025),
};
const midi = n => 440 * Math.pow(2, (n - 69) / 12);
/* ---------- музыка: свой стиль у каждой локации ---------- */
const SC_MIN = [0, 2, 3, 5, 7, 8, 10], SC_PHR = [0, 1, 3, 5, 7, 8, 10], SC_DOR = [0, 2, 3, 5, 7, 9, 10], SC_HM = [0, 2, 3, 5, 7, 8, 11];
const MUS = [
  { n: 'клауд-рэп', bpm: 132, root: 45, sc: SC_MIN, prog: [0, 5, 3, 4], lead: 'bell', k: [0, 6, 10], s: [8], hat: 2, dens: .45, bass: [0, 6, 10] },
  { n: 'бум-бэп из подвала', bpm: 88, root: 43, sc: SC_DOR, prog: [0, 3, 0, 4], lead: 'ep', k: [0, 7, 10], s: [4, 12], hat: 2, swing: .12, dens: .6, bass: [0, 7, 10], crackle: 1 },
  { n: 'клубный гиперпоп', bpm: 150, root: 48, sc: SC_MIN, prog: [0, 5, 2, 6], lead: 'sq', k: [0, 4, 8, 11, 14], s: [4, 12], hat: 1, dens: .8, bass: [0, 8, 11], arp: 1 },
  { n: 'витч-хаус', bpm: 108, root: 38, sc: SC_PHR, prog: [0, 1, 0, 5], lead: 'saw', k: [0, 10], s: [8], hat: 4, dens: .3, bass: [0, 10], dark: 1 },
  { n: 'дрилл', bpm: 142, root: 41, sc: SC_HM, prog: [0, 5, 3, 6], lead: 'ep', k: [0, 7, 10], s: [6, 14], hat: 'drill', dens: .5, bass: [0, 3, 7, 10], slide: 1 },
  { n: 'эмо-рэп', bpm: 120, root: 45, sc: SC_MIN, prog: [0, 5, 2, 4], lead: 'pluck', k: [0, 8], s: [4, 12], hat: 2, dens: .75, bass: [0, 8], arp: 1 },
  { n: 'фонк', bpm: 136, root: 40, sc: SC_PHR, prog: [0, 0, 1, 0], lead: 'cow', k: [0, 3, 8, 11], s: [4, 12], hat: 1, dens: .7, bass: [0, 3, 8, 11], dist: 1 },
  { n: 'рейдж', bpm: 156, root: 46, sc: SC_MIN, prog: [0, 3, 5, 4], lead: 'saw', k: [0, 6, 8, 14], s: [4, 12], hat: 1, dens: .65, bass: [0, 6, 8, 14] },
  { n: 'драм-н-бейс', bpm: 172, root: 39, sc: SC_PHR, prog: [0, 1, 5, 4], lead: 'sq', k: [0, 10], s: [4, 12], hat: 1, dens: .55, bass: [0, 10, 13], dark: 1, arp: 1 },
];
let mStep = 0, mNext = 0, mCh = -1, mMel = [], FX = null;
function mkMel(ch) {
  let sd = 1234 + ch * 977; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647, m = MUS[ch], out = []; let deg = 4;
  for (let i = 0; i < 64; i++) {
    if (i >= 32 && R() < .78) { out.push(out[i - 32]); continue; }
    const strong = i % 4 === 0, on = m.arp ? i % 2 === 0 : R() < (strong ? m.dens : m.dens * .35);
    if (!on) { out.push(null); continue; }
    if (m.arp) deg = [0, 2, 4, 7, 4, 2][(i / 2 | 0) % 6] + (R() < .15 ? 1 : 0); else deg = clamp(deg + Math.round((R() - .5) * 5), 0, 9);
    out.push(deg);
  }
  return out;
}
function fxOut() {
  if (!FX) { const d = AC.createDelay(1), fb = AC.createGain(), w = AC.createGain(); d.delayTime.value = .28; fb.gain.value = .35; w.gain.value = .5; d.connect(fb); fb.connect(d); d.connect(w); w.connect(MG); FX = d; }
  return FX;
}
function voice(f, d, type, v, when, o) {
  if (!AC || muted) return; o = o || {};
  const t = AC.currentTime + when, os = AC.createOscillator(), g = AC.createGain(); os.type = type; os.frequency.setValueAtTime(f, t);
  if (o.f2) os.frequency.exponentialRampToValueAtTime(o.f2, t + d * .8); if (o.det) os.detune.value = o.det;
  g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(v, t + (o.att || .005)); g.gain.exponentialRampToValueAtTime(.001, t + d);
  let n = os;
  if (o.cut) { const fl = AC.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(o.cut, t); if (o.sweep) fl.frequency.exponentialRampToValueAtTime(o.sweep, t + d); os.connect(fl); n = fl; }
  n.connect(g); g.connect(MG); if (o.fx) g.connect(fxOut()); os.start(t); os.stop(t + d + .03);
}
function lead(kind, f, w, v) {
  switch (kind) {
    case 'bell': voice(f, .9, 'sine', v, w, { fx: 1 }); voice(f * 2.01, .5, 'sine', v * .4, w, { fx: 1 }); voice(f * 3, .2, 'sine', v * .15, w); break;
    case 'ep': voice(f, .5, 'triangle', v * 1.2, w, { fx: 1 }); voice(f * 2, .25, 'sine', v * .3, w); break;
    case 'sq': voice(f, .16, 'square', v * .5, w, { cut: 2600, fx: 1 }); break;
    case 'saw': voice(f, .4, 'sawtooth', v * .5, w, { cut: 1800, sweep: 500, fx: 1, det: -9 }); voice(f, .4, 'sawtooth', v * .5, w, { cut: 1800, sweep: 500, det: 9 }); break;
    case 'pluck': voice(f, .45, 'sawtooth', v * .7, w, { cut: 3000, sweep: 300, fx: 1 }); break;
    case 'cow': voice(f, .22, 'square', v * .5, w, { cut: 3500, fx: 1 }); voice(f * 1.48, .22, 'square', v * .4, w, { cut: 3500 }); break;
  }
}
function music() {
  if (!AC || muted || !S || mode === 'menu' || mode === 'pause' || mode === 'end') return;
  const ch = Math.min(S.ch, MUS.length - 1), m = MUS[ch]; if (mCh !== ch) { mCh = ch; mMel = mkMel(ch); mStep = 0; }
  const sp = 60 / m.bpm / 4, hot = mode === 'fight' && !!fs && !fs.done, boss = hot && !!fs.boss;
  if (mNext < AC.currentTime) mNext = AC.currentTime + .05;
  while (mNext < AC.currentTime + .25) {
    const s = mStep % 16, bar = mStep / 16 | 0, s64 = mStep % 64, w = mNext - AC.currentTime + (m.swing && s % 2 ? sp * m.swing * 2 : 0);
    const pd = m.prog[bar % 4], nf = d => { const q = pd + d; return midi(m.root + m.sc[((q % 7) + 7) % 7] + 12 * Math.floor(q / 7)); };
    if (s === 0) for (const d of [0, 2, 4]) voice(nf(d) * 2, sp * 16, 'sawtooth', m.dark ? .035 : .028, w, { cut: m.dark ? 500 : 800, att: .3, det: d * 4 });
    const dg = mMel[s64]; if (dg != null && (hot || s64 % 2 === 0 || m.arp)) lead(m.lead, nf(dg) * 4 * (boss && s64 % 8 === 4 ? 2 : 1), w, hot ? .11 : .08);
    if (m.crackle && Math.random() < .3) noise(.02, .015, 5000, w);
    if (hot) {
      if (m.k.includes(s)) tone(150, .11, 'sine', .34, 40, w);
      if (m.bass.includes(s)) { const f = nf(0); voice(f, sp * (m.slide ? 5 : 3.5), m.dist ? 'triangle' : 'sine', m.dist ? .36 : .3, w, { f2: m.slide && s === m.bass[m.bass.length - 1] ? f * 1.5 : f * .97, att: .01 }); }
      if (m.s.includes(s)) { noise(m.dark ? .22 : .12, .13, 1500, w); tone(190, .08, 'triangle', .1, 120, w); }
      if (m.hat === 'drill' ? [0, 3, 6, 8, 11, 14].includes(s) : s % m.hat === 0) noise(.03, .045, 7500, w);
      if (m.hat !== 4 && bar % 4 === 3 && s >= 12) noise(.02, .04, 8000, w + sp * .5);
      if (boss && s % 4 === 2) noise(.05, .05, 4000, w);
    } else {
      if (s % 8 === 4) noise(.03, .025, 7500, w);
      if (s === 0 && bar % 2 === 0) voice(nf(0), sp * 12, 'sine', .14, w, { att: .05 });
    }
    mNext += sp; mStep++;
  }
}
setInterval(music, 80);

/* ================= СОСТОЯНИЕ ================= */
const KEY = 'god_of_cloud_v2';
let S = null, mode = 'menu', T = 0;
let P = null, ens = [], prj = [], haz = [], orbs = [], pts = [], rings = [], bolts = [], txt = [], timers = [], deco = [];
let cam = { x: 0, y: 0 }, shake = 0, hitstop = 0, slowmo = 0, flash = 0;
let fs = null, comp = { x: 0, y: 0, say: '', sayT: 0 };
let titleT = 0, titleCb = null, toastT = 0, shownTitle = -1, upShop = false, upPrev = 'fight';
const K = {}, M = { x: W / 2, y: H / 2, l: false, r: false };
let camYaw = -Math.PI / 2, camPit = .36, camD = 270, obs = [], fpsA = 60, qual = 2, qT = 0;
const FIST = { dmg: 9, range: 58, arc: 1.7, wind: .06, dur: .17, cd: .04, kb: 90 };
const lock = () => { try { if (document.pointerLockElement !== C && C.requestPointerLock) C.requestPointerLock(); } catch (e) {} };
function inputDir() { const ix = (K.KeyD ? 1 : 0) - (K.KeyA ? 1 : 0), iy = (K.KeyW ? 1 : 0) - (K.KeyS ? 1 : 0), c = Math.cos(camYaw), s = Math.sin(camYaw); return [c * iy - s * ix, s * iy + c * ix]; }
function pushOut(o, r) { for (const b of obs) { const dx = o.x - b.x, dy = o.y - b.y, m = b.r + r, d2 = dx * dx + dy * dy; if (d2 < m * m && d2 > .01) { const d = Math.sqrt(d2); o.x = b.x + dx / d * m; o.y = b.y + dy / d * m; } } }

const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } };
const sk = id => !!S.sk[id];
const has = id => !!(S.trk && S.trk.eq.includes(id));
const maxHp = () => 100 + 20 * S.st.hp + (S.hpB || 0) + (has('beanie') ? 25 : 0);
const dmgMul = w => (1 + .08 * S.st.str) * (w ? 1 + .2 * (S.wl[w] - 1) : 1) * (P.rage > 0 ? 1.5 : 1) * (P.buff > 0 ? 1.3 : 1) * (has('tape') && P.hp < maxHp() * .3 ? 1.4 : 1);

function toast(msg, d) { const t = $('toast'); t.textContent = msg; t.style.display = 'block'; toastT = d || 3.5; }

function newGame(diff) {
  S = { ch: 0, step: 0, xp: 0, tapes: 0, wl: { bat: 1, mic: 0, vinyl: 0 }, sk: {}, st: { hp: 0, str: 0, swag: 0 }, comp: 0, diff, weapon: 'bat', q: {}, done: {}, hpB: 0, trk: { owned: {}, eq: [] } };
  begin();
}
function begin() {
  S.q = S.q || {}; S.done = S.done || {}; S.hpB = S.hpB || 0; S.trk = S.trk || { owned: {}, eq: [] };
  P = { x: AW / 2, y: AH / 2, r: 17, hp: maxHp(), aim: 0, atk: null, acd: 0, combo: 0, lastAtk: -9, acount: 0, dodge: 0, dcd: 0, dvx: 0, dvy: 0, post: 0, inv: 0,
    block: false, blockT: 0, swag: 0, rage: 0, buff: 0, spin: 0, spinT: 0, qcd: 0, rcd: { bat: 0, mic: 0, vinyl: 0 } };
  comp.x = P.x - 40; comp.y = P.y + 30; shownTitle = -1;
  if (!T3) alert('3D-движок не загрузился: в папке js нет файла three.min.js.');
  ['menu', 'dead', 'pause', 'choice', 'end', 'up'].forEach(i => show(i, false));
  startChapter(); lock();
}

/* ================= ХОД СЮЖЕТА / ЛОКАЦИЯ ================= */
let LV = null, ents = [], objRoom = null, prompt = '', target = null;
const inR = (r, x, y, m) => x >= r.x + m && x <= r.x + r.w - m && y >= r.y + m && y <= r.y + r.h - m;
function okPos(x, y, m) { for (const r of LV.rects) if (inR(r, x, y, m)) return true; return false; }
const RX = (v, m) => clamp(v, fs.room.x + m, fs.room.x + fs.room.w - m), RY = (v, m) => clamp(v, fs.room.y + m, fs.room.y + fs.room.h - m);
const steps = () => CH[S.ch].steps;
const exitOpen = () => { const st = steps()[S.step]; return !st || st.t === 'shop'; };
const PROP_R = { snow: v => v < .4 ? 10 : v < .7 ? 26 : 34, basement: () => 30, neon: () => 20, swamp: v => v < .5 ? 24 : 12, glass: v => v < .6 ? 40 : 15, grave: () => 22, server: () => 32, chart: () => 24, core: () => 20 };
function makeDeco() {
  deco = []; obs = []; const k = CH[S.ch].th.deco;
  for (const r of LV.rooms) {
    const big = r.kind === 'fight' || r.kind === 'boss', spots = [];
    for (let i = 0, n = Math.round(r.w * r.h / 110000); i < n; i++) deco.push({ x: rnd(r.x + 70, r.x + r.w - 70), y: rnd(r.y + 70, r.y + r.h - 70), s: rnd(.6, 1.3), v: Math.random(), k });
    if (big) {
      for (let t = 0, n = r.kind === 'boss' ? 6 : 9; spots.length < n && t < 300; t++) {
        const x = rnd(r.x + 90, r.x + r.w - 90), y = rnd(r.y + 90, r.y + r.h - 90);
        if (Math.abs(x - r.cx) < 150 || Math.abs(y - r.cy) < 150 || (r.kind === 'boss' && Math.hypot(x - r.cx, y - r.cy) < 380) || spots.some(p => Math.hypot(p.x - x, p.y - y) < 170)) continue;
        spots.push({ x, y });
      }
    } else for (const dx of [-1, 1]) spots.push({ x: r.cx + dx * (r.w / 2 - 70), y: r.cy + r.h / 2 - 70 });
    for (const p of spots) { const v = Math.random(), d = { x: p.x, y: p.y, s: 1, v, k, solid: 1, r: PROP_R[k](v) }; deco.push(d); obs.push(d); }
  }
}
function loadLevel() {
  LV = buildLevel(S.ch); ents = []; fs = null; ens = []; prj = []; haz = []; orbs = []; timers = []; bolts = []; rings = []; objRoom = null;
  if (S.ch > 0) ents.push({ k: 'seva', x: LV.main[0].cx - 200, y: LV.main[0].cy - 160 });
  ents.push({ k: 'seva', x: LV.exit.cx - 170, y: LV.exit.cy - 130 }, { k: 'portal', x: LV.exit.cx + 90, y: LV.exit.cy + 30 });
  for (const r of LV.sides) {
    const s = r.side;
    if (s.npc) ents.push({ k: 'npc', id: s.npc, x: r.cx, y: r.cy - 130 });
    if (s.lore != null) ents.push({ k: 'lore', id: 'c' + S.ch + 'lore' + s.lore, i: s.lore, x: r.cx - 180, y: r.cy + 120 });
    if (s.chest) ents.push({ k: 'chest', id: s.id + 'c', loot: s.chest, x: r.cx + 180, y: r.cy + 110, room: r });
  }
  makeDeco();
  let cp = LV.main[0]; for (let i = 0; i < S.step; i++) if (LV.stepRoom[i]) cp = LV.stepRoom[i];
  P.x = cp.cx; P.y = cp.cy + 40; P.thr = null; P.chg = 0; P.atk = null; P.dodge = 0; P.inv = 0; P.spin = 0; slowmo = 0; hitstop = 0; comp.x = P.x - 40; comp.y = P.y + 30;
}
function startChapter() {
  loadLevel(); save(); const ch = CH[S.ch];
  $('tnum').textContent = 'ГЛАВА ' + (S.ch + 1) + ' ИЗ ' + CH.length; $('tname').textContent = ch.name; $('tplace').textContent = ch.place;
  ['dlg', 'choice', 'up'].forEach(i => show(i, false));
  show('title', true); mode = 'title'; titleT = 3; titleCb = () => { mode = 'fight'; }; sfx.boom();
}
function nextChapter() { S.ch++; S.step = 0; P.hp = maxHp(); startChapter(); }
function reward(rw, title) {
  const a = [];
  if (rw.xp) { S.xp += rw.xp; a.push('▶ ' + rw.xp); }
  if (rw.tapes) { S.tapes += rw.tapes; a.push('▣ ' + rw.tapes + ' мастер-лент'); }
  if (rw.hp) { S.hpB += rw.hp; P.hp += rw.hp; a.push('+' + rw.hp + ' к макс. здоровью'); }
  if (rw.item) { S.trk.owned[rw.item] = 1; if (S.trk.eq.length < 3) S.trk.eq.push(rw.item); a.push('цацка «' + TRK[rw.item].n + '» (TAB — надеть/снять)'); }
  toast(title + ':  ' + a.join('  ·  '), 5); sfx.buy(); save();
}
function startEnc(room, waves, bossId, cb) {
  fs = { room, waves, i: 0, boss: null, done: false, clearT: 0, cb }; ens = []; prj = []; haz = [];
  if (bossId) spawnBoss(bossId); else spawnWave();
  sfx.boom(); shake = 8;
}
function pump() {
  objRoom = null;
  const st = steps()[S.step];
  if (!st || st.t === 'shop') { objRoom = LV.exit; return; }
  switch (st.t) {
    case 'dlg': {
      const nx = steps()[S.step + 1];
      if (nx && nx.t === 'boss' && !inR(LV.stepRoom[S.step + 1], P.x, P.y, 110)) { objRoom = LV.stepRoom[S.step + 1]; return; }
      startDlg(st.l, () => { S.step++; save(); }); break;
    }
    case 'give':
      if (st.o.weapon) { S.wl[st.o.weapon] = Math.max(1, S.wl[st.o.weapon]); S.weapon = st.o.weapon; }
      if (st.o.tapes) S.tapes += st.o.tapes;
      if (st.o.comp) S.comp = Math.max(S.comp, st.o.comp);
      toast(st.msg, 4.5); sfx.buy(); S.step++; save(); break;
    case 'fight': case 'boss': {
      const r = LV.stepRoom[S.step]; objRoom = r;
      if (inR(r, P.x, P.y, 110)) startEnc(r, st.t === 'boss' ? null : st.w, st.t === 'boss' ? st.id : null, () => { S.step++; save(); });
      break;
    }
    case 'choice': mode = 'choice'; show('choice', true); break;
  }
}
function qReady(id) {
  const n = NPCS[id], q = S.q[id];
  if (n.q.type === 'kill') return q.n >= n.q.n;
  if (n.q.type === 'lore') return [0, 1].filter(i => S.done['c' + S.ch + 'lore' + i]).length >= n.q.n;
  const r = LV.sides.find(s => s.side.q === id); return !!(r && S.done[r.side.id]);
}
function scan() {
  target = null; prompt = '';
  let best = 150;
  for (const e of ens) if (e.fin && !e.dead) { const d = dist(e, P) - e.r; if (d < best) { best = d; target = { fin: e }; prompt = '[F]  ДОБИТЬ'; } }
  if (fs) return;
  for (const r of LV.sides) {
    const s = r.side;
    if (s.guard && !S.done[s.id] && inR(r, P.x, P.y, 110)) { startEnc(r, s.guard, null, () => { S.done[s.id] = 1; toast('Тупик зачищен', 2.5); save(); }); return; }
  }
  for (const o of ents) {
    const d = dist(o, P);
    if (o.k === 'lore') { if (!S.done[o.id] && d < 44) { S.done[o.id] = 1; S.xp += 60; toast('📼  ' + LORE[S.ch][o.i], 9); sfx.pick(); save(); } }
    else if (o.k === 'portal') {
      if (d < 58) { if (exitOpen()) { nextChapter(); return; } if (!(o.w > T)) { o.w = T + 3; toast('Портал закрыт: сначала разберись с этим сервером', 2.5); } }
    } else if (d < 95) {
      if (o.k === 'chest') { if (S.done[o.id] || (o.room.side.guard && !S.done[o.room.side.id])) continue; prompt = '[F]  Открыть сундук'; }
      else if (o.k === 'npc') prompt = '[F]  Поговорить: ' + NPCS[o.id].n;
      else prompt = '[F]  Дядя Сева на связи — мастерская';
      target = { o };
    }
  }
}
function talk(o) {
  const n = NPCS[o.id], q = S.q[o.id] || (S.q[o.id] = { st: 0, n: 0 }), key = 'n_' + o.id;
  const L = a => a.map(l => /^[A-Z0-9]{1,2}\|/.test(l) ? l : key + '|' + l);
  if (q.st === 0) startDlg(L(n.intro), () => { q.st = 1; toast('Новая услуга: ' + n.q.txt, 5); save(); });
  else if (q.st === 1 && !qReady(o.id)) startDlg(L(['Ну что там? ' + n.q.txt + '. Я подожду.']), () => {});
  else if (q.st === 1) startDlg(L(n.done), () => { q.st = 3; reward(n.rw, 'Услуга выполнена'); });
  else startDlg(L(['Удачи наверху. И малому передай: пусть не вырезает дыхание.']), () => {});
}
function doFinish(e) {
  const a = ang(e, P); P.x = e.x + Math.cos(a) * (e.r + P.r + 6); P.y = e.y + Math.sin(a) * (e.r + P.r + 6);
  if (fs) { P.x = RX(P.x, P.r); P.y = RY(P.y, P.r); }
  P.aim = a + Math.PI; P.inv = Math.max(P.inv, .9); P.atk = null; slowmo = .7; shake = 18; flash = .25; sfx.boom(); sfx.hit(true);
  burst(e.x, e.y, '#ffe14a', 40); ring(e.x, e.y, 150, '#ffe14a'); float(e.x, e.y - e.r - 40, 'ДОБИВАНИЕ', '#ffe14a', 1);
  P.hp = Math.min(maxHp(), P.hp + maxHp() * (has('pin') ? .09 : .045)); P.swag = Math.min(100, P.swag + 15);
  e.fin = false; e.sm = 0;
  if (e.boss) { e.stun = .6; dmgE(e, e.maxhp * .08, { heavy: true }); e.sm = 0; }
  else { e.xp = Math.round(e.xp * 1.5); e.hp = 0; kill(e, {}); }
}
function doInteract() {
  if (!target) return;
  if (target.fin) { doFinish(target.fin); return; }
  const o = target.o;
  if (o.k === 'chest') { S.done[o.id] = 1; reward(o.loot, 'Сундук'); }
  else if (o.k === 'npc') talk(o);
  else { P.hp = maxHp(); openUp(true); }
}

/* ---------- диалоги ---------- */
let dq = [], di = 0, dch = 0, dfull = '', dlgCb = null;
function startDlg(lines, cb) { mode = 'dlg'; dq = lines; di = 0; dlgCb = cb; show('dlg', true); showLine(); }
function showLine() {
  const i = dq[di].indexOf('|'), k = dq[di].slice(0, i), s = SPK[k];
  dfull = dq[di].slice(i + 1); dch = 0;
  $('dname').textContent = s.n; $('dname').style.color = s.c; $('dlg').style.borderLeftColor = s.c;
  $('dtext').className = k === 'M' ? 'msg' : k === 'N' ? 'nar' : ''; $('dtext').textContent = '';
  if (k === 'MV') { sfx.adlib(); shake = 6; }
}
function advDlg() {
  if (mode !== 'dlg') return;
  if (dch < dfull.length) { dch = dfull.length; $('dtext').textContent = dfull; return; }
  di++; sfx.ui();
  if (di >= dq.length) endDlg(); else showLine();
}
function endDlg() { show('dlg', false); const cb = dlgCb; dlgCb = null; mode = 'fight'; if (cb) cb(); }

/* ---------- концовки ---------- */
function ending(a) {
  show('choice', false); S.ending = a ? 'A' : 'B'; save();
  startDlg(a ? ENDING_A : ENDING_B, () => {
    mode = 'end'; $('endT').textContent = a ? 'BACK 2 U' : 'ПРОЧИТАНО';
    $('endS').textContent = a ? 'хорошая концовка · спасибо за игру' : 'плохая концовка · «Продолжить» в меню вернёт к выбору';
    show('end', true);
  });
}

/* ================= СПАВН ================= */
function edgePos() {
  for (let i = 0; i < 30; i++) {
    const r = fs.room, p = { x: rnd(r.x + 70, r.x + r.w - 70), y: rnd(r.y + 70, r.y + r.h - 70) };
    if (dist(p, P) > 340) return p;
  }
  return { x: fs.room.cx, y: fs.room.cy };
}
function mkEnemy(type, x, y) {
  const d = EN[type], sc = 1 + S.ch * .28;
  return { type, d, ai: d.ai, x, y, r: d.r, hp: d.hp * sc, maxhp: d.hp * sc, dmg: d.dmg * (1 + S.ch * .18), spd: d.spd * rnd(.9, 1.1) * (1 + S.ch * .02), c: d.c,
    state: 'idle', t: 0, cdT: rnd(.6, 2), aa: 0, kx: 0, ky: 0, stun: 0, slow: 0, spawn: .7, fl: 0, xp: Math.round(d.xp * .42 * (1 + S.ch * .15)), rng: d.rng || 50 };
}
function spawnWave() {
  if (S.ch >= 2 && fs.room.kind === 'fight') for (let i = 0, N = 1 + (S.ch / 3 | 0); i < N; i++) { const p = edgePos(); ens.push(mkEnemy('mod', p.x, p.y)); }
  for (const [type, n, el] of fs.waves[fs.i]) {
    const N = el ? n : Math.ceil(n * (EN[type].ai === 'ranged' ? 2 : 1.6));
    for (let i = 0; i < N; i++) { const p = edgePos(), m = mkEnemy(type, p.x, p.y); if (el) { m.hp = m.maxhp = m.hp * 2.6; m.dmg *= 1.3; m.r *= 1.3; m.xp *= 4; m.el = 1; } ens.push(m); }
  }
}
function spawnBoss(id) {
  const d = BOSS[id];
  const b = { type: id, d, boss: true, ai: 'boss', x: fs.room.cx, y: fs.room.cy - fs.room.h * .3, r: d.r, hp: d.hp * 1.3, maxhp: d.hp * 1.3, dmg: d.dmg * 1.12, spd: d.spd, c: d.c,
    state: 'idle', t: 0, cdT: 1.6, aa: 0, kx: 0, ky: 0, stun: 0, slow: 0, spawn: 1.2, fl: 0, xp: Math.round(d.xp * .6), ph: 0, mv: '', last: '', spiral: null, say: '', sayT: 0, tx: 0, ty: 0 };
  ens.push(b); fs.boss = b;
}

/* ================= БОЙ: ИГРОК ================= */
function tryAtk(heavy, c) {
  if (P.atk || P.acd > 0 || P.dodge > 0 || P.spin > 0) return;
  const w = S.weapon, fist = w === 'bat' && P.thr;
  if (fist && heavy) { doThrow(); return; }
  const d = fist ? FIST : WP[w][heavy ? 'heavy' : 'light'];
  if (!heavy) P.combo = (T - P.lastAtk < .8) ? P.combo + 1 : 1; else P.combo = 0;
  P.lastAtk = T; P.acount++;
  const full = heavy && c >= .95, sw = P.swT > 0, crit = P.crit > 0;
  P.atk = { w, d, heavy, c: c || 0, full, sw, crit, t: 0, wind: d.wind, dur: d.dur, cd: d.cd, done: false, a: aimAssist(w), combo: P.combo, post: P.post > 0, n: P.acount };
  if (sw) { P.swT = 0; float(P.x, P.y - 48, 'СВИТЧ', WP[w].col); }
  if (crit) P.crit = 0;
  if (full) { float(P.x, P.y - 62, 'ПОЛНЫЙ ЗАРЯД', '#ffffff', 1); shake = Math.max(shake, 6); }
  P.post = 0; sfx.swing();
}
function aimAssist(w) {
  const rg = w === 'vinyl' ? 650 : 250; let best = null, bs = .75;
  for (const e of ens) { if (e.dead || e.spawn > 0) continue; const d = dist(e, P); if (d > rg + e.r) continue; const df = adiff(ang(P, e), P.aim) + d / 2500; if (df < bs) { bs = df; best = e; } }
  return best ? ang(P, best) : P.aim;
}
function doThrow() {
  if (P.thr) { if (P.thr.st !== 'back') { P.thr.st = 'back'; P.thr.hit = new Set(); sfx.swing(); } return; }
  if (S.weapon !== 'bat' || P.atk || P.dodge > 0) return;
  P.thr = { x: P.x, y: P.y, a: aimAssist('vinyl'), st: 'out', t: .5, hit: new Set(), rot: 0 }; P.chg = 0; sfx.swing(); float(P.x, P.y - 50, 'БРОСОК', '#ff5a2a');
}
function updThrow(dt) {
  const b = P.thr; if (!b) return; b.rot += dt * 26;
  if (b.st === 'out') { b.x += Math.cos(b.a) * 980 * dt; b.y += Math.sin(b.a) * 980 * dt; b.t -= dt; if (b.t <= 0 || !(fs ? inR(fs.room, b.x, b.y, 12) : okPos(b.x, b.y, 12)) || obs.some(o => (o.x - b.x) ** 2 + (o.y - b.y) ** 2 < o.r * o.r)) { b.st = 'stuck'; b.t = 3; } }
  else if (b.st === 'stuck') { b.t -= dt; if (b.t <= 0) { b.st = 'back'; b.hit = new Set(); } }
  else { const a = ang(b, P); b.x += Math.cos(a) * 1300 * dt; b.y += Math.sin(a) * 1300 * dt; if (dist(b, P) < 36) { P.thr = null; sfx.block(); P.swag = Math.min(100, P.swag + 4); return; } }
  if (b.st !== 'stuck') { const dm = WP.bat.heavy.dmg * dmgMul('bat') * .75; for (const e of ens) if (!e.dead && e.spawn <= 0 && !b.hit.has(e) && dist(e, b) < e.r + 24) { b.hit.add(e); dmgE(e, dm, { w: 'bat', kb: 200, heavy: true, stun: b.st === 'back' ? .5 : 0 }); sfx.hit(true); } }
}
function swW(w) { if (!S.wl[w] || S.weapon === w) return; S.weapon = w; P.atk = null; P.chg = 0; P.swT = 1.2; }
function react(e, dmg, o) {
  const rm = has('ring') ? 1.5 : 1, tx = (s, c) => float(e.x, e.y - e.r - 46, s, c, 1);
  if (o.w === 'bat') {
    if (e.shock > 0) {
      e.shock = 0; tx('ВЗРЫВ НИЗОВ', '#ff5a2a'); const R = sk('b7') ? 190 : 125, ad = dmg * (sk('b7') ? .9 : .6) * rm; ring(e.x, e.y, R, '#49e0ff'); sfx.boom(); shake = Math.max(shake, 8);
      timers.push({ t: .01, f: () => { for (const q of ens) if (q !== e && !q.dead && dist(q, e) < R + q.r) dmgE(q, ad, { kb: 260, stun: sk('b7') ? .8 : 0 }); } }); dmg *= 1.3 * rm;
    } else if (e.pitch > 0) { e.pitch = 0; tx('РАСКОЛ', '#e9e2ff'); dmg *= 1.6 * rm; o.stun = Math.max(o.stun || 0, 1); }
  } else if (o.w === 'mic') {
    if (e.pitch > 0) { e.pitch = 0; tx('ЗАМЫКАНИЕ', '#49e0ff'); dmg *= 1.3 * rm; o.stun = Math.max(o.stun || 0, 1.2); }
    e.shock = sk('m7') ? 7 : 3.5;
  } else if (o.w === 'vinyl') {
    if (e.shock > 0) {
      e.shock = 0; tx('ИСКРА', '#ffe14a'); dmg *= 1.5 * rm; const ad = dmg * .5;
      ens.filter(q => q !== e && !q.dead && q.spawn <= 0 && dist(q, e) < 260).sort((p, q) => dist(p, e) - dist(q, e)).slice(0, sk('v7') ? 3 : 1)
        .forEach(q => { bolts.push({ x1: e.x, y1: e.y, x2: q.x, y2: q.y, l: .2, c: '#ffe14a' }); timers.push({ t: .01, f: () => dmgE(q, ad, {}) }); });
    }
    e.pitch = sk('v6') ? 5 : 3;
  }
  return dmg;
}
function doHit(a, em) {
  const w = a.w, d = a.d || WP[w][a.heavy ? 'heavy' : 'light'], fin3 = !a.heavy && a.combo % 3 === 0;
  let base = d.dmg * dmgMul(w) * (em || 1) * (fin3 ? 1.45 : 1) * (a.heavy ? (1 + 1.3 * (a.c > .3 ? a.c : 0)) * (has('chain') ? 1.3 : 1) : 1) * (a.sw ? 1.35 : 1);
  if (a.crit && !em) { base *= 2; float(P.x, P.y - 76, 'КРИТ ×2', '#ffffff', 1); }
  if (w === 'vinyl') {
    const n = a.heavy ? (sk('v2') ? 5 : 3) : (sk('v2') ? 2 : 1), spread = a.heavy ? .17 : .08;
    for (let i = 0; i < n; i++) shootP(a.a + (i - (n - 1) / 2) * spread, d.speed, base);
    sfx.shoot(); return;
  }
  let mult = 1, stun = 0, arc = d.arc, range = d.range;
  if (w === 'bat') {
    if (fin3 && sk('b2')) { mult = 1.4; stun = 1.3; float(P.x, P.y - 40, 'КОМБО 4/4', '#ffb03b', 1); }
    if (a.post && sk('b3')) { mult *= 1.8; arc = TAU; range += 35; ring(P.x, P.y, range, '#ff5a2a'); float(P.x, P.y - 55, 'ДРОП!', '#ff5a2a', 1); }
  }
  if (w === 'mic' && a.heavy && sk('m1')) arc = TAU;
  const hit = [];
  for (const e of ens) { if (e.dead || e.spawn > 0) continue; if (dist(e, P) <= range + e.r && (arc >= TAU || adiff(ang(P, e), a.a) <= arc / 2)) hit.push(e); }
  for (const e of hit) dmgE(e, base * mult, { w, kb: d.kb * (fin3 ? 1.6 : 1), stun, heavy: a.heavy || fin3 && w === 'bat' });
  if (w === 'bat' && a.heavy && sk('b1')) {
    const cx = P.x + Math.cos(a.a) * range * .8, cy = P.y + Math.sin(a.a) * range * .8;
    ring(cx, cy, 145, '#ff5a2a'); sfx.boom(); shake = Math.max(shake, 9);
    for (const e of ens) if (!e.dead && !hit.includes(e) && Math.hypot(e.x - cx, e.y - cy) < 145 + e.r) dmgE(e, base * .6, { w, kb: 300, heavy: true });
  }
  if (w === 'mic') {
    if (a.heavy && sk('m3')) for (const e of ens) if (!e.boss && !e.dead && dist(e, P) < 290 && dist(e, P) > 70) { const an = ang(e, P); e.kx = Math.cos(an) * 520; e.ky = Math.sin(an) * 520; }
    if (sk('m2') && hit.length) {
      const src = hit[0];
      ens.filter(e => !e.dead && e.spawn <= 0 && !hit.includes(e) && dist(e, src) < 240).sort((p, q) => dist(p, src) - dist(q, src)).slice(0, 2)
        .forEach(o => { bolts.push({ x1: src.x, y1: src.y, x2: o.x, y2: o.y, l: .18, c: '#49e0ff' }); dmgE(o, base * .5, { w }); });
    }
    if (!em && a.n % 4 === 0 && sk('m6')) timers.push({ t: .17, f: () => { ring(P.x, P.y, range, '#49e0ff'); doHit(a, .6); } });
  }
  if (hit.length) { sfx.hit(a.heavy); hitstop = a.heavy ? .07 : .03; shake = Math.max(shake, a.heavy ? 7 : 3); }
}
function shootP(an, speed, dmg) {
  prj.push({ from: 'p', x: P.x + Math.cos(an) * 24, y: P.y + Math.sin(an) * 24, vx: Math.cos(an) * speed, vy: Math.sin(an) * speed, r: 9, dmg, life: .85,
    pierce: sk('v1'), bounce: sk('v3') ? 1 : 0, ret: sk('v4'), back: false, hit: new Set(), col: '#e9e2ff', rot: 0 });
}
function mkP(x, y, an, speed, dmg, o) {
  prj.push(Object.assign({ from: 'e', x, y, vx: Math.cos(an) * speed, vy: Math.sin(an) * speed, sp: speed, r: 8, dmg, life: 5, col: '#ff5050', hit: new Set(), rot: 0 }, o || {}));
}
function dmgE(e, dmg, o) {
  if (e.dead || e.spawn > 0) return;
  if (e.d.shield && o.w && !(e.brk > 0) && e.stun <= 0 && e.state !== 'rec' && e.state !== 'wind') {
    if (o.heavy) { e.brk = 4; e.stun = 1.3; float(e.x, e.y - e.r - 30, 'ЩИТ СЛОМАН', '#7fa8ff', 1); sfx.parry(); }
    else { float(e.x, e.y - e.r - 10, 'БЛОК', '#7fa8ff'); noise(.05, .12, 2500); e.sm = (e.sm || 0) + .04; return; }
  }
  if (o.w) { dmg = react(e, dmg, o); P.hits = (P.hitT > 0 ? P.hits || 0 : 0) + 1; P.hitT = 2.4; }
  if (o.w === 'bat' && e.stun > 0 && sk('b4')) dmg *= 1.5;
  e.hp -= dmg; e.fl = .1;
  e.sm = (e.sm || 0) + dmg / e.maxhp * (o.heavy ? .55 : 1.1) * (e.boss ? 2.2 : 1) + (o.sm || 0);
  if (e.sm >= 1 && !e.fin && e.hp > 0) { e.fin = true; e.stun = Math.max(e.stun, e.boss ? 2.5 : 4.5); float(e.x, e.y - e.r - 30, 'ДОБЕЙ!  [F]', '#ffe14a', 1); }
  float(e.x + rnd(-10, 10), e.y - e.r - 6, Math.round(dmg), dmg > 60 ? '#ffd23b' : '#fff');
  burst(e.x, e.y, e.c, 4);
  if (P.rage <= 0) P.swag = Math.min(100, P.swag + dmg * .08 * (has('energy') ? 1.4 : 1) * (1 + .25 * S.st.swag) * (o.w === 'mic' && sk('m4') ? 2 : 1));
  else P.hp = Math.min(maxHp(), P.hp + dmg * .02);
  if (!e.boss) {
    if (o.kb) { const an = ang(P, e); e.kx += Math.cos(an) * o.kb; e.ky += Math.sin(an) * o.kb; }
    if ((o.heavy || (e.ai !== 'brute' && !(e.poi > 0))) && e.state !== 'dash') { e.state = 'hurt'; e.t = .22; if (!o.heavy) e.poi = 1.2; }
    if (o.stun) e.stun = Math.max(e.stun, o.stun);
    if (o.slow) e.slow = o.slow;
  } else if (o.stun) e.stun = Math.max(e.stun, o.stun * .35);
  if (e.hp <= 0) kill(e, o);
}
function kill(e, o) {
  e.dead = true; if (has('flash')) e.xp = Math.round(e.xp * 1.3); S.xp += e.xp;
  for (const id in S.q) { const q = S.q[id], n = NPCS[id]; if (q.st === 1 && n.q.type === 'kill' && n.q.t === e.type && q.n < n.q.n) { q.n++; if (q.n >= n.q.n) toast('Услуга готова: вернись к ' + n.n, 4); } } float(e.x, e.y - e.r - 24, '+' + e.xp + ' ▶', '#7dff7d');
  burst(e.x, e.y, e.c, e.boss ? 80 : 14);
  if (o && o.w === 'bat' && sk('b6')) P.hp = Math.min(maxHp(), P.hp + maxHp() * .03);
  if (e.boss) {
    for (const q of ens) if (q !== e) { q.dead = true; burst(q.x, q.y, q.c, 8); }
    prj = []; haz = []; slowmo = 1.6; shake = 22; sfx.boom(); flash = .5;
  } else if (Math.random() < .1) orbs.push({ x: e.x, y: e.y, l: 12 });
}
function hurtP(dmg, src, isProj) {
  if (mode !== 'fight' || !fs || fs.done) return false;
  if (P.inv > 0) {
    if (P.dodge > 0 && !(P.pdT > 0)) { P.pdT = 1.5; P.crit = 3; slowmo = Math.max(slowmo, .5); P.swag = Math.min(100, P.swag + 8); float(P.x, P.y - 60, 'ТАЙМИНГ!', '#ffffff', 1); sfx.parry(); }
    return false;
  }
  if (P.block) {
    if (P.blockT < .2) {
      sfx.parry(); P.swag = Math.min(100, P.swag + 12); P.inv = .25; float(P.x, P.y - 40, 'ПАРИРОВАНИЕ', '#49e0ff', 1); ring(P.x, P.y, 60, '#49e0ff');
      if (src && !isProj) { src.sm = (src.sm || 0) + .5; src.stun = (src.boss ? .9 : 1.4) * (has('grillz') ? 1.6 : 1); if (!src.boss) src.state = 'idle'; }
      return 'parry';
    }
    dmg *= .4; sfx.block();
  } else sfx.hurt();
  dmg *= [.6, 1, 1.5][S.diff]; if (P.rage > 0) dmg *= .65;
  P.hits = 0; P.hitT = 0;
  P.hp -= dmg; P.inv = .4; shake = Math.max(shake, 10); flash = .25;
  float(P.x, P.y - 30, '-' + Math.round(dmg), '#ff4040');
  if (P.hp <= 0) die();
  return true;
}
const TIPS = ['Перекат [ПРОБЕЛ] даёт неуязвимость — катись СКВОЗЬ удар.', 'Блок [SHIFT], нажатый в последний момент, парирует и оглушает.', 'Красная зона на полу — уходи из неё.',
  'Зелёные сферы лечат. Накрутчиков и хейтеров убивай первыми.', 'Не забывай про TAB: прослушивания ▶ и ленты ▣ тратятся на прокачку.', 'ПЕРЕГРУЗ [R] вдвое режет входящий урон и лечит от ударов.'];
function die() { mode = 'dead'; $('deadTip').textContent = TIPS[Math.floor(rnd(0, TIPS.length))]; show('dead', true); sfx.boom(); }
function retry() { show('dead', false); const sw = P.swag; S = load() || S; P.hp = maxHp(); P.swag = sw * .5; P.rage = 0; loadLevel(); mode = 'fight'; lock(); }

function doRune() {
  const w = S.weapon, id = { bat: 'b5', mic: 'm5', vinyl: 'v5' }[w];
  if (!sk(id) || P.rcd[w] > 0 || P.atk || P.dodge > 0) return;
  P.rcd[w] = WP[w].rune.cd * (has('cart') ? .7 : 1); float(P.x, P.y - 50, WP[w].rune.name, WP[w].col, 1);
  if (w === 'bat') {
    ring(P.x, P.y, 270, '#ff5a2a'); ring(P.x, P.y, 180, '#ffb03b'); sfx.boom(); shake = 18; P.inv = Math.max(P.inv, .4);
    for (const e of ens) if (!e.dead && dist(e, P) < 270 + e.r) dmgE(e, 95 * dmgMul(w), { w, kb: 600, stun: 1.8, heavy: true });
  } else if (w === 'mic') { P.spin = 2; P.spinT = 0; sfx.rage(); }
  else { for (let i = 0; i < 18; i++) shootP(P.aim + i * TAU / 18, 620, 20 * dmgMul(w)); sfx.shoot(); shake = 6; }
}
function doQ() {
  if (S.comp < 1 || P.qcd > 0) return;
  P.qcd = (S.comp >= 4 ? 6 : 9) * (has('sim') ? .7 : 1);
  comp.say = ['ЭЙ!', 'ПОЕХАЛИ!', 'КАТЮХА!', 'sexyswag!'][Math.floor(rnd(0, S.comp))]; comp.sayT = 1.3;
  sfx.adlib(); ring(comp.x, comp.y, 120, '#5cd0ff');
  const near = ens.filter(e => !e.dead && e.spawn <= 0).sort((a, b) => dist(a, P) - dist(b, P));
  near.slice(0, 3).forEach(e => { bolts.push({ x1: comp.x, y1: comp.y, x2: e.x, y2: e.y, l: .25, c: '#5cd0ff' }); dmgE(e, 15 * dmgMul(), { stun: 1.6, sm: .5 }); });
  if (S.comp >= 2) P.buff = 5;
  if (S.comp >= 3) near.slice(0, 7).forEach((e, i) => haz.push({ x: e.x, y: e.y, r: 78, t: .5 + i * .12, mt: .5 + i * .12, dmg: 45 * (1 + S.ch * .15), pl: 1, col: '#5cd0ff' }));
  if (S.comp >= 4) P.swag = Math.min(100, P.swag + 30);
}
function doRage() { if (P.swag < 100 || P.rage > 0) return; P.rage = 8; P.swag = 0; sfx.rage(); shake = 14; ring(P.x, P.y, 200, '#ff4a1c'); float(P.x, P.y - 55, 'ПЕРЕГРУЗ!', '#ff4a1c', 1); }
function doDodge() {
  if (P.dcd > 0 || P.dodge > 0) return;
  let [mx, my] = inputDir();
  if (!mx && !my) { mx = Math.cos(P.aim); my = Math.sin(P.aim); }
  const l = Math.hypot(mx, my); P.dvx = mx / l * 700; P.dvy = my / l * 700;
  P.dodge = .22; P.dcd = .65; P.inv = Math.max(P.inv, has('pods') ? .38 : .27); P.atk = null; P.chg = 0; P.dn = (P.dn || 0) + 1; noise(.1, .08, 3000);
}

function updPlayer(dt) {
  let [mx, my] = inputDir();
  const ml = Math.hypot(mx, my); if (ml) { mx /= ml; my /= ml; }
  const ox = P.x, oy = P.y; P.mv = ml > 0;
  if (document.pointerLockElement !== C) { const ex = M.x / W - .5; if (Math.abs(ex) > .2) camYaw += (ex - Math.sign(ex) * .2) * dt * 4; }
  P.aim = camYaw;
  P.block = !!(K.ShiftLeft || K.ShiftRight) && !P.atk && P.dodge <= 0 && P.spin <= 0;
  if (P.block) P.blockT += dt; else P.blockT = 0;
  let sp = 255 * (has('kicks') ? 1.12 : 1) * (P.chg > .15 ? .5 : 1) * (P.buff > 0 ? 1.3 : 1) * (P.rage > 0 ? 1.2 : 1);
  if (P.block) sp *= .4; if (P.atk) sp *= P.atk.heavy ? .25 : .55;
  if (P.dodge > 0) { P.dodge -= dt; P.x += P.dvx * dt; P.y += P.dvy * dt; if (P.dodge <= 0) P.post = .4; }
  else { P.x += mx * sp * dt; P.y += my * sp * dt; }
  for (const k of ['dcd', 'inv', 'acd', 'post', 'buff', 'qcd', 'pdT', 'crit', 'swT', 'hitT']) if (P[k] > 0) P[k] -= dt;
  for (const w in P.rcd) if (P.rcd[w] > 0) P.rcd[w] -= dt;
  if (P.rage > 0) { P.rage -= dt; if (Math.random() < .5) pts.push({ x: P.x + rnd(-14, 14), y: P.y + rnd(-14, 14), vx: rnd(-30, 30), vy: rnd(-120, -40), l: .4, c: '#ff4a1c', s: 4 }); }
  if (P.spin > 0) {
    P.spin -= dt; P.spinT -= dt;
    if (P.spinT <= 0) { P.spinT = .15; for (const e of ens) if (!e.dead && dist(e, P) < 160 + e.r) dmgE(e, 13 * dmgMul('mic'), { w: 'mic', kb: 60 }); sfx.swing(); }
  }
  if (!P.block && P.spin <= 0) {
    if (M.r && !P.atk && P.dodge <= 0) { P.chg = Math.min(1, (P.chg || 0) + dt * 1.2); if (P.chg >= 1 && !P.chgF) { P.chgF = 1; sfx.parry(); } }
    else if (P.chg > 0) { const c = P.chg; P.chg = 0; P.chgF = 0; if (!P.atk) tryAtk(true, c); }
    else if (M.l) tryAtk(false);
  } else { P.chg = 0; P.chgF = 0; }
  if (P.atk) {
    const a = P.atk; a.t += dt;
    if (!a.done && a.t >= a.wind) { a.done = true; doHit(a); }
    if (a.t >= a.dur) { P.acd = a.cd; P.atk = null; }
  }
  if (fs && !fs.done) { P.x = RX(P.x, P.r); P.y = RY(P.y, P.r); }
  else if (!okPos(P.x, P.y, P.r)) { if (okPos(P.x, oy, P.r)) P.y = oy; else if (okPos(ox, P.y, P.r)) P.x = ox; else { P.x = ox; P.y = oy; } }
  pushOut(P, P.r);
  // кент идёт следом
  const tx = P.x + Math.cos(P.aim) * 30 + Math.sin(P.aim) * 95, ty = P.y + Math.sin(P.aim) * 30 - Math.cos(P.aim) * 95;
  comp.x += (tx - comp.x) * Math.min(1, dt * 4); comp.y += (ty - comp.y) * Math.min(1, dt * 4);
  if (comp.sayT > 0) comp.sayT -= dt;
}

/* ================= БОЙ: ВРАГИ ================= */
function moveE(e, an, sp, dt) { e.x += Math.cos(an) * sp * dt; e.y += Math.sin(an) * sp * dt; }
function updEnemy(e, dt) {
  if (e.fl > 0) e.fl -= dt;
  if (e.spawn > 0) { e.spawn -= dt; return; }
  if (e.shock > 0) { e.shock -= dt; if (sk('m7')) { e.hp -= 9 * dt * (1 + S.ch * .2); if (e.hp <= 0) { kill(e, {}); return; } } }
  if (e.pitch > 0) e.pitch -= dt; if (e.poi > 0) e.poi -= dt; if (e.brk > 0) e.brk -= dt;
  e.x += e.kx * dt; e.y += e.ky * dt; const fr = Math.pow(.004, dt); e.kx *= fr; e.ky *= fr;
  if (!e.boss) pushOut(e, e.r * .8);
  e.x = RX(e.x, e.r); e.y = RY(e.y, e.r);
  if (e.slow > 0) e.slow -= dt;
  if (e.stun > 0) { e.stun -= dt; if (e.stun <= 0 && e.fin) { e.fin = false; e.sm = 0; } return; }
  if (e.boss) return updBoss(e, dt);
  const sp = e.spd * (e.pitch > 0 ? (sk('v6') ? .45 : .7) : 1), agg = Math.max(.7, 1 - S.ch * .03), d = dist(e, P), a = ang(e, P);
  switch (e.state) {
    case 'hurt': case 'rec': e.t -= dt; if (e.t <= 0) e.state = 'idle'; return;
    case 'wind':
      e.t -= dt; if (e.ai === 'charger' && e.t > .25) e.aa = a;
      if (e.t <= 0) strike(e); return;
    case 'dash':
      moveE(e, e.aa, 780, dt); e.t -= dt;
      if (!e.hitP && dist(e, P) < e.r + P.r + 4) { e.hitP = true; if (hurtP(e.dmg, e) === 'parry') { e.t = 0; } }
      if (e.t <= 0) { e.state = 'rec'; e.t = .7; } return;
  }
  e.cdT -= dt;
  switch (e.ai) {
    case 'melee': case 'brute':
      if (d > e.rng * .75 + P.r) moveE(e, a, sp, dt);
      else { e.state = 'wind'; e.t = e.d.wind * agg; e.aa = a; }
      break;
    case 'ranged':
      if (d < 230) moveE(e, a + Math.PI, sp, dt); else if (d > 420) moveE(e, a, sp, dt); else moveE(e, a + Math.PI / 2, sp * .4, dt);
      if (e.cdT <= 0 && d < 620) { e.state = 'wind'; e.t = .3; e.cdT = e.d.cd * rnd(.8, 1.15) * agg; }
      break;
    case 'charger':
      if (d > 340) moveE(e, a, sp, dt); else if (e.cdT <= 0) { e.state = 'wind'; e.t = .65; e.aa = a; e.cdT = 2.4; } else moveE(e, a + Math.PI / 2, sp * .6, dt);
      break;
    case 'tele':
      if (d > 120) moveE(e, a, sp, dt);
      if (e.cdT <= 0) {
        burst(e.x, e.y, e.c, 8); const b = P.aim + Math.PI + rnd(-.6, .6);
        e.x = RX(P.x + Math.cos(b) * 62, 30); e.y = RY(P.y + Math.sin(b) * 62, 30);
        burst(e.x, e.y, e.c, 8); e.state = 'wind'; e.t = .55; e.aa = ang(e, P); e.cdT = 3.4;
      }
      break;
    case 'summon':
      if (d < 380) moveE(e, a + Math.PI, sp, dt); else moveE(e, a + Math.PI / 2, sp * .4, dt);
      if (e.cdT <= 0) {
        e.cdT = 6; if (ens.length < 24) { for (let i = 0; i < 2; i++) { const m = mkEnemy('bot', e.x + rnd(-50, 50), e.y + rnd(-50, 50)); m.xp = 3; ens.push(m); } ring(e.x, e.y, 60, e.c); }
      }
      break;
  }
}
function strike(e) {
  const d = dist(e, P);
  switch (e.ai) {
    case 'melee': if (d < e.rng + P.r + 8 && adiff(ang(e, P), e.aa) < 1.1) hurtP(e.dmg, e); e.state = 'rec'; e.t = .5; break;
    case 'tele': if (d < 64 + P.r) hurtP(e.dmg, e); e.state = 'rec'; e.t = .6; break;
    case 'brute': ring(e.x, e.y, e.rng + 30, e.c); shake = Math.max(shake, 5); if (d < e.rng + 30 + P.r * .5) hurtP(e.dmg, e); e.state = 'rec'; e.t = .9; break;
    case 'ranged':
      if (e.d.homing) mkP(e.x, e.y, ang(e, P), 210, e.dmg, { homing: 1, life: 4.2, col: '#f4f4ff', r: 9, paper: 1 });
      else mkP(e.x, e.y, ang(e, P), 340, e.dmg, {});
      e.state = 'rec'; e.t = .3; break;
    case 'charger': e.state = 'dash'; e.t = .45; e.hitP = false; break;
  }
}
const WIND = { slam: .8, leap: .95, charge: .75, fan: .5, burst: .6, spiral: .5, rain: .5, summon: .7, tp: .45, homing: .5, wall: .7 };
function updBoss(e, dt) {
  const L = e.d.phases.length, ph = Math.min(L - 1, Math.floor((1 - e.hp / e.maxhp) * L));
  if (ph !== e.ph) { e.ph = ph; e.say = e.d.barks[ph] || ''; e.sayT = 3.2; ring(e.x, e.y, 220, e.c); shake = 12; sfx.boom(); e.cdT = .8; }
  if (e.sayT > 0) e.sayT -= dt;
  if (e.spiral) {
    const s = e.spiral; s.t -= dt;
    while (s.t <= 0 && s.n > 0) { mkP(e.x, e.y, s.a, 250, e.dmg * .7, { col: e.c }); mkP(e.x, e.y, s.a + Math.PI, 250, e.dmg * .7, { col: e.c }); s.a += .34; s.n--; s.t += .075; }
    if (s.n <= 0) e.spiral = null;
  }
  const d = dist(e, P), a = ang(e, P), mad = 1 + ph * .12;
  switch (e.state) {
    case 'hurt': e.state = 'idle'; break;
    case 'rec': e.t -= dt; if (e.t <= 0) e.state = 'idle'; break;
    case 'wind':
      e.t -= dt; if (e.mv === 'charge' && e.t > .25) e.aa = a;
      if (e.t <= 0) bossExec(e); break;
    case 'dash':
      moveE(e, e.aa, 920, dt); e.t -= dt;
      if (!e.hitP && dist(e, P) < e.r + P.r + 4) { e.hitP = true; hurtP(e.dmg * 1.2, e); }
      if (e.t <= 0 || !inR(fs.room, e.x, e.y, e.r + 1)) { e.state = 'rec'; e.t = .6; } break;
    default:
      if (d > 130) moveE(e, a, e.spd * mad * (e.slow > 0 ? .6 : 1), dt);
      e.cdT -= dt;
      if (e.cdT <= 0) {
        const list = e.d.phases[ph]; let m = list[Math.floor(rnd(0, list.length))];
        if (m === e.last) m = list[(list.indexOf(m) + 1) % list.length];
        if (m === 'slam' && d > 260) m = list.includes('leap') ? 'leap' : (list.find(q => q !== 'slam') || 'slam');
        e.mv = e.last = m; e.state = 'wind'; e.t = WIND[m]; e.aa = a; e.tx = P.x; e.ty = P.y; e.cdT = e.d.gap / mad;
      }
  }
}
function bossExec(e) {
  const dm = e.dmg; let rec = .5;
  switch (e.mv) {
    case 'slam': ring(e.x, e.y, e.r + 130, e.c); shake = 12; sfx.boom(); if (dist(e, P) < e.r + 130 + P.r * .5) hurtP(dm * 1.3, e); rec = .7; break;
    case 'leap': burst(e.x, e.y, e.c, 12); e.x = e.tx; e.y = e.ty; ring(e.x, e.y, 140, e.c); shake = 14; sfx.boom(); if (dist(e, P) < 140 + P.r * .5) hurtP(dm * 1.4, e); rec = .8; break;
    case 'charge': e.state = 'dash'; e.t = .6; e.hitP = false; return;
    case 'fan': { const n = 5 + e.ph * 2; for (let i = 0; i < n; i++) mkP(e.x, e.y, ang(e, P) + (i - (n - 1) / 2) * .16, 390, dm * .8, { col: e.c }); sfx.shoot(); break; }
    case 'burst': { const n = 14 + e.ph * 2, o = rnd(0, TAU); for (let i = 0; i < n; i++) mkP(e.x, e.y, o + i * TAU / n, 265, dm * .8, { col: e.c }); sfx.shoot(); break; }
    case 'spiral': e.spiral = { n: 20 + e.ph * 4, t: 0, a: rnd(0, TAU) }; rec = 1.3; break;
    case 'rain': for (let i = 0; i < 6 + e.ph; i++) { const t = .8 + i * .12; haz.push({ x: RX(P.x + rnd(-260, 260), 40), y: RY(P.y + rnd(-260, 260), 40), r: 82, t, mt: t, dmg: dm, col: e.c }); }
      haz.push({ x: P.x, y: P.y, r: 82, t: .9, mt: .9, dmg: dm, col: e.c }); break;
    case 'summon': if (ens.length < 9 && e.d.adds) for (const [tp, n] of e.d.adds) for (let i = 0; i < n; i++) { const m = mkEnemy(tp, RX(e.x + rnd(-160, 160), 40), RY(e.y + rnd(-160, 160), 40)); m.xp = Math.round(m.xp / 3); ens.push(m); }
      ring(e.x, e.y, 160, e.c); break;
    case 'tp': { burst(e.x, e.y, e.c, 14); const p = edgePos(); e.x = p.x; e.y = p.y; burst(e.x, e.y, e.c, 14); for (let i = 0; i < 10; i++) mkP(e.x, e.y, i * TAU / 10, 250, dm * .7, { col: e.c }); break; }
    case 'homing': for (let i = 0; i < 3; i++) mkP(e.x, e.y, ang(e, P) + (i - 1) * .9, 220, dm * .8, { homing: 1, life: 4.5, col: '#f4f4ff', r: 9, paper: 1 }); break;
    case 'wall': {
      const hz = Math.random() < .5, dir = Math.random() < .5 ? 1 : -1;
      const r = fs.room;
      if (hz) { const gap = clamp(P.y + rnd(-140, 140), r.y + 130, r.y + r.h - 130); for (let y = r.y + 30; y < r.y + r.h; y += 56) if (Math.abs(y - gap) > 100) mkP(dir > 0 ? r.x + 12 : r.x + r.w - 12, y, dir > 0 ? 0 : Math.PI, 300, dm * .8, { life: 7, col: e.c, r: 9 }); }
      else { const gap = clamp(P.x + rnd(-140, 140), r.x + 130, r.x + r.w - 130); for (let x = r.x + 30; x < r.x + r.w; x += 56) if (Math.abs(x - gap) > 100) mkP(x, dir > 0 ? r.y + 12 : r.y + r.h - 12, dir > 0 ? Math.PI / 2 : -Math.PI / 2, 300, dm * .8, { life: 5, col: e.c, r: 9 }); }
      sfx.rage(); rec = .9; break;
    }
  }
  e.state = 'rec'; e.t = rec;
}

/* ================= ЭФФЕКТЫ ================= */
function burst(x, y, c, n) { for (let i = 0; i < n; i++) { const a = rnd(0, TAU), s = rnd(60, 320); pts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, l: rnd(.25, .6), c, s: rnd(2, 5) }); } }
function ring(x, y, r, c) { rings.push({ x, y, r: r * .2, mr: r, l: .35, c }); }
function float(x, y, s, c, big) { txt.push({ x, y, s: String(s), c, l: big ? 1.1 : .7, big }); }
function updFx(dt) {
  for (const p of pts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .94; p.vy *= .94; p.l -= dt; }
  for (const r of rings) { r.r += (r.mr - r.r) * Math.min(1, dt * 14); r.l -= dt; }
  for (const b of bolts) b.l -= dt;
  for (const t of txt) { t.y -= 40 * dt; t.l -= dt; }
  pts = pts.filter(p => p.l > 0); rings = rings.filter(r => r.l > 0); bolts = bolts.filter(b => b.l > 0); txt = txt.filter(t => t.l > 0);
  if (pts.length > 260) pts.splice(0, pts.length - 260);
  if (shake > 0) shake = Math.max(0, shake - dt * 40);
  if (flash > 0) flash -= dt;
}

/* ================= ОБНОВЛЕНИЕ ================= */
function update(dt) {
  T += dt;
  for (const t of timers) { t.t -= dt; if (t.t <= 0) { t.done = true; t.f(); } }
  timers = timers.filter(t => !t.done);
  updPlayer(dt); updThrow(dt);
  if (mode !== 'fight') return;
  for (const e of ens) if (!e.dead) updEnemy(e, dt);
  // расталкивание
  for (let i = 0; i < ens.length; i++) {
    const a = ens[i]; if (a.dead || a.spawn > 0) continue;
    for (let j = i + 1; j < ens.length; j++) {
      const b = ens[j]; if (b.dead || b.spawn > 0) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, o = a.r + b.r - d;
      if (o > 0) { const ux = dx / d, uy = dy / d, wa = a.boss ? 0 : b.boss ? 1 : .5; a.x -= ux * o * wa; a.y -= uy * o * wa; b.x += ux * o * (1 - wa); b.y += uy * o * (1 - wa); }
    }
    const d = dist(a, P), o = a.r + P.r - d;
    if (o > 0 && P.dodge <= 0 && a.state !== 'dash') { const an = ang(a, P); if (a.boss) { P.x = RX(P.x + Math.cos(an) * o, P.r); P.y = RY(P.y + Math.sin(an) * o, P.r); } else { a.x -= Math.cos(an) * o; a.y -= Math.sin(an) * o; } }
  }
  // снаряды
  for (const p of prj) {
    if (p.homing) { const a = ang(p, P), ca = Math.atan2(p.vy, p.vx); let df = a - ca; while (df > Math.PI) df -= TAU; while (df < -Math.PI) df += TAU; const na = ca + clamp(df, -2.2 * dt, 2.2 * dt); p.vx = Math.cos(na) * p.sp; p.vy = Math.sin(na) * p.sp; }
    if (p.back) { const a = ang(p, P); p.vx = Math.cos(a) * 820; p.vy = Math.sin(a) * 820; if (dist(p, P) < 26) p.dead = true; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; p.rot += dt * 14;
    if (!p.back) for (const b of obs) if ((p.x - b.x) ** 2 + (p.y - b.y) ** 2 < b.r * b.r) { p.life = 0; burst(p.x, p.y, p.col, 3); break; }
    const out = fs ? !inR(fs.room, p.x, p.y, 0) : !okPos(p.x, p.y, 0);
    if (p.from === 'e') {
      if (out || p.life <= 0) { p.dead = true; continue; }
      if (dist(p, P) < p.r + P.r - 3) {
        const r = hurtP(p.dmg, null, true);
        if (r === 'parry') { p.from = 'p'; p.vx *= -1.5; p.vy *= -1.5; p.dmg *= 4; p.homing = 0; p.life = 2; p.hit = new Set(); p.col = '#49e0ff'; }
        else if (r) p.dead = true;
      }
    } else {
      if (out || p.life <= 0) { if (p.ret && !p.back) { p.back = true; p.hit = new Set(); p.life = 2; } else if (!p.back || p.life <= 0) p.dead = true; continue; }
      for (const e of ens) {
        if (e.dead || e.spawn > 0 || p.hit.has(e) || dist(p, e) > p.r + e.r) continue;
        p.hit.add(e); dmgE(e, p.dmg, { w: 'vinyl', kb: 70, slow: sk('v6') ? 2.5 : 0 }); sfx.hit(false);
        if (p.back) continue;
        if (p.bounce > 0) {
          p.bounce--; const nx = ens.filter(q => !q.dead && q.spawn <= 0 && !p.hit.has(q) && dist(q, p) < 420).sort((u, v) => dist(u, p) - dist(v, p))[0];
          if (nx) { const a = ang(p, nx), s = Math.hypot(p.vx, p.vy); p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s; p.life = Math.max(p.life, .6); break; }
        }
        if (!p.pierce) { if (p.ret) { p.back = true; p.hit = new Set(); p.life = 2; } else p.dead = true; break; }
      }
    }
  }
  prj = prj.filter(p => !p.dead);
  // зоны
  for (const h of haz) {
    h.t -= dt;
    if (h.t <= 0) {
      h.dead = true; ring(h.x, h.y, h.r, h.col); burst(h.x, h.y, h.col, 10); shake = Math.max(shake, 5); tone(90, .25, 'sine', .3, 35);
      if (h.pl) { for (const e of ens) if (!e.dead && Math.hypot(e.x - h.x, e.y - h.y) < h.r + e.r) dmgE(e, h.dmg, { kb: 200 }); }
      else if (Math.hypot(P.x - h.x, P.y - h.y) < h.r + P.r * .4) hurtP(h.dmg, null, true);
    }
  }
  haz = haz.filter(h => !h.dead);
  for (const o of orbs) {
    o.l -= dt; const d = dist(o, P);
    if (d < 130) { const a = ang(o, P); o.x += Math.cos(a) * 320 * dt; o.y += Math.sin(a) * 320 * dt; }
    if (d < 28) { o.l = 0; P.hp = Math.min(maxHp(), P.hp + maxHp() * .1); sfx.pick(); float(P.x, P.y - 30, '+HP', '#7dff7d'); }
  }
  orbs = orbs.filter(o => o.l > 0);
  ens = ens.filter(e => !e.dead);
  updFx(dt);
  // волны
  if (fs && !fs.done && ens.length === 0) {
    if (fs.waves && fs.i < fs.waves.length - 1) { fs.i++; spawnWave(); }
    else { fs.done = true; fs.clearT = fs.boss ? 2.4 : 1; if (!fs.boss) float(P.x, P.y - 60, 'ЧИСТО', '#7dff7d', 1); }
  }
  if (fs && fs.done) { fs.clearT -= dt; if (fs.clearT <= 0) { const cb = fs.cb; prj = []; haz = []; fs = null; if (cb) cb(); } }
  if (mode === 'fight') { if (!fs) pump(); if (mode === 'fight') scan(); }
}

/* ================= ОТРИСОВКА (3D, Three.js) ================= */
const EMO = { bot: '🤖', mod: '🛡️', hater: '💬', clipper: '✂️', troll: '👹', ghost: '👻', lawyer: '📄', farmer: '📱',
  courier: '📦', golem: '🥁', hype: '🔥', dislike: '👎', major: '💼', strike: '⛔', botlord: '🖥️', ghostv: '🎧', algo: '👁️' };
const T3 = window.THREE;
let R3 = null, SC, CAM, SUN, worldG = null, builtDeco = null, PM, PIN, WPV, WG = {}, SHIELD, pBodyMat, CM, emesh = [], stamp = 0, spinners = [];
let _ray, _pl, _hit, _nd, v3;
const cam3 = { x: AW / 2, z: AH / 2 }, geo = {}, mats = {}, pools = {}, emoT = {};
const G = (k, f) => geo[k] || (geo[k] = f());
function mat(c, o) { const k = c + (o ? JSON.stringify(o) : ''); return mats[k] || (mats[k] = new T3.MeshStandardMaterial(Object.assign({ color: c, roughness: .75, metalness: .05 }, o || {}))); }
function mesh(g, m, x, y, z) { const q = new T3.Mesh(g, m); q.position.set(x || 0, y || 0, z || 0); q.castShadow = true; return q; }
const box = (w, h, d, c, x, y, z, o) => { const q = mesh(G('box', () => new T3.BoxGeometry(1, 1, 1)), mat(c, o), x, y, z); q.scale.set(w, h, d); return q; };
const sph = (r, c, x, y, z, o) => { const q = mesh(G('sph', () => new T3.SphereGeometry(1, 18, 14)), mat(c, o), x, y, z); q.scale.setScalar(r); return q; };
const cyl = (rt, rb, h, c, x, y, z, o) => mesh(G('cy' + rt.toFixed(1) + '_' + rb.toFixed(1) + '_' + h.toFixed(1), () => new T3.CylinderGeometry(rt, rb, h, 16)), mat(c, o), x, y, z);
function emo(ch, s, y) {
  let t = emoT[ch];
  if (!t) { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.font = '46px "Segoe UI Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ch, 32, 36); t = emoT[ch] = new T3.CanvasTexture(c); }
  const sp = new T3.Sprite(new T3.SpriteMaterial({ map: t, transparent: true })); sp.scale.set(s, s, 1); sp.position.y = y; return sp;
}
function use(n, f) { const p = pools[n] || (pools[n] = { a: [], i: 0 }); let m = p.a[p.i]; if (!m) { m = f(); p.a.push(m); SC.add(m); } p.i++; m.visible = true; return m; }
function decal(gk, gf, x, z, sx, sz, ry, col, op, y) {
  const m = use('decal', () => { const q = new T3.Mesh(G('circ', () => new T3.CircleGeometry(1, 40).rotateX(-Math.PI / 2)), new T3.MeshBasicMaterial({ transparent: true, depthWrite: false, side: T3.DoubleSide })); q.renderOrder = 2; return q; });
  m.geometry = G(gk, gf); m.position.set(x, y || 1.5, z); m.scale.set(sx, 1, sz); m.rotation.y = ry || 0; m.material.color.set(col); m.material.opacity = op; return m;
}
const gCirc = () => new T3.CircleGeometry(1, 40).rotateX(-Math.PI / 2);
const gRing = () => new T3.RingGeometry(.93, 1, 56).rotateX(-Math.PI / 2);
const gRect = () => new T3.PlaneGeometry(1, 1).translate(.5, 0, 0).rotateX(-Math.PI / 2);
const dCirc = (x, z, r, c, op) => decal('circ', gCirc, x, z, r, r, 0, c, op);
const dRing = (x, z, r, c, op) => decal('ring', gRing, x, z, r, r, 0, c, op, 2);
const dSect = (x, z, r, a, arc, c, op) => arc >= TAU - .01 ? dCirc(x, z, r, c, op) : decal('sec' + arc.toFixed(2), () => new T3.CircleGeometry(1, 28, -arc / 2, arc).rotateX(-Math.PI / 2), x, z, r, r, -a, c, op, 2.5);
function proj(x, y, h) { v3.set(x, h || 0, y).project(CAM); if (v3.z > 1) return { x: -9999, y: -9999 }; return { x: (v3.x * .5 + .5) * W, y: (-v3.y * .5 + .5) * H }; }
function aimPoint() {
  if (!CAM) return { x: P.x + 1, y: P.y };
  _nd.set(M.x / W * 2 - 1, -(M.y / H * 2 - 1)); _ray.setFromCamera(_nd, CAM);
  return _ray.ray.intersectPlane(_pl, _hit) ? { x: _hit.x, y: _hit.z } : { x: P.x + Math.cos(P.aim), y: P.y + Math.sin(P.aim) };
}
function setPR() { if (R3) R3.setPixelRatio(Math.min(1.5, Math.max(.8, Math.min(innerWidth / W, innerHeight / H) * (window.devicePixelRatio || 1))) * [.6, .8, 1][qual]); }
addEventListener('resize', setPR);

function init3d() {
  R3 = new T3.WebGLRenderer({ canvas: $('gl'), antialias: true }); R3.setSize(W, H, false); setPR();
  R3.shadowMap.enabled = true; R3.shadowMap.type = T3.PCFSoftShadowMap;
  SC = new T3.Scene(); CAM = new T3.PerspectiveCamera(56, W / H, 8, 5000);
  SC.add(new T3.HemisphereLight(0xdde6ff, 0x1a1c2a, .6));
  SUN = new T3.DirectionalLight(0xffffff, .75); SUN.castShadow = true; SUN.shadow.mapSize.set(1024, 1024);
  const sc = SUN.shadow.camera; sc.left = -650; sc.right = 650; sc.top = 650; sc.bottom = -650; sc.near = 100; sc.far = 2500; SC.add(SUN, SUN.target);
  _ray = new T3.Raycaster(); _pl = new T3.Plane(new T3.Vector3(0, 1, 0), 0); _hit = new T3.Vector3(); _nd = new T3.Vector2(); v3 = new T3.Vector3();
  // Ванёк
  const r = 17; PM = new T3.Group(); PIN = new T3.Group(); PM.add(PIN);
  pBodyMat = new T3.MeshStandardMaterial({ color: '#1b1e27', roughness: .8 });
  PIN.add(mesh(new T3.CylinderGeometry(r * .75, r, r * 2, 16), pBodyMat, 0, r, 0), cyl(r * .93, r * .97, 6, '#d81e1e', 0, r * 1.25, 0),
    sph(r * .5, '#e8c39e', 1, r * 2.45, 0), sph(r * .6, '#1b1e27', -3, r * 2.55, 0), box(5, 3, 14, '#111', r * .5 + 1, r * 2.5, 0));
  WPV = new T3.Group(); WPV.position.y = r * 1.3; PIN.add(WPV);
  WG.bat = new T3.Group(); WG.bat.add(box(18, 6, 6, '#2b5fd0', 22, 0, 0), box(38, 10, 10, '#d2a868', 50, 0, 0), box(4, 11, 11, '#ff5a2a', 62, 0, 0));
  WG.mic = new T3.Group(); WG.mic.add(box(1, 3, 3, '#222', .5, 0, 0), sph(9, '#c8ccd4', 1, 0, 0, { metalness: .7, roughness: .3 }));
  WG.vinyl = new T3.Group(); WG.vinyl.add(cyl(12, 12, 2, '#e9e2ff', 30, 0, 0, { metalness: .8, roughness: .2 }), cyl(3, 3, 2.4, '#222', 30, 0, 0));
  WPV.add(WG.bat, WG.mic, WG.vinyl);
  SHIELD = new T3.Mesh(new T3.CylinderGeometry(r + 13, r + 13, r * 2.6, 20, 1, true, Math.PI / 2 - 1.1, 2.2), new T3.MeshBasicMaterial({ color: '#49e0ff', transparent: true, opacity: .4, side: T3.DoubleSide, depthWrite: false }));
  SHIELD.position.y = r * 1.3; PM.add(SHIELD); SC.add(PM);
  // кент
  CM = new T3.Group(); CM.add(cyl(9, 12, 26, '#e9eef8', 0, 13, 0), cyl(11.5, 11.8, 5, '#5cd0ff', 0, 17, 0), sph(7, '#e8c39e', 0, 32, 0), sph(7.4, '#2a2f3d', -1, 34, 0), box(9, 2, 12, '#2a2f3d', 6, 34, 0)); SC.add(CM);
}

function wallTex(k) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d'), R = (a, b) => a + Math.random() * (b - a);
  const fill = col => { x.fillStyle = col; x.fillRect(0, 0, 256, 128); };
  switch (k) {
    case 'snow': fill('#59606e'); for (let j = 0; j < 4; j++) for (let i = 0; i < 8; i++) { x.fillStyle = Math.random() < .35 ? '#ffd87a' : '#1c2230'; x.fillRect(8 + i * 31, 8 + j * 30, 18, 20); } x.fillStyle = '#3f4552'; for (let i = 0; i <= 8; i++) x.fillRect(i * 31 + 1, 0, 2, 128); break;
    case 'basement': fill('#5a2f22'); x.fillStyle = '#3d1f16'; for (let j = 0; j < 8; j++) { x.fillRect(0, j * 16, 256, 2); for (let i = 0; i < 8; i++) x.fillRect(i * 32 + (j % 2) * 16, j * 16, 2, 16); } break;
    case 'neon': fill('#0d0518'); for (let i = 0; i < 12; i++) { x.fillStyle = i % 2 ? '#ff3cc8' : '#3cdcff'; x.fillRect(R(0, 250), 0, R(2, 7), 128); } break;
    case 'swamp': fill('#152313'); x.strokeStyle = '#3d6b2e'; x.lineWidth = 2; for (let i = 0; i < 40; i++) { const a = R(0, 256); x.beginPath(); x.moveTo(a, 128); x.lineTo(a + R(-10, 10), R(30, 100)); x.stroke(); }
      x.fillStyle = '#7fbf4a'; x.font = '11px Consolas'; ['кринж', 'лол', 'первый', 'отписка'].forEach((t, i) => x.fillText(t, 14 + i * 60, 28 + (i % 2) * 20)); break;
    case 'glass': fill('#1b2a3d'); for (let j = 0; j < 3; j++) for (let i = 0; i < 6; i++) { x.fillStyle = Math.random() < .3 ? '#bfe0ff' : '#35506e'; x.fillRect(4 + i * 42, 4 + j * 42, 36, 36); } break;
    case 'grave': fill('#0b0a14'); x.fillStyle = '#3a3566'; for (let i = 0; i < 16; i++) { x.fillRect(i * 16 + 6, 20, 4, 108); x.beginPath(); x.moveTo(i * 16 + 2, 22); x.lineTo(i * 16 + 8, 6); x.lineTo(i * 16 + 14, 22); x.fill(); } x.fillRect(0, 50, 256, 4); x.fillRect(0, 110, 256, 4); break;
    case 'server': fill('#07120f'); for (let j = 0; j < 8; j++) for (let i = 0; i < 16; i++) { x.fillStyle = Math.random() < .4 ? '#2affb0' : Math.random() < .1 ? '#ffd23b' : '#0e2a22'; x.fillRect(4 + i * 16, 6 + j * 15, 8, 4); } break;
    case 'chart': fill('#140a08'); for (let i = 0; i < 16; i++) { const h = R(15, 115); x.fillStyle = i % 5 === 0 ? '#ffd23b' : '#ff5a32'; x.fillRect(i * 16 + 3, 128 - h, 10, h); } break;
    default: fill('#e8eaf2'); for (let i = 0; i < 120; i++) { x.fillStyle = `hsl(${R(0, 360)},60%,60%)`; x.fillRect(R(0, 250), R(0, 122), 6, 6); }
  }
  return new T3.CanvasTexture(c);
}
function buildWorld(th) {
  if (worldG) SC.remove(worldG); worldG = new T3.Group(); SC.add(worldG); spinners = []; statics = [];
  const bg = new T3.Color(th.bg); SC.background = bg; SC.fog = new T3.Fog(bg, 500, 2000);
  const pl = (r, c, y) => { const q = new T3.Mesh(G('pl', () => new T3.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), new T3.MeshStandardMaterial({ color: c, roughness: .92 })); q.scale.set(r.w, 1, r.h); q.position.set(r.x + r.w / 2, y, r.y + r.h / 2); q.receiveShadow = true; worldG.add(q); };
  pl({ x: -1500, y: -1500, w: LV.w + 3000, h: LV.h + 3000 }, bg.clone().multiplyScalar(.4), -3);
  const fc = new T3.Color(th.grid), pts = [];
  for (const r of LV.cors) pl(r, fc.clone().multiplyScalar(.7), 0);
  for (const r of LV.rooms) {
    pl(r, fc.clone().multiplyScalar(r.kind === 'boss' ? 1.25 : r.kind === 'side' ? .8 : .95), .3);
    for (let x = r.x; x <= r.x + r.w + 1; x += 95) pts.push(x, .9, r.y, x, .9, r.y + r.h);
    for (let y = r.y; y <= r.y + r.h + 1; y += 95) pts.push(r.x, .9, y, r.x + r.w, .9, y);
  }
  const lg = new T3.BufferGeometry(); lg.setAttribute('position', new T3.Float32BufferAttribute(pts, 3));
  worldG.add(new T3.LineSegments(lg, new T3.LineBasicMaterial({ color: fc.clone().multiplyScalar(1.9) })));
  // стены: дальние высокие, ближние к камере низкие
  const tex = wallTex(th.deco), wm = new T3.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: .4, roughness: .9 });
  const lm = new T3.MeshStandardMaterial({ color: bg.clone().multiplyScalar(2.2), roughness: .9 }), bx = G('box', () => new T3.BoxGeometry(1, 1, 1));
  const WL = [], wall = (x, z, sx, h, sz) => WL.push([x, z, sx, h, sz]);
  for (const r of LV.rects) {
    for (const [hz, c, out, h, m] of [[1, r.y, -14, 120, wm], [1, r.y + r.h, 14, 120, wm], [0, r.x, -14, 120, wm], [0, r.x + r.w, 14, 120, wm]]) {
      const a0 = hz ? r.x : r.y, a1 = a0 + (hz ? r.w : r.h); let run = null;
      for (let a = a0; a <= a1 + 20; a += 20) {
        const mid = Math.min(a + 10, a1 - 1), fr = a < a1 && !(hz ? okPos(mid, c + out, -1) : okPos(c + out, mid, -1));
        if (fr && run == null) run = a;
        if (!fr && run != null) {
          const end = Math.min(a, a1);
          for (let s = run; s < end; s += 200) { const L = Math.min(200, end - s), ctr = s + L / 2, off = c + out * .55; if (hz) wall(ctr, off, L, h, 16, m); else wall(off, ctr, 16, h, L, m); }
          run = null;
        }
      }
    }
  }
  { const im = new T3.InstancedMesh(bx, wm, WL.length), o = new T3.Object3D(); WL.forEach((q, i) => { o.position.set(q[0], q[3] / 2, q[1]); o.scale.set(q[2], q[3], q[4]); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }); im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; worldG.add(im); }
  for (const r of LV.rooms) if (r.kind === 'boss') {
    const rg = new T3.Mesh(new T3.RingGeometry(300, 316, 64).rotateX(-Math.PI / 2), new T3.MeshBasicMaterial({ color: '#ff3b3b', transparent: true, opacity: .5 })); rg.position.set(r.cx, 1.2, r.cy); worldG.add(rg);
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const px = r.cx + dx * (r.w / 2 - 70), pz = r.cy + dy * (r.h / 2 - 70); worldG.add(cyl(26, 32, 150, '#2a2c3a', px, 75, pz), sph(18, '#ff3b3b', px, 165, pz, { emissive: '#ff3b3b', emissiveIntensity: 1 })); }
  }
  for (const d of deco) {
    const x = d.x, z = d.y, s = d.s, v = d.v; let p = null;
    if (!d.solid) {
      if (d.k === 'snow') { p = sph(1, '#7f93b4', x, 0, z); p.scale.set(60 * s, 9 * s, 36 * s); p.castShadow = false; }
      else if (d.k === 'swamp') { p = sph(1, '#3d6b2e', x, 0, z, { transparent: true, opacity: .75 }); p.scale.set(80 * s, 4, 46 * s); p.castShadow = false; }
      else if (d.k === 'core') { p = box(18, 18, 18, '#' + new T3.Color().setHSL(v, .6, .6).getHexString(), 0, 0, 0, { emissive: '#445', emissiveIntensity: .5 }); p.userData = { a: v * TAU, rr: 150 + v * 800, h: 130 + v * 220, sp: (v > .5 ? 1 : -1) * .15 }; spinners.push(p); }
    } else {
      p = new T3.Group(); p.position.set(x, 0, z); p.rotation.y = (v - .5) * 1.2;
      switch (d.k) {
        case 'snow':
          if (v < .4) p.add(cyl(3, 4, 120, '#2a2f3a', 0, 60, 0), sph(9, '#ffd87a', 0, 124, 0, { emissive: '#ffd87a', emissiveIntensity: 1 }));
          else if (v < .7) p.add(box(38, 44, 38, '#2f4a3a', 0, 22, 0), box(42, 5, 42, '#243a2d', 0, 46, 0));
          else { const q = sph(1, '#c9d6ea', 0, 0, 0); q.scale.set(36, 28, 36); p.add(q); }
          break;
        case 'basement': { p.add(box(48, 76, 40, '#3a2718', 0, 38, 0)); const a = cyl(15, 15, 3, '#6b4d33', 0, 28, 21), b = cyl(7, 7, 3, '#6b4d33', 0, 58, 21); a.rotation.x = b.rotation.x = Math.PI / 2; p.add(a, b); break; }
        case 'neon': { const c = v > .5 ? '#ff3cc8' : '#3cdcff', h = 90 + v * 90; p.add(box(30, h, 30, c, 0, h / 2, 0, { emissive: c, emissiveIntensity: .85 })); break; }
        case 'swamp': if (v < .5) p.add(cyl(18, 23, 26, '#4a3524', 0, 13, 0), cyl(17, 17, 2, '#6b5236', 0, 27, 0)); else p.add(cyl(5, 10, 130, '#2e2418', 0, 65, 0), box(50, 5, 5, '#2e2418', 14, 96, 0), box(5, 5, 40, '#2e2418', -4, 74, 14)); break;
        case 'glass': if (v < .6) p.add(box(74, 4, 44, '#c9d2e0', 0, 32, 0), box(4, 30, 4, '#556', -32, 15, -17), box(4, 30, 4, '#556', 32, 15, -17), box(4, 30, 4, '#556', -32, 15, 17), box(4, 30, 4, '#556', 32, 15, 17), box(26, 18, 3, '#111', 0, 44, -8, { emissive: '#3c8cff', emissiveIntensity: .7 }));
          else p.add(cyl(11, 11, 46, '#e8eef6', 0, 23, 0), cyl(9, 9, 22, '#6cc6ff', 0, 57, 0, { transparent: true, opacity: .7 })); break;
        case 'grave': p.add(box(36, 46, 12, '#4a4580', 0, 23, 0), box(26, 10, 12, '#4a4580', 0, 51, 0), box(18, 2, 13, '#8c86c8', 0, 30, 0)); break;
        case 'server': p.add(box(50, 116, 40, '#16302a', 0, 58, 0)); for (let i = 0; i < 4; i++) p.add(box(8, 5, 3, '#2affb0', -10, 24 + i * 24, 21, { emissive: '#2affb0', emissiveIntensity: 1 })); break;
        case 'chart': { const h = 50 + v * 120; p.add(box(38, h, 38, '#ff5a32', 0, h / 2, 0, { emissive: '#ff5a32', emissiveIntensity: .45 }), box(40, 4, 40, '#ffd23b', 0, h + 2, 0, { emissive: '#ffd23b', emissiveIntensity: .8 })); break; }
        case 'core': p.add(cyl(16, 16, 130, '#eef0f8', 0, 65, 0, { emissive: '#8890b0', emissiveIntensity: .4 }), box(40, 6, 40, '#eef0f8', 0, 133, 0), box(40, 6, 40, '#eef0f8', 0, 3, 0)); break;
      }
    }
    if (p) worldG.add(p);
  }
  for (const o of ents) {
    const g = new T3.Group();
    if (o.k === 'npc' || o.k === 'seva') {
      const c = o.k === 'seva' ? '#ffae3b' : NPCS[o.id].c;
      const mg = inst(o.k === 'seva' ? 'barb' : NPCS[o.id].mdl || NPC_MODELS[(o.id.charCodeAt(0) + o.id.length * 3) % NPC_MODELS.length], 72, o.k === 'seva' ? { show: /Mug|Hat/, tint: '#ffae3b', mix: .3 } : { tint: c, mix: .45 });
      if (mg) { g.add(mg, emo(o.k === 'seva' ? '🔧' : '🎤', 26, 100)); statics.push(mg); }
      else g.add(cyl(13, 17, 36, c, 0, 18, 0), sph(9.5, '#e8c39e', 0, 44, 0), cyl(10, 10.5, 5, '#22242e', 0, 51, 0), box(9, 2, 14, '#22242e', 8, 49, 0), emo(o.k === 'seva' ? '🔧' : '🎤', 26, 80));
      if (o.k === 'seva') { const b = new T3.Group(); b.add(box(44, 26, 28, '#3a2718', 0, 13, 0), box(30, 2, 20, '#49e0ff', 0, 27, 0, { emissive: '#49e0ff', emissiveIntensity: .9 })); b.position.set(o.x, 0, o.y + 50); worldG.add(b); }
    } else if (o.k === 'chest') g.add(box(46, 26, 30, '#7a4a1e', 0, 13, 0), box(48, 8, 32, '#ffd23b', 0, 28, 0, { metalness: .7, roughness: .3, emissive: '#553a00', emissiveIntensity: .7 }), emo(o.loot.hp ? '💛' : o.loot.tapes ? '📀' : '🎁', 24, 58));
    else if (o.k === 'lore') g.add(emo('📼', 36, 30));
    else if (o.k === 'portal') {
      g.add(mesh(new T3.TorusGeometry(54, 6, 10, 40), new T3.MeshStandardMaterial({ color: '#49e0ff', emissive: '#49e0ff', emissiveIntensity: 1 }), 0, 62, 0));
      const d = new T3.Mesh(new T3.CircleGeometry(50, 32), new T3.MeshBasicMaterial({ color: '#49e0ff', transparent: true, opacity: .25, side: T3.DoubleSide, depthWrite: false })); d.position.y = 62; g.add(d);
    }
    g.position.set(o.x, 0, o.y); o.m = g; worldG.add(g);
  }
}
function drawNav() {
  X.textBaseline = 'alphabetic';
  // цель
  let ob = '';
  if (fs && !fs.done) ob = fs.boss ? 'Победи: ' + fs.boss.d.n : (fs.cb && fs.room.kind === 'side' ? 'Зачисти тупик' : 'Зачисти комнату');
  else if (exitOpen()) ob = 'Войди в портал — к следующему серверу';
  else if (objRoom) ob = objRoom.kind === 'boss' ? 'Иди к арене босса' : 'Двигайся дальше — к следующей комнате';
  X.textAlign = 'left'; let y = 34;
  if (ob) { X.font = 'bold 15px "Russo One","Segoe UI"'; X.fillStyle = '#ffd23b'; X.fillText('◆ ' + ob, 30, y); y += 22; }
  X.font = '13px "Russo One","Segoe UI"';
  for (const o of ents) if (o.k === 'npc' && S.q[o.id] && S.q[o.id].st === 1) {
    const n = NPCS[o.id], q = S.q[o.id], rd = qReady(o.id);
    X.fillStyle = rd ? '#7dff7d' : '#c3ccdb'; X.fillText('◇ ' + (rd ? 'Вернись к ' + n.n : n.q.txt + (n.q.type === 'kill' ? '  (' + q.n + '/' + n.q.n + ')' : '')), 30, y); y += 19;
  }
  const lc = [0, 1].filter(i => S.done['c' + S.ch + 'lore' + i]).length; X.fillStyle = '#8d97aa'; X.fillText('📼 кассеты: ' + lc + ' / 2', 30, y);
  // стрелка к цели
  const tg = !fs && (exitOpen() ? ents.find(o => o.k === 'portal') : objRoom ? { x: objRoom.cx, y: objRoom.cy } : null);
  if (tg && dist(tg, P) > 260) { const a = ang(P, tg), q = proj(P.x + Math.cos(a) * 90, P.y + Math.sin(a) * 90, 4), q2 = proj(P.x + Math.cos(a) * 130, P.y + Math.sin(a) * 130, 4), sa = Math.atan2(q2.y - q.y, q2.x - q.x);
    X.save(); X.translate(q2.x, q2.y); X.rotate(sa); X.globalAlpha = .6 + .3 * Math.sin(performance.now() / 200); X.fillStyle = '#ffd23b'; X.beginPath(); X.moveTo(16, 0); X.lineTo(-8, -9); X.lineTo(-3, 0); X.lineTo(-8, 9); X.closePath(); X.fill(); X.restore(); }
  // подсказка действия
  if (prompt) { X.textAlign = 'center'; X.font = 'bold 18px "Russo One","Segoe UI"'; const w = X.measureText(prompt).width + 36; X.fillStyle = 'rgba(8,10,16,.85)'; X.fillRect(W / 2 - w / 2, H - 150, w, 36); X.strokeStyle = '#ffd23b'; X.lineWidth = 1; X.strokeRect(W / 2 - w / 2, H - 150, w, 36); X.fillStyle = '#ffd23b'; X.fillText(prompt, W / 2, H - 126); }
  // мини-карта
  const k = Math.min(210 / LV.w, 130 / LV.h), mx = W - 30 - LV.w * k, my = 92;
  X.fillStyle = 'rgba(0,0,0,.5)'; X.fillRect(mx - 6, my - 6, LV.w * k + 12, LV.h * k + 12);
  for (const r of LV.rects) { X.fillStyle = r === objRoom ? 'rgba(255,210,59,.8)' : r.kind === 'cor' ? 'rgba(255,255,255,.2)' : r.kind === 'boss' ? 'rgba(255,80,80,.5)' : r.kind === 'side' ? 'rgba(120,200,255,.3)' : 'rgba(255,255,255,.34)'; X.fillRect(mx + r.x * k, my + r.y * k, Math.max(2, r.w * k), Math.max(2, r.h * k)); }
  for (const o of ents) {
    if (o.k === 'lore' || o.k === 'chest') { if (S.done[o.id]) continue; X.fillStyle = '#c9a36b'; }
    else if (o.k === 'npc') X.fillStyle = S.q[o.id] && S.q[o.id].st === 3 ? '#557' : '#5cd0ff'; else if (o.k === 'seva') X.fillStyle = '#ffae3b'; else X.fillStyle = exitOpen() ? '#49e0ff' : '#557';
    X.fillRect(mx + o.x * k - 2, my + o.y * k - 2, 4, 4);
  }
  X.fillStyle = '#ff3b3b'; X.beginPath(); X.arc(mx + P.x * k, my + P.y * k, 3.5, 0, TAU); X.fill();
  X.strokeStyle = '#fff'; X.lineWidth = 1.5; X.beginPath(); X.moveTo(mx + P.x * k, my + P.y * k); X.lineTo(mx + P.x * k + Math.cos(camYaw) * 10, my + P.y * k + Math.sin(camYaw) * 10); X.stroke();
  X.textAlign = 'left';
}
/* ---------- GLB-модели с анимациями (CC0: KayKit, Quaternius) ---------- */
const MDL = {}, NPC_MODELS = ['barb', 'mage', 'knight', 'kent', 'skrog', 'vanek'];
const MODEL_OF = { bot: 'robot', hater: 'skmage', clipper: 'skrog', troll: 'skwar', ghost: 'skmin', lawyer: 'knight', farmer: 'mage', mod: 'knight',
  courier: 'kent', golem: 'robot', hype: 'mage', dislike: 'skwar', major: 'knight', strike: 'skwar', botlord: 'robot', ghostv: 'vanek' };
const MODEL_OPT = { hater: { tint: '#ff7070', mix: .4 }, clipper: { tint: '#ff5cc8', mix: .45 }, troll: { tint: '#7fd04a', mix: .5 }, ghost: { tint: '#b79cff', mix: .6, op: .6, emi: .3 },
  farmer: { tint: '#ffd23b', mix: .5 }, mod: { show: /Rectangle_Shield/, tint: '#7fa8ff', mix: .5 }, ghostv: { tint: '#ff8080', mix: .6, op: .78, emi: .35 } };
const HIDE = /Offhand|Shield|Crossbow|Knife|Throwable|Sword|Axe|Mug|Spellbook|Wand|Staff|Cape|Cloak/i;
const ANIM = { idle: ['Idle'], run: ['Running_A', 'Running'], atk: ['1H_Melee_Attack_Slice_Horizontal', 'Punch'], atk2: ['1H_Melee_Attack_Chop', 'Punch'], heavy: ['2H_Melee_Attack_Chop', 'Punch'],
  spin: ['2H_Melee_Attack_Spin', 'Dance'], hit: ['Hit_A', 'No'], death: ['Death_A', 'Death'], dodge: ['Dodge_Forward', 'Jump'], block: ['Blocking', 'Idle'], cast: ['Spellcast_Shoot', 'Wave'],
  thr: ['Throw', 'Punch'], cheer: ['Cheer', 'ThumbsUp'] };
let corpses = [], statics = [], lastNow = 0;
function loadModels() {
  if (!T3 || !T3.GLTFLoader || !T3.SkeletonUtils || !window.GLB) return;
  const ld = new T3.GLTFLoader();
  for (const k in window.GLB) {
    try {
      const bs = atob(window.GLB[k]), u = new Uint8Array(bs.length); for (let i = 0; i < bs.length; i++) u[i] = bs.charCodeAt(i);
      ld.parse(u.buffer, '', g => { const bb = new T3.Box3().setFromObject(g.scene); MDL[k] = { scene: g.scene, clips: g.animations, h: (bb.max.y - bb.min.y) || 1, y0: bb.min.y }; builtDeco = null; }, () => {});
    } catch (e) { /* модель не загрузилась — останутся фигуры из примитивов */ }
    window.GLB[k] = null;
  }
}
function play(g, key, once, dur, tok) {
  const u = g.userData; if (!u || !u.mx) return; const id = key + (tok == null ? '' : tok); if (u.key === id) return; u.key = id;
  let a = null; for (const n of ANIM[key]) if (u.acts[n]) { a = u.acts[n]; break; } if (!a) return;
  a.reset(); a.setLoop(once ? T3.LoopOnce : T3.LoopRepeat, Infinity); a.clampWhenFinished = !!once; a.timeScale = dur ? a.getClip().duration / dur : 1; a.fadeIn(.1).play();
  if (u.cur && u.cur !== a) u.cur.fadeOut(.1); u.cur = a;
}
function inst(name, height, o) {
  const m = MDL[name]; if (!m) return null; o = o || {};
  const g = new T3.Group(), s = T3.SkeletonUtils.clone(m.scene), k = height / m.h; s.rotation.y = Math.PI / 2; s.scale.setScalar(k); s.position.y = -m.y0 * k; g.add(s);
  const tint = o.tint ? new T3.Color('#ffffff').lerp(new T3.Color(o.tint), o.mix == null ? .55 : o.mix) : null;
  s.traverse(q => {
    if (!q.isMesh) return; q.castShadow = true; q.frustumCulled = false;
    if (HIDE.test(q.name) && !(o.show && o.show.test(q.name))) { q.visible = false; return; }
    if (tint || o.op || o.emi) {
      q.material = q.material.clone(); if (tint) q.material.color.multiply(tint);
      if (o.op) { q.material.transparent = true; q.material.opacity = o.op; }
      if (o.emi) { q.material.emissive = new T3.Color(o.tint || '#ffffff'); q.material.emissiveIntensity = o.emi; }
    }
  });
  const mx = new T3.AnimationMixer(s), acts = {}; for (const c of m.clips) acts[c.name] = mx.clipAction(c);
  g.userData = { mx, acts, key: '', cur: null, top: height, mdl: 1 }; play(g, 'idle'); return g;
}
function enemyModel(e) {
  const mn = MODEL_OF[e.type]; if (!mn || !MDL[mn]) return null;
  const H = e.r * (e.boss ? 3.6 : 4.3), o = Object.assign({}, e.boss && !MODEL_OPT[e.type] ? { tint: e.c, mix: .6, emi: .18 } : MODEL_OPT[e.type]);
  if (e.el) { o.tint = '#ffd23b'; o.mix = .55; o.emi = .28; }
  const g = inst(mn, H, o); g.add(emo(EMO[e.type] || '?', e.boss ? e.r * 1.1 : e.r * 1.4, H + e.r * .9)); g.userData.top = H; return g;
}
loadModels();

function enemyMesh(e) {
  const mg = enemyModel(e); if (mg) return mg;
  const r = e.r, c = e.c, g = new T3.Group(); let top = r * 3;
  const eyes = (y, col) => g.add(box(3, r * .2, r * .2, col, r * .5, y, r * .22, { emissive: col, emissiveIntensity: 1 }), box(3, r * .2, r * .2, col, r * .5, y, -r * .22, { emissive: col, emissiveIntensity: 1 }));
  switch (e.type) {
    case 'bot': g.add(box(r * 1.1, r * 1.7, r * 1.5, c, 0, r * .95, 0, { metalness: .5 }), box(r * .95, r * .9, r, '#b9c2d4', 0, r * 2.3, 0, { metalness: .5 }), cyl(1, 1, r * .6, '#444', 0, r * 3, 0)); eyes(r * 2.35, '#ff3030'); top = r * 3.4; break;
    case 'hater': g.add(cyl(r * .5, r, r * 2, c, 0, r, 0), sph(r * .55, '#e8c39e', 0, r * 2.5, 0), box(r * .25, r * .7, r * 1.2, '#ffffff', 0, r * 3.7, 0)); eyes(r * 2.55, '#300'); top = r * 4.2; break;
    case 'clipper': g.add(cyl(r * .45, r * .8, r * 2.2, c, 0, r * 1.1, 0), sph(r * .5, '#e8c39e', 0, r * 2.7, 0), box(r * 1.7, r * .15, r * .3, '#e0e0e8', r * 1.1, r * 1.4, r * .35, { metalness: .8 }), box(r * 1.7, r * .15, r * .3, '#e0e0e8', r * 1.1, r * 1.4, -r * .35, { metalness: .8 })); top = r * 3.3; break;
    case 'troll': g.add(sph(r, c, 0, r, 0), sph(r * .5, '#55883a', r * .2, r * 2.15, 0), cyl(.1, r * .16, r * .7, '#eee', 0, r * 2.8, r * .35), cyl(.1, r * .16, r * .7, '#eee', 0, r * 2.8, -r * .35), box(r * .7, r * .5, r * 2.9, c, r * .2, r * 1.2, 0)); eyes(r * 2.2, '#ffe14a'); top = r * 3.2; break;
    case 'ghost': { const o = { transparent: true, opacity: .6, emissive: c, emissiveIntensity: .5 }; g.add(sph(r, c, 0, r * 1.9, 0, o), cyl(r * .9, .1, r * 1.5, c, 0, r * .75, 0, o)); eyes(r * 2.1, '#ffffff'); top = r * 3.2; break; }
    case 'lawyer': g.add(box(r * .9, r * 2, r * 1.4, c, 0, r, 0), box(2, r * 1.1, r * .25, '#b00020', r * .46, r * 1.3, 0), sph(r * .5, '#e8c39e', 0, r * 2.5, 0), box(r * .25, r * .6, r * .9, '#5a3a1a', 0, r * .7, r * .95)); top = r * 3.2; break;
    case 'farmer': g.add(cyl(r * .6, r, r * 2, c, 0, r, 0), sph(r * .5, '#e8c39e', 0, r * 2.5, 0), cyl(1, 1, r * 1.3, '#333', 0, r * 3.5, 0), sph(r * .22, '#2affb0', 0, r * 4.2, 0, { emissive: '#2affb0', emissiveIntensity: 1 })); top = r * 4.6; break;
    case 'golem': g.add(box(r * 1.6, r * 1.4, r * 2, c, 0, r * .7, 0), box(r * 1.3, r * 1.1, r * 1.5, '#a87c44', 0, r * 1.95, 0), box(r * .9, r * .8, r * .9, c, 0, r * 2.9, 0), box(r * .7, r * 1.6, r * .6, '#8a6436', 0, r * 1.5, r * 1.3), box(r * .7, r * 1.6, r * .6, '#8a6436', 0, r * 1.5, -r * 1.3)); eyes(r * 2.95, '#ff5a2a'); top = r * 3.6; break;
    case 'algo': { g.add(sph(r, '#ffffff', 0, r * 1.9, 0, { emissive: '#ffffff', emissiveIntensity: .35 }), sph(r * .45, '#0a0a12', r * .68, r * 1.9, 0), sph(r * .18, '#ff3b3b', r * 1.02, r * 1.9, 0, { emissive: '#ff3b3b', emissiveIntensity: 1 }));
      const sp = new T3.Group(); for (let i = 0; i < 12; i++) { const a = i * TAU / 12; sp.add(box(12, 12, 12, '#' + new T3.Color().setHSL(i / 12, .7, .6).getHexString(), Math.cos(a) * r * 1.7, r * 1.9 + Math.sin(a * 3) * 14, Math.sin(a) * r * 1.7, { emissive: '#333', emissiveIntensity: .6 })); }
      g.add(sp); g.userData.spin = sp; top = r * 3.3; break; }
    default: { const o = { emissive: c, emissiveIntensity: .22 }, tr = e.type === 'ghostv' ? { transparent: true, opacity: .7, emissive: c, emissiveIntensity: .5 } : o;
      g.add(cyl(r * .7, r, r * 2.2, c, 0, r * 1.1, 0, tr), box(r * .8, r * .5, r * 2.5, c, 0, r * 1.9, 0, tr), sph(r * .6, e.type === 'ghostv' ? c : '#e8c39e', 0, r * 2.8, 0, e.type === 'ghostv' ? tr : undefined));
      const halo = mesh(G('halo', () => new T3.TorusGeometry(1, .09, 8, 32).rotateX(Math.PI / 2)), mat(c, { emissive: c, emissiveIntensity: 1 }), 0, r * 3.8, 0); halo.scale.setScalar(r * .7); g.add(halo); eyes(r * 2.85, '#ffffff'); top = r * 4.1; }
  }
  g.add(emo(EMO[e.type] || '?', e.boss ? r * 1.1 : r * 1.5, top + (e.boss ? r * .7 : r * .6)));
  g.userData.top = top; return g;
}
const FONT = '"Russo One","Segoe UI",sans-serif', hud = { hp: 1, bhp: 1, bb: null };
function skew(x, y, w, h) { const k = h * .55; X.beginPath(); X.moveTo(x + k, y); X.lineTo(x + w + k, y); X.lineTo(x + w, y + h); X.lineTo(x, y + h); X.closePath(); }
function gbar(x, y, w, h, v, lag, c1, c2) {
  v = clamp(v, 0, 1); skew(x - 4, y - 4, w + 8, h + 8); X.fillStyle = 'rgba(6,8,12,.88)'; X.fill();
  if (lag > v) { skew(x, y, w * clamp(lag, 0, 1), h); X.fillStyle = 'rgba(255,255,255,.75)'; X.fill(); }
  if (v > 0) { const g = X.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, c1); g.addColorStop(1, c2); skew(x, y, w * v, h); X.fillStyle = g; X.fill(); skew(x + h * .3, y, w * v, h * .4); X.fillStyle = 'rgba(255,255,255,.2)'; X.fill(); }
  skew(x - 4, y - 4, w + 8, h + 8); X.strokeStyle = 'rgba(255,255,255,.4)'; X.lineWidth = 1.5; X.stroke();
}
function radial(cx, cy, r, k, col) { X.beginPath(); X.moveTo(cx, cy); X.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(k, 0, 1)); X.closePath(); X.fillStyle = col; X.fill(); }
function chip(x, y, t, col) { X.font = '17px ' + FONT; const w = X.measureText(t).width + 30; skew(x - w, y, w, 26); X.fillStyle = 'rgba(6,8,12,.85)'; X.fill(); X.strokeStyle = col; X.lineWidth = 1.5; X.stroke(); X.fillStyle = col; X.textAlign = 'right'; X.fillText(t, x - 6, y + 19); }
function drawHud() {
  X.textBaseline = 'alphabetic'; X.textAlign = 'left'; const now = performance.now() / 1000;
  const mh = maxHp(), hv = clamp(P.hp / mh, 0, 1); hud.hp = hud.hp < hv ? hv : Math.max(hv, hud.hp - .005);
  X.font = '16px ' + FONT; X.shadowColor = '#000'; X.shadowBlur = 6; X.fillStyle = '#fff'; X.fillText('ВАНЁК', 46, H - 96); X.fillStyle = '#ff5a3c'; X.fillText('back2u', 46 + X.measureText('ВАНЁК ').width, H - 96); X.shadowBlur = 0;
  gbar(40, H - 86, 360, 22, hv, hud.hp, '#a30f1c', '#ff5a3c');
  X.font = '13px ' + FONT; X.fillStyle = '#fff'; X.fillText(Math.max(0, Math.ceil(P.hp)) + ' / ' + mh, 62, H - 69);
  const full = P.swag >= 100;
  gbar(32, H - 54, 270, 12, P.rage > 0 ? P.rage / 8 : P.swag / 100, 0, P.rage > 0 ? '#ff2a00' : '#ff8a00', full && Math.floor(now * 6) % 2 ? '#ffffff' : '#ffd23b');
  X.font = '12px ' + FONT; X.fillStyle = full || P.rage > 0 ? '#ffd23b' : '#8d97aa'; X.fillText(P.rage > 0 ? 'ПЕРЕГРУЗ!' : full ? 'СВЭГ ПОЛОН — [R]' : 'СВЭГ', 322, H - 43);
  // оружие
  let i = 0;
  for (const w of ['bat', 'mic', 'vinyl']) {
    const x = 44 + i * 78, y = H - 172, own = S.wl[w] > 0, cur = S.weapon === w, c = WP[w].col;
    skew(x, y, 62, 58); X.fillStyle = cur ? 'rgba(46,12,12,.92)' : 'rgba(6,8,12,.8)'; X.fill(); X.strokeStyle = cur ? c : 'rgba(255,255,255,.25)'; X.lineWidth = cur ? 3 : 1.5; if (cur) { X.shadowColor = c; X.shadowBlur = 14; } X.stroke(); X.shadowBlur = 0;
    X.globalAlpha = own ? 1 : .25; X.font = '28px "Segoe UI Emoji"'; X.textAlign = 'center'; X.fillStyle = '#fff'; X.fillText(own ? (w === 'bat' && P.thr ? '👊' : WP[w].icon) : '🔒', x + 48, y + 38); X.globalAlpha = 1;
    X.font = '12px ' + FONT; X.textAlign = 'left'; X.fillStyle = cur ? '#fff' : '#8d97aa'; X.fillText(String(i + 1), x + 72, y + 14);
    if (own) for (let l = 0; l < 5; l++) { X.fillStyle = l < S.wl[w] ? '#ffd23b' : 'rgba(255,255,255,.18)'; X.fillRect(x + 10 + l * 9, y + 50, 7, 3); }
    const rid = { bat: 'b5', mic: 'm5', vinyl: 'v5' }[w];
    if (own && sk(rid)) {
      const k = 1 - clamp(P.rcd[w] / WP[w].rune.cd, 0, 1), rx = x + 24, ry = y + 4; X.beginPath(); X.arc(rx, ry, 12, 0, TAU); X.fillStyle = 'rgba(6,8,12,.95)'; X.fill();
      radial(rx, ry, 11, k, k >= 1 ? c : 'rgba(255,255,255,.35)'); X.font = '11px ' + FONT; X.textAlign = 'center'; X.fillStyle = k >= 1 ? '#000' : '#fff'; X.fillText('E', rx, ry + 4);
    }
    i++;
  }
  if (S.comp > 0) {
    const cx = 44 + 3 * 78 + 44, cy = H - 143, k = 1 - clamp(P.qcd / (S.comp >= 4 ? 6 : 9), 0, 1);
    X.beginPath(); X.arc(cx, cy, 30, 0, TAU); X.fillStyle = 'rgba(6,8,12,.88)'; X.fill(); radial(cx, cy, 28, k, k >= 1 ? 'rgba(92,208,255,.55)' : 'rgba(92,208,255,.2)');
    X.beginPath(); X.arc(cx, cy, 30, 0, TAU); X.strokeStyle = '#5cd0ff'; X.lineWidth = k >= 1 ? 3 : 1.5; X.stroke();
    X.font = '24px "Segoe UI Emoji"'; X.textAlign = 'center'; X.fillStyle = '#fff'; X.globalAlpha = k >= 1 ? 1 : .4; X.fillText('🗣️', cx, cy + 9); X.globalAlpha = 1;
    X.font = '12px ' + FONT; X.fillStyle = '#5cd0ff'; X.fillText('Q · madk1d', cx, cy + 48);
  }
  if (S.weapon === 'bat') { X.font = '12px ' + FONT; X.textAlign = 'left'; X.fillStyle = P.thr ? '#ffd23b' : '#8d97aa'; X.fillText(P.thr ? '[C] — вернуть биту' : '[C] — бросить биту', 46, H - 184); }
  chip(W - 30, 16, '▶ ' + S.xp, '#7dff7d'); chip(W - 30, 50, '▣ ' + S.tapes, '#ffd23b');
  X.textAlign = 'center';
  if (fs && fs.boss && !fs.boss.dead) {
    const b = fs.boss, bv = clamp(b.hp / b.maxhp, 0, 1); if (hud.bb !== b) { hud.bb = b; hud.bhp = 1; } hud.bhp = hud.bhp < bv ? bv : Math.max(bv, hud.bhp - .004);
    X.font = '26px ' + FONT; X.shadowColor = '#000'; X.shadowBlur = 8; X.fillStyle = '#fff'; X.fillText(b.d.n, W / 2, 34); X.shadowBlur = 0;
    gbar(W / 2 - 370, 46, 730, 14, bv, hud.bhp, '#5a0d14', b.c);
    const L = b.d.phases.length; X.fillStyle = 'rgba(0,0,0,.85)'; for (let j = 1; j < L; j++) X.fillRect(W / 2 - 370 + 730 * (1 - j / L) + 3, 44, 3, 18);
    X.font = '12px ' + FONT; X.fillStyle = '#9fb0c8'; X.fillText(b.d.sub, W / 2, 82);
  } else if (fs && fs.waves && !fs.done) { X.font = '15px ' + FONT; X.shadowColor = '#000'; X.shadowBlur = 6; X.fillStyle = '#fff'; X.fillText('ВОЛНА ' + (fs.i + 1) + ' / ' + fs.waves.length + '   ·   врагов: ' + ens.length, W / 2, 30); X.shadowBlur = 0; }
  if (P.hitT > 0 && P.hits > 2) { X.textAlign = 'right'; X.globalAlpha = Math.min(1, P.hitT); X.font = '46px ' + FONT; X.shadowColor = '#000'; X.shadowBlur = 8; X.fillStyle = '#fff'; X.fillText(P.hits, W - 40, H / 2); X.font = '14px ' + FONT; X.fillStyle = '#ffd23b'; X.fillText('ХИТОВ ПОДРЯД', W - 40, H / 2 + 22); X.shadowBlur = 0; X.globalAlpha = 1; }
  // угрозы вне поля зрения
  for (const e of ens) {
    if (e.dead || (e.state !== 'wind' && e.state !== 'dash')) continue;
    let rel = ang(P, e) - camYaw; while (rel > Math.PI) rel -= TAU; while (rel < -Math.PI) rel += TAU; if (Math.abs(rel) < 1) continue;
    X.save(); X.translate(W / 2 + Math.sin(rel) * 190, H * .62 - Math.cos(rel) * 130); X.rotate(rel); X.fillStyle = 'rgba(255,50,50,' + (.6 + .4 * Math.sin(now * 20)) + ')';
    X.beginPath(); X.moveTo(0, -18); X.lineTo(13, 9); X.lineTo(0, 3); X.lineTo(-13, 9); X.closePath(); X.fill(); X.restore();
  }
  { const q = proj(P.x + Math.cos(camYaw) * 300, P.y + Math.sin(camYaw) * 300, 30); X.beginPath(); X.arc(q.x, q.y, 5, 0, TAU); X.strokeStyle = 'rgba(255,255,255,.55)'; X.lineWidth = 1.5; X.stroke(); }
  X.textAlign = 'center'; X.font = '13px ' + FONT;
  if (mode === 'fight' && document.pointerLockElement !== C) { X.fillStyle = 'rgba(255,210,59,.9)'; X.fillText('Кликни по игре, чтобы захватить мышь · без захвата камера крутится у краёв экрана', W / 2, H - 14); }
  else if (S.ch === 0 && S.step < 5) { X.fillStyle = 'rgba(255,255,255,.75)'; X.fillText('WASD — ходить · мышь — камера · ЛКМ — удар · ПКМ — тяжёлый (держи — заряд) · ПРОБЕЛ — перекат · SHIFT — блок · C — бросок биты', W / 2, H - 14); }
  X.textAlign = 'left';
}
function teleDecals(e) {
  if (e.state !== 'wind') return;
  const k = e.boss ? clamp(1 - e.t / WIND[e.mv], 0, 1) : 1, mv = e.boss ? e.mv : e.ai, R = '#ff3030';
  if (mv === 'melee') dSect(e.x, e.y, e.rng + P.r, e.aa, 2.2, R, .3);
  else if (mv === 'brute') { dCirc(e.x, e.y, e.rng + 30, R, .25); dRing(e.x, e.y, e.rng + 30, R, .9); }
  else if (mv === 'tele') { dCirc(e.x, e.y, 64, R, .25); dRing(e.x, e.y, 64, R, .9); }
  else if (mv === 'slam') { const r = e.r + 130; dCirc(e.x, e.y, r, R, .22); dRing(e.x, e.y, r, R, .9); dRing(e.x, e.y, r * k, '#ffffff', .7); }
  else if (mv === 'leap') { dCirc(e.tx, e.ty, 140, R, .22); dRing(e.tx, e.ty, 140, R, .9); dRing(e.tx, e.ty, 140 * k, '#ffffff', .7); }
  else if (mv === 'charger' || mv === 'charge') decal('rect', gRect, e.x, e.y, e.boss ? 560 : 360, e.r * 2, -e.aa, R, .28);
  else dRing(e.x, e.y, e.r + 10 + Math.sin(performance.now() / 40) * 3, e.boss ? e.c : '#ffcc66', .95);
}
function render() {
  X.setTransform(1, 0, 0, 1, 0, 0); X.clearRect(0, 0, W, H);
  if (!S || !P || !T3) return;
  if (!R3) init3d();
  const th = CH[Math.min(S.ch, CH.length - 1)].th, now = performance.now() / 1000, fdt = Math.min(.05, lastNow ? now - lastNow : 0); lastNow = now;
  if (builtDeco !== deco) { builtDeco = deco; buildWorld(th); }
  // камера
  const sx = shake ? rnd(-shake, shake) * .5 : 0, sy = shake ? rnd(-shake, shake) * .5 : 0, fx = Math.cos(camYaw), fz = Math.sin(camYaw), cd0 = 270;
  let cdn = cd0; for (let t = 30; t <= cd0; t += 20) if (!okPos(P.x - fx * t, P.y - fz * t, 12)) { cdn = t - 20; break; }
  camD += (Math.max(40, cdn) - camD) * .2;
  { const kk = camD / cd0, hh = 60 + 330 * camPit; CAM.position.set(P.x - fx * camD - fz * 22 + sx, 44 + (hh - 44) * (.35 + .65 * kk) + sy, P.y - fz * camD + fx * 22); CAM.lookAt(P.x + fx * 130, 38, P.y + fz * 130); }
  CAM.updateMatrixWorld();
  if (fdt > 0 && fdt < .2 && !document.hidden) { fpsA += (1 / fdt - fpsA) * .05; qT += fdt; if (qT > 3) { qT = 0; if (fpsA < 40 && qual > 0) { qual--; setPR(); SUN.castShadow = qual > 0; } } }
  SUN.position.set(P.x + 320, 760, P.y + 260); SUN.target.position.set(P.x, 0, P.y); SUN.target.updateMatrixWorld();
  for (const k in pools) pools[k].i = 0;
  for (const p of spinners) { const u = p.userData, a = u.a + now * u.sp; p.position.set(LV.w / 2 + Math.cos(a) * u.rr, u.h + Math.sin(now + u.a) * 10, LV.h / 2 + Math.sin(a) * u.rr * .6); p.rotation.set(now * .5 + u.a, now * .3, 0); }

  // Ванёк
  const w = S.weapon, wd = WP[w], a = P.atk;
  PM.position.set(P.x, 0, P.y); PM.rotation.y = -P.aim;
  if (!PM.userData.mdl && MDL.vanek) { const q = inst('vanek', 72, { tint: '#4a4d5a', mix: .5 }); PIN.children.slice(0, 5).forEach(c => { c.visible = false; }); PIN.add(q); PM.userData.mdl = q; }
  if (!CM.userData.mdl && MDL.kent) { const q = inst('kent', 62, { tint: '#bfe6ff', mix: .3 }); CM.children.forEach(c => { c.visible = false; }); CM.add(q); CM.userData.mdl = q; }
  const pg = PM.userData.mdl;
  if (pg) {
    if (P.dodge > 0) play(pg, 'dodge', true, .32, P.dn); else if (P.block || P.chg > .15) play(pg, 'block'); else if (P.spin > 0) play(pg, 'spin', false, .5);
    else if (a) play(pg, a.heavy ? 'heavy' : a.w === 'vinyl' ? 'thr' : a.combo % 2 ? 'atk' : 'atk2', true, a.dur * 1.6, a.n);
    else if (mode === 'fight' && P.mv) play(pg, 'run'); else play(pg, 'idle');
    pg.userData.mx.update(fdt);
  }
  PM.visible = !(P.inv > 0 && P.inv < 1 && P.dodge <= 0 && Math.floor(now * 18) % 2);
  if (P.dodge > 0 && !pg) { PIN.rotation.z = -(1 - P.dodge / .22) * TAU; PIN.position.y = 14; PIN.scale.setScalar(.8); } else { PIN.rotation.z = 0; PIN.position.y = 0; PIN.scale.setScalar(1); }
  pBodyMat.emissive.set(P.rage > 0 ? '#ff4a1c' : '#000000');
  for (const k in WG) WG[k].visible = k === w && !(k === 'bat' && P.thr);
  if (P.thr) { const m = use('tb', () => { const q = new T3.Group(); q.add(box(18, 6, 6, '#2b5fd0', -22, 0, 0), box(40, 10, 10, '#d2a868', 6, 0, 0), box(4, 11, 11, '#ff5a2a', 24, 0, 0)); return q; }); m.position.set(P.thr.x, 30, P.thr.y); m.rotation.y = P.thr.rot; dRing(P.thr.x, P.thr.y, 20, '#ff5a2a', .7); }
  let sw = .75;
  if (a) { const d = (a.d || wd[a.heavy ? 'heavy' : 'light']), arc = d.arc || 1.2, k = clamp(a.t / a.dur, 0, 1); sw = (a.combo % 2 ? -1 : 1) * (arc / 2 - arc * k); }
  if (P.spin > 0) sw = now * 22;
  WPV.rotation.y = -sw; WPV.rotation.z = a && a.heavy && w === 'bat' ? Math.sin(clamp(a.t / a.dur, 0, 1) * Math.PI) * .5 : 0;
  if (w === 'mic') { const L = P.spin > 0 ? 140 : a ? (a.d || wd[a.heavy ? 'heavy' : 'light']).range - 14 : 34; WG.mic.children[0].scale.x = L; WG.mic.children[0].position.x = L / 2 + 8; WG.mic.children[1].position.x = L + 14; }
  SHIELD.visible = P.block; if (P.block) SHIELD.material.color.set(P.blockT < .24 ? '#ffffff' : '#49e0ff');
  if (a && w !== 'vinyl' && a.t >= a.wind) {
    const d = (a.d || wd[a.heavy ? 'heavy' : 'light']), full = w === 'mic' && a.heavy && sk('m1');
    dSect(P.x, P.y, d.range, a.a, full ? TAU : d.arc, wd.col, .4 * (1 - (a.t - a.wind) / (a.dur - a.wind + .001)));
  }
  if (P.spin > 0) dRing(P.x, P.y, 155, '#49e0ff', .8);
  if (P.rage > 0) dRing(P.x, P.y, 34 + Math.sin(now * 12) * 4, '#ff4a1c', .9);
  { const cg = CM.userData.mdl, cmv = Math.hypot(comp.x - (comp.lx || 0), comp.y - (comp.ly || 0)) > .7; comp.lx = comp.x; comp.ly = comp.y;
    CM.position.set(comp.x, cg ? 0 : Math.abs(Math.sin(now * 6)) * 2, comp.y); CM.rotation.y = -P.aim;
    if (cg) { if (comp.sayT > 0) play(cg, 'cheer'); else play(cg, cmv ? 'run' : 'idle'); cg.userData.mx.update(fdt); } }
  if (P.chg > .15) dRing(P.x, P.y, 30 + P.chg * 44, P.chg >= 1 ? '#ffffff' : wd.col, .9);
  if (P.crit > 0) dRing(P.x, P.y, 26, '#ffffff', .5 + .4 * Math.sin(now * 16));
  for (const q of statics) q.userData.mx.update(fdt);
  corpses = corpses.filter(c => { c.t -= fdt; c.m.userData.mx.update(fdt); if (c.t < .5) c.m.position.y -= fdt * 60; if (c.t <= 0) { SC.remove(c.m); return false; } return true; });

  // враги
  stamp++;
  for (const e of ens) {
    if (!e.m) { e.m = enemyMesh(e); SC.add(e.m); emesh.push(e.m); e.ph0 = Math.random() * 9; }
    const m = e.m; m.userData.st = stamp;
    const k = e.spawn > 0 ? clamp(1 - e.spawn / (e.boss ? 1.2 : .7), .05, 1) : 1;
    m.scale.setScalar(k * (e.fl > 0 ? 1.14 : 1));
    const fly = e.type === 'ghost' || e.type === 'algo' ? 6 + Math.sin(now * 3 + e.ph0) * 5 : (e.state === 'idle' && e.stun <= 0 ? Math.abs(Math.sin(now * 9 + e.ph0)) * 3 : 0);
    m.position.set(e.x, fly, e.y);
    m.rotation.y = -((e.state === 'wind' || e.state === 'dash') ? e.aa : ang(e, P));
    m.rotation.z = e.stun > 0 ? Math.sin(now * 22) * .14 : e.state === 'wind' && !e.boss ? -.18 : 0;
    if (m.userData.mdl) {
      const u = m.userData; m.rotation.z = 0; if (e.type !== 'ghost') m.position.y = 0;
      if (e.state === 'wind' && u.ps !== 'wind') { u.wn = (u.wn || 0) + 1; u.wd = Math.max(.3, e.t); } u.ps = e.state;
      const cast = e.ai === 'ranged' || e.ai === 'summon' || (e.boss && !['slam', 'leap', 'charge'].includes(e.mv));
      if (e.spawn > 0) play(m, 'idle'); else if (e.stun > 0 || e.state === 'hurt') play(m, 'hit');
      else if (e.state === 'wind') play(m, cast ? 'cast' : 'atk', true, u.wd * 1.7, u.wn); else if (e.state === 'dash' || e.state === 'idle') play(m, 'run');
      if (dist(e, P) < 1100) u.mx.update(fdt);
    }
    if (e.shock > 0) dRing(e.x, e.y, e.r + 4, '#49e0ff', .5 + .4 * Math.sin(now * 30));
    if (e.pitch > 0) dCirc(e.x, e.y, e.r + 6, '#e9e2ff', .25);
    if (e.d.shield && !(e.brk > 0)) dSect(e.x, e.y, e.r + 16, ang(e, P), 2, '#7fa8ff', .5);
    if (m.userData.spin) m.userData.spin.rotation.y = now * 1.5;
    teleDecals(e);
    if (e.el) dRing(e.x, e.y, e.r + 9, '#ffd23b', .9);
    if (e.fin) dRing(e.x, e.y, e.r + 16 + Math.sin(now * 14) * 4, '#ffe14a', 1);
  }
  emesh = emesh.filter(m => { if (m.userData.st !== stamp) { if (m.userData.mdl && corpses.length < 14) { play(m, 'death', true); m.rotation.z = 0; corpses.push({ m, t: 1.5 }); } else SC.remove(m); return false; } return true; });

  // зоны, сферы, снаряды, эффекты
  for (const h of haz) { const c = h.pl ? '#5cd0ff' : '#ff3030'; dCirc(h.x, h.y, h.r, c, .22); dRing(h.x, h.y, h.r, c, .9); dRing(h.x, h.y, h.r * clamp(1 - h.t / h.mt, 0, 1), '#ffffff', .7); }
  for (const r of rings) dRing(r.x, r.y, r.r, r.c, clamp(r.l / .35, 0, 1));
  for (const o of orbs) { const m = use('orb', () => mesh(new T3.SphereGeometry(8, 12, 10), new T3.MeshBasicMaterial({ color: '#7dff7d' }))); m.position.set(o.x, 16 + Math.sin(now * 5 + o.x) * 5, o.y); }
  for (const p of prj) {
    if (p.paper) { const m = use('pp', () => mesh(new T3.BoxGeometry(18, 2, 14), new T3.MeshBasicMaterial({ color: '#f4f4ff' }))); m.position.set(p.x, 24, p.y); m.rotation.set(0, -Math.atan2(p.vy, p.vx), Math.sin(now * 10 + p.x) * .4); m.material.color.set(p.col); }
    else if (p.from === 'p' && p.col !== '#49e0ff') { const m = use('pv', () => { const g = new T3.Group(); g.add(mesh(new T3.CylinderGeometry(11, 11, 2, 20), new T3.MeshStandardMaterial({ color: '#e9e2ff', metalness: .8, roughness: .2, emissive: '#6a5cff', emissiveIntensity: .4 })), mesh(new T3.BoxGeometry(22, 2.4, 2), new T3.MeshBasicMaterial({ color: '#222' }))); return g; }); m.position.set(p.x, 24, p.y); m.rotation.y = p.rot; }
    else { const m = use('pe', () => mesh(new T3.SphereGeometry(1, 12, 10), new T3.MeshBasicMaterial())); m.castShadow = false; m.position.set(p.x, 22, p.y); m.scale.setScalar(p.r * 1.15); m.material.color.set(p.col); dCirc(p.x, p.y, p.r * 1.3, p.col, .3); }
  }
  for (const p of pts) { const m = use('pt', () => { const q = new T3.Mesh(G('box', () => new T3.BoxGeometry(1, 1, 1)), new T3.MeshBasicMaterial()); return q; }); m.position.set(p.x, 14 + p.l * 60, p.y); m.scale.setScalar(p.s * 1.4); m.material.color.set(p.c); }
  for (const b of bolts) { const m = use('bolt', () => new T3.Mesh(G('box', () => new T3.BoxGeometry(1, 1, 1)), new T3.MeshBasicMaterial())); const L = Math.hypot(b.x2 - b.x1, b.y2 - b.y1); m.position.set((b.x1 + b.x2) / 2, 26 + rnd(-4, 4), (b.y1 + b.y2) / 2); m.scale.set(L, 4, 4); m.rotation.y = -Math.atan2(b.y2 - b.y1, b.x2 - b.x1); m.material.color.set(b.c); }
  for (const o of ents) {
    if (!o.m) continue;
    if (o.k === 'chest') o.m.visible = !S.done[o.id];
    else if (o.k === 'lore') { o.m.visible = !S.done[o.id]; o.m.position.y = Math.sin(now * 3) * 6; }
    else if (o.k === 'portal') { const op = exitOpen(), c = op ? '#49e0ff' : '#44485a'; o.m.children[0].material.color.set(c); o.m.children[0].material.emissive.set(c); o.m.children[1].material.color.set(c); o.m.children[0].rotation.z = now * (op ? 1.5 : .2); }
    else o.m.rotation.y = -ang(o, P);
  }
  if (fs && !fs.done) { const r = fs.room; for (const [x, z, sx, sz] of [[r.cx, r.y, r.w, 6], [r.cx, r.y + r.h, r.w, 6], [r.x, r.cy, 6, r.h], [r.x + r.w, r.cy, 6, r.h]]) { const m = use('gate', () => new T3.Mesh(G('box', () => new T3.BoxGeometry(1, 1, 1)), new T3.MeshBasicMaterial({ color: '#ff3030', transparent: true, opacity: .3, depthWrite: false }))); m.position.set(x, 26, z); m.scale.set(sx, 52, sz); } }
  for (const k in pools) { const p = pools[k]; for (let i = p.i; i < p.a.length; i++) p.a[i].visible = false; }
  R3.render(SC, CAM);

  // 2D-слой поверх: подписи, полоски, HUD
  X.textAlign = 'center'; X.textBaseline = 'alphabetic';
  for (const e of ens) {
    if (e.spawn > 0) continue; const q = proj(e.x, e.y, e.m.userData.top + e.r * 1.4);
    if (!e.boss && e.hp < e.maxhp) { X.fillStyle = '#000'; X.fillRect(q.x - 21, q.y - 1, 42, 6); X.fillStyle = '#f44'; X.fillRect(q.x - 20, q.y, 40 * clamp(e.hp / e.maxhp, 0, 1), 4); }
    if (e.sm > 0 && !e.fin && e.hp < e.maxhp) { X.fillStyle = '#000'; X.fillRect(q.x - 21, q.y + 6, 42, 4); X.fillStyle = '#ffe14a'; X.fillRect(q.x - 20, q.y + 7, 40 * clamp(e.sm, 0, 1), 2); }
    if (e.fin) { X.font = 'bold 20px "Russo One","Segoe UI"'; X.strokeStyle = '#000'; X.lineWidth = 4; X.strokeText('[F]', q.x, q.y - 22); X.fillStyle = '#ffe14a'; X.fillText('[F]', q.x, q.y - 22); }
    if (e.stun > 0) { X.font = '15px sans-serif'; X.fillStyle = '#ffe14a'; X.fillText('✦ ✦ ✦', q.x, q.y - 6); }
    if (e.boss && e.sayT > 0 && e.say) { X.globalAlpha = Math.min(1, e.sayT); X.font = 'bold 19px "Segoe UI",sans-serif'; X.strokeStyle = '#000'; X.lineWidth = 4; X.strokeText(e.say, q.x, q.y - 12); X.fillStyle = e.c; X.fillText(e.say, q.x, q.y - 12); X.globalAlpha = 1; }
  }
  { const q = proj(comp.x, comp.y, 74); X.font = '11px Consolas'; X.fillStyle = 'rgba(92,208,255,.9)'; X.fillText('madk1d', q.x, q.y);
    if (comp.sayT > 0) { X.font = 'bold 24px "Russo One","Segoe UI"'; X.strokeStyle = '#000'; X.lineWidth = 4; X.strokeText(comp.say, q.x, q.y - 18); X.fillStyle = '#5cd0ff'; X.fillText(comp.say, q.x, q.y - 18); } }
  for (const t of txt) { const q = proj(t.x, t.y, 60); X.globalAlpha = clamp(t.l * 2, 0, 1); X.font = (t.big ? 'bold 22px' : 'bold 15px') + ' ' + FONT; X.strokeStyle = '#000'; X.lineWidth = 3; X.strokeText(t.s, q.x, q.y); X.fillStyle = t.c; X.fillText(t.s, q.x, q.y); }
  X.globalAlpha = 1;
  for (const o of ents) {
    if ((o.k !== 'npc' && o.k !== 'seva') || dist(o, P) > 750) continue;
    const q = proj(o.x, o.y, 118), st = o.k === 'npc' ? (S.q[o.id] ? S.q[o.id].st : 0) : -1;
    X.font = 'bold 12px "Russo One","Segoe UI"'; X.strokeStyle = '#000'; X.lineWidth = 3; const nm = o.k === 'seva' ? 'ДЯДЯ СЕВА · мастерская' : NPCS[o.id].n; X.strokeText(nm, q.x, q.y); X.fillStyle = o.k === 'seva' ? '#ffae3b' : NPCS[o.id].c; X.fillText(nm, q.x, q.y);
    if (st === 0 || st === 1) { const rd = st === 1 && qReady(o.id); X.font = 'bold 26px "Russo One","Segoe UI"'; X.strokeText(st === 0 ? '!' : '?', q.x, q.y - 16); X.fillStyle = st === 0 || rd ? '#ffd23b' : '#8d97aa'; X.fillText(st === 0 ? '!' : '?', q.x, q.y - 16); }
  }
  if (th.deco === 'snow') { X.fillStyle = 'rgba(255,255,255,.6)'; for (let i = 0; i < 70; i++) { const x = (i * 137.5 + now * 30 * (1 + i % 3)) % W, y = (i * 71.3 + now * 70 * (1 + i % 4) * .5) % H; X.fillRect(x, y, 2, 2); } }
  const g = X.createRadialGradient(W / 2, H / 2, H * .5, W / 2, H / 2, H * .98); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.5)'); X.fillStyle = g; X.fillRect(0, 0, W, H);
  if (P.hp / maxHp() < .3) { X.fillStyle = `rgba(200,0,0,${.12 + .06 * Math.sin(now * 6)})`; X.fillRect(0, 0, W, H); }
  if (flash > 0) { X.fillStyle = `rgba(255,255,255,${clamp(flash, 0, .5)})`; X.fillRect(0, 0, W, H); }
  if (mode !== 'title' && mode !== 'end' && mode !== 'dlg') { drawHud(); drawNav(); }
}

/* ================= ПРОКАЧКА ================= */
function openUp(shop) {
  upShop = shop; mode = 'up';
  $('uph').textContent = shop ? 'МАСТЕРСКАЯ ДЯДИ СЕВЫ' : 'ПРОКАЧКА';
  $('upClose').textContent = shop ? 'В путь →' : 'Закрыть [TAB]';
  buildUp(); show('up', true);
}
function closeUp() { show('up', false); save(); upShop = false; mode = 'fight'; lock(); }
let upTab = 'bat';
function buildUp() {
  $('uxp').textContent = S.xp; $('utp').textContent = S.tapes;
  const tabs = [['bat', WP.bat.icon + ' БИТА'], ['mic', WP.mic.icon + ' МИКРОФОН'], ['vinyl', WP.vinyl.icon + ' СЭМПЛЕР'], ['me', '💪 ВАНЁК И КЕНТ'], ['trk', '💍 ЦАЦКИ ' + S.trk.eq.length + ' / 3']];
  let h = '<div class="tabs">' + tabs.map(([id, t]) => `<button class="tab ${upTab === id ? 'on' : ''}" data-a="tab" data-id="${id}">${t}</button>`).join('') + '</div><div class="pane">';
  const card = (cls, bdg, title, desc, right) => `<div class="card ${cls}"><i class="bdg">${bdg}</i><div><b>${title}</b><span>${desc}</span></div>${right}</div>`;
  if (WP[upTab]) {
    const w = upTab, d = WP[w], lv = S.wl[w];
    if (!lv) h += `<div class="hero" style="border-color:#3a4052"><div class="big">🔒</div><div><h3>НЕ НАЙДЕНО</h3><p>Это оружие ждёт тебя дальше по сюжету.</p></div></div>`;
    else {
      h += `<div class="hero" style="border-color:${d.col}"><div class="big">${d.icon}</div><div><h3 style="color:${d.col}">${d.name}</h3><p>${d.desc}</p><div class="pips">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= lv ? 'on' : ''}"></i>`).join('')}<em>уровень ${lv} / 5 · +20% урона за уровень · открывает скиллы</em></div></div>` +
        (lv < 5 ? `<button data-a="lvl" data-w="${w}" ${S.tapes < WLVL_COST[lv] || !upShop ? 'disabled' : ''}>Улучшить · ▣ ${WLVL_COST[lv]}${upShop ? '' : '<small>только у Дяди Севы</small>'}</button>` : '<span class="max">МАКС</span>') + `</div><div class="grid">`;
      d.skills.forEach((s, i) => {
        const own = sk(s.id), need = SK_LVL[i] || 1, lock = lv < need;
        h += card(own ? 'own' : lock ? 'lock' : '', 'ур.' + need, s.name, s.desc, own ? '<span class="ok">✔</span>' : lock ? `<span class="need">нужен ур. ${need}</span>` : `<button data-a="sk" data-id="${s.id}" data-c="${s.cost}" ${S.xp < s.cost ? 'disabled' : ''}>▶ ${s.cost}</button>`);
      });
      h += '</div>';
    }
  } else if (upTab === 'me') {
    h += '<div class="grid">';
    for (const s of STATS) { const lv = S.st[s.id]; h += card(lv >= 5 ? 'own' : '', '◆', s.name + '  ' + '●'.repeat(lv) + '○'.repeat(5 - lv), s.desc, lv < 5 ? `<button data-a="st" data-id="${s.id}" data-c="${STAT_COST[lv]}" ${S.xp < STAT_COST[lv] ? 'disabled' : ''}>▶ ${STAT_COST[lv]}</button>` : '<span class="max">МАКС</span>'); }
    COMP.forEach((c, i) => { h += card(S.comp > i ? 'own' : 'lock', '♪', S.comp > i ? 'Осколок голоса ' + c.name : 'Осколок голоса: ???', S.comp > i ? c.desc : 'Ещё не найден — вернётся по сюжету.', ''); });
    h += '</div>';
  } else {
    h += '<div class="grid g3">';
    for (const id in TRK) {
      const t = TRK[id], own = S.trk.owned[id], eq = S.trk.eq.includes(id);
      if (!own && !t.cost) { h += card('lock', '?', '???', 'Спрятано в сундуке где-то в Облаке.', ''); continue; }
      h += card(eq ? 'own' : '', '✦', t.n, t.d, own ? `<button data-a="eq" data-id="${id}" ${!eq && S.trk.eq.length >= 3 ? 'disabled' : ''}>${eq ? 'Снять' : 'Надеть'}</button>` : `<button data-a="buy" data-id="${id}" data-c="${t.cost}" ${S.xp < t.cost || !upShop ? 'disabled' : ''}>▶ ${t.cost}${upShop ? '' : '<small>у Севы</small>'}</button>`);
    }
    h += '</div>';
  }
  $('upCols').innerHTML = h + '</div>';
}
$('upCols').addEventListener('click', ev => {
  const b = ev.target.closest('button'); if (!b || b.disabled) return;
  const a = b.dataset.a, c = +b.dataset.c;
  if (a === 'tab') { upTab = b.dataset.id; sfx.ui(); buildUp(); return; }
  if (a === 'lvl') { const w = b.dataset.w, cost = WLVL_COST[S.wl[w]]; if (S.tapes < cost) return; S.tapes -= cost; S.wl[w]++; }
  else if (a === 'sk') { if (S.xp < c) return; S.xp -= c; S.sk[b.dataset.id] = 1; }
  else if (a === 'st') { if (S.xp < c) return; S.xp -= c; S.st[b.dataset.id]++; if (b.dataset.id === 'hp') P.hp += 20; }
  else if (a === 'eq') { const id = b.dataset.id, i = S.trk.eq.indexOf(id); if (i >= 0) S.trk.eq.splice(i, 1); else if (S.trk.eq.length < 3) S.trk.eq.push(id); P.hp = Math.min(P.hp, maxHp()); }
  else if (a === 'buy') { if (S.xp < c) return; S.xp -= c; S.trk.owned[b.dataset.id] = 1; if (S.trk.eq.length < 3) S.trk.eq.push(b.dataset.id); }
  sfx.buy(); buildUp();
});

/* ================= ВВОД ================= */
addEventListener('keydown', e => {
  if (e.code === 'Tab' || e.code === 'Space') e.preventDefault();
  if (e.repeat) return;
  K[e.code] = true; audio();
  if (e.code === 'KeyM') { muted = !muted; toast(muted ? 'Звук выключен' : 'Звук включён', 1.2); }
  if (mode === 'dlg') { if (e.code === 'Space' || e.code === 'Enter') advDlg(); else if (e.code === 'Escape') endDlg(); return; }
  if (mode === 'up') { if (e.code === 'Tab' || e.code === 'Escape') closeUp(); return; }
  if (mode === 'pause') { if (e.code === 'Escape') { show('pause', false); mode = 'fight'; } return; }
  if (mode !== 'fight') return;
  switch (e.code) {
    case 'Space': doDodge(); break;
    case 'KeyE': doRune(); break;
    case 'KeyF': doInteract(); break;
    case 'KeyC': doThrow(); break;
    case 'KeyQ': doQ(); break;
    case 'KeyR': doRage(); break;
    case 'Digit1': swW('bat'); break;
    case 'Digit2': swW('mic'); break;
    case 'Digit3': swW('vinyl'); break;
    case 'Tab': openUp(false); break;
    case 'Escape': mode = 'pause'; show('pause', true); break;
  }
});
addEventListener('keyup', e => { K[e.code] = false; });
addEventListener('blur', () => { for (const k in K) K[k] = false; M.l = M.r = false; });
const mpos = e => { const r = C.getBoundingClientRect(); M.x = (e.clientX - r.left) * W / r.width; M.y = (e.clientY - r.top) * H / r.height; };
addEventListener('mousemove', e => { mpos(e); if (document.pointerLockElement === C) { camYaw += e.movementX * .0026; camPit = clamp(camPit + e.movementY * .0014, .1, .85); } });
document.addEventListener('pointerlockchange', () => { if (document.pointerLockElement !== C && mode === 'fight') { mode = 'pause'; show('pause', true); } });
C.addEventListener('mousedown', e => { audio(); mpos(e); if (mode === 'fight' || mode === 'dlg') lock(); if (e.button === 0) M.l = true; if (e.button === 2) M.r = true; if (e.button === 1) { e.preventDefault(); if (mode === 'fight') doThrow(); } });
addEventListener('mouseup', e => { if (e.button === 0) M.l = false; if (e.button === 2) M.r = false; });
addEventListener('contextmenu', e => e.preventDefault());
$('dlg').addEventListener('click', () => { audio(); advDlg(); });
C.addEventListener('click', () => { if (mode === 'dlg') advDlg(); });

document.querySelectorAll('#menu button[data-d]').forEach(b => b.addEventListener('click', () => {
  audio(); if (load() && !confirm('Начать заново? Текущее сохранение будет стёрто.')) return; newGame(+b.dataset.d);
}));
$('bCont').addEventListener('click', () => { audio(); const s = load(); if (!s) return; S = s; begin(); });
$('bRetry').addEventListener('click', retry);
$('upClose').addEventListener('click', closeUp);
$('pRes').addEventListener('click', () => { show('pause', false); mode = 'fight'; lock(); });
$('pUp').addEventListener('click', () => { show('pause', false); mode = 'fight'; openUp(false); });
const toMenu = () => { ['pause', 'end', 'dlg', 'up', 'dead', 'choice'].forEach(i => show(i, false)); mode = 'menu'; $('bCont').disabled = !load(); show('menu', true); };
$('pMenu').addEventListener('click', toMenu);
$('bEnd').addEventListener('click', toMenu);
$('cA').addEventListener('click', () => ending(true));
$('cB').addEventListener('click', () => ending(false));
$('bCont').disabled = !load();

/* ================= ЦИКЛ ================= */
let last = 0, typeAcc = 0;
function frame(ts) {
  const raw = Math.min(.033, (ts - last) / 1000 || 0); last = ts;
  logic(raw); render();
  requestAnimationFrame(frame);
}
function logic(raw) {
  if (document.pointerLockElement && mode !== 'fight' && mode !== 'dlg' && mode !== 'title') document.exitPointerLock();
  if (mode === 'fight') {
    let dt = raw;
    if (hitstop > 0) { hitstop -= raw; dt = 0; }
    if (slowmo > 0) { slowmo -= raw; dt *= .3; }
    if (dt > 0) update(dt);
  } else if (mode === 'dlg') {
    if (dch < dfull.length) { dch = Math.min(dfull.length, dch + raw * 75); $('dtext').textContent = dfull.slice(0, Math.floor(dch)); typeAcc += raw; if (typeAcc > .05) { typeAcc = 0; sfx.type(); } }
    updFx(raw);
  } else if (mode === 'title') {
    titleT -= raw; if (titleT <= 0) { show('title', false); const cb = titleCb; titleCb = null; cb(); }
  }
  if (toastT > 0) { toastT -= raw; if (toastT <= 0) $('toast').style.display = 'none'; }
}
requestAnimationFrame(frame);
try { document.fonts.load('16px "Russo One"'); } catch (e) {}

// для отладки из консоли: GOC.skip() — пропустить шаг, GOC.goto(глава) — прыгнуть к главе (0..8)
window.GOC = {
  kill: () => { for (const e of ens.slice()) if (!e.dead) { e.hp = 0; kill(e, {}); } },
  auto: () => { if (fs || mode !== 'fight') return; const t = exitOpen() ? ents.find(o => o.k === 'portal') : objRoom ? { x: objRoom.cx, y: objRoom.cy } : null; if (t) { P.x = t.x; P.y = t.y; } },
  tp: (x, y) => { P.x = x; P.y = y; },
  goto: n => { S.ch = n; S.step = 0; startChapter(); },
  rich: () => { S.xp += 20000; S.tapes += 20; },
  god: () => { P.inv = 1e9; },
  all: () => { for (const w in WP) { S.wl[w] = 5; WP[w].skills.forEach(q => S.sk[q.id] = 1); } S.comp = 4; },
  tick: n => { for (let i = 0; i < n; i++) logic(1 / 60); render(); },
  lv: () => LV, ents: () => ents, interact: () => doInteract(),
  state: () => ({ mode, ch: S && S.ch, step: S && S.step, hp: P && P.hp, ens: ens.length, xp: S && S.xp, fs: !!fs, prompt, q: S && S.q, done: S && S.done, x: P && P.x, y: P && P.y }),
};
})();
