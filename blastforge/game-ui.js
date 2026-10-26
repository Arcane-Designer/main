// The game screens: Dragon, Craft, Games, Vault and Isles, plus the dragon on the Today panel.
import {gameState,hash,ITEMS,ITEM,MATERIALS,RELICS,RARITIES,SLOTS,STAGES,UNLOCKS,ISLES,DRAGON_COLORS,PERKS,THEMES,ACHIEVEMENTS,costFor,canAfford,craftChanges,feedChanges,petChanges,adoptChanges,equipChanges,claimBountyChanges,flightPlan,flyChanges,anvilZone,anvilRewardChanges,catchRewardChanges,themeChanges,achievementChanges,NAME_MAX,setDevice} from './game.js?v=15';
import {dragonSVG,dragonFx,dragonReact} from './dragon.js?v=15';
import {art} from './art.js?v=15';
import {ART_FILES} from './art-files.js?v=15';
import {sfx} from './sound.js?v=15';
import {playAnvil} from './anvil.js?v=15';
import {playCatch} from './catch.js?v=15';

let C=null,cache=null,adoptColor=0,feedOpen=false,slotOpen=null,recipeTab='treat',vaultTab='relics',flying=false;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const read=(k,f)=>{try{const v=localStorage.getItem(k);return v===null?f:v;}catch{return f;}};
const write=(k,v)=>{try{localStorage.setItem(k,String(v));}catch{}};
export function initGame(ctx){C=ctx;let id=read('blastforge-device-v1','');if(!/^[a-z0-9]{6}$/.test(id)){id=Array.from(crypto.getRandomValues(new Uint8Array(6)),b=>'abcdefghijklmnopqrstuvwxyz0123456789'[b%36]).join('');write('blastforge-device-v1',id);}setDevice(id);}
export function game(){const r=C.Store.records,v=C.Store.revision,d=C.today(),h=new Date().getHours();if(!cache||cache.r!==r||cache.v!==v||cache.d!==d||cache.h!==h)cache={r,v,d,h,s:gameState(r,d,{hour:h})};return cache.s;}

// ---- small pieces ----
const matColor=k=>k==='embers'?'#ffb45e':k==='energy'?'#7fd8ff':MATERIALS[k]?.color||'#d6b580';
const matName=k=>k==='embers'?'Embers':k==='energy'?'Flight energy':MATERIALS[k]?.name||k;
// Painted art where it exists, line icons everywhere else.
const HAS=Object.fromEntries(['relics','items','materials','isles','scenes','dragons','sprites'].map(k=>[k,new Set(ART_FILES[k]||[])]));
// A painted portrait for big moments when one exists; the live SVG otherwise.
const portrait=(d,equip)=>{const id=`${d.color.id}-${STAGES[d.stage].name.toLowerCase()}`;return HAS.dragons.has(id)?`<img class="portrait" src="./assets/dragons/${id}.webp" alt="${esc(d.name)}">`:dragonSVG({...d,mood:'delighted'},equip);};
const portraitId=d=>`${d.color.id}-${STAGES[d.stage].name.toLowerCase()}`;
// The living dragon: the painted portrait with its own idle motion and mood effects, or the SVG if no portrait exists.
const MOOD_FX={sleepy:'<span class="pfx zzz"><i>z</i><i>z</i><i>z</i></span>',fiery:'<span class="pfx embers"><i></i><i></i><i></i><i></i></span>',delighted:'<span class="pfx sparkles"><i>✦</i><i>✦</i></span>'};
function liveDragon(d,equip,{label=''}={}){
 if(!HAS.dragons.has(portraitId(d)))return dragonSVG(d,equip,{label});
 return `<span class="dragon dragon-portrait mood-${d.mood} stage-${d.stage}" role="img" aria-label="${esc(label||`${d.name}, ${d.stageName}, feeling ${d.mood}`)}"><img src="./assets/dragons/${portraitId(d)}.webp" alt="" decoding="async">${MOOD_FX[d.mood]||''}</span>`;
}
const scene=id=>HAS.scenes.has(id)?`./assets/scenes/${id}.webp`:null;
export const pic=(kind,id,icon)=>HAS[kind].has(id)?`<img class="art-img" src="./assets/${kind}/${id}.webp" alt="" loading="lazy" decoding="async">`:art(icon);
const matIcon=k=>k==='energy'?art('bolt'):pic('materials',k,k==='embers'?'embers':MATERIALS[k]?.icon);
const chip=(k,n,short=false)=>`<span class="cost ${short?'short':''}" style="--c:${matColor(k)}" title="${esc(matName(k))}">${matIcon(k)}<b>${n}</b></span>`;
const chips=obj=>Object.entries(obj).map(([k,n])=>chip(k,n)).join('');
const bar=(p,cls='')=>`<div class="g-bar ${cls}"><span style="width:${Math.max(0,Math.min(100,p*100)).toFixed(1)}%"></span></div>`;
const TAGS={storm:'Crosses storm islands',frost:'Crosses frozen islands',light:'Lights the way through mist and caves'};
const powers=x=>[x.perk?PERKS[x.perk]:'',...(x.tags?.length?x.tags:x.tag?[x.tag]:[]).map(t=>TAGS[t])].filter(Boolean);
const coin=(r,cls='')=>`<span class="relic-coin rar-${r.rarity} ${cls} ${HAS.relics.has(r.id)?'has-art':''}" style="--r:${RARITIES[r.rarity].color}">${pic('relics',r.id,r.icon)}</span>`;
const tile=(x,extra='')=>`<span class="item-tile ${HAS.items.has(x.id)?'has-art':''}">${pic('items',x.id,x.icon)}${extra}</span>`;
const MOOD={content:'Content',sleepy:'Sleepy',restless:'Restless · waiting on a goal',happy:'Happy',delighted:'Delighted',fiery:'Fired up',lonely:'Missed you'};
const STATS=[['strength','Strength','Movement','Widens the anvil’s perfect zone'],['vitality','Vitality','Health','Extra lives in Ember Catch'],['wisdom','Wisdom','Learning','Bonus materials when you craft'],['spirit','Spirit','Creative, hobbies, personal','Bond grows faster']];

