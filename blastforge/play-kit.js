// Shared parts for the minigames: the full-screen shell, a crisp canvas, particles, pop-up text and the result card.
export const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function shell(dlg,{title,rewarded,hint}){
 dlg.innerHTML=`<div class="play-shell"><header class="play-head"><div><h2>${esc(title)}</h2><span class="play-tag ${rewarded?'rewarded':''}">${rewarded?'Rewarded run':'Free play'}</span></div><button type="button" class="icon-button play-quit" aria-label="Close game">×</button></header><div class="play-stage"><canvas></canvas><div class="play-hud"></div><p class="play-hint">${esc(hint)}</p><div class="play-result" hidden></div></div></div>`;
 dlg.querySelector('.play-quit').onclick=()=>dlg.close();dlg.addEventListener('cancel',()=>dlg._stop?.());
 const canvas=dlg.querySelector('canvas'),ctx=canvas.getContext('2d'),stage=dlg.querySelector('.play-stage');
 const view={w:0,h:0,dpr:1};
 const fit=()=>{view.dpr=Math.min(2,devicePixelRatio||1);view.w=stage.clientWidth;view.h=stage.clientHeight;canvas.width=Math.round(view.w*view.dpr);canvas.height=Math.round(view.h*view.dpr);canvas.style.width=view.w+'px';canvas.style.height=view.h+'px';};
 fit();const ro=new ResizeObserver(fit);ro.observe(stage);
 return {canvas,ctx,stage,view,hud:dlg.querySelector('.play-hud'),hint:dlg.querySelector('.play-hint'),result:dlg.querySelector('.play-result'),stop:()=>ro.disconnect()};
}
// A loop that pauses when the app is hidden.
export function loop(frame){
 let raf=0,last=performance.now(),alive=true;
 const tick=now=>{if(!alive)return;const dt=Math.min(.05,(now-last)/1000);last=now;frame(dt,now);raf=requestAnimationFrame(tick);};
 const vis=()=>{if(document.hidden){cancelAnimationFrame(raf);}else if(alive){cancelAnimationFrame(raf);last=performance.now();raf=requestAnimationFrame(tick);}};
 document.addEventListener('visibilitychange',vis);raf=requestAnimationFrame(tick);
 return ()=>{alive=false;cancelAnimationFrame(raf);document.removeEventListener('visibilitychange',vis);};
}
export class Particles{
 constructor(){this.list=[];}
 burst(x,y,n,{color='#ffcf7a',speed=260,life=.8,gravity=600,size=2.4,spread=Math.PI*2,angle=-Math.PI/2,glow=true}={}){if(reduced())n=Math.ceil(n/4);for(let i=0;i<n;i++){const a=angle+(Math.random()-.5)*spread,v=speed*(.35+Math.random()*.8);this.list.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:life*(.6+Math.random()*.6),age:0,color,gravity,size:size*(.6+Math.random()*.8),glow});}}
 update(dt){for(const p of this.list){p.age+=dt;p.vy+=p.gravity*dt;p.vx*=.985;p.x+=p.vx*dt;p.y+=p.vy*dt;}this.list=this.list.filter(p=>p.age<p.life);}
 draw(ctx){ctx.save();ctx.globalCompositeOperation='lighter';for(const p of this.list){const k=1-p.age/p.life;ctx.globalAlpha=k;ctx.fillStyle=p.color;if(p.glow){ctx.shadowColor=p.color;ctx.shadowBlur=8;}ctx.beginPath();ctx.arc(p.x,p.y,p.size*(.5+k*.5),0,Math.PI*2);ctx.fill();}ctx.restore();}
}
export class Popups{
 constructor(){this.list=[];}
 add(text,x,y,{color='#ffe2a6',size=30,life=.9}={}){this.list.push({text,x,y,color,size,life,age:0});}
 update(dt){for(const p of this.list)p.age+=dt;this.list=this.list.filter(p=>p.age<p.life);}
 draw(ctx){ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';for(const p of this.list){const t=p.age/p.life,s=t<.15?.6+t/.15*.55:1.15-(t-.15)*.2;ctx.globalAlpha=t>.7?(1-t)/.3:1;ctx.font=`700 ${p.size*s}px Grenze, Georgia, serif`;ctx.fillStyle=p.color;ctx.shadowColor='rgba(0,0,0,.6)';ctx.shadowBlur=8;ctx.fillText(p.text,p.x,p.y-t*40);}ctx.restore();}
}
export function showResult(kit,{title,lines,again,done}){
 kit.result.innerHTML=`<div class="result-card"><h3>${esc(title)}</h3><ul>${lines.map(([k,v])=>`<li><span>${esc(k)}</span><b>${v}</b></li>`).join('')}</ul><div class="dialog-actions"><button type="button" class="quiet result-again">Play again</button><button type="button" class="primary result-done">Done</button></div></div>`;
 kit.result.hidden=false;kit.result.querySelector('.result-again').onclick=again;kit.result.querySelector('.result-done').onclick=done;kit.result.querySelector('.result-done').focus({preventScroll:true});
}
export const lerp=(a,b,k)=>a+(b-a)*k;
export const mixColor=(a,b,k)=>{const h=x=>[1,3,5].map(i=>parseInt(x.slice(i,i+2),16)),A=h(a),B=h(b);return `rgb(${A.map((v,i)=>Math.round(v+(B[i]-v)*k)).join(',')})`;};
// A background picture drawn to cover the canvas (loaded once, drawn when ready).
export function backdrop(src){if(!src)return null;const img=new Image();img.src=src;return (ctx,w,h,alpha=1)=>{if(!img.complete||!img.naturalWidth)return false;const k=Math.max(w/img.naturalWidth,h/img.naturalHeight),iw=img.naturalWidth*k,ih=img.naturalHeight*k;ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(img,(w-iw)/2,(h-ih)/2,iw,ih);ctx.restore();return true;};}
