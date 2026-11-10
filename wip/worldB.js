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
  if (worldG) SC.remove(worldG); worldG = new T3.Group(); SC.add(worldG); spinners = [];
  const bg = new T3.Color(th.bg); SC.background = bg; SC.fog = new T3.Fog(bg, 900, 2300);
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
  const wall = (x, z, sx, h, sz, m) => { const q = new T3.Mesh(bx, m); q.scale.set(sx, h, sz); q.position.set(x, h / 2, z); q.castShadow = h > 30; q.receiveShadow = true; worldG.add(q); };
  for (const r of LV.rects) {
    for (const [hz, c, out, h, m] of [[1, r.y, -14, 150, wm], [1, r.y + r.h, 14, 20, lm], [0, r.x, -14, 70, wm], [0, r.x + r.w, 14, 70, wm]]) {
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
  for (const r of LV.rooms) if (r.kind === 'boss') {
    const rg = new T3.Mesh(new T3.RingGeometry(300, 316, 64).rotateX(-Math.PI / 2), new T3.MeshBasicMaterial({ color: '#ff3b3b', transparent: true, opacity: .5 })); rg.position.set(r.cx, 1.2, r.cy); worldG.add(rg);
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const px = r.cx + dx * (r.w / 2 - 70), pz = r.cy + dy * (r.h / 2 - 70); worldG.add(cyl(26, 32, 150, '#2a2c3a', px, 75, pz), sph(18, '#ff3b3b', px, 165, pz, { emissive: '#ff3b3b', emissiveIntensity: 1 })); }
  }
/*PROPS*/
  for (const o of ents) {
    const g = new T3.Group();
    if (o.k === 'npc' || o.k === 'seva') {
      const c = o.k === 'seva' ? '#ffae3b' : NPCS[o.id].c;
      g.add(cyl(13, 17, 36, c, 0, 18, 0), sph(9.5, '#e8c39e', 0, 44, 0), cyl(10, 10.5, 5, '#22242e', 0, 51, 0), box(9, 2, 14, '#22242e', 8, 49, 0), emo(o.k === 'seva' ? '🔧' : '🎤', 26, 80));
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
  if (ob) { X.font = 'bold 15px "Segoe UI"'; X.fillStyle = '#ffd23b'; X.fillText('◆ ' + ob, 30, y); y += 22; }
  X.font = '13px "Segoe UI"';
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
  if (prompt) { X.textAlign = 'center'; X.font = 'bold 18px "Segoe UI"'; const w = X.measureText(prompt).width + 36; X.fillStyle = 'rgba(8,10,16,.85)'; X.fillRect(W / 2 - w / 2, H - 150, w, 36); X.strokeStyle = '#ffd23b'; X.lineWidth = 1; X.strokeRect(W / 2 - w / 2, H - 150, w, 36); X.fillStyle = '#ffd23b'; X.fillText(prompt, W / 2, H - 126); }
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
  X.textAlign = 'left';
}
