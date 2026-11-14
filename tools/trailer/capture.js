// Съёмка кадров для трейлера GOD OF GRIMERKA. Выполняется в странице игры (index.html?q=hi, 1280×720),
// открытой через dev-сервер, который принимает PUT /__save?name=файл и кладёт кадры в папку frames.
// Игровой цикл останавливается (__manual), время идёт ровно 1/30 c на кадр (__clock), интерфейс скрыт (__noHud).
// Возвращает журнал: что снято и в каком состоянии была игра.
(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms)), log = [];
  const k = c => { dispatchEvent(new KeyboardEvent('keydown', { code: c })); dispatchEvent(new KeyboardEvent('keyup', { code: c })); };
  const cv = document.getElementById('c'), gl = document.getElementById('gl'); cv.requestPointerLock = null;
  const md = b => cv.dispatchEvent(new MouseEvent('mousedown', { button: b, clientX: 640, clientY: 300, bubbles: true }));
  const mu = b => dispatchEvent(new MouseEvent('mouseup', { button: b }));
  for (let i = 0; i < 80 && !(window.GOC && document.querySelector('[data-d="1"]')); i++) await sl(250);
  await sl(2500);
  localStorage.clear();
  window.__clock = 1000; window.__manual = true; window.__noHud = true;
  const o = document.createElement('canvas'); o.width = 1280; o.height = 720; const ox = o.getContext('2d');
  const cap = async (name, overlay) => { ox.drawImage(gl, 0, 0, 1280, 720); if (overlay !== false) ox.drawImage(cv, 0, 0, 1280, 720); await fetch('/__save?name=' + name, { method: 'PUT', body: o.toDataURL('image/jpeg', .9) }); };
  const step = nr => { window.__clock += 1 / 30; GOC.tick(2, nr); };
  const shoot = async (p, n, drv, overlay) => { for (let i = 0; i < n; i++) { if (drv) drv(i); step(); await cap(p + String(i).padStart(3, '0') + '.jpg', overlay); } log.push(p + ' ' + n + ' ' + GOC.state().mode + ' ens=' + GOC.ens().length); };
  const warm = (n, drv) => { for (let i = 0; i < n; i++) { if (drv) drv(i); step(true); } };
  // всё, что не бой: диалоги, обучение, выбор усилений — проматываем
  const unstick = () => {
    const m = GOC.state().mode;
    if (m === 'dlg') GOC.skip();
    else if (m === 'title') { window.__clock += .5; GOC.tick(30, true); }
    else if (m !== 'fight') { for (const id of ['guideSkip', 'guideGo']) { const b = document.getElementById(id); if (b && !b.hidden && b.offsetParent) { b.click(); return m; } }
      const b = [...document.querySelectorAll('.ov')].filter(v => getComputedStyle(v).display !== 'none').map(v => v.querySelector('button')).find(Boolean); if (b) b.click(); else k('Enter'); }
    return m;
  };
  const toFight = ch => { GOC.goto(ch); for (let g = 0; g < 900; g++) { const s = GOC.state(); if (s.mode !== 'fight') unstick(); else if (s.fs) break; else { GOC.auto(); step(true); } } GOC.all(); GOC.god(); };
  const toBoss = () => { for (let g = 0; g < 4000; g++) { const s = GOC.state(); if (s.mode !== 'fight') { unstick(); continue; } if (GOC.dbg().cine) return true; if (GOC.ens().length) GOC.kill(); GOC.auto(); step(true); if (GOC.dbg().cine) return true; } return false; };
  // водитель боя: смотрит на ближайшего врага, бьёт, заряжает тяжёлый, жмёт руну/ад-либ/бросок/ульту, кувыркается
  const fight = q => { q = q || {}; let hv = 0, yaw = GOC.dbg().camYaw; return i => {
    const s = GOC.state(); if (s.mode !== 'fight') { unstick(); return; } if (q.w && i % 30 === 0) k('Digit' + q.w);
    const es = GOC.ens(); if (!es.length) { mu(0); return; }
    let n = es[0], nd = 1e9; for (const e of es) { const d = Math.hypot(e.x - s.x, e.y - s.y) - e.r; if (d < nd) { nd = d; n = e; } }
    const fin = es.find(e => e.fin && Math.hypot(e.x - s.x, e.y - s.y) < 160), t = fin || n;
    let dd = Math.atan2(t.y - s.y, t.x - s.x) - yaw + (q.off || 0); while (dd > Math.PI) dd -= Math.PI * 2; while (dd < -Math.PI) dd += Math.PI * 2; yaw += dd * (q.turn || .12); GOC.yaw(yaw); GOC.god();
    dispatchEvent(new KeyboardEvent(nd > 90 && !hv ? 'keydown' : 'keyup', { code: 'KeyW' }));
    if (q.roll && i % q.roll === q.roll - 1) { dispatchEvent(new KeyboardEvent('keydown', { code: q.rk || 'KeyD' })); GOC.roll(); dispatchEvent(new KeyboardEvent('keyup', { code: q.rk || 'KeyD' })); return; }
    if (hv > 0) { hv--; if (hv === 0) mu(2); return; } if (q.heavy && i % q.heavy === q.heavy - 1) { mu(0); md(2); hv = 14; return; }
    if (nd < 140) md(0); else mu(0); if (fin) k('KeyF'); if (q.q && i % q.q === 5) k('KeyQ'); if (q.e && i % q.e === 9) k('KeyE'); if (q.c && i % q.c === 3) k('KeyC');
    if (q.r != null && i === q.r) { GOC.full(); k('KeyR'); } if (q.r2 && i === q.r2) k('KeyR'); }; };
  const safe = async (name, f) => { try { await f(); } catch (e) { log.push(name + ' ERR ' + e.message); } };

  // B — герои в главном меню (без оверлея)
  await safe('B', async () => { window.__clock = 5.5; await shoot('B', 80, null, false); window.__clock = 1000; });
  document.querySelector('[data-d="1"]').click(); await sl(300);
  // A — Томск: медленная панорама без врагов
  await safe('A', async () => { GOC.goto(0); for (let g = 0; g < 200 && GOC.state().mode !== 'fight'; g++) unstick(); GOC.clearFx(); const y0 = GOC.dbg().camYaw; await shoot('A', 90, i => GOC.yaw(y0 - .5 + i * .012)); });
  // C — первый бой в Томске
  await safe('C', async () => { toFight(0); const d = fight({ w: 1, heavy: 22, q: 45 }); warm(20, d); await shoot('C', 90, i => d(i + 20)); });
  // R — перекаты
  await safe('R', async () => { toFight(1); const d = fight({ w: 1, roll: 16, off: .5 }); warm(14, d); await shoot('R', 70, i => d(i + 14)); });
  // D1..D8 — по бою из каждой главы, разное оружие
  const SET = { 1: { w: 1, heavy: 16, e: 20 }, 2: { w: 2, heavy: 18, e: 12, q: 30 }, 3: { w: 3, heavy: 20, e: 15, c: 40 }, 4: { w: 1, heavy: 14, e: 10, r: 5 }, 5: { w: 2, heavy: 15, e: 14, q: 22 }, 6: { w: 3, heavy: 17, e: 9 }, 7: { w: 1, heavy: 13, e: 12, r: 8, r2: 30 }, 8: { w: 2, heavy: 16, e: 10, q: 18, roll: 23 } };
  for (let ch = 1; ch <= 8; ch++) {
    await safe('D' + ch, async () => { toFight(ch); const d = fight(SET[ch]); warm(24, d); GOC.clearFx(); await shoot('D' + ch + '_', 50, i => d(i + 24)); });
    if (ch % 2) continue;
    // H — заставка босса, I — бой с ним
    await safe('H' + ch, async () => { if (!toBoss()) { log.push('H' + ch + ' no boss'); return; } GOC.clearFx(); await shoot('H' + ch + '_', 66);
      for (let g = 0; g < 200 && (GOC.dbg().cine || GOC.state().mode !== 'fight'); g++) { if (GOC.state().mode !== 'fight') unstick(); else { k('Enter'); step(true); } }
      GOC.all(); GOC.god(); const d = fight({ w: 1 + (ch / 2) % 3, heavy: 14, e: 8, q: 20, r: 6, r2: 34, turn: .2 }); warm(10, d); await shoot('I' + ch + '_', 60, i => d(i + 10)); });
  }
  return log;
})()
