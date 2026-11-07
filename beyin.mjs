// Yoruma cevap: kisilik.md + son konusmalar -> tek kisa cumle.
// Arka uc, sirayla: BEYIN ortam degiskeni ya da ilk bulunan
//   ANTHROPIC_API_KEY -> Claude Haiku API (~1 sn) | claude CLI (Claude Code, oturumu acik) | agy (Gemini Flash) | yok
// "yok"ta yorumlara cevap verilmez; tesekkurler ve yorum komutlari yine calisir.
import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const KISILIK = readFileSync(new URL('./kisilik.md', import.meta.url), 'utf8');
const yolu = (ad) => spawnSync('sh', ['-c', `command -v ${ad}`], { encoding: 'utf8' }).stdout.trim() || null;
const AGY = process.env.AGY || yolu('agy') || (existsSync(`${process.env.HOME}/.local/bin/agy`) ? `${process.env.HOME}/.local/bin/agy` : null);
const CLAUDE = process.env.CLAUDE_CLI || yolu('claude') || (existsSync(`${process.env.HOME}/.local/bin/claude`) ? `${process.env.HOME}/.local/bin/claude` : null);
const AGY_MODEL = process.env.AGY_MODEL || 'gemini-3.8-flash-low';
const SECIM = process.env.BEYIN || (process.env.ANTHROPIC_API_KEY ? 'api' : CLAUDE ? 'claude' : AGY ? 'agy' : 'yok');
export const arkaUc = { api: 'claude-haiku-5-5 (API)', claude: 'claude CLI (haiku)', agy: `agy ${AGY_MODEL}`, yok: 'yok' }[SECIM] || SECIM;
export const beyinVar = SECIM !== 'yok';

function istem({ kullanici, metin, gecmis, gorev, isim = 'Piksel', yapan = 'bir yazılımcı' }) {
  const son = gecmis.slice(-6).map((g) => `${g.kim}: ${g.metin}`).join('\n') || '(yok)';
  const is = gorev === 'sessiz'
    ? 'Bir süredir yorum yok. İzleyicileri yorum yazmaya çağıran ya da slime hakkında kısa, doğal bir cümle söyle. Son söylediklerini tekrarlama.'
    : `Yeni yorum, ${kullanici}: "${metin}"\nBu yoruma cevap ver.`;
  const kisilik = KISILIK.replaceAll('{isim}', isim).replaceAll('{yapan}', yapan);
  return `${kisilik}\n\nSon konuşmalar:\n${son}\n\n${is}\nYalnız söyleyeceğin cümleyi yaz, Türkçe karakterlerle (ç, ğ, ı, ö, ş, ü). Tırnak ya da açıklama ekleme.`;
}

function cli(kmt, arg, ms = 25000) {
  return new Promise((ok, hata) => {
    const p = spawn(kmt, arg, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = ''; p.stdout.on('data', (d) => (out += d));
    const zaman = setTimeout(() => { p.kill(); hata(new Error(`${kmt} zaman asimi`)); }, ms);
    p.on('close', (kod) => { clearTimeout(zaman); kod === 0 ? ok(out) : hata(new Error(`${kmt} cikis ${kod}`)); });
  });
}
function agy(prompt, ms = 20000) {
  return new Promise((ok, hata) => {
    const p = spawn(AGY, ['--sandbox', '--disable-slash-commands', '--model', AGY_MODEL, `--print=${prompt}`], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = ''; p.stdout.on('data', (d) => (out += d));
    const zaman = setTimeout(() => { p.kill(); hata(new Error('agy zaman asimi')); }, ms);
    p.on('close', (kod) => { clearTimeout(zaman); kod === 0 ? ok(out) : hata(new Error(`agy cikis ${kod}`)); });
  });
}

async function haiku(prompt) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'claude-haiku-5-5', max_tokens: 120, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!r.ok) throw new Error(`anthropic ${r.status}`);
  const j = await r.json(); return j.content?.map((c) => c.text || '').join('') || '';
}

// Cikti suzgeci: tek satir, emoji ve uzun tire yok, yasak hitaplar ve linkler atilir, en cok 160 karakter.
const YASAK_HITAP = /\b(aşkım|askim|tatlım|tatlim|canım|canim|bebeğim|bebegim)\b/giu;
export function temizle(s) {
  let t = String(s).replace(/\r/g, '').split('\n').map((x) => x.trim()).filter(Boolean).pop() || '';
  t = t.replace(/^["'“”«»]+|["'“”«»]+$/g, '')
    .replace(/\p{Extended_Pictographic}|️/gu, '')
    .replace(/—/g, ', ').replace(/https?:\/\/\S+/g, '')
    .replace(YASAK_HITAP, '').replace(/\s+([,.!?])/g, '$1').replace(/\s{2,}/g, ' ').trim();
  if (t.length > 160) t = t.slice(0, 157).replace(/\s+\S*$/, '') + '...';
  return t;
}

export async function cevapla(girdi) {
  const prompt = istem({ gecmis: [], ...girdi });
  if (SECIM === 'yok') throw new Error('beyin yok');
  const ham = SECIM === 'api' ? await haiku(prompt)
    : SECIM === 'claude' ? await cli(CLAUDE, ['-p', '--model', 'haiku', '--tools', '', '--no-session-persistence', prompt])
    : await agy(prompt);
  return temizle(ham);
}
