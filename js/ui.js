/* Arayüz: gösterge şeridi, sekmeler, karar kartları, raporlar ve eylemler. */
(function (K) {
'use strict';
const {LANES, LM, PORTS, money, signed, esc, nf, from, to} = K, F = K.fwd, C = K.car;
const $ = s => document.querySelector(s);
const S = K.S = {G: null, tab: '', hi: null, flash: '', anim: null, prev: null, after: null, demoT: 0, len: 52};
const SAVE = 'konsimento-kayit-2';
const store = {get() { try { return JSON.parse(localStorage.getItem(SAVE)); } catch { return null; } },
  set(G) { try { G ? localStorage.setItem(SAVE, JSON.stringify(G)) : localStorage.removeItem(SAVE); } catch {} }};
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const tiers = G => (G.mode === 'fwd' ? F.TIERS : C.TIERS)[G.len];
const score = G => G.mode === 'fwd' ? F.value(G) : C.net(G);
const turn = G => Math.min(G.week, K.END) - G.w0 + 1;
const pct = v => '%' + Math.round(v * 100);
const tabsFor = G => G.mode === 'fwd'
  ? [['offers', 'TALEPLER', G.offers.length], ['ships', 'SEVKİYATLAR', G.sh.length], ['market', 'PİYASA'], ['firm', 'ŞİRKET'], ['report', 'RAPOR']]
  : [['fleet', 'FİLO', G.fleet.length], ['lanes', 'HATLAR'], ['yard', 'TERSANE', G.list.length], ['report', 'RAPOR']];

function spark(a, w = 84, h = 22) { a = a.slice(-16); if (a.length < 2) a = [a[0], a[0]]; const mn = Math.min(...a), mx = Math.max(...a), sp = mx - mn || 1;
  const pts = a.map((v, i) => [(i / (a.length - 1)) * (w - 6) + 3, h - 3 - ((v - mn) / sp) * (h - 6)]), e = pts[pts.length - 1];
  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline points="${pts.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="${e[0].toFixed(1)}" cy="${e[1].toFixed(1)}" r="2.4" fill="var(--magenta)"/></svg>`; }
/* Şirket değeri grafiği: hedef eşikleri kesikli çizgiyle, aynı ölçekte. */
function valueChart(G) { const nar = window.innerWidth < 600, w = nar ? 360 : 600, h = nar ? 170 : 190, L = 8, R = nar ? 76 : 150, T = 12, B = 22, ts = tiers(G), a = G.hist, n = G.len;
  const mx = Math.max(ts[2][0] * 1.06, ...a), mn = Math.min(0, ...a), x = i => L + i / n * (w - L - R), y = v => T + (1 - (v - mn) / (mx - mn)) * (h - T - B);
  return `<svg class="vchart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Haftalara göre şirket değeri ve hedef eşikleri">
    ${ts.map(t => `<line x1="${L}" x2="${w - R}" y1="${y(t[0]).toFixed(1)}" y2="${y(t[0]).toFixed(1)}" stroke="var(--line)" stroke-dasharray="3 4"/><text x="${w - R + 6}" y="${(y(t[0]) + 4).toFixed(1)}" fill="var(--muted)" font-size="11">${money(t[0])}${nar ? '' : ' · ' + t[1]}</text>`).join('')}
    <line x1="${L}" x2="${w - R}" y1="${y(mn).toFixed(1)}" y2="${y(mn).toFixed(1)}" stroke="var(--ink)"/>
    <polyline points="${a.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}" fill="none" stroke="var(--ink)" stroke-width="2"/>
    <circle cx="${x(a.length - 1).toFixed(1)}" cy="${y(a[a.length - 1]).toFixed(1)}" r="4" fill="var(--magenta)"/>
    <text x="${L}" y="${h - 6}" fill="var(--muted)" font-size="11">Hafta 1</text><text x="${w - R}" y="${h - 6}" fill="var(--muted)" font-size="11" text-anchor="end">Hafta ${n}</text></svg>`; }
const stat = (k, v, cls = '') => `<div class="stat"><span>${k}</span><b class="${cls}">${v}</b></div>`;
const kv = rows => `<dl class="kv">${rows.map(r => `<dt>${r[0]}</dt><dd class="num">${r[1]}</dd>`).join('')}</dl>`;

function renderHud() { const G = S.G, hud = $('#hud'), btns = $('#bridge-btns');
  if (!G) { hud.innerHTML = ''; btns.innerHTML = ''; $('#mode-tag').textContent = '9 LİMAN · 10 HAT · 2 SENARYO'; return; }
  $('#mode-tag').textContent = (G.mode === 'fwd' ? 'ARACI' : 'ARMATÖR') + ' · ' + G.name.toLocaleUpperCase('tr');
  const c = K.cal(Math.min(G.week, K.END)), wk = stat(`${c.m.toLocaleUpperCase('tr')} · Ç${c.q}`, `Hafta ${turn(G)}/${G.len}`), goal = tiers(G)[2][0], neg = G.cash < 0 ? 'neg' : '';
  hud.innerHTML = G.mode === 'fwd'
    ? wk + stat('KASA', money(G.cash), neg) + stat('ALACAK + YOLDA', money(F.ar(G) + F.unbilled(G))) + stat('İTİBAR', Math.round(G.rep)) + stat('ŞİRKET DEĞERİ', money(F.value(G))) + stat('HEDEF', money(goal))
    : wk + stat('KASA', money(G.cash), neg) + stat('BORÇ', money(G.debt)) + stat('NET DEĞER', money(C.net(G))) + stat('YAKIT', `$${G.m.bunker}/t`) + stat('HEDEF', money(goal));
  const n = G.dec.length;
  btns.innerHTML = `<button class="btn quiet sm" data-act="menu" id="b-menu">Menü</button><button class="btn go" data-act="end" id="b-end" ${S.anim || G.over || n ? 'disabled' : ''}>${n ? n + ' KARAR BEKLİYOR' : 'HAFTAYI BİTİR'}</button>`; }

function renderNotices() { const G = S.G, el = $('#notices'), key = $('#key');
  if (!G) { el.innerHTML = `<span class="kicker">DENİZCİLERE İLAN</span><div class="notice"><span>Gemiler tarifesinde. Bir senaryo seçince piyasa hareketlenir.</span></div>`; key.innerHTML = `<span><i class="sw" style="background:var(--ink)"></i>Hat gemileri</span>`; return; }
  el.innerHTML = `<span class="kicker">DENİZCİLERE İLAN</span>` + (G.m.ev.length ? G.m.ev.map(e => `<div class="notice"><span class="num">${e.left} HF</span><span><b>${esc(e.title)}.</b> <span class="muted">${esc(e.text)}</span></span></div>`).join('')
    : `<div class="notice"><span class="muted">Yürürlükte ilan yok. Deniz sakin, navlunlar normal seyrinde.</span></div>`);
  key.innerHTML = G.mode === 'fwd' ? F.CARR.map(c => `<span><i class="sw" style="background:var(${c.col})"></i>${c.name}</span>`).join('') + `<span><i class="sw dot"></i>Ofisin olan liman</span>`
    : `<span><i class="sw" style="background:var(--magenta)"></i>Gemilerin</span><span><i class="sw" style="border:1.5px solid var(--magenta)"></i>Konumlanıyor</span>`; }

const decsHTML = G => G.dec.length ? `<section class="decs" aria-label="Karar bekleyenler"><span class="kicker">KARAR BEKLEYENLER</span>${G.dec.map(d => `<article class="dec"><h3>${esc(d.title)}</h3><p>${esc(d.text)}</p>
  <div class="row">${d.opts.map((o, i) => `<button class="btn sm" data-act="dec" data-id="${d.id}" data-i="${i}" id="dec-${d.id}-${i}">${esc(o)}</button>`).join('')}</div></article>`).join('')}</section>` : '';

/* ── Aracı sekmeleri ── */
function offersHTML(G) {
  if (!G.offers.length) return `<div class="empty">Bu haftanın talepleri bitti. Haftayı bitirince yenileri gelir.</div>`;
  const lim = F.limit(G), tight = G.cash < -lim * .8 ? `<p class="flash warn" role="status">Kredi limitin dolmak üzere (${money(-G.cash)} / ${money(lim)}). Tahsilat gelene kadar pahalı yükleri bağlayamazsın.</p>` : '';
  return tight + G.offers.map(o => { const l = LM[o.lane], e = F.EQ[o.eq], rev = F.rev(G, o), k = F.block(G, o);
    const opts = F.LINES.map(c => { const cost = F.cost(G, o, c.id), p = rev - cost, t = F.transit(G, l, c), late = t > o.dl;
      return `<button class="carr" data-act="book" data-id="${o.id}" data-c="${c.id}" ${G.cash - cost < -lim ? 'disabled' : ''}><b><i class="sw" style="background:var(${c.col})"></i>${c.name}</b>
        <span class="num">${t} hf · ${pct(F.ok(G, c))} dakik${late ? ' · <span class="neg">geç kalır</span>' : ''}</span><span class="num">Alış ${money(cost)}</span><span class="num ${p >= 0 ? 'pos' : 'neg'}">Kâr ${signed(p)}</span></button>`; }).join('')
      + (k ? `<button class="carr" data-act="book" data-id="${o.id}" data-c="B"><b><i class="sw" style="background:var(--c-orange)"></i>Blok yer</b><span class="num">${K.laneWeeks(G, l)} hf · %90 dakik</span><span class="num">Ödendi</span><span class="num pos">Kâr ${signed(rev)}</span></button>` : '');
    return `<article class="bl" data-lane="${o.lane}"><div class="bl-head"><span class="num">B/L ${o.no}</span>${o.urgent ? '<span class="stamp">ACİL</span>' : ''}</div>
      <div class="bl-grid"><div><label>YÜKLEYEN</label>${esc(o.cust)}</div><div><label>EMTİA</label>${esc(o.cargo)}</div>
      <div><label>YÜKLEME LİMANI</label>${from(l, o.dir)}</div><div><label>TAHLİYE LİMANI</label>${to(l, o.dir)}</div>
      <div><label>EKİPMAN</label><span class="num">${o.qty} × ${e.n}</span> <span class="muted">· ${o.teu} TEU</span></div><div><label>NAVLUN</label><span class="num">$${nf.format(o.price)}/kont. · ${money(o.qty * o.price)}</span></div>
      <div><label>TERMİN</label><span class="num">${o.dl} hafta içinde</span></div><div><label>ÖDEME</label>${o.term ? `Teslimden ${F.TERM[o.term]} sonra` : 'Teslimde peşin'}</div></div>
      <div class="carrs">${opts}</div>
      <div class="bl-foot"><button class="btn sm" data-act="nego" data-id="${o.id}" ${o.nego ? 'disabled' : ''}>${o.nego ? 'Pazarlık yapıldı' : 'Pazarlık et (+%10)'}</button><button class="btn sm quiet" data-act="reject" data-id="${o.id}">Reddet</button></div></article>`; }).join(''); }
function shipsHTML(G) {
  const sh = G.sh.length ? G.sh.slice().sort((a, b) => a.left - b.left).map(s => { const l = LM[s.lane], eta = G.week + s.left, miss = eta > s.due;
    const pill = miss ? `<span class="pill neg">TERMİN AŞILIYOR</span>` : s.delayed ? `<span class="pill warn">RÖTARLI</span>` : `<span class="pill pos">YOLDA</span>`;
    return `<article class="card" data-lane="${s.lane}"><div class="card-top"><h3>${esc(s.cust)} <span class="muted">· ${esc(s.cargo)}</span></h3>${pill}</div>
      <div class="row"><span><i class="sw" style="background:var(${F.CM[s.c].col})"></i> ${F.CM[s.c].name}</span><span>${from(l, s.dir)} → ${to(l, s.dir)}</span><span class="num">${s.qty} × ${F.EQ[s.eq].n}</span></div>
      <div class="row"><div class="bar"><i style="width:${Math.round((s.total - s.left) / s.total * 100)}%"></i></div><span class="num">${s.left} hf kaldı · termine ${Math.max(0, s.due - G.week)} hf</span><span class="num pos">${money(s.rev)}</span></div>
      <span class="num muted" style="font-size:11.5px">${s.no}</span></article>`; }).join('') : `<div class="empty">Yolda sevkiyat yok. Talepler sekmesinden yük bağla.</div>`;
  const ar = G.ar.length ? `<h3 class="h3">ALACAKLAR</h3><div class="tbw"><table class="tb"><thead><tr><th>Müşteri</th><th>Tutar</th><th>Tahsilat</th></tr></thead><tbody>${G.ar.slice().sort((a, b) => a.due - b.due).map(a => `<tr><td>${esc(a.cust)}</td><td>${money(a.amt)}</td><td>${Math.max(1, a.due - G.week + 1)} hf sonra</td></tr>`).join('')}
    <tr class="sum"><td>Toplam</td><td>${money(F.ar(G))}</td><td></td></tr></tbody></table></div>` : '';
  return sh + ar; }
function fMarketHTML(G) { const open = F.lanes(G), lim = F.limit(G);
  const carr = F.LINES.map(c => { const v = G.vol[c.id], d = F.disc(G, c.id), nx = F.DISC.slice().reverse().find(t => v < t[0]);
    return `<article class="card"><div class="card-top"><h3><i class="sw" style="background:var(${c.col})"></i> ${c.name}</h3><span class="num">${pct(F.ok(G, c))} dakik · fiyat ${pct(c.mult * (1 - d))}</span></div>
      <p class="hint">${c.tag}</p><div class="row"><span class="num">Verdiğin yük ${nf.format(v)} TEU</span><span class="${d ? 'pos' : 'muted'}">${d ? `Hacim indirimi ${pct(d)}` : 'Henüz indirim yok'}</span>${nx ? `<span class="muted">${nf.format(nx[0])} TEU’da ${pct(nx[1])}</span>` : ''}</div></article>`; }).join('');
  const lanes = open.map(l => { const k = G.contracts.find(c => c.lane === l.id), r0 = K.rate(G, l, 0), cr = F.blockRate(G, l), tw = K.laneWeeks(G, l);
    return `<article class="card" data-lane="${l.id}"><div class="card-top"><h3>${l.name}</h3>${spark(G.m.hist[l.id])}</div>
      <div class="row"><span>${PORTS[l.a].n} → ${PORTS[l.b].n} <b class="num">$${nf.format(r0)}</b>/TEU</span><span class="muted">dönüş <b class="num">$${nf.format(K.rate(G, l, 1))}</b></span><span class="num ${tw > l.weeks ? 'warn' : 'muted'}">${tw} hf sefer</span></div>
      ${k ? `<div class="row pos">Blok yer: haftada ${k.cap} TEU, $${nf.format(k.rate)}/TEU · ${k.left} hf kaldı · bu hafta ${k.cap - k.used} TEU boş</div>`
        : `<div class="row sp"><span class="muted">Blok yer $${nf.format(cr)}/TEU</span><span class="row"><button class="btn sm" data-act="block" data-id="${l.id}" data-cap="10" id="bk-${l.id}-10" ${G.cash - 10 * cr < -lim ? 'disabled' : ''}>10 TEU/hf</button><button class="btn sm" data-act="block" data-id="${l.id}" data-cap="20" id="bk-${l.id}-20" ${G.cash - 20 * cr < -lim ? 'disabled' : ''}>20 TEU/hf</button></span></div>`}</article>`; }).join('');
  return `<h3 class="h3">ARMATÖRLER</h3>${carr}<h3 class="h3">HATLAR</h3><p class="hint">Fiyatlar TEU başınadır; 40' konteyner 1,8 katı, reefer 3,1 katı ödenir. Blok yer anlaşması ana yönde 8 hafta boyunca sabit yer tutar: piyasanın %18 altında, kullansan da kullanmasan da ödenir.</p>${lanes}
    ${open.length < LANES.length ? `<p class="hint">${LANES.length - open.length} hat daha var. Şirket sekmesinden ofis açınca o bölgelerin yükü de gelir.</p>` : ''}`; }
function firmHTML(G) {
  return `<article class="card"><div class="card-top"><h3>Satış temsilcisi</h3><span class="num">${G.reps}/5 kişi</span></div><p class="hint">Her temsilci haftada bir talep daha getirir. İşe alım ${money(F.HIRE)}, maaş haftada $1.800.</p>
    <div class="row"><button class="btn sm" data-act="hire" id="b-hire" ${G.reps >= 5 || G.cash < F.HIRE ? 'disabled' : ''}>Temsilci işe al · ${money(F.HIRE)}</button></div></article>
  <h3 class="h3">OFİSLER</h3><article class="card"><div class="card-top"><h3>Merkez ofis <span class="muted">· İstanbul</span></h3><span class="pill pos">AÇIK</span></div><p class="hint">Türkiye çıkışlı ve varışlı hatlar: Akdeniz, Kuzey Avrupa, Körfez, Uzak Doğu ithalatı, ABD Doğu.</p></article>`
  + Object.entries(F.OFF).map(([k, o]) => `<article class="card"><div class="card-top"><h3>${o.n} <span class="muted">· ${o.city}</span></h3>${G.off[k] ? '<span class="pill pos">AÇIK</span>' : `<span class="num">${money(o.cost)} + ${money(o.wk)}/hf</span>`}</div><p class="hint">${o.d} Haftada iki talep daha getirir.</p>
    ${G.off[k] ? '' : `<div class="row"><button class="btn sm" data-act="office" data-id="${k}" id="of-${k}" ${G.cash < o.cost ? 'disabled' : ''}>Ofisi aç</button></div>`}</article>`).join('')
  + `<h3 class="h3">HİZMETLER</h3>` + Object.entries(F.UP).map(([k, u]) => `<article class="card"><div class="card-top"><h3>${u.n}</h3>${G.up[k] ? '<span class="pill pos">AKTİF</span>' : `<span class="num">${money(u.cost)} + ${money(u.wk)}/hf</span>`}</div><p class="hint">${u.d}</p>
    ${G.up[k] ? '' : `<div class="row"><button class="btn sm" data-act="up" data-id="${k}" id="up-${k}" ${G.cash < u.cost ? 'disabled' : ''}>Satın al</button></div>`}</article>`).join('')
  + `<h3 class="h3">BANKA</h3>` + kv([['Haftalık sabit gider', money(F.fixed(G))], ['Kredi limiti (şirket değerinin %75’i)', money(F.limit(G))], ['Kullanılan kredi', money(Math.max(0, -G.cash))], ['Faiz', 'haftalık %0,5']]); }

/* ── Armatör sekmeleri ── */
function fleetHTML(G) {
  return G.fleet.map(s => { const c = C.CLS[s.cls], l = s.lane && LM[s.lane], head = `<div class="card-top"><h3>${s.name} <span class="muted">· ${c.n} · ${s.age ? s.age + ' yaşında' : 'yeni inşa'}</span></h3><span class="num">${nf.format(c.cap)} TEU${s.hire ? ` · kira ${money(s.hire)}/hf` : ''}</span></div>`;
    if (s.state === 'order') return `<article class="card">${head}<div class="row warn">Tersanede inşa ediliyor · teslime ${s.left} hf</div></article>`;
    const status = s.state === 'sea' ? `${from(l, s.dir)} → ${to(l, s.dir)} · ${s.left} hf kaldı${s.late ? ' · <span class="neg">rötarlı</span>' : ''}` : s.state === 'repo' ? `${PORTS[l.a].n} limanına konumlanıyor · 1 hf` : 'Limanda bekliyor, hat atanmadı';
    const sel = s.next !== null ? s.next : (s.lane || ''), tce = C.tce(s);
    return `<article class="card" data-lane="${s.lane || ''}">${head}<div class="row">${status}</div>
      ${s.state === 'sea' ? `<div class="row"><div class="bar"><i style="width:${Math.round(s.load / c.cap * 100)}%"></i></div><span class="num">Yük ${nf.format(s.load)} TEU · ${pct(s.load / c.cap)}</span></div>` : ''}
      <div class="row sp"><label><span class="lbl">HAT</span><select data-chg="assign" data-id="${s.id}" id="ln-${s.id}"><option value="">Limanda beklet</option>${LANES.map(x => `<option value="${x.id}" ${sel === x.id ? 'selected' : ''}>${x.name} (${K.laneWeeks(G, x)} hf)</option>`).join('')}</select></label>
        <div><span class="lbl">HIZ</span><div class="seg">${Object.entries(C.SPD).map(([k, v]) => `<button data-act="speed" data-id="${s.id}" data-v="${k}" id="sp-${s.id}-${k}" aria-pressed="${s.speed === k}">${v.n} ${v.kn} kn</button>`).join('')}</div></div></div>
      ${s.next !== null ? `<div class="row warn">Sefer bitince: ${s.next ? LM[s.next].name : 'limanda bekleyecek'}</div>` : ''}
      <div class="row sp"><span class="muted num">Yakıt ${money(C.fuelWk(G, s))}/hf · işletme ${money(c.opex)}/hf${s.acc.days ? ` · kazanç ${money(tce)}/gün` : ''}</span>
        ${s.hire ? `<button class="btn sm quiet" data-act="ret" data-id="${s.id}" ${G.week < s.until ? 'disabled' : ''}>${G.week < s.until ? `İade ${s.until - G.week} hf sonra` : 'Gemiyi iade et'}</button>` : `<button class="btn sm quiet" data-act="sell" data-id="${s.id}" ${G.fleet.length < 2 ? 'disabled' : ''}>Sat · ${money(C.shipVal(G, s) * .95)}</button>`}</div></article>`; }).join(''); }
function cLanesHTML(G) {
  const route = K.active(G, 'redsea') ? `<article class="card"><div class="card-top"><h3>Kızıldeniz rotası</h3><div class="seg"><button data-act="route" data-v="cape" id="rt-cape" aria-pressed="${G.route === 'cape'}">Ümit Burnu</button><button data-act="route" data-v="canal" id="rt-canal" aria-pressed="${G.route === 'canal'}">Kanal</button></div></div>
    <p class="hint">${G.route === 'cape' ? 'Süveyş hatlarında seferler 2 hafta uzun, kanal ücreti ödenmiyor.' : 'Sefer süresi normal. Her geçişte savaş riski primi ödenir, %5 saldırı riski var.'}</p></article>` : '';
  const ctr = G.ctr.length ? `<h3 class="h3">KONTRATLAR</h3>` + G.ctr.map(k => { const l = LM[k.lane];
    return `<article class="card" data-lane="${k.lane}"><div class="card-top"><h3>${esc(k.cust)}</h3><span class="num">$${nf.format(k.rate)}/TEU · ${k.left} hf kaldı</span></div>
      <div class="row"><span>${from(l, k.dir)} → ${to(l, k.dir)}</span><span class="num">${k.one ? 'tek sefer' : nf.format(k.teuWeek) + ' TEU/hf'}</span><span class="num ${k.wait > k.teuWeek * 2 ? 'warn' : ''}">Limanda bekleyen ${nf.format(Math.round(k.wait))} TEU</span><span class="num muted">Taşınan ${nf.format(k.lifted)}</span></div></article>`; }).join('') : '';
  return route + ctr + (ctr || route ? `<h3 class="h3">HATLAR</h3>` : '') + LANES.map(l => { const p = G.price[l.id], mine = G.fleet.filter(s => s.lane === l.id), r0 = K.rate(G, l, 0), tw = K.laneWeeks(G, l), ls = G.ls[l.id];
    return `<article class="card" data-lane="${l.id}"><div class="card-top"><h3>${l.name}</h3>${spark(G.m.hist[l.id])}</div>
      <div class="row"><span>${PORTS[l.a].n} → ${PORTS[l.b].n} <b class="num">$${nf.format(r0)}</b></span><span class="muted">dönüş <b class="num">$${nf.format(K.rate(G, l, 1))}</b></span><span class="num ${tw > l.weeks ? 'warn' : 'muted'}">${tw} hf sefer</span></div>
      <div class="row sp"><span class="step"><span class="lbl">FİYATIN</span><button class="btn sm" data-act="price" data-id="${l.id}" data-d="-1" id="pr-${l.id}-d" aria-label="Fiyatı düşür" ${p <= .7 ? 'disabled' : ''}>−</button><span class="num">${pct(p)}</span><button class="btn sm" data-act="price" data-id="${l.id}" data-d="1" id="pr-${l.id}-u" aria-label="Fiyatı artır" ${p >= 1.4 ? 'disabled' : ''}>+</button></span>
        <span class="num">$${nf.format(Math.round(r0 * p))} / $${nf.format(Math.round(K.rate(G, l, 1) * p))}</span></div>
      <div class="row"><span class="lbl">BEKLEYEN YÜK</span><span class="num">${PORTS[l.a].n} ${nf.format(Math.floor(G.pool[l.id][0]))} TEU <span class="muted">(+${nf.format(Math.round(C.inflow(G, l, 0)))}/hf)</span></span><span class="num">${PORTS[l.b].n} ${nf.format(Math.floor(G.pool[l.id][1]))} TEU <span class="muted">(+${nf.format(Math.round(C.inflow(G, l, 1)))}/hf)</span></span></div>
      ${mine.length ? `<div class="row muted">Gemilerin: ${mine.map(s => s.name).join(', ')}${ls.cap ? ` · ortalama doluluk ${pct(ls.teu / ls.cap)}` : ''}</div>` : ''}</article>`; }).join(''); }
function yardHTML(G) { const cap = C.loanCap(G), full = G.fleet.length >= C.MAXFLEET, T = {sale: 'ikinci el', charter: 'kiralık', new: 'yeni inşa'};
  return `<p class="hint">İlanlar her hafta değişir. Yaşlı gemi ucuzdur ama daha çok yakar ve daha sık arıza yapar. Kiralık gemi sermaye istemez, en az 6 hafta elinde kalır. Yeni inşa 8 haftada teslim edilir. Filo en çok ${C.MAXFLEET} gemi olabilir.</p>`
  + G.list.map(x => { const c = C.CLS[x.cls], buy = x.type !== 'charter';
    return `<article class="card"><div class="card-top"><h3>${c.n} <span class="muted">· ${T[x.type]}${x.age ? ` · ${x.age} yaşında` : ''}</span></h3><span class="num">${nf.format(c.cap)} TEU</span></div>
      <div class="row sp"><span class="num muted">Yakıt ${Math.round(c.fuel * C.eff(x.age))} t/gün · işletme ${money(c.opex)}/hf</span>
      <button class="btn sm" data-act="buy" data-id="${x.id}" ${full || (buy && G.cash < x.price) ? 'disabled' : ''}>${x.type === 'charter' ? `Kirala · ${money(x.price)}/hf` : x.type === 'new' ? `Sipariş ver · ${money(x.price)}` : `Satın al · ${money(x.price)}`}</button></div></article>`; }).join('')
  + `<h3 class="h3">BANKA</h3><article class="card"><div class="card-top"><h3>Gemi ipoteği karşılığı kredi</h3><span class="num">${money(G.debt)} / ${money(cap)}</span></div><p class="hint">Limit, sahip olduğun filonun değerinin yarısı. Faiz haftalık %0,3.</p>
    <div class="row"><button class="btn sm" data-act="loan" data-d="1" id="ln-up" ${G.debt + 1e6 > cap ? 'disabled' : ''}>$1 Mn çek</button><button class="btn sm" data-act="loan" data-d="-1" id="ln-dn" ${G.debt < 1e6 || G.cash < 1e6 ? 'disabled' : ''}>$1 Mn öde</button></div></article>
    <h3 class="h3">BİLANÇO</h3>` + kv([['Kasa', money(G.cash)], ['Filo değeri (sahip olunan)', money(C.fleetVal(G))], ['Kredi borcu', money(-G.debt)], ['<b>Net değer</b>', `<b>${money(C.net(G))}</b>`]]); }

/* ── Rapor sekmesi (iki senaryoda ortak) ── */
function cashTable(G, only) { const cats = K.CATS[G.mode], rows = G.cf, last = rows[rows.length - 1]; if (!last) return '';
  const q = K.cal(last.w).q, sum = (k, f) => rows.filter(f).reduce((s, r) => s + (r.c[k] || 0), 0), cols = only ? [r => r === last] : [r => r === last, r => K.cal(r.w).q === q, () => true];
  const body = cats.map(([k, n]) => { const v = cols.map(f => sum(k, f)); return v.some(Boolean) ? `<tr><td>${n}</td>${v.map(x => `<td class="${x < 0 ? 'neg' : ''}">${x ? money(x) : '–'}</td>`).join('')}</tr>` : ''; }).join('');
  const tot = cols.map(f => cats.reduce((s, [k]) => s + sum(k, f), 0));
  return `<div class="tbw"><table class="tb"><thead><tr><th>Nakit akışı</th>${only ? '<th>Bu hafta</th>' : `<th>Geçen hafta</th><th>Ç${q}</th><th>Toplam</th>`}</tr></thead><tbody>${body}<tr class="sum"><td>Net</td>${tot.map(x => `<td class="${x < 0 ? 'neg' : 'pos'}">${signed(x)}</td>`).join('')}</tr></tbody></table></div>`; }
function reportHTML(G) { const st = G.st;
  const kpi = G.mode === 'fwd'
    ? [['ZAMANINDA TESLİM', st.del ? pct((st.del - st.late) / st.del) : '–'], ['TEU BAŞINA BRÜT KÂR', st.booked ? money(st.gp / st.booked) : '–'], ['TESLİM EDİLEN', `${nf.format(st.teu)} TEU`], ['KESİLEN CEZA', money(st.pen)]]
    : [['ORTALAMA DOLULUK', st.cap ? pct(st.teu / st.cap) : '–'], ['HAT GÜVENİLİRLİĞİ', `${Math.round(G.rep)}/100`], ['TAŞINAN YÜK', `${nf.format(st.teu)} TEU`], ['FİLO KAPASİTESİ', `${nf.format(G.fleet.reduce((s, x) => s + C.CLS[x.cls].cap, 0))} TEU`]];
  const lanes = G.mode === 'car' ? LANES.filter(l => G.ls[l.id].cap) : [];
  return `<div class="kpis">${kpi.map(k => `<div class="stat"><span>${k[0]}</span><b>${k[1]}</b></div>`).join('')}</div>
    <h3 class="h3">${G.mode === 'fwd' ? 'ŞİRKET DEĞERİ' : 'NET DEĞER'}</h3>${valueChart(G)}
    ${G.cf.length ? `<h3 class="h3">NAKİT AKIŞI</h3>${cashTable(G)}` : ''}
    ${lanes.length ? `<h3 class="h3">HAT PERFORMANSI</h3><div class="tbw"><table class="tb"><thead><tr><th>Hat</th><th>TEU</th><th>Doluluk</th><th>Navlun</th></tr></thead><tbody>${lanes.map(l => { const s = G.ls[l.id]; return `<tr><td>${l.name}</td><td>${nf.format(s.teu)}</td><td>${pct(s.teu / s.cap)}</td><td>${money(s.rev)}</td></tr>`; }).join('')}</tbody></table></div>` : ''}
    <h3 class="h3">GÜNLÜK</h3>${G.log.length ? `<ul class="log">${G.log.map(e => `<li><span class="num">HF ${e.w - G.w0 + 1}</span><span class="${e.tone === 'bad' ? 'neg' : ''}">${e.tone === 'ev' ? '<b>' + esc(e.t) + '</b>' : esc(e.t)}</span></li>`).join('')}</ul>` : `<div class="empty">Henüz kayıt yok. İlk haftayı bitirince olaylar burada birikir.</div>`}`; }

function startHTML() { const sv = store.get(), n = S.len;
  return `<div class="intro"><span class="kicker">KONTEYNER TAŞIMACILIĞI STRATEJİ OYUNU</span><h1>Aynı deniz, iki ayrı masa.</h1>
  <p>Bir masada yükü bulup gemide yer arayan aracısın, ötekinde gemiyi dolduracak yük arayan armatör. Navlun piyasası, yüksek sezon, liman grevleri ve Süveyş ikisini de sınar.</p>
  <div class="setup"><label for="co-name"><span class="lbl">ŞİRKET ADI</span><input type="text" id="co-name" maxlength="28" placeholder="Şirketinin adı" autocomplete="off"></label>
    <div><span class="lbl">SÜRE</span><div class="seg"><button data-act="len" data-v="26" id="len-26" aria-pressed="${n === 26}">Yarım yıl · 26 hafta</button><button data-act="len" data-v="52" id="len-52" aria-pressed="${n === 52}">Tam yıl · 52 hafta</button></div></div></div>
  <div class="scen">
   <article><span class="role">SENARYO 1 · FREIGHT FORWARDER</span><h2>ARACI</h2><p>Gemin yok, müşterin var. İhracatçıdan yükü al, armatörden yer satın al, aradaki farkla yaşa.</p>
    <ul><li>Navlunu armatöre peşin ödersin, müşteri teslimde ya da vadesinde öder.</li><li>Ucuz armatör rötar yapar. Termin kaçarsa ceza ve itibar kaybı gelir.</li><li>İstanbul’dan başlar, yeni bölgelere ofis açarak büyürsün.</li><li>Hedef: ${money(F.TIERS[n][2][0])} şirket değeri.</li></ul>
    <button class="btn go" data-act="start" data-m="fwd">ARACI OLARAK BAŞLA</button></article>
   <article><span class="role">SENARYO 2 · HAT OPERATÖRÜ</span><h2>ARMATÖR</h2><p>İki gemin ve bir kredi limitin var. Gemileri hatlara ver, navlunu belirle, yakıtı ve boş dönüşü hesapla.</p>
    <ul><li>Dolu gemi kazandırır. Bekleyen yüke göre gemi ve fiyat seç.</li><li>Kontrat yükü düzenli gelir getirir; taşıyamazsan ceza ödersin.</li><li>Gemi al, kirala ya da yeni inşa sipariş et.</li><li>Hedef: ${money(C.TIERS[n][2][0])} net değer.</li></ul>
    <button class="btn go" data-act="start" data-m="car">ARMATÖR OLARAK BAŞLA</button></article>
  </div>
  ${sv && !sv.over ? `<div class="resume"><button class="btn" data-act="resume">Kayıtlı oyuna devam et</button><span class="muted">${esc(sv.name)} · ${sv.mode === 'fwd' ? 'Aracı' : 'Armatör'} · hafta ${turn(sv)}/${sv.len}</span></div>` : ''}</div>`; }

function renderDesk() { const G = S.G, desk = $('#desk');
  if (!G) { const nm = $('#co-name'), v = nm ? nm.value : ''; desk.innerHTML = startHTML(); $('#co-name').value = v; return; }
  const tabs = tabsFor(G); if (!tabs.some(t => t[0] === S.tab)) S.tab = tabs[0][0];
  const body = {offers: offersHTML, ships: shipsHTML, market: fMarketHTML, firm: firmHTML, fleet: fleetHTML, lanes: cLanesHTML, yard: yardHTML, report: reportHTML}[S.tab](G);
  desk.innerHTML = decsHTML(G) + `<div class="tabs" role="tablist">${tabs.map(([k, n, c]) => `<button class="tab" role="tab" id="tab-${k}" aria-selected="${S.tab === k}" data-act="tab" data-id="${k}">${n}${c !== undefined ? `<span class="num">${c}</span>` : ''}</button>`).join('')}</div>
    <div class="panel" role="tabpanel">${S.flash ? `<p class="flash" role="status">${esc(S.flash)}</p>` : ''}${body}</div>`; }
function render() { renderHud(); renderNotices(); renderDesk(); K.map.draw(); }
K.render = render;

/* ── Diyaloglar ── */
const HELP = {
  fwd: ['Her talep bir konşimento. Altındaki armatörlerden birine tıklayınca yükü o gemiye yazarsın.', 'Navlunu armatöre hemen ödersin. Müşteri teslimde ya da faturadaki vadede öder; aradaki farkı kasa ve banka kredisi taşır.',
    'Ucuz armatör daha sık rötar yapar. Termin kaçarsa haftada %10 ceza kesilir, itibarın düşer. Reefer yükte ceza iki katıdır.', 'İtibar yükseldikçe daha çok ve daha büyük talep gelir. Talepler her hafta yenilenir.',
    'Karar kartları iki seçeneklidir; hepsi cevaplanmadan hafta bitmez.', 'Şirket değeri sıfırın altına inerse iflas edersin.'],
  car: ['Her gemi atandığı hatta iki liman arasında mekik yapar. Kalkışta önce kontrat yükünü, sonra limanda bekleyen spot yükü alır; navlun o an kasaya girer.',
    'Hatlar sekmesinde fiyatı düşürürsen daha çok yük birikir, yükseltirsen TEU başına daha çok kazanırsın. Limanda yük en çok üç hafta bekler.', 'Yakıt, mürettebat ve genel giderler her hafta ödenir. Ekonomik hız yakıtı %38 düşürür, seferi 1 hafta uzatır.',
    'Kontrat kabul edersen o yükü her hafta taşımak zorundasın; üç haftadan fazla bekleyen TEU ceza yazar.', 'Tersaneden gemi al, kirala ya da yeni inşa sipariş et. Küçük hatta büyük gemi boş gider.', 'Kasa açığı $2,5 milyonu aşarsa iflas edersin.'],
};
const TERMS = [['TEU', '20 fitlik konteyner birimi. 40 fitlik konteyner 2 TEU sayılır.'], ['Konşimento (B/L)', 'Yükün taşıma senedi.'], ['Reefer', 'Soğutmalı konteyner; navlunu yüksek, gecikmesi pahalıdır.'],
  ['Rollover', 'Gemide yer kalmadığı için yükün bir sonraki sefere kaydırılması.'], ['Demuraj', 'Konteynerin limanda serbest süreden fazla beklemesinin ücreti.'], ['Blok yer', 'Armatörden belirli süre için sabit fiyatla tutulan haftalık kapasite.'],
  ['Spot / kontrat', 'Spot navlun günün fiyatıdır; kontrat navlunu dönem boyunca sabittir.'], ['Bunker', 'Gemi yakıtı.'], ['Boş dönüş', 'Dönüş yönünde yük az olduğu için geminin yarı boş seyretmesi.']];
const sheet = html => { $('#dlg').innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="dlg-h">${html}</div>`; $('#dlg').hidden = false; const b = $('#dlg-ok'); if (b) b.focus(); };
function showReport(R) { const G = S.G, inc = Object.values(R.cats).filter(v => v > 0).reduce((s, v) => s + v, 0), exp = -Object.values(R.cats).filter(v => v < 0).reduce((s, v) => s + v, 0), net = inc - exp, c = K.cal(R.week);
  sheet(`<span class="kicker">HAFTA SONU RAPORU · ${c.m.toLocaleUpperCase('tr')}</span><h2 id="dlg-h">HAFTA ${R.week - G.w0 + 1}</h2>
    ${R.news.map(n => `<div class="news"><b>${esc(n.title)}</b><span>${esc(n.text)}</span></div>`).join('')}
    ${R.lines.length ? `<ul class="ledger">${R.lines.map(l => `<li><span class="${l.tone === 'bad' ? 'neg' : ''}">${esc(l.t)}</span>${l.a !== undefined ? `<span class="num ${l.a >= 0 ? 'pos' : 'neg'}">${signed(l.a)}</span>` : ''}</li>`).join('')}</ul>` : ''}
    ${cashTable(G, true)}
    <div class="totals">${stat('GİREN', money(inc))}${stat('ÇIKAN', money(exp))}${stat('HAFTA NETİ', signed(net), net >= 0 ? 'pos' : 'neg')}</div>
    ${G.dec.length && !G.over ? `<p class="hint"><b>${G.dec.length} karar seni bekliyor.</b></p>` : ''}
    <div class="sheet-foot"><button class="btn go" data-act="${G.over ? 'final' : 'close'}" id="dlg-ok">${G.over ? 'SONUCU GÖR' : 'DEVAM'}</button></div>`); }
function showFinal() { const G = S.G, v = score(G), ts = tiers(G), bust = G.over === 'bust', got = ts.filter(t => v >= t[0]).pop(), st = G.st, lbl = G.mode === 'fwd' ? 'şirket değeriyle' : 'net değerle';
  const head = bust ? 'İFLAS' : got ? got[1].toLocaleUpperCase('tr') : 'HEDEFİN ALTINDA';
  const msg = bust ? (G.mode === 'fwd' ? 'Şirket değeri sıfırın altına indi. Sabit giderler ve cezalar, kazanılan navlun farkını aştı.' : 'Kasa açığı $2,5 milyonu aştı, banka gemilere el koydu.')
    : got ? `${esc(G.name)} ${G.len} haftayı ${money(v)} ${lbl} kapattı.` : `${esc(G.name)} ${G.len} haftayı ${money(v)} ile kapattı. İlk eşik ${money(ts[0][0])}.`;
  const facts = G.mode === 'fwd' ? [['Teslim edilen', `${st.del} sevkiyat · ${nf.format(st.teu)} TEU`], ['Zamanında teslim', st.del ? pct((st.del - st.late) / st.del) : '–'], ['İtibar', `${Math.round(G.rep)}/100`], ['Ofis', `${F.offices(G)} bölge`]]
    : [['Filo', `${G.fleet.length} gemi · ${nf.format(G.fleet.reduce((s, x) => s + C.CLS[x.cls].cap, 0))} TEU`], ['Taşınan yük', `${nf.format(st.teu)} TEU · ${st.cap ? pct(st.teu / st.cap) : '–'} doluluk`], ['Rötarlı sefer', `${st.late}/${st.voy}`], ['Hat güvenilirliği', `${Math.round(G.rep)}/100`]];
  sheet(`<span class="kicker">${G.mode === 'fwd' ? 'ARACI' : 'ARMATÖR'} · YIL SONU</span><h2 id="dlg-h" class="big">${head}</h2><p>${msg}</p>${valueChart(G)}
    ${kv(ts.map(t => [t[1], `<span class="${v >= t[0] && !bust ? 'pos' : 'muted'}">${money(t[0])} ${v >= t[0] && !bust ? '✓' : ''}</span>`]).concat(facts))}
    <div class="sheet-foot"><button class="btn" data-act="home">Senaryo seç</button><button class="btn go" data-act="again" id="dlg-ok">YENİDEN OYNA</button></div>`); }
function showMenu() { sheet(`<h2 id="dlg-h">MENÜ</h2><p class="muted">Oyun her hafta sonunda bu tarayıcıya kaydedilir.</p>
  <div class="sheet-foot" style="justify-content:flex-start"><button class="btn go" data-act="close" id="dlg-ok">OYUNA DÖN</button><button class="btn" data-act="help">Nasıl oynanır</button><button class="btn" data-act="again">Baştan başla</button><button class="btn" data-act="home">Senaryo seçimine dön</button></div>`); }
function showHelp() { const G = S.G; sheet(`<span class="kicker">${G.mode === 'fwd' ? 'ARACI' : 'ARMATÖR'}</span><h2 id="dlg-h">NASIL OYNANIR</h2><ul class="help">${HELP[G.mode].map(t => `<li>${t}</li>`).join('')}</ul>
  <h3 class="h3">SÖZLÜK</h3><dl class="gloss">${TERMS.map(t => `<dt>${t[0]}</dt><dd>${t[1]}</dd>`).join('')}</dl>
  <div class="sheet-foot"><button class="btn go" data-act="close" id="dlg-ok">ANLADIM</button></div>`); }

/* ── Eylemler ── */
function endWeek() { const G = S.G; if (!G || G.over || S.anim || G.dec.length) return; S.flash = '';
  S.prev = Object.fromEntries(K.map.markers().map(m => [m.id, m]));
  const R = G.mode === 'fwd' ? F.endWeek(G) : C.endWeek(G); store.set(G.over ? null : G);
  const done = () => { render(); showReport(R); };
  if (reduced.matches) { S.prev = null; done(); } else { S.anim = performance.now(); S.after = done; renderHud(); K.map.draw(); } }
function start(mode, name) { const opt = {len: S.len, name: (name || '').trim()}; S.G = mode === 'fwd' ? F.create(opt) : C.create(opt); S.tab = ''; S.flash = ''; S.hi = null; $('#dlg').hidden = true; store.set(S.G); render(); window.scrollTo(0, 0); showHelp(); }
let demoRaf = 0, demoLast = 0;
function demoTick(t) { if (S.G) { demoRaf = 0; return; } if (t - demoLast > 40) { S.demoT += Math.min(.1, (t - demoLast) / 1000); demoLast = t; K.map.draw(); } demoRaf = requestAnimationFrame(demoTick); }
function demo() { if (!S.G && !reduced.matches && !demoRaf) { demoLast = performance.now(); demoRaf = requestAnimationFrame(demoTick); } }
const G_ = () => S.G;
const ACT = {
  start: d => start(d.m, $('#co-name') ? $('#co-name').value : ''), again: () => start(S.G.mode, S.G.name), len: d => { S.len = +d.v; },
  resume: () => { const g = store.get(); if (g) { S.G = g; S.len = g.len; S.tab = ''; render(); } },
  home: () => { S.G = null; S.hi = null; $('#dlg').hidden = true; render(); demo(); }, menu: showMenu, help: showHelp,
  close: () => { $('#dlg').hidden = true; const b = $('#b-end'); if (b) b.focus(); }, final: showFinal, end: endWeek,
  tab: d => { S.tab = d.id; S.flash = ''; }, dec: d => { S.flash = K.decide(G_(), +d.id, +d.i); },
  book: d => { const o = G_().offers.find(x => x.id === +d.id); if (o && F.book(G_(), +d.id, d.c)) S.flash = `${o.cust} yükü ${F.CM[d.c].name} ile yola çıktı.`; },
  reject: d => { G_().offers = G_().offers.filter(o => o.id !== +d.id); }, nego: d => { S.flash = F.nego(G_(), +d.id); },
  block: d => F.buyBlock(G_(), d.id, +d.cap), hire: () => F.hire(G_()), up: d => F.buyUp(G_(), d.id), office: d => F.openOffice(G_(), d.id),
  price: d => C.setPrice(G_(), d.id, +d.d), speed: d => C.setSpeed(G_(), +d.id, d.v), route: d => { G_().route = d.v; },
  buy: d => { if (C.buy(G_(), +d.id)) S.tab = 'fleet'; }, sell: d => C.sell(G_(), +d.id), ret: d => C.giveBack(G_(), +d.id), loan: d => C.loan(G_(), +d.d),
};
const NORENDER = ['end', 'menu', 'help', 'final', 'start', 'again', 'home', 'resume', 'close'];
document.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (!b || b.disabled) return; const a = b.dataset.act; ACT[a](b.dataset);
  if (!NORENDER.includes(a)) { const id = b.id; render(); const n = id && document.getElementById(id); if (n) n.focus(); } });
document.addEventListener('change', e => { const s = e.target.closest('[data-chg]'); if (!s) return; C.assign(S.G, +s.dataset.id, s.value); const id = s.id; render(); const n = document.getElementById(id); if (n) n.focus(); });
const setHi = id => { if (id === S.hi) return; S.hi = id; $('#hi-name').textContent = id ? LM[id].name : ''; K.map.draw(); };
$('#desk').addEventListener('pointerover', e => { const c = e.target.closest('[data-lane]'); setHi(c && c.dataset.lane ? c.dataset.lane : null); });
$('#desk').addEventListener('pointerleave', () => setHi(null));
$('#desk').addEventListener('focusin', e => { const c = e.target.closest('[data-lane]'); if (c && c.dataset.lane) setHi(c.dataset.lane); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#dlg').hidden && S.G && !S.G.over) ACT.close(); });
new ResizeObserver(() => document.documentElement.style.setProperty('--hud-h', $('#bridge').offsetHeight + 'px')).observe($('#bridge'));

document.documentElement.lang = 'tr';
K.map.init($('#cv'));
function boot(data) { if (data && data.G) { S.G = data.G; S.tab = data.tab || ''; S.len = data.G.len; } render(); K.map.resize(); demo(); }
const hot = window.claude && window.claude.hot;
if (hot && hot.snapshot) hot.snapshot(() => ({G: S.G, tab: S.tab}));
if (hot && hot.ready) hot.ready(boot); else boot((hot && hot.data) || {});
})(window.K = window.K || {});
