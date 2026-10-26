// The dragon, drawn as one SVG. Five growth stages, a mood, and whatever gear they wear.
// Animation is CSS (see .dragon in style.css): breathing, blinking, tail and wings.
const STAGE=[
 {head:1.14,body:.8,wing:.55,horn:.45,spikes:1},
 {head:1.02,body:.9,wing:.85,horn:.8,spikes:2},
 {head:.94,body:.98,wing:1.05,horn:1,spikes:3},
 {head:.88,body:1.06,wing:1.3,horn:1.25,spikes:4},
 {head:.86,body:1.1,wing:1.45,horn:1.45,spikes:5}
];
const GEAR_LOOK={
 collar:{c:'#c9a46a',d:'#7b5a2c'},'copper-bell':{c:'#d98b4e',d:'#8a4a22',bell:1},'talon-clasp':{c:'#dfe6f0',d:'#7d8796',gem:'#08d8a0'},
 goggles:{c:'#c9a46a',lens:'#7fd8ff'},'skyrider-goggles':{c:'#d7b06a',lens:'#ffc35a'},'flamewrought-helm':{c:'#ff7a4d',d:'#9e2235',helm:1},'crown-first-rider':{c:'#ffcf4a',d:'#b8860b',crown:1},
 saddle:{c:'#8a5a34',d:'#5a3820'},'skywarden-saddle':{c:'#6a4bc7',d:'#3d2b7a'},'runed-saddlebag':{c:'#7a5a3a',d:'#4f3a24'},
 cloak:{c:'#3b4a8a',d:'#24305e',cape:1},'emberwoven-cloak':{c:'#c8432f',d:'#7a2418',cape:1},'aurora-mantle':{c:'#5fd6c8',d:'#3d2bb8',cape:1},'wings-of-dawn':{c:'#ffcf86',d:'#ff6b93',cape:1},
 barding:{c:'#a9b1bc',d:'#5d6672',plate:1},'thunderwing-harness':{c:'#4fc3ff',d:'#1b4f7a',plate:1},
 lantern:{c:'#ffd27a'},'ash-lantern':{c:'#ff9a5a'},'glowmoss-lantern':{c:'#9be35a'},frostcharm:{c:'#bff3ff'},'bone-whistle':{c:'#efe6d2'},'wyrm-compass':{c:'#e8c37a'},'abyssal-pearl':{c:'#c9e6ff'},'phoenix-feather':{c:'#ff8a3d'},'eye-storm-wyrm':{c:'#b18cff'}
};
const look=thing=>thing?(GEAR_LOOK[thing.id]||{c:'#d6b580',d:'#7b5a2c'}):null;
let uid=0;