export function navAlerts(s=game()){return {
 dragon:!s.dragon.named,
 craft:s.bounties.some(b=>b.done&&!b.claimed)||s.lastWeekBounties.length>0,
 games:(s.anvilToday.eligible&&!s.anvilToday.played)||(s.unlocked.has('catch')&&s.catchToday.eligible&&!s.catchToday.played),
 vault:s.achievements.some(a=>a.ready),
 isles:Boolean(flightPlan(s)?.ok)
};}

// ---- the dragon perched on the Today panel ----
const sig=(s,d)=>[d.mood,d.stage,d.color.id,d.named,...Object.values(s.equip).map(x=>x?.code||0)].join('|');
export function companion(){const s=game(),d=s.dragon;return `<button class="companion" data-keep="companion" data-sig="${sig(s,d)}" data-g-go="dragon" aria-label="${d.named?`${esc(d.name)} · ${MOOD[d.mood]}`:'Someone is waiting by the forge'}">${liveDragon(d.named?d:{...d,mood:'delighted'},s.equip,{label:' '})}${d.named?'':'<span class="companion-ping">!</span>'}</button>`;}
export function companionReact(kind='hop'){const svg=document.querySelector('.companion .dragon');if(!svg)return;dragonReact(svg,kind);if(kind==='hop'){dragonFx(svg,'spark');sfx('chirp',game().dragon.stage);}}

// ---- Dragon ----
function adoptView(s){
 const c=DRAGON_COLORS[adoptColor],preview={...s.dragon,color:c,mood:'delighted',stage:0,name:'Your dragon'};
 return `<section class="panel adopt"><span class="eyebrow">A visitor at the forge</span><h2>A baby dragon</h2>
 <div class="dragon-stage adopt-stage">${HAS.dragons.has(`${c.id}-baby`)?`<img class="portrait adopt-portrait" src="./assets/dragons/${c.id}-baby.webp" alt="A ${c.name.toLowerCase()} baby dragon">`:dragonSVG(preview,{},{label:'A baby dragon'})}</div>
 <p class="adopt-copy">They crept in to sleep by the coals, and they’ve decided you’re theirs. They grow when you keep your goals, and they never leave.</p>
 <div class="swatches" role="radiogroup" aria-label="Color">${DRAGON_COLORS.map((x,i)=>`<button role="radio" aria-checked="${i===adoptColor}" class="swatch ${i===adoptColor?'on':''}" data-g="color" data-i="${i}" style="--a:${x.body};--b:${x.dark}"><span></span>${x.name}</button>`).join('')}</div>
 <label class="name-field">Name<input id="dragon-name" maxlength="${NAME_MAX}" autocomplete="off" spellcheck="false" placeholder="Give them a name"></label>
 <button class="primary adopt-go" data-g="adopt">${art('heart')} Keep them</button>
 ${s.wallet.embers?`<p class="help">Your goals so far have already earned ${chip('embers',s.wallet.embers)} for the workshop.</p>`:''}</section>`;
}
function dragonView(s){
 const d=s.dragon;if(!d.named)return adoptView(s);
 const next=STAGES[d.stage+1],treats=ITEMS.filter(x=>x.kind==='treat');
 const feed=feedOpen?`<div class="feed-tray">${treats.map(t=>`<button class="treat" data-g="feed" data-item="${t.id}" ${s.inventory[t.id]&&d.fedToday<3?'':'disabled'}>${pic('items',t.id,t.icon)}<span>${esc(t.name)}</span><b>${s.inventory[t.id]}</b></button>`).join('')}<p class="help">${d.fedToday>=3?`${esc(d.name)} is full for today.`:`A treat makes ${esc(d.name)} well-fed: today’s heat earns 10% more embers.`} <button class="text-link" data-g-go="craft">Craft treats</button></p></div>`:'';
 const slotList=sl=>{const items=ITEMS.filter(x=>x.slot===sl&&s.inventory[x.id]).map(x=>({...ITEM[x.id],type:'item'})),relics=s.relics.filter(r=>r.slot===sl).map(r=>({...r,type:'relic'})),cur=s.equip[sl];
  const all=[...items,...relics];return `<div class="slot-picker">${all.length?all.map(x=>`<button class="pick ${cur?.code===x.code?'on':''}" data-g="equip" data-slot="${sl}" data-code="${cur?.code===x.code?0:x.code}">${x.type==='relic'?coin(x):tile(x)}<span><strong>${esc(x.name)}</strong><small>${esc(powers(x).join(' · ')||x.desc||'')}</small></span><em>${cur?.code===x.code?'Remove':'Wear'}</em></button>`).join(''):`<p class="help">Nothing for this slot yet. Craft gear in the workshop or forge relics that fit.</p>`}</div>`;};
 const slots=SLOTS.map(sl=>{const g=s.equip[sl.key],locked=d.stage<sl.stage;return `<button class="slot ${g?'filled':''} ${locked?'locked':''} ${slotOpen===sl.key?'open':''}" data-g="slot" data-slot="${sl.key}" ${locked?'aria-disabled="true"':''} aria-expanded="${slotOpen===sl.key}"><span class="slot-icon" ${g?.rarity?`style="--r:${RARITIES[g.rarity].color}"`:''}>${locked?art('lock'):g?(g.type==='relic'?pic('relics',g.id,g.icon):pic('items',g.id,g.icon)):art('plus')}</span><small>${sl.label}</small><strong>${locked?`At ${STAGES[sl.stage].name}`:g?esc(g.name):'Empty'}</strong></button>`;}).join('');
 const open=slotOpen&&d.stage>=SLOTS.find(x=>x.key===slotOpen).stage?slotList(slotOpen):'';
 const maxStat=Math.max(40,...Object.values(d.stats));
 return `<section class="panel den">
  <div class="den-head"><div><h2>${esc(d.name)}</h2><span class="stage-chip">${d.stageName}</span></div><span class="mood-chip mood-${d.mood}">${MOOD[d.mood]}${d.fedToday?' · Well-fed':''}</span></div>
  <div data-keep="den" data-sig="${sig(s,d)}" class="dragon-stage den-stage ${scene('den')?'has-den':''}" ${scene('den')?`style="--den:url('${scene('den')}')"`:''} data-g="pet" role="button" tabindex="0" aria-label="Pet ${esc(d.name)}">${liveDragon(d,s.equip)}</div>
  <p class="quirk">${esc(d.quirk)}</p>
  <div class="bond"><div class="bond-top"><span>Bond</span><small>${next?`${d.xp-d.xpFrom} / ${d.xpTo-d.xpFrom} to ${next.name}`:'Fully grown'}</small></div>${bar(d.progress,'bond-bar')}</div>
  <div class="den-actions"><button class="quiet" data-g="pet">${art('paw')} Pet</button><button class="quiet ${feedOpen?'on':''}" data-g="feed-open" aria-expanded="${feedOpen}">${art('fish')} Feed <b>${treats.reduce((n,t)=>n+s.inventory[t.id],0)}</b></button></div>${feed}
 </section>
 <section class="panel"><div class="section-label">${art('spark')} Strengths <span>from your goals</span></div><div class="stats">${STATS.map(([k,label,from,does])=>`<div class="stat"><div class="stat-top"><strong>${label}</strong><b>${d.stats[k]}</b></div>${bar(d.stats[k]/maxStat,'stat-'+k)}<small>${from} goals · ${does}</small></div>`).join('')}</div></section>
 <section class="panel"><div class="section-label">${art('saddle')} Gear</div><div class="slots">${slots}</div>${open}</section>
 <section class="panel"><div class="section-label">${art('wing')} Growing up</div><ol class="growth">${STAGES.map((st,i)=>`<li class="${d.stage>=i?'reached':''} ${d.stage===i?'current':''}"><b>${st.name}</b><span>${UNLOCKS.filter(u=>u.stage===i).map(u=>u.label).join(' · ')}</span><small>${st.xp?`${st.xp} bond`:'Start'}</small></li>`).join('')}</ol><p class="help">Bond grows with every goal you craft, every day you show up, treats and a little attention.</p></section>`;
}

