// The game layer. Goals are the currency: everything here is worked out from goal records,
// plus a few choices the player makes (crafting, feeding, flying, equipping, game scores).
// Choices are stored as whole numbers under metric:game:* so the existing sync server accepts them.
// Nothing here touches the DOM, so it can be tested directly.
import {dayKey,addDays,weekKey,weekDays,dateOf,value,forgeStats,goalForDate,goalsOf,STREAK_MILESTONES,TIERS} from './core.js?v=15';

// ---- helpers ----
export function hash(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}h^=h>>>13;h=Math.imul(h,1274126177);h^=h>>>16;return (h>>>0)/4294967296;}
const DAY0='2026-01-01';
export const dayNumber=d=>Math.round((dateOf(d)-dateOf(DAY0))/864e5);
export const fromDayNumber=n=>addDays(DAY0,n);
export const gameKey=k=>`metric:game:${k}`;
const num=(records,k,f=0)=>{const v=value(records,gameKey(k),null);return Number.isInteger(v)?v:f;};
const has=(records,k)=>Number.isInteger(value(records,gameKey(k),null));
// Running totals (spent, made, used) are kept per device and added up, so two devices crafting
// offline never overwrite each other's spending when they sync.
const COUNTERS=new Set(['spent','made','used']);
let DEVICE='d0';
export function setDevice(id){if(/^[a-z0-9]{2,12}$/.test(id||''))DEVICE=id;}
const own=(state,k)=>num(state.records,`${k}:${DEVICE}`);
const bump=(state,k,n)=>({[gameKey(`${k}:${DEVICE}`)]:own(state,k)+n});

// ---- materials ----
export const MATERIALS={
 iron:{name:'Iron ore',category:'Movement',color:'#c4c9d4',icon:'ore'},
 herb:{name:'Wildherb',category:'Health',color:'#7fe3a8',icon:'herb'},
 moonstone:{name:'Moonstone',category:'Learning',color:'#9fd0ff',icon:'gem'},
 dye:{name:'Inkbloom dye',category:'Creative',color:'#ff7fa8',icon:'drop'},
 silk:{name:'Spark silk',category:'Hobbies',color:'#c39bff',icon:'thread'},
 amber:{name:'Amber',category:'Personal',color:'#ffc35a',icon:'amber'},
 scale:{name:'Dragonscale',rare:true,color:'#08d8a0',icon:'scale'},
 starmetal:{name:'Starmetal',rare:true,color:'#e8f0ff',icon:'star'},
 core:{name:'Ember core',rare:true,color:'#ff6a3d',icon:'core'}
};
export const CATEGORY_MATERIAL={Movement:'iron',Health:'herb',Learning:'moonstone',Creative:'dye',Hobbies:'silk',Personal:'amber'};
export const materialFor=category=>CATEGORY_MATERIAL[category]||'amber';

// ---- the dragon ----
export const DRAGON_COLORS=[
 {id:'ember',name:'Ember',body:'#e0583e',dark:'#a4302a',belly:'#ffcf86',wing:'#c2402f',membrane:'#ff9a6b',horn:'#fff1d6',eye:'#ffd23f',glow:'#ff8a3d'},
 {id:'tide',name:'Tide',body:'#2fa6c7',dark:'#1b6487',belly:'#bff3ff',wing:'#237fa8',membrane:'#7fe0f0',horn:'#eafcff',eye:'#08d8a0',glow:'#4fe0ff'},
 {id:'moss',name:'Moss',body:'#5aa84f',dark:'#2f6b33',belly:'#e3f5a8',wing:'#3f8a3c',membrane:'#a7e07f',horn:'#fffbe0',eye:'#ffcf3a',glow:'#9be35a'},
 {id:'dusk',name:'Dusk',body:'#7a55c9',dark:'#45307f',belly:'#f3c9ff',wing:'#5e3fa6',membrane:'#c79bff',horn:'#fdf2ff',eye:'#ff6b93',glow:'#b18cff'}
];
export const STAGES=[{name:'Baby',xp:0},{name:'Fledgling',xp:150},{name:'Juvenile',xp:500},{name:'Adult',xp:1200},{name:'Elder',xp:3000}];
export const UNLOCKS=[
 {key:'anvil',stage:0,label:'Anvil Strike'},{key:'vault',stage:0,label:'The Vault'},{key:'bounties',stage:0,label:'Bounty board'},
 {key:'isles',stage:1,label:'Flights across the isles'},{key:'catch',stage:1,label:'Ember Catch'},{key:'saddle',stage:1,label:'Saddles and charms'},
 {key:'armor',stage:2,label:'Armor and helms'},{key:'themes',stage:2,label:'Workshop themes'},
 {key:'legendary',stage:3,label:'Legendary recipes'},{key:'aura',stage:4,label:'Elder aura'}
];
export const SLOTS=[{key:'head',label:'Head',stage:2},{key:'neck',label:'Neck',stage:0},{key:'saddle',label:'Saddle',stage:1},{key:'armor',label:'Armor',stage:2},{key:'charm',label:'Charm',stage:1}];
const QUIRKS=['is hoarding shiny bolts under the rug.','sneezed a spark onto your boots.','is chasing their own tail again.','is pretending not to watch you work.','tried to eat a lump of coal. Twice.','is warming their belly by the forge.','is guarding a single, very important pebble.','keeps nudging the hammer off the anvil.','is practicing a very small roar.','fell asleep mid-yawn.','is watching snow fall past the window.','rearranged the tongs. Again.','is drooling a little on the workbench.','is sharpening their claws on a fence post.','is humming. Dragons hum.','is sniffing the wind for storms.','buried a fish in the coal bin for later.','is showing off their wings to no one.','is counting embers in the hearth.','licked the anvil. Regrets it.','is curled up on the rider’s saddle.','is trying to catch dust in the sunlight.','is staring at the map like they know the way.','left tiny scorch marks on the rug. Proudly.'];

