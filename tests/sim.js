/* Başsız simülasyon: iki senaryoyu botlarla oynatır, tutarlılığı ve dengeyi denetler.
   Çalıştırma: node tests/sim.js [oyun sayısı] */
['geo', 'core', 'forwarder', 'carrier'].forEach(f => require(`../js/${f}.js`));
const K = globalThis.K, F = K.fwd, C = K.car, N = +process.argv[2] || 60;
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails++; console.error('HATA:', msg); } };
const finite = (G, tag) => { check(Number.isFinite(G.cash), `${tag}: kasa sayı değil`); check(G.week <= K.END + 1, `${tag}: hafta taştı`); };

function playF(len, smart, seed) { K.seed(seed); const G = F.create({len});
  while (!G.over) {
    G.dec.slice().forEach(d => K.decide(G, d.id, smart && (d.k === 'insp' || d.k === 'roll') ? 0 : smart ? 1 : 0));
    for (const o of G.offers.slice()) { const l = K.LM[o.lane], opts = F.LINES.map(c => ({c, slack: o.dl - F.transit(G, l, c), profit: F.rev(G, o) - F.cost(G, o, c.id)})).filter(x => x.slack >= 0 && x.profit > 0);
      if (!opts.length) continue;
      // dikkatli bot: payı yeten en ucuz armatör; pay yoksa beklenen kârı en yüksek olan
      const ev = x => x.profit - (1 - F.ok(G, x.c)) * F.rev(G, o) * .2;
      const want = smart ? (opts.find(x => x.c.id === 'P' && x.slack >= 2) || opts.find(x => x.c.id === 'M' && x.slack >= 1) || opts.slice().sort((p, q) => ev(q) - ev(p))[0]) : (opts.find(x => x.c.id === 'M') || opts[0]);
      if (G.cash - F.cost(G, o, want.c.id) < -F.limit(G) * (smart ? .7 : .5)) continue;
      F.book(G, o.id, want.c.id); }
    if (smart && G.week < K.END - 10) { const can = c => G.cash > c + 50000;
      if (G.reps < 3 && can(F.HIRE)) F.hire(G); else if (!G.off.EU && can(F.OFF.EU.cost)) F.openOffice(G, 'EU'); else if (!G.up.customs && can(F.UP.customs.cost)) F.buyUp(G, 'customs');
      else if (!G.off.FE && can(F.OFF.FE.cost)) F.openOffice(G, 'FE'); else if (!G.up.ins && can(F.UP.ins.cost)) F.buyUp(G, 'ins'); }
    F.endWeek(G); finite(G, 'aracı'); G.sh.forEach(s => check(s.left > 0 && Number.isFinite(s.rev), 'aracı: bozuk sevkiyat')); }
  return {over: G.over, v: F.value(G), rep: G.rep, del: G.st.del, late: G.st.late}; }

function playC(len, smart, seed) { K.seed(seed); const G = C.create({len});
  while (!G.over) {
    G.dec.slice().forEach(d => K.decide(G, d.id, d.k === 'ctr' ? (smart && G.fleet.some(s => s.lane === d.lane) ? 0 : 1) : d.k === 'proj' ? 1 : 0));
    if (smart) { const lateGame = G.week > K.END - 8;
      while (!lateGame && G.debt + 1e6 <= C.loanCap(G)) C.loan(G, 1);
      for (const x of G.list.slice()) if (x.type === 'sale' && !lateGame && G.cash - x.price > 3e5) C.buy(G, x.id);
      for (const s of G.fleet) if (s.state === 'idle') { let best = null, bv = -1;
        for (const l of K.LANES) { const n = G.fleet.filter(q => q.lane === l.id).length, v = Math.min(C.CLS[s.cls].cap, G.pool[l.id][0]) * K.rate(G, l, 0) / l.weeks / (1 + n); if (v > bv) { bv = v; best = l.id; } }
        C.assign(G, s.id, best); } }
    C.endWeek(G); finite(G, 'armatör'); check(G.fleet.length <= C.MAXFLEET, 'armatör: filo sınırı aşıldı');
    K.LANES.forEach(l => check(G.pool[l.id].every(p => p >= 0 && Number.isFinite(p)), 'armatör: bozuk yük havuzu')); }
  return {over: G.over, v: C.net(G), fleet: G.fleet.length, lf: Math.round(G.st.teu / G.st.cap * 100)}; }

const q = (a, p) => a.slice().sort((x, y) => x - y)[Math.floor((a.length - 1) * p)];
function summary(name, play, tiers) { for (const len of [26, 52]) for (const smart of [false, true]) { const r = []; for (let i = 0; i < N; i++) r.push(play(len, smart, 1000 + i));
  const v = r.map(x => x.v), t = tiers[len], hit = t.map(([th]) => Math.round(r.filter(x => x.over === 'done' && x.v >= th).length / N * 100));
  console.log(`${name} ${len} hf ${smart ? 'dikkatli' : 'pasif   '}  p10 ${K.money(q(v, .1))} · medyan ${K.money(q(v, .5))} · p90 ${K.money(q(v, .9))} · iflas %${Math.round(r.filter(x => x.over === 'bust').length / N * 100)} · eşikler %${hit.join('/')}`); } }
summary('Aracı  ', playF, F.TIERS);
summary('Armatör', playC, C.TIERS);
if (fails) { console.error(`${fails} tutarlılık hatası`); process.exit(1); } else console.log('Tutarlılık denetimleri geçti.');
