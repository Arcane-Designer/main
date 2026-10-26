// The forge. Your streaks heat it; heat becomes embers (a hotter forge pays more) and fills the
// crucible, which forges relics. Opened by tapping the anvil. Decorative only: never writes goal records.
import {TIERS,STREAK_MILESTONES,nextMilestone} from './core.js?v=16';
import {art} from './art.js?v=16';
import {ART_FILES} from './art-files.js?v=16';
import {RARITIES} from './game.js?v=16';
import {sfx,bellows} from './sound.js?v=16';
const relicArt=r=>ART_FILES.relics.includes(r.id)?`<img class="art-img" src="./assets/relics/${r.id}.webp" alt="">`:art(r.icon);

const SEEN_KEY='blastforge-relics-seen-v1',NEWS_KEY='blastforge-forge-seen-v1';
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const mix=(a,b,k)=>a.map((v,i)=>Math.round(v+(b[i]-v)*k));
const rgba=(c,a)=>`rgba(${c[0]},${c[1]},${c[2]},${a})`;
export const TIER_BONUS=[0,.1,.2,.35,.5];

// Real fire: dull red coals, then orange, yellow, white-hot, and the blue-white of dragonfire.
const STOPS=[
 {t:0,  edge:'#4a120c',body:'#a8321f',core:'#ff7a3d',spark:'#ff8a4d',glow:'#7a2414'},
 {t:.2, edge:'#7a1d10',body:'#e0582a',core:'#ffb45e',spark:'#ffb45e',glow:'#b8401c'},
 {t:.45,edge:'#a8321a',body:'#ff8a2a',core:'#ffd98a',spark:'#ffd27a',glow:'#e06a24'},
 {t:.75,edge:'#c8501e',body:'#ffc04a',core:'#fff6dc',spark:'#fff1c4',glow:'#ffa63d'},
 {t:1,  edge:'#2f4fa8',body:'#8fd0ff',core:'#f4fbff',spark:'#cfe9ff',glow:'#5aa8ff'}
].map(s=>({t:s.t,edge:hex(s.edge),body:hex(s.body),core:hex(s.core),spark:hex(s.spark),glow:hex(s.glow)}));
function paletteAt(temp){const t=Math.max(0,Math.min(1,temp));const i=STOPS.findIndex(s=>s.t>t);if(i<0)return STOPS.at(-1);if(i===0)return STOPS[0];const a=STOPS[i-1],b=STOPS[i],k=(t-a.t)/(b.t-a.t);const out={};for(const key of ['edge','body','core','spark','glow'])out[key]=mix(a[key],b[key],k);return out;}
const CATEGORY_COLOR={Movement:'#ffb45e',Health:'#7fe3a8',Learning:'#6fc3ff',Creative:'#ff7fa8',Hobbies:'#c39bff',Personal:'#ffd77a'};
const FLAME='M13 2c1 6-5 5-3 10 2-1 3-3 3-3 5 4 6 7 3 11-3 3-10 2-11-3-1-4 3-7 3-7-1 5 3 6 2 2-2-4 4-6 3-10Z';
const flameSvg=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${FLAME}"/></svg>`;
const read=(k,f)=>{try{const v=localStorage.getItem(k);return v===null?f:v;}catch{return f;}};
const write=(k,v)=>{try{localStorage.setItem(k,String(v));}catch{}};

// Something new at the forge since you last looked (a relic, a hotter tier, a streak milestone).
export const forgeSignature=s=>{const tier=TIERS.findIndex(t=>t.name===s.forge.tier.name);return `${s.relics.length}|${tier}|${s.forge.streaks.reduce((n,x)=>n+STREAK_MILESTONES.filter(m=>x.best>=m.days).length,0)}`;};
export const forgeHasNews=s=>read(NEWS_KEY,'')!==forgeSignature(s);