// ---- crafting ----
// kind: treat (consumed), supply (consumed), gear (worn), tool, theme. One-time items can be owned once.
export const ITEMS=[
 {id:'fish',name:'Smoked fish',kind:'treat',icon:'fish',cost:{herb:2,embers:10},bond:20,desc:'A favorite. Feeding a treat makes your dragon Well-fed today: +10% embers from today’s heat.'},
 {id:'cookie',name:'Ember cookie',kind:'treat',icon:'cookie',cost:{amber:1,herb:1,embers:15},bond:30,desc:'Crunchy and faintly smoking. Worth more bond than fish.'},
 {id:'tart',name:'Starfruit tart',kind:'treat',icon:'tart',cost:{moonstone:1,herb:2,starmetal:1,embers:30},bond:60,unlock:'saddle',desc:'A rare treat. Huge bond boost.'},
 {id:'rations',name:'Flight rations',kind:'supply',icon:'rations',cost:{herb:3,embers:15},unlock:'isles',desc:'Packed for long flights. Any flight costing 6 or more energy uses one.'},
 {id:'collar',name:'Riveted collar',kind:'gear',slot:'neck',icon:'collar',cost:{iron:4,embers:20},perk:'thrift',desc:'Sturdy and smart. Crafting costs 10% fewer embers.'},
 {id:'goggles',name:'Flight goggles',kind:'gear',slot:'head',icon:'goggles',cost:{iron:3,moonstone:2,embers:40},unlock:'armor',perk:'swift',desc:'Clear eyes in high winds. Flights cost 1 less energy.'},
 {id:'saddle',name:'Rider’s saddle',kind:'gear',slot:'saddle',icon:'saddle',cost:{iron:6,herb:2,embers:60},unlock:'saddle',perk:'swift',desc:'Ride together. Flights cost 1 less energy.'},
 {id:'cloak',name:'Storm cloak',kind:'gear',slot:'armor',icon:'cloak',cost:{iron:4,silk:1,dye:2,embers:80},unlock:'armor',tag:'storm',desc:'Waxed against lightning. Needed to cross storm islands.'},
 {id:'lantern',name:'Glowmoss lantern',kind:'gear',slot:'charm',icon:'lantern',cost:{herb:4,amber:1,embers:50},unlock:'saddle',tag:'light',desc:'Lights the way through mist and caves.'},
 {id:'frostcharm',name:'Frost charm',kind:'gear',slot:'charm',icon:'snow',cost:{moonstone:3,scale:1,embers:90},unlock:'saddle',tag:'frost',desc:'Keeps wings from icing over. Needed for frozen islands.'},
 {id:'barding',name:'Iron barding',kind:'gear',slot:'armor',icon:'barding',cost:{iron:12,scale:1,embers:120},unlock:'armor',perk:'frugal',desc:'Heavy plates. Recipes need 1 less of their main material.'},
 {id:'hammer',name:'Tempered hammer',kind:'tool',icon:'hammer',cost:{iron:8,starmetal:1,embers:100},desc:'Widens the perfect zone in Anvil Strike.'},
 {id:'bellows',name:'Dragonhide bellows',kind:'tool',icon:'bellows',cost:{iron:5,herb:5,scale:1,embers:150},desc:'Anvil Strike and Ember Catch pay 20% more embers.'},
 {id:'theme_frost',name:'Frostforge theme',kind:'theme',theme:1,icon:'theme',cost:{moonstone:4,scale:2,embers:200},unlock:'themes',desc:'Ice-blue accents and a colder forge.'},
 {id:'theme_verdant',name:'Verdant theme',kind:'theme',theme:2,icon:'theme',cost:{herb:10,scale:2,embers:200},unlock:'themes',desc:'Moss-green accents and a living forge.'},
 {id:'theme_night',name:'Nightforge theme',kind:'theme',theme:3,icon:'theme',cost:{dye:6,starmetal:2,core:1,embers:300},unlock:'legendary',desc:'Violet accents and starlight embers.'}
];
export const ITEM=Object.fromEntries(ITEMS.map((x,i)=>[x.id,{...x,code:1000+i}]));
export const THEMES=['Emberforge','Frostforge','Verdant','Nightforge'];