// ---- Craft ----
const RECIPE_TABS=[['treat','Treats'],['gear','Gear'],['tool','Tools'],['theme','Themes']];
function craftView(s){
 const mats=['embers',...Object.keys(MATERIALS)];
 const bounty=(b,old=false)=>`<article class="bounty ${b.done?'done':''} ${b.claimed?'claimed':''}"><div class="bounty-top">${art('scroll')}<strong>${esc(b.title)}</strong>${old?'<small>Last week</small>':''}</div>${bar(b.progress/b.target)}<div class="bounty-foot"><span class="bounty-n">${b.progress}/${b.target}</span><span class="rewards">${chips(b.reward)}</span>${b.claimed?'<em>Claimed</em>':b.done?`<button class="primary small" data-g="claim" data-week="${b.week}" data-i="${b.index}">Claim</button>`:''}</div></article>`;
 const kinds={treat:['treat','supply'],gear:['gear'],tool:['tool'],theme:['theme']}[recipeTab];
 const recipes=ITEMS.filter(x=>kinds.includes(x.kind)).map(x=>{const it=ITEM[x.id],cost=costFor(s,x.id),locked=it.unlock&&!s.unlocked.has(it.unlock),consumable=['treat','supply'].includes(x.kind),owned=!consumable&&s.inventory[x.id],afford=canAfford(s,cost),inUse=x.kind==='theme'&&s.theme===x.theme,stage=locked?STAGES[UNLOCKS.find(u=>u.key===it.unlock).stage].name:'';
  const action=locked?`<span class="locked-chip">${art('lock')} ${stage}</span>`:owned?(x.kind==='theme'?`<button class="quiet small ${inUse?'on':''}" data-g="theme" data-theme="${inUse?0:x.theme}">${inUse?'In use':'Use'}</button>`:x.slot?`<button class="quiet small" data-g="wear" data-slot="${x.slot}" data-code="${it.code}">${s.equip[x.slot]?.code===it.code?'Worn':'Wear'}</button>`:'<em class="owned">Owned</em>'):`<button class="primary small" data-g="craft" data-item="${x.id}" ${afford?'':'disabled'}>Craft</button>`;
  return `<article class="recipe ${locked?'is-locked':''} ${owned?'is-owned':''}">${tile(x,consumable&&s.inventory[x.id]?`<b>${s.inventory[x.id]}</b>`:'')}<div class="recipe-body"><strong>${esc(x.name)}</strong><small>${esc(x.desc)}</small>${owned||locked?'':`<span class="costs">${Object.entries(cost).map(([k,n])=>chip(k,n,(s.wallet[k]||0)<n)).join('')}</span>`}</div>${action}</article>`;}).join('');
 return `<section class="panel wallet-panel"><div class="section-label">${art('chest')} Your stores <span>earned by goals</span></div><div class="wallet">${mats.map(k=>`<span class="wallet-item ${s.wallet[k]?'':'empty'} ${MATERIALS[k]?.rare?'rare':''}" style="--c:${matColor(k)}">${matIcon(k)}<b>${s.wallet[k]}</b><small>${esc(matName(k))}</small></span>`).join('')}</div>
  <details class="how"><summary>Where materials come from</summary><p>Every goal you craft drops its category’s material: Movement gives iron, Health wildherb, Learning moonstone, Creative dye, Hobbies spark silk, Personal amber. Streaks of ten or more drop double. Heat becomes embers. Dragonscale comes from streak milestones, starmetal from perfect anvil runs and far islands, and ember cores from hard bounties.</p></details></section>
 <section class="panel"><div class="section-label">${art('scroll')} Bounty board <span>new ones every Monday</span></div><div class="bounties">${s.lastWeekBounties.map(b=>bounty(b,true)).join('')}${s.bounties.map(b=>bounty(b)).join('')}</div></section>
 <section class="panel"><div class="section-label">${art('hammer')} Workshop</div><div class="seg" role="tablist">${RECIPE_TABS.map(([k,l])=>`<button role="tab" aria-selected="${recipeTab===k}" class="${recipeTab===k?'on':''}" data-g="tab" data-tab="${k}">${l}</button>`).join('')}</div><div class="recipes">${recipes}</div></section>`;
}

