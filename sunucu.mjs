// Canli yayin sunucusu: sahne (OBS tarayici kaynagi) + panel + TikTok okuma + cevap (beyin) + ses (ElevenLabs).
// Calistir: ~/.nvm/versions/node/v24.22.0/bin/node sunucu.mjs   ->  sahne http://127.0.0.1:5320/  panel /panel.html
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, readdir, unlink, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { randomBytes } from 'node:crypto';
import { cevapla, temizle, arkaUc, beyinVar } from './beyin.mjs';
import { motorlar, seslendir } from './sesler.mjs';

const KOK = new URL('.', import.meta.url).pathname;
const SES_DIR = join(KOK, 'ses');
const PORT = +process.env.PORT || 5320;
// karakter.json: menuden kaydedilen gorunus + ses ayari (yoksa sahnenin varsayilani). Ses: { motor, kimlik, hiz, perde }
const KARAKTER_DOSYA = join(KOK, 'karakter.json');
let karakter = (() => { try { return JSON.parse(readFileSync(KARAKTER_DOSYA, 'utf8')); } catch { return {}; } })();
const sesAyari = () => ({ motor: 'tarayici', hiz: 1, perde: 1, ...(karakter.ses || {}) });
const isim = () => karakter.yayin?.isim || karakter.isim || 'Piksel';
const yapan = () => karakter.yayin?.yapan || karakter.yapan || 'bir yazılımcı';
await mkdir(SES_DIR, { recursive: true });

// ---------------------------------------------------------------- ayarlar ve durum
const ayar = { beyin: true, komutlar: true, sessizSohbet: false, sessizSn: 45 };   // sessizSohbet: yalniz canli yayinda acilir (panel)
const sahneler = new Set(), paneller = new Set();
const gecmis = [];                       // [{kim, metin}] son konusmalar
let havuz = [];                          // cevap bekleyen yorumlar [{kullanici, metin, zaman}]
const tesekkur = [];                     // sablonla soylenecek cumleler (oncelikli)
let konusan = null, hazirlaniyor = false, sonKonusma = Date.now(), sonOlay = Date.now();
const sayac = { yorum: 0, hediye: 0, takip: 0, katil: 0, begeni: 0, konusma: 0 };
let tiktok = null, tiktokAd = null;

function yayinla(set, veri) { const s = `data: ${JSON.stringify(veri)}\n\n`; for (const r of set) r.write(s); }
function kayit(tur, metin) {
  const satir = { zaman: new Date().toTimeString().slice(0, 8), tur, metin };
  console.log(`[${satir.zaman}] ${tur}: ${metin}`);
  yayinla(paneller, { tur: 'kayit', satir });
}
const sahneye = (msg) => yayinla(sahneler, msg);

// ---------------------------------------------------------------- suzgec
const KUFUR = ['amk', 'aq', 'siktir', 'sikeyim', 'orospu', 'piç', 'pic', 'yarrak', 'yarak', 'göt', 'got', 'ibne', 'pezevenk', 'ananı', 'anani', 'amına', 'amina', 'sik', 'sürtük', 'kahpe', 'gavat'];
const norm = (s) => s.toLocaleLowerCase('tr').normalize('NFKC');
function temizMi(metin) {
  const k = norm(metin).split(/[^\p{L}\p{N}]+/u);
  if (k.some((w) => KUFUR.includes(w))) return false;
  if (/https?:\/\/|www\.|\d{3}[\s-]?\d{3}[\s-]?\d{2}/.test(metin)) return false;   // link, telefon
  return true;
}

// TTS kullanici adini okuyabilsin: "elif.03" -> "Elif", "minik_yildiz" -> "Minik yildiz"; okunmuyorsa bos
function seslenis(kim) {
  const t = String(kim).replace(/[._\-]+/g, ' ').replace(/\d+/g, ' ').replace(/[^\p{L} ]/gu, '').replace(/\s+/g, ' ').trim();
  if (!t || t.length > 16 || !/[aeıioöuüAEIİOÖUÜ]/.test(t)) return '';
  return t[0].toLocaleUpperCase('tr') + t.slice(1);
}
const adla = (kim, cumle, adsiz) => { const a = seslenis(kim); return a ? `${a}, ${cumle}` : adsiz; };

