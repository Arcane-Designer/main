// The game screens: Dragon, Craft, Games, Vault and Isles, plus the dragon perched under Today.
import {gameState,hash,ITEMS,ITEM,MATERIALS,RELICS,RARITIES,SLOTS,STAGES,UNLOCKS,ISLES,DRAGON_COLORS,PERKS,THEMES,ACHIEVEMENTS,SOURCES,costFor,canAfford,consumable,recipeView,craftChanges,feedChanges,petChanges,petReadyIn,PET_COOLDOWN,adoptChanges,renameChanges,recolorChanges,freeRename,equipChanges,claimBountyChanges,flightPlan,flyChanges,anvilZone,anvilRewardChanges,catchRewardChanges,wingRewardChanges,scrapChanges,extraLife,themeChanges,achievementChanges,NAME_MAX,setDevice,WING_LEVELS,wingLevel,REGIONS,SETS} from './game.js?v=16';
import {dragonSVG} from './dragon.js?v=16';
import {mouthOf} from './gear-art.js?v=16';
import {art} from './art.js?v=16';
import {ART_FILES} from './art-files.js?v=16';
import {sfx} from './sound.js?v=16';
import {playAnvil} from './anvil.js?v=16';
import {playCatch} from './catch.js?v=16';
import {playWingbeat} from './wingbeat.js?v=16';

