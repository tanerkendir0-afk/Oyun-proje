/* Senaryo 2: Armatör (hat operatörü). Gemileri hatlara verir, navlunu belirler, filoyu büyütür. */
(function (K) {
'use strict';
const {rnd, ri, pick, chance, clamp, r10, LM, LANES, PORTS, money, nf, from, to} = K;
const C = K.car = {};

C.CLS = {
  F: {n: 'Feeder', cap: 1100, price: 5.5e6, fuel: 28, opex: 35e3, port: 30e3, canal: 80e3},
  S: {n: 'Sub-Panamax', cap: 2500, price: 12e6, fuel: 52, opex: 48e3, port: 50e3, canal: 180e3},
  P: {n: 'Panamax', cap: 4200, price: 20e6, fuel: 80, opex: 60e3, port: 70e3, canal: 300e3},
  N: {n: 'Neo-Panamax', cap: 9000, price: 42e6, fuel: 135, opex: 85e3, port: 140e3, canal: 550e3},
};
C.SPD = {e: {n: 'Ekonomik', kn: 14, dw: 1, fm: .62}, n: {n: 'Normal', kn: 18, dw: 0, fm: 1}, f: {n: 'Tam yol', kn: 22, dw: -1, fm: 1.7}};
C.WINDS = ['Lodos', 'İmbat', 'Karayel', 'Yıldız', 'Keşişleme', 'Gündoğusu', 'Samyeli', 'Meltem', 'Günbatısı', 'Bora', 'Kıble', 'Etezyen'];
C.BCO = ['Hanse Perakende', 'Delta Elektronik', 'Marmara Beyaz Eşya', 'Atlas Mobilya', 'Nordik Yapı Market', 'Pasifik Spor Giyim', 'Körfez Polimer', 'Santos Kahve İhracat'];
C.TIERS = {26: [[26e6, 'Suyun üstünde'], [42e6, 'Düzenli hat operatörü'], [60e6, 'Okyanus armatörü']], 52: [[34e6, 'Suyun üstünde'], [60e6, 'Düzenli hat operatörü'], [90e6, 'Okyanus armatörü']]};
C.MAXFLEET = 8;
C.HANDLING = 110;                                           // TEU başına elleçleme ve ekipman
C.overhead = G => 50e3 + 8e3 * G.fleet.length;              // genel yönetim gideri

const valF = G => .75 + .25 * K.avgIdx(G);
const ageF = age => clamp(1.2 - age * .03, .4, 1.2);       // yaşa göre değer
C.eff = age => 1 + (age - 8) * .012;                        // yaşa göre yakıt tüketimi
C.shipVal = (G, s) => s.hire ? 0 : C.CLS[s.cls].price * valF(G) * ageF(s.age) * .92;
C.fleetVal = G => G.fleet.reduce((s, x) => s + C.shipVal(G, x), 0);
C.net = G => G.cash + C.fleetVal(G) - G.debt;
C.loanCap = G => Math.floor(C.fleetVal(G) * .5 / 1e6) * 1e6;
C.pf = p => Math.min(2.2, Math.pow(1 / p, 2.5));            // fiyat → talep
C.inflow = (G, l, d) => l.dem[d] * K.demMult(G, l) * C.pf(G.price[l.id]) * (.6 + G.rep / 150);
C.fuelWk = (G, s, spd) => C.CLS[s.cls].fuel * 7 * C.eff(s.age) * C.SPD[spd || s.speed].fm * G.m.bunker;
C.tce = s => s.acc.days ? (s.acc.rev - s.acc.voy) / s.acc.days : 0; // günlük kazanç (time charter equivalent)

function mkShip(G, cls, age, hire) { const used = G.fleet.map(s => s.name), nm = C.WINDS.find(w => !used.includes('M/V ' + w)) || 'Rüzgâr ' + G.seq;
  return {id: G.seq++, name: 'M/V ' + nm, cls, age, hire: hire || 0, until: hire ? G.week + 6 : 0, lane: null, dir: 0, state: 'idle', left: 0, total: 0, load: 0, speed: 'n', vs: 'n', next: null, late: false, acc: {rev: 0, voy: 0, days: 0}}; }

C.create = opt => { const w0 = opt.len === 26 ? 27 : 1;
  const G = {mode: 'car', name: opt.name || 'Konşimento Denizcilik', len: opt.len, w0, week: w0, cash: 1e6, debt: 0, rep: 60, route: 'cape', price: {}, pool: {}, ls: {}, fleet: [], list: [], ctr: [], dec: [],
    m: K.newMarket(), log: [], hist: [], cf: [], wk: {}, seq: 1, st: {teu: 0, cap: 0, voy: 0, late: 0}};
  LANES.forEach(l => { G.price[l.id] = 1; G.pool[l.id] = [l.dem[0] * 2, l.dem[1] * 2]; G.ls[l.id] = {teu: 0, cap: 0, rev: 0}; });
  const a = mkShip(G, 'F', 12); G.fleet.push(a); const b = mkShip(G, 'S', 9); G.fleet.push(b);
  a.lane = 'IE'; b.lane = 'AM'; depart(G, a); depart(G, b); G.wk = {}; C.genList(G); G.hist.push(C.net(G)); return G; };

/* Kalkış: önce kontrat yükü, sonra limanda bekleyen spot yük alınır. Navlun kalkışta tahsil edilir. */
function depart(G, s, R) { const l = LM[s.lane], c = C.CLS[s.cls], d = s.dir, pool = G.pool[l.id]; let room = c.cap, rev = 0;
  for (const k of G.ctr) if (k.lane === l.id && k.dir === d && k.wait >= 1 && room > 0) { const n = Math.min(Math.floor(k.wait), room); k.wait -= n; k.lifted += n; room -= n; rev += K.cash(G, 'ctr', n * k.rate); }
  const n = Math.min(room, Math.floor(pool[d])); pool[d] -= n; room -= n; rev += K.cash(G, 'frt', n * Math.round(K.rate(G, l, d) * G.price[l.id]));
  const load = c.cap - room, red = K.active(G, 'redsea'), viaCanal = l.suez && !K.active(G, 'suez') && !(red && G.route === 'cape');
  let cost = c.port + C.HANDLING * load + (viaCanal ? c.canal : 0);
  s.vs = s.speed; s.state = 'sea'; s.left = s.total = Math.max(1, K.laneWeeks(G, l) + C.SPD[s.vs].dw); s.load = load; s.late = false;
  if (viaCanal && red) { cost += c.price * .004; // savaş riski primi
    if (chance(.05)) { s.left += 2; s.total += 2; s.late = true; const fix = c.price * .03; K.cash(G, 'repair', -fix); s.acc.voy += fix; if (R) R.note(`${s.name} Kızıldeniz’de saldırıya uğradı: ${money(fix)} hasar, 2 hafta rötar`, 'bad'); } }
  K.cash(G, 'port', -cost); s.acc.rev += rev; s.acc.voy += cost;
  G.st.teu += load; G.st.cap += c.cap; const ls = G.ls[l.id]; ls.teu += load; ls.cap += c.cap; ls.rev += rev;
  if (R) R.line(`${s.name} · ${from(l, d)} → ${to(l, d)} · ${nf.format(load)}/${nf.format(c.cap)} TEU`, rev); }

C.genList = G => { const ks = Object.keys(C.CLS), v = valF(G);
  const mk = type => { const cls = pick(ks), age = type === 'new' ? 0 : ri(3, 18), p = C.CLS[cls].price * v * ageF(age);
    return {id: G.seq++, cls, type, age, price: type === 'charter' ? Math.round(p * .035 * rnd(.9, 1.15) / 1e3) * 1e3 : Math.round(p * rnd(.93, 1.08) / 1e5) * 1e5}; };
  G.list = [mk('sale'), mk('charter'), mk(chance(.5) ? 'sale' : 'charter'), mk('new')]; };
C.assign = (G, id, v) => { const s = G.fleet.find(x => x.id === id); if (!s || s.state === 'order') return;
  if (s.state === 'sea') s.next = v === s.lane ? null : v;
  else if (!v) { s.state = 'idle'; s.lane = null; s.left = 0; }
  else { s.lane = v; s.state = 'repo'; s.left = s.total = 1; s.dir = 0; s.vs = s.speed; s.next = null; } };
C.setSpeed = (G, id, v) => { const s = G.fleet.find(x => x.id === id); if (s) { s.speed = v; if (s.state !== 'sea') s.vs = v; } };
C.setPrice = (G, lid, d) => { G.price[lid] = clamp(Math.round((G.price[lid] + d * .05) * 100) / 100, .7, 1.4); };
C.buy = (G, id) => { const x = G.list.find(o => o.id === id); if (!x || G.fleet.length >= C.MAXFLEET) return false;
  if (x.type === 'charter') G.fleet.push(mkShip(G, x.cls, x.age, x.price));
  else { if (G.cash < x.price) return false; K.cash(G, 'capex', -x.price); const s = mkShip(G, x.cls, x.age); if (x.type === 'new') { s.state = 'order'; s.left = 8; } G.fleet.push(s); }
  G.list = G.list.filter(o => o !== x); return true; };
C.sell = (G, id) => { const s = G.fleet.find(x => x.id === id); if (s && !s.hire && s.state !== 'order' && G.fleet.length > 1) { K.cash(G, 'capex', C.shipVal(G, s) * .95); G.fleet = G.fleet.filter(x => x !== s); } };
C.giveBack = (G, id) => { const s = G.fleet.find(x => x.id === id); if (s && s.hire && G.week >= s.until) G.fleet = G.fleet.filter(x => x !== s); };
C.loan = (G, d) => { if (d > 0 && G.debt + 1e6 <= C.loanCap(G)) { G.debt += 1e6; K.cash(G, 'loan', 1e6); } else if (d < 0 && G.debt >= 1e6 && G.cash >= 1e6) { G.debt -= 1e6; K.cash(G, 'loan', -1e6); } };

C.decide = (G, d, i) => { const s = d.sid && G.fleet.find(x => x.id === d.sid);
  if (d.k === 'engine') { if (!s) return ''; if (i === 0) { K.cash(G, 'repair', -d.a); s.acc.voy += d.a; return `${s.name}: yedek parça uçakla getirildi, sefer aksamadı.`; }
    K.cash(G, 'repair', -d.b); s.acc.voy += d.b; if (s.state === 'sea') { s.left++; s.total++; s.late = true; } return `${s.name} yavaş yolla devam ediyor, 1 hafta rötar.`; }
  if (d.k === 'ctr') { if (i === 1) return `${d.cust} kontratı reddedildi.`; G.ctr.push({id: G.seq++, cust: d.cust, lane: d.lane, dir: d.dir, teuWeek: d.teu, rate: d.rate, left: d.weeks, wait: 0, lifted: 0, missed: 0}); return `${d.cust} ile kontrat imzalandı.`; }
  if (d.k === 'proj') { if (i === 1) return 'Proje yükü reddedildi.'; G.ctr.push({id: G.seq++, cust: d.cust, lane: d.lane, dir: d.dir, teuWeek: 0, rate: d.rate, left: 3, wait: d.teu, lifted: 0, missed: 0, one: true}); return 'Proje yükü kabul edildi, limanda bekliyor.'; }
  if (d.k === 'route') { G.route = i === 0 ? 'cape' : 'canal'; return i === 0 ? 'Filo Ümit Burnu rotasına döndü.' : 'Filo savaş riski primiyle kanaldan geçmeye devam ediyor.'; }
  return ''; };

function offerContract(G) { const mine = [...new Set(G.fleet.map(s => s.lane).filter(Boolean))], l = mine.length && chance(.75) ? LM[pick(mine)] : pick(LANES), dir = chance(.65) ? 0 : 1;
  const weeks = Math.min(13, K.END - G.week), spot = K.rate(G, l, dir), teu = r10(l.dem[dir] * rnd(.1, .25)), rate = r10(spot * rnd(.8, .93)), cust = pick(C.BCO); if (weeks < 4) return;
  K.addDec(G, {k: 'ctr', cust, lane: l.id, dir, teu, rate, weeks, title: `Kontrat teklifi: ${cust}`,
    text: `${from(l, dir)} → ${to(l, dir)} hattında ${weeks} hafta boyunca haftada ${nf.format(teu)} TEU, sabit $${nf.format(rate)}/TEU (bugünkü spot $${nf.format(spot)}). Kontrat yükü gemide önceliklidir. Üç haftadan fazla bekleyen her TEU için $200 ceza ödenir.`,
    opts: ['Kontratı imzala', 'Reddet']}); }
function offerProject(G) { const mine = [...new Set(G.fleet.map(s => s.lane).filter(Boolean))]; if (!mine.length) return; const l = LM[pick(mine)], dir = chance(.5) ? 0 : 1, teu = r10(l.dem[dir] * rnd(.5, .9)), rate = r10(K.rate(G, l, dir) * .85);
  K.addDec(G, {k: 'proj', cust: 'Proje yükü', lane: l.id, dir, teu, rate, title: 'Tek seferlik proje yükü', text: `Bir fabrika taşınıyor: ${from(l, dir)} → ${to(l, dir)}, ${nf.format(teu)} TEU, $${nf.format(rate)}/TEU. Üç hafta içinde yüklenmeyen her TEU için $150 ceza var.`, opts: ['Yükü kabul et', 'Reddet']}); }

C.endWeek = G => { const R = K.mkReport(G); let fuel = 0, crew = 0, hire = 0;
  LANES.forEach(l => [0, 1].forEach(d => { const g = C.inflow(G, l, d); G.pool[l.id][d] = Math.min(G.pool[l.id][d] + g, g * 3); }));
  for (const s of G.fleet) { const c = C.CLS[s.cls];
    if (s.state === 'order') { if (--s.left <= 0) { s.state = 'idle'; R.note(`${s.name} tersaneden teslim alındı, hat bekliyor`); } continue; }
    crew += c.opex; hire += s.hire;
    if (s.state === 'idle') continue;
    const f = C.fuelWk(G, s, s.vs); fuel += f; s.acc.voy += f; s.acc.days += 7;
    if (--s.left > 0) { if (s.state === 'sea' && G.dec.length < 2 && chance(.006 + s.age * .0025)) { const a = c.opex * 4, b = Math.round(c.opex * 1.5);
      K.addDec(G, {k: 'engine', sid: s.id, a, b, title: `${s.name}: makine arızası`, text: `Ana makinede silindir gömleği çatladı. Gemi ${to(LM[s.lane], s.dir)} yolunda.`, opts: [`Parçayı uçakla getir (${money(-a)}, rötar yok)`, `Yavaş yolla devam et (${money(-b)}, +1 hafta)`]}); } continue; }
    if (s.state === 'sea') { G.st.voy++;
      if (s.late) { G.st.late++; G.rep = clamp(G.rep - 3, 0, 100); R.note(`${s.name} ${to(LM[s.lane], s.dir)} limanına rötarlı vardı`, 'bad'); } else G.rep = clamp(G.rep + .5, 0, 100);
      s.dir = 1 - s.dir; s.load = 0;
      if (s.next !== null) { const nx = s.next; s.next = null; if (!nx) { s.state = 'idle'; s.lane = null; continue; } s.lane = nx; s.state = 'repo'; s.left = s.total = 1; s.dir = 0; continue; } }
    else s.dir = 0;
    depart(G, s, R); }
  // kontratlar: haftalık yük birikir, üç haftadan eskisi cezaya döner
  G.ctr = G.ctr.filter(k => { let over = 0;
    if (k.one) { if (--k.left <= 0) over = k.wait; } else { k.wait += k.teuWeek; over = Math.max(0, k.wait - k.teuWeek * 3); k.left--; if (k.left <= 0) over = k.wait; }
    if (over >= 1) { k.wait -= over; k.missed += over; G.rep = clamp(G.rep - 1, 0, 100); R.pay('pen', `${k.cust}: ${nf.format(Math.round(over))} TEU kontrat yükü taşınamadı`, -over * (k.one ? 150 : 200), 'bad'); }
    if (k.left <= 0) { R.note(`${k.cust} kontratı tamamlandı: ${nf.format(k.lifted)} TEU taşındı`); return false; } return true; });
  K.cash(G, 'fuel', -fuel); K.cash(G, 'crew', -crew); K.cash(G, 'adm', -C.overhead(G)); K.cash(G, 'hire', -hire);
  if (G.debt) K.cash(G, 'fin', -G.debt * .003);
  if (G.cash < 0) K.cash(G, 'fin', G.cash * .01);
  const fresh = K.stepMarket(G, R, e => { let n = 0; G.fleet.forEach(s => { if (s.state === 'sea' && e.lanes.includes(s.lane)) { s.left += e.hit; s.total += e.hit; s.late = true; n++; } }); if (n) R.note(`${n} gemin ${e.hit} hafta rötar yapacak`, 'bad'); });
  if (fresh.some(e => e.k === 'redsea')) K.addDec(G, {k: 'route', title: 'Kızıldeniz: rota kararı', text: 'Süveyş hatlarındaki gemilerin hangi rotadan gideceğine karar ver. Kararı sonradan Hatlar sekmesinden değiştirebilirsin.',
    opts: ['Ümit Burnu’ndan dolaş (+2 hafta, kanal ücreti yok)', 'Kanaldan devam et (savaş riski primi, %5 saldırı riski)']});
  if (G.dec.length < 2 && G.ctr.filter(k => !k.one).length < 4 && chance(.22)) offerContract(G);
  else if (G.dec.length < 2 && chance(.06)) offerProject(G);
  C.genList(G); G.week++; G.hist.push(C.net(G)); K.closeReport(G, R);
  if (G.cash < -2.5e6) G.over = 'bust'; else if (G.week > K.END) G.over = 'done';
  return R; };
})(typeof window !== 'undefined' ? (window.K = window.K || {}) : (globalThis.K = globalThis.K || {}));
