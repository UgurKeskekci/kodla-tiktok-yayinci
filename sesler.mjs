// Ses motorlari. Metni ses dosyasina cevirir; hangisi kuruluysa o kullanilir.
//   tarayici   : ucretsiz, kurulum yok. Sesi sahne (tarayici) kendisi okur; sunucu dosya uretmez.
//   edge       : ucretsiz, Microsoft Edge'in sesleri (pip install edge-tts). Internet ister, ~2-3 sn.
//   voxcpm2    : ucretsiz, tamamen yerel, Turkce ses tasarimi (github.com/alexturkey/voxcpm2-turkce-ses-tasarimi).
//                Yavas (M1 Pro'da ~4x gercek zaman), canli sohbet icin degil; hazir cumleler icin.
//   elevenlabs : ucretli, en dogal ses; ELEVENLABS_API_KEY gerekir.
// Ayarlar: ortam degiskenleri ya da ayarlar.json (git'e girmez), bkz. ayarlar.ornek.json.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { writeFile, mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const KOK = new URL('.', import.meta.url).pathname;
const AYAR = (() => { try { return JSON.parse(readFileSync(join(KOK, 'ayarlar.json'), 'utf8')); } catch { return {}; } })();
const HOME = process.env.HOME || '';

function bul(adaylar) { return adaylar.filter(Boolean).find((p) => existsSync(p)) || null; }
function komutVar(ad) { return spawnSync('sh', ['-c', `command -v ${ad}`], { encoding: 'utf8' }).stdout.trim() || null; }

const EDGE = process.env.EDGE_TTS || AYAR.edgeTts || komutVar('edge-tts') || bul([join(KOK, '.venv/bin/edge-tts'), join(KOK, '../../../.venv/bin/edge-tts')]);
const VOX = process.env.VOXCPM2_DIR || AYAR.voxcpm2Dizini || bul([join(KOK, '../voxcpm2-turkce-ses-tasarimi'), `${HOME}/voxcpm2-turkce-ses-tasarimi`]);
const VOX_PY = VOX && bul([join(VOX, '.venv/bin/python'), join(VOX, '.venv/Scripts/python.exe')]);
const ELEVEN = process.env.ELEVENLABS_API_KEY || AYAR.elevenlabsAnahtari || (() => {
  const f = process.env.ELEVENLABS_KEY_FILE || AYAR.elevenlabsAnahtarDosyasi;
  try { return f ? readFileSync(f, 'utf8').match(/sk_[A-Za-z0-9]+/)?.[0] : null; } catch { return null; }
})();

function voxSesleri() {
  if (!VOX) return [];
  const tr = ['belgesel_hanim', 'cekici_spiker', 'haber_spikeri', 'gizemli_bilge', 'masal_cadisi', 'tok_anlatici', 'yasli_bilge'];
  const hazir = tr.filter((a) => existsSync(join(VOX, 'hazir_sesler', a))).map((a) => ({ id: `hazir/${a}`, ad: a.replace(/_/g, ' ') }));
  const kendi = [];
  try {
    for (const d of readdirSync(join(VOX, 'sesler'), { withFileTypes: true })) {
      if (!d.isDirectory() || d.name.startsWith('_')) continue;
      for (const c of readdirSync(join(VOX, 'sesler', d.name))) { const m = c.match(/^cesit_0*(\d+)$/); if (m) kendi.push({ id: `${d.name}/${m[1]}`, ad: `${d.name} ${m[1]}` }); }
    }
  } catch {}
  // bu reponun kendi sesleri (sesler/<ad>/cesit_NN): oku.py klasor yolunu dogrudan kabul ediyor
  const repo = [];
  try {
    for (const d of readdirSync(join(KOK, 'sesler'), { withFileTypes: true })) {
      if (!d.isDirectory()) continue;
      for (const c of readdirSync(join(KOK, 'sesler', d.name))) if (/^cesit_\d+$/.test(c)) repo.push({ id: join(KOK, 'sesler', d.name, c), ad: `${d.name} (bu repodan)` });
    }
  } catch {}
  return [...repo, ...hazir, ...kendi];
}