let owned=[];
const coinOf=(i,cls)=>{const r=owned[i];return r?`<span class="coin ${cls}" style="--r:${RARITIES[r.rarity].color}" title="${esc(r.name)} · ${RARITIES[r.rarity].label}">${relicArt(r)}</span>`:`<span class="coin ${cls}" title="The next relic">?</span>`;};
function template(s){
 const f=s.forge,pct=Math.round(f.temp*100),tier=TIERS.findIndex(t=>t.name===f.tier.name),bonus=TIER_BONUS[tier],next=TIERS[tier+1];
 const today=Math.round(f.heat[s.today]||0),week=Math.round(f.last7.reduce((n,d)=>n+d.heat,0)),perDay=Math.max(1,week/7),days=Math.ceil(f.toNext/perDay);
 const rows=f.streaks.filter(x=>x.current>0||x.best>0).slice(0,8).map(x=>{const col=CATEGORY_COLOR[x.category]||CATEGORY_COLOR.Personal,m=x.unit==='day'?nextMilestone(x.current):null;
  return `<li class="${x.current?'is-lit':''}" style="--c:${col}"><span class="chip-flame">${flameSvg}</span><span class="row-main"><strong>${esc(x.title)}</strong><small>${x.current} ${x.unit}${x.current===1?'':'s'} in a row${x.rest&&x.rest.left?` · ${x.rest.left} ${esc(x.rest.label.toLowerCase())}${x.rest.left===1?'':'s'} left`:''}${m?` · ${m.days-x.current} to ${esc(m.name)}`:''}</small></span><span class="chip-mult" title="Heat from the next check-off">×${x.next}</span></li>`;}).join('');
 const coins=Array.from({length:s.relics.length+1},(_,i)=>coinOf(i,i<s.relics.length?'is-forged':'is-next')).join('');
 return `<div class="forge-shell">
  <button class="forge-close" type="button" aria-label="Close the forge">×</button>
  <div class="forge-stage">
   <canvas aria-label="The forge fire at ${esc(f.tier.name)}. Press and hold to work the bellows." role="img"></canvas>
   <header class="forge-head"><span class="forge-eyebrow">The forge</span><h2 class="forge-tier">${esc(f.tier.name)}</h2><p class="forge-temp"><b data-count="${pct}">0</b>% heat${bonus?` · <span class="forge-bonus">+${Math.round(bonus*100)}% embers</span>`:''}</p></header>
   <span class="forge-hint">Hold to work the bellows</span>
  </div>
  <div class="forge-flow" aria-label="How the forge works">
   <div class="flow-card"><span class="flow-icon">${art('flame')}</span><strong>${today}<small> heat today</small></strong><small>${week} this week. Every goal adds heat; streaks multiply it.</small></div>
   <div class="flow-card"><span class="flow-icon">${art('embers')}</span><strong>${bonus?`+${Math.round(bonus*100)}%`:'+0%'}<small> embers</small></strong><div class="tier-pips" aria-hidden="true">${TIERS.map((t,i)=>`<i class="${i<=tier?'on':''} ${i===tier?'now':''}" title="${t.name}"></i>`).join('')}</div><small>${next?`Reach ${esc(next.name)} for +${Math.round(TIER_BONUS[tier+1]*100)}%. Keep this week hot.`:'The hottest a forge can burn.'}</small></div>
   <div class="flow-card"><span class="flow-icon">${art('relic')}</span><strong>${f.toNext}<small> heat to a relic</small></strong><div class="crucible-bar"><span style="--p:${f.progress.toFixed(3)}"></span></div><small>About ${days} day${days===1?'':'s'} at this pace.</small></div>
  </div>
  ${rows?`<ul class="streak-list" aria-label="Streaks">${rows}</ul>`:'<p class="streak-empty">Craft a goal to light your first streak.</p>'}
  <div class="relic-row" aria-label="Relics forged: ${s.relics.length}">${coins}</div>
  <details class="forge-how"><summary>How the forge works</summary><p>Every goal you craft adds heat. Doing a goal on days in a row adds more: four times as much at a week, ten times at a hundred days. Rest and cheat days keep a streak alive.</p><p>The last seven days set the fire’s tier. A hotter tier pays more embers for every goal, so it pays to keep going. Stop and it cools.</p><p>All the heat you earn also fills the crucible. A full crucible forges a relic for the Vault. Long streaks make rare relics likelier.</p></details>
 </div>`;
}