let C=null,cache=null,adoptColor=0,feedOpen=false,slotOpen=null,recipeTab='food',vaultTab='relics',flying=false,petBusy=false,feedBusy=false;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const read=(k,f)=>{try{const v=localStorage.getItem(k);return v===null?f:v;}catch{return f;}};
const write=(k,v)=>{try{localStorage.setItem(k,String(v));}catch{}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
export function initGame(ctx){C=ctx;let id=read('blastforge-device-v1','');if(!/^[a-z0-9]{6}$/.test(id)){id=Array.from(crypto.getRandomValues(new Uint8Array(6)),b=>'abcdefghijklmnopqrstuvwxyz0123456789'[b%36]).join('');write('blastforge-device-v1',id);}setDevice(id);startLife();setInterval(()=>{if(!document.hidden&&C.section?.()==='dragon')C.render();},30000);}
export function game(){const r=C.Store.records,v=C.Store.revision,d=C.today(),h=new Date().getHours();if(!cache||cache.r!==r||cache.v!==v||cache.d!==d||cache.h!==h)cache={r,v,d,h,s:gameState(r,d,{hour:h})};return cache.s;}

// ---- small pieces ----
const matColor=k=>k==='embers'?'#ffb45e':k==='energy'?'#7fd8ff':MATERIALS[k]?.color||'#d6b580';
// Short names where a full one won't fit (the wallet tiles).
const SHORT={iron:'Iron',dye:'Dye',silk:'Silk',scale:'Scale',core:'Core'};
const matName=k=>k==='embers'?'Embers':k==='energy'?'Flight energy':MATERIALS[k]?.name||k;
// Painted art where it exists, line icons everywhere else.
const HAS=Object.fromEntries(['relics','items','materials','isles','scenes','dragons','sprites','poses','wing','walk','smooth','games','banners'].map(k=>[k,new Set(ART_FILES[k]||[])]));
const portraitId=d=>`${d.color.id}-${STAGES[d.stage].name.toLowerCase()}`;
const portraitSrc=d=>HAS.dragons.has(portraitId(d))?`./assets/dragons/${portraitId(d)}.webp`:null;
// A painted portrait for big moments when one exists; the live SVG otherwise.
// Gear is kept and works, but isn't drawn on the painted dragon (it looked pasted on).
const portrait=(d,equip={})=>{const src=portraitSrc(d);if(!src)return dragonSVG({...d,mood:'delighted'},equip);return `<span class="portrait-wrap"><img class="portrait" src="${src}" alt="${esc(d.name)}"></span>`;};
// The living dragon: the painted portrait wearing its gear, with its own idle motion and mood effects.
const MOOD_FX={sleepy:'<span class="pfx zzz"><i>z</i><i>z</i><i>z</i></span>',fiery:'<span class="pfx embers"><i></i><i></i><i></i><i></i></span>',delighted:'<span class="pfx sparkles"><i>✦</i><i>✦</i></span>'};
// Painted poses swap in for a moment: eyes closed when petted, chewing when fed, curled up asleep on a sleepy morning.
// Smoother sheets (12-step walk, 6-frame flap) are used where they exist; the 2-frame flap otherwise.
// A frame is {src, i, n}: frame i of an n-frame filmstrip (n=1 for a single picture).
const stripOf=(d,kind)=>{const stem=`${portraitId(d)}-${kind}`;return HAS.smooth.has(stem)?{src:`./assets/smooth/${stem}.webp`,n:kind==='walk12'?14:6}:null;};
const flyFrames=d=>{const six=stripOf(d,'fly6');if(six)return {strip:six,cycle:Array.from({length:6},(_,i)=>({src:six.src,i,n:6}))};const up=poseSrc(d,'fly-up'),down=poseSrc(d,'fly-down');return up&&down?{up,down,cycle:[{src:up,i:0,n:1},{src:down,i:0,n:1}]}:null;};
const poseSrc=(d,pose)=>HAS.poses.has(`${portraitId(d)}-${pose}`)?`./assets/poses/${portraitId(d)}-${pose}.webp`:null;
function liveDragon(d,equip,{label=''}={}){
 const src=portraitSrc(d);if(!src)return dragonSVG(d,equip,{label});
 const asleep=d.mood==='sleepy'&&poseSrc(d,'sleep');
 const extra=asleep?'':POSES.map(p=>poseSrc(d,p)?`<img class="pose" data-p="${p}" src="${poseSrc(d,p)}" alt="" decoding="async" draggable="false">`:'').join('');
 return `<span class="dragon dragon-portrait mood-${d.mood} stage-${d.stage} ${asleep?'is-asleep':''}" role="img" aria-label="${esc(label||`${d.name}, ${d.stageName}, feeling ${d.mood}`)}"><span class="shadow"></span><span class="pf"><img class="base" src="${asleep||src}" alt="" decoding="async" draggable="false">${extra}</span>${MOOD_FX[d.mood]||''}</span>`;
}
// Show a pose for a while (or until told to stop), crossfading from the usual picture.
const POSES=['pet','nuzzle','flop','eat-open','eat','content'];
// One painted pose at a time crossfades over the usual picture; ms=0 holds it until changed.
function pose(pf,name,ms=0){if(!pf||!pf.querySelector(`img[data-p="${name}"]`))return;pf.dataset.pose=name;clearTimeout(pf._pose);if(ms)pf._pose=setTimeout(()=>{if(pf.dataset.pose===name)delete pf.dataset.pose;},ms);}
const unpose=pf=>{if(pf){clearTimeout(pf._pose);delete pf.dataset.pose;}};
const scene=id=>HAS.scenes.has(id)?`./assets/scenes/${id}.webp`:null;
export const pic=(kind,id,icon)=>HAS[kind].has(id)?`<img class="art-img" src="./assets/${kind}/${id}.webp" alt="" loading="lazy" decoding="async" draggable="false">`:art(icon);
const matIcon=k=>k==='energy'?art('bolt'):pic('materials',k,k==='embers'?'embers':MATERIALS[k]?.icon);
const chip=(k,n,short=false)=>`<span class="cost ${short?'short':''}" style="--c:${matColor(k)}" title="${esc(matName(k))}">${matIcon(k)}<b>${n}</b></span>`;
const chips=obj=>Object.entries(obj).filter(([,n])=>n).map(([k,n])=>chip(k,n)).join('');
const bar=(p,cls='')=>`<div class="g-bar ${cls}"><span style="width:${Math.max(0,Math.min(100,p*100)).toFixed(1)}%"></span></div>`;
const TAGS={storm:'Crosses storm islands',frost:'Crosses frozen islands',light:'Lights the way through mist and caves'};
const powers=x=>[x.perk?PERKS[x.perk]:'',...(x.tags?.length?x.tags:x.tag?[x.tag]:[]).map(t=>TAGS[t])].filter(Boolean);
const coin=(r,cls='')=>`<span class="relic-coin rar-${r.rarity} ${cls} ${HAS.relics.has(r.id)?'has-art':''}" style="--r:${RARITIES[r.rarity].color}">${pic('relics',r.id,r.icon)}</span>`;
const tile=(x,extra='')=>`<span class="item-tile ${HAS.items.has(x.id)?'has-art':''}">${pic('items',x.id,x.icon)}${extra}</span>`;
const MOOD={content:'Content',sleepy:'Sleepy',restless:'Restless · waiting on a goal',happy:'Happy',delighted:'Delighted',fiery:'Fired up',lonely:'Missed you'};
const STATS=[['strength','Strength','Movement','Widens the anvil’s perfect zone'],['vitality','Vitality','Health','Extra lives in Ember Catch'],['wisdom','Wisdom','Learning','Bonus materials when you craft'],['spirit','Spirit','Creative, hobbies, personal','Bond grows faster']];
const chosenLevel=s=>wingLevel(s,Number(read('blastforge-wing-level-v1',String(s.dragon.stage))));
const later=mins=>mins>=60?`${Math.floor(mins/60)}h${mins%60?` ${mins%60}m`:''}`:`${mins}m`;

// Tabs that open as your dragon grows. Returns {section: why it's locked}.
export function navLocks(s=game()){const d=s.dragon,out={};if(!s.unlocked.has('isles')){const to=STAGES[1].xp-d.xp;out.isles=`The isles open when ${d.named?d.name:'your dragon'} is a Fledgling and can fly${d.named&&to>0?` · ${to} bond to go`:''}.`;}return out;}
export function navAlerts(s=game()){return {
 dragon:!s.dragon.named,
 craft:s.bounties.some(b=>b.done&&!b.claimed)||s.lastWeekBounties.length>0,
 games:(s.anvilToday.eligible&&!s.anvilToday.played)||(s.unlocked.has('catch')&&s.catchToday.eligible&&!s.catchToday.played)||(s.unlocked.has('wingbeat')&&s.wingToday.eligible&&!s.wingToday.played),
 vault:s.achievements.some(a=>a.ready),
 isles:Boolean(flightPlan(s)?.ok)
};}

// ---- the dragon perched under Today ----
const sig=(s,d)=>[d.mood,d.stage,d.color.id,d.named,d.name].join('|');
export function companion(){const s=game(),d=s.dragon;
 return `<button class="perch" data-g-go="dragon" aria-label="${d.named?`${esc(d.name)} · ${MOOD[d.mood]}. Open the Dragon tab`:'Someone is waiting by the forge. Open the Dragon tab'}"><span class="perch-dragon grow-${d.named?d.stage:0}" data-keep="companion" data-sig="${sig(s,d)}">${liveDragon(d.named?d:{...d,mood:'delighted'},s.equip,{label:' '})}</span><span class="perch-text"><strong>${d.named?esc(d.name):'A visitor at the forge'}</strong><small>${d.named?`${esc(MOOD[d.mood])} · ${esc(d.quirk.slice(d.name.length+1))}`:'A baby dragon is waiting for a name.'}</small></span>${d.named?'':'<span class="companion-ping">!</span>'}</button>`;}
export function companionReact(kind='hop'){const el=document.querySelector('.perch .pf');if(!el)return;act3(el,kind==='hop'?'hop':'look');}

// ---- the dragon's own life: little things it does by itself while you watch ----
const MOVES={
 hop:[[0,'none'],[.35,'translateY(-12%) scale(1.03,.97)'],[.7,'translateY(0) scale(1.05,.94)'],[1,'none']],
 look:[[0,'none'],[.25,'rotate(-4deg) translateX(-2%)'],[.6,'rotate(3deg) translateX(2%)'],[1,'none']],
 stretch:[[0,'none'],[.4,'scale(.97,1.05)'],[.7,'scale(1.02,.98)'],[1,'none']],
 nuzzle:[[0,'none'],[.3,'rotate(5deg) translateX(3%) scale(1.02,.98)'],[.6,'rotate(-3deg) translateX(-2%) scale(1.01,.99)'],[1,'none']],
 chew:[[0,'none'],[.15,'scale(1.02,.975)'],[.3,'none'],[.45,'scale(1.02,.975)'],[.6,'none'],[.75,'scale(1.015,.98)'],[1,'none']],
 fly:[[0,'none'],[.12,'translateY(4%) scale(1.04,.95)'],[.3,'translateY(-26%) rotate(-3deg)'],[.5,'translateY(-30%) translateX(-8%) rotate(-6deg)'],[.7,'translateY(-24%) translateX(7%) rotate(5deg)'],[.88,'translateY(-4%)'],[.94,'translateY(2%) scale(1.04,.95)'],[1,'none']]
};
function act3(el,move,dur){
 if(!el||reduced())return null;const frames=MOVES[move].map(([offset,transform])=>({offset,transform}));
 const a=el.animate(frames,{duration:dur||({fly:3200,chew:1100,stretch:1400,look:1600,nuzzle:1300}[move]||700),easing:'ease-in-out'});
 if(move==='fly'){const sh=el.parentElement?.querySelector('.shadow');sh?.animate([{transform:'translateX(-50%) scale(1)',opacity:1},{transform:'translateX(-50%) scale(.55)',opacity:.45,offset:.3},{transform:'translateX(-50%) scale(.5)',opacity:.4,offset:.7},{transform:'translateX(-50%) scale(1)',opacity:1}],{duration:3200,easing:'ease-in-out'});}
 return a;
}
function puff(pf){if(!pf||reduced())return;const s=game(),[mx,my]=mouthOf(portraitId(s.dragon));for(let i=0;i<5;i++){const el=document.createElement('span');el.className='puff';el.setAttribute('data-own','');el.style.left=`${mx}%`;el.style.top=`${my}%`;pf.append(el);el.animate([{transform:'translate(-50%,-50%) scale(.3)',opacity:.9},{transform:`translate(calc(-50% + ${(Math.random()-.3)*40}px),calc(-50% - ${30+Math.random()*30}px)) scale(${1+Math.random()})`,opacity:0}],{duration:1400+Math.random()*600,delay:i*90,easing:'ease-out'}).onfinish=()=>el.remove();}}
// Walking and flying in the den use painted frames: the dragon stands, turns, steps (legs and tail
// moving), then turns back and sits. Facing flips only on the front-facing frame, so it never looks flat.
// The step sheets carry their own front and turn frames (1 and 2) on the same canvas.
const walkFrames=d=>{const t=stripOf(d,'walk12');if(t){const f=i=>({src:t.src,i,n:14});return {front:f(0),turn:f(1),cycle:Array.from({length:12},(_,i)=>f(i+2))};}if(!HAS.walk.has(portraitId(d)))return null;const base=Array.from({length:8},(_,i)=>({src:`./assets/walk/${portraitId(d)}-${i+1}.webp`,i:0,n:1}));return {front:base[0],turn:base[1],cycle:base.slice(2)};};
const preload=srcs=>Promise.all(srcs.map(src=>new Promise(r=>{const i=new Image();i.onload=i.onerror=()=>r(i);i.src=src;})));
let moving=null,busyUntil=0;
// Feeding and petting reactions take a few seconds; the dragon's idle life waits until they finish.
const hold=ms=>{busyUntil=Math.max(busyUntil,performance.now()+ms);},busyNow=()=>petBusy||performance.now()<busyUntil;
// Ask a walking or flying dragon to stop and sit, and wait until they have.
async function settle(){if(!moving)return;moving.stop=true;const t0=performance.now();while(moving&&performance.now()-t0<1200)await wait(40);await wait(260);}
// Where the dragon actually is inside a picture (or one frame of a filmstrip), as fractions of it.
const BOX=new Map();
function alphaBox(img,i=0,n=1){
 const key=`${img.src}#${i}/${n}`;if(BOX.has(key))return BOX.get(key);
 const fw=img.naturalWidth/n,fh=img.naturalHeight,k=Math.min(1,160/fh),cw=Math.max(1,Math.round(fw*k)),ch=Math.max(1,Math.round(fh*k));
 let b=null;try{const c=document.createElement('canvas');c.width=cw;c.height=ch;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(img,fw*i,0,fw,fh,0,0,cw,ch);const d=x.getImageData(0,0,cw,ch).data;let x0=cw,y0=ch,x1=-1,y1=-1;
  for(let y=0;y<ch;y++)for(let xx=0;xx<cw;xx++)if(d[(y*cw+xx)*4+3]>40){if(xx<x0)x0=xx;if(xx>x1)x1=xx;if(y<y0)y0=y;y1=y;}
  if(x1>=0)b={x0:x0/cw,y0:y0/ch,x1:(x1+1)/cw,y1:(y1+1)/ch};}catch{}
 BOX.set(key,b);return b;
}
// The walking pictures are painted at a different scale from the sitting portrait. This finds the size and
// offset that put the front-facing frame exactly over the portrait, and the dragon keeps that size for the
// whole walk, so standing up and sitting down are just a blend between two poses, never a jump in size.
function sitMatch(el,f,img,base){
 const fb=img&&alphaBox(img,f.i,f.n),pb=base?.naturalWidth?alphaBox(base):null;if(!fb||!pb)return null;
 const L=el.getBoundingClientRect(),P=base.getBoundingClientRect();if(!L.height||!P.height)return null;
 const s=(pb.y1-pb.y0)*P.height/((fb.y1-fb.y0)*L.height),O={x:L.left+L.width/2,y:L.bottom},F={x:L.left+(fb.x0+fb.x1)/2*L.width,y:L.top+fb.y1*L.height},T={x:P.left+(pb.x0+pb.x1)/2*P.width,y:P.top+pb.y1*P.height};
 return {s,dx:T.x-(O.x+s*(F.x-O.x)),dy:T.y-(O.y+s*(F.y-O.y))};
}
function walker(floor){let w=floor.querySelector('.walker');if(!w){w=document.createElement('span');w.className='walker';w.setAttribute('data-own','');w.innerHTML='<i class="wf"></i><i class="wf"></i>';floor.append(w);}return w;}
// If anything goes wrong mid-walk, the dragon sits back down where they are instead of freezing.
export async function stepTo(pf,mode){
 try{await stroll(pf,mode);}
 catch(e){console.warn('Walk stopped:',e);const floor=pf?.closest('.den-floor');floor?.classList.remove('is-moving');floor?.querySelector('.walker')?.getAnimations().forEach(a=>a.cancel());moving=null;}
}
async function stroll(pf,mode){
 const floor=pf?.closest('.den-floor'),host=floor?.parentElement,d=game().dragon;if(!floor||!host||moving||reduced())return;
 const walk=walkFrames(d),fly=mode==='fly'?flyFrames(d):null;if(!walk||(mode==='fly'&&!fly)||busyNow())return;
 const job=moving={stop:false};
 const list=[walk.front,walk.turn,...(mode==='fly'?fly.cycle:walk.cycle)],loaded=await preload([...new Set(list.map(f=>f.src))]),dims=new Map(loaded.map(im=>[im.src,im]));
 if(job.stop||busyNow()||!floor.isConnected){if(moving===job)moving=null;return;}
 const w=walker(floor),layers=[...w.querySelectorAll('.wf')],sleep=ms=>new Promise(r=>setTimeout(r,ms));let front=0,shown='',dir=1;
 // Show one frame. Steps in a cycle swap instantly (a crossfade there looks doubled); poses blend.
 const show=(f,flip,fade=0)=>{if(f.src!==shown){const im=[...dims.values()].find(x=>x.src.endsWith(f.src.replace('./','')));if(im?.naturalWidth)w.style.aspectRatio=`${im.naturalWidth/(f.n||1)} / ${im.naturalHeight}`;shown=f.src;}
  const next=fade?layers[1-front]:layers[front],prev=layers[front];next.style.transition='none';next.style.backgroundImage=`url(${f.src})`;next.style.backgroundSize=f.n>1?`${f.n*100}% 100%`:'contain';next.style.backgroundPosition=f.n>1?`${f.i/(f.n-1)*100}% 0`:'center bottom';next.style.transform=flip?`scaleX(${dir})`:'none';
  if(fade){next.style.opacity='0';void next.offsetWidth;next.style.transition=`opacity ${fade}ms ease`;next.style.opacity='1';prev.style.transition=`opacity ${fade}ms ease`;prev.style.opacity='0';front=1-front;}else{next.style.opacity='1';layers[1-front].style.opacity='0';}};
 // Stand up: the front-facing frame, sized and placed exactly over the portrait, blends in as it fades out.
 const imgOf=f=>[...dims.values()].find(x=>x.src.endsWith(f.src.replace('./','')));
 show(walk.front,false);w.style.transform='';const fit=sitMatch(w,walk.front,imgOf(walk.front),pf.querySelector('img.base')),k=fit?.s||1;
 w.style.transform=fit?`translateX(-50%) translate(${fit.dx.toFixed(1)}px,${fit.dy.toFixed(1)}px) scale(${k.toFixed(3)})`:'';
 // Room to roam: keep the walking dragon's nose inside the room.
 const wide=floor.clientHeight*.86*1.35*k,max=Math.max(0,(host.clientWidth-Math.max(wide,floor.clientWidth))/2-6),cur=Number(floor.dataset.x||0);let nx=(Math.random()*2-1)*max;if(Math.abs(nx-cur)<max*.35)nx=cur>0?-max*(.45+Math.random()*.5):max*(.45+Math.random()*.5);
 dir=nx<cur?-1:1;const dist=Math.abs(nx-cur);
 floor.classList.add('is-moving');await sleep(520);if(job.stop)return land();
 if(mode==='fly'){
  show(walk.turn,true,260);await sleep(320);
  const n=fly.cycle.length,beat=Math.round(560/n),dur=Math.max(3400,dist*22);floor.dataset.x=nx.toFixed(1);
  floor.style.transition=`transform ${dur}ms cubic-bezier(.45,.05,.55,.95)`;floor.style.transform=`translateX(${nx.toFixed(1)}px)`;
  w.classList.add('fly');w.animate([{translate:'0 0'},{translate:'0 -45%',offset:.22},{translate:'0 -58%',offset:.5},{translate:'0 -48%',offset:.75},{translate:'0 -6%',offset:.95},{translate:'0 0'}],{duration:dur,easing:'ease-in-out',fill:'forwards'});
  const t0=performance.now();let j=0;while(performance.now()-t0<dur*.94&&!job.stop){const t=(performance.now()-t0)/dur;show(fly.cycle[j++%n],true);await sleep(t>.25&&t<.7?beat*1.8:beat);}
  w.classList.remove('fly');if(!job.stop){show(walk.turn,true,260);await sleep(320);}
 }else{
  show(walk.turn,true,260);await sleep(340);
  // An unhurried stroll: a step every 120ms, covering a little ground each one.
  const n=walk.cycle.length,step=120,speed=(15+d.stage*3)*k,dur=Math.max(2400,dist/speed*1000);floor.dataset.x=nx.toFixed(1);
  floor.style.transition=`transform ${dur}ms linear`;floor.style.transform=`translateX(${nx.toFixed(1)}px)`;
  const t0=performance.now();let j=0;while(performance.now()-t0<dur&&!job.stop){show(walk.cycle[j++%n],true);await sleep(step);}
  if(!job.stop){show(walk.turn,true,260);await sleep(340);}
 }
 // Sit down: turn to face you, then blend into the portrait, which sits in exactly the same spot.
 if(!job.stop){show(walk.front,false,300);await sleep(380);}
 return land();
 // Stopping early (to eat or be petted) freezes them where they are and lets them sit right there.
 function land(){if(job.stop){const m=new DOMMatrix(getComputedStyle(floor).transform);floor.style.transition='none';floor.style.transform=`translateX(${m.m41.toFixed(1)}px)`;floor.dataset.x=m.m41.toFixed(1);}floor.classList.remove('is-moving');w.getAnimations().forEach(a=>a.cancel());if(moving===job)moving=null;}
}
let lifeTimer=0;
function startLife(){
 clearTimeout(lifeTimer);lifeTimer=setTimeout(()=>{
  try{const pf=document.querySelector('.den-stage .pf');const s=pf?game():null;
   if(pf&&s&&!busyNow()&&!document.hidden&&!document.querySelector('dialog[open]')){
    const d=s.dragon,r=Math.random();
    if(d.mood==='sleepy'){if(r<.3)puff(pf);}
    else if(moving){}
    else if(d.stage>=1&&r<.07)stepTo(pf,'fly');
    else if(r<.4)stepTo(pf,'walk');
    else if(r<.65)puff(pf);
    else if(r<.8)pose(pf,'pet',900);
    else if(r<.92)pose(pf,'content',1400);
    else pose(pf,'eat-open',700);}
  }catch{}
  startLife();
 },6000+Math.random()*7000);
}

// ---- Dragon ----
function adoptView(s){
 const c=DRAGON_COLORS[adoptColor],preview={...s.dragon,color:c,mood:'delighted',stage:0,name:'Your dragon'};
 return `<section class="panel adopt"><span class="eyebrow">A visitor at the forge</span><h2>A baby dragon</h2>
 <div class="dragon-stage adopt-stage">${DRAGON_COLORS.map((x,i)=>HAS.dragons.has(`${x.id}-baby`)?`<img class="portrait adopt-portrait ${i===adoptColor?'on':''}" src="./assets/dragons/${x.id}-baby.webp" alt="${i===adoptColor?`A ${x.name.toLowerCase()} baby dragon`:''}" draggable="false">`:'').join('')||dragonSVG(preview,{},{label:'A baby dragon'})}</div>
 <p class="adopt-copy">They crept in to sleep by the coals, and they’ve decided you’re theirs. They grow when you keep your goals, and they never leave.</p>
 <div class="swatches" role="radiogroup" aria-label="Color">${DRAGON_COLORS.map((x,i)=>`<button role="radio" aria-checked="${i===adoptColor}" class="swatch ${i===adoptColor?'on':''}" data-g="color" data-i="${i}" style="--a:${x.body};--b:${x.dark}"><span></span>${x.name}</button>`).join('')}</div>
 <label class="name-field">Name<input id="dragon-name" maxlength="${NAME_MAX}" autocomplete="off" spellcheck="false" placeholder="Give them a name"></label>
 <button class="primary adopt-go" data-g="adopt">${art('heart')} Keep them</button>
 <p class="help">You can rename them for free in their first week, and change their color later with Scale dye.</p></section>`;
}
function petLine(s){const w=petReadyIn(s),d=s.dragon;return w?`${art('hourglass')} ${esc(d.name)} is content. Pet again in ${later(w)}`:`${art('hand')} Stroke ${esc(d.name)} to pet them`;}
function dragonView(s){
 const d=s.dragon;if(!d.named)return adoptView(s);
 const next=STAGES[d.stage+1],treats=ITEMS.filter(x=>x.kind==='treat'&&recipeView(s,x)==='open'),petWait=petReadyIn(s),full=d.fedToday>=d.feedLimit;
 const feed=feedOpen?`<div class="feed-tray">${treats.map(t=>{const ate=d.ateToday.includes(t.id);return `<button class="treat" data-g="feed" data-item="${t.id}" ${s.inventory[t.id]&&!full&&!ate?'':'disabled'} title="${esc(t.desc)}">${pic('items',t.id,t.icon)}<span>${esc(t.name)}</span><b>${s.inventory[t.id]}</b>${ate?'<em>Had one</em>':''}</button>`;}).join('')}<p class="help">${full?`${esc(d.name)} is full for today.`:`Up to ${d.feedLimit} different treats a day. Any treat makes ${esc(d.name)} Well-fed: today’s goals pay 10% more embers.`} <button class="text-link" data-g-go="craft">Cook treats</button></p></div>`:'';
 const slotList=sl=>{const items=ITEMS.filter(x=>x.slot===sl&&s.inventory[x.id]).map(x=>({...ITEM[x.id],type:'item'})),relics=s.relics.filter(r=>r.slot===sl).map(r=>({...r,type:'relic'})),cur=s.equip[sl];
  const all=[...items,...relics];return `<div class="slot-picker">${all.length?all.map(x=>`<button class="pick ${cur?.code===x.code?'on':''}" data-g="equip" data-slot="${sl}" data-code="${cur?.code===x.code?0:x.code}">${x.type==='relic'?coin(x):tile(x)}<span><strong>${esc(x.name)}</strong><small>${esc(powers(x).join(' · ')||x.desc||'')}</small></span><em>${cur?.code===x.code?'Remove':'Wear'}</em></button>`).join(''):`<p class="help">Nothing for this slot yet. Craft gear in the workshop or forge relics that fit.</p>`}</div>`;};
 const slots=SLOTS.map(sl=>{const g=s.equip[sl.key],locked=d.stage<sl.stage;return `<button class="slot ${g?'filled':''} ${locked?'locked':''} ${slotOpen===sl.key?'open':''}" data-g="slot" data-slot="${sl.key}" ${locked?'aria-disabled="true"':''} aria-expanded="${slotOpen===sl.key}"><span class="slot-icon" ${g?.rarity?`style="--r:${RARITIES[g.rarity].color}"`:''}>${locked?art('lock'):g?(g.type==='relic'?pic('relics',g.id,g.icon):pic('items',g.id,g.icon)):art('plus')}</span><small>${sl.label}</small><strong>${locked?`At ${STAGES[sl.stage].name}`:g?esc(g.name):'Empty'}</strong></button>`;}).join('');
 const open=slotOpen&&d.stage>=SLOTS.find(x=>x.key===slotOpen).stage?slotList(slotOpen):'';
 const maxStat=Math.max(40,...Object.values(d.stats)),b=d.bond,total=Math.max(1,b.goals+b.treats+b.pets);
 return `<section class="panel den">
  <div class="den-head"><div><h2>${esc(d.name)}</h2><span class="stage-chip">${d.stageName}</span>${d.fedToday?'<span class="stage-chip fed-chip">Well-fed</span>':''}</div><div class="den-head-end"><span class="mood-chip mood-${d.mood}">${MOOD[d.mood]}</span><button class="icon-button den-more" data-g="care" aria-label="Rename or recolor ${esc(d.name)}">${art('pencil')}</button></div></div>
  <div class="dragon-stage den-stage ${scene('den')?'has-den':''}" ${scene('den')?`style="--den:url('${scene('den')}')"`:''} data-pet role="button" tabindex="0" aria-label="Pet ${esc(d.name)}"><span class="den-floor grow-${d.stage}" data-keep="den" data-sig="${sig(s,d)}">${liveDragon(d,s.equip)}</span><span class="pet-hint ${petWait?'waiting':''}">${petLine(s)}</span></div>
  <p class="quirk">${esc(d.quirk)}</p>
  <div class="bond"><div class="bond-top"><span>Bond</span><small>${next?`${d.xp-d.xpFrom} / ${d.xpTo-d.xpFrom} to ${next.name}`:'Fully grown'}</small></div>${bar(d.progress,'bond-bar')}<div class="bond-split" aria-hidden="true"><span style="--w:${(b.goals/total*100).toFixed(1)}%" class="b-goals"></span><span style="--w:${(b.treats/total*100).toFixed(1)}%" class="b-treats"></span><span style="--w:${(b.pets/total*100).toFixed(1)}%" class="b-pets"></span></div><small class="bond-legend"><i class="b-goals"></i>Goals ${Math.round(b.goals)} <i class="b-treats"></i>Treats ${b.treats} <i class="b-pets"></i>Pets ${b.pets}</small></div>
  <div class="den-actions"><button class="quiet pet-button ${petWait?'waiting':''}" data-g="pet">${art(petWait?'hourglass':'hand')} ${petWait?later(petWait):'Pet'}</button><button class="quiet ${feedOpen?'on':''}" data-g="feed-open" aria-expanded="${feedOpen}">${art('fish')} Feed <b>${treats.reduce((n,t)=>n+s.inventory[t.id],0)}</b></button></div>${feed}
 </section>
 <section class="panel"><div class="section-label">${art('spark')} Strengths <span>from your goals</span></div><div class="stats">${STATS.map(([k,label,from,does])=>`<div class="stat"><div class="stat-top"><strong>${label}</strong><b>${d.stats[k]}</b></div>${bar(d.stats[k]/maxStat,'stat-'+k)}<small>${from} goals · ${does}</small></div>`).join('')}</div></section>
 <section class="panel"><div class="section-label">${art('saddle')} Gear <span>powers for ${esc(d.name)}</span></div><div class="slots">${slots}</div>${open}</section>
 ${growth(s,d)}`;
}
// Growing up: by default just where they are and what's next; tap to see every stage (later ones stay secret).
let growOpen=false;
function growth(s,d){
 const next=STAGES[d.stage+1],toGo=next?Math.max(0,next.xp-d.xp):0;
 const row=(st,i)=>{const known=i<=d.stage+1;return `<li class="${d.stage>=i?'reached':''} ${d.stage===i?'current':''} ${known?'':'unknown'}"><b>${known?st.name:'???'}</b><span>${known?UNLOCKS.filter(u=>u.stage===i).map(u=>u.label).join(' · '):'Keep going to find out'}</span><small>${st.xp?`${st.xp} bond`:'Start'}</small></li>`;};
 const summary=next?`<div class="grow-now"><div><small>Now</small><strong>${esc(d.stageName)}</strong></div><span class="grow-arrow">${art('chevron')}</span><div><small>Next</small><strong>${esc(next.name)}</strong></div><div class="grow-togo"><b>${toGo}</b><small>bond to go</small></div></div><p class="help">Unlocks: ${esc(UNLOCKS.filter(u=>u.stage===d.stage+1).map(u=>u.label).join(' · '))}</p>`:`<div class="grow-now done"><div><small>Fully grown</small><strong>${esc(d.name)} is an Elder</strong></div><span class="grow-crown">${art('crown')}</span></div>`;
 return `<section class="panel growth-panel"><button class="section-label grow-toggle" data-g="grow" aria-expanded="${growOpen}">${art('wing')} Growing up <span>${growOpen?'Hide stages':'All stages'}</span></button>${summary}${growOpen?`<ol class="growth">${STAGES.map(row).join('')}</ol><p class="help">Goals grow bond the most: every craft, every day you show up, and full days most of all. Treats and pets add a little.</p>`:''}</section>`;
}
function careDialog(){
 const s=game(),d=s.dragon,free=freeRename(s);let pick=d.colorIndex;
 const dlg=modal(`<div class="care"><h2>${esc(d.name)}</h2>
  <label class="name-field">New name<input id="care-name" maxlength="${NAME_MAX}" autocomplete="off" spellcheck="false" value="${esc(d.name)}"></label>
  <p class="help">${free?'Free this time: it’s their first week.':s.inventory.scroll?`Uses a Naming scroll (you have ${s.inventory.scroll}).`:'Needs a Naming scroll from the workshop.'}</p>
  <div class="dialog-actions"><button class="primary" data-care="name" ${free||s.inventory.scroll?'':'disabled'}>${art('pencil')} Rename</button></div>
  <div class="swatches" role="radiogroup" aria-label="Color">${DRAGON_COLORS.map((x,i)=>`<button role="radio" aria-checked="${i===pick}" class="swatch ${i===pick?'on':''}" data-care-color="${i}" style="--a:${x.body};--b:${x.dark}"><span></span>${x.name}</button>`).join('')}</div>
  <p class="help">${s.inventory.scaledye?`Uses one Scale dye (you have ${s.inventory.scaledye}).`:'Changing color needs Scale dye from the workshop.'}</p>
  <div class="dialog-actions"><button class="quiet" data-close>Close</button><button class="primary" data-care="color" ${s.inventory.scaledye?'':'disabled'}>${art('palette')} Change color</button></div></div>`,'care-modal');
 dlg.addEventListener('click',async e=>{const c=e.target.closest('[data-care-color]');if(c){pick=Number(c.dataset.careColor);dlg.querySelectorAll('[data-care-color]').forEach(b=>{const on=Number(b.dataset.careColor)===pick;b.classList.toggle('on',on);b.setAttribute('aria-checked',on);});sfx('tap');return;}
  const b=e.target.closest('[data-care]');if(!b)return;try{const st=game();if(b.dataset.care==='name'){await save(renameChanges(st,dlg.querySelector('#care-name').value));sfx('coo',st.dragon.stage);C.toast(`Hello, ${game().dragon.name}.`);}else{await save(recolorChanges(st,pick));sfx('craftItem');C.toast(`${st.dragon.name} is ${DRAGON_COLORS[pick].name} now.`);}dlg.close();}catch(err){sfx('error');C.toast(err.message);}});
}

// ---- Craft ----
const RECIPE_TABS=[['food','Food'],['gear','Gear'],['tool','Tools'],['theme','Themes']];
function craftView(s){
 const mats=['embers',...Object.keys(MATERIALS)];
 const bounty=(b,old=false)=>`<article data-key="bounty:${b.week}:${b.index}" class="bounty ${b.done?'done':''} ${b.claimed?'claimed':''}"><div class="bounty-top">${art('scroll')}<strong>${esc(b.title)}</strong>${old?'<small>Last week</small>':''}</div>${bar(b.progress/b.target)}<div class="bounty-foot"><span class="bounty-n">${b.progress}/${b.target}</span><span class="rewards">${chips(b.reward)}</span>${b.claimed?'<em>Claimed</em>':b.done?`<button class="primary small" data-g="claim" data-week="${b.week}" data-i="${b.index}">Claim</button>`:''}</div></article>`;
 const kinds={food:['treat','supply'],gear:['gear'],tool:['tool'],theme:['theme']}[recipeTab],rank={open:0,next:1,mystery:2};
 const kindRank=k=>['treat','supply','gear','tool','theme'].indexOf(k);
 const list=ITEMS.filter(x=>kinds.includes(x.kind)).map(x=>({x,view:recipeView(s,x)})).filter(r=>r.view!=='hidden').sort((a,b)=>rank[a.view]-rank[b.view]||kindRank(a.x.kind)-kindRank(b.x.kind)||a.x.stage-b.x.stage);
 const hidden=ITEMS.filter(x=>kinds.includes(x.kind)&&recipeView(s,x)==='hidden').length;
 const recipes=list.map(({x,view})=>{
  if(view==='mystery')return `<article data-key="recipe:${x.id}" class="recipe is-mystery"><span class="item-tile mystery">?</span><div class="recipe-body"><strong>A recipe for later</strong><small>Something new for ${STAGES[x.stage].name} dragons.</small></div><span class="locked-chip">${art('lock')} ${STAGES[x.stage].name}</span></article>`;
  const cost=costFor(s,x.id),locked=view==='next',isConsumable=consumable(x),owned=!isConsumable&&s.inventory[x.id],afford=canAfford(s,cost),inUse=x.kind==='theme'&&s.theme===x.theme;
  const slot=x.slot?SLOTS.find(sl=>sl.key===x.slot):null,worn=x.slot&&s.equip[x.slot]?.code===x.code,slotOpenNow=slot&&s.dragon.named&&s.dragon.stage>=slot.stage;
  const action=locked?`<span class="locked-chip">${art('lock')} ${STAGES[x.stage].name}</span>`:owned?(x.kind==='theme'?`<button class="quiet small ${inUse?'on':''}" data-g="theme" data-theme="${inUse?0:x.theme}">${inUse?'In use':'Use'}</button>`:x.slot?(slotOpenNow?`<button class="quiet small ${worn?'on':''}" data-g="wear" data-slot="${x.slot}" data-code="${worn?0:x.code}">${worn?'Remove':'Wear'}</button>`:`<span class="locked-chip">Wear at ${STAGES[slot.stage].name}</span>`):'<em class="owned">Owned</em>'):`<button class="primary small" data-g="craft" data-item="${x.id}" ${afford?'':'disabled'}>Craft</button>`;
  return `<article data-key="recipe:${x.id}" class="recipe ${locked?'is-locked':''} ${owned?'is-owned':''}">${tile(x,isConsumable&&s.inventory[x.id]?`<b>${s.inventory[x.id]}</b>`:'')}<div class="recipe-body"><strong>${esc(x.name)}</strong><small>${esc(x.desc)}</small>${owned||locked?'':`<span class="costs">${Object.entries(cost).map(([k,n])=>chip(k,n,(s.wallet[k]||0)<n)).join('')}</span>`}</div>${action}</article>`;}).join('');
 return `<section class="panel wallet-panel"><div class="section-label">${art('chest')} Your stores <span>tap for sources</span></div><div class="wallet">${mats.map(k=>`<button class="wallet-item ${s.wallet[k]?'':'empty'} ${MATERIALS[k]?.rare?'rare':''}" style="--c:${matColor(k)}" data-g="source" data-mat="${k}">${matIcon(k)}<b>${s.wallet[k]}</b><small>${esc(SHORT[k]||matName(k))}</small></button>`).join('')}</div>
  <details class="how" data-key="how-mats"><summary>Where materials come from</summary><ul class="sources">${mats.map(k=>`<li style="--c:${matColor(k)}">${matIcon(k)}<span><strong>${esc(matName(k))}</strong>${esc(SOURCES[k])}</span></li>`).join('')}</ul><p>Bigger efforts pay more: full days, perfect weeks, long streaks and hard bounties pay the most. Free-play games drop a few scraps a day.</p></details></section>
 <section class="panel"><div class="section-label">${art('scroll')} Bounty board <span>new ones every Monday</span></div><div class="bounties">${s.lastWeekBounties.map(b=>bounty(b,true)).join('')}${s.bounties.map(b=>bounty(b)).join('')}</div></section>
 <section class="panel"><div class="section-label">${art('hammer')} Workshop</div><div class="seg" role="tablist">${RECIPE_TABS.map(([k,l])=>`<button role="tab" aria-selected="${recipeTab===k}" class="${recipeTab===k?'on':''}" data-g="tab" data-tab="${k}">${l}</button>`).join('')}</div><div class="recipes">${recipes}</div>${hidden?'<p class="help secret-hint">Some recipes aren’t unlocked by growing. They’re found.</p>':''}</section>`;
}

// ---- Games ----
function gamesView(s){
 const a=s.anvilToday,c=s.catchToday,w=s.wingToday,catchOpen=s.unlocked.has('catch'),wingOpen=s.unlocked.has('wingbeat'),lvl=chosenLevel(s),sc=s.scrapToday,cap=s.scrapCap;
 // A painted scene for each game, drifting slowly. No dragon on them: the game itself is where they fly.
 const img=(kind,id,cls)=>HAS[kind].has(id)?`<img class="${cls}" src="./assets/${kind}/${id}.webp" alt="" loading="lazy" draggable="false">`:'';
 const scene=(id,fallback)=>`<div class="game-banner gb-${id}" aria-hidden="true">${img('banners',id,'gb-bg gb-pan')||fallback}</div>`;
 const banner={wing:scene('wing',img('wing','sky-day','gb-bg')),anvil:scene('anvil',img('scenes','smithy','gb-bg')),catch:scene('catch',img('scenes','sky','gb-bg'))};
 const status=(g,needs)=>g.played?`<span class="g-status done">${art('check')} Today’s reward earned · free play still drops scraps</span>`:g.eligible?`<span class="g-status ready">${art('gift')} Rewarded run ready</span>`:`<span class="g-status">${art('lock')} ${needs}</span>`;
 return `<section class="panel scraps"><div class="section-label">${art('chest')} Free-play scraps today</div><div class="scrap-bars"><div><small>Embers ${sc.embers}/${cap.embers}</small>${bar(sc.embers/cap.embers)}</div><div><small>Materials ${sc.mats}/${cap.mats}</small>${bar(sc.mats/cap.mats)}</div></div><p class="help">Play as much as you like. Free play drops a few scraps a day; goals unlock the big rewarded runs.</p></section>
 <section class="panel game-card wing-card ${wingOpen?'':'is-locked'}">${banner.wing}<div class="game-body"><h2>Wingbeat</h2><p>${esc(s.dragon.named?s.dragon.name:'Your dragon')} flaps between the sea stacks and scoops up glowing materials. It never ends; it just gets faster.</p>${wingOpen?`${status(w,'Craft every daily goal today for a rewarded run')}<div class="wing-levels" role="radiogroup" aria-label="Sky">${WING_LEVELS.slice(1).map((L,i)=>{const n=i+1,open=s.dragon.stage>=L.stage;return `<button role="radio" aria-checked="${n===lvl}" class="${n===lvl?'on':''}" data-g="wlevel" data-level="${n}" ${open?'':'disabled'} title="${open?`Pays ×${L.pay}`:`Opens at ${STAGES[L.stage].name}`}">${open?'':art('lock')}${L.name}</button>`;}).join('')}</div><div class="game-actions"><button class="primary" data-g="play" data-game="wing">${art('play')} ${w.eligible&&!w.played?'Rewarded run':'Free play'}</button></div><small class="g-note">${s.wingBest?`Best ${s.wingBest} · `:''}Harder skies open as ${esc(s.dragon.named?s.dragon.name:'your dragon')} grows, and pay more.</small>`:`<span class="g-status">${art('lock')} Opens when your dragon is a Fledgling and can fly</span>`}</div></section>
 <section class="panel game-card anvil-card">${banner.anvil}<div class="game-body"><h2>Anvil Strike</h2><p>Strike when the needle hits the gold. Six blows shape the blade. Perfect strikes chain into combos.</p>${status(a,'Craft half of today’s goals for a rewarded run')}<div class="game-actions"><button class="primary" data-g="play" data-game="anvil">${art('play')} ${a.eligible&&!a.played?'Rewarded run':'Free play'}</button></div><small class="g-note">Three perfect strikes in a rewarded run shake loose starmetal.</small></div></section>
 <section class="panel game-card catch-card ${catchOpen?'':'is-locked'}">${banner.catch}<div class="game-body"><h2>Ember Catch</h2><p>${esc(s.dragon.named?s.dragon.name:'Your dragon')} catches falling embers. Golden ones are worth five. Dodge frost shards and ash.</p>${catchOpen?status(c,'Craft a goal today for a rewarded run'):`<span class="g-status">${art('lock')} Opens when your dragon is a ${STAGES[UNLOCKS.find(u=>u.key==='catch').stage].name}</span>`}<div class="game-actions"><button class="primary" data-g="play" data-game="catch" ${catchOpen?'':'disabled'}>${art('play')} ${catchOpen&&c.eligible&&!c.played?'Rewarded run':'Free play'}</button></div>${catchOpen&&s.catchBest?`<small class="g-note">Best ${s.catchBest}</small>`:''}</div></section>`;
}

// ---- Vault ----
function vaultView(s){
 const owned=new Map(s.relics.map(r=>[r.id,r])),order=['common','rare','epic','legendary'];
 const sorted=[...RELICS].sort((a,b)=>order.indexOf(a.rarity)-order.indexOf(b.rarity)||a.code-b.code);
 const f=s.forge,ready=s.achievements.filter(a=>a.ready),readyMats={};for(const a of ready)for(const [m,n]of Object.entries(a.mats||{}))readyMats[m]=(readyMats[m]||0)+n;
 const relics=`<section class="panel vault-head"><div class="vault-count"><strong>${s.relics.length}</strong><small>/ ${RELICS.length} relics</small></div><div class="vault-next"><span>Next relic</span>${bar(f.progress,'crucible-mini')}<small>${f.toNext} more heat</small></div><div class="rarity-legend">${order.map(k=>`<span style="--r:${RARITIES[k].color}"><i></i>${RARITIES[k].label} ${s.relics.filter(r=>r.rarity===k).length}</span>`).join('')}</div></section>
  <details class="panel collections" data-key="collections" ${read('blastforge-collections-v1',s.relics.length?'1':'0')==='1'?'open':''}><summary><span class="mini-head">Collections</span><small>${s.sets.filter(x=>x.done).length} of ${s.sets.length} complete</small><span class="col-chev">${art('chevron')}</span></summary><div class="set-list">${s.sets.map(x=>`<div class="set-row ${x.done?'done':''}"><div class="set-top"><strong>${esc(x.name)}</strong><small>${x.have} / ${x.size}</small></div><div class="set-pips">${Array.from({length:x.size},(_,i)=>`<i class="${i<x.have?'on':''}"></i>`).join('')}</div><small class="set-bonus">${x.done?`${art('spark')} Active: `:'Complete it: '}${esc(x.bonus)}</small></div>`).join('')}</div></details>
  <section class="panel"><div class="relic-grid">${sorted.map(r=>{const o=owned.get(r.id);return o?`<button class="relic-cell" data-g="relic" data-id="${r.id}" aria-label="${esc(r.name)}, ${RARITIES[r.rarity].label}">${coin(r)}<small>${esc(r.name)}</small></button>`:`<span class="relic-cell unknown" aria-label="Undiscovered ${RARITIES[r.rarity].label} relic"><span class="relic-coin unknown rar-${r.rarity}" style="--r:${RARITIES[r.rarity].color}">?</span><small>${RARITIES[r.rarity].label}</small></span>`;}).join('')}</div><p class="help">The forge makes relics as your heat fills the crucible. Long streaks raise the odds of rare ones. Tap a relic to see it up close; some can be worn.</p></section>`;
 const achievements=`<section class="panel">${ready.length?`<button class="primary claim-all" data-g="ach">${art('gift')} Claim ${ready.length} achievement${ready.length>1?'s':''} · ${chip('embers',ready.reduce((n,a)=>n+a.reward,0))}${chips(readyMats)}</button>`:''}<div class="ach-list">${s.achievements.filter(a=>!a.secret||a.got||a.ready).map(a=>`<div class="ach ${a.got?'got':''} ${a.ready?'ready':''}"><span class="ach-icon">${art(a.icon)}</span><span class="ach-body"><strong>${esc(a.name)}</strong><small>${esc(a.desc)}</small></span><span class="ach-end">${a.got?`<small>${new Date(a.date+'T12:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}</small>`:`${chip('embers',a.reward)}${chips(a.mats||{})}`}</span></div>`).join('')}${s.achievements.filter(a=>a.secret&&!a.got&&!a.ready).map(()=>`<div class="ach secret"><span class="ach-icon">?</span><span class="ach-body"><strong>Secret</strong><small>Found by doing something unusual.</small></span></div>`).join('')}</div><p class="help">${s.achievements.filter(a=>a.got).length} of ${ACHIEVEMENTS.length} earned.</p></section>`;
 return `<div class="seg vault-seg" role="tablist"><button role="tab" aria-selected="${vaultTab==='relics'}" class="${vaultTab==='relics'?'on':''}" data-g="vtab" data-tab="relics">Relics</button><button role="tab" aria-selected="${vaultTab==='ach'}" class="${vaultTab==='ach'?'on':''}" data-g="vtab" data-tab="ach">Achievements${ready.length?` <b class="seg-dot">${ready.length}</b>`:''}</button></div>${vaultTab==='relics'?relics:achievements}`;
}
function openRelic(id){
 const s=game(),r=s.relics.find(x=>x.id===id);if(!r)return;const rar=RARITIES[r.rarity],sl=r.slot?SLOTS.find(x=>x.key===r.slot):null,worn=r.slot&&s.equip[r.slot]?.code===r.code,canWear=sl&&s.dragon.named&&s.dragon.stage>=sl.stage;
 const dlg=modal(`<div class="relic-detail rar-${r.rarity}" style="--r:${rar.color}"><div class="relic-spin">${coin(r,'big')}</div><span class="rarity-label">${rar.label} · ${esc(r.set)}</span><h2>${esc(r.name)}</h2><p class="lore">${esc(r.lore)}</p>${sl?`<div class="relic-power"><strong>Wear it · ${sl.label}</strong><span>${esc(powers(r).join(' · ')||'A handsome piece of kit.')}</span></div>`:''}${(()=>{const set=RELICS.filter(x=>x.set===r.set),have=new Set(s.relics.map(x=>x.id));const st=s.sets.find(x=>x.name===r.set);return `<div class="relic-set ${st?.done?'done':''}"><small>${esc(r.set)} collection · ${set.filter(x=>have.has(x.id)).length} of ${set.length} found</small><div class="relic-set-row">${set.map(x=>have.has(x.id)?coin(x,'mini'):`<span class="relic-coin unknown mini rar-${x.rarity}" style="--r:${RARITIES[x.rarity].color}">?</span>`).join('')}</div>${st?`<small class="set-bonus">${st.done?`${art('spark')} Collection bonus active: `:'Complete it for a lasting bonus: '}${esc(st.bonus)}</small>`:''}</div>`;})()}<small class="forged-on">Forged ${new Date(r.date+'T12:00').toLocaleDateString('en-US',{month:'long',day:'numeric'})} · relic ${r.index+1} from your forge</small><div class="dialog-actions">${sl?(canWear?`<button class="primary" data-g="equip" data-slot="${r.slot}" data-code="${worn?0:r.code}">${worn?'Take it off':`Wear it`}</button>`:`<span class="help">${s.dragon.named?`The ${sl.label.toLowerCase()} slot opens at ${STAGES[sl.stage].name}.`:'Adopt your dragon to wear relics.'}</span>`):''}<button class="quiet" data-close>Close</button></div></div>`,'relic-modal');
 sfx('open');return dlg;
}

// ---- Isles ----
function blob(cx,cy,r,seed){const n=11,pts=[];for(let i=0;i<n;i++){const a=i/n*Math.PI*2,k=.74+hash(`${seed}${i}`)*.48;pts.push([cx+Math.cos(a)*r*k*1.3,cy+Math.sin(a)*r*k*.82]);}let d=`M${((pts[n-1][0]+pts[0][0])/2).toFixed(1)} ${((pts[n-1][1]+pts[0][1])/2).toFixed(1)}`;for(let i=0;i<n;i++){const p=pts[i],q=pts[(i+1)%n];d+=`Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${((p[0]+q[0])/2).toFixed(1)} ${((p[1]+q[1])/2).toFixed(1)}`;}return d+'Z';}
const routePath=(a,b)=>{const mx=(a.x+b.x)/2+(b.y-a.y)*.18,my=(a.y+b.y)/2-(b.x-a.x)*.18;return {d:`M${a.x} ${a.y}Q${mx} ${my} ${b.x} ${b.y}`,mx,my};};
let mapRegion=0;
function islesView(s){
 const plan=flightPlan(s),here=ISLES[s.isle],reached=s.isle>=10?2:1;if(mapRegion>reached)mapRegion=0;const region=REGIONS[(mapRegion||reached)-1];
 // Only where you've been and the very next island show; the rest of the map stays in the fog.
 const idx=ISLES.map((x,i)=>i).filter(i=>(ISLES[i].region||1)===region.id),start=region.id===2?{...ISLES[10],x:180,y:500,ghost:true}:null;
 const nodes=[...(start?[start]:[]),...idx.map(i=>({...ISLES[i],i}))];
 const routes=nodes.slice(1).map((b,k)=>{const a=nodes[k],{d}=routePath(a,b);return `<path d="${d}" class="route ${b.i<=s.isle?'flown':b.i===s.isle+1?'next':''}"/>`;}).join('');
 const isles=nodes.filter(x=>!x.ghost).map(x=>{const i=x.i,seen=i<=s.isle,next=i===s.isle+1,known=seen||next,r=i===0?24:i===10||i===20?22:15+hash(x.id)*6,painted=HAS.isles.has(x.id),R=r*2;
  if(!known)return `<g class="isle fogged-deep"><ellipse cx="${x.x}" cy="${x.y}" rx="${R*.9}" ry="${R*.55}" class="isle-fog"/></g>`;
  return `<g class="isle ${seen?'visited':''} ${next?'next':''} ${painted?'painted':''}" data-g="isle" data-i="${i}">${painted?`${next?`<ellipse cx="${x.x}" cy="${x.y+2}" rx="${R*.95}" ry="${R*.7}" class="isle-ring"/>`:''}<image href="./assets/isles/${x.id}.webp" x="${x.x-R}" y="${x.y-R}" width="${R*2}" height="${R*2}"/>`:`<path d="${blob(x.x,x.y+3,r+5,x.id+'s')}" class="shoal"/><path d="${blob(x.x,x.y,r,x.id)}" class="land"/>`}<text x="${x.x}" y="${x.y+r*.82+14}" class="isle-name">${esc(x.name)}</text>${next&&x.needs?`<g class="needs ${plan?.missing?'missing':''}" transform="translate(${x.x+r+4} ${x.y-r})"><circle r="9"/><text y="4">${{storm:'⚡',frost:'❄',light:'✦'}[x.needs]}</text></g>`:''}</g>`;}).join('')+(start?`<g class="isle visited"><text x="${start.x}" y="${start.y-6}" class="isle-name">from Dawnspire</text></g>`:'');
 const fly=s.dragon.named&&poseSrc(s.dragon,'fly-up')&&poseSrc(s.dragon,'fly-down')?{up:poseSrc(s.dragon,'fly-up'),down:poseSrc(s.dragon,'fly-down')}:null,src=s.dragon.named?portraitSrc(s.dragon):null;
 const at=(here.region||1)===region.id?here:start||here;
 const marker=`<g class="flyer" transform="translate(${at.x} ${at.y-6})"><circle r="15" class="flyer-ring"/>${fly?`<image href="${fly.up}" x="-22" y="-26" width="44" height="44" class="flyer-dragon flap-up"/><image href="${fly.down}" x="-22" y="-26" width="44" height="44" class="flyer-dragon flap-down"/>`:src?`<image href="${src}" x="-17" y="-24" width="34" height="34" class="flyer-dragon"/>`:''}</g>`;
 const seaArt=scene(region.sea)||scene('sea');
 const map=`<svg class="isle-map" viewBox="0 0 360 520" role="img" aria-label="Map of ${esc(region.name)}. You are at ${esc(here.name)}."><defs><radialGradient id="sea" cx=".5" cy=".45" r=".75"><stop offset="0" stop-color="${region.id===2?'#1a2a52':'#1d4a5a'}"/><stop offset="1" stop-color="#0c1428"/></radialGradient><pattern id="waves" width="40" height="22" patternUnits="userSpaceOnUse"><path d="M2 12q8-6 16 0t16 0" fill="none" stroke="#7fd8ff" stroke-opacity=".09" stroke-width="1.4"/></pattern></defs>${seaArt?`<image href="${seaArt}" width="360" height="520" preserveAspectRatio="xMidYMid slice"/>`:`<rect width="360" height="520" fill="url(#sea)"/>`}<rect width="360" height="520" fill="url(#waves)" class="sea-waves"/>${routes}${isles}${(here.region||1)===region.id||region.id===2?marker:''}</svg>`;
 const tabs=reached===2?`<div class="seg map-seg" role="tablist">${REGIONS.map(r=>`<button role="tab" aria-selected="${r.id===region.id}" class="${r.id===region.id?'on':''}" data-g="region" data-region="${r.id}">${esc(r.name)}</button>`).join('')}</div>`:'';
 const req=plan?.missing?{storm:'Equip storm gear: a Storm cloak or a storm relic.',frost:'Equip frost gear: a Frost charm, Frost mantle or a frost relic.',light:'Equip a light: a Glowmoss lantern or a light relic.'}[plan.missing]:'';
 const flight=!plan?`<section class="panel flight done"><h2>The edge of the map</h2><p>You and ${esc(s.dragon.name)} have flown every route. Riders will tell this story for years.</p></section>`:
  `<section class="panel flight"><div class="flight-top"><span class="eyebrow">Next flight</span><span class="energy-chip">${art('bolt')}<b>${s.energy.available}</b> energy</span></div><h2>${esc(plan.to.name)}</h2><p>${esc(plan.to.desc)}</p>
  <div class="flight-needs"><span class="${s.energy.available>=plan.cost?'ok':'short'}">${art('bolt')} ${plan.cost} energy</span>${plan.rations?`<span class="${(s.inventory.rations||0)>=1?'ok':'short'}">${art('rations')} Flight rations</span>`:''}${plan.to.needs?`<span class="${plan.missing?'short':'ok'}">${art({storm:'cloak',frost:'snow',light:'lantern'}[plan.to.needs])} ${esc(TAGS[plan.to.needs])}</span>`:''}</div>
  <div class="flight-reward"><small>Reward</small>${chips(plan.reward)}</div>
  ${!s.unlocked.has('isles')?`<p class="help">${art('lock')} Flights unlock when your dragon is a Fledgling.</p>`:req?`<p class="help">${esc(req)}</p>`:''}
  <button class="primary fly" data-g="fly" ${plan.ok?'':'disabled'}>${art('wing')} Fly to ${esc(plan.to.name)}</button>
  <details class="how" data-key="how-flight"><summary>How flight energy works</summary><p>Each day you craft every daily goal earns 2 energy, and half of them earns 1. Saddles, goggles and swift relics shave energy off each flight. Long flights need rations unless you ride with a Pack saddle.</p></details></section>`;
 return `${tabs}<section class="panel map-panel">${map}<div class="map-here"><span>${art('map')} ${esc(here.name)}</span><small>${region.id===1?`${Math.min(s.isle,10)} of 10 islands in ${esc(region.name)}`:`${Math.max(0,s.isle-10)} of 10 islands in ${esc(region.name)}`}</small></div></section>${flight}`;
}
async function flyAnimation(s){
 const plan=flightPlan(s),b=plan.to,a=(b.region||1)!==(ISLES[s.isle].region||1)?{x:180,y:500}:ISLES[s.isle],flyer=document.querySelector('.flyer');sfx('whoosh');mapRegion=0;
 if(!flyer||reduced())return;const {mx,my}=routePath(a,b);
 await new Promise(res=>{const t0=performance.now(),dur=1900;const step=now=>{const t=Math.min(1,(now-t0)/dur),e=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2,x=(1-e)**2*a.x+2*(1-e)*e*mx+e*e*b.x,y=(1-e)**2*a.y+2*(1-e)*e*my+e*e*b.y-6-Math.sin(e*Math.PI)*18;flyer.setAttribute('transform',`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${1+Math.sin(e*Math.PI)*.45})`);if(t<1)requestAnimationFrame(step);else res();};requestAnimationFrame(step);});
}

// Landing somewhere new: the island waits in the fog, your dragon glides in, the fog lifts, they land.
export async function arrival(to,reward={}){
 const d=game().dragon,isle=HAS.isles.has(to.id)?`./assets/isles/${to.id}.webp`:null,ff=d.named?flyFrames(d):null,sit=d.named?portraitSrc(d):null,region=REGIONS.find(r=>r.id===(to.region||1))||REGIONS[0],sea=scene(region.sea)||scene('sea');
 const still=reduced();if(ff?.strip)await preload([ff.strip.src]);
 const dlg=modal(`<div class="arrival ${still?'still':''}" style="${sea?`--sea:url('${sea}')`:''}"><div class="arr-sea"></div><div class="arr-isle">${isle?`<img src="${isle}" alt="">`:`<span class="big-icon">${art('map')}</span>`}</div><div class="arr-fog f1"></div><div class="arr-fog f2"></div><div class="arr-fog f3"></div>${ff||sit?`<div class="arr-dragon">${ff?'<i class="arr-fly"></i>':''}${sit?`<img class="arr-sit" src="${sit}" alt="">`:''}</div>`:''}<div class="arr-text"><span class="eyebrow">You landed on</span><h2>${esc(to.name)}</h2><p>${esc(to.desc)}</p><div class="arr-reward">${chips(reward)}</div><button class="primary" data-close>Explore</button></div></div>`,'arrival-modal');
 const box=dlg.querySelector('.arrival'),el=dlg.querySelector('.arr-fly');
 if(still||!el){box.classList.add('landed');sfx('claim');return dlg;}
 const n=ff.cycle.length;let k=0;
 const show=f=>{el.style.backgroundImage=`url(${f.src})`;el.style.backgroundSize=f.n>1?`${f.n*100}% 100%`:'contain';el.style.backgroundPosition=f.n>1?`${f.i/(f.n-1)*100}% 0`:'center';};
 if(ff.strip){const probe=new Image();probe.src=ff.strip.src;if(probe.naturalWidth)el.style.aspectRatio=`${probe.naturalWidth/ff.strip.n} / ${probe.naturalHeight}`;}
 show(ff.cycle[0]);sfx('flap');
 const iv=setInterval(()=>show(ff.cycle[++k%n]),Math.round(560/n));
 const land=setTimeout(()=>{clearInterval(iv);box.classList.add('landed');sfx('claim');},2500);
 dlg.addEventListener('close',()=>{clearInterval(iv);clearTimeout(land);});
 return dlg;
}

// ---- modal and celebration ----
function modal(html,cls=''){
 const dlg=document.createElement('dialog');dlg.className=`modal game-modal ${cls}`;dlg.innerHTML=html;document.body.append(dlg);
 dlg.addEventListener('close',()=>dlg.remove());dlg.addEventListener('click',e=>{if(e.target.closest('[data-close]'))return dlg.close();if(e.target===dlg){const r=dlg.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dlg.close();}});
 dlg.addEventListener('click',e=>{const b=e.target.closest('[data-g]');if(b){act(b).then(()=>{if(b.dataset.g==='equip')dlg.close();});}});
 dlg.showModal();dlg.scrollTop=0;requestAnimationFrame(()=>{dlg.scrollTop=0;});return dlg;
}
export function celebrate({title,sub='',art:visual='',lines=[],sound='levelUp',button='Wonderful',onClose=null}){
 sfx(sound);const dlg=modal(`<div class="celebrate"><span class="rays" aria-hidden="true"></span><div class="celebrate-visual">${visual}</div><h2>${esc(title)}</h2>${sub?`<p>${esc(sub)}</p>`:''}${lines.length?`<ul>${lines.map(l=>`<li>${art('spark')}${esc(l)}</li>`).join('')}</ul>`:''}<button class="primary" data-close>${esc(button)}</button></div>`,'celebrate-modal');
 if(onClose)dlg.addEventListener('close',onClose);return dlg;
}
// First visit after the update: a short welcome, once, after the board has synced (so a second
// device doesn't greet you about a dragon you already adopted).
export function introOnce(){
 if(read('blastforge-game-intro-v1','0')==='1'||document.querySelector('dialog[open]'))return;const s=game();write('blastforge-game-intro-v1','1');if(s.dragon.named)return;
 celebrate({title:'Your goals have a world now',sub:'Welcome to the Bestia Alata Islands, where riders and dragons share the sky (not always politely).',art:HAS.dragons.has('ember-baby')?'<img class="portrait intro-portrait" src="./assets/dragons/ember-baby.webp" alt="">':dragonSVG({...s.dragon,mood:'delighted',name:'A baby dragon'},{}),lines:['Every goal you craft earns embers and materials','A baby dragon is waiting by the forge','Craft gear, forge relics, fly to new islands','Games unlock as you finish your day'],sound:'open',button:'Show me around',onClose:()=>C.tour?C.tour():C.go?.('dragon')});
}
// Growth, shown once per stage on this device.
export function checkMilestones(){
 const s=game(),d=s.dragon;if(!d.named||document.querySelector('dialog[open]'))return;
 const seen=Number(read('blastforge-stage-seen-v1','-1'));
 if(seen<0||d.stage<seen){write('blastforge-stage-seen-v1',d.stage);return;}
 if(d.stage>seen){write('blastforge-stage-seen-v1',d.stage);celebrate({title:`${d.name} is ${/^[AEIOU]/.test(d.stageName)?'an':'a'} ${d.stageName} now`,sub:'All those goals added up.',art:portrait(d,s.equip),lines:UNLOCKS.filter(u=>u.stage>seen&&u.stage<=d.stage).map(u=>`Unlocked: ${u.label}`)});}
}

// ---- rendering and actions ----
export function renderSection(section){
 const s=game();
 return section==='dragon'?dragonView(s):section==='craft'?craftView(s):section==='games'?gamesView(s):section==='vault'?vaultView(s):islesView(s);
}
async function save(changes){await C.Store.setMany(changes);}
const ITEM_OF=code=>game().byCode[code];
// Hearts rise from where your finger is.
function heartAt(host,x,y,big=false){if(reduced())return;const el=document.createElement('span');el.className=`dragon-fx fx-heart ${big?'big':''}`;el.setAttribute('data-own','');el.textContent='❤';el.setAttribute('aria-hidden','true');el.style.left=`${x}px`;el.style.top=`${y}px`;host.append(el);el.animate([{transform:'translate(-50%,-50%) scale(.4)',opacity:0},{transform:`translate(calc(-50% + ${(Math.random()-.5)*24}px),calc(-50% - 26px)) scale(1)`,opacity:1,offset:.25},{transform:`translate(calc(-50% + ${(Math.random()-.5)*60}px),calc(-50% - ${70+Math.random()*40}px)) scale(.7)`,opacity:0}],{duration:1100+Math.random()*500,easing:'cubic-bezier(.2,.7,.3,1)'}).onfinish=()=>el.remove();}
// A finished pet: bond if it's been long enough, a contented reaction either way.
async function finishPet(host,pf){
 const s=game(),d=s.dragon,w=petReadyIn(s);
 if(w>0){pose(pf,'nuzzle',1600);sfx('purr',d.stage,.8);C.toast(`${d.name} loves it, but they’re already content. Pet again in ${later(w)} for bond.`);return;}
 try{await save(petChanges(s));}catch(err){C.toast(err.message);return;}
 hold(3400);
 const r=host.getBoundingClientRect();for(let i=0;i<7;i++)setTimeout(()=>heartAt(host,r.width*(.3+Math.random()*.4),r.height*(.35+Math.random()*.25),i%3===0),i*90);
 {const p=document.querySelector('.den-stage .pf');pose(p,'flop',1900);setTimeout(()=>{if(p?.isConnected&&(p.dataset.pose==='flop'||!p.dataset.pose))pose(p,'content',1300);},1900);}sfx('content',d.stage);C.toast(`${d.name} melts. +${d.ateToday.includes('jam')?4:2} bond. Pet again in ${PET_COOLDOWN/60} hours.`);
}
// Stroke the dragon: they lean into your hand and purr; a long enough stroke counts as a pet.
function bindPetting(){
 document.addEventListener('pointerdown',e=>{
  const host=e.target.closest('.den-stage[data-pet]');if(!host||e.button>0||petBusy)return;const pf=host.querySelector('.pf');if(!pf)return;
  e.preventDefault();petBusy=true;let dist=0,last={x:e.clientX,y:e.clientY},lastHeart=0,purrAt=0,done=false;const t0=performance.now(),stage=game().dragon.stage;
  const r=host.getBoundingClientRect();host.classList.add('stroking');try{host.setPointerCapture(e.pointerId);}catch{}let posed=false;
  const finish=(completed,cancelled=false)=>{host.removeEventListener('pointermove',move);host.removeEventListener('pointerup',up);host.removeEventListener('pointercancel',cancel);host.classList.remove('stroking');pf.style.removeProperty('--lean');
   const tap=!completed&&!cancelled&&dist<12&&performance.now()-t0<400;if(tap&&moving)moving.stop=true;petBusy=false;if(!completed&&posed)pose(pf,pf.dataset.pose||'pet',700);
   if(completed)finishPet(host,pf);else if(tap){pose(pf,'pet',600);sfx('coo',stage);const hint=host.querySelector('.pet-hint');hint?.classList.remove('nudge');void hint?.offsetWidth;hint?.classList.add('nudge');}
   };
  const move=ev=>{const dx=ev.clientX-last.x,dy=ev.clientY-last.y;dist+=Math.hypot(dx,dy);if(dist>12&&moving)moving.stop=true;last={x:ev.clientX,y:ev.clientY};const k=Math.max(-1,Math.min(1,(ev.clientX-(r.left+r.width/2))/(r.width/2)));pf.style.setProperty('--lean',`${(k*5*(pf.closest('.den-floor')?.dataset.dir==='-1'?-1:1)).toFixed(2)}deg`);
   const now=performance.now();if(now-lastHeart>260&&dist>30){lastHeart=now;heartAt(host,ev.clientX-r.left,ev.clientY-r.top);}
   if(!posed&&dist>40){posed=true;pose(pf,'pet');}
   if(posed&&dist>170&&pf.dataset.pose==='pet')pose(pf,'nuzzle');
   if(now-purrAt>900&&dist>20){purrAt=now;sfx('purr',stage,1);}
   if(!done&&dist>320){done=true;finish(true);}};
  const up=()=>{if(!done)finish(false);},cancel=()=>{if(!done)finish(false,true);};
  host.addEventListener('pointermove',move);host.addEventListener('pointerup',up);host.addEventListener('pointercancel',cancel);
 });
}
// The Pet button strokes for you, for anyone who can't or would rather not drag.
async function autoPet(){
 const host=document.querySelector('.den-stage[data-pet]'),pf=host?.querySelector('.pf');if(!host||!pf||petBusy)return;petBusy=true;await settle();if(!pf.isConnected){petBusy=false;return;}
 pose(pf,'pet');const r=host.getBoundingClientRect(),stage=game().dragon.stage,hand=document.createElement('span');hand.className='pet-hand';hand.setAttribute('data-own','');hand.innerHTML=art('hand');host.append(hand);host.classList.add('stroking');sfx('purr',stage,1.6);
 const path=[[.3,.45],[.62,.42],[.36,.5],[.66,.47],[.45,.44]];
 let step=0;for(const [x,y]of path){if(++step===3)pose(pf,'nuzzle');hand.style.left=`${x*100}%`;hand.style.top=`${y*100}%`;pf.style.setProperty('--lean',`${((x-.5)*10).toFixed(1)}deg`);heartAt(host,r.width*x,r.height*y);await wait(reduced()?60:300);}
 hand.remove();host.classList.remove('stroking');pf.style.removeProperty('--lean');petBusy=false;await finishPet(host,pf);
}
// Feeding: the treat flies to the dragon's mouth; they gape, chew and lick their lips.
async function feedAnimation(btn){
 const host=document.querySelector('.den-stage'),pf=host?.querySelector('.pf'),src=btn?.querySelector('img')?.src;if(!host||!pf||!btn||reduced())return;
 const s=game(),[mx0,my]=mouthOf(portraitId(s.dragon)),mx=pf.closest('.den-floor')?.dataset.dir==='-1'?100-mx0:mx0,pr=pf.getBoundingClientRect(),from=btn.getBoundingClientRect(),tx=pr.left+pr.width*mx/100,ty=pr.top+pr.height*my/100;
 hold(3600);pose(pf,'eat-open');const el=document.createElement('span');el.className='flying-treat';el.innerHTML=src?`<img src="${src}" alt="">`:art('fish');document.body.append(el);
 const x0=from.left+from.width/2,y0=from.top+from.height/2;
 await el.animate([{transform:`translate(${x0}px,${y0}px) translate(-50%,-50%) scale(1)`,opacity:1},{transform:`translate(${(x0+tx)/2}px,${Math.min(y0,ty)-60}px) translate(-50%,-50%) scale(.9)`,offset:.55},{transform:`translate(${tx}px,${ty}px) translate(-50%,-50%) scale(.35)`,opacity:.9}],{duration:700,easing:'cubic-bezier(.4,0,.3,1)'}).finished.catch(()=>{});
 el.remove();{const p=document.querySelector('.den-stage .pf');pose(p,'eat',1400);setTimeout(()=>{if(p?.isConnected&&(p.dataset.pose==='eat'||!p.dataset.pose))pose(p,'content',1300);},1400);}sfx('munch',s.dragon.stage);

}
export async function act(b){
 const s=game(),g=b.dataset.g;
 try{
  if(g==='color'){adoptColor=Number(b.dataset.i);sfx('tap');C.render();}
  else if(g==='adopt'){const name=document.getElementById('dragon-name')?.value||'';const changes=adoptChanges(s,name,adoptColor);await save(changes);write('blastforge-stage-seen-v1',0);const n=game().dragon;celebrate({title:`Welcome, ${n.name}`,sub:'Keep your goals and they’ll grow. They’ll never leave.',art:portrait(n,{}),sound:'roar',button:'Hello'});}
  else if(g==='pet')await autoPet();
  else if(g==='care')careDialog();
  else if(g==='feed-open'){feedOpen=!feedOpen;sfx('tap');C.render();}
  else if(g==='feed'){if(feedBusy)return;feedBusy=true;try{const it=ITEM[b.dataset.item],rect=b.getBoundingClientRect(),img=b.querySelector('img')?.src;await settle();const st=game();await save(feedChanges(st,it.id));C.toast(`${st.dragon.name} loved the ${it.name.toLowerCase()}. +${it.bond} bond.`);const ghost=document.createElement('span');ghost.getBoundingClientRect=()=>rect;ghost.innerHTML=img?`<img src="${img}">`:'';await feedAnimation(ghost);}finally{feedBusy=false;}}
  else if(g==='slot'){if(b.getAttribute('aria-disabled')==='true'){sfx('error');const sl=SLOTS.find(x=>x.key===b.dataset.slot);C.toast(`The ${sl.label.toLowerCase()} slot opens at ${STAGES[sl.stage].name}.`);return;}slotOpen=slotOpen===b.dataset.slot?null:b.dataset.slot;sfx('tap');C.render();}
  else if(g==='equip'||g==='wear'){const code=Number(b.dataset.code);if(!s.dragon.named)throw new Error('Adopt your dragon first. Open the Dragon tab.');const was=s.equip[b.dataset.slot];await save(equipChanges(s,b.dataset.slot,code));sfx(code?'craftItem':'tap');C.toast(code?`${s.dragon.name} is wearing the ${ITEM_OF(code)?.name}.`:`Took off the ${was?.name||'gear'}.`);}
  else if(g==='tab'){recipeTab=b.dataset.tab;sfx('tap');C.render();}
  else if(g==='vtab'){vaultTab=b.dataset.tab;sfx('tap');C.render();}
  else if(g==='source'){const k=b.dataset.mat;sfx('tap');C.toast(`${matName(k)}: ${SOURCES[k]}`);}
  else if(g==='craft'){const it=ITEM[b.dataset.item];await save(craftChanges(s,it.id));sfx('craftItem');const t=document.querySelector(`[data-key="recipe:${it.id}"] .item-tile`);if(t){t.classList.remove('forged');void t.offsetWidth;t.classList.add('forged');}C.toast(it.kind==='gear'?`${it.name} crafted. Tap Wear to put it on.`:it.kind==='theme'?`${it.name} crafted. Tap Use to try it.`:`${it.name} crafted.`);}
  else if(g==='theme'){await save(themeChanges(s,Number(b.dataset.theme)));sfx('coin');C.toast(`${THEMES[Number(b.dataset.theme)]} theme on.`);}
  else if(g==='claim'){const list=[...s.bounties,...s.lastWeekBounties],bounty=list.find(x=>x.week===b.dataset.week&&x.index===Number(b.dataset.i));if(!bounty)throw new Error('That bounty has expired.');await save(claimBountyChanges(s,bounty));sfx('claim');C.toast('Bounty claimed.');}
  else if(g==='ach'){const ready=s.achievements.filter(a=>a.ready);if(!ready.length)return;await save(achievementChanges(s));const mats={};for(const a of ready)for(const [m,n]of Object.entries(a.mats||{}))mats[m]=(mats[m]||0)+n;celebrate({title:ready.length>1?`${ready.length} achievements`:ready[0].name,sub:ready.length>1?'':ready[0].desc,art:`<span class="big-icon">${art(ready[0].icon)}</span>`,lines:[...(ready.length>1?ready.map(a=>a.name):[]),`+${ready.reduce((n,a)=>n+a.reward,0)} embers`,...Object.entries(mats).map(([m,n])=>`+${n} ${matName(m).toLowerCase()}`)],sound:'claim',button:'Collect'});}
  else if(g==='relic')openRelic(b.dataset.id);
  else if(g==='isle'){const i=Number(b.dataset.i),x=ISLES[i];if(i<=s.isle+1){sfx('tap');C.toast(`${x.name}: ${x.desc}`);}}
  else if(g==='grow'){growOpen=!growOpen;sfx('tap');C.render();}
  else if(g==='region'){mapRegion=Number(b.dataset.region);sfx('tap');C.render();}
  else if(g==='fly'){if(flying)return;if(mapRegion){mapRegion=0;C.render();await wait(60);}flyChanges(s);const plan=flightPlan(s),to=plan.to;flying=true;b.disabled=true;try{await flyAnimation(s);await save(flyChanges(game()));}finally{flying=false;}arrival(to,plan.reward);}
  else if(g==='wlevel'){write('blastforge-wing-level-v1',b.dataset.level);sfx('tap');C.render();}
  else if(g==='play')startGame(b.dataset.game);
 }catch(err){sfx('error');C.toast(err.message);}
}
// The Collections panel remembers whether you folded it away.
document.addEventListener('toggle',e=>{if(e.target.matches?.('details.collections'))write('blastforge-collections-v1',e.target.open?'1':'0');},true);
export function handleKey(e){if((e.key==='Enter'||e.key===' ')&&e.target.matches('.den-stage')){e.preventDefault();autoPet();}}
bindPetting();

function startGame(which){
 const s=game(),started=read('blastforge-runs-v1','').split(','),mark=`${s.today}:${which}`,eligible=which==='anvil'?s.anvilToday.eligible&&!s.anvilToday.played:which==='wing'?s.wingToday.eligible&&!s.wingToday.played:s.catchToday.eligible&&!s.catchToday.played&&s.unlocked.has('catch');
 // Today's rewarded run counts as used from your first move in it, so quitting a bad start can't reroll it.
 const rewarded=eligible&&!started.includes(mark);if(eligible&&!rewarded)C.toast('You already started today’s rewarded run. This one is free play.');
 const dlg=document.createElement('dialog');dlg.className='play-dialog';document.body.append(dlg);dlg.addEventListener('close',()=>{dlg._stop?.();dlg.remove();C.render();});dlg.showModal();
 if(rewarded){const use=e=>{if(e.target.closest('.play-stage')&&!e.target.closest('button,.play-result')){write('blastforge-runs-v1',[...started.filter(x=>x.startsWith(s.today)),mark].join(','));dlg.removeEventListener('pointerdown',use);}};dlg.addEventListener('pointerdown',use);}
 const persist=async changes=>{try{if(Object.keys(changes).length)await save(changes);}catch(err){C.toast(err.message);}};
 // Free play: scraps, capped per day. Returns the result lines to show.
 const scraps=(embers,mats={},extra={})=>{
  const st=game(),out=scrapChanges(st,{embers,mats,...extra}),gained=[];
  for(const [k,v]of Object.entries(out)){const m=k.match(/:scrap:\d+:([a-z]+):/);if(m){const n=v-(st.records[k]?.value||0);if(n>0)gained.push(m[1]==='e'?`+${n} embers`:`+${n} ${m[1]}`);}}
  persist(out);const capped=st.scrapToday.embers>=st.scrapCap.embers&&st.scrapToday.mats>=st.scrapCap.mats;
  return [['You keep',gained.length?gained.join(', '):capped?'Daily cap reached':'none this run']];};
 if(which==='anvil')playAnvil(dlg,{bg:scene('smithy'),sprites:{anvil:HAS.sprites?.has('anvil')?'./assets/sprites/anvil.webp':null,hammer:HAS.sprites?.has('hammer')?'./assets/sprites/hammer.webp':null},zone:anvilZone(s),rewarded,bonus:s.gameBonus*(s.dragon.ateToday.includes('jerky')?1.25:1),forgive:Boolean(s.inventory.trough),blades:['blade-1','blade-2','blade-3'].filter(n=>HAS.games.has(n)).map(n=>`./assets/games/${n}.webp`),onReward:r=>{try{persist(anvilRewardChanges(game(),r));}catch(err){C.toast(err.message);}},onPractice:r=>scraps(Math.floor(r.score/20))});
 else if(which==='catch')playCatch(dlg,{bg:scene('sky'),frames:flyFrames(s.dragon),art:Object.fromEntries([...HAS.games].map(n=>[n,`./assets/games/${n}.webp`])),lives:Math.min(5,3+Math.floor(s.dragon.stats.vitality/60)+extraLife(s)),rewarded,bonus:s.gameBonus,gold:s.inventory.lens?2:1,dragonSrc:portraitSrc(s.dragon),dragon:dragonSVG({...s.dragon,mood:'delighted',stage:Math.min(s.dragon.stage,2)},s.equip,{label:' '}),onReward:score=>{try{persist(catchRewardChanges(game(),score));}catch(err){C.toast(err.message);}},onPractice:score=>scraps(Math.floor(score/10),{},{best:score,game:'catch'})});
 else{const level=chosenLevel(s),L=WING_LEVELS[level],frames=flyFrames(s.dragon);
 playWingbeat(dlg,{art:Object.fromEntries([...HAS.wing].map(n=>[n,`./assets/wing/${n}.webp`])),rewarded,level,levelName:L.name,dragonSrc:portraitSrc(s.dragon),frames,shield:Boolean(s.inventory.whistle),lives:3+extraLife(s),best:s.wingBest,payout:({score,mats,rewarded:paid})=>{
  if(paid){const st=game();let out;try{out=wingRewardChanges(st,{score,mats,level});}catch(err){C.toast(err.message);return scraps(Math.floor(score/2*L.pay),mats,{best:score,game:'wing'});}persist(out);const got=Object.entries(out).filter(([k])=>k.includes(':wingm:')).map(([k,v])=>`+${v} ${k.split(':').at(-1)}`);return [['Embers earned',`+${out[Object.keys(out).find(k=>/:wing:/.test(k))]-1}`],...(got.length?[['Materials',got.join(', ')]]:[])];}
  return scraps(Math.floor(score/2*L.pay),mats,{best:score,game:'wing'});}});}
}

// Remaining goals today on the home-screen icon (if the device supports it and it is switched on).
export const badgeOn=()=>read('blastforge-badge-v1','1')!=='0';
export const badgePermission=()=>!('setAppBadge'in navigator)?'unsupported':!('Notification'in window)?'granted':Notification.permission;
export function setBadge(on){write('blastforge-badge-v1',on?'1':'0');if(on)askBadge();updateBadge();}
// The home-screen app needs notification permission before its icon can show a number (iPhone).
// The request has to come straight from a tap (browsers ignore it otherwise), so Settings has a button.
export function askBadge(){try{if(!('Notification'in window)||Notification.permission!=='default')return Promise.resolve(window.Notification?.permission||'granted');return Notification.requestPermission().then(p=>{updateBadge();return p;});}catch{return Promise.resolve('default');}}
export function updateBadge(){
 if(!('setAppBadge'in navigator))return;const s=game(),t=s.forge.dayTotals[s.today],left=t?Math.max(0,t.planned-t.done):0;
 try{(badgeOn()&&left?navigator.setAppBadge(left):navigator.clearAppBadge()).catch(()=>{});}catch{}
}
// What a check-off earned, for the toast.
export function earnedSince(before){const after=game().wallet,parts=[];for(const k of ['embers',...Object.keys(MATERIALS)]){const n=(after[k]||0)-(before[k]||0);if(n>0)parts.push(`+${n} ${k==='embers'?'embers':matName(k).toLowerCase()}`);}return parts.slice(0,3).join(' · ');}
