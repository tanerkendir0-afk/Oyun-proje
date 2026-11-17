/* Senaryo 1: Aracı (freight forwarder). Gemisi yoktur; müşteriden yük alır, armatörden yer satın alır. */
(function (K) {
'use strict';
const {rnd, ri, pick, chance, clamp, r10, LM, LANES, PORTS, money} = K;
const F = K.fwd = {};

F.CARR = [
  {id: 'P', name: 'Poyraz Line', tag: 'Ekonomik. Uzun hatlarda aktarmalı, sefer 1 hafta uzar.', mult: .85, ok: .70, peak: .12, maxDelay: 3, tx: 1, roll: .10, col: '--c-red'},
  {id: 'M', name: 'Meridyen Denizcilik', tag: 'Ana hat taşıyıcısı, direkt servis.', mult: 1, ok: .87, peak: .06, maxDelay: 2, tx: 0, roll: .04, col: '--c-blue'},
  {id: 'K', name: 'Kutup Yıldızı', tag: 'Premium. Öncelikli yükleme, yükü kaydırmaz.', mult: 1.16, ok: .97, peak: .02, maxDelay: 1, tx: 0, roll: 0, col: '--c-green'},
  {id: 'B', name: 'Blok yer', tag: '', mult: 0, ok: .9, peak: .04, maxDelay: 2, tx: 0, roll: 0, col: '--c-orange'},
];
F.CM = Object.fromEntries(F.CARR.map(c => [c.id, c]));
F.LINES = F.CARR.filter(c => c.id !== 'B');
/* Ekipman: f = TEU navlununa göre konteyner fiyat çarpanı. */
F.EQ = {DC20: {n: "20' DC", teu: 1, f: 1}, HC40: {n: "40' HC", teu: 2, f: 1.8}, RF40: {n: "40' Reefer", teu: 2, f: 3.1, rf: true}};
F.TERM = {0: 'Peşin', 2: '15 gün', 4: '30 gün'};
F.DISC = [[800, .09], [400, .06], [150, .03]]; // armatörde biriken TEU → navlun indirimi
F.UP = {
  customs: {n: 'Gümrük müşavirliği', cost: 15000, wk: 800, d: 'Her teslimatta konteyner başına +$120 hizmet geliri. Gümrük denetimi yarı yarıya azalır.'},
  ins: {n: 'Nakliyat sigortası', cost: 10000, wk: 600, d: 'Gecikme cezaları yarıya iner, hasar taleplerini sigorta öder.'},
  track: {n: 'Canlı takip sistemi', cost: 12000, wk: 400, d: 'Zamanında teslimde itibar +2 (normalde +1), gecikmede itibar kaybı azalır.'},
};
F.OFF = {
  EU: {n: 'Kuzey Avrupa ofisi', city: 'Rotterdam', cost: 18000, wk: 1500, d: 'Transatlantik, Güney Amerika ve Asya – Kuzey Avrupa hatlarını açar.'},
  FE: {n: 'Uzak Doğu ofisi', city: 'Şanghay', cost: 25000, wk: 2000, d: 'Transpasifik, Asya – Körfez, Asya – Avrupa ve Güney Afrika hatlarını açar.'},
  US: {n: 'Amerika ofisi', city: 'New York', cost: 22000, wk: 2000, d: 'Transatlantik ve Transpasifik hatlarını açar.'},
  GF: {n: 'Körfez ofisi', city: 'Cebel Ali', cost: 12000, wk: 1200, d: 'Asya – Körfez hattını açar.'},
};
F.TIERS = {26: [[280000, 'Ayakta kaldın'], [380000, 'Sağlam acente'], [480000, 'Navlun ustası']], 52: [[400000, 'Ayakta kaldın'], [700000, 'Sağlam acente'], [1000000, 'Navlun ustası']]};
const S = (n, cargo, eq, term) => ({n, cargo, eq, term});
F.SHIPPERS = {
  IST: [S('Karayel Fındık', ['Fındık içi', 'Kuru incir'], 'DC20', 2), S('Yedi Tepe Tekstil', ['Hazır giyim', 'Ev tekstili'], 'HC40', 2), S('Marmara Beyaz Eşya', ['Buzdolabı', 'Çamaşır makinesi'], 'HC40', 4),
    S('Kıyı Seramik', ['Seramik karo', 'Vitrifiye'], 'DC20', 2), S('Anadolu Oto Yan Sanayi', ['Oto yedek parça'], 'HC40', 4), S('Ege Narenciye', ['Narenciye', 'Dondurulmuş gıda'], 'RF40', 0), S('Mermer Ocakları Birliği', ['Mermer blok'], 'DC20', 0)],
  SHA: [S('Delta Elektronik', ['Tüketici elektroniği', 'Güneş paneli'], 'HC40', 2), S('Lotus Oyuncak', ['Oyuncak'], 'HC40', 0), S('Jade Mobilya', ['Mobilya'], 'HC40', 2), S('Sarı Nehir Tekstil', ['Hazır giyim', 'Kumaş'], 'HC40', 2)],
  SIN: [S('Merlion Kimya', ['Reçine', 'Boya hammaddesi'], 'DC20', 2), S('Malakka Kauçuk', ['Doğal kauçuk'], 'DC20', 2)],
  JEA: [S('Körfez Polimer FZE', ['Polietilen granül'], 'HC40', 4), S('Hurma Vadisi', ['Hurma'], 'RF40', 0), S('Hürmüz Alüminyum', ['Alüminyum külçe'], 'DC20', 2)],
  RTM: [S('Rhein Makine', ['Takım tezgâhı'], 'HC40', 4), S('Delfshaven Kimya', ['Boya hammaddesi'], 'DC20', 2), S('Kuzey Süt Ürünleri', ['Süt tozu', 'Peynir'], 'RF40', 2)],
  NYC: [S('Hudson Kâğıt', ['Hurda kâğıt'], 'HC40', 2), S('Liberty Medikal', ['Tıbbi cihaz'], 'HC40', 4)],
  LAX: [S('Pasifik Badem', ['Badem'], 'DC20', 2), S('Sierra Geri Dönüşüm', ['Hurda kâğıt'], 'HC40', 0)],
  SSZ: [S('Santos Kahve İhracat', ['Yeşil kahve', 'Şeker'], 'DC20', 2), S('Paraná Tavukçuluk', ['Dondurulmuş tavuk'], 'RF40', 2)],
  DUR: [S('Natal Narenciye', ['Portakal'], 'RF40', 0), S('Zulu Maden', ['Krom cevheri'], 'DC20', 2)],
};
const LV = {K: 21, N: 25, S: 30, U: 32};
F.cntNo = () => { let s = 'KNSU'; for (let i = 0; i < 6; i++) s += ri(0, 4); let sum = 0; // ISO 6346 kontrol hanesi
  for (let i = 0; i < 10; i++) sum += (LV[s[i]] ?? +s[i]) * 2 ** i; return `${s.slice(0, 4)} ${s.slice(4)} ${sum % 11 % 10}`; };

F.lanes = G => LANES.filter(l => G.off[PORTS[l.a].reg] || G.off[PORTS[l.b].reg]);
F.offices = G => Object.keys(G.off).length;
F.fixed = G => 4500 + 1800 * G.reps + Object.keys(F.UP).reduce((s, k) => s + (G.up[k] ? F.UP[k].wk : 0), 0) + Object.keys(F.OFF).reduce((s, k) => s + (G.off[k] ? F.OFF[k].wk : 0), 0);
F.ar = G => G.ar.reduce((s, a) => s + a.amt, 0);
F.unbilled = G => G.sh.reduce((s, x) => s + x.rev, 0);
F.value = G => G.cash + F.ar(G) + F.unbilled(G);
F.limit = G => Math.max(150000, Math.round(F.value(G) * .75 / 5000) * 5000);
F.disc = (G, cid) => { const v = G.vol[cid] || 0, t = F.DISC.find(d => v >= d[0]); return t ? t[1] : 0; };
F.ok = (G, c) => c.ok - (K.isPeak(G) ? c.peak : 0);
F.transit = (G, l, c) => K.laneWeeks(G, l) + (c.tx && l.weeks >= 3 ? 1 : 0);
F.unit = (G, o, cid) => r10(K.rate(G, LM[o.lane], o.dir) * F.CM[cid].mult * (1 - F.disc(G, cid))) * F.EQ[o.eq].f; // konteyner başına alış
F.cost = (G, o, cid) => cid === 'B' ? 0 : Math.round(o.qty * F.unit(G, o, cid));
F.rev = (G, o) => o.qty * (o.price + (G.up.customs ? 120 : 0));
F.block = (G, o) => !o.dir && G.contracts.find(x => x.lane === o.lane && x.cap - x.used >= o.teu);

F.create = opt => { const w0 = opt.len === 26 ? 27 : 1;
  const G = {mode: 'fwd', name: opt.name || 'Konşimento Lojistik', len: opt.len, w0, week: w0, cash: 200000, rep: 50, reps: 1, off: {TR: true}, up: {}, vol: {P: 0, M: 0, K: 0},
    offers: [], sh: [], ar: [], contracts: [], dec: [], m: K.newMarket(), log: [], hist: [], cf: [], wk: {}, seq: 1, st: {del: 0, late: 0, teu: 0, gp: 0, booked: 0, pen: 0}};
  F.genOffers(G); G.hist.push(F.value(G)); return G; };

F.genOffers = G => { const lanes = F.lanes(G), n = Math.min(12, 3 + G.reps + Math.floor(G.rep / 30) + 2 * (F.offices(G) - 1)); G.offers = [];
  const pool = lanes.flatMap(l => Array(l.dem[0] > 1500 ? 3 : 2).fill(l));
  for (let i = 0; i < n; i++) { const l = pick(pool), dir = chance(.65) ? 0 : 1, sh = pick(F.SHIPPERS[dir ? l.b : l.a]), e = F.EQ[sh.eq];
    const slack = pick([0, 1, 1, 2, 2]), qty = Math.max(1, Math.ceil(Math.pow(K.random(), 1.5) * (3 + G.rep / 10) * (e.rf ? .6 : 1)));
    G.offers.push({id: G.seq++, no: F.cntNo(), lane: l.id, dir, cust: sh.n, cargo: pick(sh.cargo), eq: sh.eq, qty, teu: qty * e.teu, term: sh.term,
      price: r10(K.rate(G, l, dir) * e.f * (1.12 + rnd(.3) + (slack ? 0 : .1) + sh.term * .012)), dl: K.laneWeeks(G, l) + slack, urgent: !slack}); } };

F.book = (G, id, cid) => { const o = G.offers.find(x => x.id === id); if (!o) return false; const l = LM[o.lane], c = F.CM[cid], cost = F.cost(G, o, cid);
  if (cid === 'B') { const k = F.block(G, o); if (!k) return false; k.used += o.teu; }
  else { if (G.cash - cost < -F.limit(G)) return false; K.cash(G, 'carrier', -cost); G.vol[cid] += o.teu; }
  const t = F.transit(G, l, c), rev = F.rev(G, o);
  G.sh.push({id: o.id, no: o.no, lane: o.lane, dir: o.dir, cust: o.cust, cargo: o.cargo, eq: o.eq, qty: o.qty, teu: o.teu, term: o.term, rev, cost, c: cid, left: t, total: t, due: G.week + o.dl,
    hid: chance(F.ok(G, c)) ? 0 : ri(1, c.maxDelay), delayed: false, fresh: true});
  G.st.booked += o.teu; G.st.gp += rev - cost; G.offers = G.offers.filter(x => x !== o); return true; };
F.nego = (G, id) => { const o = G.offers.find(x => x.id === id); if (!o || o.nego) return ''; o.nego = true;
  if (chance(.3 + G.rep / 170)) { o.price = r10(o.price * 1.1); return `${o.cust} zammı kabul etti.`; }
  if (chance(.45)) { G.offers = G.offers.filter(x => x !== o); return `${o.cust} masadan kalktı.`; }
  return `${o.cust} fiyatta direndi. Son teklif bu.`; };
F.blockRate = (G, l) => r10(K.rate(G, l, 0) * .82);
F.buyBlock = (G, lid, cap) => { const l = LM[lid]; if (G.contracts.some(c => c.lane === lid)) return; const r = F.blockRate(G, l);
  if (G.cash - cap * r < -F.limit(G)) return; K.cash(G, 'carrier', -cap * r); G.contracts.push({lane: lid, cap, rate: r, left: Math.min(8, K.END - G.week + 1), used: 0}); };
F.HIRE = 5000;
F.hire = G => { if (G.reps < 5 && G.cash >= F.HIRE) { K.cash(G, 'invest', -F.HIRE); G.reps++; } };
F.buyUp = (G, k) => { const u = F.UP[k]; if (!G.up[k] && G.cash >= u.cost) { K.cash(G, 'invest', -u.cost); G.up[k] = true; } };
F.openOffice = (G, k) => { const o = F.OFF[k]; if (!G.off[k] && G.cash >= o.cost) { K.cash(G, 'invest', -o.cost); G.off[k] = true; } };

function delay(s, n) { s.left += n; s.total += n; s.delayed = true; }
function deliver(G, s, R) { const late = Math.max(0, G.week + 1 - s.due), rf = F.EQ[s.eq].rf; let amt = s.rev;
  G.sh = G.sh.filter(x => x !== s); G.st.del++; G.st.teu += s.teu;
  if (late) { const pen = Math.round(Math.min(.5, .1 * late * (rf ? 2 : 1) * (G.up.ins ? .5 : 1)) * s.rev); amt -= pen; G.st.late++; G.st.pen += pen;
    G.rep = clamp(G.rep - Math.min(8, (G.up.track ? 2 : 3) * late), 0, 100); R.note(`${s.cust}: ${late} hafta geç teslim, faturadan ${money(pen)} ceza kesildi`, 'bad'); }
  else G.rep = clamp(G.rep + (G.up.track ? 2 : 1), 0, 100);
  if (s.term) { G.ar.push({id: s.id, cust: s.cust, amt, due: G.week + s.term}); R.line(`Teslim: ${s.cust} · ${s.qty} × ${F.EQ[s.eq].n} · fatura ${F.TERM[s.term]} vadeli`, amt); }
  else R.pay('sales', `Teslim ve tahsilat: ${s.cust} · ${s.qty} × ${F.EQ[s.eq].n}`, amt);
  if (G.dec.length < 2 && chance(.07)) { const a = s.qty * 85 * ri(3, 8);
    K.addDec(G, {k: 'dem', a, cust: s.cust, title: 'Demuraj faturası', text: `${s.cust} konteynerleri limandan geç çekti. Armatör ${money(a)} demuraj kesti.`, opts: ['Müşteriye yansıt (itibar −3)', `Biz üstlenelim (${money(-a)}, itibar +1)`]}); }
  else if (chance(.03)) { const a = Math.round(s.rev * rnd(.08, .15));
    if (G.up.ins) R.note(`${s.cust} hasar bildirdi, ${money(a)} tazminatı sigorta ödedi`);
    else if (G.dec.length < 2) K.addDec(G, {k: 'claim', a, cust: s.cust, title: 'Hasar talebi', text: `${s.cust} konteynerde ıslanma hasarı bildirdi ve ${money(a)} tazminat istiyor.`, opts: [`Tazminatı öde (${money(-a)})`, 'Reddet, armatöre yönlendir (itibar −5)']}); } }

F.decide = (G, d, i) => { const s = d.sid && G.sh.find(x => x.id === d.sid);
  if (d.k === 'roll') { if (!s) return ''; if (i === 0) { delay(s, 1); return `${s.cust} yükü bir sonraki gemiyi bekliyor.`; } K.cash(G, 'carrier', -d.a); return `${s.cust} yükü başka gemiye aktarıldı.`; }
  if (d.k === 'insp') { if (!s) return ''; if (i === 0) { K.cash(G, 'pen', -d.a); return 'Hızlandırılmış muayene yapıldı, yük yoluna devam ediyor.'; } delay(s, 1); return `${s.cust} yükü muayene sırasında 1 hafta bekleyecek.`; }
  if (d.k === 'dem') { if (i === 0) { G.rep = clamp(G.rep - 3, 0, 100); return `Demuraj ${d.cust} firmasına yansıtıldı.`; } K.cash(G, 'pen', -d.a); G.rep = clamp(G.rep + 1, 0, 100); return 'Demurajı şirket üstlendi.'; }
  if (d.k === 'claim') { if (i === 0) { K.cash(G, 'pen', -d.a); return `${d.cust} firmasına tazminat ödendi.`; } G.rep = clamp(G.rep - 5, 0, 100); return 'Hasar talebi reddedildi.'; }
  if (d.k === 'term') { const a = G.ar.find(x => x.id === d.aid); if (!a) return ''; if (i === 0) { a.due += 4; G.rep = clamp(G.rep + 2, 0, 100); return `${a.cust} için vade 4 hafta uzatıldı.`; } G.rep = clamp(G.rep - 2, 0, 100); return 'Vade uzatma talebi reddedildi.'; }
  return ''; };

F.endWeek = G => { const R = K.mkReport(G), peak = K.isPeak(G);
  R.pay('staff', 'Maaşlar, ofis ve hizmet giderleri', -F.fixed(G));
  for (const s of G.sh.slice()) { const c = F.CM[s.c];
    if (s.fresh) { s.fresh = false; if (s.left >= 2 && G.dec.length < 2 && chance(c.roll * (peak ? 2 : 1))) { const a = Math.round(s.cost * .12);
      K.addDec(G, {k: 'roll', sid: s.id, a, title: 'Yük kaydırıldı (rollover)', text: `${c.name} gemide yer kalmadığını bildirdi. ${s.cust} yükü limanda kaldı.`, opts: ['Bir sonraki gemiyi bekle (+1 hafta)', `Başka gemiye aktar (${money(-a)})`]}); } }
    if (--s.left > 0) { if (G.dec.length < 2 && chance(G.up.customs ? .012 : .025)) { const a = 350 * s.qty;
      K.addDec(G, {k: 'insp', sid: s.id, a, title: 'Gümrük kırmızı hat', text: `${s.cust} yükü fiziki muayeneye ayrıldı (${s.qty} konteyner).`, opts: [`Hızlandırılmış muayene (${money(-a)})`, 'Sırayı bekle (+1 hafta)']}); } continue; }
    if (s.hid > 0) { s.left = s.hid; s.total += s.hid; R.note(`${c.name} rötar bildirdi: ${s.cust}, +${s.hid} hafta`, 'bad'); s.hid = 0; s.delayed = true; continue; }
    deliver(G, s, R); }
  for (const a of G.ar.slice()) if (a.due <= G.week) { R.pay('sales', `Tahsilat: ${a.cust}`, a.amt); G.ar = G.ar.filter(x => x !== a); }
  if (G.dec.length < 2 && chance(.05)) { const a = G.ar.find(x => !x.ext); if (a) { a.ext = true;
    K.addDec(G, {k: 'term', aid: a.id, title: 'Vade uzatma talebi', text: `${a.cust} nakit sıkışıklığı yaşıyor; ${money(a.amt)} tutarındaki fatura için 4 hafta ek vade istiyor.`, opts: ['Kabul et (itibar +2)', 'Reddet (itibar −2)']}); } }
  if (G.cash < 0) { const lim = F.limit(G), ex = Math.max(0, -G.cash - lim); R.pay('fin', ex ? 'Kredi faizi (limit aşımı %5)' : 'Kredi faizi (%0,5)', -(Math.min(-G.cash, lim) * .005 + ex * .05)); }
  K.stepMarket(G, R, e => { let n = 0; G.sh.forEach(s => { if (e.lanes.includes(s.lane)) { delay(s, e.hit); n++; } }); if (n) R.note(`${n} sevkiyatın ${e.hit} hafta gecikecek`, 'bad'); });
  G.contracts = G.contracts.filter(c => { c.used = 0; if (--c.left <= 0) { R.note(`${LM[c.lane].name} blok yer anlaşması sona erdi`); return false; } R.pay('carrier', `Blok yer: ${LM[c.lane].name} (${c.cap} TEU)`, -c.cap * c.rate); return true; });
  G.week++; F.genOffers(G); G.hist.push(F.value(G)); K.closeReport(G, R);
  if (F.value(G) < 0) G.over = 'bust'; else if (G.week > K.END) G.over = 'done';
  return R; };
})(typeof window !== 'undefined' ? (window.K = window.K || {}) : (globalThis.K = globalThis.K || {}));