// ---- relics ----
export const RARITIES={common:{label:'Common',weight:56,color:'#d7c4a2'},rare:{label:'Rare',weight:28,color:'#4fc3ff'},epic:{label:'Epic',weight:12,color:'#c08bff'},legendary:{label:'Legendary',weight:4,color:'#ffcf4a'}};
export const RELICS=[
 ['iron-ingot','Iron Ingot','common','Forgeborn','ingot',null,null,'The first bar off your anvil. Still warm, somehow.'],
 ['riders-buckle','Rider’s Buckle','common','Rider’s Kit','buckle',null,null,'Holds a saddle strap through any dive.'],
 ['ember-dagger','Ember Dagger','common','Forgeborn','dagger',null,null,'Small, sharp, and faintly glowing at the edge.'],
 ['forge-tongs','Forge Tongs','common','Forgeborn','tongs',null,null,'They have held a thousand hot things and dropped none.'],
 ['copper-bell','Copper Bell','common','Rider’s Kit','bell','neck','thrift','Rings softly in flight so your dragon knows you’re near.'],
 ['scale-comb','Scale Comb','common','Rider’s Kit','comb',null,null,'Dragons pretend they hate grooming. They do not.'],
 ['saddle-strap','Saddle Strap','common','Rider’s Kit','strap',null,null,'Worn smooth by a hundred takeoffs.'],
 ['ash-lantern','Ash Lantern','common','Skyward','lantern','charm',null,'Burns on embers, not oil.','light'],
 ['riveted-bracer','Riveted Bracer','common','Forgeborn','bracer',null,null,'For riders who land badly. Often.'],
 ['shield-boss','Oak Shield Boss','common','Forgeborn','shield',null,null,'The iron heart of a sturdy shield.'],
 ['bone-whistle','Bone Whistle','common','Skyward','whistle','charm','swift','One note. Every dragon on the island turns its head.'],
 ['tinder-pouch','Tinder Pouch','common','Rider’s Kit','pouch',null,null,'Dry kindling for wet nights on strange islands.'],
 ['smiths-apron','Smith’s Apron','common','Forgeborn','apron',null,null,'Scorched in all the right places.'],
 ['coal-scuttle','Coal Scuttle','common','Forgeborn','bucket',null,null,'Someone keeps eating the coal. You know who.'],
 ['flint-striker','Flint Striker','common','Forgeborn','flint',null,null,'One strike, one spark, every time.'],
 ['riders-rope','Rider’s Rope','common','Rider’s Kit','rope',null,null,'Knotted for climbing, towing, and rescues.'],
 ['forge-gauntlet','Forge Gauntlet','rare','Forgeborn','gauntlet',null,'hot','Hold the metal where the hammer falls.'],
 ['dragonscale-shield','Dragonscale Shield','rare','Emberheart','shield',null,null,'Shed scales, freely given, hammered into a wall.'],
 ['tideglass-lens','Tideglass Lens','rare','Tideglass','lens',null,null,'Look through it and the sea goes still.'],
 ['wyrm-compass','Wyrm Compass','rare','Skyward','compass','charm','swift','Points toward the nearest dragon, not north.'],
 ['skyrider-goggles','Skyrider Goggles','rare','Skyward','goggles','head','swift','Rimmed in brass, fogged with old adventures.'],
 ['emberwoven-cloak','Emberwoven Cloak','rare','Emberheart','cloak','armor',null,'Thread spun from cooled fire. Shrugs off storms.','storm'],
 ['frostbite-spear','Frostbite Spear','rare','Tideglass','spear',null,null,'Leaves a rime of frost on anything it touches.'],
 ['stormcaller-horn','Stormcaller Horn','rare','Stormcaller','horn',null,null,'Blow it and the clouds answer.'],
 ['moonsteel-bit','Moonsteel Bit','rare','Rider’s Kit','bit',null,null,'Light as breath, strong as a promise.'],
 ['runed-saddlebag','Runed Saddlebag','rare','Skyward','saddlebag','saddle','frugal','Holds more on the inside than the outside.'],
 ['glowmoss-lantern','Glowmoss Lantern','rare','Tideglass','lantern','charm',null,'The moss inside wakes up in the dark.','light'],
 ['talon-clasp','Talon Clasp','rare','Emberheart','clasp','neck','thrift','A shed talon set in silver. Very lucky.'],
 ['flamewrought-helm','Flamewrought Helm','epic','Emberheart','helm','head','thrift','Forged in dragonfire, cooled in snowmelt.'],
 ['wyrmsteel-blade','Wyrmsteel Blade','epic','Forgeborn','sword',null,'hot','Folded a hundred times. Hums near open flame.'],
 ['skywarden-saddle','Skywarden Saddle','epic','Skyward','saddle','saddle','swift','Built for long flights and longer friendships.'],
 ['aurora-mantle','Aurora Scale Mantle','epic','Tideglass','mantle','armor',null,'Shimmers like the northern sky. Warm in any frost.','frost'],
 ['thunderwing-harness','Thunderwing Harness','epic','Stormcaller','harness','armor','swift','Lightning slides right off it.','storm'],
 ['abyssal-pearl','Abyssal Pearl','epic','Tideglass','pearl','charm','frugal','Pulled from a sea cave no one else came back from.','light'],
 ['starforged-anvil','Starforged Anvil','epic','Forgeborn','anvil',null,'hot','Fell from the sky. Rings like a bell.'],
 ['phoenix-feather','Phoenix Feather','epic','Emberheart','feather','charm','thrift','Never stops glowing. Never burns.'],
 ['crown-first-rider','Crown of the First Rider','legendary','Mythic','crown','head','swift','Worn by the first human a dragon ever chose.','storm frost light'],
 ['eye-storm-wyrm','Eye of the Storm Wyrm','legendary','Mythic','eye','charm','frugal','It blinks. Sometimes.','storm frost light'],
 ['embercore-heart','Embercore Heart','legendary','Mythic','heart',null,'hot','Still beating, deep in the forge’s coals.'],
 ['wings-of-dawn','Wings of Dawn','legendary','Mythic','wings','armor','swift','When worn, sunrise follows you.','storm frost light']
].map(([id,name,rarity,set,icon,slot,perk,lore,tags],i)=>({id,name,rarity,set,icon,slot,perk,lore,tags:tags?tags.split(' '):[],code:i+1}));
export const RELIC=Object.fromEntries(RELICS.map(r=>[r.id,r]));
export const PERKS={thrift:'Crafting costs 10% fewer embers.',swift:'Flights cost 1 less energy.',frugal:'Recipes need 1 less of their main material.',hot:'Owning it widens the anvil’s perfect zone.'};

// Each forged relic's identity is fixed by its number and the day it was forged, so every device agrees.
export function rollRelics(forged){
 const owned=[],taken=new Set();
 for(const f of forged){
  const luck=f.run>=30?2:f.run>=14?1:0,w={common:56-luck*10,rare:28,epic:12+luck*4,legendary:4+luck*3};
  let roll=hash(`relic:${f.index}:${f.date}`)*(w.common+w.rare+w.epic+w.legendary),rarity='common';
  for(const k of ['legendary','epic','rare','common']){if(roll<w[k]){rarity=k;break;}roll-=w[k];}
  const order=['legendary','epic','rare','common'];let pool=[];
  for(let i=order.indexOf(rarity);i<order.length&&!pool.length;i++)pool=RELICS.filter(r=>r.rarity===order[i]&&!taken.has(r.id));
  for(let i=order.indexOf(rarity)-1;i>=0&&!pool.length;i--)pool=RELICS.filter(r=>r.rarity===order[i]&&!taken.has(r.id));
  if(!pool.length){owned.push({...f,relic:null,duplicate:true});continue;}
  pool.sort((a,b)=>hash(`${f.index}:${a.id}`)-hash(`${f.index}:${b.id}`));
  const relic=pool[0];taken.add(relic.id);owned.push({...f,relic,rarity:relic.rarity});
 }
 return owned;
}

