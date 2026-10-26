// The forge. Recent consistency sets the fire's heat; lifetime heat fills the crucible and forges relics.
// Every active streak is a wisp circling the flame. Decorative only: never writes goal records.
import {TIERS} from './core.js?v=15';
import {art} from './art.js?v=15';
import {ART_FILES} from './art-files.js?v=15';
const relicArt=r=>ART_FILES.relics.includes(r.id)?`<img class="art-img" src="./assets/relics/${r.id}.webp" alt="">`:art(r.icon);
import {RARITIES} from './game.js?v=15';
import {sfx} from './sound.js?v=15';

const SEEN_KEY='blastforge-relics-seen-v1';
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const mix=(a,b,k)=>a.map((v,i)=>Math.round(v+(b[i]-v)*k));
const rgba=(c,a)=>`rgba(${c[0]},${c[1]},${c[2]},${a})`;

// Arcane fire: it climbs through the Arcane Designer palette as it heats.
const STOPS=[
 {t:0,  edge:'#5c1424',body:'#c8432f',core:'#ff9f5a',rune:'#ff7a4d',glow:'#a8321f'},
 {t:.2, edge:'#9e2235',body:'#f06a34',core:'#ffcf86',rune:'#ffad5e',glow:'#d9542a'},
 {t:.45,edge:'#b8235f',body:'#ff6b93',core:'#ffe2a6',rune:'#ff6b93',glow:'#e0457a'},
 {t:.75,edge:'#d7307a',body:'#ff9fb8',core:'#fff7ea',rune:'#08d8a0',glow:'#ff6b93'},
 {t:1,  edge:'#3d2bb8',body:'#08d8a0',core:'#eafff8',rune:'#b89bff',glow:'#238dbb'}
].map(s=>({t:s.t,edge:hex(s.edge),body:hex(s.body),core:hex(s.core),rune:hex(s.rune),glow:hex(s.glow)}));
function paletteAt(temp){const t=Math.max(0,Math.min(1,temp));const i=STOPS.findIndex(s=>s.t>t);if(i<0)return STOPS.at(-1);if(i===0)return STOPS[0];const a=STOPS[i-1],b=STOPS[i],k=(t-a.t)/(b.t-a.t);const out={};for(const key of ['edge','body','core','rune','glow'])out[key]=mix(a[key],b[key],k);return out;}
const CATEGORY_COLOR={Movement:'#ffb45e',Health:'#7fe3a8',Learning:'#6fc3ff',Creative:'#ff7fa8',Hobbies:'#c39bff',Personal:'#ffd77a'};

// Rune glyphs on a 10x10 grid, as polylines.
const GLYPHS=[[[5,0,5,10],[5,2,9,5]],[[2,0,2,10],[2,1,8,4,2,7]],[[5,0,5,10],[1,3,9,7],[9,3,1,7]],[[2,10,5,0,8,10],[3.5,6,6.5,6]],[[2,0,2,10],[8,0,2,5,8,10]],[[5,0,5,10],[2,3,5,0,8,3]],[[2,0,8,10],[8,0,2,10]],[[2,10,2,0,8,10,8,0]],[[5,0,9,5,5,10,1,5,5,0]],[[2,10,2,0,8,3,2,6,8,10]],[[5,0,5,10],[2,2,8,8]],[[1,3,5,0,9,3],[1,7,5,10,9,7],[5,0,5,10]]];
function glyph(ctx,g,x,y,s){ctx.beginPath();for(const line of GLYPHS[g%GLYPHS.length]){for(let i=0;i<line.length;i+=2){const px=x+(line[i]-5)/10*s,py=y+(line[i+1]-5)/10*s;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}}ctx.stroke();}

