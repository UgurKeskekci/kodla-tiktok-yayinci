# TikTok canlı yayın ve OBS

TikTok canlı yayınında slime yoğuran, yorumlara sesli cevap veren karakter. Görüntü tamamen Canvas kodu, ses ElevenLabs,
cevaplar Claude ya da Gemini (bkz. README). Görsel ya da video modeli yok.

## Parçalar

| Dosya | Ne yapar |
|---|---|
| `sahne.html` | Karakter, slime ve hareketler. Gerçek zamanlı çizer, OBS'te tarayıcı kaynağı olarak açılır. |
| `sunucu.mjs` | Her şeyi bağlar: TikTok olayları, sıra, cevap, ses dosyası, sahneye olay akışı. |
| `beyin.mjs` + `kisilik.md` | Yoruma tek cümle cevap. Kişilik ve yasaklar `kisilik.md`'de, oradan değiştirilir. |
| `panel.html` | Kontrol paneli: deneme yorumu, hediye, hareket, söylet, ayarlar, kayıt. |

## Çalıştırma

```bash
npm start
```

- Sahne: http://127.0.0.1:5320/ (normal tarayıcıda "Başlat"a basın; ses için bir dokunuş gerekir)
- Panel: http://127.0.0.1:5320/panel.html
- Sunucusuz deneme: http://127.0.0.1:5320/?demo=1

## OBS ayarı (Mac)

1. Ayarlar > Video: temel ve çıkış çözünürlüğü **1080x1920**, 30 fps.
2. Kaynak ekle > Tarayıcı: URL `http://127.0.0.1:5320/?obs=1`, genişlik 1080, yükseklik 1920,
   "Sesi OBS üzerinden kontrol et" işaretli. Sahne açılınca panelde "açık sahne: 1" görünür.
3. Ayarlar > Yayın: Hizmet "Özel", sunucu ve yayın anahtarı TikTok'tan (TikTok LIVE Center > Producer). Anahtar her
   yayında değişebilir. Anahtar alınamıyorsa: Windows PC'de TikTok LIVE Studio, aynı sahne tarayıcı kaynağı olarak.
4. Yayını açtıktan sonra panelde TikTok kullanıcı adını yazıp "Bağlan". Yorumlar, hediyeler, takipler gelmeye başlar.

## Hareketler

| Olay | Ne yapar |
|---|---|
| Yorum | Sıraya girer; soru ve "Piksel" geçen yorumlar önce. Gemini cevaplar, Damla sesiyle söyler. |
| Yorumda "uzat", "dürt"/"bas", "su", "sim", "selam" | O hareketi yapar (her biri 6 sn'de en fazla bir kez). |
| Hediye | 1 elmas kalp, 5+ uzatma, 10+ su, 100+ sim; aynı kişinin art arda hediyeleri tek teşekkür. |
| Takip | El sallar, teşekkür eder. |
| 45 sn sessizlik | Kendisi bir cümle söyler (panelden kapatılabilir). |

## Kurallar

- Yayında TikTok'un yapay zeka etiketi açık olmalı. Başlık: "kodla çizilmiş yapay zeka yayıncı" gibi açık bir ifade.
- Sahte yorum ya da sahte hediye yok; deneme düğmeleri yalnız yayın kapalıyken.
- `tiktok-live-connector` resmi değil; TikTok bir şey değiştirirse bozulabilir. Bozulursa yayın sürer, yalnız cevaplar durur.
- ElevenLabs her cümlede karakter harcar; uzun yayında kotaya bakın.