// ---- the isles ----
export const ISLES=[
 {id:'hearthrock',name:'Hearthrock',x:180,y:470,cost:0,desc:'Your workshop. The forge is always lit here.'},
 {id:'emberreach',name:'Emberreach',x:96,y:400,cost:2,reward:{embers:40,iron:3},desc:'Warm black sand and steaming vents. Young dragons learn to fly here.'},
 {id:'tidewhisper',name:'Tidewhisper Shoals',x:250,y:356,cost:3,reward:{embers:50,herb:4},desc:'Sandbars that sing at low tide.'},
 {id:'squall',name:'Squall Strait',x:136,y:300,cost:4,needs:'storm',reward:{embers:70,scale:1},desc:'A channel of endless lightning. Bring a storm cloak.'},
 {id:'mistfen',name:'Mistfen',x:66,y:236,cost:4,needs:'light',reward:{embers:70,moonstone:3},desc:'Fog so thick you can drink it. A lantern keeps you on course.'},
 {id:'skyreef',name:'Skyreef',x:220,y:226,cost:5,reward:{embers:90,silk:2,dye:2},desc:'Coral arches standing in the clouds.'},
 {id:'frostspire',name:'Frostspire',x:296,y:170,cost:6,needs:'frost',reward:{embers:120,starmetal:1},desc:'Ice needles taller than towers. Wings freeze without a charm.'},
 {id:'cinderpeak',name:'Cinderpeak',x:160,y:150,cost:6,reward:{embers:120,core:1},desc:'An old volcano. Something huge sleeps in the caldera.'},
 {id:'stormcrown',name:'Stormcrown',x:60,y:96,cost:7,needs:'storm',reward:{embers:150,scale:2},desc:'Where storms are born, ringed by thunder.'},
 {id:'wyrmhollow',name:'Wyrm Hollow',x:236,y:78,cost:8,needs:'light',reward:{embers:200,core:1,starmetal:1},desc:'Caves full of ancient nests and older bones.'},
 {id:'dawnspire',name:'Dawnspire',x:150,y:30,cost:10,reward:{embers:300,core:2,scale:3},desc:'The first place the sun touches. Few riders have stood here.'}
];

// ---- dragon name: stored as numbers, four characters per number ----
const NAME_CHARS=" abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'-.0123456789";
export const NAME_MAX=20;
export function nameChanges(name){
 const clean=[...String(name||'')].filter(c=>NAME_CHARS.includes(c)).join('').trim().slice(0,NAME_MAX);
 const out={};for(let i=0;i<5;i++){let v=0;for(let j=3;j>=0;j--){const c=clean[i*4+j];v=v*67+(c?NAME_CHARS.indexOf(c)+1:0);}out[gameKey(`name:${i}`)]=v;}
 return out;
}
export function readName(records){
 let s='';for(let i=0;i<5;i++){let v=num(records,`name:${i}`);for(let j=0;j<4;j++){const c=v%67;v=Math.floor(v/67);if(c)s+=NAME_CHARS[c-1];}}
 return s.trim();
}

// ---- bounties ----
const MAT_KEYS=Object.keys(MATERIALS);
function bountyReward(week,i,material){const reward={embers:50+i*30+Math.round(hash(`bounty:${week}:${i}:embers`)*20),[material]:2+i};if(i===2)reward.core=(reward.core||0)+1;return reward;}
const BOUNTY_TYPES=['craftGoal','total','streak','variety','anvil','weekly'];
function bountyFor(state,week,i,used){
 const r=k=>hash(`bounty:${week}:${i}:${k}`),days=weekDays(week),inWeek=e=>e.date>=days[0]&&e.date<=days[6];
 const dailyGoals=state.goals.filter(g=>['daily','days'].includes(g.schedule)),weeklyGoals=state.goals.filter(g=>g.schedule==='weekly');
 // The type comes from a fixed list, so adding or archiving goals doesn't reshuffle the week; a type
 // that needs goals you don't have falls through to the next one that works.
 const viable=t=>!used.has(t)&&(!['craftGoal','streak'].includes(t)||dailyGoals.length)&&(t!=='weekly'||weeklyGoals.length);
 const start=Math.floor(r('type')*BOUNTY_TYPES.length);let type='total';for(let k=0;k<BOUNTY_TYPES.length;k++){const t=BOUNTY_TYPES[(start+k)%BOUNTY_TYPES.length];if(viable(t)){type=t;break;}}used.add(type);
 const pick=list=>list[Math.floor(r('goal')*list.length)];
 const entries=state.ledger.filter(e=>inWeek(e)&&e.kind!=='target');
 let title,target,progress,material='amber';
 if(type==='craftGoal'&&dailyGoals.length){const g=pick(dailyGoals),n=g.schedule==='daily'?7:(g.days||[]).length;target=Math.max(2,Math.min(6,n-1));progress=entries.filter(e=>e.id===g.id).length;title=`Craft ${g.title} ${target} times`;material=materialFor(g.category);}
 else if(type==='streak'&&dailyGoals.length){const g=pick(dailyGoals),before=state.ledger.filter(e=>e.id===g.id&&e.date<days[0]).at(-1),startRun=before&&before.date>=addDays(days[0],-2)?before.run:0;target=Math.max(4,Math.min(30,startRun+4));progress=Math.max(0,...state.ledger.filter(e=>e.id===g.id&&inWeek(e)).map(e=>e.run));title=`Reach a ${target}-day ${g.title} streak`;material=materialFor(g.category);}
 else if(type==='weekly'){const g=pick(weeklyGoals);target=g.target||1;progress=entries.filter(e=>e.id===g.id).length;title=`Hit your ${g.title} target`;material=materialFor(g.category);}
 else if(type==='variety'){target=4;progress=new Set(entries.map(e=>e.category)).size;title='Craft goals in 4 different categories';material='silk';}
 else if(type==='anvil'){target=2;progress=days.filter(d=>num(state.records,`anvilperfect:${d}`)>=3).length;title='Land two perfect Anvil Strike runs';material='iron';}
 else{const planned=days.reduce((n,d)=>n+(state.dayTotals[d]?.planned||0),0)||14;target=Math.max(6,Math.min(40,Math.round(planned*.7)));progress=entries.length;title=`Craft ${target} goals this week`;material='herb';}
 // A claim stores the material it paid (index + 1), so the reward never changes afterwards.
 const stored=num(state.records,`bounty:${week}:${i}`),paid=stored>1?MAT_KEYS[stored-2]:null;
 const reward=bountyReward(week,i,paid||material);
 const claimed=has(state.records,`bounty:${week}:${i}`);
 return {week,index:i,type,title,target,progress:Math.min(progress,target),done:progress>=target,claimed,reward};
}
export function bountiesFor(state,week){const used=new Set();return [0,1,2].map(i=>bountyFor(state,week,i,used));}

