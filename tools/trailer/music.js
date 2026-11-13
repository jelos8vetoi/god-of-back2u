// Синтез музыки для трейлера: 30 c, 44.1 кГц, стерео → music.wav
const fs = require('fs'), SR = 44100, LEN = 30.5, N = Math.ceil(SR * LEN);
const L = new Float32Array(N), R = new Float32Array(N), SEND = new Float32Array(N);
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const midi = n => 440 * Math.pow(2, (n - 69) / 12);
function put(i, v, pan, send) { if (i < 0 || i >= N) return; const p = pan || 0; L[i] += v * (1 - Math.max(0, p)); R[i] += v * (1 + Math.min(0, p)); if (send) SEND[i] += v * send; }
// осциллятор с огибающей; f — число или функция от времени внутри ноты
function tone(t0, dur, f, o) {
  o = o || {}; const a = o.a || .005, rel = o.r || .1, vol = o.v || .3, type = o.type || 'sine', i0 = Math.floor(t0 * SR), n = Math.floor((dur + rel) * SR); let ph = 0;
  for (let k = 0; k < n; k++) {
    const t = k / SR, fr = typeof f === 'function' ? f(t) : f; ph += fr / SR;
    let s = type === 'sine' ? Math.sin(2 * Math.PI * ph) : type === 'saw' ? 2 * (ph % 1) - 1 : type === 'sq' ? (ph % 1 < .5 ? 1 : -1) : Math.abs(4 * (ph % 1) - 2) - 1;
    const env = (t < a ? t / a : 1) * (t > dur ? Math.max(0, 1 - (t - dur) / rel) : 1) * (o.decay ? Math.exp(-t / o.decay) : 1);
    put(i0 + k, s * env * vol * (o.drive ? 1 : 1), o.pan, o.send);
  }
}
function noise(t0, dur, o) {
  o = o || {}; const i0 = Math.floor(t0 * SR), n = Math.floor(dur * SR), vol = o.v || .2; let lp = 0, hp = 0, prev = 0;
  for (let k = 0; k < n; k++) {
    const t = k / SR, x = rnd() * 2 - 1, cut = typeof o.cut === 'function' ? o.cut(t) : (o.cut || 8000), c = Math.min(1, 2 * Math.PI * cut / SR);
    lp += (x - lp) * c; let y = lp; if (o.hp) { hp = .985 * (hp + y - prev); prev = y; y = hp; }
    const env = typeof o.env === 'function' ? o.env(t) : Math.exp(-t / (o.decay || .1));
    put(i0 + k, y * env * vol, o.pan || (o.wide ? rnd() * .6 - .3 : 0), o.send);
  }
}
const kick = (t, v) => { tone(t, .02, x => 45 + 120 * Math.exp(-x * 28), { v: v || .9, r: .32, decay: .22 }); noise(t, .02, { v: .25, cut: 3000, decay: .008 }); };
const sub808 = (t, n, dur, glide) => tone(t, dur, x => midi(n) * (glide && x > dur * .6 ? Math.pow(2, glide * Math.min(1, (x - dur * .6) / (dur * .4)) / 12) : 1), { v: .55, r: .25, decay: dur * 1.4 });
const clap = (t, v) => { for (const d of [0, .011, .022]) noise(t + d, .2, { v: (v || .4), cut: 4500, hp: 1, decay: .06, send: .35 }); };
const hat = (t, v, open) => noise(t, open ? .25 : .05, { v: v || .09, cut: 14000, hp: 1, decay: open ? .09 : .018, wide: 1 });
const braam = (t, root, big) => {
  for (const [n, det] of [[root, 0], [root, 7], [root + 12, -6], [root + 7, 5], [root + 12, 4]]) tone(t, big ? 2.2 : 1.4, x => midi(n) * Math.pow(2, det / 1200) * (1 - .04 * Math.min(1, x / 1.5)), { type: 'saw', v: big ? .13 : .1, a: .01, r: 1.2, decay: big ? 1.6 : 1.1, send: .5, pan: det / 20 });
  tone(t, 1.5, x => midi(root - 12) * (1 - .3 * Math.min(1, x)), { v: .6, r: .8, decay: 1 });
  noise(t, 2.5, { v: big ? .5 : .35, cut: x => 9000 * Math.exp(-x * 2) + 300, decay: big ? .9 : .5, send: .6, wide: 1 });
  kick(t, 1);
};
const riser = (t0, dur) => { noise(t0, dur, { v: .25, cut: x => 300 + 9000 * Math.pow(x / dur, 2), env: x => Math.pow(x / dur, 2.2), hp: 1, send: .4, wide: 1 }); tone(t0, dur, x => 180 + 900 * Math.pow(x / dur, 2), { type: 'tri', v: .05, a: dur * .9, r: .02 }); };
const pad = (t0, dur, notes, v) => { for (const n of notes) for (const d of [-7, 7]) tone(t0, dur, midi(n) * Math.pow(2, d / 1200), { type: 'saw', v: v || .03, a: 1.2, r: 1.5, send: .4, pan: d / 14 }); };