// ---- Games ----
function gamesView(s){
 const a=s.anvilToday,c=s.catchToday,catchOpen=s.unlocked.has('catch');
 const status=(g,needs)=>g.played?`<span class="g-status done">${art('check')} Today’s reward earned · practice is free</span>`:g.eligible?`<span class="g-status ready">${art('gift')} Rewarded run ready</span>`:`<span class="g-status">${art('lock')} ${needs}</span>`;
 return `<section class="panel game-card anvil-card"><div class="game-art anvil-art" aria-hidden="true"><span class="ga-anvil">${art('anvil')}</span><span class="ga-spark s1"></span><span class="ga-spark s2"></span><span class="ga-spark s3"></span></div><div class="game-body"><h2>Anvil Strike</h2><p>Strike when the needle hits the gold. Six blows shape the blade. Perfect strikes chain into combos.</p>${status(a,'Craft half of today’s goals for a rewarded run')}<div class="game-actions"><button class="primary" data-g="play" data-game="anvil">${art('play')} ${a.eligible&&!a.played?'Play for embers':'Practice'}</button></div><small class="g-note">Three perfect strikes in a rewarded run shake loose a sliver of starmetal.</small></div></section>
 <section class="panel game-card catch-card ${catchOpen?'':'is-locked'}"><div class="game-art catch-art" aria-hidden="true"><span class="ga-ember e1"></span><span class="ga-ember e2"></span><span class="ga-ember e3"></span><span class="ga-shard"></span></div><div class="game-body"><h2>Ember Catch</h2><p>${esc(s.dragon.named?s.dragon.name:'Your dragon')} catches falling embers. Golden ones are worth five. Dodge frost shards and ash.</p>${catchOpen?status(c,'Craft a goal today for a rewarded run'):`<span class="g-status">${art('lock')} Unlocks when your dragon is a Fledgling</span>`}<div class="game-actions"><button class="primary" data-g="play" data-game="catch" ${catchOpen?'':'disabled'}>${art('play')} ${catchOpen&&c.eligible&&!c.played?'Play for embers':'Practice'}</button></div>${catchOpen&&s.catchBest?`<small class="g-note">Best ${s.catchBest}</small>`:''}</div></section>
 <p class="help center">One rewarded run a day for each game. Goals unlock them, so the game never gets in the way of the day.</p>`;
}

