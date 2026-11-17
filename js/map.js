/* Seyir haritası: nokta ızgarasıyla kara, hat çizgileri, limanlar, gemiler ve yükler. */
(function (K) {
'use strict';
const {PORTS, LANES, LM, VIEW, clamp} = K;
const M = K.map = {};
const DOTS = []; { const dl = 1.75, dt = dl * 104 / 140; let r = 0;
  for (let lat = VIEW.lat1 - dt / 2; lat > VIEW.lat0; lat -= dt, r++) for (let lon = VIEW.lon0 + dl / 2 + (r % 2 ? dl / 2 : 0); lon < VIEW.lon1; lon += dl)
    if (K.LAND.some(p => K.inPoly(p, lon, lat)) && !K.WATER.some(p => K.inPoly(p, lon, lat))) DOTS.push([lon, lat]); }
let cv, cx, W = 0, H = 0, dpr = 1, land = null; const col = {};
const px = (lon, lat) => [(lon - VIEW.lon0) / 280 * W, (VIEW.lat1 - lat) / 104 * H];
const font = () => getComputedStyle(document.body).fontFamily;
function readCols() { const cs = getComputedStyle(document.documentElement); ['sea', 'paper', 'land', 'ink', 'muted', 'line', 'depth', 'magenta', 'c-red', 'c-blue', 'c-green', 'c-orange'].forEach(k => col[k] = cs.getPropertyValue('--' + k).trim()); }
function build() { readCols(); land = document.createElement('canvas'); land.width = W * dpr; land.height = H * dpr; const c = land.getContext('2d'); c.scale(dpr, dpr);
  c.fillStyle = col.sea; c.fillRect(0, 0, W, H);
  c.strokeStyle = col.line; c.lineWidth = .6; c.globalAlpha = .7; c.beginPath();
  for (let lon = -120; lon <= 150; lon += 30) { const x = px(lon, 0)[0]; c.moveTo(x, 0); c.lineTo(x, H); }
  for (let lat = -30; lat <= 60; lat += 30) { const y = px(0, lat)[1]; c.moveTo(0, y); c.lineTo(W, y); } c.stroke(); c.globalAlpha = 1;
  c.fillStyle = col.land; const r = Math.max(.9, W / 280 * 1.75 * .36); c.beginPath();
  DOTS.forEach(d => { const [x, y] = px(d[0], d[1]); c.moveTo(x + r, y); c.arc(x, y, r, 0, 6.2832); }); c.fill();
  if (W >= 560) { c.fillStyle = col.depth; c.font = `500 ${W >= 760 ? 10 : 9}px ${font()}`; c.textAlign = 'center'; if ('letterSpacing' in c) c.letterSpacing = '3px';
    [['ATLAS OKYANUSU', -47, 26], ['HİNT OKYANUSU', 84, -27], ['PASİFİK', 136, 17], ['PASİFİK', -112, 14]].forEach(([t, lo, la]) => { const [x, y] = px(lo, la); c.fillText(t, x, y); }); } }
M.resize = () => { const w = cv.parentElement.clientWidth; if (!w) return; W = w; H = Math.round(w / 2); dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = W * dpr; cv.height = H * dpr; cv.style.height = H + 'px'; build(); M.draw(); };
M.retheme = () => { if (W) { build(); M.draw(); } };
function trace(l) { let pen = false; cx.beginPath(); for (const p of l.path) { if (!p) { pen = false; continue; } const [x, y] = px(p[0], p[1]); pen ? cx.lineTo(x, y) : cx.moveTo(x, y); pen = true; } }
M.markers = () => { const S = K.S, G = S.G, out = [], frac = s => clamp((s.total - s.left) / s.total, .02, .98);
  if (!G) { LANES.forEach((l, i) => { const t = (S.demoT / (l.weeks * 9) + i * .37) % 2; out.push({id: 'd' + i, lane: l.id, dir: t > 1 ? 1 : 0, f: t > 1 ? t - 1 : t, col: col.ink, kind: 'ship'}); }); return out; }
  if (G.mode === 'fwd') G.sh.forEach(s => out.push({id: s.id, lane: s.lane, dir: s.dir, f: frac(s), col: col[K.fwd.CM[s.c].col.slice(2)], kind: 'box'}));
  else G.fleet.forEach(s => { if (!s.lane || s.state === 'order') return; out.push({id: s.id, lane: s.lane, dir: s.dir, f: s.state === 'sea' ? frac(s) : 0, col: col.magenta, kind: s.state === 'sea' ? 'ship' : 'wait', big: K.car.CLS[s.cls].cap > 3000}); });
  return out; };
M.draw = () => { if (!W) return; const S = K.S, G = S.G; cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.drawImage(land, 0, 0, W, H);
  const active = new Set(G ? (G.mode === 'fwd' ? G.sh.map(s => s.lane) : G.fleet.map(s => s.lane)) : []), open = G && G.mode === 'fwd' ? new Set(K.fwd.lanes(G).map(l => l.id)) : null;
  cx.lineJoin = 'round';
  LANES.forEach(l => { if (l.id === S.hi) return; trace(l); const on = active.has(l.id), shut = open && !open.has(l.id);
    cx.strokeStyle = on ? col.ink : col.depth; cx.globalAlpha = on ? .75 : shut ? .35 : .9; cx.lineWidth = on ? 1.1 : .9; cx.setLineDash(on ? [] : [2, 3]); cx.stroke(); });
  cx.setLineDash([]); cx.globalAlpha = 1;
  if (S.hi) { trace(LM[S.hi]); cx.strokeStyle = col.magenta; cx.lineWidth = 2; cx.stroke(); }
  const k = S.anim ? Math.min(1, (performance.now() - S.anim) / 800) : 1, ease = k * k * (3 - 2 * k), seen = {};
  M.markers().forEach(m => { const l = LM[m.lane]; let f = m.f; const p0 = S.prev && S.prev[m.id];
    if (k < 1 && p0 && p0.lane === m.lane && p0.dir === m.dir && p0.f < f) f = p0.f + (f - p0.f) * ease;
    const p = K.posAt(l, m.dir ? 1 - f : f), [x, y] = px(p.lon, p.lat), ang = m.dir ? p.ang + Math.PI : p.ang;
    const key = Math.round(x / 6) + ',' + Math.round(y / 6), n = seen[key] = (seen[key] || 0) + 1;
    cx.save(); cx.translate(x, y - (n - 1) * 5); cx.rotate(ang); cx.fillStyle = m.col; cx.strokeStyle = col.sea; cx.lineWidth = 1.2;
    if (m.kind === 'box') { cx.fillRect(-4.5, -3, 9, 6); cx.strokeRect(-4.5, -3, 9, 6); }
    else { const s = m.big ? 1.3 : 1; cx.beginPath(); cx.moveTo(7 * s, 0); cx.lineTo(2.5 * s, -3.2 * s); cx.lineTo(-6 * s, -3.2 * s); cx.lineTo(-6 * s, 3.2 * s); cx.lineTo(2.5 * s, 3.2 * s); cx.closePath();
      if (m.kind === 'wait') { cx.fillStyle = col.sea; cx.fill(); cx.strokeStyle = m.col; cx.lineWidth = 1.5; cx.stroke(); } else { cx.fill(); cx.stroke(); } }
    cx.restore(); });
  const narrow = W < 520, hl = S.hi && LM[S.hi]; cx.font = `600 ${narrow ? 9.5 : 11.5}px ${font()}`; cx.textBaseline = 'middle';
  Object.entries(PORTS).forEach(([id, p]) => { const [x, y] = px(p.lon, p.lat), on = hl && (hl.a === id || hl.b === id), office = G && G.mode === 'fwd' && G.off[p.reg];
    cx.beginPath(); cx.arc(x, y, on ? 4.5 : 3.4, 0, 6.2832); cx.fillStyle = on ? col.magenta : col.paper; cx.fill(); cx.strokeStyle = on ? col.magenta : col.ink; cx.lineWidth = 1.5; cx.stroke();
    if (office && !on) { cx.beginPath(); cx.arc(x, y, 1.6, 0, 6.2832); cx.fillStyle = col.magenta; cx.fill(); }
    const t = narrow ? id : p.n; let tx = x, ty = y; cx.textAlign = 'center';
    if (p.lab === 'r') { tx = x + 8; cx.textAlign = 'left'; } else if (p.lab === 't') ty = y - 11; else ty = y + 12;
    cx.lineWidth = 3; cx.strokeStyle = col.sea; cx.strokeText(t, tx, ty); cx.fillStyle = col.ink; cx.fillText(t, tx, ty); });
  if (k < 1) requestAnimationFrame(M.draw); else if (S.anim) { S.anim = null; S.prev = null; if (S.after) { const f = S.after; S.after = null; f(); } } };
M.init = canvas => { cv = canvas; cx = cv.getContext('2d'); new ResizeObserver(M.resize).observe(cv.parentElement);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', M.retheme);
  new MutationObserver(M.retheme).observe(document.documentElement, {attributes: true, attributeFilter: ['data-theme']});
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(M.retheme); };
})(window.K = window.K || {});