// ---------------------------------------------------------------- aksiyonlar
const KOMUT = [[/\buzat/, 'uzat'], [/\bd[uü]rt|\bbas\b|\bbast/, 'durt'], [/\bsu\b|\bsu ekle/, 'su'], [/\bsim\b|\bsim ekle|\bsimli/, 'sim'], [/\bselam|\bmerhaba/, 'selam']];
const sonAksiyon = {};
function aksiyon(ad, kimden, bekleme = 0, sebep = '') {
  const s = Date.now();
  if (bekleme && s - (sonAksiyon[ad] || 0) < bekleme) return false;
  sonAksiyon[ad] = s;
  sahneye({ tur: 'aksiyon', ad, kimden, sebep });
  kayit('aksiyon', `${ad}${kimden ? ' (' + kimden + ')' : ''}`);
  return true;
}
const hediyeAksiyonu = (elmas) => (elmas >= 100 ? 'sim' : elmas >= 10 ? 'su' : elmas >= 5 ? 'uzat' : 'kalp');

// ---------------------------------------------------------------- olaylar (TikTok ve panel ayni yoldan)
const birikim = new Map();               // ayni kisinin art arda hediyeleri tek tesekkurde
function olay(o) {
  sonOlay = Date.now();
  const kim = (o.kullanici || 'biri').slice(0, 24);
  if (o.tur === 'yorum') {
    sayac.yorum++;
    const metin = String(o.metin || '').slice(0, 200).trim();
    if (!metin) return;
    if (!temizMi(metin)) { kayit('suzuldu', `${kim}: (gizlendi)`); return; }
    kayit('yorum', `${kim}: ${metin}`);
    if (ayar.komutlar) {
      const n = norm(metin), k = KOMUT.find(([re]) => re.test(n));
      if (k && aksiyon(k[1], kim, 6000, 'yorum') && n.split(/\s+/).length <= 3) return;   // yalniz komutsa cevap bekleme
    }
    havuz.push({ kullanici: kim, metin, zaman: Date.now() });
    if (havuz.length > 30) havuz = havuz.slice(-30);
  } else if (o.tur === 'hediye') {
    sayac.hediye++;
    const elmas = Math.max(1, +o.elmas || 1), adet = Math.max(1, +o.adet || 1), ad = o.hediye || 'hediye';
    kayit('hediye', `${kim}: ${adet} x ${ad} (${elmas} elmas)`);
    sahneye({ tur: 'aksiyon', ad: hediyeAksiyonu(elmas * adet), kimden: kim, hediye: ad, adet, sebep: 'hediye' });
    const b = birikim.get(kim) || { adet: 0, ad, zaman: 0 };
    b.adet += adet; b.ad = ad; clearTimeout(b.zaman);
    b.zaman = setTimeout(() => {
      birikim.delete(kim);
      const c = b.adet > 1 ? `${b.adet} ${b.ad} için çok teşekkürler!` : `${b.ad} için teşekkürler!`;
      tesekkur.push(adla(kim, c, c[0].toLocaleUpperCase('tr') + c.slice(1)));
    }, 1500);
    birikim.set(kim, b);
  } else if (o.tur === 'takip') {
    sayac.takip++;
    kayit('takip', kim);
    aksiyon('selam', kim, 8000, 'takip');
    if (tesekkur.length < 3) tesekkur.push(adla(kim, 'takip ettiğin için teşekkürler!', 'Takip için teşekkürler!'));
  } else if (o.tur === 'katil') {
    sayac.katil++;
    if (sayac.katil % 10 === 1) kayit('katil', kim);
    if (Date.now() - sonKonusma > 30000 && Math.random() < 0.3 && tesekkur.length === 0) tesekkur.push(adla(kim, "hoş geldin! Slime'a ne yapalım, yorumlara yaz.", "Hoş geldin! Slime'a ne yapalım, yorumlara yaz."));
  } else if (o.tur === 'begeni') {
    const once = sayac.begeni; sayac.begeni += Math.max(1, +o.adet || 1);
    if (Math.floor(sayac.begeni / 300) > Math.floor(once / 300)) aksiyon('kalp', null, 5000);
  }
  yayinla(paneller, { tur: 'durum', durum: durum() });
}

