// Anvil Strike: six blows on a glowing blade. Strike when the needle crosses the gold.
import {sfx} from './sound.js?v=15';
import {shell,loop,Particles,Popups,showResult,reduced,mixColor,backdrop} from './play-kit.js?v=15';
const STRIKES=6;
export function playAnvil(dlg,{zone=.16,rewarded=false,bonus=1,onReward,bg=null,sprites={}}){
 const paint=backdrop(bg),sprite=src=>{if(!src)return null;const i=new Image();i.src=src;return i;},anvilImg=sprite(sprites.anvil),hammerImg=sprite(sprites.hammer),ready=i=>i&&i.complete&&i.naturalWidth;
 const kit=shell(dlg,{title:'Anvil Strike',rewarded,hint:'Tap anywhere when the needle is in the gold'});
 const {ctx,view}=kit,parts=new Particles(),pops=new Popups();
 let st,stopLoop=null,paidOut=false;
 const reset=()=>{st={strike:0,score:0,combo:0,perfects:0,phase:Math.random()*6,speed:2.5,heat:.85,hammer:0,hammerT:-1,shake:0,flash:0,over:false,quench:-1,marks:[],lock:0};kit.result.hidden=true;kit.hint.hidden=false;hud();};
 const hud=()=>{kit.hud.innerHTML=`<span>Blow <b>${Math.min(st.strike+1,STRIKES)}</b>/${STRIKES}</span><span>Score <b>${st.score}</b></span><span class="${st.combo>1?'hot':''}">Combo <b>×${(1+.2*Math.max(0,st.combo-1)).toFixed(1)}</b></span>`;};
 const geo=()=>{const w=view.w,h=view.h;return {w,h,gx:w*.1,gw:w*.8,gy:Math.max(56,h*.16),ax:w/2,ay:h*.66};};
 const zoneNow=()=>Math.max(.07,zone*(1-st.strike*.05));
 const needle=()=>.5+.5*Math.sin(st.phase);
 function strike(){
  if(st.over||st.lock>0)return;const z=zoneNow(),p=needle(),off=Math.abs(p-.5),g=geo();
  const perfect=off<=z/2,good=!perfect&&off<=z*1.15;st.hammerT=0;st.lock=.28;kit.hint.hidden=true;
  let pts=0,label,color;
  if(perfect){st.combo++;st.perfects++;pts=Math.round(25*(1+.2*(st.combo-1)));label=st.combo>1?`PERFECT ×${(1+.2*(st.combo-1)).toFixed(1)}`:'PERFECT';color='#ffe27a';st.shake=.28;st.flash=.55;st.heat=Math.min(1.25,st.heat+.22);sfx('perfect');}
  else if(good){st.combo=0;pts=12;label='GOOD';color='#ffb45e';st.shake=.12;st.heat=Math.min(1.1,st.heat+.1);sfx('clang');}
  else{st.combo=0;label='MISS';color='#c9a0a0';st.heat=Math.max(.3,st.heat-.15);sfx('miss');}
  setTimeout(()=>{const bx=g.ax+(Math.random()-.5)*g.w*.12,by=g.ay-14;parts.burst(bx,by,perfect?90:good?36:6,{color:perfect?'#ffe8a0':good?'#ffb45e':'#8a6a5a',speed:perfect?520:good?360:160,spread:Math.PI*1.1});if(perfect)parts.burst(bx,by,30,{color:'#fff4d6',speed:700,size:1.6,life:.5});st.marks.push({x:bx-g.ax,q:perfect?2:good?1:0});pops.add(label,g.ax,g.ay-90,{color,size:perfect?38:30});if(pts)pops.add(`+${pts}`,g.ax,g.ay-50,{color:'#fff1d6',size:24});},70);
  st.score+=pts;st.strike++;st.speed+=.42;hud();
  if(st.strike>=STRIKES){st.over=true;setTimeout(()=>{st.quench=0;sfx('quench');},650);setTimeout(finish,2300);}
 }
 function finish(){
  const capped=Math.min(150,st.score),embers=Math.max(1,Math.round(capped*bonus)),name=st.score>=140?'Masterwork blade':st.score>=100?'Fine blade':st.score>=60?'Sturdy blade':'Rough blade';
  const lines=[['Score',st.score],['Perfect strikes',`${st.perfects} of ${STRIKES}`]];
  if(rewarded&&!paidOut){paidOut=true;lines.push(['Embers earned',`+${embers}`]);if(st.perfects>=3)lines.push(['Starmetal','+1']);sfx('coin');}
  else lines.push(['Embers','Practice run']);
  const pay=paidOut&&rewarded?()=>onReward?.({score:st.score,perfects:st.perfects}):null;
  showResult(kit,{title:name,lines,again:()=>{rewarded=false;dlg.querySelector('.play-tag').textContent='Practice';dlg.querySelector('.play-tag').classList.remove('rewarded');reset();},done:()=>dlg.close()});
  try{pay?.();}catch{}
 }
 function draw(dt,now){
  const g=geo(),{w,h}=g;st.lock=Math.max(0,st.lock-dt);
  if(!st.over)st.phase+=st.speed*dt;st.heat=Math.max(.25,st.heat-dt*.05);st.shake=Math.max(0,st.shake-dt);st.flash=Math.max(0,st.flash-dt*2.2);
  if(st.hammerT>=0){st.hammerT+=dt;if(st.hammerT>.4)st.hammerT=-1;}
  parts.update(dt);pops.update(dt);
  ctx.setTransform(view.dpr,0,0,view.dpr,0,0);ctx.clearRect(0,0,w,h);
  const sx=st.shake?(Math.random()-.5)*16*st.shake/.28:0,sy=st.shake?(Math.random()-.5)*10*st.shake/.28:0;ctx.translate(sx,sy);
  paint?.(ctx,w,h,.85);
  // forge glow
  const glow=ctx.createRadialGradient(w/2,h*.95,10,w/2,h*.8,Math.max(w,h)*.8);glow.addColorStop(0,`rgba(255,120,40,${.28+st.heat*.18})`);glow.addColorStop(.5,'rgba(120,40,20,.12)');glow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=glow;ctx.fillRect(-20,-20,w+40,h+40);
  // gauge
  const z=zoneNow(),gx=g.gx,gw=g.gw,gy=g.gy;
  ctx.fillStyle='rgba(10,14,13,.75)';round(ctx,gx-6,gy-16,gw+12,32,16);ctx.fill();
  const grd=ctx.createLinearGradient(gx,0,gx+gw,0);grd.addColorStop(0,'#5a1d22');grd.addColorStop(.5-z*1.15,'#8a3a28');grd.addColorStop(.5,'#c86a2c');grd.addColorStop(.5+z*1.15,'#8a3a28');grd.addColorStop(1,'#5a1d22');ctx.fillStyle=grd;round(ctx,gx,gy-9,gw,18,9);ctx.fill();
  ctx.fillStyle='rgba(255,180,94,.45)';round(ctx,gx+gw*(.5-z*1.15),gy-9,gw*z*2.3,18,6);ctx.fill();
  ctx.save();ctx.shadowColor='#ffe27a';ctx.shadowBlur=14+Math.sin(now/180)*6;ctx.fillStyle='#ffd65a';round(ctx,gx+gw*(.5-z/2),gy-9,gw*z,18,5);ctx.fill();ctx.restore();
  const nx=gx+gw*needle();ctx.save();ctx.shadowColor='#fff';ctx.shadowBlur=12;ctx.fillStyle='#fff6e6';ctx.beginPath();ctx.moveTo(nx,gy-18);ctx.lineTo(nx+7,gy-26);ctx.lineTo(nx-7,gy-26);ctx.closePath();ctx.fill();ctx.fillRect(nx-1.5,gy-18,3,36);ctx.restore();
  // anvil
  const ax=g.ax,ay=g.ay,aw=Math.min(w*.72,330);
  if(ready(anvilImg)){const ih=aw*anvilImg.naturalHeight/anvilImg.naturalWidth;ctx.drawImage(anvilImg,ax-aw*.52,ay-6,aw*1.04,ih*1.04);}else{ctx.fillStyle='#262b2e';ctx.beginPath();ctx.moveTo(ax-aw*.5,ay);ctx.lineTo(ax+aw*.42,ay);ctx.quadraticCurveTo(ax+aw*.62,ay+4,ax+aw*.5,ay+18);ctx.lineTo(ax+aw*.22,ay+26);ctx.lineTo(ax+aw*.16,ay+60);ctx.lineTo(ax+aw*.3,ay+86);ctx.lineTo(ax-aw*.3,ay+86);ctx.lineTo(ax-aw*.16,ay+60);ctx.lineTo(ax-aw*.22,ay+26);ctx.lineTo(ax-aw*.42,ay+18);ctx.closePath();ctx.fill();
  ctx.fillStyle='rgba(255,150,80,.18)';ctx.fillRect(ax-aw*.5,ay,aw*.92,3);}
  // blade
  const heat=Math.min(1,st.heat),core=heat>.75?mixColor('#ffb347','#fff6d8',(heat-.75)/.25):mixColor('#7a1d14','#ffb347',heat/.75),bl=aw*(.52+st.strike*.03);
  ctx.save();ctx.shadowColor=core;ctx.shadowBlur=20+heat*30;ctx.fillStyle=core;ctx.beginPath();ctx.moveTo(ax-bl/2,ay-4);ctx.lineTo(ax+bl/2-18,ay-4);ctx.lineTo(ax+bl/2,ay-10);ctx.lineTo(ax+bl/2-18,ay-18);ctx.lineTo(ax-bl/2,ay-16);ctx.closePath();ctx.fill();ctx.restore();
  for(const m of st.marks){ctx.fillStyle=m.q===2?'rgba(255,255,240,.5)':'rgba(80,20,10,.35)';ctx.fillRect(ax+m.x-1,ay-16,2,12);}
  // quench steam
  if(st.quench>=0){st.quench+=dt;if(st.quench<1.2&&Math.random()<.8)parts.burst(ax+(Math.random()-.5)*bl,ay-12,2,{color:'#dfe8ec',speed:80,gravity:-120,life:1.4,size:9,glow:false,spread:.8});}
  // hammer
  const t=st.hammerT<0?1:st.hammerT,swing=st.hammerT<0?0:t<.08?t/.08:Math.max(0,1-(t-.08)/.32),ang=-.95+swing*.95,hx=ax+aw*.1,hy=ay-140;
  ctx.save();ctx.translate(hx,hy);ctx.rotate(ang);if(ready(hammerImg)){const hh=138,hw=hh*hammerImg.naturalWidth/hammerImg.naturalHeight;ctx.drawImage(hammerImg,-hw/2,-8,hw,hh);ctx.restore();}else{ctx.fillStyle='#6b4a2e';round(ctx,-4,-6,10,118,4);ctx.fill();ctx.fillStyle='#3a4044';round(ctx,-34,96,70,34,6);ctx.fill();ctx.fillStyle='rgba(255,255,255,.12)';ctx.fillRect(-32,98,66,5);ctx.restore();}
  parts.draw(ctx);pops.draw(ctx);
  if(st.flash){ctx.fillStyle=`rgba(255,240,210,${st.flash*.5})`;ctx.fillRect(-20,-20,w+40,h+40);}
 }
 function round(c,x,y,w,h,r){c.beginPath();c.roundRect?c.roundRect(x,y,w,h,r):c.rect(x,y,w,h);}
 const down=e=>{if(e.target.closest('button'))return;e.preventDefault();strike();};
 const key=e=>{if(e.code==='Space'||e.key==='Enter'){if(!kit.result.hidden)return;e.preventDefault();strike();}};
 kit.stage.addEventListener('pointerdown',down);dlg.addEventListener('keydown',key);
 reset();stopLoop=loop(draw);
 dlg._stop=()=>{stopLoop?.();kit.stop();};
}