export function dragonSVG(d,equip={},{cls='',label=''}={}){
 const s=STAGE[Math.max(0,Math.min(4,d.stage||0))],c=d.color,id=`dg${++uid}`,mood=d.mood||'content';
 const bodyTop=200-96*s.body,headY=bodyTop-30*s.head+16,neckY=headY+24*s.head;
 const headT=`translate(130 ${headY.toFixed(1)}) scale(${s.head}) translate(-130 -80)`,bodyT=`translate(130 200) scale(${s.body}) translate(-130 -200)`;
 const wingT=side=>`translate(${side<0?108:152} ${(200-(200-124)*s.body).toFixed(1)}) scale(${s.wing*s.body}) translate(${side<0?-108:-152} -124)`;
 const hornL=s.horn;
 // Crop the canvas to this stage's height so a small baby isn't floating in empty space.
 const top=Math.max(0,Math.floor(Math.min(headY-(30+24*hornL)*s.head,200-76*s.body-44*s.wing*s.body)-8-(mood==='sleepy'?26:0)));
 const gNeck=look(equip.neck),gHead=look(equip.head),gSaddle=look(equip.saddle),gArmor=look(equip.armor),gCharm=look(equip.charm);
 const closed=mood==='sleepy',joy=['delighted','fiery'].includes(mood),sad=mood==='lonely';
 const eye=(x,flip)=>closed?`<path d="M${x-8} 77q8 6 16 0" fill="none" stroke="${c.dark}" stroke-width="2.6" stroke-linecap="round"/>`:
  `<g class="dg-eye"><ellipse cx="${x}" cy="76" rx="9.5" ry="11" fill="#fffaf0"/><circle cx="${x+(sad?0:2)}" cy="${sad?80:77}" r="6.6" fill="${c.eye}"/><ellipse cx="${x+(sad?0:2.5)}" cy="${sad?80:77}" rx="2.8" ry="4.6" fill="#1b1012"/><circle cx="${x+4.5}" cy="72" r="2.4" fill="#fff"/><circle cx="${x-1.5}" cy="81" r="1.1" fill="#fff" opacity=".8"/><rect class="dg-lid" x="${x-11}" y="63" width="22" height="26" rx="10" fill="${c.body}" transform="scale(1 0)"/></g>`;
 const mouth=joy?`<path d="M124 101q14 14 28 0q-14 4-28 0Z" fill="#5a1a22"/><path d="M132 106q6 4 12 0" fill="#ff8aa0"/>`:sad?`<path d="M128 106q10-5 20 0" fill="none" stroke="${c.dark}" stroke-width="2.2" stroke-linecap="round"/>`:mood==='restless'?`<path d="M128 104h20" stroke="${c.dark}" stroke-width="2.2" stroke-linecap="round"/>`:`<path d="M126 102q12 9 24 0" fill="none" stroke="${c.dark}" stroke-width="2.4" stroke-linecap="round"/>`;
 const backSpikes=Array.from({length:s.spikes},(_,i)=>{const x=130+(i-(s.spikes-1)/2)*11,y=bodyTop+4+Math.abs(i-(s.spikes-1)/2)*4;return `<path d="M${x-5} ${y+6}L${x} ${y-7}L${x+5} ${y+6}Z" fill="${c.horn}" opacity=".85"/>`;}).join('');
 const capeBehind=gArmor?.cape?`<path class="dg-cape" d="M98 ${neckY+4}C70 ${neckY+40} 66 176 74 196L186 196C194 176 190 ${neckY+40} 162 ${neckY+4}Z" fill="${gArmor.c}"/><path d="M98 ${neckY+4}C84 ${neckY+30} 80 170 84 196" fill="none" stroke="${gArmor.d}" stroke-width="3" opacity=".6"/><path d="M162 ${neckY+4}C176 ${neckY+30} 180 170 176 196" fill="none" stroke="${gArmor.d}" stroke-width="3" opacity=".6"/>`:'';
 const plate=gArmor?.plate?`<g transform="${bodyT}"><path d="M110 122h40l6 30-26 14-26-14Z" fill="${gArmor.c}" stroke="${gArmor.d}" stroke-width="2.5"/><path d="M114 134h32M112 146h36" stroke="${gArmor.d}" stroke-width="2"/><circle cx="130" cy="128" r="3" fill="${gArmor.d}"/></g>`:'';
 const saddle=gSaddle?`<g transform="${bodyT}"><path d="M98 118C110 132 150 132 162 118L166 128C150 144 110 144 94 128Z" fill="${gSaddle.c}" stroke="${gSaddle.d}" stroke-width="2"/><path d="M104 130l-8 34M156 130l8 34" stroke="${gSaddle.d}" stroke-width="4" stroke-linecap="round"/><rect x="124" y="132" width="12" height="9" rx="2" fill="#e6c28d" stroke="${gSaddle.d}" stroke-width="1.5"/></g>`:'';
 const collar=gNeck?`<g><ellipse cx="130" cy="${neckY}" rx="${26*s.body}" ry="7" fill="none" stroke="${gNeck.c}" stroke-width="7"/><ellipse cx="130" cy="${neckY}" rx="${26*s.body}" ry="7" fill="none" stroke="${gNeck.d}" stroke-width="1.5" stroke-dasharray="2 7"/>${gNeck.bell?`<path d="M124 ${neckY+6}h12l-1 10h-10Z" fill="${gNeck.c}" stroke="${gNeck.d}" stroke-width="1.5"/><circle cx="130" cy="${neckY+18}" r="2" fill="${gNeck.d}"/>`:gNeck.gem?`<path d="M130 ${neckY+3}l6 7-6 8-6-8Z" fill="${gNeck.gem}" stroke="#fff" stroke-width="1"/>`:`<circle cx="130" cy="${neckY+7}" r="4" fill="${gNeck.c}" stroke="${gNeck.d}" stroke-width="1.5"/>`}</g>`:'';
 const charm=gCharm?`<g class="dg-charm"><path d="M130 ${neckY+6}v10" stroke="#c9a46a" stroke-width="1.5"/><circle cx="130" cy="${neckY+22}" r="7" fill="${gCharm.c}"/><circle cx="130" cy="${neckY+22}" r="14" fill="${gCharm.c}" opacity=".25" class="dg-glow"/><circle cx="128" cy="${neckY+20}" r="2" fill="#fff" opacity=".8"/></g>`:'';
 const headGear=!gHead?'':gHead.crown?`<path d="M106 56l8 10 8-14 8 12 8-12 8 14 8-10-4 16h-40Z" fill="${gHead.c}" stroke="${gHead.d}" stroke-width="1.5"/><circle cx="130" cy="62" r="3" fill="#ff6b93"/>`:gHead.helm?`<path d="M100 66c4-22 56-22 60 0l-6 6c-10-8-38-8-48 0Z" fill="${gHead.c}" stroke="${gHead.d}" stroke-width="2"/><path d="M130 46v20" stroke="${gHead.d}" stroke-width="3"/>`:`<path d="M98 62c10-4 54-4 64 0" stroke="#5a3820" stroke-width="4" fill="none"/><circle cx="117" cy="60" r="9" fill="${gHead.lens}" stroke="${gHead.c}" stroke-width="4" opacity=".95"/><circle cx="143" cy="60" r="9" fill="${gHead.lens}" stroke="${gHead.c}" stroke-width="4" opacity=".95"/><path d="M113 57l4-3M139 57l4-3" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`;
 const zzz=closed?`<g class="dg-zzz" fill="${c.horn}" font-family="Grenze,serif" font-weight="700"><text x="170" y="52" font-size="16">z</text><text x="182" y="36" font-size="12">z</text><text x="192" y="24" font-size="9">z</text></g>`:'';
 const puffs=mood==='fiery'?`<g class="dg-puffs"><circle cx="134" cy="94" r="4" fill="${c.glow}"/><circle cx="146" cy="94" r="4" fill="${c.glow}"/></g>`:'';
 const aura=d.stage>=4?`<ellipse class="dg-aura" cx="130" cy="130" rx="105" ry="90" fill="url(#${id}a)"/>`:'';
 return `<svg class="dragon mood-${mood} stage-${d.stage} ${cls}" viewBox="0 ${top} 260 ${214-top}" role="img" aria-label="${label||`${d.name}, ${d.stageName}, feeling ${mood}`}">
 <defs><radialGradient id="${id}b" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="${c.body}"/><stop offset="1" stop-color="${c.dark}"/></radialGradient>
 <radialGradient id="${id}h" cx=".45" cy=".3" r=".75"><stop offset="0" stop-color="${c.body}"/><stop offset=".85" stop-color="${c.body}"/><stop offset="1" stop-color="${c.dark}"/></radialGradient>
 <linearGradient id="${id}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.membrane}"/><stop offset="1" stop-color="${c.wing}"/></linearGradient>
 <radialGradient id="${id}a"><stop offset="0" stop-color="${c.glow}" stop-opacity=".35"/><stop offset="1" stop-color="${c.glow}" stop-opacity="0"/></radialGradient></defs>
 ${aura}<ellipse cx="130" cy="203" rx="${62*s.body+8}" ry="7" fill="#000" opacity=".32"/>
 <g class="dg-all">
 <g class="dg-wing dg-wing-l" style="transform-origin:108px ${(200-76*s.body).toFixed(0)}px"><g transform="${wingT(-1)}"><path d="M108 122C92 96 72 82 46 80C56 92 54 100 60 108C50 112 52 122 62 126C74 132 92 132 108 134Z" fill="url(#${id}w)"/><path d="M108 124L50 82M108 128L60 108M108 131L64 126" stroke="${c.dark}" stroke-width="2.2" stroke-linecap="round" opacity=".55"/><path d="M108 122C92 96 72 82 46 80" fill="none" stroke="${c.dark}" stroke-width="3" stroke-linecap="round"/></g></g>
 <g class="dg-wing dg-wing-r" style="transform-origin:152px ${(200-76*s.body).toFixed(0)}px"><g transform="${wingT(1)}"><path d="M152 122C168 96 188 82 214 80C204 92 206 100 200 108C210 112 208 122 198 126C186 132 168 132 152 134Z" fill="url(#${id}w)"/><path d="M152 124L210 82M152 128L200 108M152 131L196 126" stroke="${c.dark}" stroke-width="2.2" stroke-linecap="round" opacity=".55"/><path d="M152 122C168 96 188 82 214 80" fill="none" stroke="${c.dark}" stroke-width="3" stroke-linecap="round"/></g></g>
 ${capeBehind}
 <g class="dg-tail" style="transform-origin:150px 180px"><g transform="${bodyT}"><path d="M150 168C192 170 218 180 210 196C202 207 160 206 118 203L120 196C156 198 190 197 198 190C203 183 182 178 150 180Z" fill="url(#${id}b)"/><path d="M124 194L102 199L124 206L118 199Z" fill="${c.horn}"/></g></g>
 <g class="dg-body"><g transform="${bodyT}">
  <ellipse cx="130" cy="142" rx="38" ry="38" fill="url(#${id}b)"/>
  <ellipse cx="130" cy="150" rx="24" ry="28" fill="${c.belly}"/><path d="M110 140q20 6 40 0M108 152q22 7 44 0M111 164q19 6 38 0" fill="none" stroke="${c.dark}" stroke-width="1.6" opacity=".28"/>
  <ellipse cx="100" cy="166" rx="19" ry="18" fill="url(#${id}b)"/><ellipse cx="160" cy="166" rx="19" ry="18" fill="url(#${id}b)"/>
  <ellipse cx="100" cy="186" rx="15" ry="7" fill="${c.body}"/><ellipse cx="160" cy="186" rx="15" ry="7" fill="${c.body}"/>
  <g fill="${c.horn}"><circle cx="90" cy="190" r="2.6"/><circle cx="97" cy="192" r="2.6"/><circle cx="104" cy="192" r="2.6"/><circle cx="156" cy="192" r="2.6"/><circle cx="163" cy="192" r="2.6"/><circle cx="170" cy="190" r="2.6"/></g>
  <g class="dg-arms"><ellipse cx="114" cy="156" rx="7.5" ry="13" fill="${c.body}" transform="rotate(-14 114 156)"/><ellipse cx="146" cy="156" rx="7.5" ry="13" fill="${c.body}" transform="rotate(14 146 156)"/></g>
 </g></g>
 ${backSpikes}${plate}${saddle}${collar}${charm}
 <g class="dg-head" style="transform-origin:130px ${(headY+20).toFixed(0)}px"><g transform="${headT}">
  <path d="M110 60Q${104-8*hornL} ${52-8*hornL} ${100-10*hornL} ${50-24*hornL}Q${114-2*hornL} ${50-8*hornL} 122 55Z" fill="${c.horn}"/><path d="M150 60Q${156+8*hornL} ${52-8*hornL} ${160+10*hornL} ${50-24*hornL}Q${146+2*hornL} ${50-8*hornL} 138 55Z" fill="${c.horn}"/>
  <path class="dg-ear dg-ear-l" d="M100 76L${sad?82:80} ${sad?88:64}L102 92Z" fill="${c.membrane}"/><path class="dg-ear dg-ear-r" d="M160 76L${sad?178:180} ${sad?88:64}L158 92Z" fill="${c.membrane}"/>
  <ellipse cx="130" cy="80" rx="34" ry="30" fill="url(#${id}h)"/>
  <path d="M124 52L130 42L136 52Z" fill="${c.horn}"/>
  <ellipse cx="130" cy="97" rx="21" ry="13" fill="${c.belly}" opacity=".9"/>
  <ellipse cx="107" cy="92" rx="6" ry="3.6" fill="#ff7f97" opacity=".45"/><ellipse cx="153" cy="92" rx="6" ry="3.6" fill="#ff7f97" opacity=".45"/>
  ${eye(116)}${eye(144)}
  <ellipse cx="124" cy="94" rx="2" ry="1.4" fill="${c.dark}"/><ellipse cx="136" cy="94" rx="2" ry="1.4" fill="${c.dark}"/>
  ${mouth}${puffs}${headGear}
 </g></g>
 </g>${zzz}
 <g class="dg-fx"></g>
</svg>`;
}

