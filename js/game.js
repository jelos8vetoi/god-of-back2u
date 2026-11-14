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

function screenScale() { return Math.min(innerWidth / W, innerHeight / H); }
function fit() {
  $('stage').style.transform = `scale(${screenScale()})`;
  const ratio = Math.min(2, Math.max(1, screenScale() * (window.devicePixelRatio || 1)));
  C.width = Math.round(W * ratio);
  C.height = Math.round(H * ratio);
}
addEventListener('resize', fit); fit();

/* ================= ЗВУК ================= */
let AC = null, MG = null, NB = null, muted = false;
function audio() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); MG = AC.createGain(); MG.gain.value = .5 * OPT.vol; MG.connect(AC.destination); musicBus = AC.createGain(); musicDry = AC.createGain(); musicBus.connect(musicDry).connect(MG); if (mode === 'guide') guideMusic(true); } catch (e) { AC = null; }
}
let musicBus, musicDry, musicWet;
function guideMusic(open) {
  if (!AC) return;
  if (!musicWet) {
    const reverb = AC.createConvolver();
    const length = Math.ceil(AC.sampleRate * 2.2);
    const impulse = AC.createBuffer(2, length, AC.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const samples = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) samples[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
    }
    reverb.buffer = impulse;
    musicWet = AC.createGain();
    musicWet.gain.value = 0;
    musicBus.connect(reverb).connect(musicWet).connect(MG);
  }
  musicDry.gain.setTargetAtTime(open ? .2 : 1, AC.currentTime, .12);
  musicWet.gain.setTargetAtTime(open ? .75 : 0, AC.currentTime, .12);
}
function tone(f, d, type, v, f2, when, output = when == null ? MG : musicBus) {
  if (!AC || muted) return;
  const t = AC.currentTime + (when || 0), o = AC.createOscillator(), g = AC.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t + d);
  g.gain.setValueAtTime(v || .2, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
  o.connect(g); g.connect(output); o.start(t); o.stop(t + d + .02);
}
function noise(d, v, hp, when) {
  if (!AC || muted) return;
  if (!NB) { NB = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const a = NB.getChannelData(0); for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1; }
  const t = AC.currentTime + (when || 0), s = AC.createBufferSource(), g = AC.createGain(), f = AC.createBiquadFilter();
  s.buffer = NB; f.type = 'highpass'; f.frequency.value = hp || 1000;
  g.gain.setValueAtTime(v || .2, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
  s.connect(f); f.connect(g); g.connect(when == null ? MG : musicBus); s.start(t); s.stop(t + d + .02);
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
  buy: () => { tone(520, .08, 'square', .12); tone(780, .12, 'square', .12, 0, .08, MG); },
  adlib: () => { tone(440, .18, 'sawtooth', .22, 660); tone(880, .12, 'square', .1, 0, .1); },
  rage: () => { tone(60, .9, 'sawtooth', .4, 240); noise(.5, .2, 500); },
  pick: () => tone(880, .1, 'sine', .15, 1320),
};
const midi = n => 440 * Math.pow(2, (n - 69) / 12);
/* ---------- музыка: свой стиль у каждой локации ---------- */
const SC_MIN = [0, 2, 3, 5, 7, 8, 10], SC_PHR = [0, 1, 3, 5, 7, 8, 10], SC_DOR = [0, 2, 3, 5, 7, 9, 10], SC_HM = [0, 2, 3, 5, 7, 8, 11];
const MUS = [
  { n: 'Минус тридцать четыре', bpm: 94, root: 38, sc: SC_MIN, prog: [0, 5, 2, 6], lead: 'bell', k: [0, 7, 11], s: [8], hat: 4, bass: [0, 7, 11], slide: 1, dark: 1 },
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
const TOMSK_MELODY = {
  0: 4, 6: 6, 10: 9, 14: 6,
  16: 2, 22: 4, 28: 2,
  32: 2, 38: 5, 42: 4, 46: 2,
  48: 3, 54: 1, 60: 3
};
function mkMel(ch) {
  if (ch === 0) return Array.from({ length: 64 }, (_, i) => TOMSK_MELODY[i] ?? null);
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
  if (!FX) { const d = AC.createDelay(1), fb = AC.createGain(), w = AC.createGain(); d.delayTime.value = .28; fb.gain.value = .35; w.gain.value = .5; d.connect(fb); fb.connect(d); d.connect(w); w.connect(musicBus); FX = d; }
  return FX;
}
function voice(f, d, type, v, when, o) {
  if (!AC || muted) return; o = o || {};
  const t = AC.currentTime + when, os = AC.createOscillator(), g = AC.createGain(); os.type = type; os.frequency.setValueAtTime(f, t);
  if (o.f2) os.frequency.exponentialRampToValueAtTime(o.f2, t + d * .8); if (o.det) os.detune.value = o.det;
  g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(v, t + (o.att || .005)); g.gain.exponentialRampToValueAtTime(.001, t + d);
  let n = os;
  if (o.cut) { const fl = AC.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(o.cut, t); if (o.sweep) fl.frequency.exponentialRampToValueAtTime(o.sweep, t + d); os.connect(fl); n = fl; }
  n.connect(g); g.connect(musicBus); if (o.fx) g.connect(fxOut()); os.start(t); os.stop(t + d + .03);
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
let courierTrack = null, courierAssetTried = false, courierTrackURL = '', courierPlaying = false;
function syncCourierTrack() {
  const active = S?.ch === 0 && fs?.boss?.type === 'courier' && !fs.boss.dead && !fs.done;
  if (active && !courierTrack && !courierAssetTried) {
    courierAssetTried = true;
    setCourierTrack('assets/courier.mp3');
  }
  if (!courierTrack) return false;
  courierTrack.volume = muted ? 0 : OPT.vol * .6;
  if (!active || mode !== 'fight') {
    if (!courierTrack.paused) courierTrack.pause();
    if (!active && courierTrack.currentTime) courierTrack.currentTime = 0;
    courierPlaying = false;
    return false;
  }
  if (!courierPlaying) {
    courierPlaying = true;
    courierTrack.play().catch(() => {});
  }
  return !courierTrack.paused;
}
function music() {
  if (syncCourierTrack() || mode === 'dev') return;
  if (!AC || muted || !S || mode === 'menu' || mode === 'pause' || mode === 'settings' || mode === 'end') return;
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
let bt = 0, camYaw = -Math.PI / 2, camPit = .36, camD = 270, obs = [], fpsA = 60, qual = 2, qT = 0;
const lock = () => { try { if (document.pointerLockElement !== C && C.requestPointerLock) { const p = C.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } } catch (e) {} };
function inputDir() { const ix = (K[KM.right] ? 1 : 0) - (K[KM.left] ? 1 : 0), iy = (K[KM.up] ? 1 : 0) - (K[KM.down] ? 1 : 0), c = Math.cos(camYaw), s = Math.sin(camYaw); return [c * iy - s * ix, s * iy + c * ix]; }
function pushOut(o, r) { for (const b of obs) { const dx = o.x - b.x, dy = o.y - b.y, m = b.r + r, d2 = dx * dx + dy * dy; if (d2 < m * m && d2 > .01) { const d = Math.sqrt(d2); o.x = b.x + dx / d * m; o.y = b.y + dy / d * m; } } }

let OPT = { sens: 1, vol: 1, voice: .85, q: 'auto', fps: false }; try { Object.assign(OPT, JSON.parse(localStorage.getItem('goc_opts') || '{}')); } catch (e) {}
{ const qs = new URLSearchParams(location.search); if (['auto', 'lo', 'mid', 'hi'].includes(qs.get('q'))) OPT.q = qs.get('q'); if (qs.has('fps')) OPT.fps = qs.get('fps') === '1'; }
const KDEF = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', dodge: 'Space', sprint: 'ControlLeft', block: 'ShiftLeft', interact: 'KeyF', thr: 'KeyC', rune: 'KeyE', adlib: 'KeyQ', rage: 'KeyR', w1: 'Digit1', w2: 'Digit2', w3: 'Digit3', menu: 'Tab', full: 'F11', fps: 'F3', mute: 'KeyM' };
const KLAB = { up: 'Вперёд', down: 'Назад', left: 'Влево', right: 'Вправо', dodge: 'Перекат', sprint: 'Спринт', block: 'Блок / парирование', interact: 'Действие / добивание', thr: 'Бросок биты', rune: 'Руна оружия', adlib: 'Ад-либ кента', rage: 'Перегруз / ульта', w1: 'Бита', w2: 'Микрофон', w3: 'Сэмплер', menu: 'Прокачка', full: 'Полный экран', fps: 'Счётчик FPS', mute: 'Звук вкл/выкл' };
const KM = Object.assign({}, KDEF, OPT.keys || {});
let BIND = null, fsWant = new URLSearchParams(location.search).get('fs') === '1';
function KN(a) {
  const c = KM[a] || '', m = { Space: 'Пробел', ShiftLeft: 'Shift', ShiftRight: 'Shift (пр.)', ControlLeft: 'Ctrl', ControlRight: 'Ctrl (пр.)', AltLeft: 'Alt', AltRight: 'Alt (пр.)', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Backquote: '`', CapsLock: 'Caps', Enter: 'Enter', Backspace: '⌫', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\' };
  return m[c] || c.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Numpad/, 'Num ');
}
function toggleFS() { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); } catch (e) {} }
document.addEventListener('pointerdown', () => { if (fsWant) { fsWant = false; toggleFS(); } }, true);
let DYN = 1, upT = 0, fpsN = 60, shF = 0, VIG = null;
const saveOpt = () => { try { localStorage.setItem('goc_opts', JSON.stringify(OPT)); } catch (e) {} };
let tipQ = [], tipT = 0, waves = [], mdlTot = 0, mdlDone = 0, padPrev = [], padKeys = {}, stepT = 0;
function tip(id, text) { if (!S || !S.tips || S.tips[id]) return; S.tips[id] = 1; tipQ.push(text); }
let devSession = false, devGod = false, devFrom;
const save = () => { if (devSession) return; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } };
const sk = id => !!S.sk[id];
const BOONS = {
  crit: { n: 'Панчлайн', d: '12% шанс, что любой удар станет критом ×1.8.' }, vamp: { n: 'Ответка', d: 'Каждое парирование лечит 6% здоровья.' },
  open: { n: 'Разогрев', d: 'Каждый бой начинается с 40 СВЭГа.' }, boom: { n: 'Дроп', d: 'Добивание взрывается и бьёт всех вокруг.' },
  long: { n: 'Слоумо', d: 'Замедление после идеального переката длится в полтора раза дольше.' }, thick: { n: 'Толстый пуховик', d: '+30 к максимуму здоровья.' },
  chainq: { n: 'Бэк-вокал', d: 'Ад-либ кента бьёт по шести врагам вместо трёх.' }, fast: { n: 'Дабл-тайм', d: 'Все атаки на 15% быстрее.' },
  bounty: { n: 'Роялти', d: '+20% прослушиваний ▶ за врагов.' }, thorn: { n: 'Шипы', d: 'Заблокированный удар бьёт в ответ по атакующему.' } };
const MUTS = { haste: ['УСКОРЕННЫЙ ПИТЧ', 'враги быстрее на 30%'], glass: ['ПЕРЕГРУЗ', 'все бьют больнее: и ты, и по тебе'], blast: ['ВЗРЫВНОЙ ТИРАЖ', 'враги взрываются после смерти'], dark: ['БЛЭКАУТ', 'видно только рядом с собой'], rich: ['ЗОЛОТОЙ ЧАС', 'враги живучее, опыта в полтора раза больше'] };
const hb = id => !!(S && S.boons && S.boons.includes(id));
function offerBoon() {
  const pool = Object.keys(BOONS).filter(k => !S.boons.includes(k)); if (!pool.length) return;
  const pick = []; while (pick.length < 3 && pool.length) pick.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  $('boonList').innerHTML = pick.map(k => '<button data-b="' + k + '" style="width:300px;padding:22px 18px;text-align:left;text-transform:none;letter-spacing:0"><b style="display:block;font-size:20px;color:#ffd23b;letter-spacing:2px;margin-bottom:8px;text-transform:uppercase">' + BOONS[k].n + '</b><span style="font:400 14px/1.45 \'Segoe UI\',sans-serif;color:#d5dcea">' + BOONS[k].d + '</span></button>').join('');
  mode = 'boon'; show('boon', true); sfx.buy();
}
const has = id => !!(S.trk && S.trk.eq.includes(id));
const maxHp = () => 100 + 20 * S.st.hp + (S.hpB || 0) + (has('beanie') ? 25 : 0) + (hb('thick') ? 30 : 0);
const dmgMul = w => (1 + .08 * S.st.str) * (w ? 1 + .2 * (S.wl[w] - 1) : 1) * (P.rage > 0 ? 1.5 : 1) * (P.buff > 0 ? 1.3 : 1) * (has('tape') && P.hp < maxHp() * .3 ? 1.4 : 1);

function toast(msg, d) { const t = $('toast'); t.textContent = msg; t.style.display = 'block'; toastT = d || 3.5; }

function newGame(diff) {
  S = { ch: 0, step: 0, xp: 0, tapes: 0, wl: { bat: 1, mic: 0, vinyl: 0 }, sk: {}, st: { hp: 0, str: 0, swag: 0 }, comp: 0, diff, weapon: 'bat', q: {}, done: {}, hpB: 0, trk: { owned: {}, eq: [] } };
  begin();
}
function begin() {
  S.q = S.q || {}; S.done = S.done || {}; S.hpB = S.hpB || 0; S.trk = S.trk || { owned: {}, eq: [] }; S.tips = S.tips || {}; S.boons = S.boons || []; S.stat = S.stat || { t: 0, deaths: 0, kills: 0, fin: 0, parry: 0, style: 0 };
  P = { x: AW / 2, y: AH / 2, r: 17, hp: maxHp(), aim: 0, atk: null, acd: 0, combo: 0, lastAtk: -9, acount: 0, dodge: 0, dcd: 0, dvx: 0, dvy: 0, post: 0, inv: 0,
    block: false, blockT: 0, swag: 0, rage: 0, buff: 0, spin: 0, spinT: 0, qcd: 0, rcd: { bat: 0, mic: 0, vinyl: 0 } };
  comp.x = P.x - 40; comp.y = P.y + 30; shownTitle = -1;
  if (!T3) alert('3D-движок не загрузился: в папке js нет файла three.min.js.');
  ['menu', 'dead', 'pause', 'choice', 'end', 'up'].forEach(i => show(i, false));
  startChapter(); lock();
}

/* ================= ХОД СЮЖЕТА / ЛОКАЦИЯ ================= */
let LV = null, ents = [], objRoom = null, prompt = '', target = null;
const entranceSolids = [];
const inR = (r, x, y, m) => x >= r.x + m && x <= r.x + r.w - m && y >= r.y + m && y <= r.y + r.h - m;
function okPos(x, y, m) { for (const r of LV.rects) if (inR(r, x, y, m)) return true; return false; }
function actorCanStand(x, y, radius) {
  if (!okPos(x, y, radius)) return false;
  return S.ch !== 0 || !entranceSolids.some(b => b.min.y < 2 && b.max.y >= 60 &&
    Math.hypot(x - clamp(x, b.min.x, b.max.x), y - clamp(y, b.min.z, b.max.z)) < radius + 8);
}
const RX = (v, m) => clamp(v, fs.room.x + m, fs.room.x + fs.room.w - m), RY = (v, m) => clamp(v, fs.room.y + m, fs.room.y + fs.room.h - m);
const steps = () => CH[S.ch].steps;
const exitOpen = () => { const st = steps()[S.step]; return !st || st.t === 'shop'; };
const PROP_R = { snow: v => v < .4 ? 10 : v < .7 ? 26 : 34, basement: () => 30, neon: () => 20, swamp: v => v < .5 ? 24 : 12, glass: v => v < .6 ? 40 : 15, grave: () => 22, server: () => 32, chart: () => 24, core: () => 20 };
function makeDeco() {
  deco = []; obs = []; const k = CH[S.ch].th.deco;
  for (const r of LV.rooms) {
    if (S.ch === 0 && r.kind === 'start') continue;
    const big = r.kind === 'fight' || r.kind === 'boss', spots = [];
    for (let i = 0, n = Math.round(r.w * r.h / 110000); i < n; i++) deco.push({ x: rnd(r.x + 70, r.x + r.w - 70), y: rnd(r.y + 70, r.y + r.h - 70), s: rnd(.6, 1.3), v: Math.random(), k });
    if (tomskArch(r)) {
      for (const [dx, dy] of [[-230, -130], [35, 130], [230, -105]]) {
        const cover = { x: r.cx + dx, y: r.cy + dy, r: 59, s: 1, v: 0, k, solid: true, cover: true };
        deco.push(cover);
        obs.push(cover);
      }
      continue;
    }
    if (big) {
      for (let t = 0, n = r.kind === 'boss' ? 6 : 9; spots.length < n && t < 300; t++) {
        const x = rnd(r.x + 90, r.x + r.w - 90), y = rnd(r.y + 90, r.y + r.h - 90);
        if (Math.abs(x - r.cx) < 150 || Math.abs(y - r.cy) < 150 || (r.kind === 'boss' && Math.hypot(x - r.cx, y - r.cy) < 380) || spots.some(p => Math.hypot(p.x - x, p.y - y) < 170)) continue;
        spots.push({ x, y });
      }
    } else for (const dx of [-1, 1]) spots.push({ x: r.cx + dx * (r.w / 2 - 70), y: r.cy + r.h / 2 - 70 });
    for (const p of spots) { const v = Math.random(), tp = TPROPS[k], pd = tp ? tp[Math.floor(v * 97) % tp.length] : null, d = { x: p.x, y: p.y, s: 1, v, k, solid: 1, r: pd ? pd[2] : PROP_R[k](v), pd }; deco.push(d); obs.push(d); }
  }
}
function loadLevel() {
  entranceSolids.length = 0;
  LV = buildLevel(S.ch); ents = []; fs = null; ens = []; prj = []; haz = []; orbs = []; timers = []; bolts = []; rings = []; objRoom = null;
  if (S.ch === 0) {
    const r = LV.main[0];
    ents.push({ k: 'frontDoor', x: r.x + r.w - 14, y: r.cy, open: S.step > LV.main[1].step });
  }
  if (S.ch > 0) ents.push({ k: 'seva', x: LV.main[0].cx - 200, y: LV.main[0].cy - 160 });
  ents.push({ k: 'seva', x: LV.exit.cx - 170, y: LV.exit.cy - 130 }, { k: 'portal', x: LV.exit.cx + 90, y: LV.exit.cy + 30 });
  for (const r of LV.sides) {
    const s = r.side;
    if (s.power) {
      ents.push({ k: 'power', id: 'tomskPower', x: r.cx, y: r.y + 65, room: r });
    }
    if (s.npc) ents.push({ k: 'npc', id: s.npc, x: r.cx, y: r.cy - 130 });
    if (s.lore != null) ents.push({ k: 'lore', id: 'c' + S.ch + 'lore' + s.lore, i: s.lore, x: r.cx - 180, y: r.cy + 120 });
    if (s.chest) ents.push({ k: 'chest', id: s.id + 'c', loot: s.chest, x: r.cx + 180, y: r.cy + 110, room: r });
  }
  makeDeco();
  if (S.ch === 0) {
    const r = LV.main[0];
    for (const x of [r.x + 65, r.x + 155]) {
      for (let i = 0; i < 6; i++) obs.push({ x, y: r.y + 60 + i * 50, r: 55 });
    }
  }
  { const sc = LV.sec, s = sc.side, e = LV.exit, hz = s.d !== 'E', id = s.id;
    const o = { k: 'swall', id, hz, hp: 3, dead: !!S.done[id], x: s.d === 'E' ? e.x + e.w + 10 : e.cx, y: s.d === 'E' ? e.cy : s.d === 'N' ? e.y - 10 : e.y + e.h + 10 };
    ents.push(o); if (!o.dead) for (const t of [-76, 0, 76]) obs.push({ x: o.x + (hz ? t : 0), y: o.y + (hz ? 0 : t), r: 44, sw: o });
    ents.push({ k: 'chest', id: id + 'c', loot: [{ tapes: 1 }, { hp: 10 }, { xp: 500 + S.ch * 100 }][S.ch % 3], x: sc.cx, y: sc.cy, room: sc });
    [LV.main[1], LV.main[2]].forEach((r, i) => { if (!r) return; const c = (S.ch + i * 3) % 4; ents.push({ k: 'stash', id: 'c' + S.ch + 'st' + i, i, x: c % 2 ? r.x + r.w - 62 : r.x + 62, y: c < 2 ? r.y + 62 : r.y + r.h - 62 }); });
  }
  for (const r of LV.rooms) {
    if (r.side?.power) {
      const barrel = { k: 'brk', x: r.cx + 90, y: r.cy - 65, r: 20, ex: true, archBarrel: true };
      ents.push(barrel);
      obs.push(barrel);
    }
    if (tomskArch(r)) {
      for (const [dx, dy] of [[-355, 145], [5, -240], [340, 185]]) {
        const barrel = { k: 'brk', x: r.cx + dx, y: r.cy + dy, r: 20, ex: true, archBarrel: true };
        ents.push(barrel);
        obs.push(barrel);
      }
    }
    if (r.kind === 'boss') for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) obs.push({ x: r.cx + dx * (r.w / 2 - 80), y: r.cy + dy * (r.h / 2 - 80), r: 48 });
    if (r.kind === 'fight' || r.kind === 'boss') for (let i = 0, t = 0; i < 4 && t < 60; t++) {
      const x = rnd(r.x + 110, r.x + r.w - 110), y = rnd(r.y + 110, r.y + r.h - 110);
      if (Math.hypot(x - r.cx, y - r.cy) < 190 || obs.some(b => Math.hypot(b.x - x, b.y - y) < b.r + 70)) continue;
      const o = { k: 'brk', x, y, r: 20, ex: S.ch >= 1 && i === 0 }; ents.push(o); obs.push(o); i++;
    }
    const s = r.side;
    if (s && s.chest && !s.guard) {
      const ch = ents.find(o => o.k === 'chest' && o.room === r); ch.lock = s.id + 't';
      for (let i = -1; i <= 1; i++) {
        const hz = s.d === 'N' || s.d === 'S', sg = s.d === 'N' || s.d === 'W' ? -1 : 1, id = s.id + 't' + i;
        const x = hz ? r.cx + i * 170 : (sg < 0 ? r.x - 30 : r.x + r.w + 30), y = hz ? (sg < 0 ? r.y - 30 : r.y + r.h + 30) : r.cy + i * 170;
        ents.push({ k: 'tgt', id, room: r, x, y, vx: hz ? x : x - sg * 44, vy: hz ? y - sg * 44 : y, ry: hz ? (sg < 0 ? 0 : Math.PI) : (sg < 0 ? Math.PI / 2 : -Math.PI / 2), dead: !!S.done[id] });
      }
    }
  }
  let cp = LV.main[0]; for (let i = 0; i < S.step; i++) if (LV.stepRoom[i]) cp = LV.stepRoom[i];
  P.x = cp.cx; P.y = cp.cy + 40; P.thr = null; P.throwCooldown = 0; P.fin = null; P.chg = 0; P.atk = null; banners = []; hfx = []; marks = []; cine = null; P.dodge = 0; P.inv = 0; P.spin = 0; slowmo = 0; hitstop = 0; comp.x = P.x - 40; comp.y = P.y + 30;
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
function secretCheck() {
  const p = 'c' + S.ch; if (S.done[p + 'all'] || !(S.done[p + 'sec'] && S.done[p + 'st0'] && (S.done[p + 'st1'] || !LV.main[2]))) return;
  S.done[p + 'all'] = 1; S.tapes++; timers.push({ t: 2.5, f: () => toast('✨ Все секреты главы найдены:  +1 ▣ мастер-лента', 4.5) });
}
function hitWall(o, heavy) {
  if (o.dead) return;
  if (!heavy) { if (!(o.wT > T)) { o.wT = T + 1.5; float(o.x, o.y - 60, 'нужен тяжёлый удар', '#c9a36b'); } noise(.06, .12, 600); return; }
  if (o.hT > T) return; o.hT = T + .25; o.hp--; burst(o.x, o.y, '#9a9a9a', 16); sfx.hit(true); shake = Math.max(shake, 8);
  if (o.hp <= 0) { o.dead = true; S.done[o.id] = 1; obs = obs.filter(b => b.sw !== o); sfx.boom(); ring(o.x, o.y, 160, '#ffd23b'); toast('✨ СЕКРЕТ НАЙДЕН — тайная комната открыта', 4); secretCheck(); save(); }
}
function breakIt(o) {
  if (o.dead) return; o.dead = true; obs = obs.filter(b => b !== o); burst(o.x, o.y, o.ex ? '#ff5a2a' : '#c9a36b', 16); sfx.hit(true);
  if (!o.ex) { S.xp += 8; float(o.x, o.y - 30, '+8 ▶', '#7dff7d'); if (Math.random() < .4) orbs.push({ x: o.x, y: o.y, l: 12 }); return; }
  ring(o.x, o.y, 170, '#ff5a2a'); sfx.boom(); shake = Math.max(shake, 14); flash = Math.max(flash, .12);
  timers.push({ t: .04, f: () => {
    const damage = o.archBarrel ? 95 : 70 * (1 + S.ch * .2);
    for (const q of ens) if (!q.dead && dist(q, o) < 170 + q.r) dmgE(q, damage, { kb: 420, stun: .7, heavy: true });
    if (dist(P, o) < 150) hurtP(16, null, true);
    for (const q of ents) if (q.k === 'brk' && !q.dead && dist(q, o) < 180) breakIt(q);
  } });
}
function hitProps(x, y, r, byPlayer) {
  let hit = false;
  for (const o of ents) {
    if (o.dead) continue;
    if (o.k === 'brk' && Math.hypot(o.x - x, o.y - y) < o.r + r) { breakIt(o); hit = true; }
    else if (o.k === 'swall' && byPlayer && Math.hypot(o.x - x, o.y - y) < 70 + r) { hitWall(o, true); hit = true; }
    else if (o.k === 'tgt' && byPlayer && Math.hypot(o.x - x, o.y - y) < 46 + r) {
      o.dead = true; S.done[o.id] = 1; hit = true; burst(o.vx, o.vy, '#ffd23b', 18); sfx.parry();
      const left = ents.filter(q => q.k === 'tgt' && q.room === o.room && !q.dead).length;
      if (left) toast('🎯 Мишень сбита — осталось ' + left, 2); else { S.done[o.room.side.id + 't'] = 1; toast('🔓 Замок снят — сундук открыт', 3.5); sfx.buy(); }
      save();
    }
  }
  return hit;
}
function startEnc(room, waves, bossId, cb) {
  fs = { room, waves, i: 0, boss: null, done: false, clearT: 0, cb }; ens = []; prj = []; haz = [];
  if (!bossId && room.kind === 'fight' && S.ch >= 1 && Math.random() < .55) fs.mut = Object.keys(MUTS)[Math.floor(Math.random() * 5)];
  if (tomskOpening(room)) fs.training = true;
  if (tomskArch(room)) {
    fs.arch = true;
    fs.surv = 60;
    fs.spT = 6;
    toast('Продержись минуту · укрывайся от залпов за бетонными блоками', 5);
    tip('archBarrel', 'Подведи ботов к красной бочке и взорви её броском биты [' + KN('thr') + ']. Вблизи взрыв заденет и тебя.');
  }
  if (fs.training) openTomskGuide();
  else if (bossId) spawnBoss(bossId); else spawnWave();
  sfx.boom(); shake = 8; waves = []; if (hb('open')) P.swag = Math.max(P.swag, 40);
  if (fs.mut) banner(MUTS[fs.mut][0], 'мутатор: ' + MUTS[fs.mut][1] + ' · опыта больше', '#ff5cc8');
  if (!tomskOpening(room)) tip('atk', 'ЛКМ — серия ударов, третий в серии сильнее. ПКМ — тяжёлый удар; держи ПКМ, чтобы зарядить его.');
  if (!tomskOpening(room)) tip('def', 'ПРОБЕЛ — перекат сквозь удар: в последний момент он замедляет время. SHIFT вовремя — парирование.');
  if (S.step > 1) tip('thr', 'C — бросить биту, ещё раз C — вернуть её. Бита бьёт всех на пути туда и обратно.');
  if (bossId) tip('boss', 'У босса полоса разделена на фазы — в каждой новые атаки. Красный блик над врагом: атаку не отбить, уходи перекатом.');
  if (room.kind === 'fight' && S.ch >= 1) { fs.traps = []; for (let t = 0; fs.traps.length < 3 && t < 40; t++) { const x = rnd(room.x + 150, room.x + room.w - 150), y = rnd(room.y + 150, room.y + room.h - 150); if (Math.hypot(x - room.cx, y - room.cy) > 220 && !fs.traps.some(q => Math.hypot(q.x - x, q.y - y) < 260)) fs.traps.push({ x, y }); } fs.trT = 4; }
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
      if (st.o.weapon) { S.wl[st.o.weapon] = Math.max(1, S.wl[st.o.weapon]); S.weapon = st.o.weapon; tip('rc_' + st.o.weapon, st.o.weapon === 'mic' ? 'Оружие выгодно чередовать [1][2][3]. Микрофон вешает ШОК — ударь шокированного битой и получишь ВЗРЫВ НИЗОВ по площади.' : 'Диски вешают ПИТЧ — замедление. Бита по замедленному даёт РАСКОЛ, микрофон — ЗАМЫКАНИЕ. Диск по шокированному — ИСКРА.'); }
      if (st.o.tapes) S.tapes += st.o.tapes;
      if (st.o.comp) { S.comp = Math.max(S.comp, st.o.comp); tip('q', 'Q — ад-либ madk1d: оглушает ближайших врагов. Кент ещё и сам стреляет нотами и один раз за главу поднимет тебя после смертельного удара.'); }
      toast(st.msg, 4.5); sfx.buy(); S.step++; save(); break;
    case 'fight': case 'boss': {
      const r = LV.stepRoom[S.step]; objRoom = r;
      if (inR(r, P.x, P.y, 110)) {
        startEnc(r, st.t === 'boss' ? null : st.w, st.t === 'boss' ? st.id : null, () => { S.step++; save(); if (st.t === 'boss' && S.ch < CH.length - 1) offerBoon(); });
        if (st.t === 'fight' && !fs.arch && steps().slice(0, S.step).filter(q => q.t === 'fight').length === 1) { fs.surv = 45; fs.pool = st.w.flat().map(q => q[0]); toast('⏱ ВЫЖИВИ 45 секунд — враги идут без остановки', 4); }
      }
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
  for (const e of ens) if (e.fin && !e.dead) { const d = dist(e, P) - e.r; if (d < best) { best = d; target = { fin: e }; prompt = '[' + KN('interact') + ']  ДОБИТЬ'; } }
  if (fs) return;
  for (const r of LV.sides) {
    const s = r.side;
    if (s.guard && !S.done[s.id] && inR(r, P.x, P.y, 110)) { startEnc(r, s.guard, null, () => { S.done[s.id] = 1; toast(s.power ? 'Щиток доступен' : 'Тупик зачищен', 2.5); save(); }); return; }
  }
  for (const o of ents) {
    if (o.k === 'tgt' || o.k === 'brk') continue;
    const d = dist(o, P);
    if (o.k === 'swall') { if (!o.dead && d < 170) prompt = 'Завал звучит пусто…  Разбей тяжёлым ударом [ПКМ] или броском биты [' + KN('thr') + ']'; continue; }
    if (o.k === 'lore') { if (!S.done[o.id] && d < 44) { S.done[o.id] = 1; S.xp += 60; toast('📼  ' + LORE[S.ch][o.i], 9); sfx.pick(); save(); } }
    else if (o.k === 'portal') {
      if (d < 58) { if (exitOpen()) { nextChapter(); return; } if (!(o.w > T)) { o.w = T + 3; toast('Портал закрыт: сначала разберись с этим сервером', 2.5); } }
    } else if (d < 95) {
      if (o.k === 'chest') { if (S.done[o.id] || (o.room.side.guard && !S.done[o.room.side.id])) continue; if (o.lock && !S.done[o.lock]) { prompt = '🔒  Сбей 3 мишени 🎯 на стене: бросок биты [' + KN('thr') + '] или диски'; continue; } prompt = '[' + KN('interact') + ']  Открыть сундук'; }
      else if (o.k === 'stash') { if (S.done[o.id] || d > 70) continue; prompt = '[' + KN('interact') + ']  ✨ Тайник'; }
      else if (o.k === 'frontDoor') {
        if (o.open) continue;
        prompt = '[' + KN('interact') + ']  Открыть дверь во двор';
      }
      else if (o.k === 'power') {
        if (S.done[o.id] || !S.done[o.room.side.id]) continue;
        prompt = '[' + KN('interact') + ']  Включить фонари у арки';
      }
      else if (o.k === 'npc') prompt = '[' + KN('interact') + ']  Поговорить: ' + NPCS[o.id].n;
      else prompt = '[' + KN('interact') + ']  Дядя Сева на связи — мастерская';
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
const FINC = [[['b1', .28], ['b3', .44]], [['p1', .2], ['p2', .2], ['kick', .36]], [['m3', .26], ['mh', .5]], [['kick', .28], ['bh', .5]], [['m1', .24], ['m2', .24], ['v1', .36]]];
const FIN = { bat: [['kick', .34], ['bh', .64]], mic: [['m3', .3], ['mh', .62]], vinyl: [['p1', .26], ['kick', .3], ['v1', .46]], fist: [['p1', .22], ['p2', .22], ['kick', .42]] };
function doFinish(e, chain) {
  if (P.fin || tomskDrillPending()) return;
  if (chain) { const n = 8; for (let i = 0; i <= n; i++) burst(P.x + (e.x - P.x) * i / n, P.y + (e.y - P.y) * i / n, '#ffe14a', 2); }
  const a = chain ? ang(e, P) + rnd(-.9, .9) : ang(e, P); P.x = e.x + Math.cos(a) * (e.r + P.r + 16); P.y = e.y + Math.sin(a) * (e.r + P.r + 16);
  if (fs) { P.x = RX(P.x, P.r); P.y = RY(P.y, P.r); }
  const seq = chain ? FINC[(chain - 1) % FINC.length] : FIN[S.weapon === 'bat' && P.thr ? 'fist' : S.weapon];
  P.fin = { chain: chain || 0, e, seq, i: 0, t: 0, el: 0, hit: false, n: (P.finN = (P.finN || 0) + 1), tot: seq.reduce((s, q) => s + q[1], 0) };
  P.atk = null; P.chg = 0; P.dodge = 0; P.aim = a + Math.PI; e.stun = Math.max(e.stun, 3);
  float(e.x, e.y - e.r - 40, chain ? 'СЕРИЯ ×' + (chain + 1) : 'ДОБИВАНИЕ', '#ffe14a', 1); sfx.swing();
}
function finKill(e) {
  shake = 20; flash = .25; sfx.boom(); sfx.hit(true); hitstop = .09; styleAdd(.6); S.stat.fin++;
  if (hb('boom')) { ring(e.x, e.y, 150, '#ffe14a'); const ad = 60 * dmgMul(); timers.push({ t: .02, f: () => { for (const q of ens) if (q !== e && !q.dead && dist(q, e) < 150 + q.r) dmgE(q, ad, { kb: 300 }); } }); } burst(e.x, e.y, '#ffe14a', 46); ring(e.x, e.y, 160, '#ffe14a');
  P.hp = Math.min(maxHp(), P.hp + maxHp() * (has('pin') ? .06 : .03) * (P.fin && P.fin.chain ? .3 : 1)); P.swag = Math.min(100, P.swag + (P.fin && P.fin.chain ? 5 : 15));
  e.fin = false; e.sm = 0;
  if (e.boss) { e.stun = .6; dmgE(e, e.maxhp * .08, { heavy: true }); e.sm = 0; }
  else { e.xp = Math.round(e.xp * 1.5); e.hp = 0; const an = ang(P, e); e.kx = Math.cos(an) * 300; e.ky = Math.sin(an) * 300; kill(e, {}); }
}
function updFin(dt) {
  const f = P.fin, e = f.e; f.t += dt; f.el += dt; P.inv = Math.max(P.inv, .35); slowmo = Math.max(slowmo, .1);
  if (e.dead && !f.hit) { P.fin = null; return; }
  if (!e.dead) { e.stun = Math.max(e.stun, .5); P.aim = ang(P, e); }
  const last = f.i === f.seq.length - 1, dur = f.seq[f.i][1];
  if (!f.hit && f.t >= dur * .55) {
    f.hit = true;
    if (last) finKill(e); else { burst(e.x, e.y, '#ffffff', 10); shake = Math.max(shake, 7); sfx.hit(false); hitstop = .05; e.fl = .12; float(e.x, e.y - e.r - 12, 'БАМ', '#fff'); }
  }
  for (const q of ens) if (q.fin && !q.dead) q.stun = Math.max(q.stun, 1.2);
  if (f.t >= dur) {
    if (!last) { f.i++; f.t = 0; f.hit = false; return; }
    P.fin = null;
    const nx = ens.filter(q => q.fin && !q.dead && q.spawn <= 0 && dist(q, P) < 560).sort((p, q) => dist(p, P) - dist(q, P))[0];
    if (nx && f.chain < 3) doFinish(nx, f.chain + 1);
  }
}
function doInteract() {
  if (!target || P.fin) return;
  if (target.fin) { doFinish(target.fin); return; }
  const o = target.o;
  if (o.k === 'chest') { S.done[o.id] = 1; reward(o.loot, 'Сундук'); }
  else if (o.k === 'stash') { S.done[o.id] = 1; reward({ xp: 80 + S.ch * 25, hp: o.i ? 0 : 5 }, '✨ Тайник'); secretCheck(); save(); }
  else if (o.k === 'frontDoor') {
    o.open = true;
    sfx.block();
  }
  else if (o.k === 'power') {
    S.done[o.id] = 1;
    toast('Фонари у арки включены · свет покажет, откуда идут боты', 5);
    sfx.buy();
    save();
  }
  else if (o.k === 'npc') talk(o);
  else { P.hp = maxHp(); openUp(true); }
}

/* ---------- диалоги ---------- */
let dq = [], di = 0, dch = 0, dfull = '', dlgCb = null;
const DIALOG_SKIP_SECONDS = 1;
let dialogHold = null;
function resetDialogHold() {
  dialogHold = null;
  $('dialogSkipFill').style.strokeDashoffset = 100;
}
// Each speaker has a base pitch and oscillator waveform.
const VOICE_PROFILES = {
  N: [430, 'sine'], V: [145, 'triangle'], M: [480, 'square'], MV: [310, 'triangle'],
  K: [390, 'square'], S: [125, 'sine'],
  B1: [165, 'triangle'], B2: [110, 'sawtooth'], B3: [520, 'triangle'],
  B4: [285, 'square'], B5: [215, 'triangle'], B6: [135, 'square'],
  B7: [330, 'sawtooth'], B8: [175, 'sine'], B9: [95, 'sawtooth']
};
let dialogueSpeaker = 'N', lastDialogueBlip = -Infinity;
const voiceNotes = new Set();
function stopVoice() {
  for (const note of voiceNotes) {
    note.disconnect();
    note.stop();
  }
  voiceNotes.clear();
}
function voiceBlip(speaker, char, offset = 0) {
  if (!AC || muted || !OPT.vol || !OPT.voice) return;
  const [base, wave] = VOICE_PROFILES[speaker] || [270, 'triangle'];
  const pitch = base * (1 + ((char.codePointAt(0) % 7) - 3) * .045);
  const time = AC.currentTime + offset;
  const note = AC.createOscillator(), gain = AC.createGain();
  note.type = wave;
  note.frequency.setValueAtTime(pitch, time);
  note.frequency.exponentialRampToValueAtTime(pitch * .78, time + .045);
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(OPT.voice * (wave === 'square' || wave === 'sawtooth' ? .09 : .16), time + .006);
  gain.gain.exponentialRampToValueAtTime(.001, time + .052);
  note.connect(gain).connect(MG);
  voiceNotes.add(note);
  note.onended = () => { voiceNotes.delete(note); note.disconnect(); gain.disconnect(); };
  note.start(time);
  note.stop(time + .055);
}
function dialogueBlip(chunk) {
  const char = chunk.match(/[\p{L}\p{N}]/u)?.[0];
  if (!char || !AC || AC.currentTime - lastDialogueBlip < .045) return;
  lastDialogueBlip = AC.currentTime;
  voiceBlip(dialogueSpeaker, char);
}
function bossSpeech(e, text) {
  if (!text) return;
  e.say = text;
  e.sayT = 2.4;
  e.lastVoiceAt = T;
  stopVoice();
  const syllables = text.match(/[\p{L}\p{N}]/gu) || [];
  syllables.slice(0, 7).forEach((char, i) => voiceBlip('B' + (S.ch + 1), char, i * .064));
}
const BOSS_ATTACK_LINES = {
  slam: 'Под ногами!', leap: 'Сверху!', charge: 'С дороги!',
  fan: 'Лови залп!', mines: 'Следи за шагом!', shock: 'Лови волну!',
  burst: 'Залп!', rain: 'Смотри вверх!', beam: 'Луч пошёл!',
  spiral: 'Не стой на месте!', summon: 'Все сюда!', tp: 'Ищи меня!',
  homing: 'Догонит!', wall: 'Проход закрыт!'
};
function startDlg(lines, cb) { resetDialogHold(); mode = 'dlg'; dq = lines; di = 0; dlgCb = cb; show('dlg', true); showLine(); }
function showLine() {
  const i = dq[di].indexOf('|'), k = dq[di].slice(0, i), s = SPK[k];
  dfull = dq[di].slice(i + 1); dch = 0;
  stopVoice(); dialogueSpeaker = k; lastDialogueBlip = -Infinity;
  $('dname').textContent = s.n; $('dname').style.color = s.c; $('dlg').style.borderLeftColor = s.c;
  $('dtext').className = k === 'M' ? 'msg' : k === 'N' ? 'nar' : ''; $('dtext').textContent = '';
  if (k === 'MV') { sfx.adlib(); shake = 6; }
}
function advDlg() {
  if (mode !== 'dlg') return;
  if (dch < dfull.length) { stopVoice(); dch = dfull.length; $('dtext').textContent = dfull; return; }
  di++; sfx.ui();
  if (di >= dq.length) endDlg(); else showLine();
}
function endDlg() { stopVoice(); resetDialogHold(); show('dlg', false); const cb = dlgCb; dlgCb = null; mode = 'fight'; if (cb) cb(); }

/* ---------- концовки ---------- */
function ending(a) {
  show('choice', false); S.ending = a ? 'A' : 'B'; save();
  startDlg(a ? ENDING_A : ENDING_B, () => {
    mode = 'end'; $('endT').textContent = a ? 'BACK 2 U' : 'ПРОЧИТАНО';
    { const st = S.stat, dk = Object.keys(S.done), sec = dk.filter(q => /sec$|st\d$/.test(q)).length, lore = dk.filter(q => /lore\d$/.test(q)).length, qs = Object.values(S.q).filter(q => q.st === 3).length, mm = Math.floor(st.t / 60), ss = String(Math.floor(st.t % 60)).padStart(2, '0');
      const score = Math.max(0, 40 + sec * 1.2 + lore * 1 + qs * 1.4 + Math.min(14, st.fin * .15) + Math.min(8, st.parry * .2) - st.deaths * 2.5 + (a ? 6 : 0)), gr = score >= 96 ? 'ЛЕГЕНДА' : score >= 84 ? 'БРИЛЛИАНТ' : score >= 70 ? 'ПЛАТИНА' : score >= 56 ? 'ЗОЛОТО' : score >= 44 ? 'СИНГЛ' : 'ДЕМКА';
      $('endStats').innerHTML = '<b style="font-size:26px;color:#ffd23b;letter-spacing:4px">СЕРТИФИКАЦИЯ: ' + gr + '</b><br>' + [['Время', mm + ':' + ss], ['Убито', st.kills], ['Смертей', st.deaths], ['Добиваний', st.fin], ['Парирований', st.parry], ['Секреты', sec + ' / 26'], ['Кассеты', lore + ' / 18'], ['Услуги', qs + ' / 15'], ['Лучший стиль', ['D', 'C', 'B', 'A', 'S', 'SS', 'SSS'][Math.min(6, Math.floor(st.style))]], ['Круг', 'NG+' + (S.ng || 0)]].map(q => '<span style="display:inline-block;width:170px;margin:5px 8px;text-align:left;color:#9fb0c8">' + q[0] + ' <b style="color:#fff;float:right">' + q[1] + '</b></span>').join(''); }
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
  const d = EN[type], ng = S.ng || 0, late = Math.max(0, S.ch - 4), sc = (1 + S.ch * .5 + late * .5) * (1 + ng * .6);
  const tomskBot = type === 'bot' && S.ch === 0 && !tomskDrillPending();
  const hp = (tomskBot ? [d.hp, 88, 108][S.diff] ?? d.hp : d.hp) * sc;
  return { type, d, ai: d.ai, x, y, r: d.r, hp, maxhp: hp, dmg: d.dmg * (1 + S.ch * .3 + late * .18) * (1 + ng * .35), spd: d.spd * rnd(.9, 1.1) * (1 + S.ch * .02) * (fs && fs.mut === 'haste' ? 1.3 : 1), c: d.c,
    state: 'idle', t: 0, cdT: rnd(.6, 2), aa: 0, kx: 0, ky: 0, stun: 0, slow: 0, spawn: .7, fl: 0, xp: Math.round(d.xp * .42 * (1 + S.ch * .15)), rng: d.rng || 50 };
}
function spawnWave() {
  if (fs.room.side?.power) {
    const { cx, cy } = fs.room;
    const guard = mkEnemy('hater', cx + 24, cy - 100);
    guard.guardPost = true;
    ens.push(guard);
    return;
  }
  if (fs.arch) {
    const { cx, cy } = fs.room;
    ens.push(mkEnemy('bot', cx - 55, cy - 175), mkEnemy('bot', cx + 85, cy + 55));
    const hater = mkEnemy('hater', cx + 375, cy - 20);
    hater.guardPost = true;
    ens.push(hater);
    return;
  }
  if (S.ch >= 2 && fs.room.kind === 'fight') for (let i = 0, N = 1 + (S.ch / 3 | 0); i < N; i++) { const p = edgePos(); ens.push(mkEnemy('mod', p.x, p.y)); tip('mod', 'Модератор со щитом блокирует лёгкие удары спереди. Сломай щит тяжёлым ударом [ПКМ] или броском биты.'); }
  for (const [type, n, el] of fs.waves[fs.i]) {
    const N = el || fs.training ? n : Math.ceil(n * (EN[type].ai === 'ranged' ? 2 : 1.6));
    for (let i = 0; i < N; i++) { const p = edgePos(), m = mkEnemy(type, p.x, p.y); if (el) { m.hp = m.maxhp = m.hp * 2.6; m.dmg *= 1.3; m.r *= 1.3; m.xp *= 4; m.el = 1; } ens.push(m); }
  }
}
function spawnBoss(id) {
  const d = BOSS[id];
  const b = { type: id, d, boss: true, ai: 'boss', x: fs.room.cx, y: fs.room.cy - fs.room.h * .3, r: d.r, hp: d.hp * 1.3 * (1 + S.ch * .3 + Math.max(0, S.ch - 4) * .4), maxhp: d.hp * 1.3 * (1 + S.ch * .3 + Math.max(0, S.ch - 4) * .4), dmg: d.dmg * 1.12 * (1 + S.ch * .1 + Math.max(0, S.ch - 4) * .08), spd: d.spd, c: d.c,
    state: 'idle', t: 0, cdT: 1.6, aa: 0, kx: 0, ky: 0, stun: 0, slow: 0, spawn: 1.2, fl: 0, xp: Math.round(d.xp * .6), ph: 0, mv: '', last: '', spiral: null, say: '', sayT: 0, tx: 0, ty: 0 };
  if (S.ng) { b.hp = b.maxhp = b.hp * (1 + S.ng * .6); b.dmg *= 1 + S.ng * .35; }
  if (id === 'courier') {
    b.hp *= [1, 1.55, 1.8][S.diff] ?? 1.55;
    b.maxhp = b.hp;
  }
  ens.push(b); fs.boss = b; cine = { t: 0, dur: 3, e: b };
}

/* ================= БОЙ: ИГРОК ================= */
function tryAtk(heavy, c) {
  if (P.atk || P.acd > 0 || P.dodge > 0 || P.spin > 0) return;
  const w = S.weapon;
  if (w === 'bat' && P.thr) {
    if (heavy) doThrow();
    return;
  }
  const d = WP[w][heavy ? 'heavy' : 'light'];
  if (!heavy) P.combo = (T - P.lastAtk < .8) ? P.combo + 1 : 1; else P.combo = 0;
  P.lastAtk = T; P.acount++;
  const full = heavy && c >= .95, sw = P.swT > 0, crit = P.crit > 0;
  P.atk = { w, d, heavy, c: c || 0, full, sw, crit, t: 0, wind: d.wind * (hb('fast') ? .85 : 1), dur: d.dur * (hb('fast') ? .85 : 1), cd: d.cd, done: false, a: aimAssist(w), combo: P.combo, post: P.post > 0, n: P.acount };
  if (sw) { P.swT = 0; float(P.x, P.y - 48, 'СВИТЧ', WP[w].col); }
  if (crit) P.crit = 0;
  if (full) { float(P.x, P.y - 62, 'ПОЛНЫЙ ЗАРЯД', '#ffffff', 1); shake = Math.max(shake, 6); }
  P.post = 0; sfx.swing();
  if (w !== 'vinyl') { P.lv = heavy ? 330 : P.combo % 3 === 0 ? 400 : 230; P.lt = heavy ? .14 : .1; P.la = P.atk.a; }
}
function aimAssist(w) {
  const rg = w === 'vinyl' ? 650 : 250; let best = null, bs = .75;
  for (const e of ens) { if (e.dead || e.spawn > 0) continue; const d = dist(e, P); if (d > rg + e.r) continue; const df = adiff(ang(P, e), P.aim) + d / 2500; if (df < bs) { bs = df; best = e; } }
  return best ? ang(P, best) : P.aim;
}
function doThrow() {
  if (P.thr) { if (P.thr.st !== 'back') { P.thr.st = 'back'; sfx.swing(); } return; }
  if (S.weapon !== 'bat' || P.atk || P.dodge > 0 || P.throwCooldown > 0) return;
  P.thr = { x: P.x, y: P.y, a: aimAssist('vinyl'), st: 'out', t: .5, hit: new Set(), rot: 0 }; P.chg = 0; sfx.swing(); float(P.x, P.y - 50, 'БРОСОК', '#ff5a2a');
}
function updThrow(dt) {
  if (P.throwCooldown > 0) P.throwCooldown = Math.max(0, P.throwCooldown - dt);
  const b = P.thr; if (!b) return; b.rot += dt * 26;
  if (b.st !== 'stuck') hitProps(b.x, b.y, 22, true);
  if (b.st === 'out') { b.x += Math.cos(b.a) * 980 * dt; b.y += Math.sin(b.a) * 980 * dt; b.t -= dt; if (b.t <= 0 || !(fs ? inR(fs.room, b.x, b.y, 12) : okPos(b.x, b.y, 12)) || obs.some(o => (o.x - b.x) ** 2 + (o.y - b.y) ** 2 < o.r * o.r)) { b.st = 'stuck'; b.t = 3; } }
  else if (b.st === 'stuck') { b.t -= dt; if (b.t <= 0) b.st = 'back'; }
  else {
    const a = ang(b, P), step = Math.min(1300 * dt, dist(b, P));
    b.x += Math.cos(a) * step; b.y += Math.sin(a) * step;
    if (dist(b, P) < 36) {
      P.thr = null;
      P.throwCooldown = 1.2;
      if (b.hitEnemy) { completeTomskDrill('throw'); P.swag = Math.min(100, P.swag + 4); }
      sfx.block();
      return;
    }
  }
  if (b.st === 'stuck') return;
  const returning = b.st === 'back';
  const dmg = WP.bat.heavy.dmg * dmgMul('bat') * (returning ? .25 : .45);
  for (const e of ens) {
    if (e.dead || e.spawn > 0 || b.hit.has(e) || dist(e, b) >= e.r + 24) continue;
    b.hit.add(e);
    b.hitEnemy = true;
    dmgE(e, dmg, { w: 'bat', kb: returning ? 40 : 85 });
    sfx.hit(false);
  }
}
function swW(w) { if (!S.wl[w] || S.weapon === w) return; S.weapon = w; P.atk = null; P.chg = 0; P.swT = 1.2; }
function react(e, dmg, o) {
  const rm = has('ring') ? 1.5 : 1, tx = (s, c) => { float(e.x, e.y - e.r - 46, s, c, 1); styleAdd(.45); flashAt(e.x, e.y, c, 2.4); };
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
  if (a.crit && !em) { base *= 1.6; float(P.x, P.y - 76, 'КРИТ ×1.6', '#ffffff', 1); }
  else if (!em && hb('crit') && Math.random() < .12) { base *= 1.8; float(P.x, P.y - 76, 'ПАНЧЛАЙН', '#ffd23b', 1); }
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
  for (const o of ents) { if (o.dead) continue; if (o.k === 'brk' && dist(o, P) <= range + o.r && (arc >= TAU || adiff(ang(P, o), a.a) <= arc / 2)) breakIt(o); else if (o.k === 'swall' && dist(o, P) <= range + 70 && (arc >= TAU || adiff(ang(P, o), a.a) <= arc / 2 + .4)) hitWall(o, a.heavy || fin3); }
  if (hit.length && w === 'bat') {
    if (a.heavy) completeTomskDrill('heavy');
    else completeTomskDrill('light');
  }
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
  const courierGuard = e.type === 'courier' && e.state !== 'rec' && e.stun <= 0;
  if (courierGuard && o.w === 'bat') dmg *= .3;
  if (e.d.shield && o.w && !(e.brk > 0) && e.stun <= 0 && e.state !== 'rec' && e.state !== 'wind') {
    if (o.heavy) { e.brk = 4; e.stun = 1.3; float(e.x, e.y - e.r - 30, 'ЩИТ СЛОМАН', '#7fa8ff', 1); sfx.parry(); }
    else { float(e.x, e.y - e.r - 10, 'БЛОК', '#7fa8ff'); noise(.05, .12, 2500); e.sm = (e.sm || 0) + .04; return; }
  }
  if (fs && fs.mut === 'glass') dmg *= 1.5; else if (fs && fs.mut === 'rich' && !e.boss) dmg *= .77;
  if (o.w) { dmg = react(e, dmg, o); P.hits = (P.hitT > 0 ? P.hits || 0 : 0) + 1; P.hitT = 2.4; styleAdd(o.w !== P.lastW ? .22 : .07); P.lastW = o.w; if (o.heavy) flashAt(e.x, e.y, WP[o.w].col, 1.6); }
  if (o.w === 'bat' && e.stun > 0 && sk('b4')) dmg *= 1.5;
  e.hp -= dmg; e.fl = .1;
  if (tomskDrillPending()) e.hp = Math.max(1, e.hp);
  if (!courierGuard) e.sm = (e.sm || 0) + dmg / e.maxhp * (o.heavy ? .45 : .8) * (e.boss ? 2 : 1) + (o.sm || 0);
  if (e.sm >= 1 && !e.fin && e.hp > 0 && !tomskDrillPending()) { e.fin = true; e.stun = Math.max(e.stun, e.boss ? 2.5 : 4.5); float(e.x, e.y - e.r - 30, 'ДОБЕЙ!  [' + KN('interact') + ']', '#ffe14a', 1); tip('fin', 'Враг оглушён: подойди и нажми F — добивание лечит. Если оглушено несколько, добивания пойдут серией.'); }
  float(e.x + rnd(-10, 10), e.y - e.r - 6, Math.round(dmg), dmg > 60 ? '#ffd23b' : '#fff');
  burst(e.x, e.y, e.c, 3); { const ha = ang(P, e), hc = o.w ? WP[o.w].col : '#ffffff'; sparks(e.x, e.y, ha, o.heavy ? 14 : 7, o.heavy ? '#ffffff' : hc); fxGlow(e.x, e.y, hc, o.heavy ? 150 : 80, .16, e.r * 1.8 + (e.air || 0)); if (o.heavy) punch = Math.max(punch, 4); }
  if (P.rage <= 0 && !(P.swLock > 0)) P.swag = Math.min(100, P.swag + Math.min(dmg, 90) * .08 * (has('energy') ? 1.4 : 1) * (1 + .25 * S.st.swag) * (o.w === 'mic' && sk('m4') ? 2 : 1));
  else P.hp = Math.min(maxHp(), P.hp + Math.min(dmg, 60) * .01);
  if (!e.boss) {
    if (o.kb) { const an = ang(P, e); e.kx += Math.cos(an) * o.kb; e.ky += Math.sin(an) * o.kb; }
    if (o.heavy && e.ai !== 'brute' && !(e.air > 0)) { e.vz = o.full ? 430 : 310; e.air = 1; } else if (e.air > 0 && o.w) e.vz = Math.max(e.vz, 150);
    if ((o.heavy || (e.ai !== 'brute' && !(e.poi > 0))) && e.state !== 'dash') { e.state = 'hurt'; e.t = .22; if (!o.heavy) e.poi = 1.2; }
    if (o.stun) e.stun = Math.max(e.stun, o.stun);
    if (o.slow) e.slow = o.slow;
  } else if (o.stun && !courierGuard) e.stun = Math.max(e.stun, o.stun * .35);
  if (e.hp <= 0) kill(e, o);
}
function kill(e, o) {
  e.dead = true; if (has('flash')) e.xp = Math.round(e.xp * 1.3); if (hb('bounty')) e.xp = Math.round(e.xp * 1.2); if (fs && fs.mut) e.xp = Math.round(e.xp * (fs.mut === 'rich' ? 1.5 : 1.25));
  if (fs && fs.mut === 'blast' && !e.boss) haz.push({ x: e.x, y: e.y, r: 78, t: .75, mt: .75, dmg: 10 * (1 + S.ch * .2), col: '#ff5a2a' });
  e.xp = Math.round(e.xp * (1 + Math.min(6, Math.floor(P.style || 0)) * .06)); S.xp += e.xp; styleAdd(.15); S.stat.kills++;
  if (!e.boss) { P.mk = T - (P.mkT || -9) < 2.6 ? (P.mk || 0) + 1 : 1; P.mkT = T; const mn = { 3: 'ТРИПЛ', 5: 'ЗОЛОТО', 8: 'ПЛАТИНА', 12: 'БРИЛЛИАНТ', 17: 'ЧАРТ-ТОППЕР' }[P.mk]; if (mn) { banner(mn, 'убийств подряд: ' + P.mk, '#ffd23b'); P.swag = Math.min(100, P.swag + 10); styleAdd(.5); sfx.buy(); } }
  for (const id in S.q) { const q = S.q[id], n = NPCS[id]; if (q.st === 1 && n.q.type === 'kill' && n.q.t === e.type && q.n < n.q.n) { q.n++; if (q.n >= n.q.n) toast('Услуга готова: вернись к ' + n.n, 4); } } float(e.x, e.y - e.r - 24, '+' + e.xp + ' ▶', '#7dff7d');
  burst(e.x, e.y, e.c, e.boss ? 80 : 14); if (o && o.w && !e.boss) { const an = ang(P, e); e.kx += Math.cos(an) * 320; e.ky += Math.sin(an) * 320; if (e.m) { e.m.userData.kx = e.kx; e.m.userData.ky = e.ky; } }
  if (o && o.w === 'bat' && sk('b6')) P.hp = Math.min(maxHp(), P.hp + maxHp() * .012);
  if (e.boss) {
    stopVoice();
    for (const q of ens) if (q !== e) { q.dead = true; burst(q.x, q.y, q.c, 8); }
    prj = []; haz = []; slowmo = 1.6; shake = 22; sfx.boom(); flash = .5; banner('СЕРВЕР ЗАЧИЩЕН', e.d.n + ' повержен', '#ffd23b'); flashAt(e.x, e.y, '#ffffff', 6);
  } else if (Math.random() < .1) orbs.push({ x: e.x, y: e.y, l: 12 });
}
function hurtP(dmg, src, isProj) {
  if (mode !== 'fight' || !fs || fs.done) return false;
  if (devSession && devGod) return false;
  if (P.inv > 0) {
    if (src && P.dodge > 0) completeTomskDrill('dodge');
    if (P.dodge > 0 && !(P.pdT > 0)) { P.pdT = 4; P.crit = 3; bt = hb('long') ? 1.8 : 1.15; styleAdd(.5); tone(700, .5, 'sine', .12, 120); P.swag = Math.min(100, P.swag + 8); float(P.x, P.y - 60, 'ТАЙМИНГ!', '#ffffff', 1); sfx.parry(); }
    return false;
  }
  if (P.block) {
    if (src) completeTomskDrill('block');
    if (P.blockT < .2) {
      sfx.parry(); P.swag = Math.min(100, P.swag + 12); P.inv = .25; float(P.x, P.y - 40, 'ПАРИРОВАНИЕ', '#49e0ff', 1); styleAdd(.5); S.stat.parry++; if (hb('vamp')) P.hp = Math.min(maxHp(), P.hp + maxHp() * .06); flashAt(P.x, P.y, '#49e0ff', 2.5); ring(P.x, P.y, 60, '#49e0ff');
      if (src && !isProj) { src.sm = (src.sm || 0) + .5; src.stun = (src.boss ? .9 : 1.4) * (has('grillz') ? 1.6 : 1); if (!src.boss) src.state = 'idle'; }
      return 'parry';
    }
    dmg *= .4; sfx.block(); if (hb('thorn') && src && !src.dead && !isProj) dmgE(src, 22 * dmgMul(), { kb: 220 });
  } else sfx.hurt();
  if (fs.mut === 'glass') dmg *= 1.35;
  dmg *= [.6, 1, 1.5][S.diff]; if (P.rage > 0) dmg *= .65;
  P.hits = 0; P.hitT = 0; P.hurtT = .3; sparks(P.x, P.y, rnd(0, TAU), 8, '#ff4040'); fxGlow(P.x, P.y, '#ff2020', 130, .2); P.style = Math.max(0, (P.style || 0) - 1.5);
  P.hp = fs.training && TOMSK_DRILLS[fs.i].action ? Math.max(1, P.hp - dmg) : P.hp - dmg; P.inv = .4; shake = Math.max(shake, 10); flash = .25;
  float(P.x, P.y - 30, '-' + Math.round(dmg), '#ff4040');
  if (P.hp <= 0) {
    if (S.comp >= 1 && S.diff < 2 && P.revCh !== S.ch) {
      P.revCh = S.ch; P.hp = maxHp() * .35; P.inv = 2; bt = Math.max(bt, 1); banner('ВТОРОЕ ДЫХАНИЕ', 'madk1d поднял тебя на ноги', '#5cd0ff'); comp.say = 'ВСТАВАЙ!'; comp.sayT = 1.6; ring(P.x, P.y, 220, '#5cd0ff'); sfx.adlib();
      for (const q of ens) if (!q.boss && dist(q, P) < 240) q.stun = Math.max(q.stun, 1.6);
    } else die();
  }
  return true;
}
const TIPS = ['Перекат [ПРОБЕЛ] даёт неуязвимость — катись СКВОЗЬ удар.', 'Блок [SHIFT], нажатый в последний момент, парирует и оглушает.', 'Красная зона на полу — уходи из неё.',
  'Зелёные сферы лечат. Накрутчиков и хейтеров убивай первыми.', 'Не забывай про TAB: прослушивания ▶ и ленты ▣ тратятся на прокачку.', 'ПЕРЕГРУЗ [' + KN('rage') + '] вдвое режет входящий урон и лечит от ударов.'];
function die() { stopVoice(); S.stat.deaths++; try { const sv = load(); if (sv && !devSession) { sv.stat = S.stat; localStorage.setItem(KEY, JSON.stringify(sv)); } } catch (e) {} mode = 'dead'; $('deadTip').textContent = TIPS[Math.floor(rnd(0, TIPS.length))]; show('dead', true); sfx.boom(); }
function retry() { if (devSession) { jumpToCourier(); return; } show('dead', false); const sw = P.swag; S = load() || S; P.hp = maxHp(); P.swag = sw * .5; P.rage = 0; loadLevel(); mode = 'fight'; lock(); }

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
  P.qcd = (S.comp >= 4 ? 8 : 11) * (has('sim') ? .7 : 1);
  comp.say = ['ЭЙ!', 'ПОЕХАЛИ!', 'КАТЮХА!', 'sexyswag!'][Math.floor(rnd(0, S.comp))]; comp.sayT = 1.3;
  sfx.adlib(); ring(comp.x, comp.y, 120, '#5cd0ff');
  const near = ens.filter(e => !e.dead && e.spawn <= 0).sort((a, b) => dist(a, P) - dist(b, P));
  near.slice(0, hb('chainq') ? 6 : 3).forEach(e => { bolts.push({ x1: comp.x, y1: comp.y, x2: e.x, y2: e.y, l: .25, c: '#5cd0ff' }); dmgE(e, 15 * dmgMul(), { stun: 1.2, sm: .4 }); });
  if (S.comp >= 2) P.buff = 5;
  if (S.comp >= 3) near.slice(0, 7).forEach((e, i) => haz.push({ x: e.x, y: e.y, r: 78, t: .5 + i * .12, mt: .5 + i * .12, dmg: 45 * (1 + S.ch * .15), pl: 1, col: '#5cd0ff' }));
  if (S.comp >= 4) P.swag = Math.min(100, P.swag + 30);
}
function doRage() { if (P.rage > 1) { ult(); return; } if (P.swag < 100 || P.rage > 0) return; bt = Math.max(bt, .45); flashAt(P.x, P.y, '#ff4a1c', 4); P.rage = 8; P.swag = 0; sfx.rage(); shake = 14; ring(P.x, P.y, 200, '#ff4a1c'); float(P.x, P.y - 55, 'ПЕРЕГРУЗ!', '#ff4a1c', 1); }
function doDodge() {
  if (P.dcd > 0 || P.dodge > 0) return;
  let [mx, my] = inputDir();
  if (!mx && !my) { mx = Math.cos(P.aim); my = Math.sin(P.aim); }
  const l = Math.hypot(mx, my); P.dvx = mx / l * 460; P.dvy = my / l * 460;
  { let rl = Math.atan2(my, mx) - P.aim; while (rl > Math.PI) rl -= TAU; while (rl < -Math.PI) rl += TAU; P.drl = rl; P.dk = Math.abs(rl) < .8 ? 'dF' : Math.abs(rl) > 2.35 ? 'dB' : rl > 0 ? 'dR' : 'dL'; }
  P.dT = .38; P.dodge = P.dT; P.dcd = .9; P.inv = Math.max(P.inv, (T - (P.ldT || -9) < 1.2 ? .72 : 1) * (has('pods') ? .36 : .25)); P.ldT = T; P.atk = null; P.chg = 0; P.dn = (P.dn || 0) + 1; noise(.1, .08, 3000);
}

function updPlayer(dt) {
  if (P.fin) { P.atk = null; P.chg = 0; return; }
  let [mx, my] = inputDir();
  const ml = Math.hypot(mx, my); if (ml) { mx /= ml; my /= ml; }
  const ox = P.x, oy = P.y; P.mv = ml > 0;
  if (P.mv && P.dodge <= 0) { stepT -= dt; if (stepT <= 0) { stepT = .29; noise(.035, .035, 500); } }
  if (P.swag >= 100) tip('rage', 'СВЭГ полон: R включает ПЕРЕГРУЗ — урон выше, удары лечат. Повторный R тратит остаток на УЛЬТУ по всей комнате.');
  if (document.pointerLockElement !== C) { const ex = M.x / W - .5; if (Math.abs(ex) > .2) camYaw += (ex - Math.sign(ex) * .2) * dt * 4; }
  if (!isFinite(camYaw)) camYaw = -Math.PI / 2; if (!isFinite(camPit)) camPit = .36;
  P.aim = camYaw;
  P.block = !!(K[KM.block] || (KM.block === 'ShiftLeft' && K.ShiftRight)) && !P.atk && P.dodge <= 0 && P.spin <= 0;
  if (P.block) P.blockT += dt; else P.blockT = 0;
  let sp = 255 * (has('kicks') ? 1.12 : 1) * (P.chg > .15 ? .5 : 1) * (P.buff > 0 ? 1.3 : 1) * (P.rage > 0 ? 1.2 : 1);
  if ((K[KM.sprint] || (KM.sprint === 'ControlLeft' && K.ControlRight)) && !P.block && !P.atk && !P.chg && P.dodge <= 0 && P.spin <= 0) sp *= 1.6;
  if (P.block) sp *= .4; if (P.atk) sp *= P.atk.heavy ? .25 : .55;
  if (P.dodge > 0) { P.dodge -= dt; P.x += P.dvx * dt; P.y += P.dvy * dt; if (P.dodge <= 0) P.post = .4; }
  else { P.x += mx * sp * dt; P.y += my * sp * dt; }
  if (P.lt > 0) { P.lt -= dt; P.x += Math.cos(P.la) * P.lv * dt; P.y += Math.sin(P.la) * P.lv * dt; }
  for (const k of ['dcd', 'inv', 'acd', 'post', 'buff', 'qcd', 'pdT', 'crit', 'swT', 'hitT', 'hurtT', 'swLock']) if (P[k] > 0) P[k] -= dt;
  if (!(P.hitT > 0) && P.style > 0) P.style = Math.max(0, P.style - dt * .3);
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
  if (S.ch === 0 && ents[0]?.k === 'frontDoor' && !ents[0].open && ox < ents[0].x) {
    P.x = Math.min(P.x, ents[0].x - P.r - 8);
  }
  pushOut(P, P.r);
  if (S.ch === 0 && !actorCanStand(P.x, P.y, P.r)) {
    if (actorCanStand(P.x, oy, P.r)) P.y = oy;
    else if (actorCanStand(ox, P.y, P.r)) P.x = ox;
    else { P.x = ox; P.y = oy; }
  }
  // кент идёт следом
  let tx = P.x, ty = P.y;
  for (const [f, s] of [[30, 95], [30, -95], [-70, 45], [-70, -45]]) { const x = P.x + Math.cos(P.aim) * f + Math.sin(P.aim) * s, y = P.y + Math.sin(P.aim) * f - Math.cos(P.aim) * s; if (okPos(x, y, 16) && !obs.some(b => Math.hypot(b.x - x, b.y - y) < b.r + 14)) { tx = x; ty = y; break; } }
  comp.x += (tx - comp.x) * Math.min(1, dt * 4); comp.y += (ty - comp.y) * Math.min(1, dt * 4);
  comp.at = (comp.at == null ? 2 : comp.at) - dt;
  if (comp.at <= 0 && fs && !fs.done && S.comp >= 1) {
    const tg = ens.filter(q => !q.dead && q.spawn <= 0 && dist(q, comp) < 560).sort((p, q) => dist(p, comp) - dist(q, comp))[0]; comp.at = 2.6;
    if (tg) { const an = ang(comp, tg); prj.push({ from: 'p', note: 1, x: comp.x, y: comp.y, vx: Math.cos(an) * 620, vy: Math.sin(an) * 620, r: 9, dmg: 9 * dmgMul() * (1 + S.comp * .25), life: 1, hit: new Set(), col: '#5cd0ff', rot: 0 }); tone(880, .08, 'triangle', .07, 1320); }
  }
  pushOut(comp, 10); if (!actorCanStand(comp.x, comp.y, 12)) { comp.x = P.x; comp.y = P.y; }
  const closedDoor = ents.find(o => o.k === 'frontDoor' && !o.open);
  if (closedDoor) {
    comp.x = Math.min(comp.x, closedDoor.x - 28);
    P.x = Math.min(P.x, closedDoor.x - P.r - 8);
  }
  if (comp.sayT > 0) comp.sayT -= dt;
}

/* ================= БОЙ: ВРАГИ ================= */
function moveE(e, an, sp, dt) { e.x += Math.cos(an) * sp * dt; e.y += Math.sin(an) * sp * dt; }
function updEnemy(e, dt) {
  if (e.fl > 0) e.fl -= dt;
  if (e.spawn > 0) { e.spawn -= dt; return; }
  if (e.air > 0) { e.air += e.vz * dt; e.vz -= 1150 * dt; e.stun = Math.max(e.stun, .12); if (e.air <= 0) { e.air = 0; e.vz = 0; rings.push({ x: e.x, y: e.y, r: 10, mr: 50, l: .3, c: '#cfd6e6' }); burst(e.x, e.y, '#99a', 5); } }
  if (e.shock > 0) { e.shock -= dt; if (sk('m7')) { e.hp -= 9 * dt * (1 + S.ch * .2); if (e.hp <= 0) { kill(e, {}); return; } } }
  if (e.pitch > 0) e.pitch -= dt; if (e.poi > 0) e.poi -= dt; if (e.brk > 0) e.brk -= dt;
  e.x += e.kx * dt; e.y += e.ky * dt; const fr = Math.pow(.004, dt); e.kx *= fr; e.ky *= fr;
  if (!e.boss) pushOut(e, e.r * .8);
  e.x = RX(e.x, e.r); e.y = RY(e.y, e.r);
  if (e.slow > 0) e.slow -= dt;
  if (e.stun > 0) { e.stun -= dt; if (e.stun <= 0 && e.fin) { e.fin = false; e.sm = 0; } return; }
  if (e.boss) return updBoss(e, dt);
  const sp = e.spd * (e.pitch > 0 ? (sk('v6') ? .45 : .7) : 1), agg = Math.max(.55, 1 - S.ch * .05), d = dist(e, P), a = ang(e, P);
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
      if (e.guardPost && d > 620) break;
      if (e.guardPost && d >= 165) {
        if (e.cdT <= 0) { e.state = 'wind'; e.t = .48; e.cdT = e.d.cd; }
        break;
      }
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
      else mkP(e.x, e.y, ang(e, P), 340 + S.ch * 14, e.dmg, { cm: 1 });
      e.state = 'rec'; e.t = .3; break;
    case 'charger': e.state = 'dash'; e.t = .45; e.hitP = false; break;
  }
}
const WIND = { mines: .5, shock: .7, beam: .85, slam: .8, leap: .95, charge: .75, fan: .5, burst: .6, spiral: .5, rain: .5, summon: .7, tp: .45, homing: .5, wall: .7 };
function updBoss(e, dt) {
  const L = e.d.phases.length, ph = Math.min(L - 1, Math.floor((1 - e.hp / e.maxhp) * L));
  if (ph !== e.ph) { e.ph = ph; bossSpeech(e, e.d.barks[ph]); ring(e.x, e.y, 220, e.c); shake = 12; sfx.boom(); e.cdT = .8; }
  if (e.sayT > 0) e.sayT -= dt;
  if (e.beam) { const b = e.beam, d = dist(e, P); b.t -= dt; b.a += b.dir * (1.35 + e.ph * .12) * dt; if (d < 740 && adiff(ang(e, P), b.a) < Math.atan2(22, Math.max(d, 30)) + .02) hurtP(e.dmg * .9, null, true); if (b.t <= 0) e.beam = null; }
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
      if (e.t <= 0 || !inR(fs.room, e.x, e.y, e.r + 1)) {
        if (e.type === 'courier' && e.ph === 2 && !e.secondDash) {
          e.secondDash = true;
          e.state = 'wind';
          e.t = WIND.charge;
          e.aa = ang(e, P);
        } else {
          e.state = 'rec';
          e.t = e.type === 'courier' ? 1.35 : .6;
        }
      }
      break;
    default:
      if (d > 130) moveE(e, a, e.spd * mad * (e.slow > 0 ? .6 : 1), dt);
      e.cdT -= dt;
      if (e.cdT <= 0) {
        const list = e.d.phases[ph]; let m = list[Math.floor(rnd(0, list.length))];
        if (m === e.last) m = list[(list.indexOf(m) + 1) % list.length];
        if (m === 'slam' && d > 260) m = list.includes('leap') ? 'leap' : (list.find(q => q !== 'slam') || 'slam');
        if (e.type === 'courier' && d > 320) {
          const ranged = ph === 2 ? 'homing' : ph === 1 ? 'mines' : 'fan';
          m = e.last === 'charge' ? ranged : 'charge';
        }
        if (T - (e.lastVoiceAt ?? -Infinity) >= 2.5) bossSpeech(e, BOSS_ATTACK_LINES[m]);
        e.mv = e.last = m; e.state = 'wind'; e.t = WIND[m]; e.aa = a; e.tx = P.x; e.ty = P.y; e.cdT = e.d.gap / mad;
        if (e.type === 'courier' && m === 'charge') e.secondDash = false;
      }
  }
}
function bossExec(e) {
  const dm = e.dmg; let rec = .5;
  switch (e.mv) {
    case 'slam': ring(e.x, e.y, e.r + 130, e.c); shake = 12; sfx.boom(); if (dist(e, P) < e.r + 130 + P.r * .5) hurtP(dm * 1.3, e); rec = .7; break;
    case 'leap': burst(e.x, e.y, e.c, 12); e.x = e.tx; e.y = e.ty; ring(e.x, e.y, 140, e.c); shake = 14; sfx.boom(); if (dist(e, P) < 140 + P.r * .5) hurtP(dm * 1.4, e); rec = .8; break;
    case 'charge': e.state = 'dash'; e.t = e.type === 'courier' ? .9 : .6; e.hitP = false; return;
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
    case 'mines': for (let i = 0; i < 5 + e.ph; i++) { const t = 1.5 + i * .2, a = rnd(0, TAU), d = rnd(30, 250); haz.push({ x: RX(P.x + Math.cos(a) * d, 40), y: RY(P.y + Math.sin(a) * d, 40), r: 72, t, mt: t, dmg: dm, col: e.c }); } sfx.shoot(); break;
    case 'shock': { const mkw = () => { if (!e.dead) { waves.push({ x: e.x, y: e.y, r: e.r, v: 520, dmg: dm * .9, max: 780, c: e.c }); sfx.boom(); shake = Math.max(shake, 8); } }; mkw(); if (e.ph >= 2) timers.push({ t: .7, f: mkw }); rec = .8; break; }
    case 'beam': { const dir = Math.random() < .5 ? 1 : -1; e.beam = { a: ang(e, P) - dir * 1.25, dir, t: 2.2 }; sfx.rage(); rec = 2.3; break; }
  }
  if (e.type === 'courier' && e.mv === 'mines') {
    const a = ang(e, P);
    const offsets = e.ph === 2 ? [0, 145] : [0];
    for (const offset of offsets) {
      const t = .85 + offset / 500;
      haz.push({ x: RX(P.x + Math.cos(a) * offset, 35), y: RY(P.y + Math.sin(a) * offset, 35),
        r: 105, t, mt: t, dmg: dm * 1.2, col: '#ff8754' });
    }
  }
  e.state = 'rec'; e.t = e.type === 'courier' ? Math.max(rec, 1.15) : rec;
}

/* ================= ЭФФЕКТЫ ================= */
function burst(x, y, c, n) { for (let i = 0; i < n; i++) { const a = rnd(0, TAU), s = rnd(60, 320); pts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, l: rnd(.25, .6), c, s: rnd(2, 5) }); } }
function ring(x, y, r, c) { rings.push({ x, y, r: r * .2, mr: r, l: .35, c }); if (r >= 110) { flashAt(x, y, c, 2.2); punch = Math.max(punch, r > 200 ? 7 : 3); marks.push({ x, y, r: Math.min(r, 260) * .55, l: 6 }); if (marks.length > 22) marks.shift(); } }
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
  T += dt; S.stat.t += dt;
  for (const t of timers) { t.t -= dt; if (t.t <= 0) { t.done = true; t.f(); } }
  timers = timers.filter(t => !t.done);
  { const pd = bt > 0 ? dt / .3 : dt; updPlayer(pd); updThrow(pd); }
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
    if (hitProps(p.x, p.y, p.r, p.from === 'p') && !p.pierce) p.life = 0;
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
        p.hit.add(e); if (p.note) dmgE(e, p.dmg, { kb: 60, sm: .14 }); else dmgE(e, p.dmg, { w: 'vinyl', kb: 70, slow: sk('v6') ? 2.5 : 0 }); sfx.hit(false);
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
  for (const w of waves) { w.r += w.v * dt; if (!w.hit && Math.abs(Math.hypot(P.x - w.x, P.y - w.y) - w.r) < 20 && hurtP(w.dmg, null, true)) w.hit = 1; }
  waves = waves.filter(w => w.r < w.max);
  // зоны
  for (const h of haz) {
    h.t -= dt;
    if (h.t <= 0) {
      h.dead = true; ring(h.x, h.y, h.r, h.col); burst(h.x, h.y, h.col, 10); shake = Math.max(shake, 5); tone(90, .25, 'sine', .3, 35);
      if (h.pl || h.both) { for (const e of ens) if (!e.dead && Math.hypot(e.x - h.x, e.y - h.y) < h.r + e.r) dmgE(e, h.dmg * (h.both ? 2 : 1), { kb: 200 }); }
      if (!h.pl && Math.hypot(P.x - h.x, P.y - h.y) < h.r + P.r * .4) hurtP(h.dmg, null, true);
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
  if (fs && !fs.done && fs.traps) { fs.trT -= dt; if (fs.trT <= 0) { fs.trT = 5.5; for (const t of fs.traps) haz.push({ x: t.x, y: t.y, r: 95, t: 1.3, mt: 1.3, dmg: 13 * (1 + S.ch * .12), col: '#ffb03b', both: 1 }); } }
  if (fs && !fs.done && fs.surv != null) {
    if (!fs.arch) fs.surv -= dt;
    fs.spT = (fs.spT || 0) - dt;
    if (fs.arch) {
      const limit = [4, 6, 8][S.diff] ?? 6;
      if (S.done.tomskPower && fs.surv > 0 && fs.spT <= 2 && ens.length < limit && !fs.entry) {
        const { x, y, w, h, cx, cy } = fs.room;
        const entries = [{ x: x + 85, y: cy }, { x: x + w - 85, y: cy },
          { x: cx, y: y + 85 }, { x: cx, y: y + h - 85 }];
        fs.entry = entries.sort((a, b) => dist(b, P) - dist(a, P))[0];
      }
      if (fs.surv > 0 && fs.spT <= 0) {
        fs.spT = [8, 6, 5][S.diff] ?? 6;
        for (let i = 0; i < (S.diff === 0 ? 1 : 2) && ens.length < limit; i++) {
          const p = fs.entry ? { x: fs.entry.x + i * 34, y: fs.entry.y + i * 34 } : edgePos();
          const ranged = i === 0 && fs.surv <= 40 && !ens.some(e => e.type === 'hater');
          ens.push(mkEnemy(ranged ? 'hater' : 'bot', p.x, p.y));
        }
        fs.entry = null;
      }
    } else if (fs.spT <= 0 && ens.length < 12) { fs.spT = 2.4; for (let i = 0; i < 2 + (S.ch > 4 ? 1 : 0); i++) { const p = edgePos(); ens.push(mkEnemy(fs.pool[Math.floor(Math.random() * fs.pool.length)], p.x, p.y)); } }
    if (fs.surv <= 0) { for (const q of ens) { q.dead = true; burst(q.x, q.y, q.c, 8); } fs.done = true; fs.clearT = 1.4; float(P.x, P.y - 60, 'ВЫЖИЛ', '#7dff7d', 1); sfx.buy(); }
  } else if (fs && !fs.done && ens.length === 0) {
    if (tomskDrillPending()) {
      spawnWave();
    } else if (fs.waves && fs.i < fs.waves.length - 1) {
      fs.i++;
      fs.drillDone = false;
      if (fs.training) {
        if (!tomskDrillPending()) P.hp = maxHp();
        openTomskGuide();
      } else spawnWave();
    }
    else { if (fs.training) P.hp = maxHp(); fs.done = true; fs.clearT = fs.boss ? 2.4 : 1.5; if (!fs.boss) { banner('ЧИСТО', 'комната зачищена', '#7dff7d'); slowmo = Math.max(slowmo, .55); } }
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
let entranceCameraRay, entranceCameraBox;
const cam3 = { x: AW / 2, z: AH / 2 }, geo = {}, mats = {}, pools = {}, emoT = {};
const G = (k, f) => geo[k] || (geo[k] = f());
function mat(c, o) { const k = c + (o ? JSON.stringify(o) : ''); if (mats[k]) return mats[k]; const m = mats[k] = new T3.MeshStandardMaterial(Object.assign({ color: c, roughness: .75, metalness: .05 }, o || {})); m.color.convertSRGBToLinear(); if (o && o.emissive) m.emissive.convertSRGBToLinear(); return m; }
function mesh(g, m, x, y, z) { const q = new T3.Mesh(g, m); q.position.set(x || 0, y || 0, z || 0); q.castShadow = true; return q; }
const box = (w, h, d, c, x, y, z, o) => { const q = mesh(G('box', () => new T3.BoxGeometry(1, 1, 1)), mat(c, o), x, y, z); q.scale.set(w, h, d); return q; };
const sph = (r, c, x, y, z, o) => { const q = mesh(G('sph', () => new T3.SphereGeometry(1, 18, 14)), mat(c, o), x, y, z); q.scale.setScalar(r); return q; };
const cyl = (rt, rb, h, c, x, y, z, o) => mesh(G('cy' + rt.toFixed(1) + '_' + rb.toFixed(1) + '_' + h.toFixed(1), () => new T3.CylinderGeometry(rt, rb, h, 16)), mat(c, o), x, y, z);
function emo(ch, s, y) {
  let t = emoT[ch];
  if (!t) { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.font = '46px "Segoe UI Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ch, 32, 36); t = emoT[ch] = new T3.CanvasTexture(c); t.encoding = T3.sRGBEncoding; }
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
function setPR() { if (R3) R3.setPixelRatio(Math.min(2, Math.max(.8, screenScale() * (window.devicePixelRatio || 1))) * [.6, .8, 1][qual] * DYN); if (R3 && PPC) { const pr = R3.getPixelRatio(); PPC.setPixelRatio(pr); PPC.setSize(W, H); if (FXA) FXA.uniforms.resolution.value.set(1 / (W * pr), 1 / (H * pr)); } }
addEventListener('resize', setPR);

function init3d() {
  entranceCameraRay = new T3.Ray();
  entranceCameraBox = new T3.Box3();
  R3 = new T3.WebGLRenderer({ canvas: $('gl'), antialias: OPT.q === 'mid', powerPreference: 'high-performance' }); R3.setSize(W, H, false); setPR();
  R3.outputEncoding = T3.sRGBEncoding; R3.toneMapping = T3.ACESFilmicToneMapping; R3.toneMappingExposure = 1.25;
  R3.info.autoReset = false; R3.shadowMap.enabled = true; R3.shadowMap.type = T3.PCFShadowMap; R3.shadowMap.autoUpdate = false;
  SC = new T3.Scene(); CAM = new T3.PerspectiveCamera(56, W / H, 8, 5000);
  HEMI = new T3.HemisphereLight(0xdde6ff, 0x1a1c2a, .6); SC.add(HEMI);
  SUN = new T3.DirectionalLight(0xffffff, .75); SUN.castShadow = true; SUN.shadow.mapSize.set(1024, 1024);
  const sc = SUN.shadow.camera; sc.left = -650; sc.right = 650; sc.top = 650; sc.bottom = -650; sc.near = 100; sc.far = 2500; SC.add(SUN, SUN.target); FL = new T3.PointLight('#ffffff', 0, 560, 2); SC.add(FL);
  { const rim = new T3.DirectionalLight('#8fb4ff', .45); rim.position.set(-300, 220, -420); SC.add(rim); }
  if (T3.EffectComposer && T3.UnrealBloomPass && T3.RenderPass && T3.ShaderPass) {
    try {
      PPC = new T3.EffectComposer(R3); RP = new T3.RenderPass(SC, CAM); PPC.addPass(RP);
      PPC.addPass(new T3.UnrealBloomPass(new T3.Vector2(W, H), .4, .42, .9)); PPC.addPass(new T3.ShaderPass(T3.GammaCorrectionShader));
      FXA = new T3.ShaderPass(T3.FXAAShader); PPC.addPass(FXA); setPR();
    } catch (e) { PPC = null; }
  }
  _ray = new T3.Raycaster(); _pl = new T3.Plane(new T3.Vector3(0, 1, 0), 0); _hit = new T3.Vector3(); _nd = new T3.Vector2(); v3 = new T3.Vector3();
  // Пахан
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
  { const tq = new T3.CanvasTexture(c); tq.encoding = T3.sRGBEncoding; return tq; }
}
let PPC = null, RP = null, FXA = null, hfx = [], marks = [], punch = 0, FL = null, cine = null, banners = [], MSC = null, MSH = null, MSK = null, HEMI = null, SKYM = null, AMB = null, ambD = null, movers = [], indoorLightMix = 0;
const ENVC = {
  snow: { sun: '#9db4ff', si: .55, hs: '#8fa6d8', hg: '#1a1c2a', hi: .75, pt: ['#ffffff', 5, -60, 25, 420] },
  basement: { sun: '#ffcf9a', si: .6, hs: '#d8b48a', hg: '#1a120c', hi: .6, pt: ['#c9a36b', 3, -6, 8, 160] },
  neon: { sun: '#ff7ae0', si: .5, hs: '#b87aff', hg: '#12061e', hi: .75, pt: ['#ff5cc8', 4, 40, 10, 260] },
  swamp: { sun: '#b6e36a', si: .5, hs: '#6f9a55', hg: '#0a120a', hi: .75, pt: ['#d8ff6a', 6, 6, 30, 240] },
  glass: { sun: '#ffffff', si: .7, hs: '#cfe2ff', hg: '#1a2330', hi: .6, pt: ['#ffffff', 2, -4, 6, 100] },
  grave: { sun: '#a99cff', si: .5, hs: '#7a70c8', hg: '#0b0a14', hi: .7, pt: ['#b79cff', 4, 10, 20, 240] },
  server: { sun: '#7dffc8', si: .5, hs: '#4ad6a0', hg: '#06100e', hi: .65, pt: ['#2affb0', 3, 70, 4, 260] },
  chart: { sun: '#ffb07a', si: .65, hs: '#ff9a6a', hg: '#140a08', hi: .7, pt: ['#ff8a3c', 4, 55, 18, 260] },
  core: { sun: '#ffffff', si: .9, hs: '#ffffff', hg: '#30324a', hi: .9, pt: ['#ffffff', 3, 12, 12, 260] } };
const WDECO = { snow: [['p_bush', 30], ['p_trash_A', 30], ['p_firehydrant', 26], ['p_box_A', 26], ['p_trafficlight_A', 110]], basement: [['p_shelf_B_large_decorated', 84], ['p_cabinet_medium', 60], ['p_Barrel_A', 36], ['p_Box_A', 30]],
  neon: [['p_trafficlight_A', 110], ['p_bench', 28], ['p_box_A', 26]], swamp: [['p_waterplant_A', 40], ['p_rock_single_A', 34], ['p_tree_single_A', 130], ['p_tree_single_B', 150], ['p_rock_single_C', 44], ['p_trees_A_large', 170], ['p_trees_B_large', 170]],
  glass: [['p_cabinet_medium', 60], ['p_lamp_standing', 70], ['p_chair_A', 34]], grave: [['p_candle_triple', 24], ['p_skull', 16], ['p_bone_A', 10], ['p_pumpkin_orange_jackolantern', 24], ['p_tree_dead_medium', 120]],
  server: [['p_containers_B', 60], ['p_rocks_A', 30], ['p_lights', 110]], chart: [['p_Box_A', 30], ['p_Barrel_A', 36]] };
const TRIM = { snow: ['#e8eef8', 0], neon: ['#ff3cc8', 1], server: ['#2affb0', 1], chart: ['#ff5a32', .8], glass: ['#9cc4f0', .3], basement: ['#2a1c12', 0], core: ['#cfd3de', 0] };
function draw(sc) { if (PPC && qual === 2) { RP.scene = sc; PPC.render(); } else R3.render(sc, CAM); }
function sparks(x, y, a, n, c) { for (let i = 0; i < n; i++) { const an = a + rnd(-.8, .8), sp = rnd(260, 640); pts.push({ x, y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, l: rnd(.12, .3), c, s: rnd(2, 3.6), st: 1 }); } }
function fxGlow(x, y, c, s, l, h) { hfx.push({ x, y, c, s, l, ml: l, h: h || 34 }); if (hfx.length > 60) hfx.shift(); }
function glowS(col, size) { const sp = new T3.Sprite(new T3.SpriteMaterial({ map: G('glowT2', () => { const [c, x] = cnv(64, 64), q = x.createRadialGradient(32, 32, 2, 32, 32, 31); q.addColorStop(0, 'rgba(255,255,255,1)'); q.addColorStop(.3, 'rgba(255,255,255,.5)'); q.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = q; x.fillRect(0, 0, 64, 64); return new T3.CanvasTexture(c); }), color: col, transparent: true, depthWrite: false, blending: T3.AdditiveBlending })); sp.scale.set(size, size, 1); return sp; }
function flashAt(x, y, c, k) { if (!FL) return; FL.position.set(x, 70, y); FL.color.set(c); FL.intensity = Math.max(FL.intensity, k); }
function banner(s, sub, c) { banners.push({ s, sub, c, t: 0 }); if (banners.length > 2) banners.shift(); }
function styleAdd(v) { P.style = Math.min(6.99, (P.style || 0) + v); if (P.style > S.stat.style) S.stat.style = P.style; if (P.style > 1.2) tip('style', 'Буква справа — рейтинг стиля. Растёт от смены оружия, реакций, парирований и добиваний, падает от урона. Чем выше, тем больше опыта.'); }
function ult() {
  const w = S.weapon; P.rage = 0; P.swag = 0; P.swLock = 6; bt = Math.max(bt, .9); shake = 26; flash = .45; sfx.boom(); sfx.rage(); P.inv = Math.max(P.inv, 1);
  banner('УЛЬТА', WP[w].name, WP[w].col); flashAt(P.x, P.y, WP[w].col, 5); for (const r of [160, 320, 520]) ring(P.x, P.y, r, WP[w].col);
  for (let i = 0; i < 26; i++) { const a = i / 26 * TAU; burst(P.x + Math.cos(a) * 200, P.y + Math.sin(a) * 200, WP[w].col, 4); }
  timers.push({ t: .12, f: () => { for (const e of ens) if (!e.dead && e.spawn <= 0 && dist(e, P) < 620) dmgE(e, 110 * dmgMul(w), { w, kb: 700, stun: 1.2, heavy: true, sm: .08 }); } });
  styleAdd(1);
}
function menuScene(now, fdt) {
  if (!R3) init3d();
  if (!MSC) {
    MSC = new T3.Scene(); MSC.background = new T3.Color('#050508'); MSC.fog = new T3.Fog('#050508', 320, 900);
    MSC.add(new T3.HemisphereLight('#ff8a7a', '#0a0a18', .9)); const dl = new T3.DirectionalLight('#ffffff', 1.3); dl.position.set(220, 320, 120); MSC.add(dl);
    const rl = new T3.PointLight('#ff2a2a', 3, 600, 2); rl.position.set(-120, 90, -140); MSC.add(rl);
    MSC.add(mesh(new T3.CircleGeometry(520, 48).rotateX(-Math.PI / 2), new T3.MeshStandardMaterial({ color: '#0c0a0e', roughness: .35, metalness: .4 })));
    const rg = new T3.Mesh(new T3.RingGeometry(150, 158, 64).rotateX(-Math.PI / 2), new T3.MeshBasicMaterial({ color: '#ff3b3b' })); rg.position.y = 1; MSC.add(rg);
    const gs = glowS('#ff2a2a', 700); gs.position.set(0, 120, -60); MSC.add(gs);
  }
  if (!MSH && MDL.vanek && mdlDone >= mdlTot) { MSH = inst('vanek', 120, { tint: '#4a4d5a', mix: .5 }); MSH.traverse(o => { if (/^handslot.?r$/i.test(o.name)) o.add(handWeapons().bat); }); MSH.rotation.y = -1.2; play(MSH, 'bi'); MSC.add(MSH); }
  if (!MSK && MDL.kent && mdlDone >= mdlTot) { MSK = inst('kent', 104, { tint: '#bfe6ff', mix: .3 }); MSK.position.set(-40, 0, 95); MSK.rotation.y = -1.5; MSC.add(MSK); }
  if (MSH) MSH.userData.mx.update(fdt); if (MSK) MSK.userData.mx.update(fdt);
  const a = Math.sin(now * .22) * .55 + .35; CAM.fov = 42; CAM.updateProjectionMatrix();
  CAM.position.set(Math.cos(a) * 330, 105 + Math.sin(now * .4) * 8, Math.sin(a) * 330 + 40); CAM.lookAt(0, 62, 30); draw(MSC);
}
function cnv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function floorTex(k) {
  const [c, x] = cnv(512, 512), R = (a, b) => a + Math.random() * (b - a);
  x.fillStyle = { snow: '#23272f', basement: '#4a3c30', neon: '#1a0b2e', swamp: '#2a2a17', glass: '#6f7888', grave: '#2a2622', server: '#1c2a28', chart: '#2a1a16', core: '#e4e6ee' }[k] || '#333'; x.fillRect(0, 0, 512, 512);
  const spk = (n, cols, s0, s1, a) => { for (let i = 0; i < n; i++) { x.globalAlpha = R(a * .4, a); x.fillStyle = cols[i % cols.length]; const s = R(s0, s1); x.fillRect(R(0, 512), R(0, 512), s, s * R(.6, 1.4)); } x.globalAlpha = 1; };
  const blob = (n, col, r0, r1, a) => { for (let i = 0; i < n; i++) { x.globalAlpha = a; x.fillStyle = col; x.beginPath(); x.ellipse(R(0, 512), R(0, 512), R(r0, r1), R(r0, r1) * R(.5, 1), R(0, 3), 0, TAU); x.fill(); } x.globalAlpha = 1; };
  const lines = (n, col, w) => { x.strokeStyle = col; x.lineWidth = w; for (let i = 0; i < n; i++) { let px = R(0, 512), py = R(0, 512); x.beginPath(); x.moveTo(px, py); for (let j = 0; j < 5; j++) { px += R(-40, 40); py += R(-40, 40); x.lineTo(px, py); } x.stroke(); } };
  const tiles = (s, col, w) => { x.strokeStyle = col; x.lineWidth = w; x.beginPath(); for (let i = 0; i <= 512; i += s) { x.moveTo(i, 0); x.lineTo(i, 512); x.moveTo(0, i); x.lineTo(512, i); } x.stroke(); };
  spk(2600, ['#000', '#fff'], 1, 3, .09);
  switch (k) {
    case 'snow': lines(14, '#0e1014', 2); blob(9, '#8fa0bc', 24, 80, .22); blob(14, '#c9d6ea', 6, 22, .28); break;
    case 'basement': blob(18, '#2e241c', 20, 70, .5); tiles(128, '#2a2019', 3); spk(300, ['#6b5a48'], 2, 6, .3); break;
    case 'neon': tiles(64, '#ff3cc8', 2); tiles(128, '#3cdcff', 2); blob(10, '#3cdcff', 20, 50, .08); break;
    case 'swamp': blob(30, '#3f4a1e', 20, 80, .5); blob(22, '#55702a', 8, 34, .55); blob(12, '#0c140c', 18, 50, .7); spk(500, ['#6f8a3a', '#1a1a0c'], 2, 5, .4); break;
    case 'glass': tiles(128, '#4c5462', 3); lines(18, '#8a93a2', 1); blob(10, '#ffffff', 20, 60, .1); break;
    case 'grave': blob(30, '#3a3128', 20, 70, .5); blob(20, '#1c1915', 10, 40, .5); spk(500, ['#5a6b3a', '#4a4036'], 2, 5, .45); lines(8, '#15120f', 2); break;
    case 'server': tiles(128, '#0c1513', 5); spk(200, ['#2affb0'], 2, 3, .5); x.fillStyle = '#31423f'; for (let i = 0; i < 512; i += 128) for (let j = 0; j < 512; j += 128) for (const [a, b] of [[8, 8], [112, 8], [8, 112], [112, 112]]) x.fillRect(i + a, j + b, 6, 6); break;
    case 'chart': tiles(256, '#ff5a32', 3); lines(10, '#120a08', 2); blob(14, '#3a241e', 20, 60, .5); break;
    default: tiles(64, '#cfd3de', 1); spk(160, ['#ff5cc8', '#5cd0ff', '#ffd23b', '#7dff7d'], 4, 7, .5);
  }
  const t = new T3.CanvasTexture(c); t.encoding = T3.sRGBEncoding; t.wrapS = t.wrapT = T3.RepeatWrapping; t.anisotropy = 4; return t;
}
function skyTex(k, hor) {
  const [c, x] = cnv(512, 256), top = { snow: '#05070f', basement: '#070504', neon: '#1a0530', swamp: '#04080a', glass: '#3b6aa8', grave: '#07061a', server: '#020a08', chart: '#3a1206', core: '#ffffff' }[k] || '#000';
  const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, top); g.addColorStop(.55, hor); g.addColorStop(1, hor); x.fillStyle = g; x.fillRect(0, 0, 512, 256);
  if (k !== 'glass' && k !== 'core' && k !== 'basement') for (let i = 0; i < 260; i++) { x.globalAlpha = Math.random(); x.fillStyle = k === 'neon' ? (i % 2 ? '#ff7ae0' : '#7ae0ff') : '#fff'; x.fillRect(Math.random() * 512, Math.random() * 120, 1.5, 1.5); }
  x.globalAlpha = 1;
  if (k === 'snow' || k === 'grave' || k === 'swamp') { x.fillStyle = k === 'swamp' ? '#d8ffb0' : '#e8ecff'; x.shadowColor = x.fillStyle; x.shadowBlur = 30; x.beginPath(); x.arc(380, 60, 16, 0, TAU); x.fill(); x.shadowBlur = 0; }
  if (k === 'chart') { const s = x.createRadialGradient(256, 150, 5, 256, 150, 160); s.addColorStop(0, 'rgba(255,200,90,.9)'); s.addColorStop(1, 'rgba(255,120,40,0)'); x.fillStyle = s; x.fillRect(0, 0, 512, 256); }
  { const tq = new T3.CanvasTexture(c); tq.encoding = T3.sRGBEncoding; return tq; }
}
function buildWorld(th) {
  if (worldG) SC.remove(worldG); worldG = new T3.Group(); SC.add(worldG); spinners = []; statics = []; movers = []; glows = [];
  indoorLightMix = S.ch === 0 ? 1 : 0;
  const k = th.deco, ev = ENVC[k] || ENVC.snow, bg = new T3.Color(th.bg), hor = bg.clone().lerp(new T3.Color(ev.hs), .22), horS = '#' + hor.getHexString();
  SC.background = hor; SC.fog = new T3.Fog(hor.clone().convertSRGBToLinear(), 450, 2100);
  SUN.color.set(ev.sun); SUN.intensity = ev.si; if (HEMI) { HEMI.color.set(ev.hs); HEMI.groundColor.set(ev.hg); HEMI.intensity = ev.hi; }
  if (SKYM) SC.remove(SKYM); SKYM = new T3.Mesh(new T3.SphereGeometry(3900, 24, 12), new T3.MeshBasicMaterial({ map: skyTex(k, horS), side: T3.BackSide, fog: false, depthWrite: false })); SC.add(SKYM);
  if (AMB) SC.remove(AMB);
  { const n = ev.pt[4], gg = new T3.BufferGeometry(); ambD = { n, base: [], vy: ev.pt[2], dr: ev.pt[3] }; for (let i = 0; i < n; i++) ambD.base.push([Math.random() * 1500, Math.random() * 420, Math.random() * 1500, Math.random() * 6]);
    gg.setAttribute('position', new T3.BufferAttribute(new Float32Array(n * 3), 3)); const [dc, dx] = cnv(32, 32), dg = dx.createRadialGradient(16, 16, 1, 16, 16, 15); dg.addColorStop(0, 'rgba(255,255,255,1)'); dg.addColorStop(1, 'rgba(255,255,255,0)'); dx.fillStyle = dg; dx.fillRect(0, 0, 32, 32);
    AMB = new T3.Points(gg, new T3.PointsMaterial({ color: ev.pt[0], size: ev.pt[1] * 2.2, map: new T3.CanvasTexture(dc), transparent: true, opacity: .85, depthWrite: false })); AMB.frustumCulled = false; SC.add(AMB); }
  // пол с текстурой, общей для всей локации
  const ft = floorTex(k), rough = k === 'swamp' || k === 'neon' || k === 'glass' ? .5 : .93, fmat = c => new T3.MeshStandardMaterial({ map: ft, color: c, roughness: rough, metalness: k === 'server' ? .35 : 0 });
  const mRoom = fmat('#ffffff'), mCor = fmat('#a8a8a8'), mSide = fmat('#d0d0d0'), mBoss = fmat('#ffdcdc'), mOut = fmat('#5a5a5a');
  const pl = (r, m, y) => { const gg = new T3.PlaneGeometry(r.w, r.h).rotateX(-Math.PI / 2), uv = gg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (r.x + uv.getX(i) * r.w) / 380, (r.y + (1 - uv.getY(i)) * r.h) / 380); const q = new T3.Mesh(gg, m); q.position.set(r.x + r.w / 2, y, r.y + r.h / 2); q.receiveShadow = true; worldG.add(q); };
  pl({ x: -2500, y: -2500, w: LV.w + 5000, h: LV.h + 5000 }, mOut, -1.5);
  for (const r of LV.cors) pl(r, mCor, 0);
  for (const r of LV.rooms) pl(r, r.kind === 'boss' ? mBoss : r.kind === 'side' ? mSide : mRoom, .3);
  if (S.ch === 0) {
    const r = LV.main[0];
    const vestibule = new T3.Group();
    const tile = new T3.MeshStandardMaterial({ color: '#514c43', roughness: 1 });
    pl({ x: r.x + 12, y: r.y + 12, w: r.w - 24, h: r.h - 24 }, tile, .7);
    for (const dz of [12, r.h - 12]) {
      vestibule.add(box(r.w - 16, 65, 15, '#39483d', r.cx, 33, r.y + dz));
      vestibule.add(box(r.w - 16, 115, 15, '#8a806b', r.cx, 123, r.y + dz));
    }
    // Перекрытие вестибюля оставляет проём над двумя маршами.
    vestibule.add(box(r.w - 230, 16, r.h, '#615b50', r.x + 230 + (r.w - 230) / 2, 188, r.cy));
    vestibule.add(box(230, 16, 35, '#615b50', r.x + 115, 188, r.y + r.h - 17.5));
    vestibule.add(box(230, 16, r.h, '#615b50', r.x + 115, 400, r.cy));
    vestibule.add(box(16, 220, r.h, '#77715e', r.x + 8, 290, r.cy));
    for (const z of [r.y + 12, r.y + r.h - 12]) {
      vestibule.add(box(230, 220, 15, '#77715e', r.x + 115, 290, z));
    }
    vestibule.add(box(16, 180, r.h, '#586052', r.x + 8, 90, r.cy));
    for (const dz of [-160, 160]) {
      vestibule.add(box(18, 180, 100, '#586052', r.x + r.w - 8, 90, r.cy + dz));
    }
    vestibule.add(box(28, 70, 224, '#7b7364', r.x + r.w - 12, 150, r.cy));
    for (const offset of [-108, 108]) {
      vestibule.add(box(30, 124, 12, '#373c32', r.x + r.w - 14, 62, r.cy + offset));
    }
    vestibule.add(box(30, 10, 224, '#373c32', r.x + r.w - 14, 120, r.cy));
    for (const dx of [-60, 170]) {
      vestibule.add(box(86, 133, 12, '#3d3026', r.cx + dx, 67, r.y + r.h - 24));
      vestibule.add(box(8, 5, 8, '#a18c58', r.cx + dx + 30, 61, r.y + r.h - 33));
    }
    // Подъём от входной площадки к развороту, затем обратно на этаж.
    for (let i = 0; i < 10; i++) {
      const height = (i + 1) * 16;
      const z = r.y + 310 - i * 24;
      vestibule.add(box(95, height, 24, '#666057', r.x + 170, height / 2, z));
      vestibule.add(box(4, 48, 4, '#383c36', r.x + 220, height + 24, z));
      vestibule.add(box(95, 12, 24, '#666057', r.x + 65, 160 + height - 6, r.y + 94 + i * 24));
      vestibule.add(box(4, 48, 4, '#383c36', r.x + 115, 160 + height + 24, r.y + 94 + i * 24));
    }
    vestibule.add(box(210, 16, 64, '#666057', r.x + 117, 152, r.y + 50));
    vestibule.add(box(210, 16, 60, '#666057', r.x + 117, 312, r.y + 352));
    for (const [x, y, slope] of [[220, 136, 160 / 240], [115, 296, -160 / 240]]) {
      const rail = box(7, 7, Math.hypot(216, 144) + 12, '#383c36', r.x + x, y, r.y + 202);
      rail.rotation.x = Math.atan(slope);
      vestibule.add(rail);
    }
    for (let i = 0; i < 48; i++) {
      const x = r.x + 35 + (i * 137 % (r.w - 70));
      const y = 20 + i * 19 % 140;
      vestibule.add(box(9 + i % 19, 2 + i % 7, 1, i % 2 ? '#6b715d' : '#a09882', x, y, r.y + 20));
    }
    for (let i = 0; i < 9; i++) vestibule.add(box(8, 43, 19, '#716b57', r.cx + 170 + i * 10, 26, r.y + 26));
    for (let i = 0; i < 4; i++) vestibule.add(box(26, 36, 2, '#a79d76', r.cx + 80 + i * 30, 100, r.y + r.h - 23));
    for (let i = 0; i < 6; i++) {
      const x = r.cx - 155 + i * 30;
      vestibule.add(box(28, 39, 17, '#55574c', x, 74, r.y + 24));
      vestibule.add(box(16, 3, 3, '#242621', x, 83, r.y + 34));
    }
    vestibule.add(box(22, 12, 22, '#9f7943', r.cx, 171, r.cy, { emissive: '#eeb053', emissiveIntensity: .65 }));
    const bulb = new T3.PointLight('#ffbd63', 1.6, 480, 2);
    bulb.position.set(r.cx, 155, r.cy);
    vestibule.add(bulb);
    worldG.add(vestibule);
    // Five-storey residential shell; the playable vestibule occupies the ground floor.
    const house = new T3.Group();
    house.name = 'TomskStartHouse';
    const front = r.x + r.w + 9;
    const add = (w, h, d, c, x, y, z, o) => house.add(box(w, h, d, c, x, y, z, o));
    // Keep the ground floor hollow: a solid building block lets the camera and
    // characters enter its faces. The vestibule below is the actual interior.
    add(18, 620, r.h + 24, '#777865', r.x - 9, 510, r.cy);
    for (const z of [r.y - 9, r.y + r.h + 9]) add(r.w + 20, 620, 18, '#777865', r.cx, 510, z);
    // Front panels and recessed windows face the courtyard (+X).
    for (let floor = 0; floor < 5; floor++) {
      const base = floor * 160;
      for (let col = 0; col < 5; col++) {
        const z = r.y + (col + .5) * r.h / 5;
        if (floor === 0 && col === 2) continue;
        add(12, 156, r.h / 5 - 2, col % 2 ? '#96907a' : '#747961', front, base + 80, z);
        add(5, 83, 61, '#464b46', front + 8, base + 91, z);
        const lit = (floor * 7 + col * 3) % 6 === 1;
        add(3, 73, 51, lit ? '#baa16e' : '#323e40', front + 12, base + 91, z,
          lit ? { emissive: '#e6b563', emissiveIntensity: .35 } : undefined);
        for (const dz of [-29, 0, 29]) add(7, 83, 3, '#c0ba9e', front + 14, base + 91, z + dz);
        for (const dy of [-42, 42]) add(9, 4, 65, '#c0ba9e', front + 14, base + 91 + dy, z);
        add(14, 5, 69, '#aaa896', front + 17, base + 47, z);
      }
      add(10, 3, r.h + 22, '#5d6257', front + 7, base + 159, r.cy);
    }
    // Roof slab, parapet and rooftop service structures.
    add(r.w + 40, 16, r.h + 44, '#92938a', r.cx, 824, r.cy);
    add(r.w + 25, 5, r.h + 29, '#454b4d', r.cx, 835, r.cy);
    for (const z of [r.y - 16, r.y + r.h + 16]) add(r.w + 40, 23, 9, '#85877e', r.cx, 847, z);
    for (const x of [r.x - 16, front + 7]) add(9, 23, r.h + 40, '#85877e', x, 847, r.cy);
    add(90, 65, 75, '#8a8370', r.x + 100, 868, r.cy);
    add(100, 7, 85, '#656a68', r.x + 100, 904, r.cy);
    for (const z of [r.y + 65, r.y + r.h - 70]) {
      add(22, 48, 23, '#686e69', r.cx, 861, z);
      add(34, 6, 35, '#93968d', r.cx, 888, z);
      add(8, 796, 8, '#646e65', front + 18, 402, z < r.cy ? r.y - 5 : r.y + r.h + 5);
    }
    // Portal preserves the existing door opening and its collision.
    for (const dz of [-113, 113]) add(45, 150, 14, '#99947f', front + 13, 75, r.cy + dz);
    add(93, 12, 250, '#737970', front + 35, 156, r.cy);
    add(8, 9, 28, '#e7bc72', front + 18, 137, r.cy, { emissive: '#ffc469', emissiveIntensity: .8 });
    add(5, 34, 28, '#756d53', front + 18, 82, r.cy + 145);
    for (let i = 0; i < 5; i++) add(2, 9, 7, '#d1c7a5', front + 22, 73 + i % 3 * 8, r.cy + 137 + i % 2 * 11);
    worldG.add(house);
    entranceSolids.length = 0;
    worldG.updateMatrixWorld(true);
    for (const group of [house, vestibule]) {
      for (const part of group.children) {
        if (part.isMesh) entranceSolids.push(new T3.Box3().setFromObject(part));
      }
    }
  }
  // стены: забор-модель, земляной вал или текстурные панели с кромкой
  const wc = { grave: { model: 'p_fence', mh: 92 }, swamp: { h: 44, col: '#2a2415' } }[k] || {}, WH = wc.h || 120, fen = wc.model && MDL[wc.model];
  const tex = wallTex(k), wm = wc.col ? new T3.MeshStandardMaterial({ color: wc.col, roughness: 1 }) : new T3.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: .4, roughness: .9 });
  const bx = G('box', () => new T3.BoxGeometry(1, 1, 1)), WL = [];
  for (const r of LV.rects) {
    if (S.ch === 0 && r.kind === 'start') continue;
    for (const [hz, c, out] of [[1, r.y, -14], [1, r.y + r.h, 14], [0, r.x, -14], [0, r.x + r.w, 14]]) {
      const a0 = hz ? r.x : r.y, a1 = a0 + (hz ? r.w : r.h); let run = null;
      for (let a = a0; a <= a1 + 20; a += 20) {
        const mid = Math.min(a + 10, a1 - 1), fr = a < a1 && !(hz ? okPos(mid, c + out, -1) : okPos(c + out, mid, -1));
        if (fr && run == null) run = a;
        if (!fr && run != null) {
          const end = Math.min(a, a1);
          for (let s = run; s < end; s += 200) { const L = Math.min(200, end - s), ctr = s + L / 2, off = c + out * .55; WL.push(hz ? [ctr, off, L, 16, 1, out] : [off, ctr, 16, L, 0, out]); }
          run = null;
        }
      }
    }
  }
  if (fen) for (const q of WL) { const p = prop(wc.model, wc.mh), L = q[4] ? q[2] : q[3]; p.children[0].scale.x = L / fen.w; p.position.set(q[0], 0, q[1]); p.rotation.y = q[4] ? 0 : Math.PI / 2; worldG.add(p); }
  else {
    const im = new T3.InstancedMesh(bx, wm, WL.length), o = new T3.Object3D(), tr = TRIM[k], it = tr ? new T3.InstancedMesh(bx, mat(tr[0], tr[1] ? { emissive: tr[0], emissiveIntensity: tr[1] } : undefined), WL.length) : null;
    WL.forEach((q, i) => { o.position.set(q[0], WH / 2, q[1]); o.scale.set(q[2], WH, q[3]); o.updateMatrix(); im.setMatrixAt(i, o.matrix); if (it) { o.position.y = WH + 3; o.scale.set(q[2] + 6, 6, q[3] + 6); o.updateMatrix(); it.setMatrixAt(i, o.matrix); } });
    im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; worldG.add(im); if (it) { it.frustumCulled = false; worldG.add(it); }
  }
  // мелочь вдоль стен
  { const wd = WDECO[k]; let n = 0; if (wd && MDL[wd[0][0]]) for (const q of WL) {
      const L = q[4] ? q[2] : q[3]; if (L < 150 || Math.random() > .6 || n++ > 100) continue;
      const d = wd[Math.floor(Math.random() * wd.length)], p = prop(d[0], d[1] * (.85 + Math.random() * .3)), sg = q[5] < 0 ? 1 : -1, t = (Math.random() - .5) * L * .6; if (!p) continue;
      if (q[4]) { p.position.set(q[0] + t, 0, q[1] + sg * 34); p.rotation.y = sg > 0 ? 0 : Math.PI; } else { p.position.set(q[0] + sg * 34, 0, q[1] + t); p.rotation.y = sg > 0 ? Math.PI / 2 : -Math.PI / 2; }
      worldG.add(p); } }
  // арена босса: кольцо и колонны
  const pil = k === 'grave' || k === 'swamp' ? 'p_pillar' : 'p_Pillar_A';
  for (const r of LV.rooms) if (r.kind === 'boss') {
    const rg = new T3.Mesh(new T3.RingGeometry(300, 316, 64).rotateX(-Math.PI / 2), new T3.MeshBasicMaterial({ color: '#ff3b3b', transparent: true, opacity: .5 })); rg.position.set(r.cx, 1.2, r.cy); worldG.add(rg);
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const px = r.cx + dx * (r.w / 2 - 80), pz = r.cy + dy * (r.h / 2 - 80), pm = prop(pil, 170);
      if (pm) { pm.position.set(px, 0, pz); worldG.add(pm); } else worldG.add(cyl(26, 32, 150, '#2a2c3a', px, 75, pz));
      worldG.add(sph(16, '#ff3b3b', px, 186, pz, { emissive: '#ff3b3b', emissiveIntensity: 1 })); { const gq = glowS('#ff3030', 230); gq.position.set(px, 186, pz); worldG.add(gq); }
    }
  }
  for (const d of deco) {
    const x = d.x, z = d.y, s = d.s, v = d.v; let p = null;
    if (d.cover) {
      p = new T3.Group();
      p.position.set(x, 0, z);
      p.add(box(88, 72, 76, '#545b67', 0, 36, 0), box(88, 6, 76, '#bac8db', 0, 74, 0));
    } else if (!d.solid) {
      if (d.k === 'swamp' && MDL.p_waterlily_A) { p = new T3.Group(); const w = sph(1, '#0b1a12', 0, 0, 0, { roughness: .08, metalness: .3, transparent: true, opacity: .85 }); w.scale.set(74 * s, 1.2, 44 * s); w.castShadow = false; const ly = prop('p_waterlily_A', 7); ly.position.set((v - .5) * 50, 1, (v - .5) * 20); p.add(w, ly); p.position.set(x, .6, z); }
      else if (d.k === 'snow') { p = sph(1, '#7f93b4', x, 0, z); p.scale.set(60 * s, 9 * s, 36 * s); p.castShadow = false; }
      else if (d.k === 'swamp') { p = sph(1, '#3d6b2e', x, 0, z, { transparent: true, opacity: .75 }); p.scale.set(80 * s, 4, 46 * s); p.castShadow = false; }
      else if (d.k === 'core') { p = box(18, 18, 18, '#' + new T3.Color().setHSL(v, .6, .6).getHexString(), 0, 0, 0, { emissive: '#445', emissiveIntensity: .5 }); p.userData = { a: v * TAU, rr: 150 + v * 800, h: 130 + v * 220, sp: (v > .5 ? 1 : -1) * .15 }; spinners.push(p); }
    } else if (d.pd && MDL[d.pd[0]]) { p = prop(d.pd[0], d.pd[1], d.pd[3]); p.position.set(x, 0, z); p.rotation.y = v * 40; if (/light|lantern|lamp/.test(d.pd[0])) { const gq = glowS(k === 'neon' ? '#3cdcff' : k === 'server' ? '#2affb0' : '#ffcf7a', 190); gq.position.y = d.pd[1] * .93; p.add(gq); glows.push(gq); } }
    else {
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
  skyline(th.deco);
  // дальний фон: силуэты, облака, машины
  { const nat = k === 'swamp' || k === 'grave', list = nat ? ['p_mountain_B', 'p_mountain_A_grass_trees', 'p_hills_A_trees'] : k === 'server' ? ['p_basemodule_A', 'p_cargodepot_A'] : k === 'core' || k === 'basement' ? null : BLD, sc = '#' + hor.clone().multiplyScalar(k === 'glass' ? .72 : 1.55).getHexString();
    if (list && MDL[list[0]]) for (let i = 0; i < 38; i++) { const a = i / 38 * TAU + Math.random() * .12, p = prop(list[i % list.length], nat ? 420 + Math.random() * 520 : 520 + Math.random() * 900, { far: 1, sil: sc }); if (!p) continue;
      p.position.set(LV.w / 2 + Math.cos(a) * (LV.w / 2 + 700 + Math.random() * 900), -4, LV.h / 2 + Math.sin(a) * (LV.h / 2 + 700 + Math.random() * 900)); p.rotation.y = nat ? Math.random() * 6 : 0; worldG.add(p); }
    if (MDL.p_cloud_big && (k === 'snow' || nat || k === 'chart' || k === 'glass')) for (let i = 0; i < 10; i++) { const p = prop('p_cloud_big', 110 + Math.random() * 120, { far: 1, sil: '#' + hor.clone().multiplyScalar(k === 'glass' ? 1.25 : 2.2).getHexString() });
      p.position.set(Math.random() * (LV.w + 3000) - 1500, 520 + Math.random() * 260, Math.random() * (LV.h + 3000) - 1500); worldG.add(p); movers.push({ m: p, vx: 8 + Math.random() * 16, x0: -1500, x1: LV.w + 1500 }); }
    if ((k === 'snow' || k === 'neon') && MDL.p_car_sedan) for (const r of LV.rooms) if (r.kind === 'fight' || r.kind === 'boss') for (let i = 0; i < 2; i++) { const dir = i ? 1 : -1, p = prop(i ? 'p_car_sedan' : 'p_car_hatchback', 44, k === 'neon' ? { tint: '#ff3cc8', emi: .3 } : null);
      p.position.set(r.x + Math.random() * r.w, 0, (i ? r.y - 96 : r.y + r.h + 96)); p.rotation.y = dir * Math.PI / 2; worldG.add(p); movers.push({ m: p, vx: dir * (130 + Math.random() * 90), x0: r.x - 500, x1: r.x + r.w + 500, car: 1 }); } }
  for (const o of ents) {
    const g = new T3.Group();
    if (o.k === 'npc' || o.k === 'seva') {
      const c = o.k === 'seva' ? '#ffae3b' : NPCS[o.id].c;
      const mg = inst(o.k === 'seva' ? 'barb' : NPCS[o.id].mdl || NPC_MODELS[(o.id.charCodeAt(0) + o.id.length * 3) % NPC_MODELS.length], 72, o.k === 'seva' ? { show: /Mug|Hat/, tint: '#ffae3b', mix: .3 } : { tint: c, mix: .45 });
      if (mg) { g.add(mg, emo(o.k === 'seva' ? '🔧' : '🎤', 26, 100)); statics.push(mg); }
      else g.add(cyl(13, 17, 36, c, 0, 18, 0), sph(9.5, '#e8c39e', 0, 44, 0), cyl(10, 10.5, 5, '#22242e', 0, 51, 0), box(9, 2, 14, '#22242e', 8, 49, 0), emo(o.k === 'seva' ? '🔧' : '🎤', 26, 80));
      if (o.k === 'seva') { const b = new T3.Group(); b.add(box(44, 26, 28, '#3a2718', 0, 13, 0), box(30, 2, 20, '#49e0ff', 0, 27, 0, { emissive: '#49e0ff', emissiveIntensity: .9 })); b.position.set(o.x, 0, o.y + 50); worldG.add(b); }
    } else if (o.k === 'frontDoor') {
      g.add(box(17, 120, 215, '#303a35', 0, 60, 0),
        box(19, 31, 67, '#505d5c', 0, 91, -24),
        box(10, 8, 24, '#9c8150', -12, 58, 67));
    } else if (o.k === 'power') g.add(box(58, 76, 28, '#46534e', 0, 38, 0), emo('⚡', 28, 94));
    else if (o.k === 'chest') g.add(box(46, 26, 30, '#7a4a1e', 0, 13, 0), box(48, 8, 32, '#ffd23b', 0, 28, 0, { metalness: .7, roughness: .3, emissive: '#553a00', emissiveIntensity: .7 }), emo(o.loot.hp ? '💛' : o.loot.tapes ? '📀' : '🎁', 24, 58));
    else if (o.k === 'lore') g.add(emo('📼', 36, 30));
    else if (o.k === 'swall') { for (const t of [-78, 0, 78]) { const rk = prop(t ? 'p_rock_single_C' : 'p_rock_single_A', 120 + Math.random() * 30) || box(80, 120, 60, '#5a5a5a', 0, 60, 0); rk.position.set(o.hz ? t : 0, rk.position.y, o.hz ? 0 : t); rk.rotation.y = Math.random() * 6; g.add(rk); } }
    else if (o.k === 'stash') g.add(emo('✨', 26, 14));
    else if (o.k === 'tgt') { const t = prop('p_target', 56) || (() => { const q = new T3.Group(); q.add(cyl(26, 26, 5, '#e8e8e8', 0, 28, 0), cyl(14, 14, 6, '#ff3b3b', 0, 28, 0)); q.children.forEach(c => { c.rotation.x = Math.PI / 2; }); return q; })(); t.position.set(o.vx - o.x, 46, o.vy - o.y); t.rotation.y = o.ry; g.add(t, emo('🎯', 22, 120)); g.children[1].position.set(o.vx - o.x, 120, o.vy - o.y); }
    else if (o.k === 'brk') { const b = prop(o.ex ? 'p_Barrel_A' : 'p_Box_A', o.ex ? 44 : 36, o.ex ? { tint: '#ff3b3b', emi: .35 } : null) || box(34, 34, 34, o.ex ? '#c0392b' : '#8a5a2a', 0, 17, 0); g.add(b); if (o.ex) g.add(emo('💥', 20, 62)); g.rotation.y = o.x; }
    else if (o.k === 'portal') {
      g.add(mesh(new T3.TorusGeometry(54, 6, 10, 40), new T3.MeshStandardMaterial({ color: '#49e0ff', emissive: '#49e0ff', emissiveIntensity: 1 }), 0, 62, 0));
      const d = new T3.Mesh(new T3.CircleGeometry(50, 32), new T3.MeshBasicMaterial({ color: '#49e0ff', transparent: true, opacity: .25, side: T3.DoubleSide, depthWrite: false })); d.position.y = 62; g.add(d);
    }
    g.position.set(o.x, 0, o.y); o.m = g; worldG.add(g);
  }
  window.__bake = bakeStatic(worldG, new Set(ents.map(o => o.m).concat(movers.map(q => q.m), spinners).filter(Boolean)));
}
function tomskArch(room) {
  return S.ch === 0 && room === LV.main[2];
}
function tomskOpening(room) {
  return S.ch === 0 && room === LV.main[1];
}
const TOMSK_DRILLS = [
  { action: 'light', title: 'Лёгкий удар', hint: () => 'Подойди к боту, наведи камеру и попади ЛКМ' },
  { action: 'heavy', title: 'Тяжёлый удар', hint: () => 'Попади ПКМ · удерживай кнопку, чтобы зарядить удар' },
  { action: 'dodge', title: 'Перекат', hint: () => 'Подпусти бота и нажми [' + KN('dodge') + '] в конце замаха' },
  { action: 'block', title: 'Блок', hint: () => 'Зажми [' + KN('block') + '] и дождись удара · нажатие перед попаданием парирует' },
  { action: 'throw', title: 'Бросок и возврат', hint: () => 'Наведи камеру, попади броском [' + KN('thr') + '] и верни биту той же клавишей' },
  { title: 'Проверка', hint: () => 'Зачисти двор · хейтер атакует издалека, боты идут в ближний бой' }
];
const TOMSK_GUIDE = [
  ['ЛКМ', 'Подойди на расстояние взмаха биты и наведи камеру на бота. Нажми левую кнопку мыши, чтобы ударить. Несколько нажатий подряд складываются в серию.'],
  ['ПКМ', 'Нажми правую кнопку мыши и отпусти её, чтобы ударить. Если подержать кнопку, Пахан зарядит удар. Подойди к боту и попробуй попасть.'],
  ['dodge', 'Подпусти бота и посмотри на его замах. Перекатись, когда удар вот-вот попадёт. В начале переката Пахан на короткое время становится неуязвим.'],
  ['block', 'Зажми блок до того, как бот ударит. Блок уменьшает урон. Если нажать кнопку прямо перед попаданием, получится парирование.'],
  ['thr', 'Наведи камеру на бота и брось биту. После попадания нажми ту же кнопку, чтобы вернуть её. Бита может задеть врага и на обратном пути.'],
  ['', 'Во дворе два бота и хейтер. Боты подходят вплотную, а хейтер стреляет издалека. Выбирай приёмы по ситуации и зачисти двор.']
];
function openTomskGuide() {
  const [key, body] = TOMSK_GUIDE[fs.i];
  $('guideCount').textContent = 'ТРЕНИРОВКА · ' + (fs.i + 1) + ' / ' + TOMSK_DRILLS.length;
  $('guideTitle').textContent = TOMSK_DRILLS[fs.i].title;
  $('guideKey').textContent = key && key !== 'ЛКМ' && key !== 'ПКМ' ? KN(key) : key;
  $('guideKey').hidden = !key;
  $('guideBody').textContent = body;
  $('guideGo').textContent = key ? 'Попробовать' : 'Начать бой';
  mode = 'guide';
  M.l = M.r = false;
  show('tomskGuide', true);
  $('guideSkip').hidden = fs.i !== 0;
  $('guideGo').focus();
  guideMusic(true);
}
function beginTomskPractice() {
  if (mode !== 'guide') return;
  audio();
  show('tomskGuide', false);
  $('guideGo').blur();
  $('guideSkip').blur();
  M.l = M.r = false;
  mode = 'fight';
  guideMusic(false);
  spawnWave();
  lock();
}
$('guideGo').addEventListener('click', beginTomskPractice);
$('guideSkip').addEventListener('click', () => {
  if (mode !== 'guide' || fs.i !== 0) return;
  fs.i = TOMSK_DRILLS.length - 1;
  P.hp = maxHp();
  beginTomskPractice();
});
function tomskDrillPending() {
  return fs?.training && TOMSK_DRILLS[fs.i].action && !fs.drillDone;
}
function completeTomskDrill(action) {
  if (!tomskDrillPending() || TOMSK_DRILLS[fs.i].action !== action) return;
  fs.drillDone = true;
  float(P.x, P.y - 65, 'Приём засчитан', '#7dff7d', 1.5);
}
function tomskHint() {
  if (!fs && tomskOpening(objRoom)) {
    return 'Камера — мышь · шаг — ' + [KN('up'), KN('left'), KN('down'), KN('right')].join(' / ') + ' · иди за жёлтой стрелкой';
  }
  if (!fs?.training) return '';
  if (fs.done) return 'Тренировка пройдена';
  const drill = TOMSK_DRILLS[fs.i];
  return (fs.i + 1) + '/' + TOMSK_DRILLS.length + ' · ' + drill.title + ' · ' +
    (fs.drillDone ? 'Приём засчитан. Добей бота.' : drill.hint());
}
function drawNav() {
  X.textBaseline = 'alphabetic';
  // цель
  let ob = '';
  if (fs?.arch && !fs.done) ob = 'Продержись у арки до конца отсчёта';
  else if (fs && !fs.done) ob = fs.boss ? 'Победи: ' + fs.boss.d.n : (fs.cb && fs.room.kind === 'side' ? 'Зачисти тупик' : 'Зачисти комнату');
  else if (exitOpen()) ob = 'Войди в портал — к следующему серверу';
  else if (tomskOpening(objRoom)) ob = 'Выйди из подъезда во двор';
  else if (tomskArch(objRoom)) ob = 'Доберись до прохода к арке';
  else if (S.ch === 0 && objRoom?.kind === 'boss') ob = 'Иди к арке · там Курьер';
  else if (objRoom) ob = objRoom.kind === 'boss' ? 'Иди к арене босса' : 'Двигайся дальше — к следующей комнате';
  X.textAlign = 'left'; let y = 34;
  if (ob) { X.font = 'bold 15px "Russo One","Segoe UI"'; X.fillStyle = '#ffd23b'; X.fillText('◆ ' + ob, 30, y); y += 22; }
  X.font = '13px "Russo One","Segoe UI"';
  if (S.ch === 0 && !fs && tomskArch(objRoom) && !S.done.tomskPower) {
    X.fillStyle = '#ffd480';
    X.fillText('◇ Щитовая за северным тупиком · включи фонари у арки', 30, y);
    y += 19;
  }
  if (S.ch === 0 && !fs && S.step >= LV.main[1].step) {
    const rooms = LV.sides.filter(r => r.side.chest && !S.done[r.side.id + 'c']);
    if (rooms.length) {
      X.fillStyle = '#ffd23b';
      X.fillText('◇ Тайники Томска: ' + rooms.length + ' · ищи золотые точки на миникарте', 30, y);
      y += 19;
    }
  }
  for (const o of ents) if (o.k === 'npc' && S.q[o.id] && S.q[o.id].st === 1) {
    const n = NPCS[o.id], q = S.q[o.id], rd = qReady(o.id);
    X.fillStyle = rd ? '#7dff7d' : '#c3ccdb'; X.fillText('◇ ' + (rd ? 'Вернись к ' + n.n : n.q.txt + (n.q.type === 'kill' ? '  (' + q.n + '/' + n.q.n + ')' : '')), 30, y); y += 19;
  }
  const lc = [0, 1].filter(i => S.done['c' + S.ch + 'lore' + i]).length; X.fillStyle = '#8d97aa'; X.fillText('📼 кассеты: ' + lc + ' / 2     ✨ секреты: ' + ['sec', 'st0', 'st1'].filter(q => S.done['c' + S.ch + q]).length + ' / ' + (LV.main[2] ? 3 : 2), 30, y);
  // стрелка к цели
  const tg = !fs && (exitOpen() ? ents.find(o => o.k === 'portal') : objRoom ? { x: objRoom.cx, y: objRoom.cy } : null);
  if (tg && dist(tg, P) > 260) { const a = ang(P, tg), q = proj(P.x + Math.cos(a) * 90, P.y + Math.sin(a) * 90, 4), q2 = proj(P.x + Math.cos(a) * 130, P.y + Math.sin(a) * 130, 4), sa = Math.atan2(q2.y - q.y, q2.x - q.x);
    X.save(); X.translate(q2.x, q2.y); X.rotate(sa); X.globalAlpha = .6 + .3 * Math.sin(performance.now() / 200); X.fillStyle = '#ffd23b'; X.beginPath(); X.moveTo(16, 0); X.lineTo(-8, -9); X.lineTo(-3, 0); X.lineTo(-8, 9); X.closePath(); X.fill(); X.restore(); }
  // подсказка действия
  if (prompt) { X.textAlign = 'center'; X.font = 'bold 18px "Russo One","Segoe UI"'; const w = X.measureText(prompt).width + 36; X.fillStyle = 'rgba(8,10,16,.85)'; X.fillRect(W / 2 - w / 2, H - 150, w, 36); X.strokeStyle = '#ffd23b'; X.lineWidth = 1; X.strokeRect(W / 2 - w / 2, H - 150, w, 36); X.fillStyle = '#ffd23b'; X.fillText(prompt, W / 2, H - 126); }
  // мини-карта
  const k = Math.min(210 / LV.w, 130 / LV.h), mx = W - 30 - LV.w * k, my = 92;
  X.fillStyle = 'rgba(0,0,0,.5)'; X.fillRect(mx - 6, my - 6, LV.w * k + 12, LV.h * k + 12);
  for (const r of LV.rects) { if (r.secret && !S.done[LV.sec.side.id]) continue; X.fillStyle = r.secret ? 'rgba(255,210,59,.45)' : r === objRoom ? 'rgba(255,210,59,.8)' : r.kind === 'cor' ? 'rgba(255,255,255,.2)' : r.kind === 'boss' ? 'rgba(255,80,80,.5)' : r.kind === 'side' ? 'rgba(120,200,255,.3)' : 'rgba(255,255,255,.34)'; X.fillRect(mx + r.x * k, my + r.y * k, Math.max(2, r.w * k), Math.max(2, r.h * k)); }
  for (const o of ents) {
    if (o.k === 'tgt' || o.k === 'brk' || o.k === 'swall' || o.k === 'stash' || (o.room && o.room.secret && !S.done[LV.sec.side.id])) continue;
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
const EWPN = { troll: { r: 'p_Skeleton_Axe' }, clipper: { r: 'p_Skeleton_Blade', l: 'p_Skeleton_Blade' }, hater: { r: 'p_Skeleton_Staff' }, ghost: { r: 'p_Skeleton_Blade' }, strike: { r: 'p_Skeleton_Axe', l: 'p_Skeleton_Shield_Small_A' }, dislike: { r: 'p_Skeleton_Axe' } };
const ESHOW = { mod: /Rectangle_Shield|^1H_Sword$/, major: /^2H_Sword$/, hype: /2H_Staff/, farmer: /1H_Wand|Spellbook_open/, courier: /Knife/, lawyer: /Badge_Shield/ };
const EATK = { clipper: 'dual', troll: 'chop', ghost: 'stabE', mod: 'batk', lawyer: 'thr', hater: 'cast', farmer: 'sum' };
const BATK = { mines: 'thr', shock: 'chop', beam: 'cast', slam: 'chop', leap: 'chop', charge: 'run', fan: 'cast', burst: 'raise', spiral: 'raise', rain: 'raise', summon: 'sum', tp: 'taunt', homing: 'thr', wall: 'raise' };
const ANIM = { idle: ['Idle'], run: ['Running_A', 'Running'], atk: ['1H_Melee_Attack_Slice_Horizontal', 'Punch'], atk2: ['1H_Melee_Attack_Chop', 'Punch'], heavy: ['2H_Melee_Attack_Chop', 'Punch'],
  spin: ['2H_Melee_Attack_Spin', 'Dance'], hit: ['Hit_A', 'No'], death: ['Death_A', 'Death'], dodge: ['Dodge_Forward', 'Jump'], block: ['Blocking', 'Idle'], cast: ['Spellcast_Shoot', 'Wave'],
  thr: ['Throw', 'Punch'], cheer: ['Cheer', 'ThumbsUp'], dual: ['Dualwield_Melee_Attack_Slice', '1H_Melee_Attack_Slice_Horizontal', 'Punch'], batk: ['Block_Attack', '1H_Melee_Attack_Chop', 'Punch'], stabE: ['1H_Melee_Attack_Stab', 'Punch'], chop: ['2H_Melee_Attack_Chop', 'Punch'],
  raise: ['Spellcast_Raise', 'Spellcast_Shoot', 'Wave'], sum: ['Spellcast_Summon', 'Spellcast_Raise', 'Wave'], taunt: ['Taunt', 'Cheer', 'ThumbsUp'], spawn: ['Spawn_Ground', 'Idle'], deathB: ['Death_B', 'Death_A', 'Death'],
  b1: ['2H_Melee_Attack_Slice'], b3: ['2H_Melee_Attack_Spin'], bh: ['2H_Melee_Attack_Chop'], bi: ['2H_Melee_Idle', 'Idle'], m1: ['1H_Melee_Attack_Slice_Horizontal'], m2: ['1H_Melee_Attack_Slice_Diagonal'], m3: ['1H_Melee_Attack_Stab'],
  mh: ['2H_Melee_Attack_Spin'], ms: ['2H_Melee_Attack_Spinning', '2H_Melee_Attack_Spin'], v1: ['Throw'], vh: ['Spellcast_Shoot'], p1: ['Unarmed_Melee_Attack_Punch_A'], p2: ['Unarmed_Melee_Attack_Punch_B'], kick: ['Unarmed_Melee_Attack_Kick'],
  dF: ['Dodge_Forward'], dB: ['Dodge_Backward', 'Dodge_Forward'], dL: ['Dodge_Left', 'Dodge_Forward'], dR: ['Dodge_Right', 'Dodge_Forward'], hitB: ['Hit_B', 'Hit_A'], jump: ['Jump_Full_Short'] };
const ROLLA = new T3.Vector3(), ROLLO = new T3.Vector3();
let HW = null, PTI = null, SHC = null, glows = [];
const KK = { vanek: 1, kent: 1, mage: 1, barb: 1, knight: 1, skmage: 1, skmin: 1, skrog: 1, skwar: 1 };
// склейка геометрий: items = [{ g, m }] (m — матрица или null), у всех одинаковый набор атрибутов
function mergeGeos(items) {
  const names = Object.keys(items[0].g.attributes); let vt = 0, it = 0;
  for (const q of items) { if (Object.keys(q.g.attributes).length !== names.length) return null; vt += q.g.attributes.position.count; it += q.g.index ? q.g.index.count : q.g.attributes.position.count; }
  const out = new T3.BufferGeometry(), v = new T3.Vector3();
  for (const n of names) {
    const a0 = items[0].g.attributes[n], sz = a0.itemSize;
    if (!items.every(q => q.g.attributes[n] && q.g.attributes[n].itemSize === sz && q.g.attributes[n].normalized === a0.normalized && (q.g.attributes[n].array || q.g.attributes[n].data.array).constructor === (a0.array || a0.data.array).constructor)) return null;
    const arr = new (a0.array || a0.data.array).constructor(vt * sz); let off = 0;
    for (const q of items) {
      const a = q.g.attributes[n];
      if (a.isInterleavedBufferAttribute) { for (let i = 0; i < a.count; i++) { arr[off + i * sz] = a.getX(i); if (sz > 1) arr[off + i * sz + 1] = a.getY(i); if (sz > 2) arr[off + i * sz + 2] = a.getZ(i); if (sz > 3) arr[off + i * sz + 3] = a.getW(i); } }
      else arr.set(a.array.subarray(0, a.count * sz), off);
      if (q.m && (n === 'position' || n === 'normal')) {
        const nm = n === 'normal' ? new T3.Matrix3().getNormalMatrix(q.m) : null;
        for (let i = 0; i < a.count; i++) { v.fromArray(arr, off + i * sz); if (nm) v.applyMatrix3(nm).normalize(); else v.applyMatrix4(q.m); v.toArray(arr, off + i * sz); }
      }
      off += a.count * sz;
    }
    out.setAttribute(n, new T3.BufferAttribute(arr, sz, a0.normalized));
  }
  const idx = new (vt > 65535 ? Uint32Array : Uint16Array)(it); let io = 0, vb = 0;
  for (const q of items) { const c = q.g.attributes.position.count; if (q.g.index) { const ia = q.g.index.array; for (let i = 0; i < q.g.index.count; i++) idx[io++] = ia[i] + vb; } else for (let i = 0; i < c; i++) idx[io++] = i + vb; vb += c; }
  out.setIndex(new T3.BufferAttribute(idx, 1)); out.computeBoundingSphere(); out.computeBoundingBox(); return out;
}
// части персонажа → один SkinnedMesh на материал: скиннинговые части склеиваются как есть,
// жёсткие детали, прикреплённые к костям (шлемы, челюсти, детали робота), получают вес 1 на свою кость
function mergeSkinned(root) {
  root.updateMatrixWorld(true);
  const morph = q => q.geometry.morphAttributes && Object.keys(q.geometry.morphAttributes).length;
  const skins = []; root.traverse(q => { if (q.isSkinnedMesh && !morph(q)) skins.push(q); });
  let skel, bm;
  if (skins.length) { skel = skins[0].skeleton; bm = skins[0].bindMatrix.clone(); }
  else { const bones = []; root.traverse(q => { if (q.isBone) bones.push(q); }); if (!bones.length) return; skel = new T3.Skeleton(bones); bm = new T3.Matrix4(); }
  const bi = new Map(skel.bones.map((x, i) => [x, i])), bmInv = bm.clone().invert(), ref = skins.length ? skins[0].geometry.attributes : null;
  const names = ref ? Object.keys(ref) : ['position', 'normal', 'uv', 'skinIndex', 'skinWeight'];
  const IdxT = ref ? ref.skinIndex.array.constructor : Uint16Array, WT = ref ? ref.skinWeight.array.constructor : Float32Array, wn = ref ? ref.skinWeight.normalized : false;
  const one = !wn ? 1 : WT === Uint8Array ? 255 : WT === Uint16Array ? 65535 : 1;
  const grp = new Map(), add = (q, it) => { const k = q.material.uuid; (grp.get(k) || grp.set(k, []).get(k)).push(it); };
  root.traverse(q => {
    if (!q.isMesh || Array.isArray(q.material) || HIDE.test(q.name) || morph(q)) return;
    if (q.isSkinnedMesh) { if (q.bindMatrix.equals(bm) && q.skeleton.bones[0] === skel.bones[0] && q.skeleton.bones.length === skel.bones.length) add(q, { q, g: q.geometry, m: null }); return; }
    let bn = q.parent; while (bn && !bi.has(bn)) bn = bn.parent; if (!bn) return;
    const g0 = q.geometry, n = g0.attributes.position.count, g = new T3.BufferGeometry(), j = bi.get(bn);
    for (const nm of names) {
      if (nm === 'skinIndex') { const arr = new IdxT(n * 4); for (let i = 0; i < n; i++) arr[i * 4] = j; g.setAttribute(nm, new T3.BufferAttribute(arr, 4)); }
      else if (nm === 'skinWeight') { const arr = new WT(n * 4); for (let i = 0; i < n; i++) arr[i * 4] = one; g.setAttribute(nm, new T3.BufferAttribute(arr, 4, wn)); }
      else if (g0.attributes[nm]) g.setAttribute(nm, g0.attributes[nm]); else return;
    }
    if (g0.index) g.setIndex(g0.index);
    const m = bmInv.clone().multiply(skel.boneInverses[j].clone().invert()).multiply(bn.matrixWorld.clone().invert()).multiply(q.matrixWorld);
    add(q, { q, g, m });
  });
  for (const list of grp.values()) {
    if (list.length < 2) continue;
    const g = mergeGeos(list); if (!g) continue;
    const host = list.find(it => it.q.isSkinnedMesh);
    let sm; if (host) { sm = host.q; sm.geometry = g; } else { const mt = list[0].q.material.clone(); mt.skinning = true; sm = new T3.SkinnedMesh(g, mt); sm.bind(skel, bm); root.add(sm); }
    sm.name = 'merged'; sm.castShadow = true; for (const it of list) if (it.q !== sm && it.q.parent) it.q.parent.remove(it.q);
  }
}
// статичный мир: меши с одним материалом в одном квадрате 900×900 сливаются в один
function bakeStatic(root, dyn) {
  root.updateMatrixWorld(true); const grp = new Map();
  const walk = (o, d) => { d = d || dyn.has(o);
    if (o.isMesh && !d && !o.isInstancedMesh && !o.isSkinnedMesh && o.visible && !Array.isArray(o.material) && o.geometry.attributes.position && !(o.geometry.morphAttributes && Object.keys(o.geometry.morphAttributes).length)) {
      const e = o.matrixWorld.elements, key = o.material.uuid + '|' + (o.castShadow ? 1 : 0) + (o.receiveShadow ? 1 : 0) + '|' + Object.keys(o.geometry.attributes).sort().join(',') + '|' + Math.floor(e[12] / 900) + ',' + Math.floor(e[14] / 900);
      (grp.get(key) || grp.set(key, []).get(key)).push(o);
    }
    for (const c of o.children.slice()) walk(c, d);
  };
  walk(root, false); let n0 = 0, n1 = 0;
  for (const list of grp.values()) {
    n0 += list.length; if (list.length < 2) { n1++; continue; }
    const g = mergeGeos(list.map(q => ({ g: q.geometry, m: q.matrixWorld.clone() }))); if (!g) { n1 += list.length; continue; }
    const m = new T3.Mesh(g, list[0].material); m.castShadow = list[0].castShadow; m.receiveShadow = list[0].receiveShadow; m.renderOrder = list[0].renderOrder; m.matrixAutoUpdate = false; root.add(m); n1++;
    for (const q of list) q.parent.remove(q);
  }
  root.traverse(o => { if (!dyn.has(o) && !o.isSprite) { let p = o, ok = true; while (p && p !== root) { if (dyn.has(p)) { ok = false; break; } p = p.parent; } if (ok) { o.updateMatrix(); o.matrixAutoUpdate = false; } } });
  return n0 + ' → ' + n1;
}
let corpses = [], statics = [], lastNow = 0;
function loadModels() {
  if (!T3 || !T3.GLTFLoader || !T3.SkeletonUtils || !window.GLB) return;
  const PT = {}, PMAT = {};
  for (const pk in window.GLBTEX || {}) { const t = new T3.TextureLoader().load('data:image/png;base64,' + window.GLBTEX[pk]); t.flipY = false; t.encoding = T3.sRGBEncoding; PT[pk] = t; }
  window.GLBTEX = null;
  const ld = new T3.GLTFLoader(), lt0 = performance.now(); let pend = 0; const fin = () => { mdlDone++; if (--pend <= 0) { builtDeco = null; window.__loadMs = Math.round(performance.now() - lt0); } };
  for (const k in window.GLB) {
    pend++; mdlTot++;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      fin();
    };
    const deadline = setTimeout(finish, 12000);
    try {
      const bs = atob(window.GLB[k]), u = new Uint8Array(bs.length); for (let i = 0; i < bs.length; i++) u[i] = bs.charCodeAt(i);
      ld.parse(u.buffer, '', g => {
        if (settled) return;
        try {
          const pk = window.GLBPACK && window.GLBPACK[k];
          if (pk) g.scene.traverse(q => { if (!q.isMesh || Array.isArray(q.material)) return; const key = pk + '|' + q.material.name; let cm = PMAT[key]; if (!cm) { cm = PMAT[key] = q.material; cm.map = PT[pk] || null; cm.needsUpdate = true; } q.material = cm; });
          else mergeSkinned(g.scene);
          const bb = new T3.Box3().setFromObject(g.scene); MDL[k] = { kk: !!KK[k], scene: g.scene, clips: g.animations, h: (bb.max.y - bb.min.y) || 1, w: (bb.max.x - bb.min.x) || 1, y0: bb.min.y };
        } catch (error) {
          console.warn('Model setup failed:', k, error);
        } finally { finish(); }
      }, finish);
    } catch (e) { finish(); /* модель не загрузилась — останутся фигуры из примитивов */ }
    window.GLB[k] = null;
  }
}
function play(g, key, once, dur, tok) {
  const u = g.userData; if (!u || !u.mx) return; const id = key + (tok == null ? '' : tok); if (u.key === id) return; u.key = id;
  let a = null; for (const n of ANIM[key].concat('Punch', 'Idle')) if (u.acts[n]) { a = u.acts[n]; break; } if (!a) return;
  a.reset(); a.setLoop(once ? T3.LoopOnce : T3.LoopRepeat, Infinity); a.clampWhenFinished = !!once; a.timeScale = dur ? a.getClip().duration / dur : 1; a.fadeIn(.1).play();
  if (u.cur && u.cur !== a) u.cur.fadeOut(.1); u.cur = a;
}
function inst(name, height, o) {
  const m = MDL[name]; if (!m || (m.kk && !MDL.vanek)) return null; o = o || {};
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
  let clips = m.clips;
  if (m.kk) { if (!SHC && MDL.vanek && MDL.skmage) { const seen = {}; SHC = MDL.vanek.clips.concat(MDL.skmage.clips).filter(c => !seen[c.name] && (seen[c.name] = 1)); } clips = SHC || (MDL.vanek ? MDL.vanek.clips : m.clips); }
  const mx = new T3.AnimationMixer(s), acts = {}; for (const c of clips) acts[c.name] = mx.clipAction(c);
  g.userData = { mx, acts, key: '', cur: null, top: height, mdl: 1 }; play(g, 'idle'); return g;
}
const TPROPS = {
  snow: [['p_car_hatchback', 44, 44], ['p_car_sedan', 42, 46], ['p_dumpster', 46, 30], ['p_streetlight', 130, 9], ['p_bench', 28, 28], ['p_trash_A', 30, 13], ['p_streetlight', 130, 9]],
  basement: [['p_couch', 34, 40], ['p_armchair', 36, 26], ['p_cabinet_medium', 60, 30], ['p_shelf_B_large_decorated', 84, 32], ['p_lamp_standing', 70, 10], null],
  neon: [null, null, ['p_bench', 28, 28, { tint: '#ff3cc8', emi: .5 }], ['p_streetlight', 130, 9, { tint: '#3cdcff', emi: .6 }]],
  swamp: [['p_tree_dead_large', 170, 14], ['p_tree_dead_medium', 120, 12], ['p_post_skull', 60, 10], null],
  glass: [['p_table_medium', 34, 36], ['p_cabinet_medium', 60, 30], ['p_couch', 34, 40], ['p_lamp_standing', 70, 10], ['p_armchair', 36, 26]],
  grave: [['p_grave_A', 50, 24], ['p_grave_B', 50, 24], ['p_gravestone', 46, 16], ['p_coffin', 26, 34], ['p_lantern_standing', 70, 10], ['p_crypt', 110, 62], ['p_pumpkin_orange_jackolantern', 26, 16]],
  server: [['p_containers_A', 60, 42], ['p_cargo_A_stacked', 70, 36], ['p_lights', 110, 14], null],
  chart: [null, null, ['p_trash_A', 30, 13]], core: [null] };
const BLD = ['p_building_A', 'p_building_C', 'p_building_E', 'p_building_G'];
const SKY = { snow: { m: BLD.concat('p_watertower'), h: [260, 430] }, neon: { m: BLD, h: [280, 500], tints: ['#ff3cc8', '#3cdcff'], emi: .35 }, glass: { m: BLD, h: [380, 640], tints: ['#9cc4f0'], emi: .1 },
  chart: { m: BLD, h: [200, 540], tints: ['#ff5a32', '#ffd23b'], emi: .25 }, grave: { m: ['p_crypt', 'p_tree_dead_large', 'p_tree_dead_medium', 'p_tree_dead_large'], h: [130, 210] },
  swamp: { m: ['p_tree_dead_large', 'p_tree_dead_medium'], h: [150, 240], tints: ['#6f9a55'] }, server: { m: ['p_basemodule_A', 'p_cargodepot_A', 'p_containers_A'], h: [120, 200] }, basement: { m: ['p_shelf_B_large_decorated', 'p_cabinet_medium'], h: [120, 160] } };
const tmats = {};
function prop(name, h, o) {
  const m = MDL[name]; if (!m) return null; o = o || {};
  const g = new T3.Group(), s = m.scene.clone(true), k = h / m.h; s.scale.setScalar(k); s.position.y = -m.y0 * k; g.add(s);
  s.traverse(q => {
    if (!q.isMesh) return; q.castShadow = !o.far; q.receiveShadow = true;
    if (o.sil) { q.material = tmats['s' + o.sil] || (tmats['s' + o.sil] = new T3.MeshBasicMaterial({ color: o.sil, fog: false })); return; }
    if (o.tint || o.emi) { const key = q.material.uuid + (o.tint || '') + (o.emi || ''); let tm = tmats[key];
      if (!tm) { tm = tmats[key] = q.material.clone(); if (o.tint) tm.color.multiply(new T3.Color('#ffffff').lerp(new T3.Color(o.tint), .6)); if (o.emi) { tm.emissive = new T3.Color(o.tint || '#ffffff'); tm.emissiveIntensity = o.emi; tm.emissiveMap = tm.map; } }
      q.material = tm; }
  });
  return g;
}
function skyline(k) {
  const d = SKY[k]; if (!d || !MDL[d.m[0]]) return; let n = 0;
  const put = (x, z, ry) => {
    if (n > 110 || okPos(x, z, -150)) return; n++;
    const v = Math.random(), p = prop(d.m[Math.floor(v * d.m.length)], d.h[0] + Math.random() * (d.h[1] - d.h[0]), { far: 1, tint: d.tints ? d.tints[n % d.tints.length] : null, emi: d.emi });
    if (p) { p.position.set(x, 0, z); p.rotation.y = ry + (k === 'snow' || k === 'neon' || k === 'glass' || k === 'chart' ? 0 : v * 6); worldG.add(p); }
  };
  for (const r of LV.rooms) {
    for (let x = r.x + 60; x < r.x + r.w; x += 250 + Math.random() * 80) { put(x, r.y - 190, 0); put(x, r.y + r.h + 190, Math.PI); }
    for (let y = r.y + 60; y < r.y + r.h; y += 250 + Math.random() * 80) { put(r.x - 190, y, Math.PI / 2); put(r.x + r.w + 190, y, -Math.PI / 2); }
  }
}
/* оружие в руке героя: единицы модели, вдоль +Y кости handslot.r */
function handWeapons() {
  const W3 = {}, L = (pts, c, o) => mesh(new T3.LatheGeometry(pts.map(p => new T3.Vector2(p[0], p[1])), 14), mat(c, o));
  W3.bat = new T3.Group(); W3.bat.add(L([[0, -.25], [.055, -.25], [.06, -.2], [.036, -.15], [.036, .35], [.05, .62], [.088, .98], [.094, 1.22], [.07, 1.32], [0, 1.34]], '#d2a868', { roughness: .55 }),
    mesh(new T3.CylinderGeometry(.04, .04, .34, 12), mat('#2b5fd0', { roughness: .9 }), 0, .03, 0), mesh(new T3.CylinderGeometry(.096, .092, .06, 14), mat('#ff5a2a', { emissive: '#ff5a2a', emissiveIntensity: .5 }), 0, 1.02, 0));
  W3.mic = new T3.Group(); W3.mic.add(mesh(new T3.CylinderGeometry(.04, .05, .5, 12), mat('#22252e', { metalness: .6, roughness: .4 }), 0, .02, 0), mesh(new T3.SphereGeometry(.115, 14, 12), mat('#c8ccd4', { metalness: .85, roughness: .25 }), 0, .37, 0),
    mesh(new T3.CylinderGeometry(.062, .05, .05, 12), mat('#49e0ff', { emissive: '#49e0ff', emissiveIntensity: .8 }), 0, .27, 0),
    mesh(new T3.TubeGeometry(new T3.CatmullRomCurve3([new T3.Vector3(0, -.22, 0), new T3.Vector3(0, -.55, .08), new T3.Vector3(.1, -.95, .3), new T3.Vector3(-.05, -1.3, .25)]), 12, .016, 6), mat('#111')));
  W3.vinyl = new T3.Group(); { const d = mesh(new T3.CylinderGeometry(.42, .42, .03, 28), mat('#16161c', { metalness: .6, roughness: .25 }), 0, .4, 0), l = mesh(new T3.CylinderGeometry(.15, .15, .036, 20), mat('#e9e2ff', { emissive: '#8a7cff', emissiveIntensity: .6 }), 0, .4, 0), r = mesh(new T3.TorusGeometry(.42, .012, 6, 28), mat('#e9e2ff', { emissive: '#e9e2ff', emissiveIntensity: .7 }), 0, .4, 0);
    d.rotation.z = l.rotation.z = Math.PI / 2; r.rotation.y = Math.PI / 2; W3.vinyl.add(d, l, r); }
  return W3;
}
function enemyModel(e) {
  const mn = MODEL_OF[e.type]; if (!mn || !MDL[mn]) return null;
  const H = e.r * (e.boss ? 3.6 : 4.3), o = Object.assign({}, e.boss && !MODEL_OPT[e.type] ? { tint: e.c, mix: .6, emi: .18 } : MODEL_OPT[e.type]);
  if (e.el) { o.tint = '#ffd23b'; o.mix = .55; o.emi = .28; }
  if (ESHOW[e.type]) o.show = ESHOW[e.type];
  const g = inst(mn, H, o), ew = EWPN[e.type];
  if (ew || e.type === 'ghostv') g.traverse(q => {
    const m = /^handslot.?([rl])$/i.exec(q.name); if (!m) return; const side = m[1].toLowerCase();
    if (e.type === 'ghostv') { if (side === 'r') q.add(handWeapons().bat); return; }
    const wm = ew[side] && MDL[ew[side]]; if (wm) { const c = wm.scene.clone(true); c.traverse(z => { if (z.isMesh) z.castShadow = true; }); q.add(c); }
  });
  g.add(emo(EMO[e.type] || '?', e.boss ? e.r * 1.1 : e.r * 1.4, H + e.r * .9)); g.userData.top = H; return g;
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
  X.font = '16px ' + FONT; X.shadowColor = '#000'; X.shadowBlur = 6; X.fillStyle = '#fff'; X.fillText('ПАХАН', 46, H - 96); X.shadowBlur = 0;
  gbar(40, H - 86, 360, 22, hv, hud.hp, '#a30f1c', '#ff5a3c');
  X.font = '13px ' + FONT; X.fillStyle = '#fff'; X.fillText(Math.max(0, Math.ceil(P.hp)) + ' / ' + mh, 62, H - 69);
  const full = P.swag >= 100;
  gbar(32, H - 54, 270, 12, P.rage > 0 ? P.rage / 8 : P.swag / 100, 0, P.rage > 0 ? '#ff2a00' : '#ff8a00', full && Math.floor(now * 6) % 2 ? '#ffffff' : '#ffd23b');
  X.font = '12px ' + FONT; X.fillStyle = full || P.rage > 0 ? '#ffd23b' : '#8d97aa'; X.fillText(P.rage > 0 ? 'ПЕРЕГРУЗ!  [' + KN('rage') + '] — УЛЬТА' : full ? 'СВЭГ ПОЛОН — [' + KN('rage') + ']' : 'СВЭГ', 322, H - 43);
  // оружие
  let i = 0;
  for (const w of ['bat', 'mic', 'vinyl']) {
    const x = 44 + i * 78, y = H - 172, own = S.wl[w] > 0, cur = S.weapon === w, c = WP[w].col;
    skew(x, y, 62, 58); X.fillStyle = cur ? 'rgba(46,12,12,.92)' : 'rgba(6,8,12,.8)'; X.fill(); X.strokeStyle = cur ? c : 'rgba(255,255,255,.25)'; X.lineWidth = cur ? 3 : 1.5; if (cur) { X.shadowColor = c; X.shadowBlur = 14; } X.stroke(); X.shadowBlur = 0;
    X.globalAlpha = own ? 1 : .25; X.font = '28px "Segoe UI Emoji"'; X.textAlign = 'center'; X.fillStyle = '#fff'; X.fillText(own ? (w === 'bat' && P.thr ? '👊' : WP[w].icon) : '🔒', x + 48, y + 38); X.globalAlpha = 1;
    X.font = '12px ' + FONT; X.textAlign = 'left'; X.fillStyle = cur ? '#fff' : '#8d97aa'; X.fillText(KN('w' + (i + 1)), x + 72, y + 14);
    if (own) for (let l = 0; l < 5; l++) { X.fillStyle = l < S.wl[w] ? '#ffd23b' : 'rgba(255,255,255,.18)'; X.fillRect(x + 10 + l * 9, y + 50, 7, 3); }
    const rid = { bat: 'b5', mic: 'm5', vinyl: 'v5' }[w];
    if (own && sk(rid)) {
      const k = 1 - clamp(P.rcd[w] / WP[w].rune.cd, 0, 1), rx = x + 24, ry = y + 4; X.beginPath(); X.arc(rx, ry, 12, 0, TAU); X.fillStyle = 'rgba(6,8,12,.95)'; X.fill();
      radial(rx, ry, 11, k, k >= 1 ? c : 'rgba(255,255,255,.35)'); X.font = '11px ' + FONT; X.textAlign = 'center'; X.fillStyle = k >= 1 ? '#000' : '#fff'; X.fillText(KN('rune').slice(0, 2), rx, ry + 4);
    }
    i++;
  }
  if (S.comp > 0) {
    const cx = 44 + 3 * 78 + 44, cy = H - 143, k = 1 - clamp(P.qcd / (S.comp >= 4 ? 8 : 11), 0, 1);
    X.beginPath(); X.arc(cx, cy, 30, 0, TAU); X.fillStyle = 'rgba(6,8,12,.88)'; X.fill(); radial(cx, cy, 28, k, k >= 1 ? 'rgba(92,208,255,.55)' : 'rgba(92,208,255,.2)');
    X.beginPath(); X.arc(cx, cy, 30, 0, TAU); X.strokeStyle = '#5cd0ff'; X.lineWidth = k >= 1 ? 3 : 1.5; X.stroke();
    X.font = '24px "Segoe UI Emoji"'; X.textAlign = 'center'; X.fillStyle = '#fff'; X.globalAlpha = k >= 1 ? 1 : .4; X.fillText('🗣️', cx, cy + 9); X.globalAlpha = 1;
    X.font = '12px ' + FONT; X.fillStyle = '#5cd0ff'; X.fillText(KN('adlib') + ' · madk1d', cx, cy + 48);
  }
  if (S.weapon === 'bat') {
    X.font = '12px ' + FONT; X.textAlign = 'left'; X.fillStyle = P.thr ? '#ffd23b' : '#8d97aa';
    const label = P.thr ? 'вернуть биту' : P.throwCooldown > 0 ? 'бросок через ' + P.throwCooldown.toFixed(1) + ' с' : 'бросить биту';
    X.fillText('[' + KN('thr') + '] — ' + label, 46, H - 184);
  }
  chip(W - 30, 16, '▶ ' + S.xp, '#7dff7d'); chip(W - 30, 50, '▣ ' + S.tapes, '#ffd23b');
  X.textAlign = 'center';
  if (fs && fs.boss && !fs.boss.dead) {
    const b = fs.boss, bv = clamp(b.hp / b.maxhp, 0, 1); if (hud.bb !== b) { hud.bb = b; hud.bhp = 1; } hud.bhp = hud.bhp < bv ? bv : Math.max(bv, hud.bhp - .004);
    X.font = '26px ' + FONT; X.shadowColor = '#000'; X.shadowBlur = 8; X.fillStyle = '#fff'; X.fillText(b.d.n, W / 2, 34); X.shadowBlur = 0;
    gbar(W / 2 - 370, 46, 730, 14, bv, hud.bhp, '#5a0d14', b.c);
    const L = b.d.phases.length; X.fillStyle = 'rgba(0,0,0,.85)'; for (let j = 1; j < L; j++) X.fillRect(W / 2 - 370 + 730 * (1 - j / L) + 3, 44, 3, 18);
    X.font = '12px ' + FONT; X.fillStyle = '#9fb0c8';
    if (b.type === 'courier' && !cine) {
      const open = b.state === 'rec' || b.stun > 0;
      X.fillStyle = open ? '#7dff7d' : '#ffd23b';
      X.fillText(open ? 'ОТКРЫТ ДЛЯ УДАРА' : 'ПРИКРЫВАЕТСЯ ОТ БИТЫ', W / 2, 82);
    } else X.fillText(b.d.sub, W / 2, 82);
  } else if (fs && fs.surv != null && !fs.done) {
    const seconds = Math.max(0, Math.ceil(fs.surv));
    const time = Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
    X.font = '22px ' + FONT; X.shadowColor = '#000'; X.shadowBlur = 6; X.fillStyle = fs.surv < 10 ? '#7dff7d' : '#ffd23b'; X.fillText('⏱ ВЫЖИВИ  ' + time, W / 2, 34); X.shadowBlur = 0;
  } else if (fs && fs.waves && !fs.done) { if (fs.mut) { X.font = '12px ' + FONT; X.fillStyle = '#ff5cc8'; X.fillText('МУТАТОР: ' + MUTS[fs.mut][0], W / 2, 50); }
    X.font = '15px ' + FONT; X.shadowColor = '#000'; X.shadowBlur = 6; X.fillStyle = '#fff'; X.fillText('ВОЛНА ' + (fs.i + 1) + ' / ' + fs.waves.length + '   ·   врагов: ' + ens.length, W / 2, 30); X.shadowBlur = 0; }
  { const st = P.style || 0, ix = Math.min(6, Math.floor(st));
    if (st > .05 && fs) { const Lr = ['D', 'C', 'B', 'A', 'S', 'SS', 'SSS'][ix], Nr = ['ДЕМКА', 'СИНГЛ', 'EP', 'АЛЬБОМ', 'ПЛАТИНА', 'БРИЛЛИАНТ', 'ЛЕГЕНДА'][ix], col = ['#8d97aa', '#7dff7d', '#5cd0ff', '#ffd23b', '#ff8a3c', '#ff3b3b', '#ff5cc8'][ix];
      X.textAlign = 'right'; X.font = Math.round(66 + (ix >= 4 ? Math.sin(now * 9) * 3 : 0)) + 'px ' + FONT; X.shadowColor = col; X.shadowBlur = 20; X.fillStyle = col; X.fillText(Lr, W - 40, H / 2 - 76); X.shadowBlur = 0;
      X.font = '13px ' + FONT; X.fillStyle = '#fff'; X.fillText(Nr + '  ·  ▶ ×' + (1 + ix * .06).toFixed(2), W - 40, H / 2 - 54); X.fillStyle = 'rgba(0,0,0,.6)'; X.fillRect(W - 170, H / 2 - 47, 130, 5); X.fillStyle = col; X.fillRect(W - 170, H / 2 - 47, 130 * (ix >= 6 ? 1 : st - ix), 5); } }
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
  if (mode === 'fight' && !fs?.training && document.pointerLockElement !== C) { X.fillStyle = 'rgba(255,210,59,.9)'; X.fillText('Кликни по игре, чтобы захватить мышь · без захвата камера крутится у краёв экрана', W / 2, H - 14); }
  else if (mode === 'fight') {
    const hint = tomskHint();
    if (hint) {
      const width = X.measureText(hint).width + 28;
      X.fillStyle = 'rgba(8,10,16,.85)'; X.fillRect((W - width) / 2, H - 36, width, 30);
      X.fillStyle = '#e8ecf4'; X.fillText(hint, W / 2, H - 16);
    }
  }
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
  if (R3) R3.info.reset();
  X.setTransform(C.width / W, 0, 0, C.height / H, 0, 0); X.clearRect(0, 0, W, H);
  if (T3 && (!S || !P || mode === 'menu')) { const nw = window.__clock != null ? window.__clock : performance.now() / 1000, fd = window.__clock != null ? 1 / 30 : Math.min(.05, lastNow ? nw - lastNow : 0); lastNow = nw; menuScene(nw, fd); return; }
  if (!S || !P || !T3) return;
  if (!R3) init3d();
  const th = CH[Math.min(S.ch, CH.length - 1)].th, now = window.__clock != null ? window.__clock : performance.now() / 1000, fdt = window.__clock != null ? 1 / 30 : Math.min(.05, lastNow ? now - lastNow : 0); lastNow = now;
  if (builtDeco !== deco) { builtDeco = deco; buildWorld(th); }
  const entrance = LV.main[0];
  const indoors = S.ch === 0 && inR(entrance, P.x, P.y, 0);
  const doorX = entrance.x + entrance.w;
  // камера
  punch *= Math.pow(.004, fdt); { const bf = 56 + punch; if (!cine && !P.fin && Math.abs(CAM.fov - bf) > .05) { CAM.fov = bf; CAM.updateProjectionMatrix(); } }
  const sx = shake ? rnd(-shake, shake) * .5 : 0, sy = shake ? rnd(-shake, shake) * .5 : 0, fo = P.fin ? Math.sin(clamp(P.fin.el / P.fin.tot, 0, 1) * Math.PI) : 0, cyw = camYaw + fo * .6, fx = Math.cos(cyw), fz = Math.sin(cyw), cd0 = 270 - fo * 120;
  let cdn = cd0; for (let t = 30; t <= cd0; t += 20) if (!okPos(P.x - fx * t, P.y - fz * t, 12)) { cdn = t - 20; break; }
  camD += (Math.max(40, cdn) - camD) * .2;
  {
    // Allow room for both the canopy and the camera boom before raising the view.
    const clearance = S.ch === 0 ? clamp((P.x - doorX - 200) / 220, 0, 1) : 1;
    const blend = clearance * clearance * (3 - 2 * clearance);
    const distance = 105 + (camD - 105) * blend;
    const outdoorHeight = 44 + (16 + 330 * camPit) * (.35 + .65 * camD / cd0);
    CAM.position.set(P.x - fx * distance + (sx - fz * 22) * blend,
      72 + (outdoorHeight + sy - 72) * blend, P.y - fz * distance + fx * 22 * blend);
    if (P.fin) CAM.lookAt((P.x + P.fin.e.x) / 2, 40, (P.y + P.fin.e.y) / 2);
    else CAM.lookAt(P.x + fx * 100, 48 - 10 * blend, P.y + fz * 100);
    const fv = 65 + (56 - fo * 13 - 65) * blend;
    if (Math.abs(CAM.fov - fv) > .05) { CAM.fov = fv; CAM.updateProjectionMatrix(); }
  }
  if (cine) { const b = cine.e, ca = camYaw + Math.PI + .5 - cine.t * .28, cd = 330 - cine.t * 45; CAM.position.set(b.x + Math.cos(ca) * cd, 70 + b.r * 1.2, b.y + Math.sin(ca) * cd); CAM.lookAt(b.x, b.r * 2.3, b.y); if (CAM.fov !== 44) { CAM.fov = 44; CAM.updateProjectionMatrix(); } }
  CAM.updateMatrixWorld();
  const environment = ENVC[th.deco] || ENVC.snow;
  // Keep interior lighting and weather until the player has crossed the outer
  // threshold. Only then fade to the courtyard lighting.
  const outerThreshold = entrance.x + entrance.w + 45;
  const outside = S.ch !== 0 || P.x > outerThreshold;
  const indoorTarget = S.ch === 0 && !outside ? 1 : 0;
  indoorLightMix += (indoorTarget - indoorLightMix) * (1 - Math.exp(-fdt * 5));
  if (AMB) {
    AMB.visible = outside;
    AMB.material.opacity = outside ? .85 : 0;
  }
  SUN.intensity = environment.si + (.025 - environment.si) * indoorLightMix;
  if (HEMI) HEMI.intensity = environment.hi + (.09 - environment.hi) * indoorLightMix;
  for (const light of SC.children) {
    if (light.isDirectionalLight && light !== SUN) light.intensity = .45 + (.025 - .45) * indoorLightMix;
  }
  if (indoors && mode === 'dlg' && S.step === 0) {
      const speaker = dq[di]?.split('|')[0];
      const subject = speaker === 'M' ? comp : P;
      const other = speaker === 'M' ? P : comp;
      const angle = Math.atan2(other.y - subject.y, other.x - subject.x);
      CAM.position.set(subject.x + Math.cos(angle + .55) * 110, 63, subject.y + Math.sin(angle + .55) * 110);
      CAM.lookAt(subject.x, 49, subject.y);
    CAM.fov = 65;
    CAM.updateProjectionMatrix();
    CAM.updateMatrixWorld();
  }
  if (S.ch === 0 && !cine) {
    const ray = entranceCameraRay;
    ray.origin.set(P.x, 55, P.y);
    ray.direction.subVectors(CAM.position, ray.origin);
    let distance = ray.direction.length();
    if (distance > 0) {
      ray.direction.multiplyScalar(1 / distance);
      for (const solid of entranceSolids) {
        entranceCameraBox.copy(solid).expandByScalar(10);
        if (entranceCameraBox.containsPoint(ray.origin)) continue;
        if (ray.intersectBox(entranceCameraBox, _hit)) {
          distance = Math.min(distance, Math.max(0, ray.origin.distanceTo(_hit) - 2));
        }
      }
      CAM.position.copy(ray.at(distance, _hit));
      CAM.updateMatrixWorld();
    }
  }
  if (FL && FL.intensity > .01) FL.intensity *= Math.pow(.0008, fdt); else if (FL) FL.intensity = 0;
  if (fdt > 0 && fdt < .2 && !document.hidden) {
    fpsA += (1 / fdt - fpsA) * .05; fpsN += (1 / fdt - fpsN) * .1; qT += fdt;
    if (qT > 1) { qT = 0;
      if (OPT.q === 'auto') {
        if (fpsA < 54 && DYN > .6) { DYN = Math.max(.6, +(DYN - .1).toFixed(2)); setPR(); upT = 0; }
        else if (fpsA < 40 && qual > 0) { qual--; setPR(); SUN.castShadow = qual > 0; upT = 0; }
        else if (fpsA > 58.5 && DYN < 1) { if (++upT >= 4) { DYN = Math.min(1, +(DYN + .1).toFixed(2)); setPR(); upT = 0; } } else upT = 0;
      }
    }
  }
  R3.shadowMap.needsUpdate = qual > 0 && (++shF % 2 === 0 || !!cine);
  SUN.position.set(P.x + 320, 760, P.y + 260); SUN.target.position.set(P.x, 0, P.y); SUN.target.updateMatrixWorld();
  for (const k in pools) pools[k].i = 0;
  for (const p of spinners) { const u = p.userData, a = u.a + now * u.sp; p.position.set(LV.w / 2 + Math.cos(a) * u.rr, u.h + Math.sin(now + u.a) * 10, LV.h / 2 + Math.sin(a) * u.rr * .6); p.rotation.set(now * .5 + u.a, now * .3, 0); }

  // Пахан
  const w = S.weapon, wd = WP[w], a = P.atk;
  PM.position.set(P.x, 0, P.y); PM.rotation.y = indoors && mode === 'dlg' ? -ang(P, comp) : -P.aim;
  if (!PM.userData.mdl && MDL.vanek) {
    const q = inst('vanek', 72, { tint: '#4a4d5a', mix: .5 }); PIN.children.slice(0, 5).forEach(c => { c.visible = false; }); PIN.add(q); PM.userData.mdl = q;
    let hs = null; q.traverse(o => { if (/^handslot.?r$/i.test(o.name)) hs = o; });
    if (hs) { HW = handWeapons(); for (const k in HW) hs.add(HW[k]); WPV.visible = false; }
  }
  if (!CM.userData.mdl && MDL.kent) { const q = inst('kent', 62, { tint: '#bfe6ff', mix: .3 }); CM.children.forEach(c => { c.visible = false; }); CM.add(q); CM.userData.mdl = q; }
  const pg = PM.userData.mdl, fn = P.fin;
  if (HW) for (const k in HW) HW[k].visible = k === w && !(k === 'bat' && P.thr);
  if (pg) {
    const cb = a ? a.combo % 3 : 0;
    if (fn) play(pg, fn.seq[fn.i][0], true, fn.seq[fn.i][1] * 1.2, 'f' + fn.n + '_' + fn.i);
    else if (P.dodge > 0) play(pg, 'dF', true, P.dT, P.dn);
    else if (P.hurtT > 0) play(pg, 'hitB', true, .35, 'h');
    else if (P.block) play(pg, 'block');
    else if (P.spin > 0) play(pg, 'ms', false, .45);
    else if (a) play(pg, a.w === 'bat' ? (a.heavy ? 'bh' : cb === 0 ? 'b3' : 'b1') : a.w === 'mic' ? (a.heavy ? 'mh' : cb === 0 ? 'm3' : cb === 1 ? 'm1' : 'm2') : (a.heavy ? 'vh' : 'v1'), true, Math.max(a.dur * 1.25, a.wind / .4), a.n);
    else if (P.chg > .15) play(pg, 'bi');
    else if (mode === 'fight' && P.mv) play(pg, 'run');
    else play(pg, w === 'bat' && !P.thr && fs ? 'bi' : 'idle');
    pg.userData.mx.update(fdt);
    PIN.position.y = fn && fn.seq[fn.i][0] === 'bh' ? Math.sin(clamp(fn.t / fn.seq[fn.i][1], 0, 1) * Math.PI) * 24 : 0;
    // кувырок: модель делает полный оборот через голову в сторону движения, вращаясь вокруг центра тела
    if (P.dodge > 0) {
      const kq = clamp(1 - P.dodge / (P.dT || .38), 0, 1), th = kq * kq * (3 - 2 * kq) * TAU, rl = P.drl || 0, hc = 30;
      ROLLA.set(Math.sin(rl), 0, -Math.cos(rl)); PIN.quaternion.setFromAxisAngle(ROLLA, th);
      ROLLO.set(0, hc, 0).applyQuaternion(PIN.quaternion); PIN.position.set(-ROLLO.x, hc - ROLLO.y + Math.sin(kq * Math.PI) * 5, -ROLLO.z);
      PIN.scale.set(1, 1 - .12 * Math.sin(kq * Math.PI), 1);
    } else { PIN.quaternion.set(0, 0, 0, 1); PIN.position.x = 0; PIN.position.z = 0; PIN.scale.set(1, 1, 1); }
  }
  if (P.dodge > 0 && !pg) { PIN.rotation.z = -(1 - P.dodge / (P.dT || .38)) * TAU; PIN.position.y = 14; PIN.scale.setScalar(.8); } else if (!pg) { PIN.rotation.z = 0; PIN.position.y = 0; PIN.scale.setScalar(1); }
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
    const kq = clamp((a.t - a.wind) / (a.dur - a.wind + .001), 0, 1), arc = full ? TAU : d.arc;
    dSect(P.x, P.y, d.range, a.a, arc, wd.col, .22 * (1 - kq));
    { const sg = a.combo % 2 ? -1 : 1, seg = Math.min(arc, 1.5), ca = a.a + sg * (kq - .5) * (arc - seg * .4);
      for (let i = 0; i < 3; i++) decal('tr' + seg.toFixed(2), () => new T3.RingGeometry(.52, 1, 20, 1, -seg / 2, seg).rotateX(-Math.PI / 2), P.x, P.y, d.range * (1 - i * .04), d.range * (1 - i * .04), -(ca - sg * i * .18), i ? wd.col : '#ffffff', (.75 - i * .22) * (1 - kq * .7), 30 + i * 5); }
  }
  if (P.spin > 0) dRing(P.x, P.y, 155, '#49e0ff', .8);
  if (P.rage > 0) dRing(P.x, P.y, 34 + Math.sin(now * 12) * 4, '#ff4a1c', .9);
  { const cg = CM.userData.mdl, cmv = Math.hypot(comp.x - (comp.lx || 0), comp.y - (comp.ly || 0)) > .7; comp.lx = comp.x; comp.ly = comp.y;
    CM.position.set(comp.x, cg ? 0 : Math.abs(Math.sin(now * 6)) * 2, comp.y); CM.rotation.y = indoors && mode === 'dlg' ? -ang(comp, P) : -P.aim;
    if (cg) { if (comp.sayT > 0) play(cg, 'cheer'); else play(cg, cmv ? 'run' : 'idle'); cg.userData.mx.update(fdt); } }
  if (P.chg > .15) dRing(P.x, P.y, 30 + P.chg * 44, P.chg >= 1 ? '#ffffff' : wd.col, .9);
  if (P.crit > 0) dRing(P.x, P.y, 26, '#ffffff', .5 + .4 * Math.sin(now * 16));
  for (const q of statics) if (q.parent && Math.hypot(q.parent.position.x - P.x, q.parent.position.z - P.y) < 1300) q.userData.mx.update(fdt);
  corpses = corpses.filter(c => { c.t -= fdt; c.m.userData.mx.update(fdt); c.m.position.x += c.vx * fdt; c.m.position.z += c.vy * fdt; c.vx *= Math.pow(.02, fdt); c.vy *= Math.pow(.02, fdt); c.m.position.y = Math.max(0, c.m.position.y - fdt * 300); if (c.t < .45) c.m.scale.multiplyScalar(Math.max(.01, 1 - fdt * 5)); if (c.t <= 0) { SC.remove(c.m); return false; } return true; });

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
      const u = m.userData; m.rotation.z = e.air > 0 ? Math.sin(now * 13 + e.ph0) * .55 : 0; m.position.y = (e.type === 'ghost' ? m.position.y : 0) + (e.air || 0); u.kx = e.kx; u.ky = e.ky;
      if (e.state === 'wind' && u.ps !== 'wind') { fxGlow(e.x, e.y, e.ai === 'brute' || (e.boss && ['slam', 'leap', 'charge'].includes(e.mv)) ? '#ff2020' : '#ffd23b', e.boss ? 190 : 110, .32, u.top * .85); if (dist(e, P) < 500) tone(e.boss ? 520 : 1250, .07, 'square', .05); }
      if (e.state === 'wind' && u.ps !== 'wind') { u.wn = (u.wn || 0) + 1; u.wd = Math.max(.3, e.t); } u.ps = e.state;
      const cast = e.ai === 'ranged' || e.ai === 'summon' || (e.boss && !['slam', 'leap', 'charge'].includes(e.mv));
      if (e.spawn > 0) play(m, 'spawn', true, e.boss ? 1.2 : .7, 's'); else if (e.boss && (e.sayT > 2.4 || (cine && cine.t > 1.2))) play(m, 'taunt', true, 1.4, 't' + e.ph + (cine ? 'c' : '')); else if (e.stun > 0 || e.state === 'hurt') play(m, 'hit');
      else if (e.state === 'wind') play(m, e.boss ? BATK[e.mv] || 'atk' : EATK[e.type] || (cast ? 'cast' : 'atk'), true, u.wd * 1.7, u.wn); else if (e.state === 'dash' || e.state === 'idle') play(m, 'run');
      if (dist(e, P) < 1100) u.mx.update(fdt);
    }
    if (e.shock > 0) dRing(e.x, e.y, e.r + 4, '#49e0ff', .5 + .4 * Math.sin(now * 30));
    if (e.pitch > 0) dCirc(e.x, e.y, e.r + 6, '#e9e2ff', .25);
    if (e.d.shield && !(e.brk > 0)) dSect(e.x, e.y, e.r + 16, ang(e, P), 2, '#7fa8ff', .5);
    if (m.userData.spin) m.userData.spin.rotation.y = now * 1.5;
    teleDecals(e);
    if (e.beam) { decal('rect', gRect, e.x, e.y, 740, 34, -e.beam.a, '#ff2020', .8, 3); decal('rect', gRect, e.x, e.y, 740, 10, -e.beam.a, '#ffffff', .95, 3.5); fxGlow(e.x + Math.cos(e.beam.a) * 370, e.y + Math.sin(e.beam.a) * 370, '#ff2020', 160, .08, 30); }
    if (e.el) dRing(e.x, e.y, e.r + 9, '#ffd23b', .9);
    if (e.fin) dRing(e.x, e.y, e.r + 16 + Math.sin(now * 14) * 4, '#ffe14a', 1);
  }
  emesh = emesh.filter(m => { if (m.userData.st !== stamp) { if (m.userData.mdl && corpses.length < 14) { play(m, Math.random() < .5 ? 'death' : 'deathB', true); m.rotation.z = 0; corpses.push({ m, t: 1.5, vx: (m.userData.kx || 0) * 1.4, vy: (m.userData.ky || 0) * 1.4 }); } else SC.remove(m); return false; } return true; });

  // зоны, сферы, снаряды, эффекты
  for (const h of haz) { const c = h.pl ? '#5cd0ff' : '#ff3030'; dCirc(h.x, h.y, h.r, c, .22); dRing(h.x, h.y, h.r, c, .9); dRing(h.x, h.y, h.r * clamp(1 - h.t / h.mt, 0, 1), '#ffffff', .7); }
  if (fs?.entry && !fs.done) {
    const { x, y } = fs.entry;
    dCirc(x, y, 110, '#ffd480', .28);
    dRing(x, y, 110, '#ffd480', .95);
  }
  for (const r of rings) dRing(r.x, r.y, r.r, r.c, clamp(r.l / .35, 0, 1));
  for (const o of orbs) { const m = use('orb', () => mesh(new T3.SphereGeometry(8, 12, 10), new T3.MeshBasicMaterial({ color: '#7dff7d' }))); m.position.set(o.x, 16 + Math.sin(now * 5 + o.x) * 5, o.y); }
  for (const p of prj) {
    if (p.from === 'e') { // вражеский снаряд всегда читается: красное свечение и метка на полу
      const gl = use('pg', () => { const sp = new T3.Sprite(new T3.SpriteMaterial({ map: G('glowT', () => { const [c, x] = cnv(64, 64), q = x.createRadialGradient(32, 32, 2, 32, 32, 31); q.addColorStop(0, 'rgba(255,255,255,1)'); q.addColorStop(.35, 'rgba(255,255,255,.55)'); q.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = q; x.fillRect(0, 0, 64, 64); { const tq = new T3.CanvasTexture(c); tq.encoding = T3.sRGBEncoding; return tq; } }), color: '#ff2a2a', transparent: true, depthWrite: false })); sp.scale.set(84, 84, 1); return sp; });
      gl.position.set(p.x, 26, p.y); dCirc(p.x, p.y, 20, '#ff2020', .45); dRing(p.x, p.y, 21, '#ff2020', 1);
    }
    if (p.paper) { const m = use('pp', () => mesh(new T3.BoxGeometry(18, 2, 14), new T3.MeshBasicMaterial({ color: '#f4f4ff' }))); m.position.set(p.x, 24, p.y); m.rotation.set(0, -Math.atan2(p.vy, p.vx), Math.sin(now * 10 + p.x) * .4); m.material.color.set(p.from === 'e' ? '#ff3b3b' : p.col); m.scale.setScalar(1.5); }
    else if (p.note) { const m = use('pn', () => emo('🎵', 30, 0)); m.position.set(p.x, 30, p.y); }
    else if (p.from === 'p' && p.col !== '#49e0ff') { const m = use('pv', () => { const g = new T3.Group(); g.add(mesh(new T3.CylinderGeometry(11, 11, 2, 20), new T3.MeshStandardMaterial({ color: '#e9e2ff', metalness: .8, roughness: .2, emissive: '#6a5cff', emissiveIntensity: .4 })), mesh(new T3.BoxGeometry(22, 2.4, 2), new T3.MeshBasicMaterial({ color: '#222' }))); return g; }); m.position.set(p.x, 24, p.y); m.rotation.y = p.rot; }
    else if (p.cm && p.from === 'e') { const m = use('pc', () => emo('💬', 34, 0)); m.position.set(p.x, 30, p.y); dCirc(p.x, p.y, p.r * 1.3, '#ff5050', .3); }
    else { const m = use('pe', () => mesh(new T3.SphereGeometry(1, 12, 10), new T3.MeshBasicMaterial())); m.castShadow = false; m.position.set(p.x, 22, p.y); m.scale.setScalar(p.r * 1.15); m.material.color.set(p.col); dCirc(p.x, p.y, p.r * 1.3, p.col, .3); }
  }
  if (!PTI) { PTI = new T3.InstancedMesh(G('box', () => new T3.BoxGeometry(1, 1, 1)), new T3.MeshBasicMaterial({ color: '#ffffff' }), 420); PTI.instanceMatrix.setUsage(T3.DynamicDrawUsage); PTI.frustumCulled = false; PTI.setColorAt(0, new T3.Color()); PTI.userData.o = new T3.Object3D(); PTI.userData.c = new T3.Color(); SC.add(PTI); }
  { const o = PTI.userData.o, c = PTI.userData.c; let n = 0;
    for (const p of pts) { if (n >= 420) break; if (p.st) { o.position.set(p.x, 32 + p.l * 40, p.y); o.scale.set(p.s * 7, p.s * .7, p.s * .7); o.rotation.set(0, -Math.atan2(p.vy, p.vx), 0); } else { o.position.set(p.x, 14 + p.l * 60, p.y); o.scale.setScalar(p.s * 1.4); o.rotation.set(0, 0, 0); } o.updateMatrix(); PTI.setMatrixAt(n, o.matrix); PTI.setColorAt(n, c.set(p.c)); n++; }
    PTI.count = n; PTI.instanceMatrix.needsUpdate = true; PTI.instanceColor.needsUpdate = true; }
  for (const b of bolts) { const m = use('bolt', () => new T3.Mesh(G('box', () => new T3.BoxGeometry(1, 1, 1)), new T3.MeshBasicMaterial())); const L = Math.hypot(b.x2 - b.x1, b.y2 - b.y1); m.position.set((b.x1 + b.x2) / 2, 26 + rnd(-4, 4), (b.y1 + b.y2) / 2); m.scale.set(L, 4, 4); m.rotation.y = -Math.atan2(b.y2 - b.y1, b.x2 - b.x1); m.material.color.set(b.c); }
  if (SKYM) SKYM.position.set(P.x, 0, P.y);
  for (const q of glows) { q.visible = outside; q.getWorldPosition(v3); const d = v3.distanceTo(CAM.position); q.material.opacity = outside ? clamp((d - 90) / 160, 0, 1) : 0; }
  { const dk = fs && !fs.done && fs.mut === 'dark', fg = SC.fog; fg.near += ((dk ? 90 : 450) - fg.near) * .08; fg.far += ((dk ? 560 : 2100) - fg.far) * .08; }
  for (const w of waves) { dRing(w.x, w.y, w.r, w.c, .95); dRing(w.x, w.y, w.r - 12, '#ffffff', .6); dRing(w.x, w.y, w.r + 12, '#ff2020', .7); }
  for (const mk of marks) { mk.l -= fdt; const o = clamp(mk.l / 3, 0, 1) * .42; dCirc(mk.x, mk.y, mk.r, '#000000', o); dRing(mk.x, mk.y, mk.r * 1.05, '#000000', o * 1.3); } marks = marks.filter(q => q.l > 0);
  if (P.dodge > 0) fxGlow(P.x, P.y, '#c9b8a0', 34, .1, 6);
  if (P.chg > .15) { const gq = use('hf', () => glowS('#ffffff', 10)); gq.material.color.set(P.chg >= 1 ? '#ffffff' : wd.col); gq.material.opacity = .5 + P.chg * .5; gq.scale.setScalar(70 + P.chg * 170 + Math.sin(now * 30) * 12); gq.position.set(P.x, 44, P.y); if (Math.random() < .6) { const an = rnd(0, TAU); pts.push({ x: P.x + Math.cos(an) * 110, y: P.y + Math.sin(an) * 110, vx: -Math.cos(an) * 420, vy: -Math.sin(an) * 420, l: .22, c: wd.col, s: 2.4, st: 1 }); } }
  if (a && a.t >= a.wind && a.w !== 'vinyl') { const dd = a.d || wd[a.heavy ? 'heavy' : 'light'], kq = clamp((a.t - a.wind) / (a.dur - a.wind + .001), 0, 1), sg = a.combo % 2 ? -1 : 1, ca = a.a + sg * (kq - .5) * dd.arc * .8, gq = use('hf', () => glowS('#ffffff', 10)); gq.material.color.set(wd.col); gq.material.opacity = 1 - kq; gq.scale.setScalar(a.heavy ? 150 : 90); gq.position.set(P.x + Math.cos(ca) * dd.range * .85, 36, P.y + Math.sin(ca) * dd.range * .85); }
  for (const h of hfx) { h.l -= fdt; if (h.l <= 0) continue; const gq = use('hf', () => glowS('#ffffff', 10)), q = h.l / h.ml; gq.material.color.set(h.c); gq.material.opacity = q; gq.scale.setScalar(h.s * (1.25 - q * .5)); gq.position.set(h.x, h.h, h.y); } hfx = hfx.filter(h => h.l > 0);
  if (AMB) { const pa = AMB.geometry.attributes.position, d = ambD, wr = (v, m) => ((v % m) + m) % m;
    for (let i = 0; i < d.n; i++) { const b = d.base[i]; pa.setXYZ(i, P.x - 750 + wr(b[0] + Math.sin(now * .4 + b[3]) * d.dr - P.x, 1500), wr(b[1] + now * d.vy, 420), P.y - 750 + wr(b[2] + Math.cos(now * .3 + b[3]) * d.dr - P.y, 1500)); }
    pa.needsUpdate = true; }
  for (const q of movers) { q.m.position.x += q.vx * fdt; if (q.m.position.x > q.x1) q.m.position.x = q.x0; else if (q.m.position.x < q.x0) q.m.position.x = q.x1; if (q.car) q.m.visible = !okPos(q.m.position.x, q.m.position.z, -40); }
  if (fs && !fs.done && fs.traps) for (const t of fs.traps) { dRing(t.x, t.y, 95, '#ffb03b', .22); dCirc(t.x, t.y, 14, '#ffb03b', .5); }
  for (const o of ents) {
    if (!o.m) continue;
    if (o.k === 'frontDoor') {
      o.m.rotation.y = o.open ? Math.PI / 2 : 0;
      o.m.position.set(o.x + (o.open ? 103 : 0), 0, o.y - (o.open ? 103 : 0));
    }
    else if (o.k === 'chest') o.m.visible = !S.done[o.id];
    else if (o.k === 'tgt' || o.k === 'brk' || o.k === 'swall') o.m.visible = !o.dead;
    else if (o.k === 'stash') { o.m.visible = !S.done[o.id] && dist(o, P) < 420; o.m.children[0].material.opacity = .35 + .35 * Math.sin(now * 5 + o.x); }
    else if (o.k === 'lore') { o.m.visible = !S.done[o.id]; o.m.position.y = Math.sin(now * 3) * 6; }
    else if (o.k === 'portal') { const op = exitOpen(), c = op ? '#49e0ff' : '#44485a'; o.m.children[0].material.color.set(c); o.m.children[0].material.emissive.set(c); o.m.children[1].material.color.set(c); o.m.children[0].rotation.z = now * (op ? 1.5 : .2); }
    else o.m.rotation.y = -ang(o, P);
  }
  if (fs && !fs.done) { const r = fs.room; for (const [x, z, sx, sz] of [[r.cx, r.y, r.w, 6], [r.cx, r.y + r.h, r.w, 6], [r.x, r.cy, 6, r.h], [r.x + r.w, r.cy, 6, r.h]]) { const m = use('gate', () => new T3.Mesh(G('box', () => new T3.BoxGeometry(1, 1, 1)), new T3.MeshBasicMaterial({ color: '#ff3030', transparent: true, opacity: .3, depthWrite: false }))); m.position.set(x, 26, z); m.scale.set(sx, 52, sz); } }
  for (const k in pools) { const p = pools[k]; for (let i = p.i; i < p.a.length; i++) p.a[i].visible = false; }
  draw(SC);

  // 2D-слой поверх: подписи, полоски, HUD
  X.textAlign = 'center'; X.textBaseline = 'alphabetic';
  for (const e of ens) {
    if (e.spawn > 0) continue; const q = proj(e.x, e.y, e.m.userData.top + e.r * 1.4);
    if (!e.boss && e.hp < e.maxhp) { X.fillStyle = '#000'; X.fillRect(q.x - 21, q.y - 1, 42, 6); X.fillStyle = '#f44'; X.fillRect(q.x - 20, q.y, 40 * clamp(e.hp / e.maxhp, 0, 1), 4); }
    if (e.sm > 0 && !e.fin && e.hp < e.maxhp) { X.fillStyle = '#000'; X.fillRect(q.x - 21, q.y + 6, 42, 4); X.fillStyle = '#ffe14a'; X.fillRect(q.x - 20, q.y + 7, 40 * clamp(e.sm, 0, 1), 2); }
    if (e.fin) { X.font = 'bold 20px "Russo One","Segoe UI"'; X.strokeStyle = '#000'; X.lineWidth = 4; X.strokeText('[' + KN('interact') + ']', q.x, q.y - 22); X.fillStyle = '#ffe14a'; X.fillText('[' + KN('interact') + ']', q.x, q.y - 22); }
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
  if (false) { X.fillStyle = 'rgba(255,255,255,.6)'; for (let i = 0; i < 70; i++) { const x = (i * 137.5 + now * 30 * (1 + i % 3)) % W, y = (i * 71.3 + now * 70 * (1 + i % 4) * .5) % H; X.fillRect(x, y, 2, 2); } }
  if (!VIG) { VIG = document.createElement('canvas'); VIG.width = W; VIG.height = H; const vx = VIG.getContext('2d'), g = vx.createRadialGradient(W / 2, H / 2, H * .5, W / 2, H / 2, H * .98); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.5)'); vx.fillStyle = g; vx.fillRect(0, 0, W, H); }
  X.drawImage(VIG, 0, 0);
  if (OPT.fps) { X.textAlign = 'right'; X.font = '13px ' + FONT; const f = Math.round(fpsN); X.fillStyle = 'rgba(0,0,0,.55)'; X.fillRect(W - 168, H - 30, 150, 20); X.fillStyle = f >= 55 ? '#7dff7d' : f >= 40 ? '#ffd23b' : '#ff5a3c';
    X.fillText('FPS ' + f + '  ·  ' + ['НИЗК', 'СРЕД', 'ВЫС'][qual] + ' ' + Math.round(DYN * 100) + '%', W - 24, H - 15); X.textAlign = 'left'; }
  if (P.hp / maxHp() < .3) { X.fillStyle = `rgba(200,0,0,${.12 + .06 * Math.sin(now * 6)})`; X.fillRect(0, 0, W, H); }
  if (flash > 0) { X.fillStyle = `rgba(255,255,255,${clamp(flash, 0, .5)})`; X.fillRect(0, 0, W, H); }
  if (bt > 0) { const gg = X.createRadialGradient(W / 2, H / 2, H * .25, W / 2, H / 2, H * .9); gg.addColorStop(0, 'rgba(90,170,255,0)'); gg.addColorStop(1, `rgba(90,170,255,${Math.min(.45, bt * .6)})`); X.fillStyle = gg; X.fillRect(0, 0, W, H); }
  if (cine) {
    const q = clamp(cine.t / .5, 0, 1) * clamp((cine.dur - cine.t) / .4, 0, 1), b = cine.e, sl = (1 - clamp((cine.t - .5) / .5, 0, 1)) * 500;
    X.fillStyle = '#000'; X.fillRect(0, 0, W, 96 * q); X.fillRect(0, H - 96 * q, W, 96 * q);
    X.textAlign = 'left'; X.globalAlpha = clamp((cine.t - .5) / .4, 0, 1) * clamp((cine.dur - cine.t) / .4, 0, 1);
    X.fillStyle = b.c; X.fillRect(90 - sl, H - 250, 8, 120); X.font = '84px ' + FONT; X.shadowColor = b.c; X.shadowBlur = 26; X.fillStyle = '#fff'; X.fillText(b.d.n, 116 - sl, H - 176); X.shadowBlur = 0;
    X.font = '20px ' + FONT; X.fillStyle = b.c; X.fillText(b.d.sub.toUpperCase(), 118 - sl, H - 138); X.globalAlpha = 1; X.textAlign = 'center'; X.font = '12px ' + FONT; X.fillStyle = 'rgba(255,255,255,.5)'; if (!window.__noHud) X.fillText('любая клавиша — пропустить', W / 2, H - 40);
  } else if (mode !== 'title' && mode !== 'end' && mode !== 'dlg' && !window.__noHud) { drawHud(); drawNav(); }
  if (tipQ.length && mode === 'fight' && !window.__noHud) {
    tipT += fdt; const tx = tipQ[0], al = clamp(tipT / .3, 0, 1) * clamp((7 - tipT) / .4, 0, 1); X.globalAlpha = al; X.font = '15px "Segoe UI",sans-serif';
    const words = tx.split(' '), lines = []; let ln = ''; for (const wq of words) { if (X.measureText(ln + wq).width > 560) { lines.push(ln); ln = ''; } ln += wq + ' '; } lines.push(ln);
    const bh = 30 + lines.length * 21, by = H - 232 - bh; X.fillStyle = 'rgba(8,10,16,.9)'; X.fillRect(W / 2 - 310, by, 620, bh); X.fillStyle = '#5cd0ff'; X.fillRect(W / 2 - 310, by, 5, bh);
    X.textAlign = 'left'; X.fillStyle = '#5cd0ff'; X.font = '12px ' + FONT; X.fillText('ПОДСКАЗКА', W / 2 - 292, by + 18); X.fillStyle = '#e8ecf4'; X.font = '15px "Segoe UI",sans-serif'; lines.forEach((l, i) => X.fillText(l, W / 2 - 292, by + 40 + i * 21));
    X.globalAlpha = 1; if (tipT > 7) { tipQ.shift(); tipT = 0; }
  }
  for (const bn of banners) { bn.t += fdt; const kk = clamp(bn.t / .18, 0, 1), fo = clamp((2.2 - bn.t) / .4, 0, 1), sc = 1.6 - .6 * kk; if (fo <= 0) continue;
    X.save(); X.translate(W / 2, 170 + banners.indexOf(bn) * 86); X.scale(sc, sc); X.globalAlpha = fo * kk; X.textAlign = 'center';
    X.font = '58px ' + FONT; X.shadowColor = bn.c; X.shadowBlur = 24; X.fillStyle = '#fff'; X.fillText(bn.s, 0, 0); X.shadowBlur = 0; X.fillStyle = bn.c; X.fillRect(-150, 12, 300, 4); X.font = '16px ' + FONT; X.fillText(bn.sub, 0, 38); X.restore(); }
  banners = banners.filter(bn => bn.t < 2.2);
}

/* ================= ПРОКАЧКА ================= */
function openUp(shop) {
  upShop = shop; mode = 'up'; if (shop) tip('shop', 'Уровни оружия поднимаются только здесь, у Севы, за мастер-ленты ▣. Скиллы и характеристики можно брать где угодно по TAB.');
  $('uph').textContent = shop ? 'МАСТЕРСКАЯ ДЯДИ СЕВЫ' : 'ПРОКАЧКА';
  $('upClose').textContent = shop ? 'В путь →' : 'Закрыть [TAB]';
  buildUp(); show('up', true);
}
function closeUp() { show('up', false); save(); upShop = false; mode = 'fight'; lock(); }
let upTab = 'bat';
function buildUp() {
  $('uxp').textContent = S.xp; $('utp').textContent = S.tapes;
  const tabs = [['bat', WP.bat.icon + ' БИТА'], ['mic', WP.mic.icon + ' МИКРОФОН'], ['vinyl', WP.vinyl.icon + ' СЭМПЛЕР'], ['me', '💪 ПАХАН И КЕНТ'], ['trk', '💍 ЦАЦКИ ' + S.trk.eq.length + ' / 3']];
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
    (S.boons || []).forEach(k => { h += card('own', '★', 'Усиление: ' + BOONS[k].n, BOONS[k].d, ''); });
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
  const c = e.code;
  if (BIND) return;
  if (c === 'Tab' || c === 'Space' || c === KM.menu || c === KM.dodge || c === KM.full || c === KM.fps) e.preventDefault();
  if (e.repeat) return;
  if (c === 'F8') { e.preventDefault(); if (mode === 'dev') closeDev(); else openDev(); return; }
  if (mode === 'dev') { if (c === 'Escape') closeDev(); return; }
  K[c] = true; audio();
  if (c === KM.full) { toggleFS(); return; }
  if (c === KM.mute) { muted = !muted; if (muted) stopVoice(); toast(muted ? 'Звук выключен' : 'Звук включён', 1.2); }
  if (c === KM.fps) { OPT.fps = !OPT.fps; saveOpt(); }
  if (mode === 'guide') {
    if (c === 'Enter' || c === 'Space' || c === KM.interact) {
      e.preventDefault();
      if (e.target === $('guideSkip')) $('guideSkip').click();
      else beginTomskPractice();
    }
    return;
  }
  if (mode === 'dlg') {
    if (c === 'Space' && e.isTrusted) dialogHold = performance.now();
    else if (c === 'Enter' || c === KM.dodge || c === KM.interact) advDlg();
    return;
  }
  if (mode === 'up') { if (c === KM.menu || c === 'Escape') closeUp(); return; }
  if (mode === 'settings') { if (c === 'Escape') closeSettings(); return; }
  if (mode === 'pause') { if (c === 'Escape') { show('pause', false); show('help', false); show('binds', false); mode = 'fight'; } return; }
  if (mode !== 'fight') return;
  if (cine) { if (cine.t > .4) cine = null; return; }
  if (c === 'Escape') { stopVoice(); mode = 'pause'; $('oD').value = S.diff; show('pause', true); return; }
  switch (Object.keys(KM).find(k => KM[k] === c)) {
    case 'dodge': doDodge(); break;
    case 'rune': doRune(); break;
    case 'interact': doInteract(); break;
    case 'thr': doThrow(); break;
    case 'adlib': doQ(); break;
    case 'rage': doRage(); break;
    case 'w1': swW('bat'); break;
    case 'w2': swW('mic'); break;
    case 'w3': swW('vinyl'); break;
    case 'menu': openUp(false); break;
  }
});
addEventListener('keyup', e => {
  K[e.code] = false;
  if (e.code === 'Space' && mode === 'dlg' && dialogHold !== null) {
    const skip = performance.now() - dialogHold >= DIALOG_SKIP_SECONDS * 1000;
    resetDialogHold();
    if (skip) endDlg(); else advDlg();
  }
});
addEventListener('blur', () => { resetDialogHold(); for (const k in K) K[k] = false; M.l = M.r = false; });
const mpos = e => { const r = C.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) return; M.x = (e.clientX - r.left) * W / r.width; M.y = (e.clientY - r.top) * H / r.height; };
addEventListener('mousemove', e => { mpos(e); if (document.pointerLockElement === C) { camYaw += e.movementX * .0026 * OPT.sens; camPit = clamp(camPit + e.movementY * .0014 * OPT.sens, .1, .85); } });
document.addEventListener('pointerlockchange', () => { if (document.pointerLockElement !== C && mode === 'fight') { stopVoice(); mode = 'pause'; $('oD').value = S.diff; show('pause', true); } });
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
const toMenu = () => { stopVoice(); devSession = false; devGod = false; $('devGod').textContent = 'Бессмертие: выкл.'; show('devPanel', false); ['pause', 'end', 'dlg', 'up', 'dead', 'choice'].forEach(i => show(i, false)); mode = 'menu'; $('bCont').disabled = !load(); show('menu', true); };
function openDev() {
  if (!['menu', 'fight', 'pause'].includes(mode)) return;
  devFrom = mode;
  if (mode !== 'fight') show(mode, false);
  mode = 'dev';
  stopVoice();
  for (const key in K) K[key] = false;
  M.l = M.r = false;
  show('devPanel', true);
}
function closeDev() {
  show('devPanel', false);
  mode = devFrom;
  if (mode === 'fight') lock(); else show(mode, true);
}
function jumpToCourier() {
  audio();
  devSession = true;
  stopVoice();
  show('devPanel', false);
  newGame(1);
  show('title', false);
  S.step = steps().findIndex(step => step.t === 'boss' && step.id === 'courier');
  const room = LV.stepRoom[S.step];
  P.x = room.cx;
  P.y = room.cy + 150;
  comp.x = P.x - 40;
  comp.y = P.y;
  camYaw = -Math.PI / 2;
  mode = 'fight';
  startEnc(room, null, 'courier', toMenu);
  syncCourierTrack();
  lock();
}
$('devBoss').addEventListener('click', jumpToCourier);
$('devBack').addEventListener('click', closeDev);
$('devExit').addEventListener('click', toMenu);
$('devGod').addEventListener('click', () => {
  if (!devSession) return;
  devGod = !devGod;
  $('devGod').textContent = 'Бессмертие: ' + (devGod ? 'вкл.' : 'выкл.');
});
$('devHeal').addEventListener('click', () => { if (devSession) P.hp = maxHp(); });
$('devPhase').addEventListener('click', () => {
  const boss = fs?.boss;
  if (!devSession || !boss || boss.ph >= boss.d.phases.length - 1) return;
  boss.hp = Math.min(boss.hp, boss.maxhp * (1 - (boss.ph + 1) / boss.d.phases.length) - .01);
});
$('devWeapons').addEventListener('click', () => {
  if (!devSession) return;
  for (const weapon of Object.keys(WP)) {
    S.wl[weapon] = 5;
    WP[weapon].skills.forEach(skill => { S.sk[skill.id] = 1; });
  }
});
function setCourierTrack(url) {
  if (courierTrack) courierTrack.pause();
  const track = new Audio(url);
  courierTrack = track;
  track.loop = true;
  courierPlaying = false;
  track.addEventListener('error', () => {
    if (courierTrack !== track) return;
    $('devStatus').textContent = 'Трек недоступен. Выбери MP3 в панели.';
    courierTrack = null;
  }, { once: true });
}
$('devTrack').addEventListener('change', event => {
  const file = event.target.files[0];
  if (!file) return;
  if (courierTrackURL) URL.revokeObjectURL(courierTrackURL);
  courierTrackURL = URL.createObjectURL(file);
  setCourierTrack(courierTrackURL);
  $('devStatus').textContent = 'Выбран трек: ' + file.name;
});
$('pMenu').addEventListener('click', toMenu);
$('bEnd').addEventListener('click', toMenu);
$('cA').addEventListener('click', () => ending(true));
$('cB').addEventListener('click', () => ending(false));
$('bCont').disabled = !load();
$('stage').insertAdjacentHTML('beforeend', '<div id="boon" class="ov" style="background:rgba(5,6,10,.9);z-index:8"><h2 style="letter-spacing:6px;font-size:30px;margin-bottom:6px">БОСС ПОВЕРЖЕН</h2><p style="color:#9fb0c8;margin-bottom:22px;letter-spacing:2px">Выбери одно усиление — оно останется до конца игры</p><div id="boonList" class="row" style="gap:10px"></div></div>');
$('boonList').addEventListener('click', ev => { const b = ev.target.closest('button'); if (!b) return; const k = b.dataset.b; S.boons.push(k); if (k === 'thick') P.hp += 30; save(); show('boon', false); mode = 'fight'; lock(); banner(BOONS[k].n.toUpperCase(), 'усиление получено', '#ffd23b'); });
$('end').insertAdjacentHTML('beforeend', '<div id="endStats" style="max-width:780px;text-align:center;margin:6px 0 16px;line-height:1.5"></div><button id="bNG">Новая игра+ · враги сильнее, прокачка остаётся</button>');
$('end').appendChild($('bEnd'));
$('bNG').addEventListener('click', () => { S.ng = (S.ng || 0) + 1; S.ch = 0; S.step = 0; S.done = {}; S.q = {}; S.ending = null; S.tips = S.tips || {}; S.stat = { t: 0, deaths: 0, kills: 0, fin: 0, parry: 0, style: 0 }; save(); begin(); });
$('menu').querySelector('.tag').insertAdjacentHTML('afterend', '<div id="load" style="position:absolute;top:176px;color:#ffd23b;font-size:13px;letter-spacing:2px"></div>');
const HELP = [['Комбо', 'Три лёгких удара подряд — третий усиленный. Удар сразу после смены оружия сильнее на 35%.'], ['Заряд', 'Держи ПКМ: полный заряд бьёт в 2.3 раза сильнее, ломает щиты и подбрасывает.'], ['Перекат и парирование', 'Перекат сквозь удар в последний момент замедляет время и даёт крит. SHIFT в момент удара — парирование с оглушением.'],
  ['Реакции', 'Микрофон вешает шок, диски — питч. Бита по шоку: ВЗРЫВ НИЗОВ. Бита по питчу: РАСКОЛ. Микрофон по питчу: ЗАМЫКАНИЕ. Диск по шоку: ИСКРА.'], ['Добивания', 'Жёлтая полоска под здоровьем врага — оглушение. Заполнилась — жми F. Несколько оглушённых добиваются серией.'],
  ['Бита', 'C — бросок и возврат. Пока бита летит, Пахан дерётся кулаками. Броском сбиваются мишени 🎯 и ломаются завалы.'], ['СВЭГ', 'Полная шкала: R — ПЕРЕГРУЗ. Ещё раз R — УЛЬТА по комнате.'], ['Кент', 'Q — ад-либ. madk1d сам стреляет нотами и раз за главу поднимает после смертельного удара (кроме сложности «Андеграунд»).'],
  ['Стиль', 'Рейтинг D–SSS растёт от разнообразия и даёт до +36% опыта.'], ['Секреты', 'В каждой главе: тайная комната за завалом у портала и два тайника ✨ в углах боевых комнат.'], ['Геймпад', 'Левый стик — ход, правый — камера, X/Y — удары, A — перекат, B — действие, LB — блок, RB — руна, LT — ад-либ, RT — бросок, крестовина — оружие.']];
$('stage').insertAdjacentHTML('beforeend', '<div id="help" class="ov" style="background:rgba(5,6,10,.96);z-index:9;padding:26px 60px;justify-content:flex-start"><h2 style="letter-spacing:6px;margin-bottom:14px">МЕХАНИКИ</h2><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 18px;overflow:auto;flex:1;width:100%">' + HELP.map(q => '<div style="background:#131722;border:1px solid #232938;border-left:4px solid #ff3b3b;padding:10px 14px"><b style="font-size:15px;color:#ffd23b">' + q[0] + '</b><div style="font-size:13px;color:#b9c2d4;line-height:1.45;margin-top:3px">' + q[1] + '</div></div>').join('') + '</div><button id="helpX" style="margin-top:14px">Закрыть</button></div>');
$('helpX').addEventListener('click', () => show('help', false));
$('settings').insertAdjacentHTML('beforeend', '<div id="settingsGrid"><span>Чувствительность мыши</span><input id="oSens" type="range" min="0.3" max="2.5" step="0.1"><span>Громкость</span><input id="oVol" type="range" min="0" max="1" step="0.05"><label for="oVoice">Озвучка</label><input id="oVoice" type="range" min="0" max="1" step="0.05"><span>Графика</span><select id="oQ" style="padding:6px;background:#1a1d27;color:#fff;border:1px solid #3a4052"><option value="auto">Авто: держит 60 FPS</option><option value="mid">Средняя: тени без свечения</option><option value="hi">Высокая: тени и свечение</option><option value="lo">Низкая: быстрее</option></select><span>Сложность</span><select id="oD" style="padding:6px;background:#1a1d27;color:#fff;border:1px solid #3a4052"><option value="0">Изи</option><option value="1">Норм</option><option value="2">Андеграунд</option></select></div><div class="row"><button id="pHelp">Механики</button><button id="pBinds">Управление</button><button id="pFull">Полный экран</button><button id="settingsBack">Назад</button></div>');
$('menu').querySelector('.keys').insertAdjacentHTML('beforebegin', '<div class="row"><button id="mHelp" style="padding:8px 18px;font-size:13px">Механики и геймпад</button><button id="mBinds" style="padding:8px 18px;font-size:13px">Управление</button></div>');
const applyQ = () => { qual = OPT.q === 'lo' ? 0 : OPT.q === 'mid' ? 1 : 2; DYN = 1; if (R3) { setPR(); SUN.castShadow = qual > 0; } };
let settingsFrom = 'menu';
function openSettings() {
  settingsFrom = mode;
  $('oD').disabled = settingsFrom === 'menu';
  $('oD').value = S?.diff ?? 1;
  show(settingsFrom, false);
  mode = 'settings';
  show('settings', true);
}
function closeSettings() {
  const overlay = ['help', 'binds'].find(id => $(id).classList.contains('on'));
  if (overlay) { show(overlay, false); return; }
  show('settings', false);
  mode = settingsFrom;
  show(settingsFrom, true);
}
$('bSettings').addEventListener('click', openSettings);
$('pSettings').addEventListener('click', openSettings);
$('settingsBack').addEventListener('click', closeSettings);
$('oSens').value = OPT.sens; $('oVol').value = OPT.vol; $('oQ').value = OPT.q; $('oVoice').value = OPT.voice; applyQ();
$('oSens').addEventListener('input', e => { OPT.sens = +e.target.value; saveOpt(); });
$('oVol').addEventListener('input', e => { OPT.vol = +e.target.value; if (!OPT.vol) stopVoice(); if (MG) MG.gain.value = .5 * OPT.vol; saveOpt(); });
$('oVoice').addEventListener('input', e => { OPT.voice = +e.target.value; if (!OPT.voice) stopVoice(); saveOpt(); });
$('oQ').addEventListener('change', e => { OPT.q = e.target.value; applyQ(); saveOpt(); });
$('oD').addEventListener('change', e => { if (S) { S.diff = +e.target.value; save(); } });
$('pHelp').addEventListener('click', () => show('help', true));
$('stage').insertAdjacentHTML('beforeend', '<div id="binds" class="ov" style="background:rgba(5,6,10,.97);z-index:10;padding:22px 60px;justify-content:flex-start"><h2 style="letter-spacing:6px;margin-bottom:4px">УПРАВЛЕНИЕ</h2><p style="color:#9fb0c8;margin-bottom:12px;font-size:13px">Нажми на действие, потом на новую клавишу. Esc — отмена. Удары — левая и правая кнопки мыши, пауза — Esc.</p><div id="bindList" style="display:grid;grid-template-columns:1fr 1fr;gap:6px 22px;width:100%;overflow:auto;flex:1"></div><div class="row" style="margin-top:12px"><button id="bindReset">По умолчанию</button><button id="bindDone">Готово</button></div></div>');
function buildBinds() {
  $('bindList').innerHTML = Object.keys(KDEF).map(a => '<div style="display:flex;justify-content:space-between;align-items:center;background:#131722;border:1px solid #232938;padding:5px 6px 5px 14px"><span style="font-size:14px;color:#d5dcea">' + KLAB[a] + '</span><button data-k="' + a + '" style="margin:0;min-width:130px;padding:7px 12px;font-size:13px;letter-spacing:1px' + (BIND === a ? ';background:#ff3b3b;border-color:#ff3b3b' : '') + '">' + (BIND === a ? 'жми клавишу…' : KN(a)) + '</button></div>').join('');
}
$('bindList').addEventListener('click', e => { const b = e.target.closest('button[data-k]'); if (!b) return; BIND = b.dataset.k; buildBinds(); });
addEventListener('keydown', e => {
  if (!BIND) return; e.preventDefault(); e.stopImmediatePropagation();
  if (e.code !== 'Escape') { const old = KM[BIND], other = Object.keys(KM).find(a => a !== BIND && KM[a] === e.code); if (other) KM[other] = old; KM[BIND] = e.code; OPT.keys = Object.assign({}, KM); saveOpt(); for (const k in K) K[k] = false; }
  BIND = null; buildBinds();
}, true);
$('bindReset').addEventListener('click', () => { Object.assign(KM, KDEF); OPT.keys = {}; saveOpt(); BIND = null; buildBinds(); });
$('bindDone').addEventListener('click', () => { BIND = null; show('binds', false); });
$('pBinds').addEventListener('click', () => { buildBinds(); show('binds', true); });
$('pFull').addEventListener('click', toggleFS); $('mHelp').addEventListener('click', () => show('help', true)); $('mBinds').addEventListener('click', () => { buildBinds(); show('binds', true); });
function autoBuy(shop) {
  for (let n = 0, ok = true; ok && n < 80; n++) {
    ok = false;
    if (shop) for (const w of ['bat', 'mic', 'vinyl']) { const lv = S.wl[w]; if (lv > 0 && lv < 5 && S.tapes >= WLVL_COST[lv]) { S.tapes -= WLVL_COST[lv]; S.wl[w]++; ok = true; } }
    let best = null;
    for (const w in WP) { const lv = S.wl[w]; if (!lv) continue; WP[w].skills.forEach((s, i) => { if (!S.sk[s.id] && lv >= (SK_LVL[i] || 1) && S.xp >= s.cost && (!best || s.cost < best.c)) best = { c: s.cost, f: () => { S.sk[s.id] = 1; } }; }); }
    for (const s of STATS) { const lv = S.st[s.id]; if (lv < 5 && S.xp >= STAT_COST[lv] && (!best || STAT_COST[lv] < best.c)) best = { c: STAT_COST[lv], f: () => { S.st[s.id]++; if (s.id === 'hp') P.hp += 20; } }; }
    if (best) { S.xp -= best.c; best.f(); ok = true; }
  }
}

/* ================= ЦИКЛ ================= */
let last = 0;
function frame(ts) {
  if (window.__manual) { last = ts; requestAnimationFrame(frame); return; }
  const raw = Math.min(.033, (ts - last) / 1000 || 0); last = ts;
  logic(raw); render();
  requestAnimationFrame(frame);
}
function pad(dt) {
  const gp = navigator.getGamepads ? [...navigator.getGamepads()].find(q => q && q.connected) : null; if (!gp) return;
  const ax = gp.axes, bt0 = gp.buttons.map(b => b.pressed), dn = i => bt0[i] && !padPrev[i], dz = v => Math.abs(v) > .22 ? v : 0, key = (c, on) => { if (on) { K[c] = true; padKeys[c] = 1; } else if (padKeys[c]) { K[c] = false; padKeys[c] = 0; } };
  key(KM.left, dz(ax[0]) < 0); key(KM.right, dz(ax[0]) > 0); key(KM.up, dz(ax[1]) < 0); key(KM.down, dz(ax[1]) > 0); key(KM.block, bt0[4]);
  camYaw += dz(ax[2] || 0) * dt * 3.2 * OPT.sens; camPit = clamp(camPit + dz(ax[3] || 0) * dt * 1.4 * OPT.sens, .1, .85);
  if (bt0.some(Boolean) || dz(ax[0]) || dz(ax[1])) audio();
  const press = c => dispatchEvent(new KeyboardEvent('keydown', { code: c }));
  if (mode === 'fight') { M.l = bt0[2] || (padKeys.l ? false : M.l); padKeys.l = bt0[2] ? 1 : 0; if (bt0[3]) { M.r = true; padKeys.r = 1; } else if (padKeys.r) { M.r = false; padKeys.r = 0; } }
  if (mode === 'guide' && dn(0)) beginTomskPractice();
  else if (dn(0)) press(KM.dodge); if (dn(1)) press(KM.interact); if (dn(5)) press(KM.rune); if (dn(6)) press(KM.adlib); if (dn(7)) press(KM.thr); if (dn(10) || dn(11)) press(KM.rage);
  if (dn(14)) press(KM.w1); if (dn(12)) press(KM.w2); if (dn(15)) press(KM.w3); if (dn(8)) press(KM.menu); if (dn(9)) press('Escape');
  padPrev = bt0;
}
function logic(raw) {
  pad(raw);
  { const lb = $('load'); if (lb) { if (mdlDone < mdlTot) lb.textContent = 'Загрузка моделей: ' + mdlDone + ' / ' + mdlTot; else if (lb.textContent) lb.textContent = ''; } }
  if (document.pointerLockElement && mode !== 'fight' && mode !== 'dlg' && mode !== 'title') document.exitPointerLock();
  if (mode === 'fight') {
    let dt = raw;
    if (fs?.arch && !fs.done) fs.surv -= raw;
    if (cine) { cine.t += raw; if (cine.e.spawn > 0) cine.e.spawn -= raw; if (cine.t >= cine.dur) cine = null; dt = 0; }
    else if (P.fin && hitstop <= 0) updFin(raw);
    if (hitstop > 0) { hitstop -= raw; dt = 0; }
    if (slowmo > 0) { slowmo -= raw; dt *= .3; }
    if (bt > 0) { bt -= raw; dt *= .3; }
    if (dt > 0) update(dt);
  } else if (mode === 'dlg') {
    if (dialogHold !== null) {
      const progress = clamp((performance.now() - dialogHold) / (DIALOG_SKIP_SECONDS * 1000), 0, 1);
      $('dialogSkipFill').style.strokeDashoffset = 100 * (1 - progress);
      if (progress === 1) { endDlg(); return; }
    }
    if (dch < dfull.length) {
      const before = Math.floor(dch);
      dch = Math.min(dfull.length, dch + raw * 75);
      const after = Math.floor(dch);
      if (after > before) {
        $('dtext').textContent = dfull.slice(0, after);
        dialogueBlip(dfull.slice(before, after));
      }
    }
    updFx(raw);
  } else if (mode === 'title') {
    titleT -= raw; if (titleT <= 0) { show('title', false); const cb = titleCb; titleCb = null; cb(); }
  }
  if (toastT > 0) { toastT -= raw; if (toastT <= 0) $('toast').style.display = 'none'; }
}
requestAnimationFrame(ts => {
  const boot = $('boot');
  try {
    frame(ts);
    boot.style.display = 'none';
  } catch (error) {
    console.error('Game startup failed:', error);
    const status = boot.querySelector('span');
    status.textContent = /webgl/i.test(String(error))
      ? 'WebGL недоступен. Открой игру в Chrome или Edge с включённым аппаратным ускорением.'
      : 'Ошибка запуска: ' + error.message;
    status.style.cssText = 'font: 16px Segoe UI, sans-serif; letter-spacing: normal; margin-top: 14px; max-width: 75%; text-align: center; color: #e8ecf4';
  }
});
try { document.fonts.load('16px "Russo One"'); } catch (e) {}

// для отладки из консоли: GOC.skip() — пропустить шаг, GOC.goto(глава) — прыгнуть к главе (0..8)
window.GOC = {
  yaw: v => { camYaw = v; }, autobuy: s => autoBuy(s), stat: () => S.stat, P: () => ({ hp: P.hp, max: maxHp(), swag: P.swag, rage: P.rage, w: S.weapon, wl: S.wl, comp: S.comp, tapes: S.tapes }),
  ens: () => ens.filter(e => !e.dead && e.spawn <= 0).map(e => ({ x: e.x, y: e.y, r: e.r, st: e.state, boss: !!e.boss, fin: !!e.fin, air: e.air > 0, mv: e.mv, t: e.t, ai: e.ai, beam: !!e.beam })), haz: () => haz.filter(h => !h.pl).map(h => ({ x: h.x, y: h.y, r: h.r, t: h.t })), prj: () => prj.filter(p => p.from === 'e').map(p => ({ x: p.x, y: p.y })), waves: () => waves.map(w => ({ x: w.x, y: w.y, r: w.r })),
  kill: () => { for (const e of ens.slice()) if (!e.dead) { e.hp = 0; kill(e, {}); } },
  auto: () => { if (fs || mode !== 'fight') return; const t = exitOpen() ? ents.find(o => o.k === 'portal') : objRoom ? { x: objRoom.cx, y: objRoom.cy } : null; if (t) { P.x = t.x; P.y = t.y; } },
  tp: (x, y) => { P.x = x; P.y = y; },
  goto: n => { S.ch = n; S.step = 0; startChapter(); },
  rich: () => { S.xp += 20000; S.tapes += 20; },
  god: () => { P.inv = 1e9; },
  all: () => { for (const w in WP) { S.wl[w] = 5; WP[w].skills.forEach(q => S.sk[q.id] = 1); } S.comp = 4; },
  tick: (n, nr) => { for (let i = 0; i < n; i++) logic(1 / 60); if (!nr) render(); },
  full: () => { P.swag = 100; }, clearFx: () => { banners = []; txt = []; },
  sc: () => SC, r3: () => R3, mdl: () => MDL, ms: r => mergeSkinned(r),
  perf: n => { const t = []; for (let i = 0; i < n; i++) { logic(1 / 60); const a = performance.now(); render(); t.push(performance.now() - a); } t.sort((a, b) => a - b); const r = R3.info.render, m = R3.info.memory; return { avg: +(t.reduce((a, b) => a + b, 0) / n).toFixed(2), p95: +t[Math.floor(n * .95)].toFixed(2), calls: r.calls, tris: r.triangles, geo: m.geometries, tex: m.textures, objs: (() => { let c = 0; SC.traverse(() => c++); return c; })(), load: window.__loadMs, bake: window.__bake }; },
  dbg: () => ({ cine: cine && { t: cine.t, k: cine.k || cine.type || 1 }, dcd: P.dcd, mode, camYaw, camPit, camD, bt, slowmo, hitstop, aim: P.aim, dodge: P.dodge, dvx: P.dvx, chg: P.chg, inv: P.inv, sw: P.swag, fsr: fs && [fs.room.x, fs.room.w, fs.room.cx], T, obsBad: obs.filter(b => !(b.r === b.r) || !(b.x === b.x)).length }),
  lv: () => LV, ents: () => ents, interact: () => doInteract(),
  state: () => ({ mode, ch: S && S.ch, step: S && S.step, hp: P && P.hp, ens: ens.length, xp: S && S.xp, fs: !!fs, prompt, q: S && S.q, done: S && S.done, x: P && P.x, y: P && P.y }),
};
})();
