// Worn gear drawn onto the painted dragon. Each portrait has its own neck, forehead and chest
// positions (percent of the square picture), measured by eye from the art. Straps, bands and capes
// are drawn; small objects (charms, helms, crowns, goggles) reuse their painted item or relic art.
import {ART_FILES} from './art-files.js?v=16';
const A={ // neck [x,y,width], head [x,y,width], chest [x,y,width,height]
 'ember-baby':{n:[55,55,28],h:[52,24,30],c:[56,70,18,25]},'ember-fledgling':{n:[61,34,12],h:[61,15,18],c:[58,50,16,28]},'ember-juvenile':{n:[62,38,12],h:[60,15.5,16],c:[63,56,13,26]},'ember-adult':{n:[63,35,11],h:[57,15,15],c:[67,55,13,28]},'ember-elder':{n:[50,30,12],h:[48,12.5,14],c:[50,50,16,28]},
 'tide-baby':{n:[52,55,30],h:[50,24,30],c:[55,71,20,26]},'tide-fledgling':{n:[43,39,13],h:[40,17,18],c:[43,60,16,28]},'tide-juvenile':{n:[55,36,11],h:[50,14,15],c:[66,59,12,26]},'tide-adult':{n:[64,32,10],h:[57,14,14],c:[71,54,15,30]},'tide-elder':{n:[58,33,11],h:[57,15,14],c:[60,54,14,30]},
 'moss-baby':{n:[55,52,28],h:[52,21,30],c:[59,67,18,26]},'moss-fledgling':{n:[55,40,13],h:[52,17.5,18],c:[57,59,15,27]},'moss-juvenile':{n:[56,35,11],h:[55,14,15],c:[55,56,14,27]},'moss-adult':{n:[52,32,11],h:[50,12.5,14],c:[51,54,18,30]},'moss-elder':{n:[55,31,11],h:[52,11,14],c:[57,52,14,28]},
 'dusk-baby':{n:[57,54,28],h:[55,21,30],c:[61,68,18,24]},'dusk-fledgling':{n:[68,41,12],h:[66,19,17],c:[69,60,14,25]},'dusk-juvenile':{n:[55,34,11],h:[52,12.5,15],c:[60,55,14,25]},'dusk-adult':{n:[62,33,11],h:[57,14,14],c:[65,54,17,30]},'dusk-elder':{n:[53,33,11],h:[52,12.5,14],c:[56,55,16,28]}
};
const HAS={items:new Set(ART_FILES.items||[]),relics:new Set(ART_FILES.relics||[])};
const artOf=g=>g.type==='relic'?(HAS.relics.has(g.id)?`./assets/relics/${g.id}.webp`:null):(HAS.items.has(g.id)?`./assets/items/${g.id}.webp`:null);
const RAR={common:'#d7c4a2',rare:'#4fc3ff',epic:'#c08bff',legendary:'#ffcf4a'};
// Band colors: [main, highlight, trim]
const NECK={collar:['#7a3b22','#a85a34','#e9c27a'],scarf:['#7d4fc9','#b58cff','#f3d27a'],'copper-bell':['#5b3423','#80503a','#d68a4a'],'talon-clasp':['#9aa3ae','#dfe6ee','#f4f7fb']};
const ARMOR={cloak:['#26404c','#3f6a7a','#c9a15a'],mantle:['#a9d6ee','#e8f6ff','#ffffff'],barding:['#6d737b','#a7adb5','#d9b36a'],'emberwoven-cloak':['#9c2f22','#e0583e','#ffcf6a'],'aurora-mantle':['#5fb3c9','#bdf3ff','#e8d5ff'],'thunderwing-harness':['#3a3f52','#6b7390','#ffe27a'],'wings-of-dawn':['#e9a94f','#ffe2a6','#fff4d6']};
const SADDLE={saddle:['#6b3a22','#9a5a36','#e9c27a'],racer:['#3c2a22','#5c4436','#4fd0b0'],packsaddle:['#6b4a2a','#8f6a40','#d6b580'],'runed-saddlebag':['#4a3a5a','#6e5a86','#c9a8ff'],'skywarden-saddle':['#5a3018','#8a4a24','#ffcf6a']};
const f=n=>n.toFixed(2);
function band(x,y,w,[main,hi,trim],{rivets=true,thick=w<20?.3:.2}={}){
 const t=w*thick,dip=w*.32,l=x-w/2,r=x+w/2;
 const top=`M${f(l)} ${f(y)}Q${f(x)} ${f(y+dip)} ${f(r)} ${f(y)}`,bot=`L${f(r)} ${f(y+t)}Q${f(x)} ${f(y+dip+t)} ${f(l)} ${f(y+t)}Z`;
 let s=`<path d="${top}${bot}" fill="${main}" stroke="#2a140c" stroke-width="${f(w*.025)}" stroke-linejoin="round"/><path d="M${f(l+w*.06)} ${f(y+t*.3)}Q${f(x)} ${f(y+dip+t*.3)} ${f(r-w*.06)} ${f(y+t*.3)}" fill="none" stroke="${hi}" stroke-width="${f(t*.28)}" stroke-linecap="round" opacity=".8"/>`;
 if(rivets)for(const k of [.18,.36,.64,.82]){const px=l+w*k,py=y+t*.55+dip*(1-(2*k-1)**2)*.5;s+=`<circle cx="${f(px)}" cy="${f(py)}" r="${f(t*.2)}" fill="${trim}" stroke="#3a220f" stroke-width="${f(t*.06)}"/>`;}
 return {svg:s,bottom:y+dip*.5+t};
}
const picture=(src,x,y,w,cls='')=>`<image class="${cls}" href="${src}" x="${f(x-w/2)}" y="${f(y-w/2)}" width="${f(w)}" height="${f(w)}"/>`;
export function gearLayer(id,equip){
 const a=A[id];if(!a||!equip)return {back:'',front:''};const parts=[];const [nx,ny,nw]=a.n,[hx,hy,hw]=a.h,[cx,cy,cw,ch]=a.c;
 // Armor: plates cover the chest; capes hang behind the dragon and show around its sides.
 const back=[];const ar=equip.armor;if(ar){const col=ARMOR[ar.id]||[RAR[ar.rarity]||'#888','#fff','#fff'];
  if(['barding','thunderwing-harness'].includes(ar.id)){const w=cw*.8,h=ch*.62,y0=cy-h*.38,rows=3;let plates='';for(let i=rows-1;i>=0;i--){const yy=y0+h*i/rows,ww=w*(1-i*.12);plates+=`<path d="M${f(cx-ww/2)} ${f(yy)}Q${f(cx)} ${f(yy-h*.06)} ${f(cx+ww/2)} ${f(yy)}L${f(cx+ww*.44)} ${f(yy+h*.42)}Q${f(cx)} ${f(yy+h*.56)} ${f(cx-ww*.44)} ${f(yy+h*.42)}Z" fill="${col[0]}" stroke="#1d1f24" stroke-width="${f(w*.025)}"/><path d="M${f(cx-ww*.38)} ${f(yy+h*.06)}Q${f(cx)} ${f(yy)} ${f(cx+ww*.38)} ${f(yy+h*.06)}" fill="none" stroke="${col[1]}" stroke-width="${f(w*.04)}" opacity=".8"/><circle cx="${f(cx)}" cy="${f(yy+h*.22)}" r="${f(w*.035)}" fill="${col[2]}"/>`;}parts.push(plates);}
  else{const baby=id.endsWith('baby'),top=ny+nw*.1,bot=Math.min(baby?90:96,cy+ch*(baby?.9:1.25)),wt=cw*1.3,wb=cw*(baby?2.2:3.4);back.push(`<path d="M${f(cx-wt/2)} ${f(top)}L${f(cx+wt/2)} ${f(top)}Q${f(cx+wb*.42)} ${f((top+bot)/2)} ${f(cx+wb/2)} ${f(bot)}Q${f(cx)} ${f(bot-ch*.18)} ${f(cx-wb/2)} ${f(bot)}Q${f(cx-wb*.42)} ${f((top+bot)/2)} ${f(cx-wt/2)} ${f(top)}Z" fill="${col[0]}" stroke="#140f0f" stroke-width="${f(cw*.04)}"/><path d="M${f(cx-wb/2)} ${f(bot)}Q${f(cx)} ${f(bot-ch*.18)} ${f(cx+wb/2)} ${f(bot)}" fill="none" stroke="${col[2]}" stroke-width="${f(cw*.08)}"/><path d="M${f(cx-wt*.3)} ${f(top+2)}Q${f(cx-wb*.3)} ${f((top+bot)/2)} ${f(cx-wb*.36)} ${f(bot-1)}M${f(cx+wt*.3)} ${f(top+2)}Q${f(cx+wb*.3)} ${f((top+bot)/2)} ${f(cx+wb*.36)} ${f(bot-1)}" fill="none" stroke="${col[1]}" stroke-width="${f(cw*.06)}" opacity=".5"/>`);
   parts.push(`<path d="M${f(nx-nw*.55)} ${f(ny+nw*.05)}Q${f(nx-nw*.7)} ${f(ny+nw*.3)} ${f(nx-nw*.62)} ${f(ny+nw*.5)}M${f(nx+nw*.55)} ${f(ny+nw*.05)}Q${f(nx+nw*.7)} ${f(ny+nw*.3)} ${f(nx+nw*.62)} ${f(ny+nw*.5)}" fill="none" stroke="${col[0]}" stroke-width="${f(nw*.12)}" stroke-linecap="round"/>`);}}
 // Saddle: from the front you see its girth strap and buckle.
 const sa=equip.saddle;if(sa){const col=SADDLE[sa.id]||['#5a3a2a','#8a5a3a',RAR[sa.rarity]||'#e9c27a'],y=cy+ch*.32,w=cw*1.25,t=cw*.13;parts.push(`<path d="M${f(cx-w/2)} ${f(y)}Q${f(cx)} ${f(y+t*1.3)} ${f(cx+w/2)} ${f(y)}L${f(cx+w/2)} ${f(y+t)}Q${f(cx)} ${f(y+t*2.3)} ${f(cx-w/2)} ${f(y+t)}Z" fill="${col[0]}" stroke="#24120a" stroke-width="${f(t*.15)}"/><rect x="${f(cx-t*.7)}" y="${f(y+t*.35)}" width="${f(t*1.4)}" height="${f(t*1.2)}" rx="${f(t*.2)}" fill="none" stroke="${col[2]}" stroke-width="${f(t*.28)}"/>`);}
 // Neck band, then the charm hanging from it.
 const ne=equip.neck,ch2=equip.charm;let hang=ny+nw*.3;
 if(ne){const b=band(nx,ny,nw,NECK[ne.id]||['#4a3424','#6e5038',RAR[ne.rarity]||'#e9c27a']);parts.push(b.svg);hang=b.bottom;
  if(ne.id==='scarf')parts.push(`<path d="M${f(nx+nw*.28)} ${f(ny+nw*.22)}q${f(nw*.12)} ${f(nw*.4)} ${f(nw*.02)} ${f(nw*.85)}l${f(nw*.16)} ${f(-nw*.05)}q${f(nw*.06)} ${f(-nw*.45)} ${f(-nw*.04)} ${f(-nw*.8)}Z" fill="#7d4fc9" stroke="#2a140c" stroke-width="${f(nw*.02)}"/>`);
  if(ne.type==='relic'&&!ch2){const src=artOf(ne);if(src)parts.push(picture(src,nx,hang+nw*.12,nw*.34,'gear-pendant'));}}
 if(ch2){const src=artOf(ch2),len=nw*.1,size=Math.max(6.5,nw*.42);if(!ne)parts.push(`<path d="M${f(nx-nw*.42)} ${f(ny)}Q${f(nx)} ${f(ny+nw*.38)} ${f(nx+nw*.42)} ${f(ny)}" fill="none" stroke="#c9a15a" stroke-width="${f(nw*.04)}" stroke-dasharray="${f(nw*.05)} ${f(nw*.03)}"/>`);
  parts.push(`<line x1="${f(nx)}" y1="${f(hang-nw*.04)}" x2="${f(nx)}" y2="${f(hang+len)}" stroke="#d6b580" stroke-width="${f(nw*.035)}"/>`);
  parts.push(src?`<g class="gear-charm">${picture(src,nx,hang+len+size*.42,size)}</g>`:`<circle cx="${f(nx)}" cy="${f(hang+len+size*.35)}" r="${f(size*.3)}" fill="${RAR[ch2.rarity]||'#ffcf6a'}"/>`);}
 // Head: the item's own art sits on the brow (goggles), crowns and helms sit a little higher.
 const he=equip.head;if(he){const src=artOf(he),up=['crown','crown-first-rider'].includes(he.id)?hw*.45:he.id==='helm'||he.id==='flamewrought-helm'?hw*.2:0,size=hw*(he.id==='goggles'||he.id==='skyrider-goggles'?.95:1.05);
  if(src)parts.push(picture(src,hx,hy-up,size,'gear-head'));}
 const svg=(list,cls)=>list.length?`<svg class="gear-layer ${cls}" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${list.join('')}</svg>`:'';
 return {back:svg(back,'gear-back'),front:svg(parts,'gear-front')};
}
// Where the mouth is, for treats flying in and puffs of smoke (percent of the picture).
export function mouthOf(id){const a=A[id];if(!a)return [50,40];const [nx,ny,nw]=a.n,[hx]=a.h;return [hx+(nx-hx)*.4,ny-nw*(id.endsWith('baby')?.35:.55)];}