// ---- achievements ----
export const ACHIEVEMENTS=[
 {id:'first',name:'First spark',desc:'Craft your first goal.',icon:'spark',reward:20,test:s=>s.totals.all>=1},
 {id:'c50',name:'Apprentice',desc:'Craft 50 goals.',icon:'hammer',reward:60,test:s=>s.totals.all>=50},
 {id:'c250',name:'Journeyman',desc:'Craft 250 goals.',icon:'hammer',reward:150,test:s=>s.totals.all>=250},
 {id:'c1000',name:'Master smith',desc:'Craft 1,000 goals.',icon:'anvil',reward:500,test:s=>s.totals.all>=1000},
 {id:'s7',name:'Flame',desc:'Reach a 7-day streak.',icon:'flame',reward:50,test:s=>s.bestRun>=7},
 {id:'s30',name:'Inferno',desc:'Reach a 30-day streak.',icon:'flame',reward:200,test:s=>s.bestRun>=30},
 {id:'s100',name:'Dragonheart',desc:'Reach a 100-day streak.',icon:'flame',reward:800,test:s=>s.bestRun>=100},
 {id:'blazing',name:'Blazing',desc:'Get the forge to Blazing.',icon:'flame',reward:60,test:s=>s.temp>=.45},
 {id:'dragonfire',name:'Dragonfire',desc:'Get the forge to Dragonfire.',icon:'flame',reward:250,test:s=>s.temp>=1},
 {id:'week',name:'Perfect week',desc:'Craft every daily goal for 7 days in a row.',icon:'calendar',reward:150,test:s=>s.bestFullRun>=7},
 {id:'r1',name:'Relic hunter',desc:'Forge your first relic.',icon:'relic',reward:40,test:s=>s.relics.length>=1},
 {id:'r10',name:'Curator',desc:'Forge 10 relics.',icon:'relic',reward:200,test:s=>s.relics.length>=10},
 {id:'epic',name:'Epic find',desc:'Forge an epic relic.',icon:'relic',reward:120,test:s=>s.relics.some(r=>['epic','legendary'].includes(r.rarity))},
 {id:'legend',name:'The stuff of legend',desc:'Forge a legendary relic.',icon:'crown',reward:400,test:s=>s.relics.some(r=>r.rarity==='legendary')},
 {id:'iron30',name:'Iron will',desc:'Craft 30 Movement goals.',icon:'ore',reward:80,test:s=>(s.totals.Movement||0)>=30},
 {id:'herb50',name:'Green thumb',desc:'Craft 50 Health goals.',icon:'herb',reward:80,test:s=>(s.totals.Health||0)>=50},
 {id:'mind25',name:'Scholar',desc:'Craft 25 Learning goals.',icon:'gem',reward:80,test:s=>(s.totals.Learning||0)>=25},
 {id:'muse25',name:'Muse',desc:'Craft 25 Creative goals.',icon:'drop',reward:80,test:s=>(s.totals.Creative||0)>=25},
 {id:'perfect',name:'Ring true',desc:'Land a perfect Anvil Strike run.',icon:'anvil',reward:60,test:s=>s.anvilPerfectRuns>=1},
 {id:'anvil10',name:'Hammer time',desc:'Play 10 rewarded Anvil Strike runs.',icon:'hammer',reward:100,test:s=>s.anvilRuns>=10},
 {id:'catch',name:'Butterfingers no more',desc:'Score 60 in Ember Catch.',icon:'spark',reward:80,test:s=>s.catchBest>=60},
 {id:'b1',name:'Bounty hunter',desc:'Claim a bounty.',icon:'scroll',reward:40,test:s=>s.bountiesClaimed>=1},
 {id:'b10',name:'Wanted',desc:'Claim 10 bounties.',icon:'scroll',reward:200,test:s=>s.bountiesClaimed>=10},
 {id:'isle3',name:'Islander',desc:'Fly to 3 islands.',icon:'map',reward:80,test:s=>s.isle>=3},
 {id:'isleall',name:'Edge of the map',desc:'Reach Dawnspire.',icon:'map',reward:500,test:s=>s.isle>=ISLES.length-1},
 {id:'fledgling',name:'First flight',desc:'Raise your dragon to Fledgling.',icon:'wing',reward:60,test:s=>s.dragon.stage>=1},
 {id:'adult',name:'Grown',desc:'Raise your dragon to Adult.',icon:'wing',reward:250,test:s=>s.dragon.stage>=3},
 {id:'elder',name:'Elder bond',desc:'Raise your dragon to Elder.',icon:'crown',reward:600,test:s=>s.dragon.stage>=4},
 {id:'crafter',name:'Tinkerer',desc:'Craft 10 items.',icon:'hammer',reward:80,test:s=>s.itemsCrafted>=10},
 {id:'dressed',name:'Dressed to fly',desc:'Fill four gear slots.',icon:'saddle',reward:100,test:s=>Object.values(s.equip).filter(Boolean).length>=4}
];

