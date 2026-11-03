// node board.mjs <out.png> <newAtlas.json> <newSheet.webp> [items JSON: [[key, frame (-1 = last, 0<f<1 = fraction), 'old'|'new', label], ...]]  (TB-212: Mixamo clips on the Riltariki rig)
// Round 4 (director: a grass tuft sat over the corpse): each sprite slides along its row to the nearest spot whose box holds no tuft, flower or rock.
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import { tmpdir } from 'node:os'; import { join } from 'node:path';
const [out, na, ns, its] = process.argv.slice(2);
const ITEMS = its ? JSON.parse(its) : [['orc.grunt', 0, 'old', 'Current: walk'], ['orc.grunt.attack', 44 / 69, 'old', 'Current: attack (strike)'], ['orc.grunt', 0, 'new', 'Riltariki: walk'], ['orc.grunt.attack', 38, 'new', 'Riltariki: attack (strike)'], ['orc.grunt.death', -1, 'new', 'Riltariki: death end (Mixamo Dying)']];
const atl = JSON.parse(fs.readFileSync(na, 'utf8')).anims; const pick = {}; for (const k of ['orc.grunt', 'orc.grunt.attack', 'orc.grunt.death']) pick[k] = atl[k];
const sheet = 'data:image/webp;base64,' + fs.readFileSync(ns).toString('base64');
const ud = fs.mkdtempSync(join(tmpdir(), 'cdp'));
const ch = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--use-angle=swiftshader', '--remote-debugging-port=9644', '--window-size=1920,1080', '--hide-scrollbars', '--force-device-scale-factor=1', `--user-data-dir=${ud}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let tabs; for (let i = 0; i < 60; i++) { try { tabs = await (await fetch('http://127.0.0.1:9644/json')).json(); break; } catch { await sleep(250); } }
const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => ws.onopen = r);
let id = 0; const pend = {}; ws.onmessage = (m) => { const d = JSON.parse(m.data); if (pend[d.id]) { pend[d.id](d); delete pend[d.id]; } };
const cmd = (method, params = {}) => new Promise((r) => { pend[++id] = r; ws.send(JSON.stringify({ id, method, params })); });
const ev = async (e) => { const r = await cmd('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); return r.result?.result?.value ?? JSON.stringify(r.result); };
await cmd('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
await cmd('Page.navigate', { url: 'http://localhost:5644/' }); await sleep(7000);
console.log(await ev(`(async()=>{const T=window.__tide,f=T.field,sp=f.sprites;
const img=new Image();img.src=${JSON.stringify(sheet)};await img.decode();const A=${JSON.stringify(pick)};
const old=sp.atlas.anims;
const items=${JSON.stringify(ITEMS)};const L=f.ground.layout,busy=[...L.tufts.map(t=>[t.x-5,t.y-Math.max(...t.blades.map(b=>b.h))-1,t.x+5,t.y+1]),...L.flowers.map(q=>[q.x-q.r*1.5,q.y-q.stem-q.r,q.x+q.r*1.5,q.y+1]),...L.rocks.map(q=>[q.x-q.r*1.2,q.y-q.r,q.x+q.r*1.2,q.y+q.r])];
T.game.state.orcs.forEach(o=>o.dead=true);
const od=f.draw.bind(f);f.draw=(s,dt,aim)=>{s.orcs.forEach(o=>o.dead=true);od(s,dt,null);const g=f.g,b=f.base;g.setTransform(b.sx,0,0,b.sy,b.ex,b.ey);
 const r=12,y0=300;window.__pos=[];items.forEach(([k,t,w,l],i)=>{const many=items.length>5;let x=(many?420:560)+i*(many?60:70),y=y0;
  const a=w==='old'?old[k]:A[k];const n=a.frames.length,[fx,fy,fw,fh]=a.frames[t<0?n-1:t>0&&t<1?Math.floor(t*n):Math.min(n-1,t)];const h=a.hPerR*r,ww=h*fw/fh;
  if(!window.__dx)window.__dx={};let dx=window.__dx[i];if(dx===undefined){dx=0;for(let d=0;d<=(many?24:40);d++){const c=[d,-d].find(e=>{const x0=x+e-ww*a.ax,x1=x0+ww,y1=y+r*1.3,y0b=y+r*0.9-h*a.ay;return !busy.some(([u0,v0,u1,v1])=>u1>x0&&u0<x1&&v1>y0b&&v0<y1);});if(c!==undefined){dx=c;break;}}window.__dx[i]=dx;}
  x+=dx;
  // shadow under the body's footprint (the lying death body is wider than a standing orc), drawn before the sprite like field.ts
  const sx=k.endsWith('.death')?Math.max(r*0.9,ww*0.42):r*0.9,cx=k.endsWith('.death')?x-ww*a.ax+ww*0.5:x;g.fillStyle='rgba(20,20,10,0.35)';g.beginPath();g.ellipse(cx,y+r*0.9,sx,r*0.35,0,0,6.28);g.fill();
  g.drawImage(w==='old'?sp.imgs.get(a.image):img,fx,fy,fw,fh,x-ww*a.ax,y+r*0.9-h*a.ay,ww,h);window.__pos.push([b.sx*x+b.ex,b.sy*y+b.ey,l]);});};
await new Promise(r=>setTimeout(r,800));return JSON.stringify({sx:f.base.sx,pos:window.__pos});})()`));
const s = await cmd('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(out, Buffer.from(s.result.data, 'base64'));
ch.kill(); process.exit(0);
