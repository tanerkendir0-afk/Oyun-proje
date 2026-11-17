# Konşimento

Tarayıcıda oynanan, sıra tabanlı bir konteyner taşımacılığı strateji oyunu. Kurulum gerektirmez: `index.html` dosyasını tarayıcıda açmak yeterli.

## İki senaryo

**Aracı (freight forwarder).** Gemin yok. İhracatçıdan yük talebi alır, üç armatörden birinde yer satın alırsın.

- Navlunu armatöre peşin ödersin; müşteri teslimde ya da 15–30 gün vadeyle öder. Aradaki farkı kasa ve banka kredisi taşır.
- Ucuz armatör rötar yapar ve uzun hatlarda aktarmalıdır. Termin kaçarsa ceza kesilir, itibar düşer.
- Ekipman tipleri (20' DC, 40' HC, 40' reefer), hacim indirimi, blok yer anlaşması, pazarlık.
- İstanbul'dan başlarsın; Rotterdam, Şanghay, New York ve Cebel Ali ofisleriyle yeni hatlar açılır.

**Armatör (hat operatörü).** İki gemiyle başlarsın. Gemileri hatlara atar, navlun fiyatını ve hızı belirlersin.

- Kalkışta önce kontrat yükü, sonra limanda bekleyen spot yük alınır. Dönüş yönü zayıftır.
- Yakıt, mürettebat, liman, kanal ve genel giderler; gemi yaşına göre tüketim ve arıza riski.
- İkinci el, kiralık ya da yeni inşa gemi; gemi ipoteği karşılığı kredi.
- Kontrat teklifleri: düzenli gelir getirir, taşınamayan yük ceza yazar.

## Ortak sistemler

- Mali yıl takvimi: Çin Yeni Yılı, yüksek sezon, Altın Hafta. Yarım yıl (26 hafta) ya da tam yıl (52 hafta).
- Navlun endeksi, yakıt fiyatı ve olaylar: Süveyş tıkanması, Kızıldeniz krizi, grev, liman sıkışıklığı, fırtına.
- İki seçenekli karar kartları: rollover, gümrük muayenesi, demuraj, hasar talebi, makine arızası, rota kararı.
- Rapor sekmesi: göstergeler, hedef eşikleriyle değer grafiği, nakit akışı tablosu, günlük.
- Oyun her hafta sonunda tarayıcıya kaydedilir.

## Proje yapısı

```
index.html         sayfa iskeleti
css/style.css      tema (açık/koyu) ve bileşen stilleri
js/geo.js          limanlar, hatlar, deniz yolları, kara parçaları
js/core.js         yardımcılar, takvim, piyasa ve olaylar, nakit defteri, karar kartları
js/forwarder.js    aracı senaryosunun kuralları
js/carrier.js      armatör senaryosunun kuralları
js/map.js          harita çizimi
js/ui.js           arayüz ve eylemler
tests/sim.js       başsız simülasyon: botlarla denge ve tutarlılık denetimi
tests/ui.js        tarayıcıda duman testi (Playwright)
```

Oyun kuralları (`geo`, `core`, `forwarder`, `carrier`) tarayıcıya bağlı değildir; Node ile doğrudan çalışır.

## Testler

```
node tests/sim.js 80     # her senaryo ve süre için 80'er oyun
node tests/ui.js         # iki senaryoyu gerçek tıklamalarla oynar
```