// ---------------------------------------------------------------- konusma: metin -> ses -> sahne
let konusmaZamani = null;
async function soyle(metin, kaynak) {
  metin = temizle(metin); if (!metin) return;
  const id = randomBytes(4).toString('hex'), t0 = Date.now();
  const sa = sesAyari();
  let ses = null;
  try { const f = await seslendir(metin, sa, join(SES_DIR, id)); if (f) ses = `/ses/${f.split('/').pop()}`; }
  catch (e) { kayit('hata', `ses (${sa.motor}): ${e.message}`); }
  konusan = id; sayac.konusma++; sonKonusma = Date.now();
  gecmis.push({ kim: isim(), metin }); if (gecmis.length > 20) gecmis.shift();
  sahneye(ses ? { tur: 'konus', id, metin, ses } : { tur: 'konus', id, metin, tts: 'tarayici', sesAyar: sa });
  kayit('konus', `${metin}  [${kaynak}, ${ses ? sa.motor : 'tarayıcı'} ${Date.now() - t0} ms]`);
  clearTimeout(konusmaZamani);   // sahne /bitti demezse (kapali, ses calmadi) kilit kalmasin
  konusmaZamani = setTimeout(() => { if (konusan === id) { konusan = null; kayit('uyari', 'sahne bitti demedi, kilit acildi'); } }, 8000 + metin.length * 90);
}
async function zamanlayici() {
  if (konusan || hazirlaniyor) return;
  hazirlaniyor = true;
  try {
    if (tesekkur.length) { await soyle(tesekkur.shift(), 'şablon'); return; }
    const simdi = Date.now();
    havuz = havuz.filter((y) => simdi - y.zaman < 45000);
    if (havuz.length && ayar.beyin && beyinVar) {
      // soru, isim ya da en yeni: soru isareti ve "piksel" gecen yorumlar once
      const puan = (y) => (/\?|\bmisin|\bmısın|\bnasıl|\bne\b|\bkaç/.test(norm(y.metin)) ? 2 : 0) + (/piksel/.test(norm(y.metin)) ? 3 : 0) + y.zaman / 1e13;
      const y = havuz.sort((a, b) => puan(b) - puan(a))[0];
      havuz = havuz.filter((x) => x !== y);
      gecmis.push({ kim: y.kullanici, metin: y.metin });
      const t0 = Date.now();
      const cevap = await cevapla({ kullanici: seslenis(y.kullanici) || 'bir izleyici', metin: y.metin, gecmis, isim: isim(), yapan: yapan() });
      kayit('beyin', `${arkaUc}, ${Date.now() - t0} ms`);
      await soyle(cevap, `cevap: ${y.kullanici}`);
      return;
    }
    if (ayar.sessizSohbet && ayar.beyin && beyinVar && simdi - sonKonusma > ayar.sessizSn * 1000) {
      const cevap = await cevapla({ gorev: 'sessiz', gecmis, isim: isim(), yapan: yapan() });
      await soyle(cevap, 'sessizlik');
    }
  } catch (e) { kayit('hata', e.message); sonKonusma = Date.now(); }
  finally { hazirlaniyor = false; }
}
setInterval(zamanlayici, 400);

// eski ses dosyalarini temizle (10 dk'dan eski)
setInterval(async () => {
  for (const f of await readdir(SES_DIR)) { const p = join(SES_DIR, f); try { if (Date.now() - (await stat(p)).mtimeMs > 600000) await unlink(p); } catch {} }
}, 60000);

// ---------------------------------------------------------------- TikTok okuma (resmi olmayan tiktok-live-connector)
async function tiktokBagla(ad) {
  await tiktokKapat();
  const { TikTokLiveConnection, WebcastEvent, ControlEvent } = await import('tiktok-live-connector');
  const c = new TikTokLiveConnection(ad, { enableExtendedGiftInfo: true });
  const kul = (d) => d?.user?.uniqueId || d?.user?.nickname || 'biri';
  c.on(WebcastEvent.CHAT, (d) => olay({ tur: 'yorum', kullanici: kul(d), metin: d.comment }));
  c.on(WebcastEvent.GIFT, (d) => {
    const det = d.giftDetails || {};
    if (det.giftType === 1 && !d.repeatEnd) return;   // seri suruyor, bitince tek olay
    olay({ tur: 'hediye', kullanici: kul(d), hediye: det.giftName || d.extendedGiftInfo?.name || 'hediye', elmas: det.diamondCount || d.extendedGiftInfo?.diamond_count || 1, adet: d.repeatCount || 1 });
  });
  c.on(WebcastEvent.FOLLOW, (d) => olay({ tur: 'takip', kullanici: kul(d) }));
  c.on(WebcastEvent.MEMBER, (d) => olay({ tur: 'katil', kullanici: kul(d) }));
  c.on(WebcastEvent.LIKE, (d) => olay({ tur: 'begeni', kullanici: kul(d), adet: d.likeCount || 1 }));
  c.on(WebcastEvent.STREAM_END, () => { kayit('tiktok', 'yayin bitti'); tiktokKapat(); });
  c.on(ControlEvent.DISCONNECTED, () => kayit('tiktok', 'baglanti koptu'));
  c.on(ControlEvent.ERROR, (e) => kayit('hata', `tiktok: ${e?.info || e?.message || e}`));
  const st = await c.connect();
  tiktok = c; tiktokAd = ad;
  kayit('tiktok', `baglandi @${ad} (oda ${st.roomId})`);
}
async function tiktokKapat() { if (tiktok) { try { await tiktok.disconnect(); } catch {} kayit('tiktok', 'kapatildi'); } tiktok = null; tiktokAd = null; }

