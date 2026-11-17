/* Arayüz duman testi: iki senaryoyu gerçek tıklamalarla oynar, konsol hatası ve yatay taşma arar.
   Çalıştırma: node tests/ui.js [ekran görüntüsü klasörü] */
const { chromium } = require('playwright');
const path = require('path');
const out = process.argv[2];
(async () => {
  const b = await chromium.launch(), errs = [];
  const open = async (w, h, scheme) => { const c = await b.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, reducedMotion: 'reduce' }), p = await c.newPage();
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push('SAYFA HATASI ' + e.message));
    await p.goto('file://' + path.resolve(__dirname, '../index.html')); await p.waitForTimeout(300); return p; };
  const shot = async (p, name, full) => { if (out) await p.screenshot({ path: path.join(out, name + '.png'), fullPage: !!full }); };
  const overflow = p => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const closeDlg = async p => { const ok = p.locator('#dlg-ok'); if (await ok.isVisible()) await ok.click(); };
  async function play(p, mode, weeks, each) { await p.fill('#co-name', mode === 'fwd' ? 'Kendir Lojistik' : 'Kendir Denizcilik'); await p.click('#len-26'); await p.click(`[data-m="${mode}"]`); await closeDlg(p);
    for (let i = 0; i < weeks; i++) { while (await p.locator('.dec .btn').count()) await p.locator('.dec .btn').first().click();
      await each(p, i); await p.click('#b-end'); if (await p.locator('[data-act="final"]').count()) return true; await closeDlg(p); } return false; }

  let p = await open(1280, 860, 'light'); await shot(p, 'baslangic');
  const tabs = async (p, ids, tag) => { for (const t of ids) { await p.click('#tab-' + t); await shot(p, `${tag}-${t}`, true); } };
  await play(p, 'fwd', 9, async (p, i) => { await p.click('#tab-offers');
    for (let k = 0; k < 4; k++) { const btn = p.locator('.carr:not([disabled])').nth(1); if (!(await btn.count())) break; await btn.click(); }
    if (i === 2) { await p.click('#tab-firm'); await p.click('#b-hire'); await p.click('#of-EU'); await p.click('#up-customs'); }
    if (i === 3) { await p.click('#tab-market'); await p.locator('[data-act="block"]:not([disabled])').first().click(); }
    if (i === 4) { await p.click('#tab-offers'); const n = p.locator('[data-act="nego"]:not([disabled])').first(); if (await n.count()) await n.click(); } });
  await tabs(p, ['offers', 'ships', 'market', 'firm', 'report'], 'araci');
  const doneF = await play(p = await open(1280, 860, 'light'), 'fwd', 27, async p => { const btn = p.locator('.carr:not([disabled])').nth(1); if (await btn.count()) await btn.click(); });
  if (doneF) { await p.click('[data-act="final"]'); await shot(p, 'araci-sonuc'); }

  p = await open(1280, 860, 'dark');
  await play(p, 'car', 12, async (p, i) => {
    if (i === 1) { await p.click('#tab-lanes'); await p.click('#pr-AM-d'); await p.click('#pr-IE-u'); }
    if (i === 3) { await p.click('#tab-yard'); await p.click('#ln-up'); await p.click('#ln-up'); const c = p.locator('[data-act="buy"]:not([disabled])').first(); if (await c.count()) { await c.click(); const sel = p.locator('select').last(); await sel.selectOption('TA'); } }
    if (i === 5) { await p.click('#tab-fleet'); await p.locator('.seg button').first().click(); } });
  await tabs(p, ['fleet', 'lanes', 'yard', 'report'], 'armator');
  const doneC = await play(p = await open(390, 800, 'light'), 'car', 27, async () => {});
  console.log('telefon taşması (armatör):', await overflow(p), 'px');
  if (doneC) { await p.click('[data-act="final"]'); await shot(p, 'armator-sonuc-telefon', true); }
  p = await open(390, 800, 'dark'); await shot(p, 'baslangic-telefon', true); console.log('telefon taşması (başlangıç):', await overflow(p), 'px');
  await play(p, 'fwd', 5, async p => { const btn = p.locator('.carr:not([disabled])').first(); if (await btn.count()) await btn.click(); });
  await p.click('#tab-offers'); await shot(p, 'araci-telefon', true); console.log('telefon taşması (aracı):', await overflow(p), 'px');
  await p.click('#tab-report'); await shot(p, 'araci-rapor-telefon', true); console.log('telefon taşması (rapor):', await overflow(p), 'px');
  console.log('oyun sonu ekranı: aracı', doneF, '· armatör', doneC);
  console.log(errs.length ? 'KONSOL HATALARI:\n' + errs.join('\n') : 'Konsol hatası yok.');
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