const RELIC_ICONS=['M4 16l3-7h10l3 7H4Zm3-7 2-3h6l2 3M9 12h6','M5 6h14v12H5V6Zm4 3h6v6H9V9Zm3-6v6','M12 2l2 4v9h-4V6l2-4ZM7.5 15h9M12 15v7','M7 21v-8l-2-3V6h3v4h1V4h3v6h1V5h3v6h1V8h2v6l-3 7H7Z','M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6l7-3Zm0 4-3 3 3 3 3-3-3-3Z','M5 14a7 7 0 0 1 14 0v6h-4v-4H9v4H5v-6Zm7-9v4M9 12h6','M18 3l3 3-11 11-3-3L18 3ZM7 14l-3 3 3 3 3-3M4 20l-1 1','M3 12c3 0 4-3 9-3s6 3 9 3c0 4-4 6-9 6s-9-2-9-6Zm9-3V5m-3 7h6'];
const FLAME='M13 2c1 6-5 5-3 10 2-1 3-3 3-3 5 4 6 7 3 11-3 3-10 2-11-3-1-4 3-7 3-7-1 5 3 6 2 2-2-4 4-6 3-10Z';
const relicSvg=i=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${RELIC_ICONS[i%RELIC_ICONS.length]}"/></svg>`;
const flameSvg=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${FLAME}"/></svg>`;

function seenRelics(){try{const n=Number(localStorage.getItem(SEEN_KEY));return Number.isFinite(n)?n:0;}catch{return 0;}}
function markSeen(n){try{localStorage.setItem(SEEN_KEY,String(n));}catch{}}

// Relics forged so far, in order, from the game layer: {name, rarity, icon}.
let owned=[];
const relicName=i=>owned[i]?.name||'next relic';
const coinOf=(i,cls)=>{const r=owned[i];return r?`<span class="coin ${cls}" style="--r:${RARITIES[r.rarity].color}" title="${esc(r.name)} · ${RARITIES[r.rarity].label}">${relicArt(r)}</span>`:`<span class="coin ${cls}" title="The next relic">${relicSvg(i)}</span>`;};
function template(s){
 const pct=Math.round(s.temp*100),next=s.relics;
 const chips=s.streaks.filter(x=>x.current>0||x.best>0).slice(0,8).map(x=>{const size=.6+Math.min(x.current,14)/14*.6,col=CATEGORY_COLOR[x.category]||CATEGORY_COLOR.Personal;return `<li class="${x.current?'is-lit':''}" style="--c:${col};--s:${size.toFixed(2)}"><span class="chip-flame">${flameSvg}</span><span class="chip-text"><b>${x.current}</b><small>${x.unit}${x.current===1?'':'s'}</small>${x.rest&&x.rest.left?`<span class="chip-rest" title="${x.rest.left} ${esc(x.rest.label.toLowerCase())}${x.rest.left===1?'':'s'} left this week">${'☾'.repeat(x.rest.left)}</span>`:''}</span><span class="chip-name">${esc(x.title)}</span><span class="chip-mult" title="Heat for the next check-off">×${x.next}</span></li>`;}).join('');
 const coins=Array.from({length:next+1},(_,i)=>coinOf(i,i<next?'is-forged':'is-next')).join('');
 return `<div class="forge-shell">
  <button class="forge-close" type="button" aria-label="Close the forge">×</button>
  <div class="forge-stage">
   <canvas aria-label="The forge fire at ${esc(s.tier.name)}. Press and hold to stoke it." role="img"></canvas>
   <header class="forge-head"><span class="forge-eyebrow">The forge</span><h2 class="forge-tier">${esc(s.tier.name)}</h2><p class="forge-temp"><b data-count="${pct}">0</b>% heat</p></header>
   <span class="forge-hint">Hold to stoke</span>
  </div>
  <section class="crucible" aria-label="Crucible"><div class="crucible-bar"><span style="--p:${s.progress.toFixed(3)}"></span></div><span class="crucible-relic" title="The next relic">${relicSvg(next)}</span></section>
  <p class="crucible-note"><b>${s.toNext}</b> heat to forge your next relic</p>
  ${chips?`<ul class="streak-chips" aria-label="Streaks">${chips}</ul>`:'<p class="streak-empty">Check something off to light your first streak.</p>'}
  <div class="relic-row" aria-label="Relics forged: ${next}">${coins}</div>
  <details class="forge-how"><summary>How the forge works</summary><p>Every check-off adds heat. Days in a row add more: four times as much at a week, ten times at a hundred days. Each lit streak circles the flame. Rest and cheat days keep a streak alive. Heat from the last seven days sets the fire’s tier, so it cools if you stop. All heat you earn fills the crucible, and a full crucible forges a relic. Long streaks make rare relics likelier. Find them all in the Vault.</p></details>
 </div>`;
}

