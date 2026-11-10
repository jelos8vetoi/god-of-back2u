/* ================= ХОД СЮЖЕТА / ЛОКАЦИЯ ================= */
let LV = null, ents = [], objRoom = null, prompt = '', target = null;
const inR = (r, x, y, m) => x >= r.x + m && x <= r.x + r.w - m && y >= r.y + m && y <= r.y + r.h - m;
function okPos(x, y, m) { for (const r of LV.rects) if (inR(r, x, y, m)) return true; return false; }
const RX = (v, m) => clamp(v, fs.room.x + m, fs.room.x + fs.room.w - m), RY = (v, m) => clamp(v, fs.room.y + m, fs.room.y + fs.room.h - m);
const steps = () => CH[S.ch].steps;
const exitOpen = () => { const st = steps()[S.step]; return !st || st.t === 'shop'; };
function makeDeco() {
  deco = []; const k = CH[S.ch].th.deco;
  for (const r of LV.rooms) { const n = Math.round(r.w * r.h / 52000); for (let i = 0; i < n; i++) deco.push({ x: rnd(r.x + 70, r.x + r.w - 70), y: rnd(r.y + 70, r.y + r.h - 70), s: rnd(.6, 1.3), v: Math.random(), k }); }
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
  P.x = cp.cx; P.y = cp.cy + 40; P.atk = null; P.dodge = 0; P.inv = 0; P.spin = 0; slowmo = 0; hitstop = 0; comp.x = P.x - 40; comp.y = P.y + 30;
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
  toast(title + ':  ' + a.join('  ·  '), 4.5); sfx.buy(); save();
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
  P.hp = Math.min(maxHp(), P.hp + maxHp() * .08); P.swag = Math.min(100, P.swag + 15);
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