// ---- Vault ----
function vaultView(s){
 const owned=new Map(s.relics.map(r=>[r.id,r])),order=['common','rare','epic','legendary'];
 const sorted=[...RELICS].sort((a,b)=>order.indexOf(a.rarity)-order.indexOf(b.rarity)||a.code-b.code);
 const f=s.forge,ready=s.achievements.filter(a=>a.ready);
 const relics=`<section class="panel vault-head"><div class="vault-count"><strong>${s.relics.length}</strong><small>/ ${RELICS.length} relics</small></div><div class="vault-next"><span>Next relic</span>${bar(f.progress,'crucible-mini')}<small>${f.toNext} more heat</small></div><div class="rarity-legend">${order.map(k=>`<span style="--r:${RARITIES[k].color}"><i></i>${RARITIES[k].label} ${s.relics.filter(r=>r.rarity===k).length}</span>`).join('')}</div></section>
  <section class="panel"><div class="relic-grid">${sorted.map(r=>{const o=owned.get(r.id);return o?`<button class="relic-cell" data-g="relic" data-id="${r.id}" aria-label="${esc(r.name)}, ${RARITIES[r.rarity].label}">${coin(r)}<small>${esc(r.name)}</small></button>`:`<span class="relic-cell unknown" aria-label="Undiscovered ${RARITIES[r.rarity].label} relic"><span class="relic-coin unknown rar-${r.rarity}" style="--r:${RARITIES[r.rarity].color}">?</span><small>${RARITIES[r.rarity].label}</small></span>`;}).join('')}</div><p class="help">Relics are forged as heat fills the crucible. Long streaks raise the odds of rare ones. Some can be worn.</p></section>`;
 const achievements=`<section class="panel">${ready.length?`<button class="primary claim-all" data-g="ach">${art('gift')} Claim ${ready.length} achievement${ready.length>1?'s':''} · ${chip('embers',ready.reduce((n,a)=>n+a.reward,0))}</button>`:''}<div class="ach-list">${s.achievements.map(a=>`<div class="ach ${a.got?'got':''} ${a.ready?'ready':''}"><span class="ach-icon">${art(a.icon)}</span><span class="ach-body"><strong>${esc(a.name)}</strong><small>${esc(a.desc)}</small></span><span class="ach-end">${a.got?`<small>${new Date(a.date+'T12:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}</small>`:chip('embers',a.reward)}</span></div>`).join('')}</div><p class="help">${s.achievements.filter(a=>a.got).length} of ${ACHIEVEMENTS.length} earned.</p></section>`;
 return `<div class="seg vault-seg" role="tablist"><button role="tab" aria-selected="${vaultTab==='relics'}" class="${vaultTab==='relics'?'on':''}" data-g="vtab" data-tab="relics">Relics</button><button role="tab" aria-selected="${vaultTab==='ach'}" class="${vaultTab==='ach'?'on':''}" data-g="vtab" data-tab="ach">Achievements${ready.length?` <b class="seg-dot">${ready.length}</b>`:''}</button></div>${vaultTab==='relics'?relics:achievements}`;
}
function openRelic(id){
 const s=game(),r=s.relics.find(x=>x.id===id);if(!r)return;const rar=RARITIES[r.rarity],sl=r.slot?SLOTS.find(x=>x.key===r.slot):null,worn=r.slot&&s.equip[r.slot]?.code===r.code,canWear=sl&&s.dragon.named&&s.dragon.stage>=sl.stage;
 const dlg=modal(`<div class="relic-detail rar-${r.rarity}" style="--r:${rar.color}"><div class="relic-spin">${coin(r,'big')}</div><span class="rarity-label">${rar.label} · ${esc(r.set)}</span><h2>${esc(r.name)}</h2><p class="lore">${esc(r.lore)}</p>${sl?`<div class="relic-power"><strong>Wear it · ${sl.label}</strong><span>${esc(powers(r).join(' · ')||'A handsome piece of kit.')}</span></div>`:''}<small class="forged-on">Forged ${new Date(r.date+'T12:00').toLocaleDateString('en-US',{month:'long',day:'numeric'})}</small><div class="dialog-actions">${sl?(canWear?`<button class="primary" data-g="equip" data-slot="${r.slot}" data-code="${worn?0:r.code}">${worn?'Take it off':`Wear it`}</button>`:`<span class="help">${s.dragon.named?`The ${sl.label.toLowerCase()} slot opens at ${STAGES[sl.stage].name}.`:'Adopt your dragon to wear relics.'}</span>`):''}<button class="quiet" data-close>Close</button></div></div>`,'relic-modal');
 sfx('open');return dlg;
}

