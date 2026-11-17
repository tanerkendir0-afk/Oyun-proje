/* Çekirdek: yardımcılar, takvim, navlun piyasası, olaylar, nakit defteri, karar kartları. */
(function (K) {
'use strict';
let seed = (Date.now() ^ 0x9e3779b9) >>> 0;
K.seed = n => { seed = n >>> 0; };
K.random = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const rnd = K.rnd = (a, b) => b === undefined ? K.random() * a : a + K.random() * (b - a);
const ri = K.ri = (a, b) => Math.floor(rnd(a, b + 1));
const pick = K.pick = a => a[Math.floor(K.random() * a.length)];
const chance = K.chance = p => K.random() < p;
const clamp = K.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
K.r10 = v => Math.round(v / 10) * 10;
const nf = K.nf = new Intl.NumberFormat('tr-TR');
K.money = v => { v = Math.round(v); const s = v < 0 ? '−' : '', a = Math.abs(v);
  return a >= 1e6 ? `${s}$${(a / 1e6).toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} Mn` : `${s}$${nf.format(a)}`; };
K.signed = v => (v >= 0 ? '+' : '') + K.money(v);
K.esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

/* Takvim: oyun bir mali yılın haftalarında geçer (yarım yıl seçilirse 27. haftadan başlar). */
K.END = 52;
K.MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
K.cal = w => ({m: K.MONTHS[Math.min(11, Math.floor((w - 1) / 4.34))], q: Math.min(4, Math.ceil(w / 13))});

/* Olaylar. hold: yeni seferleri uzatır, hit: yoldaki yükü/gemiyi geciktirir, idx: navlun endeksi, dem: talep. */
const LANES = K.LANES;
const suezL = () => LANES.filter(l => l.suez).map(l => l.id);
const asiaL = () => LANES.filter(l => l.a === 'SHA' || l.a === 'SIN').map(l => l.id);
K.EV = {
  suez: {w: 1, dur: 2, idx: .3, hold: 2, hit: 2, lanes: suezL, title: () => 'Süveyş Kanalı tıkandı', text: 'Karaya oturan bir gemi geçişi kesti. Süveyş hatlarında seferler 2 hafta uzuyor, navlunlar tırmanıyor.'},
  redsea: {w: .9, dur: 10, idx: .38, hold: 2, once: true, lanes: suezL, title: () => 'Kızıldeniz güvenlik krizi', text: 'Bab el-Mendeb çevresinde ticaret gemilerine saldırılar başladı. Hatlar Ümit Burnu’na dönüyor: Süveyş güzergâhlı seferler 2 hafta uzuyor, navlunlar sert yükseliyor.'},
  strike: {w: 1.6, dur: 2, idx: .12, hold: 1, hit: 1, port: true, title: p => `${p} limanında grev`, text: 'Liman işçileri iş bıraktı. Bu limana bağlı hatlarda seferler 1 hafta uzuyor.'},
  congest: {w: 1.4, dur: 3, idx: .1, hold: 1, port: true, title: p => `${p} limanında sıkışıklık`, text: 'Rıhtım bekleme süreleri uzadı. Bu limana bağlı hatlarda yeni seferler 1 hafta uzuyor.'},
  storm: {w: 2.4, dur: 1, idx: .04, hit: 1, lane: true, title: l => `${l} hattında fırtına`, text: 'Yoldaki gemiler rota değiştirdi, 1 hafta rötar var.'},
  bunkerUp: {w: 1.4, dur: 4, bunker: .3, title: () => 'Yakıt fiyatı sıçradı', text: 'Bunker dört hafta boyunca pahalı. Tam yol giden gemi kasayı yakar.'},
  bunkerDown: {w: 1, dur: 4, bunker: -.2, title: () => 'Yakıt ucuzladı', text: 'Bunker fiyatları dört hafta boyunca düşük seyredecek.'},
  slump: {w: 1.3, dur: 4, idx: -.2, dem: .75, title: () => 'Küresel talep zayıflıyor', text: 'Siparişler geriledi. Dört hafta boyunca daha az yük, daha düşük navlun.'},
  rush: {w: 1, dur: 3, idx: .18, dem: 1.25, title: () => 'Gümrük vergisi öncesi yükleme telaşı', text: 'İthalatçılar yeni tarifeden önce mal çekiyor. Üç hafta boyunca yük bol, navlun yüksek.'},
  glut: {w: 1, dur: 5, idx: -.14, title: () => 'Piyasaya yeni tonaj girdi', text: 'Tersanelerden çıkan gemiler kapasiteyi artırdı, navlunlar baskı altında.'},
};
/* Takvime bağlı mevsimler: her yıl aynı haftada gelir. */
K.SEASONS = [
  {k: 'cny', week: 5, dur: 3, dem: .72, idx: -.08, lanes: asiaL, title: 'Çin Yeni Yılı', text: 'Fabrikalar kapalı. Asya çıkışlı hatlarda üç hafta boyunca yük azalıyor.'},
  {k: 'peak', week: 31, dur: 9, dem: 1.25, idx: .2, title: 'Yüksek sezon başladı', text: 'Yılbaşı öncesi stoklama başladı. Dokuz hafta boyunca yük bol, navlun yüksek, gemilerde yer dar.'},
  {k: 'golden', week: 40, dur: 1, dem: .8, idx: 0, lanes: asiaL, title: 'Altın Hafta tatili', text: 'Çin’de bir haftalık tatil. Asya çıkışlı yük bu hafta zayıf.'},
];
const BLOCK = {bunkerUp: ['bunkerDown'], bunkerDown: ['bunkerUp'], slump: ['peak', 'rush'], rush: ['peak', 'slump'], suez: ['redsea']};

K.newMarket = () => { const idx = {}, hist = {}; LANES.forEach(l => { idx[l.id] = 1; hist[l.id] = [1]; }); return {idx, hist, bunker: 600, ev: [], once: {}}; };
K.affects = (e, l) => !e.lanes || e.lanes.includes(l.id);
K.rate = (G, l, d) => K.r10((d ? l.back : l.head) * G.m.idx[l.id]);
K.laneWeeks = (G, l) => l.weeks + G.m.ev.reduce((s, e) => s + (e.hold && K.affects(e, l) && !(e.k === 'redsea' && G.mode === 'car' && G.route === 'canal') ? e.hold : 0), 0);
K.demMult = (G, l) => G.m.ev.reduce((s, e) => s * (e.dem && K.affects(e, l) ? e.dem : 1), 1);
K.isPeak = G => G.m.ev.some(e => e.k === 'peak' || e.k === 'rush');
K.active = (G, k) => G.m.ev.some(e => e.k === k);
K.avgIdx = G => LANES.reduce((s, l) => s + G.m.idx[l.id], 0) / LANES.length;

function spawn(G) {
  const pool = Object.keys(K.EV).filter(k => !K.active(G, k) && !(K.EV[k].once && G.m.once[k]) && !(BLOCK[k] || []).some(b => K.active(G, b)));
  let t = rnd(pool.reduce((s, k) => s + K.EV[k].w, 0)), k = pool[0]; for (const q of pool) { t -= K.EV[q].w; if (t <= 0) { k = q; break; } }
  const d = K.EV[k], e = {k, left: d.dur, idx: d.idx || 0, dem: d.dem || 0, bunker: d.bunker || 0, hold: d.hold || 0, hit: d.hit || 0, text: d.text};
  if (d.once) G.m.once[k] = true;
  if (d.lanes) { e.lanes = d.lanes(); e.title = d.title(); }
  else if (d.port) { const p = pick(Object.keys(K.PORTS)); e.lanes = LANES.filter(l => l.a === p || l.b === p).map(l => l.id); e.title = d.title(K.PORTS[p].n); }
  else if (d.lane) { const l = pick(LANES); e.lanes = [l.id]; e.title = d.title(l.name); }
  else e.title = d.title();
  return e;
}
/* Hafta sonu piyasa adımı. Yeni başlayan olayları döndürür; yoldakileri geciktirmek senaryonun işidir (onHit). */
K.stepMarket = (G, R, onHit) => { const fresh = [];
  G.m.ev = G.m.ev.filter(e => --e.left > 0);
  K.SEASONS.forEach(s => { if (s.week === G.week + 1) fresh.push({k: s.k, left: s.dur, idx: s.idx, dem: s.dem, bunker: 0, hold: 0, hit: 0, title: s.title, text: s.text, lanes: s.lanes ? s.lanes() : undefined}); });
  if (G.week > G.w0 && chance(.4)) fresh.push(spawn(G));
  fresh.forEach(e => { G.m.ev.push(e); R.news.push({title: e.title, text: e.text}); if (e.hit) onHit(e); });
  LANES.forEach(l => { const t = 1 + G.m.ev.reduce((s, e) => s + (K.affects(e, l) ? e.idx : 0), 0);
    G.m.idx[l.id] = clamp(G.m.idx[l.id] + (t - G.m.idx[l.id]) * .4 + rnd(-.05, .05), .5, 2.4); G.m.hist[l.id].push(G.m.idx[l.id]); if (G.m.hist[l.id].length > 20) G.m.hist[l.id].shift(); });
  const bt = 600 * (1 + G.m.ev.reduce((s, e) => s + e.bunker, 0)); G.m.bunker = Math.round(G.m.bunker + (bt - G.m.bunker) * .5 + rnd(-15, 15));
  return fresh; };

/* Nakit defteri: her para hareketi bir kategoriye yazılır; hafta sonunda nakit akışı tablosuna girer. */
K.CATS = {
  fwd: [['sales', 'Müşteri tahsilatı'], ['carrier', 'Armatöre ödenen navlun'], ['staff', 'Maaş, ofis ve hizmetler'], ['pen', 'Ceza, demuraj ve tazminat'], ['fin', 'Faiz'], ['invest', 'Yatırım (ofis, lisans, işe alım)']],
  car: [['frt', 'Spot navlun'], ['ctr', 'Kontrat navlunu'], ['fuel', 'Yakıt'], ['port', 'Liman, elleçleme ve kanal'], ['crew', 'Mürettebat ve bakım'], ['adm', 'Genel yönetim'], ['hire', 'Gemi kirası'], ['repair', 'Onarım'], ['pen', 'Kontrat cezası'], ['fin', 'Faiz'], ['capex', 'Gemi alım-satım'], ['loan', 'Kredi hareketi']],
};
K.cash = (G, cat, a) => { a = Math.round(a); if (!a) return 0; G.cash += a; G.wk[cat] = (G.wk[cat] || 0) + a; return a; };
K.mkReport = G => ({week: G.week, news: [], lines: [],
  pay(cat, t, a, tone) { a = K.cash(G, cat, a); if (a) this.lines.push({t, a, tone}); },
  line(t, a, tone) { this.lines.push({t, a: Math.round(a), tone}); },
  note(t, tone) { this.lines.push({t, tone}); G.log.unshift({w: this.week, t, tone}); }});
K.closeReport = (G, R) => { R.cats = G.wk; G.cf.push({w: R.week, c: G.wk}); G.wk = {};
  R.news.forEach(n => G.log.unshift({w: R.week, t: n.title, tone: 'ev'})); if (G.log.length > 80) G.log.length = 80; };

/* Karar kartları: iki seçenekli olaylar. Hafta, bekleyen karar kalmadan bitirilemez. */
K.addDec = (G, d) => { d.id = G.seq++; G.dec.push(d); };
K.decide = (G, id, i) => { const d = G.dec.find(x => x.id === id); if (!d) return ''; G.dec = G.dec.filter(x => x !== d);
  const msg = (G.mode === 'fwd' ? K.fwd : K.car).decide(G, d, i) || ''; if (msg) G.log.unshift({w: G.week, t: msg}); return msg; };
})(typeof window !== 'undefined' ? (window.K = window.K || {}) : (globalThis.K = globalThis.K || {}));
