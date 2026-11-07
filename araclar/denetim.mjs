// Sahne denetimi: her hareketi canli oynatir, ardisik kareleri karsilastirir, ani sicramalari (isinlanan el, kopan kol)
// yakalar. Cikti: denetim/rapor.json + sicrama kareleri (once/sonra). Kullanim:
//   node araclar/denetim.mjs [http://127.0.0.1:5320] [karakter.json yolu]
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL0 = process.argv[2] || 'http://127.0.0.1:5320';
const KAR = process.argv[3] ? readFileSync(process.argv[3], 'utf8') : null;
const CIKTI = join(new URL('..', import.meta.url).pathname, 'denetim'); mkdirSync(CIKTI, { recursive: true });
const CHROME = process.env.CHROME_PATH || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
const PORT = 9400 + Math.floor(Math.random() * 400);
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'den-'))}`, '--window-size=1080,1920',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
let wsUrl; for (let i = 0; i < 60 && !wsUrl; i++) { try { const l = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); wsUrl = l.find((x) => x.type === 'page')?.webSocketDebuggerUrl; } catch {} if (!wsUrl) await bekle(200); }
const ws = new WebSocket(wsUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const bek = new Map(); ws.onmessage = (m) => { const d = JSON.parse(m.data); bek.get(d.id)?.(d); bek.delete(d.id); };
const cmd = (method, params = {}) => new Promise((r) => { const i = ++id; bek.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await cmd('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'hata'); return r.result?.result?.value; };
const hatalar = []; await cmd('Runtime.enable'); await cmd('Page.enable');
ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); if (d.method === 'Runtime.exceptionThrown') hatalar.push(d.params.exceptionDetails?.exception?.description?.slice(0, 300)); if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') hatalar.push(d.params.args?.map((a) => a.value).join(' ').slice(0, 300)); });
const q = KAR ? `?obs=1&demo=0&karakter=${Buffer.from(KAR).toString('base64')}` : '?obs=1';
await cmd('Page.navigate', { url: `${URL0}/sahne.html${q}` }); await bekle(3000);

// sayfaya olcer: her rAF'te 108x192 kucuk kopya, onceki kareyle ortalama mutlak fark; en buyuk farkin oldugu kare cifti saklanir
await ev(`(()=>{const c=document.querySelector('canvas');const W=c.width,H=c.height;
const yeni=()=>{const x=document.createElement('canvas');x.width=W/2;x.height=H/2;return x;};
const onceki=yeni(),simdi=yeni(),enbOnce=yeni(),enbSonra=yeni();
const k=document.createElement('canvas');k.width=108;k.height=192;const g=k.getContext('2d',{willReadFrequently:true});
window.__den={kayit:false,farklar:[],onceki:null,enb:{f:0},cikar:()=>[enbOnce.toDataURL('image/jpeg',.7),enbSonra.toDataURL('image/jpeg',.7)]};
function dongu(){const d=window.__den;if(d.kayit){g.drawImage(c,0,0,108,192);const a=g.getImageData(0,0,108,192).data;
 simdi.getContext('2d').drawImage(c,0,0,W/2,H/2);
 if(d.onceki){let s=0;for(let i=0;i<a.length;i+=4)s+=Math.abs(a[i]-d.onceki[i])+Math.abs(a[i+1]-d.onceki[i+1])+Math.abs(a[i+2]-d.onceki[i+2]);s/=a.length*0.75;d.farklar.push(+s.toFixed(2));
  if(s>d.enb.f){d.enb={f:s,i:d.farklar.length};enbOnce.getContext('2d').drawImage(onceki,0,0);enbSonra.getContext('2d').drawImage(simdi,0,0);}}
 d.onceki=a;onceki.getContext('2d').drawImage(simdi,0,0);}requestAnimationFrame(dongu);}requestAnimationFrame(dongu);return true;})()`);

const HAREKET = ['su', 'sim', 'uzat', 'durt', 'selam', 'kalp'];
const rapor = { url: URL0, hareketler: {}, hatalar };
async function olc(ad, tetik, sure) {
  await ev(`(()=>{const d=window.__den;d.farklar=[];d.onceki=null;d.enb={f:0};d.kayit=true;return true})()`);
  await ev(tetik); await bekle(sure);
  const r = await ev(`(()=>{const d=window.__den;d.kayit=false;const f=d.farklar.slice().sort((a,b)=>a-b);const med=f[f.length>>1]||0;
    const [o,s]=d.cikar();return {kare:d.farklar.length,medyan:med,p95:f[Math.floor(f.length*.95)]||0,enb:+d.enb.f.toFixed(2),enbKare:d.enb.i,once:o,sonra:s,fps:window.canli?.durum?.().fps}})()`);
  for (const k of ['once', 'sonra']) if (r[k]) writeFileSync(join(CIKTI, `${ad}-${k}.jpg`), Buffer.from(r[k].split(',')[1], 'base64'));
  delete r.once; delete r.sonra;
  r.oran = r.medyan ? +(r.enb / r.medyan).toFixed(1) : null;
  rapor.hareketler[ad] = r; console.log(ad.padEnd(8), JSON.stringify(r));
}
await olc('yogurma', 'true', 4000);
for (const h of HAREKET) { await olc(h, `window.canli.olay({tur:'aksiyon',ad:'${h}',kimden:'denetim',sebep:'hediye',hediye:'Deneme'})`, 6500); }
await olc('konus', `window.canli.olay({tur:'konus',id:'den1',metin:'Selam! Bu uzun bir deneme cümlesi, balon metnin tamamını gösteriyor mu, bakalım sonuna kadar okunuyor mu?'})`, 9000);
await olc('arka-arkaya', `['su','sim','uzat','durt','selam','kalp','su'].forEach(a=>window.canli.olay({tur:'aksiyon',ad:a}))`, 20000);
writeFileSync(join(CIKTI, 'rapor.json'), JSON.stringify(rapor, null, 2));
console.log('hatalar:', hatalar.length ? hatalar : 'yok');
ch.kill(); process.exit(0);