// 0–12: вступление, D-минор
pad(0, 12.2, [38, 41, 45, 50], .028);
tone(0, 12, 36.7, { v: .2, a: 2, r: .2 });
noise(0, 12, { v: .05, cut: 700, env: x => .6 + .4 * Math.sin(x * 1.3), wide: 1, send: .3 });
for (let b = 4; b < 12; b += 1) kick(b, b < 8 ? .45 : .6);               // сердцебиение
for (let b = 8; b < 12; b += .25) hat(b, b % .5 ? .04 : .07);
for (const [t, n] of [[4, 62], [6, 65], [8, 69], [10, 67]]) tone(t, 1.6, midi(n), { type: 'tri', v: .07, a: .02, r: 1.2, decay: 1.2, send: .7 });
riser(10, 2);
// 12: удар и тишина
braam(12, 38, false);
// 13–19: дроп, сетка 120 BPM от 13 с
const T0 = 13, B = .5;
for (let bar = 0; bar < 3; bar++) {
  const s = T0 + bar * 2;
  braam(s, 38 + [0, 3, 5][bar], false);
  kick(s, 1); kick(s + 1.25, .8); if (bar !== 1) kick(s + 1.75, .7);
  sub808(s, 26 + [0, 3, 5][bar], .9, -2); sub808(s + 1.25, 26 + [0, 3, 5][bar], .6, bar === 2 ? 5 : 0);
  clap(s + 1, .45);
  for (let h = 0; h < 2; h += .125) hat(s + h, h % .25 ? .05 : .09);
  if (bar === 2) for (let h = 1.5; h < 2; h += 1 / 24) hat(s + h, .08);
  for (const n of [62, 65, 69]) tone(s, .2, midi(n + [0, 3, 5][bar]), { type: 'sq', v: .035, r: .15, decay: .15, send: .5 });
}
// 19–24.3: босс, тяжелее и медленнее
braam(19, 36, true);
pad(19, 5.2, [36, 39, 43], .03);
for (let b = 19; b < 24; b += 1) { kick(b, .9); sub808(b, 24, .7, 0); }
for (let b = 20; b < 24; b += 2) clap(b, .5);
for (let b = 19.5; b < 24; b += .5) for (const d of [0, .12]) tone(b + d, .1, x => 110 * Math.exp(-x * 6), { v: .25, r: .1, decay: .12 });
for (let h = 19; h < 24; h += .25) hat(h, .06);
riser(22.8, 1.5);
// 24.3: финальный удар и хвост
braam(24.3, 26, true); braam(24.3, 38, true);
sub808(24.3, 26, 2.4, -7);
pad(24.6, 5.4, [38, 45, 50, 53], .03);
for (const [t, n] of [[25.2, 74], [25.8, 72], [26.4, 69]]) tone(t, 1.4, midi(n), { type: 'tri', v: .06, a: .01, r: 1.5, decay: 1.6, send: .8 });
kick(27.6, .8); sub808(27.6, 26, 1.5, 0); noise(27.6, 1.8, { v: .2, cut: 6000, decay: .6, send: .5, wide: 1 });

// реверб: 4 гребёнки + 2 allpass по шине SEND
const RL = new Float32Array(N), RRb = new Float32Array(N);
for (const [buf, d0] of [[RL, 0], [RRb, 23]]) {
  const combs = [1557, 1617, 1491, 1422].map(d => ({ d: d + d0, b: new Float32Array(d + d0), i: 0, fb: .84, lp: 0 }));
  const aps = [225, 556].map(d => ({ d, b: new Float32Array(d), i: 0 }));
  for (let n = 0; n < N; n++) {
    let x = SEND[n] * .015, y = 0;
    for (const c of combs) { const o = c.b[c.i]; c.lp = o * .7 + c.lp * .3; c.b[c.i] = x + c.lp * c.fb; c.i = (c.i + 1) % c.d; y += o; }
    for (const a of aps) { const o = a.b[a.i]; const z = y + o * .5; a.b[a.i] = z; y = o - z * .5; a.i = (a.i + 1) % a.d; }
    buf[n] = y;
  }
}
let peak = 0;
for (let n = 0; n < N; n++) { L[n] = Math.tanh((L[n] + RL[n] * 1.4) * 1.1); R[n] = Math.tanh((R[n] + RRb[n] * 1.4) * 1.1); peak = Math.max(peak, Math.abs(L[n]), Math.abs(R[n])); }
const g = .92 / peak, out = Buffer.alloc(44 + N * 4);
out.write('RIFF', 0); out.writeUInt32LE(36 + N * 4, 4); out.write('WAVE', 8); out.write('fmt ', 12); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22);
out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34); out.write('data', 36); out.writeUInt32LE(N * 4, 40);
for (let n = 0; n < N; n++) { out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[n] * g)) * 32767), 44 + n * 4); out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[n] * g)) * 32767), 46 + n * 4); }
fs.writeFileSync(require('path').join(__dirname, 'music.wav'), out);
console.log('music.wav', (out.length / 1048576).toFixed(1) + ' MB', 'peak', peak.toFixed(2));
