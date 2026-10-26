// Ember Catch: your dragon catches falling embers and dodges frost shards and ash.
import {sfx} from './sound.js?v=15';
import {shell,loop,Particles,Popups,showResult,backdrop} from './play-kit.js?v=15';
const DURATION=45;
export function playCatch(dlg,{lives=3,rewarded=false,bonus=1,dragon,dragonSrc=null,onReward,bg=null}){
 const paint=backdrop(bg);
 const kit=shell(dlg,{title:'Ember Catch',rewarded,hint:'Drag to move. Catch embers, dodge the blue and the grey'});
 const {ctx,view}=kit,parts=new Particles(),pops=new Popups(),img=new Image();
 img.src=dragonSrc||'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(dragon.replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" '));
 let st,stopLoop=null,paidOut=false,best=0;
 const reset=()=>{st={time:0,score:0,lives,combo:0,x:view.w/2,tx:view.w/2,items:[],spawn:.6,hurt:0,over:false,shake:0,caught:0};kit.result.hidden=true;kit.hint.hidden=false;hud();};
 const mult=()=>st.combo>=25?3:st.combo>=10?2:1;
 const hud=()=>{kit.hud.innerHTML=`<span class="lives">${'♥'.repeat(st.lives)}<i>${'♥'.repeat(Math.max(0,lives-st.lives))}</i></span><span>Score <b>${st.score}</b></span><span class="${mult()>1?'hot':''}">×<b>${mult()}</b></span>`;};
 function spawn(){
  const w=view.w,t=st.time/DURATION,r=Math.random(),bad=.16+t*.16;
  const kind=r<.07?'gold':r<.07+bad*.6?'shard':r<.07+bad?'ash':'ember';
  st.items.push({kind,x:24+Math.random()*(w-48),y:-20,vy:(150+t*190)*(.85+Math.random()*.3),vx:(Math.random()-.5)*30,spin:Math.random()*6,r:kind==='gold'?11:kind==='ember'?8:10});
 }
 function finish(){
  st.over=true;best=Math.max(best,st.score);const embers=Math.round(st.score/2*bonus);const lines=[['Score',st.score],['Embers caught',st.caught]];
  if(rewarded&&!paidOut){paidOut=true;lines.push(['Embers earned',`+${embers}`]);if(st.score>=40)lines.push(['Amber','+1']);sfx('coin');}else lines.push(['Embers','Practice run']);
  const pay=paidOut&&rewarded?()=>onReward?.(st.score):null;
  showResult(kit,{title:st.lives>0?'Time!':'Out of hearts',lines,again:()=>{rewarded=false;const tag=dlg.querySelector('.play-tag');tag.textContent='Practice';tag.classList.remove('rewarded');reset();},done:()=>dlg.close()});
  try{pay?.();}catch{}
 }
 function draw(dt,now){
  const w=view.w,h=view.h,dy=h-70,dw=Math.min(110,w*.26);
  if(!st.over){
   st.time+=dt;st.spawn-=dt;if(st.spawn<=0){spawn();st.spawn=Math.max(.2,.55-st.time/DURATION*.32)*(.7+Math.random()*.6);}
   st.x+=(st.tx-st.x)*Math.min(1,dt*14);st.hurt=Math.max(0,st.hurt-dt);
   for(const it of st.items){it.y+=it.vy*dt;it.x+=it.vx*dt;it.spin+=dt*3;
    const hit=Math.abs(it.x-st.x)<dw*.36&&it.y>dy-dw*.45&&it.y<dy-dw*.05;
    if(hit){it.dead=true;
     if(it.kind==='ember'||it.kind==='gold'){st.combo++;st.caught++;const pts=(it.kind==='gold'?5:1)*mult();st.score+=pts;parts.burst(it.x,it.y,it.kind==='gold'?28:12,{color:it.kind==='gold'?'#ffe27a':'#ffa040',speed:200,gravity:200});sfx(it.kind==='gold'?'gold':'ember');if(it.kind==='gold'||st.combo===10||st.combo===25)pops.add(st.combo===10?'×2 COMBO':st.combo===25?'×3 COMBO':`+${pts}`,it.x,it.y-20,{color:'#ffe2a6',size:it.kind==='gold'?26:30});}
     else if(st.hurt<=0){st.lives--;st.combo=0;st.hurt=.9;st.shake=.3;parts.burst(it.x,it.y,20,{color:it.kind==='shard'?'#9fe0ff':'#9a9a9a',speed:220});sfx('hurt');if(st.lives<=0)finish();}
     hud();}
    else if(it.y>h+20){it.dead=true;if(it.kind==='ember'||it.kind==='gold'){if(st.combo>=10)pops.add('combo lost',it.x,h-30,{color:'#c9a0a0',size:18});st.combo=0;hud();}}
   }
   st.items=st.items.filter(i=>!i.dead);
   if(st.time>=DURATION&&!st.over)finish();
  }
  st.shake=Math.max(0,st.shake-dt);parts.update(dt);pops.update(dt);
  ctx.setTransform(view.dpr,0,0,view.dpr,0,0);ctx.clearRect(0,0,w,h);
  if(st.shake)ctx.translate((Math.random()-.5)*14*st.shake/.3,(Math.random()-.5)*8*st.shake/.3);
  const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#141a2e');sky.addColorStop(.7,'#2a1c22');sky.addColorStop(1,'#3a2018');ctx.fillStyle=sky;ctx.fillRect(-20,-20,w+40,h+40);const painted=paint?.(ctx,w,h,1);if(painted){ctx.fillStyle='rgba(6,8,18,.32)';ctx.fillRect(-20,-20,w+40,h+40);}
  if(!painted){ctx.fillStyle='rgba(255,240,220,.5)';for(let i=0;i<40;i++){const x=(i*97.3)%w,y=(i*53.1)%(h*.6);ctx.globalAlpha=.2+.3*Math.sin(now/600+i);ctx.fillRect(x,y,1.5,1.5);}ctx.globalAlpha=1;}
  if(!painted){ctx.fillStyle='#1a1414';ctx.beginPath();ctx.moveTo(0,h);ctx.lineTo(0,h-26);for(let x=0;x<=w;x+=40)ctx.lineTo(x,h-26-Math.sin(x*.05)*6);ctx.lineTo(w,h);ctx.fill();}
  // timer
  const left=Math.max(0,1-st.time/DURATION);ctx.fillStyle='rgba(255,255,255,.12)';ctx.fillRect(16,12,w-32,5);ctx.fillStyle=left<.2?'#ff7a5a':'#ffb45e';ctx.fillRect(16,12,(w-32)*left,5);
  for(const it of st.items)drawItem(it,now);
  // dragon
  const bob=Math.sin(now/180)*3,tilt=(st.tx-st.x)*.002;
  ctx.save();ctx.translate(st.x,dy+bob);ctx.rotate(Math.max(-.25,Math.min(.25,tilt)));if(st.hurt>0&&Math.floor(now/90)%2)ctx.globalAlpha=.35;
  if(img.complete&&img.naturalWidth){const dh=dw*img.naturalHeight/img.naturalWidth;ctx.drawImage(img,-dw/2,-dh,dw,dh);}else{ctx.fillStyle='#e0583e';ctx.beginPath();ctx.arc(0,-dw*.4,dw*.3,0,Math.PI*2);ctx.fill();}
  ctx.restore();
  parts.draw(ctx);pops.draw(ctx);
 }
 function drawItem(it,now){
  ctx.save();ctx.translate(it.x,it.y);
  if(it.kind==='ember'||it.kind==='gold'){const c=it.kind==='gold'?'#ffe27a':'#ff9a3d';ctx.shadowColor=c;ctx.shadowBlur=18;const g=ctx.createRadialGradient(0,0,1,0,0,it.r);g.addColorStop(0,'#fff6d8');g.addColorStop(.5,c);g.addColorStop(1,'rgba(255,90,30,.2)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,it.r+Math.sin(now/90+it.x)*1.2,0,Math.PI*2);ctx.fill();if(it.kind==='gold'){ctx.rotate(it.spin);ctx.strokeStyle='rgba(255,255,230,.8)';ctx.lineWidth=1.5;ctx.beginPath();for(let i=0;i<4;i++){ctx.moveTo(0,0);ctx.lineTo(Math.cos(i*Math.PI/2)*it.r*1.8,Math.sin(i*Math.PI/2)*it.r*1.8);}ctx.stroke();}}
  else if(it.kind==='shard'){ctx.rotate(it.spin);ctx.shadowColor='#7fd8ff';ctx.shadowBlur=12;ctx.fillStyle='#bff3ff';ctx.beginPath();ctx.moveTo(0,-it.r*1.4);ctx.lineTo(it.r*.6,0);ctx.lineTo(0,it.r*1.4);ctx.lineTo(-it.r*.6,0);ctx.closePath();ctx.fill();ctx.fillStyle='#5ab8e0';ctx.beginPath();ctx.moveTo(0,-it.r*1.4);ctx.lineTo(it.r*.6,0);ctx.lineTo(0,0);ctx.fill();}
  else{ctx.rotate(it.spin*.5);ctx.fillStyle='#55504c';ctx.beginPath();for(let i=0;i<7;i++){const a=i/7*Math.PI*2,r=it.r*(.75+((i*37)%5)/10);i?ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r):ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();ctx.fillStyle='rgba(255,120,60,.4)';ctx.beginPath();ctx.arc(-2,-2,2,0,Math.PI*2);ctx.fill();}
  ctx.restore();
 }
 const move=e=>{if(e.target.closest('button'))return;const r=kit.stage.getBoundingClientRect();st.tx=Math.max(30,Math.min(view.w-30,e.clientX-r.left));kit.hint.hidden=true;};
 kit.stage.addEventListener('pointerdown',e=>{move(e);try{kit.stage.setPointerCapture(e.pointerId);}catch{}});kit.stage.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'||e.buttons||e.pressure)move(e);});
 const key=e=>{if(e.key==='ArrowLeft')st.tx=Math.max(30,st.tx-60);if(e.key==='ArrowRight')st.tx=Math.min(view.w-30,st.tx+60);};dlg.addEventListener('keydown',key);
 reset();stopLoop=loop(draw);
 dlg._stop=()=>{stopLoop?.();kit.stop();};
}