export function openForge(s){
 const dlg=document.getElementById('forge-dialog');if(!dlg||dlg.open)return;owned=s.relics;const stats=s.forge;sfx('flame');write(NEWS_KEY,forgeSignature(s));
 dlg.innerHTML=template(s);
 const shell=dlg.querySelector('.forge-shell'),pal=paletteAt(stats.temp);
 shell.style.setProperty('--fire',rgba(pal.body,1));shell.style.setProperty('--fire-core',rgba(pal.core,1));shell.style.setProperty('--fire-edge',rgba(pal.edge,1));shell.style.setProperty('--spark',rgba(pal.spark,1));shell.style.setProperty('--glow',rgba(pal.glow,1));
 shell.dataset.tier=stats.tier.name;
 dlg.showModal();
 // Burst out of the anvil.
 const logo=document.querySelector('.brand-mark')?.getBoundingClientRect(),box=shell.getBoundingClientRect();
 if(logo&&!reduced()){shell.style.transformOrigin=`${logo.left+logo.width/2-box.left}px ${logo.top+logo.height/2-box.top}px`;shell.classList.add('opening');setTimeout(()=>shell.classList.remove('opening'),700);}
 const fire=startFire(dlg.querySelector('canvas'),stats);
 const counter=dlg.querySelector('[data-count]'),goal=Number(counter.dataset.count),t0=performance.now();
 if(reduced())counter.textContent=goal;else (function count(now){const k=Math.min(1,(now-t0-350)/1300);if(k>0){const e=1-(1-k)**3;counter.textContent=Math.round(goal*e);}if(k<1&&dlg.open)requestAnimationFrame(count);})(t0);
 requestAnimationFrame(()=>requestAnimationFrame(()=>shell.classList.add('is-lit')));
 let seen=Number(read(SEEN_KEY,'0'))||0;if(seen>s.relics.length){seen=s.relics.length;write(SEEN_KEY,seen);}let timer=0;
 if(s.relics.length>seen)timer=setTimeout(()=>reveal(dlg,shell,fire,s,seen),reduced()?200:2100);
 const close=()=>{if(shell.classList.contains('closing'))return;if(reduced()){dlg.close();return;}shell.classList.add('closing');setTimeout(()=>dlg.close(),260);};
 dlg.querySelector('.forge-close').onclick=close;
 dlg.onclick=e=>{if(e.target===dlg)close();};
 dlg.oncancel=e=>{e.preventDefault();close();};
 dlg.addEventListener('close',()=>{clearTimeout(timer);fire.stop();},{once:true});
}

function reveal(dlg,shell,fire,s,seen){
 if(!dlg.open)return;
 const i=s.relics.length-1,extra=s.relics.length-seen-1,r=owned[i],rar=r?RARITIES[r.rarity]:null;
 fire.forgeRelic();sfx('relic');shell.classList.remove('strike');void shell.offsetWidth;shell.classList.add('strike');
 setTimeout(()=>{if(!dlg.open)return;
  const card=document.createElement('div');card.className='relic-reveal';card.setAttribute('role','alert');
  card.innerHTML=`<div class="relic-card ${r?'rar-'+r.rarity:''}" ${rar?`style="--r:${rar.color}"`:''}><span class="relic-rays"></span>${r?relicArt(r):art('relic')}<small>${rar?`${rar.label} relic forged`:'Forged'}</small><strong>${esc(r?.name||'A relic')}</strong>${extra>0?`<em>and ${extra} more</em>`:''}<button type="button" class="relic-ok">Claim it</button></div>`;
  shell.append(card);write(SEEN_KEY,s.relics.length);
  const done=()=>{card.classList.add('is-leaving');setTimeout(()=>card.remove(),350);};
  card.querySelector('.relic-ok').onclick=done;card.onclick=e=>{if(e.target===card)done();};
  card.querySelector('.relic-ok').focus({preventScroll:true});
 },reduced()?0:900);
}