// ---- Isles ----
function blob(cx,cy,r,seed){const n=11,pts=[];for(let i=0;i<n;i++){const a=i/n*Math.PI*2,k=.74+hash(`${seed}${i}`)*.48;pts.push([cx+Math.cos(a)*r*k*1.3,cy+Math.sin(a)*r*k*.82]);}let d=`M${((pts[n-1][0]+pts[0][0])/2).toFixed(1)} ${((pts[n-1][1]+pts[0][1])/2).toFixed(1)}`;for(let i=0;i<n;i++){const p=pts[i],q=pts[(i+1)%n];d+=`Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${((p[0]+q[0])/2).toFixed(1)} ${((p[1]+q[1])/2).toFixed(1)}`;}return d+'Z';}
const DECOR={
 hearthrock:(x,y)=>`<path d="M${x-6} ${y}h12l-2-8h-8Z" fill="#5a4636"/><circle cx="${x}" cy="${y-11}" r="5" fill="#ffb45e" class="isle-glow"/>`,
 emberreach:(x,y)=>`<path d="M${x-8} ${y+2}l8-12 8 12Z" fill="#3a2a2a"/><circle cx="${x}" cy="${y-12}" r="3" fill="#ff7a4d" class="isle-glow"/>`,
 tidewhisper:(x,y)=>`<path d="M${x-12} ${y+3}q6-5 12 0t12 0" stroke="#bff3ff" fill="none" stroke-width="1.5"/>`,
 squall:(x,y)=>`<ellipse cx="${x}" cy="${y-16}" rx="16" ry="7" fill="#3b4656"/><path d="M${x+2} ${y-12}l-4 8h4l-3 7" stroke="#ffe27a" fill="none" stroke-width="1.6" class="isle-bolt"/>`,
 mistfen:(x,y)=>`<ellipse cx="${x}" cy="${y-2}" rx="22" ry="8" fill="#dfe8e4" opacity=".35" class="isle-mist"/>`,
 skyreef:(x,y)=>`<path d="M${x-10} ${y+2}q4-14 8 0M${x+2} ${y+2}q5-16 10 0" stroke="#ff9fb8" fill="none" stroke-width="2.4"/>`,
 frostspire:(x,y)=>`<path d="M${x-9} ${y+3}l4-16 4 16M${x-1} ${y+3}l5-22 5 22" fill="#eaf8ff" stroke="#9fd0ff" stroke-width="1"/>`,
 cinderpeak:(x,y)=>`<path d="M${x-14} ${y+4}l10-18h8l10 18Z" fill="#3a2a2a"/><path d="M${x-3} ${y-14}q3-8 6 0" fill="#ff6a3d" class="isle-glow"/>`,
 stormcrown:(x,y)=>`<ellipse cx="${x}" cy="${y-16}" rx="20" ry="8" fill="#2c3442"/><path d="M${x-4} ${y-12}l-4 9h4l-3 8M${x+8} ${y-12}l-3 7h3l-2 6" stroke="#bfe0ff" fill="none" stroke-width="1.5" class="isle-bolt"/>`,
 wyrmhollow:(x,y)=>`<path d="M${x-8} ${y+3}a8 7 0 0 1 16 0Z" fill="#1c1a22"/><circle cx="${x-2}" cy="${y-1}" r="1.2" fill="#ffd23f" class="isle-glow"/><circle cx="${x+3}" cy="${y-1}" r="1.2" fill="#ffd23f" class="isle-glow"/>`,
 dawnspire:(x,y)=>`<path d="M${x} ${y-22}l4 24h-8Z" fill="#fff4d6"/><circle cx="${x}" cy="${y-24}" r="6" fill="#ffcf4a" class="isle-glow"/>`
};
const routePath=(a,b)=>{const mx=(a.x+b.x)/2+(b.y-a.y)*.18,my=(a.y+b.y)/2-(b.x-a.x)*.18;return {d:`M${a.x} ${a.y}Q${mx} ${my} ${b.x} ${b.y}`,mx,my};};
function islesView(s){
 const plan=flightPlan(s),here=ISLES[s.isle];
 const routes=ISLES.slice(1).map((b,i)=>{const a=ISLES[i],{d}=routePath(a,b);return `<path d="${d}" class="route ${i+1<=s.isle?'flown':i+1===s.isle+1?'next':''}"/>`;}).join('');
 const isles=ISLES.map((x,i)=>{const known=i<=s.isle+2,r=i===0?24:i===ISLES.length-1?20:15+hash(x.id)*6;const painted=HAS.isles.has(x.id),R=r*2;return `<g class="isle ${i<=s.isle?'visited':''} ${i===s.isle+1?'next':''} ${known?'':'fogged'} ${painted?'painted':''}" data-g="isle" data-i="${i}">${painted?`${i===s.isle+1?`<ellipse cx="${x.x}" cy="${x.y+2}" rx="${R*.95}" ry="${R*.7}" class="isle-ring"/>`:''}<image href="./assets/isles/${x.id}.webp" x="${x.x-R}" y="${x.y-R}" width="${R*2}" height="${R*2}"/>`:`<path d="${blob(x.x,x.y+3,r+5,x.id+'s')}" class="shoal"/><path d="${blob(x.x,x.y,r,x.id)}" class="land"/>${known&&DECOR[x.id]?DECOR[x.id](x.x,x.y):''}`}<text x="${x.x}" y="${x.y+r*.82+14}" class="isle-name">${known?esc(x.name):'???'}</text>${i===s.isle+1&&x.needs?`<g class="needs ${plan?.missing?'missing':''}" transform="translate(${x.x+r+4} ${x.y-r})"><circle r="9"/><text y="4">${{storm:'⚡',frost:'❄',light:'✦'}[x.needs]}</text></g>`:''}</g>`;}).join('');
 const marker=`<g class="flyer" transform="translate(${here.x} ${here.y-6})"><circle r="13" class="flyer-ring"/><g transform="translate(-9 -9) scale(.75)" class="flyer-icon"><path d="${'M4 15c0-6 4-10 9-10 2 0 4 1 5 2l3-2-1 4c1 1 1 3 1 4l-4 1-2 3H9l-2 3-1-3-2-2Zm11-5h.01M9 9l-2-4 4 2'}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g></g>`;
 const map=`<svg class="isle-map" viewBox="0 0 360 520" role="img" aria-label="Map of the islands. You are at ${esc(here.name)}."><defs><radialGradient id="sea" cx=".5" cy=".45" r=".75"><stop offset="0" stop-color="#1d4a5a"/><stop offset="1" stop-color="#0c1f2a"/></radialGradient><pattern id="waves" width="40" height="22" patternUnits="userSpaceOnUse"><path d="M2 12q8-6 16 0t16 0" fill="none" stroke="#7fd8ff" stroke-opacity=".09" stroke-width="1.4"/></pattern></defs>${scene('sea')?`<image href="${scene('sea')}" width="360" height="520" preserveAspectRatio="xMidYMid slice"/>`:`<rect width="360" height="520" fill="url(#sea)"/><g class="compass" transform="translate(322 488)"><circle r="16"/><path d="M0-14l4 14-4 14-4-14Z"/><text y="-19">N</text></g>`}<rect width="360" height="520" fill="url(#waves)" class="sea-waves"/>${routes}${isles}${marker}</svg>`;
 const req=plan?.missing?{storm:'Equip storm gear: a Storm cloak or a storm relic.',frost:'Equip frost gear: a Frost charm or a frost relic.',light:'Equip a light: a Glowmoss lantern or a light relic.'}[plan.missing]:'';
 const flight=!plan?`<section class="panel flight done"><h2>The edge of the map</h2><p>You and ${esc(s.dragon.name)} have flown every route. Riders will tell this story for years.</p></section>`:
  `<section class="panel flight"><div class="flight-top"><span class="eyebrow">Next flight</span><span class="energy-chip">${art('bolt')}<b>${s.energy.available}</b> energy</span></div><h2>${esc(plan.to.name)}</h2><p>${esc(plan.to.desc)}</p>
  <div class="flight-needs"><span class="${s.energy.available>=plan.cost?'ok':'short'}">${art('bolt')} ${plan.cost} energy</span>${plan.rations?`<span class="${(s.inventory.rations||0)>=1?'ok':'short'}">${art('rations')} Flight rations</span>`:''}${plan.to.needs?`<span class="${plan.missing?'short':'ok'}">${art({storm:'cloak',frost:'snow',light:'lantern'}[plan.to.needs])} ${esc(TAGS[plan.to.needs])}</span>`:''}</div>
  <div class="flight-reward"><small>Reward</small>${chips(plan.to.reward)}</div>
  ${!s.unlocked.has('isles')?`<p class="help">${art('lock')} Flights unlock when your dragon is a Fledgling.</p>`:req?`<p class="help">${esc(req)}</p>`:''}
  <button class="primary fly" data-g="fly" ${plan.ok?'':'disabled'}>${art('wing')} Fly to ${esc(plan.to.name)}</button>
  <details class="how"><summary>How flight energy works</summary><p>Each day you craft every daily goal earns 2 energy, and half of them earns 1. Saddles, goggles and swift relics shave energy off each flight. Long flights need rations from the workshop.</p></details></section>`;
 return `<section class="panel map-panel">${map}<div class="map-here"><span>${art('map')} ${esc(here.name)}</span><small>${s.isle} of ${ISLES.length-1} islands reached</small></div></section>${flight}`;
}
async function flyAnimation(s){
 const plan=flightPlan(s),a=ISLES[s.isle],b=plan.to,flyer=document.querySelector('.flyer');sfx('whoosh');
 if(!flyer||reduced())return;const {mx,my}=routePath(a,b);
 await new Promise(res=>{const t0=performance.now(),dur=1700;const step=now=>{const t=Math.min(1,(now-t0)/dur),e=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2,x=(1-e)**2*a.x+2*(1-e)*e*mx+e*e*b.x,y=(1-e)**2*a.y+2*(1-e)*e*my+e*e*b.y-6-Math.sin(e*Math.PI)*18;flyer.setAttribute('transform',`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${1+Math.sin(e*Math.PI)*.35})`);if(t<1)requestAnimationFrame(step);else res();};requestAnimationFrame(step);});
}