// Hearts, crumbs or sparks pop out of the dragon. The svg must be in the page.
export function dragonFx(svg,kind='heart'){
 if(!svg||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const host=svg.closest('.dragon-stage')||svg.parentElement;if(!host)return;
 const glyph={heart:'❤',crumb:'•',spark:'✦',note:'♪'}[kind]||'✦';
 const n=kind==='crumb'?8:5;
 for(let i=0;i<n;i++){const el=document.createElement('span');el.className=`dragon-fx fx-${kind}`;el.textContent=glyph;el.setAttribute('aria-hidden','true');
  const x=45+Math.random()*12-6+(kind==='crumb'?0:0),dx=(Math.random()-.5)*(kind==='crumb'?120:80);el.style.left=`${x}%`;el.style.top=kind==='crumb'?'48%':'30%';host.append(el);
  el.animate([{transform:'translate(-50%,0) scale(.4)',opacity:0},{transform:`translate(calc(-50% + ${dx*.4}px),-20px) scale(1.1)`,opacity:1,offset:.25},{transform:`translate(calc(-50% + ${dx}px),${kind==='crumb'?60:-90}px) scale(.8)`,opacity:0}],{duration:900+Math.random()*500,delay:i*80,easing:'cubic-bezier(.2,.7,.3,1)'}).onfinish=()=>el.remove();}
}
export function dragonReact(svg,kind='hop'){if(!svg)return;svg.classList.remove('react-hop','react-wiggle','react-flap');void svg.getBoundingClientRect();svg.classList.add(`react-${kind}`);clearTimeout(svg._react);svg._react=setTimeout(()=>svg.classList.remove(`react-${kind}`),900);}
