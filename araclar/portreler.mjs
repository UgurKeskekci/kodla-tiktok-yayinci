// Hazir karakter portreleri: menu.html'deki HAZIR_KARAKTERLER'i okur, her birini sahnenin kendisiyle render eder,
// assets/hazir/<id>.jpg olarak yazar (menudeki kartlar bunlari gosterir). Kullanim: node araclar/portreler.mjs
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const URL0 = process.argv[2] || 'http://127.0.0.1:5320';
const KOK = new URL('..', import.meta.url).pathname, HEDEF = join(KOK, 'assets/hazir'); mkdirSync(HEDEF, { recursive: true });
const CHROME = process.env.CHROME_PATH || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
const PORT = 9800 + Math.floor(Math.random() * 100);
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'por-'))}`, '--window-size=1080,1920', 'about:blank'], { stdio: 'ignore' });
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
let wsUrl; for (let i = 0; i < 60 && !wsUrl; i++) { try { wsUrl = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((x) => x.type === 'page')?.webSocketDebuggerUrl; } catch {} if (!wsUrl) await bekle(200); }
const ws = new WebSocket(wsUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const bek = new Map(); ws.onmessage = (m) => { const d = JSON.parse(m.data); bek.get(d.id)?.(d); bek.delete(d.id); };
const cmd = (method, params = {}) => new Promise((r) => { const i = ++id; bek.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (e) => (await cmd('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value;
await cmd('Page.enable');
await cmd('Page.navigate', { url: `${URL0}/menu.html` }); await bekle(2500);
const hazir = await ev('JSON.stringify(HAZIR_KARAKTERLER)');
for (const [ad, k] of Object.entries(JSON.parse(hazir))) {
  const b64 = Buffer.from(JSON.stringify(k)).toString('base64');
  await cmd('Page.navigate', { url: `${URL0}/sahne.html?onizleme=1&obs=1&karakter=${encodeURIComponent(b64)}` }); await bekle(3500);
  // ust govde kirpimi: 1080x1920 karenin x 140-940, y 120-1187 (3:4), 480x640'a kucultulur
  const url = await ev(`(()=>{const c=document.querySelector('canvas');const o=document.createElement('canvas');o.width=480;o.height=640;
    o.getContext('2d').drawImage(c,140,120,800,1067,0,0,480,640);return o.toDataURL('image/jpeg',.86);})()`);
  writeFileSync(join(HEDEF, `${ad}.jpg`), Buffer.from(url.split(',')[1], 'base64')); console.log(ad, 'yazildi');
}
ch.kill(); process.exit(0);