// ---- the whole state ----
export function gameState(records,today=dayKey(),{hour=12}={}){
 const forge=forgeStats(records,today),ledger=forge.ledger,goals=goalsOf(records).map(g=>goalForDate(forge.byGoal[g.id]||records,g.id,today,today)||g).filter(g=>!g.metric);
 const s={records,today,forge,ledger,goals,dayTotals:forge.dayTotals,temp:forge.temp};
 // Totals and dragon stats come straight from the ledger.
 const totals={all:0};for(const e of ledger){if(e.kind==='target')continue;totals.all++;totals[e.category]=(totals[e.category]||0)+1;}
 s.totals=totals;
 const stats={strength:totals.Movement||0,vitality:totals.Health||0,wisdom:totals.Learning||0,spirit:(totals.Creative||0)+(totals.Hobbies||0)+(totals.Personal||0)};
 // Days where every planned daily goal was crafted give 2 flight energy; half or more gives 1.
 let energy=0,fullRun=0,bestFullRun=0;for(const [d,t]of Object.entries(forge.dayTotals).sort()){if(!t.planned)continue;const ratio=t.done/t.planned;energy+=ratio>=1?2:ratio>=.5?1:0;if(ratio>=1){fullRun++;bestFullRun=Math.max(bestFullRun,fullRun);}else if(d<today)fullRun=0;}
 s.bestFullRun=bestFullRun;
 // Earned: heat becomes embers; every craft drops its category's material, more on long streaks.
 const earned={embers:Math.round(forge.lifetime)};const add=(o,k,n)=>{o[k]=(o[k]||0)+n;};
 let learned=0;for(const e of ledger){const mat=materialFor(e.category);if(e.kind==='target'){add(earned,mat,1);add(earned,'amber',1);continue;}add(earned,mat,e.kind==='once'?3:e.run>=10?2:1);if(e.kind==='once')add(earned,'amber',1);if(e.category==='Learning')learned++;
  if(hash(`wis:${e.date}:${e.id}`)<Math.min(.15,learned*.002))add(earned,mat,1);}
 // Milestones use each goal's best daily run from the ledger, which keeps archived goals, so archiving never takes rewards back.
 const bestRun={};for(const e of ledger)if(e.kind==='day')bestRun[e.id]=Math.max(bestRun[e.id]||0,e.run);
 s.bestRun=Math.max(0,...Object.values(bestRun));
 for(const best of Object.values(bestRun))for(const m of STREAK_MILESTONES)if(best>=m.days){if(m.days>=7)add(earned,'scale',m.days>=100?3:m.days>=30?2:1);add(earned,'embers',m.days*3);}
 // Stored rewards: games, well-fed days, bounties, islands, achievements.
 const tally={},T=k=>tally[k]||0;s.tally=tally;
 let anvilRuns=0,anvilPerfectRuns=0,catchBest=0,fedTotal=0,petBond=0,bountiesClaimed=0;
 for(const [k,r]of Object.entries(records)){
  if(!k.startsWith('metric:game:')||!Number.isInteger(r.value))continue;const rest=k.slice(12),[kind,a,b]=rest.split(':');
  if(kind==='anvil'){add(earned,'embers',r.value);anvilRuns++;}
  else if(kind==='anvilstar')add(earned,'starmetal',r.value);
  else if(kind==='anvilperfect'&&r.value>=3)anvilPerfectRuns++;
  else if(kind==='catch'){add(earned,'embers',Math.max(0,r.value-1));}
  else if(kind==='catchbest')catchBest=Math.max(catchBest,r.value);
  else if(kind==='catchmat')add(earned,'amber',r.value);
  else if(kind==='fed'){fedTotal+=r.value;if(forge.heat[a])add(earned,'embers',Math.round(forge.heat[a]*.1));}
  else if(kind==='pet')petBond+=Math.min(3,r.value)*2;
  else if(kind==='bounty'&&a){bountiesClaimed++;for(const [m,n]of Object.entries(bountyReward(a,Number(b),r.value>1&&MAT_KEYS[r.value-2]||'amber')))add(earned,m,n);}
  else if(COUNTERS.has(kind)&&a){const t=`${kind}:${a}`;tally[t]=(tally[t]||0)+r.value;}
 }
 const isle=Math.min(ISLES.length-1,num(records,'isle'));for(let i=1;i<=isle;i++)for(const [m,n]of Object.entries(ISLES[i].reward||{}))add(earned,m,n);
 Object.assign(s,{anvilRuns,anvilPerfectRuns,catchBest,bountiesClaimed,isle});
 // Relics and inventory.
 s.relics=rollRelics(forge.forged).filter(r=>r.relic).map(r=>({...r.relic,date:r.date,index:r.index}));
 for(const r of rollRelics(forge.forged))if(r.duplicate)add(earned,'embers',100);
 const ownedRelic=new Set(s.relics.map(r=>r.id));
 const inventory={};let itemsCrafted=0;
 for(const it of ITEMS){if(['treat','supply'].includes(it.kind)){const made=T(`made:${it.id}`),used=T(`used:${it.id}`);inventory[it.id]=Math.max(0,made-used);itemsCrafted+=made;}else{inventory[it.id]=has(records,`got:${it.id}`)?1:0;itemsCrafted+=inventory[it.id];}}
 s.inventory=inventory;s.itemsCrafted=itemsCrafted;
 // Equipped gear. A slot holds an item code (1000+) or a relic code (1-40).
 const byCode=Object.fromEntries([...ITEMS.map(x=>[ITEM[x.id].code,{...ITEM[x.id],type:'item'}]),...RELICS.map(r=>[r.code,{...r,type:'relic'}])]);
 const equip={};for(const sl of SLOTS){const c=num(records,`equip:${sl.key}`);const thing=byCode[c];equip[sl.key]=thing&&thing.slot===sl.key&&(thing.type==='item'?inventory[thing.id]:ownedRelic.has(thing.id))?thing:null;}
 s.equip=equip;s.byCode=byCode;
 const worn=Object.values(equip).filter(Boolean),perkCount=p=>worn.filter(x=>x.perk===p).length;
 s.perks={thrift:Math.min(3,perkCount('thrift')),swift:Math.min(3,perkCount('swift')),frugal:Math.min(1,perkCount('frugal')),hot:s.relics.filter(r=>r.perk==='hot').length+(inventory.hammer?2:0)};
 s.tags=new Set(worn.flatMap(x=>x.tags||(x.tag?[x.tag]:[])));
 // The dragon.
 // The dragon starts as a baby the day you adopt them: bond counts from then. Earlier goals still filled the wallet.
 const named=Boolean(readName(records)),born=has(records,'born')?fromDayNumber(num(records,'born')):today;
 const activeDays=new Set(ledger.filter(e=>e.date>=born).map(e=>e.date)).size,bornHeat=Object.entries(forge.heat).reduce((n,[d,h])=>d>=born?n+h:n,0);
 const treatBond=ITEMS.filter(x=>x.kind==='treat').reduce((n,x)=>n+T(`used:${x.id}`)*x.bond,0);
 const spiritBoost=1+Math.min(.25,stats.spirit*.005),xp=named?Math.round((bornHeat+activeDays*10+treatBond+petBond)*spiritBoost):0;
 const stage=STAGES.reduce((st,x,i)=>xp>=x.xp?i:st,0),next=STAGES[stage+1];
 const todayPlanned=forge.dayTotals[today]?.planned||0,todayDone=forge.dayTotals[today]?.done||0,ratio=todayPlanned?todayDone/todayPlanned:0;
 const lastActive=ledger.length?ledger.at(-1).date:null,away=lastActive?Math.round((dateOf(today)-dateOf(lastActive))/864e5):99;
 const fedToday=num(records,`fed:${today}`),petsToday=num(records,`pet:${today}`);
 let mood='content';if(away>=3&&!todayDone)mood='lonely';else if(!todayDone)mood=hour<11?'sleepy':'restless';else if(ratio>=1)mood=forge.temp>=.75?'fiery':'delighted';else if(ratio>=.5)mood=forge.temp>=.75?'fiery':'happy';
 const name=readName(records)||'Your dragon',color=DRAGON_COLORS[Math.min(DRAGON_COLORS.length-1,Math.max(0,num(records,'color')))];
 s.dragon={named,name,color,colorIndex:DRAGON_COLORS.indexOf(color),stage,stageName:STAGES[stage].name,xp,xpFrom:STAGES[stage].xp,xpTo:next?.xp||null,progress:next?(xp-STAGES[stage].xp)/(next.xp-STAGES[stage].xp):1,stats,mood,fedToday,petsToday,away,born:has(records,'born')?born:null,quirk:`${name} ${QUIRKS[Math.floor(hash(`quirk:${today}:${name}`)*QUIRKS.length)]}`};
 s.unlocked=new Set(UNLOCKS.filter(u=>stage>=u.stage).map(u=>u.key));
 // Achievements: stored the first time they're met so they stay earned; rewards count once stored.
 s.equipCount=worn.length;
 s.achievements=ACHIEVEMENTS.map(a=>{const got=has(records,`ach:${a.id}`);return {...a,got,date:got?fromDayNumber(num(records,`ach:${a.id}`)):null,ready:!got&&safeTest(a,s)};});
 for(const a of s.achievements)if(a.got)add(earned,'embers',a.reward);
 // Flight energy.
 s.energy={earned:energy,spent:T('spent:energy'),available:Math.max(0,energy-T('spent:energy'))};
 // Wallet.
 const wallet={};for(const k of ['embers',...Object.keys(MATERIALS)])wallet[k]=Math.max(0,(earned[k]||0)-T(`spent:${k}`));
 s.earned=earned;s.wallet=wallet;
 s.bounties=s.unlocked.has('bounties')?bountiesFor(s,weekKey(today)):[];
 s.lastWeekBounties=bountiesFor(s,addDays(weekKey(today),-7)).filter(b=>b.done&&!b.claimed);
 s.theme=num(records,'theme');
 s.anvilToday={played:has(records,`anvil:${today}`),earned:num(records,`anvil:${today}`),eligible:todayPlanned>0&&todayDone*2>=todayPlanned};
 s.catchToday={played:has(records,`catch:${today}`),eligible:todayDone>=1};
 return s;
}
function safeTest(a,s){try{return Boolean(a.test(s));}catch{return false;}}