const durum = () => ({ ayar, sayac, havuz: havuz.length, tesekkur: tesekkur.length, konusan, hazirlaniyor, sahne: sahneler.size, tiktok: tiktokAd, beyin: arkaUc, ses: sesAyari().motor, isim: isim() });

// ---------------------------------------------------------------- HTTP
const TUR = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.md': 'text/plain; charset=utf-8' };
const govde = (q) => new Promise((ok) => { let b = ''; q.on('data', (d) => (b += d)); q.on('end', () => { try { ok(JSON.parse(b || '{}')); } catch { ok({}); } }); });
const json = (r, v, kod = 200) => r.writeHead(kod, { 'content-type': 'application/json' }).end(JSON.stringify(v));
function akis(q, r, set, ilk) {
  r.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
  r.write(': merhaba\n\n'); if (ilk) r.write(`data: ${JSON.stringify(ilk)}\n\n`);
  set.add(r); const nabiz = setInterval(() => r.write(': n\n\n'), 15000);
  q.on('close', () => { set.delete(r); clearInterval(nabiz); });
}

createServer(async (q, r) => {
  const u = new URL(q.url, 'http://x'), yol = decodeURIComponent(u.pathname);
  try {
    if (yol === '/olaylar') { akis(q, r, sahneler); kayit('sahne', `baglandi (${sahneler.size})`); q.on('close', () => kayit('sahne', `ayrildi (${sahneler.size})`)); return; }
    if (yol === '/panel-akis') return akis(q, r, paneller, { tur: 'durum', durum: durum() });
    if (q.method === 'POST') {
      const b = await govde(q);
      if (yol === '/bitti') { if (b.id && b.id === konusan) { konusan = null; clearTimeout(konusmaZamani); } return json(r, { ok: true }); }
      if (yol === '/test') { olay(b); return json(r, { ok: true }); }
      if (yol === '/karakter') {
        const ayar = b.ayar && typeof b.ayar === 'object' ? b.ayar : b;
        if (JSON.stringify(ayar).length > 20000) return json(r, { hata: 'çok büyük' }, 413);
        karakter = ayar; await writeFile(KARAKTER_DOSYA, JSON.stringify(karakter, null, 2));
        sahneye({ tur: 'karakter', ayar: karakter }); kayit('karakter', `kaydedildi (${isim()}, ses ${sesAyari().motor})`);
        return json(r, { ok: true });
      }
      if (yol === '/aksiyon') { aksiyon(b.ad, b.kimden || null); return json(r, { ok: true }); }
      if (yol === '/soyle') { tesekkur.unshift(String(b.metin || '')); return json(r, { ok: true }); }
      if (yol === '/ayar') { for (const k of Object.keys(ayar)) if (k in b) ayar[k] = typeof ayar[k] === 'number' ? +b[k] : !!b[k]; yayinla(paneller, { tur: 'durum', durum: durum() }); return json(r, ayar); }
      if (yol === '/tiktok') {
        if (b.kapat) { await tiktokKapat(); return json(r, { ok: true }); }
        try { await tiktokBagla(String(b.kullanici || '').replace(/^@/, '')); return json(r, { ok: true }); }
        catch (e) { kayit('hata', `tiktok baglanamadi: ${e.message}`); return json(r, { ok: false, hata: e.message }, 500); }
      }
      return json(r, { hata: 'yok' }, 404);
    }
    if (yol === '/durum') return json(r, durum());
    if (yol === '/sesler') return json(r, { motorlar: motorlar(), secili: sesAyari() });
    if (yol === '/karakter.json') return json(r, karakter);
    let dosya = yol === '/' ? '/sahne.html' : yol;
    dosya = normalize(join(KOK, dosya));
    if (!dosya.startsWith(KOK) || dosya.includes('node_modules') || dosya.endsWith('.mjs') && !dosya.includes('/assets/')) { r.writeHead(403).end(); return; }
    const veri = await readFile(dosya);
    r.writeHead(200, { 'content-type': TUR[extname(dosya)] || 'application/octet-stream', 'cache-control': 'no-store' }).end(veri);
  } catch { if (!r.headersSent) r.writeHead(404).end('yok'); }
}).listen(PORT, '127.0.0.1', () => console.log(`sahne http://127.0.0.1:${PORT}/  menü /menu.html  panel /panel.html  beyin: ${arkaUc}  ses: ${sesAyari().motor}`));
