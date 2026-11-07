# İş akışı: bu karakter nasıl yapıldı

Tek prompt ile çıkmadı. Aşağıdaki sıra, kendi karakterinizi ya da başka bir sahneyi kodla yaparken de işe yarar.

## 1. Önce kısa bir film

Karakter önce 20 saniyelik bir TikTok videosu olarak yapıldı: canlı yayında slime yoğuran bir kız, yorumlar, hediyeler.
Altyapı [cinecode](https://github.com/sarpstar/cinecode): her kare `film.html` içinde Canvas koduyla çizilir, kare numarasından
hesaplanır, aynı kare her seferinde aynı çıkar. Video olarak kaydedip X'te paylaşıldı.

## 2. Kodu bir ajan yazar, başka bir model izler

- **Yazan:** Claude Code (planı ve kararları tutar) + Codex (GPT) ağır çizim kodunu yazar.
- **İzleyen:** Gemini videoyu sesli izler, saniye saniye kusur listesi ve 10 üzerinden puan verir. Yazan modelin kendi
  işini beğenmesine güvenilmez; izleyici her zaman başka bir model.
- Her tur: kusur listesi → somut düzeltme (oran, açı, katman sırası) → yeni render → yeniden izleme. Slime videosu bu
  döngüyle 6,5'ten 7,8'e çıktı.

Brief'in iskeleti hep aynı: ne var, ne yanlış (saniye ve ekran yeriyle), ne isteniyor, neye dokunulmayacak, nasıl
doğrulanacak (hangi kareler, hangi ölçüm).

## 3. Filmden canlı sahneye

Film kare numarasıyla çalışıyordu; canlı yayın gerçek saatle çalışmalı.

1. **Önce ölç.** Film tarayıcıda saniyede 6 kare çiziyordu. Parça parça kapatarak ölçünce suçlu çıktı: arka plandaki
   sıva her karede yeniden bulanıklaştırılıyordu (kare başına ~130 ms). Bir kez çizilip saklanınca 60 fps oldu.
   Tahmin etmeden ölçmek, bir sürü gereksiz optimizasyondan kurtardı.
2. **Zaman çizelgesi yerine yönetmen.** Filmde su 3. saniyede dökülüyordu; canlıda su, biri istediğinde dökülmeli.
   Hareketler (su, sim, uzat, dürt, selam, kalp) sıraya giren aksiyonlara çevrildi. Aradaki boşluğu sonsuz yoğurma
   doldurur; eller ışınlanmasın diye her aksiyon yumuşak girer, yumuşak çıkar.
3. **Ağız sesten.** Konuşma sesi çalarken ses şiddeti her karede ölçülür, ağız ona göre açılır. Önceden hazırlanmış
   ağız eğrisi yok.

## 4. Sesi ve cevabı seç, ölçerek

- Yoruma cevap: hız için küçük model (Claude Haiku ya da Gemini Flash), tek cümle, kişilik dosyasından kurallar.
- Ses: iki ElevenLabs modelini aynı cümleyle üretip Gemini'ye dinletildi; biri "ekleyelim"i yuttu, öteki temiz çıktı.
  Ücretsiz seçenekler aynı şekilde denenebilir.
- Gecikme uçtan uca ölçülür: yorum → cevap → ses → ağız. Parça hızlıyken bütün yavaş olabilir.

## 5. Özelleştirme

Görünüşün tamamı tek bir ayar nesnesine çekildi (ten, saç, göz, kıyafet, slime, oda, ses). Menü bu ayarı değiştirir,
sahne anında uygular. Yeni bir özellik eklemek isterseniz önce ayar alanını, sonra menüdeki düğmesini isteyin.

## Kendi karakterinizi geliştirirken

- Claude Code'a hangi hareket, ne yanlış, ne korunacak: üçünü birlikte söyleyin.
- Her değişiklikten sonra kare alıp bakın; "kod doğru görünüyor" yetmez.
- Beğendiğiniz bir sonucu `CLAUDE.md`'deki "Kendi kurallarım" bölümüne tek satır kural olarak ekletin; sonraki işler
  aynı hatayı tekrarlamaz.