// ---- costs ----
export function costFor(state,itemId){
 const it=ITEM[itemId];if(!it)return null;const cost={...it.cost};
 if(cost.embers)cost.embers=Math.round(cost.embers*(1-.1*state.perks.thrift));
 if(state.perks.frugal){const main=Object.keys(cost).filter(k=>k!=='embers'&&!MATERIALS[k]?.rare).sort((a,b)=>cost[b]-cost[a])[0];if(main&&cost[main]>1)cost[main]-=1;}
 return cost;
}
export const canAfford=(state,cost)=>Object.entries(cost).every(([k,n])=>(state.wallet[k]||0)>=n);
function spend(state,cost){let out={};for(const [k,n]of Object.entries(cost))out={...out,...bump(state,`spent:${k}`,n)};return out;}

// ---- actions: each returns the records to save, or throws a plain-language error ----
export function craftChanges(state,itemId){
 const it=ITEM[itemId];if(!it)throw new Error('That recipe is unknown.');
 if(it.unlock&&!state.unlocked.has(it.unlock))throw new Error(`Unlocks when your dragon reaches ${STAGES[UNLOCKS.find(u=>u.key===it.unlock).stage].name}.`);
 const consumable=['treat','supply'].includes(it.kind);if(!consumable&&state.inventory[itemId])throw new Error('You already have this.');
 const cost=costFor(state,itemId);if(!canAfford(state,cost))throw new Error('Not enough materials yet.');
 return {...spend(state,cost),...(consumable?bump(state,`made:${itemId}`,1):{[gameKey(`got:${itemId}`)]:dayNumber(state.today)})};
}
export function feedChanges(state,itemId){
 const it=ITEM[itemId];if(!it||it.kind!=='treat')throw new Error('That isn’t a treat.');
 if(!state.inventory[itemId])throw new Error('Craft one first.');
 if(state.dragon.fedToday>=3)throw new Error(`${state.dragon.name} is full for today.`);
 return {...bump(state,`used:${itemId}`,1),[gameKey(`fed:${state.today}`)]:state.dragon.fedToday+1};
}
export function petChanges(state){return {[gameKey(`pet:${state.today}`)]:Math.min(99,state.dragon.petsToday+1)};}
export function adoptChanges(state,name,colorIndex){
 const changes=nameChanges(name);if(!readName(Object.fromEntries(Object.entries(changes).map(([k,v])=>[k,{value:v}]))))throw new Error('Give your dragon a name.');
 changes[gameKey('color')]=Math.max(0,Math.min(DRAGON_COLORS.length-1,colorIndex|0));if(!state.dragon.born)changes[gameKey('born')]=dayNumber(state.today);return changes;
}
export function equipChanges(state,slot,code){
 const sl=SLOTS.find(x=>x.key===slot);if(!sl)throw new Error('Unknown slot.');
 if(state.dragon.stage<sl.stage)throw new Error(`The ${sl.label.toLowerCase()} slot opens at ${STAGES[sl.stage].name}.`);
 if(!code)return {[gameKey(`equip:${slot}`)]:0};
 const thing=state.byCode[code];if(!thing||thing.slot!==slot)throw new Error('That doesn’t fit there.');
 const owned=thing.type==='item'?state.inventory[thing.id]:state.relics.some(r=>r.id===thing.id);if(!owned)throw new Error('You don’t own that yet.');
 return {[gameKey(`equip:${slot}`)]:code};
}
export function claimBountyChanges(state,bounty){
 if(!bounty.done)throw new Error('Not finished yet.');if(bounty.claimed)throw new Error('Already claimed.');
 const mat=Object.keys(bounty.reward).find(k=>MATERIALS[k]&&k!=='core')||'amber';
 return {[gameKey(`bounty:${bounty.week}:${bounty.index}`)]:2+MAT_KEYS.indexOf(mat)};
}
export function flightPlan(state){
 const next=ISLES[state.isle+1];if(!next)return null;
 const cost=Math.max(1,next.cost-state.perks.swift),rations=next.cost>=6?1:0,missing=next.needs&&!state.tags.has(next.needs)?next.needs:null;
 return {to:next,index:state.isle+1,cost,rations,missing,ok:!missing&&state.energy.available>=cost&&(state.inventory.rations||0)>=rations&&state.unlocked.has('isles')};
}
export function flyChanges(state){
 const p=flightPlan(state);if(!p)throw new Error('You’ve reached the edge of the map.');
 if(!state.unlocked.has('isles'))throw new Error('Flights unlock when your dragon is a Fledgling.');
 if(p.missing)throw new Error({storm:'You need storm gear equipped to cross.',frost:'You need frost gear equipped to cross.',light:'You need a light equipped to find the way.'}[p.missing]);
 if(state.energy.available<p.cost)throw new Error('Not enough flight energy. Finish more full days.');
 if((state.inventory.rations||0)<p.rations)throw new Error('This is a long flight. Pack flight rations.');
 const out={[gameKey('isle')]:p.index,...bump(state,'spent:energy',p.cost)};if(p.rations)Object.assign(out,bump(state,'used:rations',1));return out;
}
export function anvilZone(state){return Math.min(.42,.16+state.dragon.stats.strength*.001+state.perks.hot*.02);}
export function anvilRewardChanges(state,{score,perfects}){
 if(state.anvilToday.played)throw new Error('Today’s rewarded run is done. Practice is free.');
 if(!state.anvilToday.eligible)throw new Error('Craft half of today’s goals to earn a rewarded run.');
 const embers=Math.max(1,Math.round(Math.max(0,Math.min(150,score))*(state.inventory.bellows?1.2:1)));
 return {[gameKey(`anvil:${state.today}`)]:embers,[gameKey(`anvilperfect:${state.today}`)]:Math.max(0,Math.min(5,perfects|0)),[gameKey(`anvilstar:${state.today}`)]:perfects>=3?1:0};
}
export function catchRewardChanges(state,score){
 if(state.catchToday.played)throw new Error('Today’s rewarded run is done. Practice is free.');
 if(!state.catchToday.eligible)throw new Error('Craft a goal today to earn a rewarded run.');
 const s=Math.max(0,Math.min(500,score|0)),embers=Math.round(s/2*(state.inventory.bellows?1.2:1));
 return {[gameKey(`catch:${state.today}`)]:embers+1,[gameKey(`catchbest:${state.today}`)]:s,[gameKey(`catchmat:${state.today}`)]:s>=40?1:0};
}
export function themeChanges(state,theme){
 if(theme&&!ITEMS.some(x=>x.kind==='theme'&&x.theme===theme&&state.inventory[x.id]))throw new Error('Craft that theme first.');
 return {[gameKey('theme')]:theme|0};
}
export function achievementChanges(state){
 const out={};for(const a of state.achievements)if(a.ready)out[gameKey(`ach:${a.id}`)]=dayNumber(state.today);return out;
}
export const tierIndex=temp=>TIERS.filter(t=>temp>=t.min).length-1;
