// Съёмка кадров для трейлера. Вставить в консоль страницы игры (index.html?q=hi, окно 1280×720),
// запущенной через dev-сервер, который принимает PUT /__save?name=файл и сохраняет кадры в папку frames.
// Игровой цикл останавливается (__manual), время идёт ровно 1/30 c на кадр (__clock), интерфейс скрыт (__noHud).
window.k = c => { dispatchEvent(new KeyboardEvent('keydown', { code: c })); dispatchEvent(new KeyboardEvent('keyup', { code: c })); };
const cv = document.getElementById('c'); cv.requestPointerLock = null;
window.md = b => cv.dispatchEvent(new MouseEvent('mousedown', { button: b, clientX: 640, clientY: 300, bubbles: true }));
window.mu = b => dispatchEvent(new MouseEvent('mouseup', { button: b }));
window.__clock = 1000; window.__manual = true; window.__noHud = true;
window.cap = async (name, overlay) => { const gl = document.getElementById('gl'), o = document.createElement('canvas'); o.width = 1280; o.height = 720; const x = o.getContext('2d'); x.drawImage(gl, 0, 0, 1280, 720); if (overlay !== false) x.drawImage(cv, 0, 0, 1280, 720); return (await fetch('/__save?name=' + name, { method: 'PUT', body: o.toDataURL('image/jpeg', .9) })).ok; };
window.step = () => { window.__clock += 1 / 30; GOC.tick(2); };
window.shoot = async (prefix, n, drv, overlay) => { for (let i = 0; i < n; i++) { if (drv) drv(i); step(); await cap(prefix + String(i).padStart(3, '0') + '.jpg', overlay); } };
// водитель боя: плавно смотрит на ближайшего врага, бьёт, заряжает тяжёлый удар, жмёт руну/ад-либ/бросок/ульту по расписанию
window.fight = o => { o = o || {}; let hv = 0, yaw = GOC.dbg().camYaw; return i => {
  const s = GOC.state(); if (s.mode === 'dlg') k('Escape'); if (o.w) k('Digit' + o.w);
  const es = GOC.ens(); if (!es.length) { mu(0); return; }
  let n = es[0], nd = 1e9; for (const e of es) { const d = Math.hypot(e.x - s.x, e.y - s.y) - e.r; if (d < nd) { nd = d; n = e; } }
  const fin = es.find(e => e.fin && Math.hypot(e.x - s.x, e.y - s.y) < 160), t = fin || n;
  let dd = Math.atan2(t.y - s.y, t.x - s.x) - yaw; while (dd > Math.PI) dd -= Math.PI * 2; while (dd < -Math.PI) dd += Math.PI * 2; yaw += dd * (o.turn || .12); GOC.yaw(yaw); GOC.god();
  dispatchEvent(new KeyboardEvent(nd > 90 && !hv ? 'keydown' : 'keyup', { code: 'KeyW' }));
  if (hv > 0) { hv--; if (hv === 0) mu(2); return; } if (o.heavy && i % o.heavy === o.heavy - 1) { mu(0); md(2); hv = 14; return; }
  if (nd < 140) md(0); else mu(0); if (fin) k('KeyF'); if (o.q && i % o.q === 5) k('KeyQ'); if (o.e && i % o.e === 9) k('KeyE'); if (o.c && i % o.c === 3) k('KeyC');
  if (o.r && i === o.r) { GOC.full(); k('KeyR'); } if (o.r2 && i === o.r2) k('KeyR'); }; };
window.goFight = ch => { GOC.goto(ch); let g = 0; while (g++ < 600) { const s = GOC.state(); if (s.mode === 'title') { window.__clock += .5; GOC.tick(30, true); } else if (s.mode === 'dlg') k('Escape'); else if (s.fs) break; else { GOC.auto(); window.__clock += 1 / 30; GOC.tick(2, true); } } GOC.all(); GOC.god(); };
// Кадры трейлера (30 кадров/с):
//  A 120 — Томск: старт главы 0, GOC.yaw от 1.0 до 2.2 без врагов
//  B 129 — герои из главного меню: __clock от 5.5, без оверлея (overlay=false)
//  C 129 — goFight(0), fight({w:1,heavy:22,q:45,e:60,r:70,r2:95})
//  E  60 — goFight(1), fight({w:1,heavy:16,e:20});  F 60 — goFight(2), fight({w:2,heavy:18,e:12,q:30})
//  G  78 — goFight(3), fight({w:3,heavy:20,e:15,c:40}) + GOC.clearFx() первые 40 кадров
//  H  84 — заставка босса главы 2 (Леди Хайп): дойти до шага с боссом, GOC.clearFx(), снимать с первого кадра
//  I  75 — бой с боссом: fight({w:1,heavy:14,e:8,q:20,r:12,r2:40,turn:.2})
// Дальше: tts.ps1 (озвучка голосом Pavel), node music.js (музыка), compose.html → запись MP4, node remux.js (обычный MP4).