// ---- modal and celebration ----
function modal(html,cls=''){
 const dlg=document.createElement('dialog');dlg.className=`modal game-modal ${cls}`;dlg.innerHTML=html;document.body.append(dlg);
 dlg.addEventListener('close',()=>dlg.remove());dlg.addEventListener('click',e=>{if(e.target===dlg||e.target.closest('[data-close]'))dlg.close();});
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
 celebrate({title:'Your goals have a world now',sub:'Welcome to the Bestia Alata Islands, where riders and dragons share the sky (not always politely).',art:HAS.dragons.has('ember-baby')?'<img class="portrait intro-portrait" src="./assets/dragons/ember-baby.webp" alt="">':dragonSVG({...s.dragon,mood:'delighted',name:'A baby dragon'},{}),lines:['Every goal you craft earns embers and materials','A baby dragon is waiting by the forge','Craft gear, forge relics, fly to new islands','Two minigames unlock as you finish your day'],sound:'open',button:'Meet your dragon',onClose:()=>C.go?.('dragon')});
}
// Growth, shown once per stage on this device.
export function checkMilestones(){
 const s=game(),d=s.dragon;if(!d.named)return;
 const seen=Number(read('blastforge-stage-seen-v1','-1'));
 if(seen<0){write('blastforge-stage-seen-v1',d.stage);return;}
 if(d.stage>seen){write('blastforge-stage-seen-v1',d.stage);celebrate({title:`${d.name} is a ${d.stageName} now`,sub:'All those goals added up.',art:portrait(d,s.equip),lines:UNLOCKS.filter(u=>u.stage>seen&&u.stage<=d.stage).map(u=>`Unlocked: ${u.label}`)});}
}

// ---- rendering and actions ----
export function renderSection(section,main){
 const s=game();
 main.innerHTML=section==='dragon'?dragonView(s):section==='craft'?craftView(s):section==='games'?gamesView(s):section==='vault'?vaultView(s):islesView(s);
}
async function save(changes){await C.Store.setMany(changes);}
const ITEM_OF=code=>game().byCode[code];
export async function act(b){
 const s=game(),g=b.dataset.g;
 try{
  if(g==='color'){adoptColor=Number(b.dataset.i);sfx('tap');const name=document.getElementById('dragon-name')?.value;C.render();const input=document.getElementById('dragon-name');if(input&&name)input.value=name;}
  else if(g==='adopt'){const name=document.getElementById('dragon-name')?.value||'';const changes=adoptChanges(s,name,adoptColor);await save(changes);write('blastforge-stage-seen-v1',0);const n=game().dragon;celebrate({title:`Welcome, ${n.name}`,sub:'Keep your goals and they’ll grow. They’ll never leave.',art:portrait(n,{}),sound:'roar',button:'Hello'});sfx('chirp',0);}
  else if(g==='pet'){const svg=document.querySelector('.den-stage .dragon');dragonReact(svg,'wiggle');dragonFx(svg,'heart');sfx(Math.random()<.5?'purr':'chirp',s.dragon.stage);if(s.dragon.petsToday<3)await save(petChanges(s));}
  else if(g==='feed-open'){feedOpen=!feedOpen;sfx('tap');C.render();}
  else if(g==='feed'){await save(feedChanges(s,b.dataset.item));sfx('munch');C.toast(`${s.dragon.name} loved it. +${ITEM[b.dataset.item].bond} bond.`);requestAnimationFrame(()=>{const svg=document.querySelector('.den-stage .dragon');dragonReact(svg,'hop');dragonFx(svg,'crumb');});}
  else if(g==='slot'){if(b.getAttribute('aria-disabled')==='true'){sfx('error');const sl=SLOTS.find(x=>x.key===b.dataset.slot);C.toast(`The ${sl.label.toLowerCase()} slot opens at ${STAGES[sl.stage].name}.`);return;}slotOpen=slotOpen===b.dataset.slot?null:b.dataset.slot;sfx('tap');C.render();}
  else if(g==='equip'||g==='wear'){const code=Number(b.dataset.code);if(!s.dragon.named)throw new Error('Adopt your dragon first. Open the Dragon tab.');await save(equipChanges(s,b.dataset.slot,code));sfx(code?'craftItem':'tap');C.toast(code?`${s.dragon.name} is wearing the ${ITEM_OF(code)?.name}.`:'Taken off.');}
  else if(g==='tab'){recipeTab=b.dataset.tab;sfx('tap');C.render();}
  else if(g==='vtab'){vaultTab=b.dataset.tab;sfx('tap');C.render();}
  else if(g==='craft'){const it=ITEM[b.dataset.item];await save(craftChanges(s,it.id));sfx('craftItem');const t=b.closest('.recipe')?.querySelector('.item-tile');if(t){t.classList.remove('forged');void t.offsetWidth;t.classList.add('forged');}C.toast(it.kind==='gear'?`${it.name} crafted. Wear it from the Dragon tab.`:it.kind==='theme'?`${it.name} crafted. Use it from here or Settings.`:`${it.name} crafted.`);}
  else if(g==='theme'){await save(themeChanges(s,Number(b.dataset.theme)));sfx('coin');C.toast(`${THEMES[Number(b.dataset.theme)]} theme on.`);}
  else if(g==='claim'){const list=[...s.bounties,...s.lastWeekBounties],bounty=list.find(x=>x.week===b.dataset.week&&x.index===Number(b.dataset.i));if(!bounty)throw new Error('That bounty has expired.');await save(claimBountyChanges(s,bounty));sfx('claim');C.toast('Bounty claimed.');}
  else if(g==='ach'){const ready=s.achievements.filter(a=>a.ready);if(!ready.length)return;await save(achievementChanges(s));celebrate({title:ready.length>1?`${ready.length} achievements`:ready[0].name,sub:ready.length>1?'':ready[0].desc,art:`<span class="big-icon">${art(ready[0].icon)}</span>`,lines:ready.length>1?ready.map(a=>a.name):[],sound:'claim',button:`Collect ${ready.reduce((n,a)=>n+a.reward,0)} embers`});}
  else if(g==='relic')openRelic(b.dataset.id);
  else if(g==='isle'){const i=Number(b.dataset.i),x=ISLES[i];if(i<=s.isle+2){sfx('tap');C.toast(i<=s.isle?`${x.name}: ${x.desc}`:`${x.name}: ${x.desc}`);}}
  else if(g==='fly'){if(flying)return;flyChanges(s);const to=flightPlan(s).to;flying=true;b.disabled=true;try{await flyAnimation(s);await save(flyChanges(game()));}finally{flying=false;}sfx('coin');celebrate({title:`Landed on ${to.name}`,sub:to.desc,art:`<span class="big-icon">${art('map')}</span>`,lines:Object.entries(to.reward).map(([k,n])=>`+${n} ${matName(k)}`),sound:'claim',button:'Explore'});}
  else if(g==='play')startGame(b.dataset.game);
 }catch(err){sfx('error');C.toast(err.message);}
}
export function handleKey(e){if((e.key==='Enter'||e.key===' ')&&e.target.matches('.den-stage')){e.preventDefault();act(e.target);}}