function startFire(canvas,stats){
 const ctx=canvas.getContext('2d'),target=Math.max(.08,Math.min(1.25,stats.temp)),pal=paletteAt(stats.temp),tierIndex=TIERS.findIndex(t=>t.name===stats.tier.name);
 let w=0,h=0,raf=0,last=performance.now(),boost=0,charge=0,charging=false,flash=0,nextFlare=last+2600,relicTime=-1;const start=last;
 const licks=[],embers=[],sparks=[],rings=[],ash=[];
 const wisps=stats.streaks.filter(s=>s.current>0).slice(0,8).map((s,i,a)=>({color:mix(hex(CATEGORY_COLOR[s.category]||CATEGORY_COLOR.Personal),[255,170,80],.55),size:1.2+Math.min(s.current,14)*.12,speed:(.55+Math.min(s.current,14)*.05)*(i%2?-1:1),phase:i/a.length*Math.PI*2,lane:i%3,trail:[]}));
 let dpr=1;
 // Layout size, not on-screen size: the dialog scales in from the logo and must not shrink the canvas.
 function size(){dpr=Math.min(2,devicePixelRatio||1);w=Math.max(1,canvas.offsetWidth);h=Math.max(1,canvas.offsetHeight);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}
 size();const ro=new ResizeObserver(size);ro.observe(canvas);
 // The painted hearth (when it exists) sits under the fire; the flame rises from its ember bed.
 const hearth=ART_FILES.scenes?.includes('forge-hearth')?Object.assign(new Image(),{src:'./assets/scenes/forge-hearth.webp'}):null,painted=()=>hearth&&hearth.complete&&hearth.naturalWidth;
 const logs=ART_FILES.wing?.includes('logs')?Object.assign(new Image(),{src:'./assets/wing/logs.webp'}):null;
 const cover=()=>{const k=Math.max(w/hearth.naturalWidth,h/hearth.naturalHeight),dw=hearth.naturalWidth*k,dh=hearth.naturalHeight*k;return {x:(w-dw)/2,y:(h-dh)*.85,dw,dh};};
 const geo=()=>{if(painted()){const c=cover();return {cx:c.x+c.dw*.5,base:c.y+c.dh*.63,R:c.dw*.31,flat:.3,c};}return {cx:w/2,base:h*.8,R:Math.min(w*.42,h*.48),flat:.3};};
 // The flame grows tall up to full heat, then mostly wider, so it never covers the title.
 const flameH=l=>h*(.16+.3*Math.min(l,1)+.05*Math.max(0,l-1)),flameW=l=>w*Math.min(.34,.13+.12*l);
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
 // The hearth: a ring of firebricks around a bed of coals. Bricks glow as the tier climbs.
 function drawHearth(cx,base,R,flat,time,appear,level){
  ctx.save();ctx.translate(cx,base+6);ctx.globalAlpha=appear;
  const fg=ctx.createRadialGradient(0,0,0,0,0,R*1.2);fg.addColorStop(0,rgba(pal.glow,.5));fg.addColorStop(.6,rgba(pal.glow,.12));fg.addColorStop(1,rgba(pal.glow,0));ctx.fillStyle=fg;ctx.beginPath();ctx.ellipse(0,0,R*1.2,R*1.2*flat,0,0,6.283);ctx.fill();
  // coals
  {const bed=ctx.createRadialGradient(0,0,0,0,0,R*.8);bed.addColorStop(0,rgba([255,150,60],.9));bed.addColorStop(.6,rgba([150,40,15],.9));bed.addColorStop(1,rgba([40,14,8],1));ctx.fillStyle=bed;ctx.beginPath();ctx.ellipse(0,0,R*.8,R*.8*flat,0,0,6.283);ctx.fill();ctx.strokeStyle=rgba([255,200,110],.5+.3*Math.sin(time*2.5));ctx.lineWidth=1.2;for(let i=0;i<9;i++){const a=i*.7,r0=R*.15,r1=R*.7;ctx.beginPath();ctx.moveTo(Math.cos(a)*r0,Math.sin(a)*r0*flat);ctx.lineTo(Math.cos(a+.3)*r1*.6,Math.sin(a+.3)*r1*.6*flat);ctx.lineTo(Math.cos(a)*r1,Math.sin(a)*r1*flat);ctx.stroke();}}
  // bricks
  const n=18;for(let i=0;i<n;i++){const a0=i/n*6.283,a1=a0+6.283/n*.86,front=Math.sin((a0+a1)/2)>0,lit=Math.floor(i/(n/5))<=tierIndex||!front;
   ctx.beginPath();ctx.ellipse(0,0,R,R*flat,0,a0,a1);ctx.ellipse(0,0,R*.8,R*.8*flat,0,a1,a0,true);ctx.closePath();
   const k=front?.85:.55;ctx.fillStyle=lit?rgba(mix([70,44,36],pal.body,.22*k+(i%2?.05:0)),1):'#3a2e2a';ctx.fill();ctx.strokeStyle='rgba(0,0,0,.45)';ctx.lineWidth=1.2;ctx.stroke();
   if(front&&lit){ctx.strokeStyle=rgba(pal.core,.25+.15*Math.sin(time*3+i));ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(0,0,R*.8,R*.8*flat,0,a0+.03,a1-.03);ctx.stroke();}}
  ctx.restore();ctx.globalAlpha=1;
 }
 function drawWisps(front,cx,base,R,time,level){
  for(const p of wisps){const a=p.phase+time*p.speed,ry=R*.3,rx=R*(.5+p.lane*.08),x=cx+Math.cos(a)*rx,y=base-h*(.12+p.lane*.07)*Math.max(.6,level)+Math.sin(a)*ry*.5+Math.sin(time*2+p.phase)*4,inFront=Math.sin(a)>0;
   if(front===false){p.trail.push([x,y]);if(p.trail.length>14)p.trail.shift();}
   if(inFront!==front)continue;
   for(let k=0;k<p.trail.length;k++){const [tx,ty]=p.trail[k],al=k/p.trail.length;ctx.globalAlpha=al*.5;ctx.fillStyle=rgba(p.color,1);ctx.beginPath();ctx.arc(tx,ty,p.size*al*.8,0,6.283);ctx.fill();}
   ctx.globalAlpha=1;const g=ctx.createRadialGradient(x,y,0,x,y,p.size*2.6);g.addColorStop(0,'rgba(255,250,235,1)');g.addColorStop(.35,rgba(p.color,.9));g.addColorStop(1,rgba(p.color,0));ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,p.size*2.6,0,6.283);ctx.fill();
  }
 }
 function burst(n,x,y,force=1,colors=[pal.core,pal.spark,pal.body]){for(let i=0;i<n;i++){const a=-Math.PI/2+(Math.random()-.5)*Math.PI*1.5,v=h*(.45+Math.random()*.8)*force;sparks.push({x,y,px:x,py:y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,age:0,life:.5+Math.random()*.8,c:colors[i%colors.length]});}}
 function shock(){const {cx,base,R}=geo();rings.push({x:cx,y:base+6,r:R*.3,age:0,life:.9});}
 function step(dt,time,level){
  const {cx,base}=geo(),H=flameH(level),W=flameW(level);
  if(Math.random()<(1.2+level*5)*dt)licks.push({x:cx+(Math.random()-.5)*W*.7,y:base-H*(.55+Math.random()*.4),vy:-h*(.25+Math.random()*.3),s:W*(.1+Math.random()*.12),age:0,life:.45+Math.random()*.4,c:Math.random()<.5?pal.body:pal.edge});
  if(Math.random()<(2+level*7)*dt)embers.push({x:cx+(Math.random()-.5)*W*1.1,y:base-Math.random()*H*.4,vy:-h*(.12+Math.random()*.22),vx:(Math.random()-.5)*20,s:1+Math.random()*2.2,age:0,life:1.6+Math.random()*1.8,ph:Math.random()*6});
  if(Math.random()<.8*dt)ash.push({x:cx+(Math.random()-.5)*w*.5,y:base-H*(.6+Math.random()*.4),vy:-h*.04,vx:(Math.random()-.5)*14,s:1.5+Math.random()*2,age:0,life:3+Math.random()*2,rot:Math.random()*6});
  for(const arr of [licks,embers,sparks,rings,ash])for(let i=arr.length-1;i>=0;i--){const p=arr[i];p.age+=dt;if(p.age>=p.life)arr.splice(i,1);}
  for(const p of licks){p.y+=p.vy*dt;p.x+=Math.sin(p.age*9+p.s)*12*dt;}
  for(const p of embers){p.y+=p.vy*dt;p.x+=(p.vx+Math.sin(time*3+p.ph)*14)*dt;}
  for(const p of ash){p.y+=p.vy*dt;p.x+=(p.vx+Math.sin(time+p.rot)*6)*dt;p.rot+=dt;}
  for(const p of sparks){p.px=p.x;p.py=p.y;p.vy+=h*1.4*dt;p.vx*=1-.5*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}
  for(const r of rings)r.r+=geo().R*2.2*dt;
 }
 function draw(level,time,appear){
  const {cx,base,R,flat}=geo(),H=flameH(level),W=flameW(level);
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.setTransform(dpr,0,0,dpr,0,0);
  const g0=geo();if(g0.c){ctx.globalAlpha=appear;ctx.drawImage(hearth,g0.c.x,g0.c.y,g0.c.dw,g0.c.dh);ctx.globalAlpha=1;}
  ctx.globalCompositeOperation='lighter';
  const aura=ctx.createRadialGradient(cx,base-H*.45,0,cx,base-H*.45,Math.max(H,W)*1.4);aura.addColorStop(0,rgba(pal.glow,.32*appear));aura.addColorStop(1,rgba(pal.glow,0));ctx.fillStyle=aura;ctx.fillRect(0,0,w,h);
  ctx.globalCompositeOperation='source-over';
  if(!g0.c)drawHearth(cx,base,R,flat,time,appear,level);else{ctx.globalCompositeOperation='lighter';const bed=ctx.createRadialGradient(cx,base,0,cx,base,R);bed.addColorStop(0,rgba(pal.glow,.35+.1*Math.sin(time*2)));bed.addColorStop(1,rgba(pal.glow,0));ctx.fillStyle=bed;ctx.beginPath();ctx.ellipse(cx,base,R,R*flat,0,0,6.283);ctx.fill();ctx.globalCompositeOperation='source-over';}
  for(const r of rings){const k=r.age/r.life;ctx.save();ctx.translate(r.x,r.y);ctx.scale(1,flat);ctx.globalAlpha=(1-k)*.9;ctx.strokeStyle=rgba(pal.core,1);ctx.lineWidth=(4*(1-k)+1)/flat*.5;ctx.beginPath();ctx.arc(0,0,r.r,0,6.283);ctx.stroke();ctx.restore();}
  ctx.globalAlpha=1;
  drawWisps(false,cx,base,R,time,level);
  if(appear>.05){
   // Burning logs sit on the embers; the flame rises out of them, soft at the edges like real fire.
   // The log pile is sized by the forge's tier, not the live flame, so working the bellows grows only the fire.
   const logW=Math.min(R*1.25,flameW(target)*1.6),haveLogs=logs&&logs.complete&&logs.naturalWidth,lift=haveLogs?logW*.18:0;
   if(haveLogs){const lh=logW*logs.naturalHeight/logs.naturalWidth;ctx.drawImage(logs,cx-logW/2,base-lh*.72,logW,lh);}
   const fb=base-lift;
   ctx.save();ctx.globalAlpha=.55;ctx.filter='blur(6px)';flameLayer(cx,fb,W*1.08,H*1.04,time,pal.edge,pal.edge,TONGUES);ctx.restore();
   ctx.save();ctx.globalAlpha=.9;ctx.filter='blur(2px)';flameLayer(cx,fb,W,H,time,pal.edge,pal.edge,TONGUES);ctx.restore();
   ctx.save();ctx.filter='blur(1.2px)';flameLayer(cx,fb+2,W*.74,H*.78,time*1.1,pal.body,pal.edge,TONGUES.slice(0,4));ctx.restore();
   ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.85;ctx.filter='blur(.8px)';flameLayer(cx,fb+3,W*.46,H*.5,time*1.25,pal.core,pal.body,TONGUES.slice(0,3));ctx.restore();
   for(const p of licks){const k=p.age/p.life,s=p.s*(1-k);ctx.globalAlpha=1-k*.4;ctx.fillStyle=rgba(p.c,1);ctx.beginPath();ctx.moveTo(p.x,p.y-s*2.2);ctx.quadraticCurveTo(p.x+s,p.y-s*.2,p.x,p.y+s);ctx.quadraticCurveTo(p.x-s,p.y-s*.2,p.x,p.y-s*2.2);ctx.fill();}
   ctx.globalAlpha=1;
  }
  drawWisps(true,cx,base,R,time,level);
  for(const p of ash){const k=p.age/p.life;ctx.globalAlpha=Math.sin(k*Math.PI)*.35;ctx.fillStyle='#8a8580';ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.fillRect(-p.s,-p.s*.4,p.s*2,p.s*.8);ctx.restore();}
  ctx.globalCompositeOperation='lighter';
  for(const p of embers){const k=p.age/p.life,fl=.6+.4*Math.sin(time*14+p.ph);ctx.globalAlpha=(1-k)*fl;ctx.fillStyle=rgba(pal.spark,1);ctx.beginPath();ctx.arc(p.x,p.y,p.s*(1-k*.5),0,6.283);ctx.fill();}
  ctx.lineCap='round';for(const p of sparks){const k=p.age/p.life;ctx.globalAlpha=1-k;ctx.strokeStyle=rgba(p.c,1);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.px,p.py);ctx.lineTo(p.x,p.y);ctx.stroke();}
  if(flash>0){const g=ctx.createLinearGradient(cx-W,0,cx+W,0);g.addColorStop(0,rgba(pal.core,0));g.addColorStop(.5,rgba(pal.core,.5*flash));g.addColorStop(1,rgba(pal.core,0));ctx.globalAlpha=1;ctx.fillStyle=g;ctx.fillRect(cx-W,h*.2,W*2,base-h*.2);}
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
 }
 function frame(now){
  const dt=Math.min(.05,(now-last)/1000);last=now;const time=(now-start)/1000;
  const appear=Math.min(1,time/.5),erupt=time<.35?0:Math.min(1,(time-.35)/1.4),settle=erupt<1?1+Math.sin(erupt*Math.PI)*.9*(1-erupt):1;
  if(time>.33&&time<.4&&flash===0){flash=1;shock();burst(40,w/2,geo().base,1.1);}
  flash=Math.max(0,flash-dt*1.6);
  if(charging){charge=Math.min(1,charge+dt*.7);roar?.set(charge);}
  boost=Math.max(0,boost-dt*.6);
  if(target>=.75&&now>nextFlare){boost+=.25;burst(16,w/2,geo().base-h*.2,.8);nextFlare=now+3200+Math.random()*3500;}
  const level=Math.min(1.7,(target*erupt*settle)+boost+charge*.8);
  step(dt,time,level);draw(level,time,appear);
  raf=requestAnimationFrame(frame);
 }
 // Hold to work the bellows: the fire roars, and letting go throws sparks.
 // Holding swells a low roar; letting go is the big sound, a whump that grows with how long you held.
 let roar=null;
 const down=e=>{charging=true;canvas.setPointerCapture?.(e.pointerId);roar?.stop();roar=bellows();};
 const up=()=>{if(!charging)return;charging=false;const c=charge;charge=0;roar?.stop();roar=null;sfx('blast',c);boost=Math.min(1.2,boost+.3+c);shock();if(c>.4)shock();burst(18+Math.round(c*70),w/2,geo().base-h*.15,.8+c*.8);};
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('pointerleave',up);
 if(reduced()){step(0,0,target);draw(target,1.2,1);}else raf=requestAnimationFrame(frame);
 return {
  stop(){cancelAnimationFrame(raf);ro.disconnect();roar?.stop();},
  forgeRelic(){if(reduced())return;relicTime=performance.now();flash=1;boost=1.3;shock();setTimeout(shock,180);setTimeout(shock,360);burst(120,w/2,geo().base-h*.2,1.5);}
 };
}
