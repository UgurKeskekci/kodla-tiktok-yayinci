# Kodla Yayıncı

Her karesi Canvas koduyla çizilen yayın karakteri. Görsel veya video üretim modeli kullanılmaz; yeni bir şey çizilecekse
`sahne.html` içinde kodla çizilir.

## Kullanıcı "bu sistemi kur" derse

1. Repo yoksa klonla: `git clone https://github.com/UgurKeskekci/kodla-yayinci && cd kodla-yayinci`.
2. Node 20+ var mı bak (`node -v`). Yoksa kullanıcıya https://nodejs.org adresini ver, kurmasını iste.
3. `npm install`, sonra `npm start` (arka planda). "sahne http://127.0.0.1:5320/" satırını bekle.
4. Menüyü tarayıcıda aç: http://127.0.0.1:5320/menu.html. Kullanıcıya hazır karakterlerden birini seçmesini,
   "Konuştur" kutusuna bir cümle yazmasını söyle.
5. Ses: tarayıcı sesi kurulumsuz çalışır. Daha iyi ücretsiz ses isterse `pip install edge-tts` öner. VoxCPM2 ve
   ElevenLabs README'de.
6. Sonunda kullanıcıya ne değiştirmek istediğini sor.

## Değişiklik yaparken

- Görünüş ayarları `sahne.html` içindeki `KARAKTER` nesnesinde; yeni bir özellik eklerken önce ayar alanını, sonra
  `menu.html`'de düğmesini ekle.
- Her görsel değişiklikten sonra sahneyi headless Chrome ile birkaç hareketin ortasında (yoğurma, su, sim, uzatma,
  selam, konuşma) yakala ve kareye gerçekten bak: kopuk kol, ışınlanan el, taşan yazı var mı.
- Saniyede kare sayısını `window.canli.durum().fps` ile ölç; 50'nin altına düşürme. Pahalı çizimi (bulanıklık,
  çok katmanlı gradyan) her karede yapma, bir kez çizip sakla.
- `kisilik.md`'deki kuralları gevşetme: karakter yapay zeka olduğunu saklamaz, hediye istemez, kişisel bilgi sormaz.

## Kendi kurallarım

Kullanıcı bir sonucu beğenip "bu iyi oldu, kaydet" derse, o sonucu iyi yapan kuralı buraya tek satır ekle (ne yapıldı,
neden işe yaradı). Kullanıcı onaylamadan kural ekleme, var olanı silme.

<!-- Örnek: - Saç tellerini 3 katmanda çiz (arka koyu, orta ana renk, ön ince parlak); hacim verdi. -->