function startGame(which){
 const s=game(),rewarded=which==='anvil'?s.anvilToday.eligible&&!s.anvilToday.played:s.catchToday.eligible&&!s.catchToday.played&&s.unlocked.has('catch');
 const dlg=document.createElement('dialog');dlg.className='play-dialog';document.body.append(dlg);dlg.addEventListener('close',()=>{dlg._stop?.();dlg.remove();C.render();});dlg.showModal();
 const finish=async make=>{if(!rewarded)return;try{await save(make());}catch(err){C.toast(err.message);}};
 if(which==='anvil')playAnvil(dlg,{bg:scene('smithy'),sprites:{anvil:HAS.sprites?.has('anvil')?'./assets/sprites/anvil.webp':null,hammer:HAS.sprites?.has('hammer')?'./assets/sprites/hammer.webp':null},zone:anvilZone(s),rewarded,bonus:s.inventory.bellows?1.2:1,onReward:r=>finish(()=>anvilRewardChanges(game(),r))});
 else playCatch(dlg,{bg:scene('sky'),lives:Math.min(5,3+Math.floor(s.dragon.stats.vitality/60)),rewarded,bonus:s.inventory.bellows?1.2:1,dragonSrc:HAS.dragons.has(portraitId(s.dragon))?`./assets/dragons/${portraitId(s.dragon)}.webp`:null,dragon:dragonSVG({...s.dragon,mood:'delighted',stage:Math.min(s.dragon.stage,2)},s.equip,{label:' '}),onReward:score=>finish(()=>catchRewardChanges(game(),score))});
}

// Remaining goals today on the home-screen icon (if the device supports it and it is switched on).
export const badgeOn=()=>read('blastforge-badge-v1','1')!=='0';
export function setBadge(on){write('blastforge-badge-v1',on?'1':'0');if(on&&'Notification'in window&&Notification.permission==='default')Notification.requestPermission().catch(()=>{});updateBadge();}
// The home-screen app needs notification permission before its icon can show a number (iPhone).
// Asked once, right after a check-off, and only in the installed app with the badge switched on.
export function askBadgeOnce(){
 try{if(!badgeOn()||!('Notification'in window)||Notification.permission!=='default'||read('blastforge-badge-asked-v1','0')==='1')return;
  if(!matchMedia('(display-mode: standalone)').matches&&!navigator.standalone)return;write('blastforge-badge-asked-v1','1');Notification.requestPermission().then(()=>updateBadge()).catch(()=>{});}catch{}
}
export function updateBadge(){
 if(!('setAppBadge'in navigator))return;const s=game(),t=s.forge.dayTotals[s.today],left=t?Math.max(0,t.planned-t.done):0;
 try{(badgeOn()&&left?navigator.setAppBadge(left):navigator.clearAppBadge()).catch(()=>{});}catch{}
}
// What a check-off earned, for the toast.
export function earnedSince(before){const after=game().wallet,parts=[];for(const k of ['embers',...Object.keys(MATERIALS)]){const n=(after[k]||0)-(before[k]||0);if(n>0)parts.push(`+${n} ${k==='embers'?'embers':matName(k).toLowerCase()}`);}return parts.slice(0,3).join(' · ');}