export function openForge(stats,relics=[]){
 const dlg=document.getElementById('forge-dialog');if(!dlg||dlg.open)return;owned=relics;sfx('flame');
 dlg.innerHTML=template(stats);
 const shell=dlg.querySelector('.forge-shell'),pal=paletteAt(stats.temp);
 shell.style.setProperty('--fire',rgba(pal.body,1));shell.style.setProperty('--fire-core',rgba(pal.core,1));shell.style.setProperty('--fire-edge',rgba(pal.edge,1));shell.style.setProperty('--rune',rgba(pal.rune,1));shell.style.setProperty('--glow',rgba(pal.glow,1));
 shell.dataset.tier=stats.tier.name;
 dlg.showModal();
 // Burst out of the anvil.
 const logo=document.querySelector('.brand-mark')?.getBoundingClientRect(),box=shell.getBoundingClientRect();
 if(logo&&!reduced()){shell.style.transformOrigin=`${logo.left+logo.width/2-box.left}px ${logo.top+logo.height/2-box.top}px`;shell.classList.add('opening');setTimeout(()=>shell.classList.remove('opening'),700);}
 const fire=startFire(dlg.querySelector('canvas'),stats);
 const counter=dlg.querySelector('[data-count]'),goal=Number(counter.dataset.count),t0=performance.now();
 if(reduced())counter.textContent=goal;else (function count(now){const k=Math.min(1,(now-t0-350)/1300);if(k>0){const e=1-(1-k)**3;counter.textContent=Math.round(goal*e);}if(k<1&&dlg.open)requestAnimationFrame(count);})(t0);
 requestAnimationFrame(()=>requestAnimationFrame(()=>shell.classList.add('is-lit')));
 const seen=seenRelics();let timer=0;
 if(stats.relics>seen)timer=setTimeout(()=>reveal(dlg,shell,fire,stats,seen),reduced()?200:2100);
 const close=()=>{if(shell.classList.contains('closing'))return;if(reduced()){dlg.close();return;}shell.classList.add('closing');setTimeout(()=>dlg.close(),260);};
 dlg.querySelector('.forge-close').onclick=close;
 dlg.onclick=e=>{if(e.target===dlg)close();};
 dlg.oncancel=e=>{e.preventDefault();close();};
 dlg.addEventListener('close',()=>{clearTimeout(timer);fire.stop();},{once:true});
}

function reveal(dlg,shell,fire,stats,seen){
 if(!dlg.open)return;
 const i=stats.relics-1,extra=stats.relics-seen-1,r=owned[i],rar=r?RARITIES[r.rarity]:null;
 fire.forgeRelic();sfx('relic');shell.classList.remove('strike');void shell.offsetWidth;shell.classList.add('strike');
 setTimeout(()=>{if(!dlg.open)return;
  const card=document.createElement('div');card.className='relic-reveal';card.setAttribute('role','alert');
  card.innerHTML=`<div class="relic-card ${r?'rar-'+r.rarity:''}" ${rar?`style="--r:${rar.color}"`:''}><span class="relic-rays"></span>${r?relicArt(r):relicSvg(i)}<small>${rar?`${rar.label} relic forged`:'Forged'}</small><strong>${esc(relicName(i))}</strong>${extra>0?`<em>and ${extra} more</em>`:''}<button type="button" class="relic-ok">Claim it</button></div>`;
  shell.append(card);markSeen(stats.relics);
  const done=()=>{card.classList.add('is-leaving');setTimeout(()=>card.remove(),350);};
  card.querySelector('.relic-ok').onclick=done;card.onclick=e=>{if(e.target===card)done();};
  card.querySelector('.relic-ok').focus({preventScroll:true});
 },reduced()?0:900);
}

