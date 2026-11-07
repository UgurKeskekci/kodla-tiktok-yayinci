# Kodla Yayıncı

Türkçe · [English](README.en.md)

Slime yoğuran, yorumlara sesli cevap veren, **her karesi kodla çizilmiş** bir yayın karakteri. Görsel model yok, video
modeli yok: karakter, slime, oda, eller, hepsi tek bir HTML dosyasındaki Canvas kodu. Menüden kendi karakterinizi
yapabilir, ücretsiz seslerle konuşturabilir, isterseniz TikTok canlı yayınına bağlayabilirsiniz.

![Kodla Yayıncı](docs/tanitim.gif)

![Hazır karakterler](docs/hazir-karakterler.jpg)

![Karakter menüsü](docs/menu.jpg)

## 3 adımda başlayın

**1. Repoyu Claude Code'a verin.** Claude Code'u açın ve şunu yazın:

```
https://github.com/UgurKeskekci/kodla-tiktok-yayinci bu sistemi kur
```

Claude repoyu indirir, gerekenleri kontrol eder, sunucuyu açar ve menüyü tarayıcıda gösterir.

**2. Karakterinizi yapın.** Menüde (http://127.0.0.1:5320/menu.html) saç, ten, göz, kıyafet, slime rengi, oda ve ses
seçin. "Konuştur" kutusuna bir cümle yazın, karakter söylesin. Hareket düğmeleri: su, sim, uzat, dürt, selam, kalp.

**3. Claude'la geliştirin.** Beğenmediğiniz bir şeyi Claude Code'a anlatın: "saçına kurdele ekle", "slime'a kalp şekli
ver", "arka plana pencere çiz". Hangi saniyede, ne yanlış, ne korunacak: üçünü söylerseniz ilk denemede tutar.

## Elle kurulum

Gerekenler: [Node.js](https://nodejs.org) 20 ya da üstü, Chrome ya da Edge.

```bash
git clone https://github.com/UgurKeskekci/kodla-tiktok-yayinci
cd kodla-tiktok-yayinci
npm install
npm start
```

- Menü: http://127.0.0.1:5320/menu.html
- Sahne: http://127.0.0.1:5320/ (OBS için `?obs=1`)
- Kontrol paneli (deneme yorumu, hediye, TikTok bağlantısı): http://127.0.0.1:5320/panel.html
- Sunucusuz deneme: `sahne.html?demo=1` dosyasını tarayıcıda açın.
- Canlı yayın görünümü (yorum akışı, hediye bandı, CANLI rozeti): `http://127.0.0.1:5320/?arayuz=canli`

## Sesler

| Motor | Ücret | Kurulum | Not |
|---|---|---|---|
| Tarayıcı sesi | ücretsiz | yok | Kalite tarayıcıya bağlı; Mac'te Türkçe ses iyi. |
| [Edge TTS](https://github.com/rany2/edge-tts) | ücretsiz | `pip install edge-tts` | Emel (kadın), Ahmet (erkek); internet ister, 2-3 sn. |
| [VoxCPM2 Türkçe ses tasarımı](https://github.com/alexturkey/voxcpm2-turkce-ses-tasarimi) | ücretsiz, yerel | o reponun kurulumu | Sesi tarifle tasarlarsınız; yavaş, canlı sohbetten çok hazır cümleler için. |
| [ElevenLabs](https://elevenlabs.io) | ücretli | `ELEVENLABS_API_KEY` | En doğal ses, ~0,7 sn. |

**Karakterlerin kendi sesleri repoda:** `sesler/` altında Piksel, Gece, Defne ve Mavi'nin sesleri VoxCPM2 ile İngilizce
tariflerden tasarlandı (sesler gerçek kişilere ait değil, yapay). VoxCPM2 kuruluysa menüdeki Ses bölümünde "piksel (bu repodan)"
ve diğerleri olarak çıkar, ücretsiz ve tamamen yerel çalışır. Tanıtım videosundaki sesler de bunlar. VoxCPM2'nin bulunması için yolunu
`ayarlar.json` içine ya da `VOXCPM2_DIR` ortam değişkenine yazın (`ayarlar.ornek.json`'a bakın). Ağız hareketi sesin
şiddetinden anlık hesaplanır; tarayıcı sesinde hece ritminden.

Diğer ücretsiz Türkçe sesler: [Ahenk](https://github.com/ozguradmin/ahenk-turkish-tts) (Özgür Güler; soru tonlaması,
duygu, gülme; ağırlıklar CC BY 4.0, kullanırsanız Ahenk'i anın) ve
[EMA Lightning](https://huggingface.co/canberkkkkkk/ema-lightning) (Canberk Aslan, Apache 2.0, CPU'da çalışır).

## Yorumlara cevap (isteğe bağlı)

Yorum gelince karakter tek cümleyle cevap verir. Sırayla ilk bulunanı kullanır:

1. `ANTHROPIC_API_KEY` varsa Claude Haiku (en hızlısı, ~1 sn)
2. Claude Code kuruluysa `claude` komutu
3. Antigravity CLI kuruluysa `agy` (Gemini Flash)
4. Hiçbiri yoksa cevap vermez; teşekkürler ve yorum komutları yine çalışır.

Karakterin kişiliği ve yasakları `kisilik.md`'de: kendisinin kodla çizilmiş bir yapay zeka olduğunu saklamaz, hediye
istemez, kişisel bilgi sormaz, siyaset/din konuşmaz. Küfürlü yorumlar ve linkler atlanır.

## TikTok canlı yayın (isteğe bağlı)

Panelde yayın açıkken kullanıcı adınızı yazıp "Bağlan" deyin: yorumlar, hediyeler ve takipler karaktere gelir.
İzleyiciler yorumla yönetir: "uzat", "dürt", "su", "sim", "selam". Hediyeler: 1 elmas kalp, 5+ uzatma, 10+ su,
100+ sim. OBS ayarı ve dikkat edilecekler: [docs/yayin.md](docs/yayin.md).

- Yayında TikTok'un yapay zeka etiketini açın; sahnedeki "kodla çizildi · yapay zeka yayıncı" etiketini kaldırmayın.
- Sahte yorum, sahte hediye kullanmayın. Panelin deneme düğmeleri yalnız yayın kapalıyken içindir.
- TikTok bağlantısı resmi olmayan [tiktok-live-connector](https://github.com/zerodytrash/TikTok-Live-Connector) ile
  okunur; TikTok bir şey değiştirirse bozulabilir.

## Nasıl yapıldı

Bu karakter tek bir prompt ile çıkmadı. İş akışı adım adım: [docs/is-akisi.md](docs/is-akisi.md).

## Dosyalar

| Dosya | Ne |
|---|---|
| `sahne.html` | Karakter, slime, oda, hareketler, sesler. Tek dosya, bağımlılıksız. |
| `menu.html` | Özelleştirme menüsü. |
| `panel.html` | Deneme ve yayın kontrol paneli. |
| `sunucu.mjs` | Sahneyi, menüyü, sesleri ve TikTok'u bağlar. |
| `sesler.mjs` | Ses motorları. |
| `beyin.mjs`, `kisilik.md` | Yorumlara cevap ve karakterin kişiliği. |
| `assets/` | CC0 slime ve su sesleri, hazır karakter portreleri. |
| `sesler/` | Piksel, Gece, Defne ve Mavi'nin VoxCPM2 sesleri (yapay, tariften tasarlandı). |
| `araclar/` | `denetim.mjs`: her hareketi oynatıp ani sıçramaları yakalar. `portreler.mjs`: hazır karakter portreleri. |

## Teşekkür ve lisanslar

- Sahne, [Sarp Yıldız](https://x.com/sarpstar)'ın **[cinecode](https://github.com/sarpstar/cinecode)** kitiyle
  yapılmış bir filmden geliyor (MIT). Kodla film yapmak istiyorsanız oradan başlayın.
- Türkçe yerel ses: [VoxCPM2 Türkçe ses tasarımı](https://github.com/alexturkey/voxcpm2-turkce-ses-tasarimi) (Apache 2.0). Piksel'in sesi bununla tasarlandı.
- Sesler [Freesound](https://freesound.org)'tan CC0: Eneasz (squishes), jtap97 (slime noise), Archos (slime 13),
  Breviceps (splat), swordofkings128 (pouring water), Jofae (chime), yfjesse (notification).
- Yazı tipi: [IBM Plex](https://github.com/IBM/plex) (SIL Open Font License 1.1).
- [tiktok-live-connector](https://github.com/zerodytrash/TikTok-Live-Connector) (MIT).

Kod MIT lisanslı. Ayrıntı: [LICENSE](LICENSE), [NOTICE.md](NOTICE.md).