export function motorlar() {
  return [
    { id: 'tarayici', ad: 'Tarayıcı sesi', durum: 'hazir', not: 'Ücretsiz, kurulum yok. Kalite tarayıcıya ve işletim sistemine bağlı.', sesler: [] },
    { id: 'edge', ad: 'Edge TTS', durum: EDGE ? 'hazir' : 'kurulu-degil', not: EDGE ? 'Ücretsiz, internet ister, ~2-3 sn.' : 'Kurulum: pip install edge-tts',
      sesler: [{ id: 'tr-TR-EmelNeural', ad: 'Emel (kadın)' }, { id: 'tr-TR-AhmetNeural', ad: 'Ahmet (erkek)' }] },
    { id: 'voxcpm2', ad: 'VoxCPM2 Türkçe (yerel)', durum: VOX_PY ? 'hazir' : 'kurulu-degil',
      not: VOX_PY ? 'Ücretsiz ve yerel ama yavaş: canlı sohbet için değil.' : 'Kurulum: github.com/alexturkey/voxcpm2-turkce-ses-tasarimi', sesler: voxSesleri() },
    { id: 'elevenlabs', ad: 'ElevenLabs', durum: ELEVEN ? 'hazir' : 'kurulu-degil', not: ELEVEN ? 'Ücretli, en doğal ses, ~0,7 sn.' : 'ELEVENLABS_API_KEY gerekir.',
      sesler: [{ id: 'A2XgcJ6lQVEFeIaIUyrc', ad: 'Damla' }, ...(AYAR.elevenlabsSesleri || [])] },
  ];
}

const calistir = (kmt, arg, ops = {}) => new Promise((ok, hata) => {
  const p = spawn(kmt, arg, { stdio: ['ignore', 'ignore', 'pipe'], ...ops });
  let err = ''; p.stderr.on('data', (d) => (err += d));
  const z = setTimeout(() => { p.kill(); hata(new Error(`${kmt} zaman aşımı`)); }, ops.ms || 30000);
  p.on('close', (k) => { clearTimeout(z); k === 0 ? ok() : hata(new Error(err.trim().split('\n').pop() || `çıkış ${k}`)); });
});

// ses: { motor, kimlik, hiz, perde }. Doner: dosya yolu (mp3/wav) ya da null (tarayici okur).
export async function seslendir(metin, ses, hedefDosyaKoku) {
  const motor = ses?.motor || 'tarayici', hiz = +ses?.hiz || 1;
  if (motor === 'tarayici') return null;
  if (motor === 'edge') {
    if (!EDGE) throw new Error('edge-tts kurulu değil');
    const f = `${hedefDosyaKoku}.mp3`, oran = Math.round((hiz - 1) * 100), perde = Math.round(((+ses?.perde || 1) - 1) * 50);
    await calistir(EDGE, ['--voice', ses.kimlik || 'tr-TR-EmelNeural', `--rate=${oran >= 0 ? '+' : ''}${oran}%`, `--pitch=${perde >= 0 ? '+' : ''}${perde}Hz`, '--text', metin, '--write-media', f]);
    return f;
  }
  if (motor === 'voxcpm2') {
    if (!VOX_PY) throw new Error('VoxCPM2 kurulu değil');
    const d = await mkdtemp(join(tmpdir(), 'vox-'));
    try {
      await writeFile(join(d, 'metin.txt'), metin);
      await calistir(VOX_PY, ['-m', 'ses_tasarim.oku', '--ses', ses.kimlik || 'hazir/belgesel_hanim', '--metin', `@${join(d, 'metin.txt')}`, '--cikti', join(d, 'cikti')], { cwd: VOX, ms: 180000 });
      const f = `${hedefDosyaKoku}.wav`; await writeFile(f, await readFile(join(d, 'cikti', 'okuma.wav'))); return f;
    } finally { await rm(d, { recursive: true, force: true }); }
  }
  if (motor === 'elevenlabs') {
    if (!ELEVEN) throw new Error('ElevenLabs anahtarı yok');
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ses.kimlik || 'A2XgcJ6lQVEFeIaIUyrc'}?output_format=mp3_44100_128`, {
      method: 'POST', headers: { 'xi-api-key': ELEVEN, 'content-type': 'application/json' },
      body: JSON.stringify({ text: metin, model_id: 'eleven_turbo_v2_5', language_code: 'tr', voice_settings: { stability: 0.5, similarity_boost: 0.8, speed: Math.min(1.2, Math.max(0.7, hiz)) } }),
    });
    if (!r.ok) throw new Error(`ElevenLabs ${r.status}`);
    const f = `${hedefDosyaKoku}.mp3`; await writeFile(f, Buffer.from(await r.arrayBuffer())); return f;
  }
  throw new Error(`bilinmeyen ses motoru: ${motor}`);
}