function startFire(canvas,stats){
 const ctx=canvas.getContext('2d'),target=Math.max(.08,Math.min(1.25,stats.temp)),pal=paletteAt(stats.temp),tierIndex=TIERS.findIndex(t=>t.name===stats.tier.name);
 let w=0,h=0,raf=0,last=performance.now(),boost=0,charge=0,charging=false,spin=0,flash=0,nextFlare=last+2600,relicTime=-1;const start=last;
 const licks=[],runes=[],sparks=[],rings=[];
 const wisps=stats.streaks.filter(s=>s.current>0).slice(0,8).map((s,i,a)=>({color:hex(CATEGORY_COLOR[s.category]||CATEGORY_COLOR.Personal),size:2.2+Math.min(s.current,14)*.28,speed:(.55+Math.min(s.current,14)*.05)*(i%2?-1:1),phase:i/a.length*Math.PI*2,lane:i%3,trail:[]}));
 let dpr=1;
 // Layout size, not on-screen size: the dialog scales in from the logo and must not shrink the canvas.
 function size(){dpr=Math.min(2,devicePixelRatio||1);w=Math.max(1,canvas.offsetWidth);h=Math.max(1,canvas.offsetHeight);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}
 size();const ro=new ResizeObserver(size);ro.observe(canvas);
 const geo=()=>({cx:w/2,base:h*.8,R:Math.min(w*.44,h*.5),flat:.3});
 // The flame grows tall up to full heat, then mostly wider, so it never covers the title.
 const flameH=l=>h*(.16+.3*Math.min(l,1)+.05*Math.max(0,l-1)),flameW=l=>w*Math.min(.36,.13+.13*l);

 // One flame tongue: a wavering teardrop rising from the base.
 function tongue(cx,base,width,height,time,seed,lean){
  const N=16;ctx.beginPath();
  for(let side=-1;side<=1;side+=2){for(let j=0;j<=N;j++){const i=side<0?j:N-j,t=i/N,y=base-height*t;
   const wob=(Math.sin(t*4.6-time*5+seed)*.22+Math.sin(t*8.3-time*7.1+seed*1.7)*.04)*width*t,half=width*.5*Math.pow(1-t,.62)*(1+.12*Math.sin(t*Math.PI));
   const x=cx+lean*height*t*t+wob+side*half;(side<0&&j===0)?ctx.moveTo(x,y):ctx.lineTo(x,y);}}
  ctx.closePath();ctx.fill();
 }
 function flameLayer(cx,base,W,H,time,color,tipColor,set){
  const g=ctx.createLinearGradient(0,base,0,base-H);g.addColorStop(0,rgba(color,1));g.addColorStop(.55,rgba(color,1));g.addColorStop(1,rgba(tipColor,1));ctx.fillStyle=g;
  for(const [dx,hw,hh,lean,seed]of set){const f=.88+.12*Math.sin(time*6.3+seed*3)+.05*Math.sin(time*11+seed);tongue(cx+dx*W,base,W*hw,H*hh*f,time,seed,lean);}
  ctx.beginPath();ctx.ellipse(cx,base,W*.5,W*.16,0,0,Math.PI*2);ctx.fill();
 }
 const TONGUES=[[0,1,1,0,.3],[-.24,.62,.72,-.16,1.9],[.25,.6,.66,.15,3.7],[-.1,.45,.86,-.06,5.1],[.12,.4,.8,.08,2.6]];
 function drawRing(cx,base,R,flat,time,appear){
  ctx.save();ctx.translate(cx,base+6);ctx.scale(1,flat);ctx.rotate(spin);ctx.globalAlpha=appear;
  const runeCol=pal.rune;ctx.lineCap='round';ctx.lineJoin='round';
  // Soft floor glow
  const fg=ctx.createRadialGradient(0,0,0,0,0,R*1.15);fg.addColorStop(0,rgba(pal.glow,.45));fg.addColorStop(.6,rgba(pal.glow,.12));fg.addColorStop(1,rgba(pal.glow,0));ctx.fillStyle=fg;ctx.beginPath();ctx.arc(0,0,R*1.15,0,6.283);ctx.fill();
  ctx.strokeStyle=rgba(runeCol,.8);ctx.lineWidth=2.2/flat*.5;ctx.beginPath();ctx.arc(0,0,R,0,6.283);ctx.stroke();
  ctx.lineWidth=1/flat*.5;ctx.strokeStyle=rgba(runeCol,.45);ctx.beginPath();ctx.arc(0,0,R*.86,0,6.283);ctx.stroke();
  // Glyph ring
  ctx.strokeStyle=rgba(runeCol,.9);ctx.lineWidth=1.6/flat*.5;
  for(let i=0;i<14;i++){const a=i/14*6.283;ctx.save();ctx.rotate(a);ctx.translate(0,-R*.93);const pulse=.55+.45*Math.sin(time*2+i*.9);ctx.globalAlpha=appear*pulse;glyph(ctx,i*5+3,0,0,R*.09);ctx.restore();}
  ctx.globalAlpha=appear;
  // Five tier arcs: lit up to the current tier
  for(let i=0;i<5;i++){const a0=-Math.PI/2+i*(6.283/5)+.08,a1=a0+6.283/5-.16,on=i<=tierIndex,cur=i===tierIndex;ctx.lineWidth=(cur?5:3.4)/flat*.5;ctx.strokeStyle=on?rgba(cur?pal.core:pal.body,cur?.75+.25*Math.sin(time*4):.85):'rgba(255,255,255,.08)';ctx.beginPath();ctx.arc(0,0,R*.7,a0,a1);ctx.stroke();}
  ctx.lineWidth=1/flat*.5;ctx.strokeStyle=rgba(runeCol,.35);ctx.beginPath();for(let i=0;i<6;i++){const a=i/6*6.283-spin*2;ctx.moveTo(Math.cos(a)*R*.62,Math.sin(a)*R*.62);ctx.lineTo(Math.cos(a+2.094)*R*.62,Math.sin(a+2.094)*R*.62);}ctx.stroke();
  ctx.restore();ctx.globalAlpha=1;
 }
 function drawWisps(front,cx,base,R,time,level){
  for(const p of wisps){const a=p.phase+time*p.speed,ry=R*.3,rx=R*(.52+p.lane*.08),x=cx+Math.cos(a)*rx,y=base-h*(.12+p.lane*.07)*Math.max(.6,level)+Math.sin(a)*ry*.5+Math.sin(time*2+p.phase)*4,inFront=Math.sin(a)>0;
   if(front===false){p.trail.push([x,y]);if(p.trail.length>14)p.trail.shift();}
   if(inFront!==front)continue;
   for(let k=0;k<p.trail.length;k++){const [tx,ty]=p.trail[k],al=k/p.trail.length;ctx.globalAlpha=al*.5;ctx.fillStyle=rgba(p.color,1);ctx.beginPath();ctx.arc(tx,ty,p.size*al*.8,0,6.283);ctx.fill();}
   ctx.globalAlpha=1;const g=ctx.createRadialGradient(x,y,0,x,y,p.size*4);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.25,rgba(p.color,.95));g.addColorStop(1,rgba(p.color,0));ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,p.size*4,0,6.283);ctx.fill();
  }
 }
 function burst(n,x,y,force=1,colors=[pal.core,pal.rune,pal.body]){for(let i=0;i<n;i++){const a=-Math.PI/2+(Math.random()-.5)*Math.PI*1.5,v=h*(.45+Math.random()*.8)*force;sparks.push({x,y,px:x,py:y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,age:0,life:.5+Math.random()*.8,c:colors[i%colors.length]});}}
 function shock(){const {cx,base,R}=geo();rings.push({x:cx,y:base+6,r:R*.3,age:0,life:.9});}
 function step(dt,time,level){
  const {cx,base}=geo(),H=flameH(level),W=flameW(level);
  if(Math.random()<(1.2+level*5)*dt)licks.push({x:cx+(Math.random()-.5)*W*.7,y:base-H*(.55+Math.random()*.4),vy:-h*(.25+Math.random()*.3),s:W*(.1+Math.random()*.12),age:0,life:.45+Math.random()*.4,c:Math.random()<.5?pal.body:pal.edge});
  if(Math.random()<(.6+level*3.2)*dt)runes.push({x:cx+(Math.random()-.5)*w*.55,y:base-Math.random()*h*.1,vy:-h*(.08+Math.random()*.12),rot:Math.random()*6,vr:(Math.random()-.5)*1.5,g:Math.floor(Math.random()*GLYPHS.length),s:7+Math.random()*7,age:0,life:2+Math.random()*2});
  for(const arr of [licks,runes,sparks,rings])for(let i=arr.length-1;i>=0;i--){const p=arr[i];p.age+=dt;if(p.age>=p.life){arr.splice(i,1);}}
  for(const p of licks){p.y+=p.vy*dt;p.x+=Math.sin(p.age*9+p.s)*12*dt;}
  for(const p of runes){p.y+=p.vy*dt;p.rot+=p.vr*dt;p.x+=Math.sin(time*1.3+p.s)*6*dt;}
  for(const p of sparks){p.px=p.x;p.py=p.y;p.vy+=h*1.4*dt;p.vx*=1-.5*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}
  for(const r of rings)r.r+=geo().R*2.2*dt;
 }
 function draw(level,time,appear){
  const {cx,base,R,flat}=geo(),H=flameH(level),W=flameW(level);
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.setTransform(dpr,0,0,dpr,0,0);
  // Aura behind everything
  ctx.globalCompositeOperation='lighter';
  const aura=ctx.createRadialGradient(cx,base-H*.45,0,cx,base-H*.45,Math.max(H,W)*1.4);aura.addColorStop(0,rgba(pal.glow,.32*appear));aura.addColorStop(1,rgba(pal.glow,0));ctx.fillStyle=aura;ctx.fillRect(0,0,w,h);
  ctx.globalCompositeOperation='source-over';
  drawRing(cx,base,R,flat,time,appear);
  for(const r of rings){const k=r.age/r.life;ctx.save();ctx.translate(r.x,r.y);ctx.scale(1,flat);ctx.globalAlpha=(1-k)*.9;ctx.strokeStyle=rgba(pal.core,1);ctx.lineWidth=(4*(1-k)+1)/flat*.5;ctx.beginPath();ctx.arc(0,0,r.r,0,6.283);ctx.stroke();ctx.restore();}
  ctx.globalAlpha=1;
  drawWisps(false,cx,base,R,time,level);
  // Flame: edge, body, core, each a flat band
  if(appear>.05){
   flameLayer(cx,base,W,H,time,pal.edge,pal.edge,TONGUES);
   flameLayer(cx,base+2,W*.74,H*.78,time*1.1,pal.body,pal.edge,TONGUES.slice(0,4));
   flameLayer(cx,base+3,W*.46,H*.5,time*1.25,pal.core,pal.body,TONGUES.slice(0,3));
   for(const p of licks){const k=p.age/p.life,s=p.s*(1-k);ctx.globalAlpha=1-k*.4;ctx.fillStyle=rgba(p.c,1);ctx.beginPath();ctx.moveTo(p.x,p.y-s*2.2);ctx.quadraticCurveTo(p.x+s,p.y-s*.2,p.x,p.y+s);ctx.quadraticCurveTo(p.x-s,p.y-s*.2,p.x,p.y-s*2.2);ctx.fill();}
   ctx.globalAlpha=1;
  }
  drawWisps(true,cx,base,R,time,level);
  ctx.globalCompositeOperation='lighter';
  ctx.lineCap='round';ctx.lineJoin='round';
  for(const p of runes){const k=p.age/p.life;ctx.globalAlpha=Math.sin(k*Math.PI)*.85;ctx.strokeStyle=rgba(pal.rune,1);ctx.lineWidth=1.3;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);glyph(ctx,p.g,0,0,p.s);ctx.restore();}
  for(const p of sparks){const k=p.age/p.life;ctx.globalAlpha=1-k;ctx.strokeStyle=rgba(p.c,1);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.px,p.py);ctx.lineTo(p.x,p.y);ctx.stroke();}
  // Eruption pillar on open and on a forged relic
  if(flash>0){const g=ctx.createLinearGradient(cx-W,0,cx+W,0);g.addColorStop(0,rgba(pal.core,0));g.addColorStop(.5,rgba(pal.core,.5*flash));g.addColorStop(1,rgba(pal.core,0));ctx.globalAlpha=1;ctx.fillStyle=g;ctx.fillRect(cx-W,h*.2,W*2,base-h*.2);}
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
 }
 function frame(now){
  const dt=Math.min(.05,(now-last)/1000);last=now;const time=(now-start)/1000;
  // Open: runes spin up, the flame erupts past its level, then settles.
  const appear=Math.min(1,time/.5),erupt=time<.35?0:Math.min(1,(time-.35)/1.4),settle=erupt<1?1+Math.sin(erupt*Math.PI)*.9*(1-erupt):1;
  if(time>.33&&time<.4&&flash===0){flash=1;shock();burst(40,w/2,geo().base,1.1);}
  flash=Math.max(0,flash-dt*1.6);
  if(charging)charge=Math.min(1,charge+dt*.7);
  boost=Math.max(0,boost-dt*.6);
  if(target>=.75&&now>nextFlare){boost+=.25;burst(16,w/2,geo().base-h*.2,.8);nextFlare=now+3200+Math.random()*3500;}
  if(relicTime>0&&now-relicTime<900){spin+=dt*14*(1-(now-relicTime)/900);}
  spin+=dt*(.18+charge*3+boost*.8)*(time<1.2?1+4*(1-time/1.2):1);
  const level=Math.min(1.7,(target*erupt*settle)+boost+charge*.8);
  step(dt,time,level);draw(level,time,appear);
  raf=requestAnimationFrame(frame);
 }
 const down=e=>{charging=true;canvas.setPointerCapture?.(e.pointerId);};
 const up=()=>{if(!charging)return;charging=false;const c=charge;charge=0;boost=Math.min(1.2,boost+.3+c);shock();if(c>.4)shock();burst(18+Math.round(c*70),w/2,geo().base-h*.15,.8+c*.8);};
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('pointerleave',up);
 if(reduced()){spin=.4;step(0,0,target);draw(target,1.2,1);}else raf=requestAnimationFrame(frame);
 return {
  stop(){cancelAnimationFrame(raf);ro.disconnect();},
  forgeRelic(){if(reduced())return;relicTime=performance.now();flash=1;boost=1.3;shock();setTimeout(shock,180);setTimeout(shock,360);burst(120,w/2,geo().base-h*.2,1.5);}
 };
}
