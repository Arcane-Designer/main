// Wingbeat: fly your dragon through the Bestia Alata skies. Tap to flap, hold to glide.
// Sea stacks and hanging cliffs, mountains to clear, floating rocks and arches to thread, updrafts
// that lift you, wind that pushes you around, and in a storm: rain, thunderclouds and lightning.
// Hitting rock costs a heart; dropping into the sea ends the flight.
// Free play drops small scraps (capped each day); a rewarded run needs a full day of goals.
import {sfx,ambience} from './sound.js?v=16';
import {shell,loop,Particles,Popups,showResult,reduced} from './play-kit.js?v=16';
import {frameSet} from './frames.js?v=16';
const MATS=['iron','herb','moonstone','dye','silk','amber'],COLOR={iron:'#c4c9d4',herb:'#7fe3a8',moonstone:'#9fd0ff',dye:'#ff7fa8',silk:'#c39bff',amber:'#ffc35a'};
// Each sky is harder: faster, narrower, windier, wetter. mix weights which obstacles appear.
const LEVELS=[null,
 {sky:'sky-dawn',speed:150,top:230,gap:225,min:165,space:250,wind:.15,gust:0,updraft:.2,rain:0,storm:false,find:.35,mix:{gate:6,mountain:2,float:1,arch:.4}},
 {sky:'sky-day',speed:165,top:255,gap:205,min:152,space:235,wind:.35,gust:.35,updraft:.3,rain:0,storm:false,find:.4,mix:{gate:5,mountain:3,float:2,arch:.7}},
 {sky:'sky-gale',speed:180,top:280,gap:192,min:144,space:225,wind:.6,gust:.7,updraft:.35,rain:.45,storm:false,find:.45,drift:22,mix:{gate:4,mountain:3,float:3,arch:.8,cloud:1}},
 {sky:'sky-storm',speed:195,top:305,gap:184,min:138,space:215,wind:.85,gust:1,updraft:.35,rain:1,storm:true,find:.5,drift:30,mix:{gate:4,mountain:3,float:3,arch:.8,cloud:3}}
];
// A sprite and its collision mask (from the picture's own transparency, so rock edges are exact).
function sprite(src,fallback){
 const s={img:null,mask:null,aspect:0};
 const build=img=>{const W=56,H=Math.max(8,Math.round(56*img.height/img.width)),c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');x.drawImage(img,0,0,W,H);try{const d=x.getImageData(0,0,W,H).data,a=new Uint8Array(W*H);for(let i=0;i<W*H;i++)a[i]=d[i*4+3]>110?1:0;s.mask={W,H,a};}catch{s.mask=null;}s.img=img;s.aspect=img.width/img.height;};
 if(fallback)build(fallback());
 if(src){const img=new Image();img.onload=()=>build(img);img.src=src;}
 return s;
}
const ok=s=>s&&s.img;
function hits(s,rx,ry,rw,rh,cx,cy,r){
 if(cx+r<rx||cx-r>rx+rw||cy+r<ry||cy-r>ry+rh)return false;if(!s.mask)return true;
 for(let k=0;k<=12;k++){const a=k/12*Math.PI*2,px=k===12?cx:cx+Math.cos(a)*r,py=k===12?cy:cy+Math.sin(a)*r,u=(px-rx)/rw,v=(py-ry)/rh;if(u<0||u>=1||v<0||v>=1)continue;if(s.mask.a[Math.floor(v*s.mask.H)*s.mask.W+Math.floor(u*s.mask.W)])return true;}
 return false;
}
// Drawn stand-ins, used until (or unless) the painted art loads.
function rockCanvas(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');draw(x,w,h);return c;}
const rockFill=(x,w)=>{const g=x.createLinearGradient(0,0,w,0);g.addColorStop(0,'#7a5a48');g.addColorStop(.25,'#5a4640');g.addColorStop(.75,'#3a3038');g.addColorStop(1,'#241e26');return g;};
const FALLBACK={
 stack:()=>rockCanvas(120,420,(x,w,h)=>{x.fillStyle=rockFill(x,w);x.beginPath();x.moveTo(w*.18,h);x.lineTo(w*.12,h*.3);x.lineTo(w*.26,h*.06);x.lineTo(w*.74,h*.04);x.lineTo(w*.9,h*.32);x.lineTo(w*.84,h);x.fill();x.fillStyle='#5f8a4e';x.beginPath();x.ellipse(w*.5,h*.05,w*.36,h*.03,0,0,7);x.fill();}),
 cliff:()=>rockCanvas(120,420,(x,w,h)=>{x.fillStyle=rockFill(x,w);x.beginPath();x.moveTo(w*.08,0);x.lineTo(w*.92,0);x.lineTo(w*.82,h*.7);x.lineTo(w*.52,h);x.lineTo(w*.2,h*.72);x.fill();}),
 mountain:()=>rockCanvas(420,300,(x,w,h)=>{x.fillStyle=rockFill(x,w);x.beginPath();x.moveTo(0,h);x.lineTo(w*.38,h*.06);x.lineTo(w*.5,h*.16);x.lineTo(w*.62,0);x.lineTo(w,h);x.fill();x.fillStyle='#eef4f8';x.beginPath();x.moveTo(w*.62,0);x.lineTo(w*.7,h*.16);x.lineTo(w*.55,h*.13);x.fill();}),
 floatrock:()=>rockCanvas(220,200,(x,w,h)=>{x.fillStyle=rockFill(x,w);x.beginPath();x.moveTo(w*.05,h*.3);x.lineTo(w*.95,h*.3);x.lineTo(w*.6,h*.95);x.lineTo(w*.45,h);x.fill();x.fillStyle='#5f8a4e';x.beginPath();x.ellipse(w*.5,h*.3,w*.46,h*.1,0,0,7);x.fill();})
};
export function playWingbeat(dlg,{rewarded=false,dragonSrc=null,frames=null,art={},shield=false,lives=3,best=0,level=1,levelName='',payout}){
 const L=LEVELS[level]||LEVELS[1];
 const kit=shell(dlg,{title:levelName?`Wingbeat · ${levelName}`:'Wingbeat',rewarded,hint:'Tap to flap · hold to glide'});
 const {ctx,view}=kit,parts=new Particles(),pops=new Popups();
 const pic=src=>{if(!src)return null;const i=new Image();i.src=src;return i;};
 const img=pic(dragonSrc),cyc=frameSet(frames?.cycle);
 const sky=pic(art[L.sky]),far=pic(art['far-mountains']),mid=pic(art['mid-islands']);
 const S={stack:sprite(art.stack,FALLBACK.stack),cliff:sprite(art.cliff,FALLBACK.cliff),mountain:sprite(art.mountain,FALLBACK.mountain),floatrock:sprite(art.floatrock,FALLBACK.floatrock),arch:art.arch?sprite(art.arch):null,stormcloud:art.stormcloud?sprite(art.stormcloud):null};
 const matImg=Object.fromEntries(MATS.map(m=>[m,pic(`./assets/materials/${m}.webp`)]));
 const wind=ambience('wind'),rain=L.rain?ambience('rain'):null;
 let st,stopLoop=null,hold=false,flapAt=-1e9;
 const seaY=()=>view.h-34,homeX=()=>view.w*.28,size=()=>Math.min(100,view.w*.22);
 const reset=()=>{st={started:false,over:false,x:homeX(),y:view.h*.42,vy:0,t:0,dist:0,score:0,lives,shield,hurt:0,speed:L.speed,obs:[],pickups:[],drafts:[],bolts:[],next:.4,spawned:0,got:{},shake:0,flash:0,windX:0,gustV:0,gustT:3,drops:[],streaks:[],splash:false};kit.result.hidden=true;kit.hint.hidden=false;hud();};
 const hud=()=>{const n=Object.values(st.got).reduce((a,b)=>a+b,0);kit.hud.innerHTML=`<span class="lives">${'♥'.repeat(Math.max(0,st.lives))}${st.shield?'<i class="shield">◆</i>':''}</span><span>Score <b>${st.score}</b></span><span>${Math.round(st.dist/40)} m</span><span>Found <b>${n}</b></span>`;};
 const pick=mix=>{const e=Object.entries(mix).filter(([k])=>(k!=='arch'||ok(S.arch))&&(k!=='cloud'||ok(S.stormcloud)));const tot=e.reduce((a,[,v])=>a+v,0);let r=Math.random()*tot;for(const [k,v]of e){if((r-=v)<0)return k;}return 'gate';};
 const mat=()=>MATS[Math.floor(Math.random()*MATS.length)];
 // A piece of scenery: a sprite placed in world space (x scrolls), with its own collision mask.
 const piece=(sp,x,y,w,h,extra={})=>({sp,x,y,w,h,...extra});
 function spawn(){
  const W=view.w,H=seaY(),type=st.spawned++<2?'gate':pick(L.mix),gap=Math.max(L.min,L.gap-st.score*2),x0=W+30,o={type,parts:[],passed:false,seed:Math.random()*6,w:0};
  if(type==='gate'){const top=70+Math.random()*Math.max(10,H-140-gap),bottom=top+gap;
   const ch=top+40,cw=Math.max(74,ch*(S.cliff.aspect||.3)),sh=H-bottom+30,sw=Math.max(74,sh*(S.stack.aspect||.3));
   o.parts.push(piece(S.cliff,x0,top-ch,cw,ch),piece(S.stack,x0+(cw-sw)/2,bottom,sw,sh));o.w=Math.max(cw,sw);
   if(Math.random()<L.find)st.pickups.push({x:x0+cw/2,y:top+gap/2,m:mat(),r:15,bob:Math.random()*6});}
  else if(type==='mountain'){const h=H*(.32+Math.random()*.26),w=h*(S.mountain.aspect||1.4);o.parts.push(piece(S.mountain,x0,H-h+14,w,h));o.w=w;
   if(Math.random()<L.updraft)st.drafts.push({x:x0-110,w:90,power:520});
   if(Math.random()<L.find)st.pickups.push({x:x0+w*.55,y:H-h-60,m:mat(),r:15,bob:0});}
  else if(type==='float'){const s=110+Math.random()*50,h=s/(S.floatrock.aspect||1.1),y=90+Math.random()*Math.max(10,H-260);o.parts.push(piece(S.floatrock,x0,y,s,h,{base:y}));o.w=s;
   if(Math.random()<L.find)st.pickups.push({x:x0+s/2,y:y>H/2?y-50:y+h+50,m:mat(),r:15,bob:1});}
  else if(type==='arch'){const asp=S.arch.aspect||1.5,h=Math.min(H*.58,view.w*1.25/asp),w=h*asp;o.parts.push(piece(S.arch,x0,H-h+16,w,h));o.w=w;
   if(Math.random()<L.find)st.pickups.push({x:x0+w/2,y:Math.max(40,H-h-45),m:mat(),r:15,bob:2});}
  else if(type==='cloud'){const w=210+Math.random()*60,h=w/(S.stormcloud.aspect||1.5),y=10+Math.random()*(H*.3);o.parts.push(piece(S.stormcloud,x0,y,w,h,{base:y,cloud:true}));o.w=w;o.zapIn=1.2+Math.random()*1.5;}
  st.obs.push(o);st.next=(o.w+L.space-Math.min(60,st.score*1.5))/st.speed;
 }
 function flap(){if(st.over)return;if(!st.started){st.started=true;kit.hint.hidden=true;}const wet=1-L.rain*.12;st.vy=Math.max(-430,Math.min(st.vy,40)-360*wet);flapAt=performance.now();sfx('flap');parts.burst(st.x-size()*.3,st.y+size()*.15,6,{color:'#ffffffaa',speed:90,gravity:60,life:.4,size:2,glow:false});}
 function hit(push=true){
  if(st.hurt>0||st.over)return;if(st.shield){st.shield=false;st.hurt=1;sfx('clang');parts.burst(st.x,st.y,24,{color:'#9fe0ff',speed:220});hud();return;}
  st.lives--;st.hurt=1.2;st.shake=.4;if(push)st.vy=-160;sfx('hurt');parts.burst(st.x,st.y,26,{color:'#ffb45e',speed:240});hud();if(st.lives<=0)finish('crash');
 }
 function finish(how){
  if(st.over)return;st.over=true;wind.set(0);rain?.set(0);const got={...st.got},n=Object.values(got).reduce((a,b)=>a+b,0);
  const lines=[['Score',st.score],['Distance',`${Math.round(st.dist/40)} m`],['Best',Math.max(best,st.score)],['Found',n?Object.entries(got).map(([m,k])=>`${k} ${m}`).join(', '):'nothing this time']];
  let paid=[];try{paid=payout?.({score:st.score,mats:got,rewarded})||[];}catch{}
  best=Math.max(best,st.score);
  setTimeout(()=>{sfx(paid.length?'coin':'miss');showResult(kit,{title:how==='splash'?'Splashdown':st.score>=40?'Storm rider!':st.score>=15?'Nice flying':'Grounded',lines:[...lines,...paid],again:()=>{rewarded=false;const tag=dlg.querySelector('.play-tag');tag.textContent='Free play';tag.classList.remove('rewarded');reset();},done:()=>dlg.close()});},how==='splash'?700:300);
 }
 function update(dt,now){
  const H=seaY(),R=size()*.3;st.t+=dt;st.hurt=Math.max(0,st.hurt-dt);st.shake=Math.max(0,st.shake-dt);st.flash=Math.max(0,st.flash-dt*2.5);
  // Wind: a slow swell plus sudden gusts that shove you up or down. It also pushes you forward or back.
  const swell=(Math.sin(st.t*.31)+Math.sin(st.t*.83+1.7)*.6)/1.6;
  let gustNow=0,gustH=0;
  if(L.gust&&st.started&&!st.over){st.gustT-=dt;
   if(st.gustT<=0&&!st.gust){st.gust={warn:.75,age:0,v:(Math.random()<.5?-1:1)*(650+Math.random()*450)*L.gust,h:(Math.random()<.5?-1:1)*(60+Math.random()*60)*L.gust};st.gustT=3.2+Math.random()*3.5;sfx('flap');}
   if(st.gust){const g=st.gust;if(g.warn>0)g.warn-=dt;else{g.age+=dt;const k=Math.sin(Math.min(1,g.age/1)*Math.PI);gustNow=g.v*k;gustH=g.h*k;if(g.age>=1){st.gust=null;}}}}
  st.gustNow=gustNow;st.gustH=gustH;
  st.windX=swell*L.wind;if(!st.over&&!document.hidden){wind.set(.15+Math.abs(st.windX)*.6+Math.abs(gustNow)/600);rain?.set(L.rain*(.6+Math.abs(st.windX)*.4));}
  if(st.over)return;
  if(!st.started){st.y=view.h*.42+Math.sin(now/420)*8;return;}
  st.speed=Math.min(L.top,L.speed+st.score*3.2)*(1+st.windX*.22);st.dist+=st.speed*dt;
  // Flight: flapping is an impulse, holding glides (slower fall), updrafts lift.
  let g=1000;if(hold&&st.vy>0){g=380;st.vy=Math.min(st.vy,150);}
  for(const d of st.drafts)if(st.x>d.x&&st.x<d.x+d.w)g-=d.power;
  st.vy+=(g+gustNow)*dt;st.vy=Math.max(-480,Math.min(620,st.vy));st.y+=st.vy*dt;
  st.x+=((homeX()+st.windX*70+(st.gustH||0))-st.x)*Math.min(1,dt*2.4);
  if(st.y<R){st.y=R;st.vy=Math.max(0,st.vy);}
  if(st.y>H-R*.6){st.y=H-R*.6;sfx('splash');parts.burst(st.x,H,40,{color:'#d8f4ff',speed:260,gravity:500,size:3,glow:false,spread:Math.PI*.8});st.splash=true;st.lives=0;hud();finish('splash');return;}
  st.next-=dt;if(st.next<=0)spawn();
  const dx=st.speed*dt;
  for(const o of st.obs){
   for(const p of o.parts){p.x-=dx;if(L.drift&&o.type==='float')p.y=p.base+Math.sin(st.t*1.2+o.seed)*L.drift;if(p.cloud)p.y=p.base+Math.sin(st.t*.8+o.seed)*8;}
   const right=Math.max(...o.parts.map(p=>p.x+p.w));
   if(!o.passed&&right<st.x-R&&o.type!=='cloud'){o.passed=true;st.score++;sfx('tick');if(st.score%10===0)pops.add(`${st.score}!`,view.w/2,view.h*.3,{size:34});hud();}
   if(st.hurt<=0)for(const p of o.parts)if(hits(p.sp,p.x,p.y,p.w,p.h,st.x,st.y,R*.85)){hit();break;}
   // Thunderclouds throw lightning: a flicker warns you first.
   if(o.type==='cloud'&&L.storm){o.zapIn-=dt;const p=o.parts[0];if(o.zapIn<=0&&p.x<view.w){st.bolts.push({x:p.x+p.w*(.35+Math.random()*.3),y:p.y+p.h*.7,warn:.8,life:.28});o.zapIn=2.4+Math.random()*2;}}
  }
  for(const d of st.drafts)d.x-=dx;
  for(const b of st.bolts){b.x-=dx;if(b.warn>0){b.warn-=dt;if(b.warn<=0){sfx('thunder');st.flash=1;st.shake=.25;}}else{b.life-=dt;if(Math.abs(st.x-b.x)<R+10&&st.y>b.y)hit(false);}}
  st.bolts=st.bolts.filter(b=>b.warn>0||b.life>0);
  for(const p of st.pickups){p.x-=dx;if(!p.dead&&Math.hypot(p.x-st.x,p.y-st.y)<p.r+R){p.dead=true;st.got[p.m]=(st.got[p.m]||0)+1;sfx('ember');parts.burst(p.x,p.y,16,{color:COLOR[p.m],speed:180,gravity:120});pops.add(`+1 ${p.m}`,p.x,p.y-16,{size:18,color:COLOR[p.m]});hud();}}
  st.obs=st.obs.filter(o=>o.parts.some(p=>p.x+p.w>-40));st.pickups=st.pickups.filter(p=>!p.dead&&p.x>-30);st.drafts=st.drafts.filter(d=>d.x+d.w>-20);
  if(L.storm&&Math.random()<dt*.06){st.flash=.6;setTimeout(()=>sfx('thunder'),300+Math.random()*900);}
 }
 // Parallax: a band image repeated across the screen, scrolling at its own speed.
 function band(im,speed,yBottom,hgt,alpha=1){if(!im||!im.complete||!im.naturalWidth)return;const w=hgt*im.naturalWidth/im.naturalHeight,off=-((st.dist*speed)%w);ctx.globalAlpha=alpha;for(let x=off;x<view.w;x+=w-1)ctx.drawImage(im,x,yBottom-hgt,w,hgt);ctx.globalAlpha=1;}
 function draw(dt,now){
  update(dt,now);
  const w=view.w,h=view.h,H=seaY();parts.update(dt);pops.update(dt);
  ctx.setTransform(view.dpr,0,0,view.dpr,0,0);ctx.clearRect(0,0,w,h);
  if(st.shake)ctx.translate((Math.random()-.5)*14*st.shake,(Math.random()-.5)*10*st.shake);
  // Sky and distance.
  if(sky&&sky.complete&&sky.naturalWidth){const k=Math.max(w/sky.naturalWidth,h/sky.naturalHeight),iw=sky.naturalWidth*k,ih=sky.naturalHeight*k,room=Math.max(0,iw-w),ox=-(room?(st.dist*.03)%room:0);ctx.drawImage(sky,ox-(room?0:(iw-w)/2),(h-ih)*.5,iw,ih);}
  else{const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,L.storm?'#141a2a':'#2a3a5e');g.addColorStop(.75,L.storm?'#2a2a3a':'#c88a6a');g.addColorStop(1,'#20304a');ctx.fillStyle=g;ctx.fillRect(-20,-20,w+40,h+40);}
  if(!(sky&&sky.complete&&sky.naturalWidth))band(far,.12,H+6,h*.42,.9);band(mid,.32,H+10,h*.2);
  // Wind you can see: streaks running with the wind; updrafts as rising wisps.
  if(!reduced()){const n=Math.round(6+Math.abs(st.windX)*26);while(st.streaks.length<n)st.streaks.push({x:Math.random()*w,y:Math.random()*H,l:20+Math.random()*50});
   ctx.strokeStyle=`rgba(235,245,255,${.08+Math.abs(st.windX)*.25+Math.abs(st.gustNow||0)/1500})`;ctx.lineWidth=1.5;ctx.lineCap='round';ctx.beginPath();for(const s of st.streaks){s.x-=((st.started?st.speed:60)*1.4+st.windX*240)*dt;if(s.x<-60){s.x=w+Math.random()*60;s.y=Math.random()*H;}if(s.x>w+60)s.x=-50;const tiltY=(st.gustNow||0)*.06;ctx.moveTo(s.x,s.y);ctx.lineTo(s.x+s.l,s.y+tiltY);}ctx.stroke();st.streaks.length=n;
   for(const d of st.drafts){const g=ctx.createLinearGradient(0,H,0,H*.2);g.addColorStop(0,'rgba(255,230,180,.16)');g.addColorStop(1,'rgba(255,230,180,0)');ctx.fillStyle=g;ctx.fillRect(d.x,H*.2,d.w,H*.8);ctx.strokeStyle='rgba(255,240,210,.35)';ctx.beginPath();for(let i=0;i<5;i++){const yy=H-((now*.18+i*90)%(H*.8));ctx.moveTo(d.x+d.w*(.2+i*.15),yy);ctx.lineTo(d.x+d.w*(.2+i*.15),yy-26);}ctx.stroke();}}
  // A gust warning: chevrons beside the dragon point the way you're about to be shoved.
  if(st.gust&&st.gust.warn>0&&!st.over){const up=st.gust.v<0,a=.35+.4*Math.abs(Math.sin(now/90));ctx.strokeStyle=`rgba(230,245,255,${a})`;ctx.lineWidth=3;ctx.lineCap='round';for(let i=0;i<3;i++){const yy=st.y+(up?-1:1)*(size()*.55+i*12),x0=st.x-14;ctx.beginPath();ctx.moveTo(x0,yy+(up?8:-8));ctx.lineTo(st.x,yy);ctx.lineTo(x0+28,yy+(up?8:-8));ctx.stroke();}}
  if(Math.abs(st.gustNow||0)>200){st.shake=Math.max(st.shake,.06);}
  // Scenery.
  for(const o of st.obs)for(const p of o.parts)if(ok(p.sp))ctx.drawImage(p.sp.img,p.x,p.y,p.w,p.h);
  for(const b of st.bolts){if(b.warn>0){if(Math.floor(now/80)%2){ctx.strokeStyle='rgba(200,220,255,.5)';ctx.setLineDash([6,8]);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(b.x,H);ctx.stroke();ctx.setLineDash([]);}}
   else{ctx.save();ctx.shadowColor='#bfe0ff';ctx.shadowBlur=24;ctx.strokeStyle='#f4fbff';ctx.lineWidth=3.5;ctx.beginPath();let x=b.x,y=b.y;ctx.moveTo(x,y);while(y<H){y+=18+Math.random()*16;x+=(Math.random()-.5)*26;ctx.lineTo(x,y);}ctx.stroke();ctx.restore();}}
  for(const p of st.pickups){const y=p.y+Math.sin(now/300+p.bob)*5;ctx.save();ctx.shadowColor=COLOR[p.m];ctx.shadowBlur=18;const im=matImg[p.m];if(im&&im.complete&&im.naturalWidth)ctx.drawImage(im,p.x-p.r,y-p.r,p.r*2,p.r*2);else{ctx.fillStyle=COLOR[p.m];ctx.beginPath();ctx.arc(p.x,y,p.r*.7,0,Math.PI*2);ctx.fill();}ctx.restore();}
  // The sea, in front of the rock bases.
  const sea=ctx.createLinearGradient(0,H,0,h);sea.addColorStop(0,L.storm?'#1c3040':'#1f4a5a');sea.addColorStop(1,'#0c1c26');ctx.fillStyle=sea;ctx.fillRect(-20,H,w+40,h-H+20);
  ctx.strokeStyle='rgba(210,240,255,.45)';ctx.lineWidth=2;ctx.beginPath();for(let x=-20;x<=w+20;x+=16){const y=H+Math.sin(x*.045+now/(L.storm?180:320))*(L.storm?5:3)+Math.sin(x*.11+now/500)*1.5;x<-10?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.stroke();
  // The dragon: wings down for a moment after each flap, spread while gliding.
  if(!st.splash){const S2=size(),tilt=st.started?Math.max(-.5,Math.min(.65,st.vy/700)):Math.sin(now/500)*.05;
   ctx.save();ctx.translate(st.x,st.y);ctx.rotate(tilt);if(st.hurt>0&&Math.floor(now/90)%2)ctx.globalAlpha=.4;
   // A flap plays the wing cycle quickly; gliding holds the wings spread; otherwise a slow, easy beat.
   const since=performance.now()-flapAt,n=cyc?cyc.n:0,fi=!n?0:since<n*45?Math.floor(since/45):(hold&&st.vy>0)?Math.min(n-1,n>2?2:0):Math.floor(now/(n>2?95:300));
   const W2=S2*1.4;if(n&&cyc.draw(ctx,fi,-W2/2,-W2*.55,W2,W2)){}
   else if(img&&img.complete&&img.naturalWidth)ctx.drawImage(img,-S2/2,-S2*.62,S2,S2);else{ctx.fillStyle='#e0583e';ctx.beginPath();ctx.arc(0,0,S2*.3,0,Math.PI*2);ctx.fill();}
   if(st.shield){ctx.strokeStyle='rgba(159,224,255,.7)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,S2*.55,0,Math.PI*2);ctx.stroke();}
   ctx.restore();}
  // Rain, slanted by the wind.
  if(L.rain&&!reduced()){const n=Math.round(L.rain*140);while(st.drops.length<n)st.drops.push({x:Math.random()*w,y:Math.random()*h,v:600+Math.random()*300});ctx.strokeStyle='rgba(200,220,240,.35)';ctx.lineWidth=1.2;ctx.beginPath();const slant=-st.windX*.6-.15;for(const d of st.drops){d.y+=d.v*dt;d.x+=d.v*slant*dt-(st.started?st.speed:0)*dt*.3;if(d.y>h){d.y=-10;d.x=Math.random()*(w+80);}if(d.x<-20)d.x=w+10;ctx.moveTo(d.x,d.y);ctx.lineTo(d.x-slant*14,d.y-14);}ctx.stroke();}
  parts.draw(ctx);pops.draw(ctx);
  if(st.flash){ctx.fillStyle=`rgba(230,240,255,${st.flash*.55})`;ctx.fillRect(-20,-20,w+40,h+40);}
 }
 const down=e=>{if(e.target.closest('button,.play-result'))return;e.preventDefault();hold=true;flap();try{kit.stage.setPointerCapture(e.pointerId);}catch{}};
 const up=()=>{hold=false;};
 const key=e=>{if((e.code==='Space'||e.key==='ArrowUp')&&kit.result.hidden){e.preventDefault();if(!e.repeat){hold=true;flap();}}};
 const keyUp=e=>{if(e.code==='Space'||e.key==='ArrowUp')hold=false;};
 kit.stage.addEventListener('pointerdown',down);kit.stage.addEventListener('pointerup',up);kit.stage.addEventListener('pointercancel',up);dlg.addEventListener('keydown',key);dlg.addEventListener('keyup',keyUp);
 reset();stopLoop=loop(draw);
 const hush=()=>{if(document.hidden){wind.set(0);rain?.set(0);}};document.addEventListener('visibilitychange',hush);
 dlg._stop=()=>{stopLoop?.();kit.stop();wind.stop();rain?.stop();document.removeEventListener('visibilitychange',hush);};
}
