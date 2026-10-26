// The game layer. Goals are the currency: everything here is worked out from goal records,
// plus a few choices the player makes (crafting, feeding, flying, equipping, game scores).
// Choices are stored as whole numbers under metric:game:* so the existing sync server accepts them.
// Nothing here touches the DOM, so it can be tested directly.
//
// Balance rule: hard things pay a lot, easy things pay a little. Goals are the main income, full days
// and perfect weeks pay the most, streaks heat the forge (a hotter forge pays more embers), and the
// once-a-day rewarded games need goals first. Free play pays small scraps with a daily cap.
import {dayKey,addDays,weekKey,weekDays,dateOf,value,forgeStats,goalForDate,goalsOf,STREAK_MILESTONES,TIERS,FORGE} from './core.js?v=16';

// ---- helpers ----
export function hash(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}h^=h>>>13;h=Math.imul(h,1274126177);h^=h>>>16;return (h>>>0)/4294967296;}
const DAY0='2026-01-01',DAY0_MS=Date.UTC(2026,0,1);
export const dayNumber=d=>Math.round((dateOf(d)-dateOf(DAY0))/864e5);
export const fromDayNumber=n=>addDays(DAY0,n);
export const minuteNow=(ms=Date.now())=>Math.floor((ms-DAY0_MS)/60000);
// Seasons: a fresh start for the game (wallet, items, relics, isles, achievements) that keeps the
// dragon's name and color and never touches goal history. Season n stores its choices under "s<n>:".
// Keys whose first part is listed here belong to the player, not to a season.
const PERSIST=new Set(['name','color','born','season','epoch','renames','cat','catname','catmat','caticon']);
const nsOf=records=>{const s=records['metric:game:season']?.value;return Number.isInteger(s)&&s>0?`s${s}:`:'';};
const keyFor=(records,k)=>`metric:game:${PERSIST.has(k.split(':')[0])?'':nsOf(records)}${k}`;
export const gameKey=(k,records={})=>keyFor(records,k);
const gk=(state,k)=>keyFor(state.records,k);
const num=(records,k,f=0)=>{const v=value(records,keyFor(records,k),null);return Number.isInteger(v)?v:f;};
const has=(records,k)=>Number.isInteger(value(records,keyFor(records,k),null));
// Running totals (spent, made, used, scraps) are kept per device and added up, so two devices
// crafting offline never overwrite each other's spending when they sync.
const COUNTERS=new Set(['spent','made','used']);
let DEVICE='d0';
export function setDevice(id){if(/^[a-z0-9]{2,12}$/.test(id||''))DEVICE=id;}
const own=(state,k)=>num(state.records,`${k}:${DEVICE}`);
const bump=(state,k,n)=>({[gk(state,`${k}:${DEVICE}`)]:own(state,k)+n});

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
export const COMMON=['iron','herb','moonstone','dye','silk','amber'];
export const CATEGORY_MATERIAL={Movement:'iron',Health:'herb',Learning:'moonstone',Creative:'dye',Hobbies:'silk',Personal:'amber'};
// Where each material comes from, in plain words (shown in the workshop).
export const SOURCES={
 embers:'Every goal you craft. A hotter forge pays more.',
 iron:'Movement goals. Rewarded Anvil runs.',herb:'Health goals. Emberreach and Tidewhisper.',moonstone:'Learning goals. Mistfen.',
 dye:'Creative goals. Skyreef.',silk:'Hobbies goals. Skyreef.',amber:'Personal goals. Ember Catch runs. One-time goals.',
 scale:'Streak milestones, perfect weeks, achievements, storm islands.',starmetal:'Perfect Anvil runs, perfect weeks, far islands.',core:'The hardest bounties and the farthest islands.'
};
export const BUILTIN_CATEGORIES=['Health','Movement','Learning','Creative','Hobbies','Personal'];
// Categories you add yourself pick one of the six common materials (stored as catmat:<slug>).
export const slug=name=>String(name||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,24)||'other';
export function materialFor(category,records=null){if(CATEGORY_MATERIAL[category])return CATEGORY_MATERIAL[category];if(records){const i=num(records,`catmat:${slug(category)}`);if(i>=1&&i<=COMMON.length)return COMMON[i-1];}return 'amber';}

// ---- the dragon ----
export const DRAGON_COLORS=[
 {id:'ember',name:'Ember',body:'#e0583e',dark:'#a4302a',belly:'#ffcf86',wing:'#c2402f',membrane:'#ff9a6b',horn:'#fff1d6',eye:'#ffd23f',glow:'#ff8a3d'},
 {id:'tide',name:'Tide',body:'#2fa6c7',dark:'#1b6487',belly:'#bff3ff',wing:'#237fa8',membrane:'#7fe0f0',horn:'#eafcff',eye:'#08d8a0',glow:'#4fe0ff'},
 {id:'moss',name:'Moss',body:'#5aa84f',dark:'#2f6b33',belly:'#e3f5a8',wing:'#3f8a3c',membrane:'#a7e07f',horn:'#fffbe0',eye:'#ffcf3a',glow:'#9be35a'},
 {id:'dusk',name:'Dusk',body:'#7a55c9',dark:'#45307f',belly:'#f3c9ff',wing:'#5e3fa6',membrane:'#c79bff',horn:'#fdf2ff',eye:'#ff6b93',glow:'#b18cff'}
];
export const STAGES=[{name:'Baby',xp:0},{name:'Fledgling',xp:150},{name:'Juvenile',xp:600},{name:'Adult',xp:1800},{name:'Elder',xp:5000}];
export const UNLOCKS=[
 {key:'anvil',stage:0,label:'Anvil Strike'},{key:'vault',stage:0,label:'The Vault'},{key:'bounties',stage:0,label:'Bounty board'},
 {key:'wingbeat',stage:1,label:'Wingbeat'},{key:'isles',stage:1,label:'Flights across the isles'},{key:'catch',stage:2,label:'Ember Catch'},{key:'saddle',stage:1,label:'Saddles and charms'},
 {key:'armor',stage:2,label:'Armor and helms'},{key:'themes',stage:2,label:'Workshop themes'},
 {key:'legendary',stage:3,label:'Rare recipes'},{key:'aura',stage:4,label:'Elder aura and crowns'}
];
export const SLOTS=[{key:'head',label:'Head',stage:2},{key:'neck',label:'Neck',stage:0},{key:'saddle',label:'Saddle',stage:1},{key:'armor',label:'Armor',stage:2},{key:'charm',label:'Charm',stage:1}];
export const PET_COOLDOWN=180; // minutes between pets
// Wingbeat levels: an older dragon flies harder skies, and harder skies pay more.
export const WING_LEVELS=[null,{name:'Breeze',stage:1,pay:1},{name:'Gusts',stage:2,pay:1.25},{name:'Gale',stage:3,pay:1.5},{name:'Storm',stage:4,pay:2}];
export const wingLevel=(state,level)=>Math.max(1,Math.min(level|0||1,state.dragon.stage));
// Little things the dragon is up to today. Babies get baby things; older dragons get grown-up things.
const QUIRKS=[
 [0,'fell asleep mid-yawn, one wing still up.'],[0,'tried to roar. It came out as a hiccup.'],[0,'is chasing a spark around the anvil.'],[0,'found a warm spot by the coals and won’t share it.'],[0,'sneezed a puff of smoke and looked very surprised.'],[0,'is guarding one very important pebble.'],[0,'keeps nudging your hand for a scratch.'],[0,'is practicing a fierce face in the water bucket.'],[0,'tumbled off the straw and pretended it was on purpose.'],[0,'chewed the corner of the bounty board. Just a little.'],
 [1,'flew all the way across the workshop. Once.'],[1,'is testing their wings on the rafters.'],[1,'brought you a shiny bolt as a gift.'],[1,'is watching the gulls like they’re rivals.'],[1,'tried to carry the hammer and got halfway.'],[1,'is warming the anvil for you, very seriously.'],
 [2,'raced the wind along the cliffs this morning.'],[2,'is sharpening their claws on the old fence post.'],[2,'sniffed out a storm coming in from the west.'],[2,'lit the forge for you before you woke up.'],[2,'is studying the map like they know a shortcut.'],[2,'chased a storm cloud and came back soaked and proud.'],
 [3,'is keeping watch from the workshop roof.'],[3,'roared at a passing ship. The ship roared back. Rude.'],[3,'carried a whole log in for the fire.'],[3,'is teaching the local gulls some respect.'],
 [4,'is telling the young dragons about the old flight routes.'],[4,'keeps one eye open, always, for you.'],[4,'breathed a ring of fire just to see you smile.'],[4,'remembers every island you’ve flown together.']
];

// ---- crafting ----
// kind: treat (eaten), supply (used up), gear (worn), tool (kept), theme. Codes are fixed forever:
// a gear slot stores the code, so never renumber. stage: the dragon stage that opens the recipe.
// secret: hidden entirely until found (an island reached or an achievement earned).
export const ITEMS=[
 {code:1000,id:'fish',name:'Smoked fish',kind:'treat',stage:0,icon:'fish',cost:{herb:2,embers:10},bond:4,desc:'A favorite. Any treat makes your dragon Well-fed: today’s goals pay 10% more embers.'},
 {code:1001,id:'cookie',name:'Ember cookie',kind:'treat',stage:0,icon:'cookie',cost:{amber:1,herb:1,embers:15},bond:6,desc:'Crunchy and faintly smoking. A little more bond than fish.'},
 {code:1016,id:'jam',name:'Glowberry jam',kind:'treat',stage:1,icon:'cookie',cost:{herb:2,dye:1,embers:20},bond:7,effect:'pets2',desc:'Sticky and glowing. Pets give double bond today.'},
 {code:1002,id:'tart',name:'Starfruit tart',kind:'treat',stage:1,icon:'tart',cost:{moonstone:1,herb:2,starmetal:1,embers:30},bond:12,desc:'A rare treat and a big bond boost.'},
 {code:1017,id:'jerky',name:'Spiced boar jerky',kind:'treat',stage:2,icon:'fish',cost:{iron:2,herb:1,amber:1,embers:35},bond:10,effect:'anvil',desc:'Chewy fuel. Today’s rewarded Anvil Strike pays 25% more.'},
 {code:1018,id:'plum',name:'Frost plum',kind:'treat',stage:2,icon:'cookie',cost:{moonstone:2,herb:2,embers:35},bond:10,effect:'life',desc:'Cold and sweet. One extra heart in Ember Catch and Wingbeat today.'},
 {code:1019,id:'honeycomb',name:'Molten honeycomb',kind:'treat',stage:3,icon:'cookie',cost:{amber:3,silk:1,embers:50},bond:16,effect:'feast',desc:'Hot honey. Well-fed pays 25% today instead of 10%.'},
 {code:1020,id:'kelp',name:'Sky-kelp roll',kind:'treat',stage:3,icon:'fish',cost:{herb:3,moonstone:1,scale:1,embers:50},bond:16,effect:'energy',desc:'Packed for the clouds. +1 flight energy.'},
 {code:1021,id:'custard',name:'Phoenix-egg custard',kind:'treat',stage:4,icon:'tart',cost:{core:1,amber:2,herb:2,embers:90},bond:30,effect:'blaze',desc:'Legendary. Today’s goals pay 50% more embers on top of Well-fed.'},
 {code:1003,id:'rations',name:'Flight rations',kind:'supply',stage:1,icon:'rations',cost:{herb:3,embers:15},desc:'Packed for long flights. Any flight costing 6 or more energy uses one.'},
 {code:1022,id:'scroll',name:'Naming scroll',kind:'supply',stage:0,icon:'scroll',cost:{amber:2,embers:40},desc:'Lets you give your dragon a new name.'},
 {code:1023,id:'scaledye',name:'Scale dye',kind:'supply',stage:0,icon:'drop',cost:{dye:4,scale:1,embers:80},desc:'Changes your dragon’s color. They don’t mind. Much.'},
 {code:1004,id:'collar',name:'Riveted collar',kind:'gear',slot:'neck',stage:0,icon:'collar',cost:{iron:4,embers:20},perk:'thrift',desc:'Sturdy and smart. Crafting costs 10% fewer embers.'},
 {code:1024,id:'scarf',name:'Spark-silk scarf',kind:'gear',slot:'neck',stage:1,icon:'thread',cost:{silk:2,dye:2,embers:45},perk:'snack',desc:'Soft and warm. Your dragon can eat one more treat a day.'},
 {code:1005,id:'goggles',name:'Flight goggles',kind:'gear',slot:'head',stage:2,icon:'goggles',cost:{iron:3,moonstone:2,embers:40},perk:'swift',desc:'Clear eyes in high winds. Flights cost 1 less energy.'},
 {code:1025,id:'helm',name:'Brass helm',kind:'gear',slot:'head',stage:3,icon:'helm',cost:{iron:8,scale:1,embers:120},perk:'hot',desc:'Rings when struck. Widens the anvil’s perfect zone.'},
 {code:1026,id:'crown',name:'Ember crown',kind:'gear',slot:'head',stage:4,icon:'crown',cost:{core:2,starmetal:2,amber:4,embers:300},perk:'warm',desc:'Fit for an elder. Rewarded games pay 15% more.'},
 {code:1006,id:'saddle',name:'Rider’s saddle',kind:'gear',slot:'saddle',stage:1,icon:'saddle',cost:{iron:6,herb:2,embers:60},perk:'swift',desc:'Ride together. Flights cost 1 less energy.'},
 {code:1027,id:'racer',name:'Racing saddle',kind:'gear',slot:'saddle',stage:2,icon:'saddle',cost:{silk:3,iron:4,scale:1,embers:110},perk:'swift2',desc:'Light and fast. Flights cost 2 less energy.'},
 {code:1028,id:'packsaddle',name:'Pack saddle',kind:'gear',slot:'saddle',stage:3,icon:'rations',cost:{iron:6,herb:4,silk:2,embers:140},perk:'pack',desc:'Carries its own food. Long flights need no rations.'},
 {code:1007,id:'cloak',name:'Storm cloak',kind:'gear',slot:'armor',stage:2,icon:'cloak',cost:{iron:4,silk:1,dye:2,embers:80},tag:'storm',desc:'Waxed against lightning. Needed to cross storm islands.'},
 {code:1010,id:'barding',name:'Iron barding',kind:'gear',slot:'armor',stage:2,icon:'barding',cost:{iron:12,scale:1,embers:120},perk:'frugal',desc:'Heavy plates. Recipes need 1 less of their main material.'},
 {code:1029,id:'mantle',name:'Frost mantle',kind:'gear',slot:'armor',stage:3,icon:'cloak',cost:{moonstone:4,silk:2,scale:2,embers:160},tag:'frost',desc:'Scale-mail lined with fur. Crosses frozen islands.'},
 {code:1008,id:'lantern',name:'Glowmoss lantern',kind:'gear',slot:'charm',stage:1,icon:'lantern',cost:{herb:4,amber:1,embers:50},tag:'light',desc:'Lights the way through mist and caves.'},
 {code:1009,id:'frostcharm',name:'Frost charm',kind:'gear',slot:'charm',stage:1,icon:'snow',cost:{moonstone:3,scale:1,embers:90},tag:'frost',desc:'Keeps wings from icing over. Needed for frozen islands.'},
 {code:1030,id:'horseshoe',name:'Lucky horseshoe',kind:'gear',slot:'charm',stage:2,icon:'amber',cost:{iron:3,amber:3,starmetal:1,embers:100},perk:'lucky',desc:'Bounties you claim while wearing it pay 25% more embers.'},
 {code:1031,id:'amulet',name:'Hearth amulet',kind:'gear',slot:'charm',stage:3,icon:'core',cost:{core:1,amber:4,iron:2,embers:160},perk:'warm',desc:'A coal that never cools. Rewarded games pay 15% more.'},
 {code:1011,id:'hammer',name:'Tempered hammer',kind:'tool',stage:0,icon:'hammer',cost:{iron:8,starmetal:1,embers:100},desc:'Widens the perfect zone in Anvil Strike.'},
 {code:1032,id:'satchel',name:'Forager’s satchel',kind:'tool',stage:0,icon:'chest',cost:{herb:3,amber:2,embers:60},desc:'Free-play games can drop 50% more scraps each day.'},
 {code:1012,id:'bellows',name:'Dragonhide bellows',kind:'tool',stage:1,icon:'bellows',cost:{iron:5,herb:5,scale:1,embers:150},desc:'Rewarded game runs pay 20% more embers.'},
 {code:1033,id:'trough',name:'Quench trough',kind:'tool',stage:1,icon:'drop',cost:{iron:4,moonstone:2,embers:80},desc:'Anvil Strike: your first miss doesn’t break the combo.'},
 {code:1034,id:'lens',name:'Ember lens',kind:'tool',stage:1,icon:'gem',cost:{moonstone:3,amber:2,embers:90},desc:'Ember Catch: golden embers fall twice as often.'},
 {code:1035,id:'whistle',name:'Wing whistle',kind:'tool',stage:1,icon:'wing',cost:{silk:2,amber:2,embers:70},desc:'Wingbeat: start every run with a shield.'},
 {code:1036,id:'spyglass',name:'Spyglass',kind:'tool',stage:2,icon:'map',cost:{iron:3,moonstone:3,embers:120},desc:'Island flights bring back 25% more.'},
 {code:1037,id:'hod',name:'Coal hod',kind:'tool',stage:2,icon:'flame',cost:{iron:6,embers:110},desc:'Doubles the Well-fed ember bonus.'},
 {code:1038,id:'tongs',name:'Master’s tongs',kind:'tool',stage:3,icon:'anvil',cost:{starmetal:2,iron:6,core:1,embers:220},desc:'Every relic you forge also drops a piece of starmetal.'},
 {code:1013,id:'theme_frost',name:'Frostforge theme',kind:'theme',theme:1,stage:2,icon:'theme',cost:{moonstone:4,scale:2,embers:200},desc:'Ice-blue accents and a colder forge.'},
 {code:1014,id:'theme_verdant',name:'Verdant theme',kind:'theme',theme:2,stage:2,icon:'theme',cost:{herb:10,scale:2,embers:200},desc:'Moss-green accents and a living forge.'},
 {code:1039,id:'theme_tide',name:'Tideglass theme',kind:'theme',theme:4,stage:2,icon:'theme',cost:{moonstone:3,herb:3,scale:1,embers:180},desc:'Sea-glass teal and cool water light.'},
 {code:1015,id:'theme_night',name:'Nightforge theme',kind:'theme',theme:3,stage:3,icon:'theme',cost:{dye:6,starmetal:2,core:1,embers:300},desc:'Violet accents and starlight embers.'},
 {code:1040,id:'theme_dusk',name:'Duskbloom theme',kind:'theme',theme:5,stage:3,icon:'theme',cost:{dye:5,silk:3,scale:2,embers:260},desc:'Rose and violet, like the sky after rain.'},
 {code:1041,id:'theme_gold',name:'Goldleaf theme',kind:'theme',theme:6,stage:4,icon:'theme',cost:{amber:10,starmetal:3,core:2,embers:500},desc:'Gilded everything. For riders who made it.'},
 {code:1042,id:'theme_storm',name:'Stormcall theme',kind:'theme',theme:7,stage:1,secret:{isle:8},icon:'theme',cost:{silk:4,scale:2,starmetal:1,embers:250},desc:'Found at Stormcrown. Lightning blue and thunder grey.'},
 {code:1043,id:'theme_dawn',name:'Dawnfire theme',kind:'theme',theme:8,stage:1,secret:{isle:10},icon:'theme',cost:{amber:6,core:2,embers:400},desc:'Found at Dawnspire. Sunrise peach and gold.'},
 {code:1044,id:'theme_ash',name:'Ashen theme',kind:'theme',theme:9,stage:1,secret:{ach:'s30'},icon:'theme',cost:{iron:6,core:1,embers:250},desc:'Earned by a 30-day streak. Soot black and silver flame.'}
];
export const ITEM=Object.fromEntries(ITEMS.map(x=>[x.id,x]));
export const THEMES=['Emberforge','Frostforge','Verdant','Nightforge','Tideglass','Duskbloom','Goldleaf','Stormcall','Dawnfire','Ashen'];
const CONSUMABLE=new Set(['treat','supply']);
export const consumable=it=>CONSUMABLE.has(it.kind);
// What the workshop shows for a recipe: open, next (visible but locked), mystery (name hidden) or hidden.
export function recipeView(state,it){
 if(it.secret){const found=it.secret.isle?state.isle>=it.secret.isle:state.achievements.some(a=>a.id===it.secret.ach&&(a.got||a.ready));if(!found)return 'hidden';}
 const stage=state.dragon.stage;return it.stage<=stage?'open':it.stage===stage+1?'next':'mystery';
}

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
export const PERKS={thrift:'Crafting costs 10% fewer embers.',swift:'Flights cost 1 less energy.',swift2:'Flights cost 2 less energy.',frugal:'Recipes need 1 less of their main material.',hot:'Widens the anvil’s perfect zone.',snack:'One more treat a day.',pack:'Long flights need no rations.',lucky:'Bounties pay 25% more embers.',warm:'Rewarded games pay 15% more.'};
// Collections: finding every relic in a set pays once (as an achievement) and switches on a lasting bonus.
export const SETS=[
 {id:'forgeborn',name:'Forgeborn',perk:'hot',n:2,reward:300,mats:{starmetal:1}},
 {id:'riders',name:'Rider’s Kit',perk:'swift',n:1,reward:220,mats:{scale:1}},
 {id:'skyward',name:'Skyward',perk:'warm',n:1,reward:220,mats:{silk:3}},
 {id:'emberheart',name:'Emberheart',perk:'thrift',n:1,reward:250,mats:{core:1}},
 {id:'tideglass',name:'Tideglass',perk:'lucky',n:1,reward:250,mats:{moonstone:3}},
 {id:'stormcaller',name:'Stormcaller',perk:'snack',n:1,reward:200,mats:{scale:1}},
 {id:'mythic',name:'Mythic',perk:'bond',n:1,reward:600,mats:{core:2}}
].map(x=>({...x,size:RELICS.filter(r=>r.set===x.name).length,bonus:x.perk==='bond'?'Bond grows 10% faster.':PERKS[x.perk]}));

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
// Two regions. Bestia Alata (1-10) is a month or two of good days; the Far Reaches (11-20) open at
// Dawnspire and take a few months more. Costs are flight energy (2 for a full day, 1 for half).
export const REGIONS=[{id:1,name:'Bestia Alata',sea:'sea',from:0,to:10},{id:2,name:'The Far Reaches',sea:'sea2',from:10,to:20}];
export const ISLES=[
 {id:'hearthrock',name:'Hearthrock',x:180,y:470,cost:0,desc:'Your workshop. The forge is always lit here.'},
 {id:'emberreach',name:'Emberreach',x:96,y:400,cost:3,reward:{embers:40,iron:3,herb:2},desc:'Warm black sand and steaming vents. Young dragons learn to fly here.'},
 {id:'tidewhisper',name:'Tidewhisper Shoals',x:250,y:356,cost:4,reward:{embers:50,herb:4},desc:'Sandbars that sing at low tide.'},
 {id:'squall',name:'Squall Strait',x:136,y:300,cost:5,needs:'storm',reward:{embers:70,scale:1},desc:'A channel of endless lightning. Bring a storm cloak.'},
 {id:'mistfen',name:'Mistfen',x:66,y:236,cost:5,needs:'light',reward:{embers:70,moonstone:3},desc:'Fog so thick you can drink it. A lantern keeps you on course.'},
 {id:'skyreef',name:'Skyreef',x:220,y:226,cost:6,reward:{embers:90,silk:2,dye:2},desc:'Coral arches standing in the clouds.'},
 {id:'frostspire',name:'Frostspire',x:296,y:170,cost:7,needs:'frost',reward:{embers:120,starmetal:1},desc:'Ice needles taller than towers. Wings freeze without a charm.'},
 {id:'cinderpeak',name:'Cinderpeak',x:160,y:150,cost:8,reward:{embers:120,core:1},desc:'An old volcano. Something huge sleeps in the caldera.'},
 {id:'stormcrown',name:'Stormcrown',x:60,y:96,cost:9,needs:'storm',reward:{embers:150,scale:2},desc:'Where storms are born, ringed by thunder.'},
 {id:'wyrmhollow',name:'Wyrm Hollow',x:236,y:78,cost:10,needs:'light',reward:{embers:200,core:1,starmetal:1},desc:'Caves full of ancient nests and older bones.'},
 {id:'dawnspire',name:'Dawnspire',x:150,y:30,cost:12,reward:{embers:300,core:2,scale:3},desc:'The first place the sun touches. From its peak you can see farther islands no map shows.'},
 {id:'cloudgate',region:2,name:'Cloudgate',x:120,y:420,cost:12,reward:{embers:320,scale:2,iron:6},desc:'A stone gateway above the clouds. Beyond it, the Far Reaches.'},
 {id:'galewind',region:2,name:'Galewind Spires',x:250,y:370,cost:13,needs:'storm',reward:{embers:340,starmetal:2,silk:4},desc:'Wind-carved needles where the gusts never stop.'},
 {id:'aurora',region:2,name:'Aurora Shelf',x:90,y:310,cost:14,needs:'frost',reward:{embers:360,moonstone:6,scale:2},desc:'A glacier under a sky that glows green and violet.'},
 {id:'sunkenspire',region:2,name:'Sunken Spire',x:230,y:260,cost:14,needs:'light',reward:{embers:380,core:1,silk:4},desc:'An ancient tower half under the sea. Its windows still glow.'},
 {id:'emberfall',region:2,name:'Emberfall',x:120,y:210,cost:15,reward:{embers:400,core:2,iron:8},desc:'Lava pours into the sea in a roaring wall of steam.'},
 {id:'thundercrag',region:2,name:'Thundercrag',x:270,y:170,cost:16,needs:'storm',reward:{embers:440,starmetal:2,scale:3},desc:'Black crags under a storm that has never moved.'},
 {id:'glasswing',region:2,name:'Glasswing Lagoon',x:80,y:130,cost:17,reward:{embers:460,dye:6,silk:6,scale:2},desc:'A crystal atoll where the water is clear as glass.'},
 {id:'moonwell',region:2,name:'Moonwell',x:210,y:100,cost:18,needs:'light',reward:{embers:500,moonstone:10,core:2},desc:'A well of silver water. Riders say it shows what you’ll become.'},
 {id:'wyrmcradle',region:2,name:'Wyrmcradle',x:110,y:60,cost:20,needs:'frost',reward:{embers:600,core:3,starmetal:3},desc:'Where the oldest dragons were hatched, in caves of blue ice.'},
 {id:'crown',region:2,name:'The Crown of Bestia',x:220,y:26,cost:24,reward:{embers:900,core:4,scale:5,starmetal:3},desc:'The highest island in the world. Few dragons and fewer riders have ever landed here.'}
];

// ---- dragon name: stored as numbers, four characters per number ----
const NAME_CHARS=" abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'-.0123456789";
export const NAME_MAX=20;
export const cleanName=name=>[...String(name||'')].filter(c=>NAME_CHARS.includes(c)).join('').trim().slice(0,NAME_MAX);
export function nameChanges(name,records={}){
 const clean=cleanName(name);
 const out={};for(let i=0;i<5;i++){let v=0;for(let j=3;j>=0;j--){const c=clean[i*4+j];v=v*67+(c?NAME_CHARS.indexOf(c)+1:0);}out[keyFor(records,`name:${i}`)]=v;}
 return out;
}
export function readName(records){
 let s='';for(let i=0;i<5;i++){let v=num(records,`name:${i}`);for(let j=0;j<4;j++){const c=v%67;v=Math.floor(v/67);if(c)s+=NAME_CHARS[c-1];}}
 return s.trim();
}

// ---- bounties ----
const MAT_KEYS=Object.keys(MATERIALS);
function bountyReward(week,i,material,lucky=false){const reward={embers:Math.round((50+i*30+Math.round(hash(`bounty:${week}:${i}:embers`)*20))*(lucky?1.25:1)),[material]:2+i};if(i===2)reward.core=(reward.core||0)+1;return reward;}
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
 if(type==='craftGoal'&&dailyGoals.length){const g=pick(dailyGoals),n=g.schedule==='daily'?7:(g.days||[]).length;target=Math.max(2,Math.min(6,n-1));progress=entries.filter(e=>e.id===g.id).length;title=`Craft ${g.title} ${target} times`;material=state.matFor(g.category);}
 else if(type==='streak'&&dailyGoals.length){const g=pick(dailyGoals),before=state.ledger.filter(e=>e.id===g.id&&e.date<days[0]).at(-1),startRun=before&&before.date>=addDays(days[0],-2)?before.run:0;target=Math.max(4,Math.min(30,startRun+4));progress=Math.max(0,...state.ledger.filter(e=>e.id===g.id&&inWeek(e)).map(e=>e.run));title=`Reach a ${target}-day ${g.title} streak`;material=state.matFor(g.category);}
 else if(type==='weekly'){const g=pick(weeklyGoals);target=g.target||1;progress=entries.filter(e=>e.id===g.id).length;title=`Hit your ${g.title} target`;material=state.matFor(g.category);}
 else if(type==='variety'){target=4;progress=new Set(entries.map(e=>e.category)).size;title='Craft goals in 4 different categories';material='silk';}
 else if(type==='anvil'){target=2;progress=days.filter(d=>num(state.records,`anvilperfect:${d}`)>=3).length;title='Land two perfect Anvil Strike runs';material='iron';}
 else{const planned=days.reduce((n,d)=>n+(state.dayTotals[d]?.planned||0),0)||14;target=Math.max(6,Math.min(40,Math.round(planned*.7)));progress=entries.length;title=`Craft ${target} goals this week`;material='herb';}
 // A claim stores the material it paid (index + 2) plus 100 if a lucky charm was worn, so the reward never changes afterwards.
 const stored=num(state.records,`bounty:${week}:${i}`),code=stored%100,paid=code>1?MAT_KEYS[code-2]:null;
 const claimed=has(state.records,`bounty:${week}:${i}`);
 const reward=bountyReward(week,i,paid||material,claimed?stored>=100:state.perks.lucky>0);
 return {week,index:i,type,title,target,progress:Math.min(progress,target),done:progress>=target,claimed,reward};
}
export function bountiesFor(state,week){const used=new Set();return [0,1,2].map(i=>bountyFor(state,week,i,used));}

// ---- achievements ----
// reward: embers; mats: materials too. secret: shown as ??? until earned.
export const ACHIEVEMENTS=[
 {id:'first',name:'First spark',desc:'Craft your first goal.',icon:'spark',reward:20,test:s=>s.totals.all>=1},
 {id:'fullday',name:'Full day',desc:'Craft every daily goal in one day.',icon:'sun',reward:30,mats:{amber:2},test:s=>s.fullDays>=1},
 {id:'c50',name:'Apprentice',desc:'Craft 50 goals.',icon:'hammer',reward:60,mats:{iron:3},test:s=>s.totals.all>=50},
 {id:'full10',name:'Steady hands',desc:'Have ten full days.',icon:'sun',reward:120,mats:{scale:1},test:s=>s.fullDays>=10},
 {id:'c250',name:'Journeyman',desc:'Craft 250 goals.',icon:'hammer',reward:150,mats:{scale:1},test:s=>s.totals.all>=250},
 {id:'c1000',name:'Master smith',desc:'Craft 1,000 goals.',icon:'anvil',reward:500,mats:{core:2},test:s=>s.totals.all>=1000},
 {id:'s7',name:'Flame',desc:'Reach a 7-day streak.',icon:'flame',reward:50,test:s=>s.bestRun>=7},
 {id:'s30',name:'Inferno',desc:'Reach a 30-day streak.',icon:'flame',reward:200,mats:{starmetal:1},test:s=>s.bestRun>=30},
 {id:'s100',name:'Dragonheart',desc:'Reach a 100-day streak.',icon:'flame',reward:800,mats:{core:2},test:s=>s.bestRun>=100},
 {id:'blazing',name:'Blazing',desc:'Get the forge to Blazing.',icon:'flame',reward:60,test:s=>s.temp>=.45},
 {id:'dragonfire',name:'Dragonfire',desc:'Get the forge to Dragonfire.',icon:'flame',reward:150,mats:{core:1},test:s=>s.temp>=1},
 {id:'week',name:'Perfect week',desc:'Craft every daily goal, Monday to Sunday.',icon:'calendar',reward:150,test:s=>s.perfectWeeks>=1},
 {id:'r1',name:'Relic hunter',desc:'Forge your first relic.',icon:'relic',reward:40,test:s=>s.relics.length>=1},
 {id:'r10',name:'Curator',desc:'Forge 10 relics.',icon:'relic',reward:200,mats:{starmetal:1},test:s=>s.relics.length>=10},
 {id:'epic',name:'Epic find',desc:'Forge an epic relic.',icon:'relic',reward:120,test:s=>s.relics.some(r=>['epic','legendary'].includes(r.rarity))},
 {id:'legend',name:'The stuff of legend',desc:'Forge a legendary relic.',icon:'crown',reward:400,test:s=>s.relics.some(r=>r.rarity==='legendary')},
 {id:'iron30',name:'Iron will',desc:'Craft 30 Movement goals.',icon:'ore',reward:80,mats:{iron:5},test:s=>(s.totals.Movement||0)>=30},
 {id:'herb50',name:'Green thumb',desc:'Craft 50 Health goals.',icon:'herb',reward:80,mats:{herb:5},test:s=>(s.totals.Health||0)>=50},
 {id:'mind25',name:'Scholar',desc:'Craft 25 Learning goals.',icon:'gem',reward:80,mats:{moonstone:4},test:s=>(s.totals.Learning||0)>=25},
 {id:'muse25',name:'Muse',desc:'Craft 25 Creative goals.',icon:'drop',reward:80,mats:{dye:4},test:s=>(s.totals.Creative||0)>=25},
 {id:'perfect',name:'Ring true',desc:'Land a perfect Anvil Strike run.',icon:'anvil',reward:60,test:s=>s.anvilPerfectRuns>=1},
 {id:'anvil10',name:'Hammer time',desc:'Play 10 rewarded Anvil Strike runs.',icon:'hammer',reward:100,mats:{iron:4},test:s=>s.anvilRuns>=10},
 {id:'catch',name:'Butterfingers no more',desc:'Score 60 in Ember Catch.',icon:'spark',reward:80,mats:{amber:3},test:s=>s.catchBest>=60},
 {id:'wing30',name:'Sky dancer',desc:'Score 30 in Wingbeat.',icon:'wing',reward:60,mats:{silk:2},test:s=>s.wingBest>=30},
 {id:'wing100',name:'Storm rider',desc:'Score 100 in Wingbeat.',icon:'wing',reward:200,mats:{starmetal:1},test:s=>s.wingBest>=100},
 {id:'b1',name:'Bounty hunter',desc:'Claim a bounty.',icon:'scroll',reward:40,test:s=>s.bountiesClaimed>=1},
 {id:'b10',name:'Wanted',desc:'Claim 10 bounties.',icon:'scroll',reward:200,mats:{core:1},test:s=>s.bountiesClaimed>=10},
 {id:'isle3',name:'Islander',desc:'Fly to 3 islands.',icon:'map',reward:80,test:s=>s.isle>=3},
 {id:'isleall',name:'Edge of the map',desc:'Reach Dawnspire.',icon:'map',reward:500,test:s=>s.isle>=10},
 {id:'reaches',name:'The Crown of Bestia',desc:'Fly to the highest island in the Far Reaches.',icon:'crown',reward:900,mats:{core:3},secret:true,test:s=>s.isle>=ISLES.length-1},
 {id:'fledgling',name:'First flight',desc:'Raise your dragon to Fledgling.',icon:'wing',reward:60,mats:{herb:3},test:s=>s.dragon.stage>=1},
 {id:'juvenile',name:'Growing fast',desc:'Raise your dragon to Juvenile.',icon:'wing',reward:120,mats:{scale:1},test:s=>s.dragon.stage>=2},
 {id:'adult',name:'Grown',desc:'Raise your dragon to Adult.',icon:'wing',reward:250,mats:{scale:2},test:s=>s.dragon.stage>=3},
 {id:'elder',name:'Elder bond',desc:'Raise your dragon to Elder.',icon:'crown',reward:600,mats:{core:2},test:s=>s.dragon.stage>=4},
 {id:'pet25',name:'Gentle hands',desc:'Pet your dragon 25 times.',icon:'heart',reward:40,mats:{herb:2},test:s=>s.petTotal>=25},
 {id:'fed20',name:'Well fed',desc:'Feed 20 treats.',icon:'fish',reward:60,mats:{amber:2},test:s=>s.fedTotal>=20},
 {id:'crafter',name:'Tinkerer',desc:'Craft 10 items.',icon:'hammer',reward:80,test:s=>s.itemsCrafted>=10},
 {id:'tools5',name:'Well equipped',desc:'Own five tools.',icon:'hammer',reward:150,mats:{core:1},test:s=>ITEMS.filter(x=>x.kind==='tool'&&s.inventory[x.id]).length>=5},
 {id:'themes3',name:'A forge of many colors',desc:'Own three themes.',icon:'theme',reward:150,test:s=>ITEMS.filter(x=>x.kind==='theme'&&s.inventory[x.id]).length>=3},
 {id:'dressed',name:'Dressed to fly',desc:'Fill four gear slots.',icon:'saddle',reward:100,test:s=>Object.values(s.equip).filter(Boolean).length>=4},
 {id:'scraps50',name:'Scavenger',desc:'Collect 50 scraps from free play.',icon:'chest',reward:80,test:s=>s.scrapTotal>=50},
 {id:'hoard',name:'Dragon’s hoard',desc:'Hold 500 embers at once.',icon:'chest',reward:50,mats:{amber:3},secret:true,test:s=>s.wallet.embers>=500},
 {id:'owl',name:'Night owl',desc:'Pet your dragon after midnight.',icon:'moon',reward:30,mats:{moonstone:2},secret:true,test:s=>s.nightPet},
 ...SETS.map(x=>({id:`set${x.id}`,name:`${x.name} complete`,desc:`Find all ${x.size} ${x.name} relics. Bonus: ${x.bonus}`,icon:'relic',reward:x.reward,mats:x.mats,set:x.id,test:s=>s.sets.some(y=>y.id===x.id&&y.done)}))
];

// ---- the whole state ----
export const TIER_BONUS=[0,.1,.2,.35,.5];
export const tierIndex=temp=>TIERS.filter(t=>temp>=t.min).length-1;
export function gameState(records,today=dayKey(),{hour=12}={}){
 const season=num(records,'season'),epoch=season&&has(records,'epoch')?fromDayNumber(num(records,'epoch')):null,ns=nsOf(records);
 const forge=forgeStats(records,today,{since:epoch}),ledger=forge.ledger,goals=goalsOf(records).map(g=>goalForDate(forge.byGoal[g.id]||records,g.id,today,today)||g).filter(g=>!g.metric);
 const s={records,today,season,epoch,ns,forge,ledger,goals,dayTotals:forge.dayTotals,temp:forge.temp,matFor:c=>materialFor(c,records)};
 const add=(o,k,n)=>{if(n)o[k]=(o[k]||0)+n;};
 // Totals and dragon stats come straight from the ledger.
 const totals={all:0};for(const e of ledger){if(e.kind==='target')continue;totals.all++;totals[e.category]=(totals[e.category]||0)+1;}
 s.totals=totals;
 const stats={strength:totals.Movement||0,vitality:totals.Health||0,wisdom:totals.Learning||0,spirit:(totals.Creative||0)+(totals.Hobbies||0)+(totals.Personal||0)};
 // This season's choices, read in one pass.
 const tally={},T=k=>tally[k]||0,day={};s.tally=tally;const at=(d,k)=>day[d]?.[k]||0;
 const rewards=[];let anvilRuns=0,anvilPerfectRuns=0,catchBest=0,wingBest=0,fedTotal=0,petTotal=0,bountiesClaimed=0,scrapTotal=0,nightPet=false;
 for(const [k,r]of Object.entries(records)){
  if(!k.startsWith('metric:game:')||!Number.isInteger(r.value))continue;let rest=k.slice(12);
  if(ns){if(!rest.startsWith(ns))continue;rest=rest.slice(ns.length);}else if(/^s\d+:/.test(rest))continue;
  const parts=rest.split(':'),[kind,a,b,c]=parts;
  if(COUNTERS.has(kind)&&a){const t=`${kind}:${a}`;tally[t]=(tally[t]||0)+r.value;}
  else if(kind==='scrap'&&a&&b){const d=fromDayNumber(Number(a));(day[d]||={});day[d][`scrap:${b}`]=(day[d][`scrap:${b}`]||0)+r.value;}
  else if(['anvil','anvilstar','anviliron','anvilperfect','catch','catchbest','catchmat','wing','wingbest','fed','pet'].includes(kind)&&a){(day[a]||={})[kind]=r.value;}
  else if(kind==='wingm'&&a&&b){(day[a]||={})[`wingm:${b}`]=r.value;}
  else if(kind==='ate'&&a&&b){if(r.value)(day[a]||={})[`ate:${b}`]=1;}
  else if(kind==='bounty'&&a)rewards.push([a,Number(b),r.value]);
 }
 // Days in a row with every daily goal done, perfect weeks, and flight energy.
 let energy=0,fullRun=0,bestFullRun=0,fullDays=0;const full=new Set();
 for(const [d,t]of Object.entries(forge.dayTotals).sort()){if(!t.planned)continue;const ratio=t.done/t.planned;energy+=ratio>=1?2:ratio>=.5?1:0;if(ratio>=1){full.add(d);fullDays++;fullRun++;bestFullRun=Math.max(bestFullRun,fullRun);}else if(d<today)fullRun=0;}
 let perfectWeeks=0;const firstDay=Object.keys(forge.dayTotals).sort()[0];
 if(firstDay)for(let w=weekKey(firstDay);addDays(w,6)<today;w=addDays(w,7)){const days=weekDays(w);if(days[0]>=firstDay&&days.every(d=>!forge.dayTotals[d]?.planned||full.has(d))&&days.some(d=>forge.dayTotals[d]?.planned))perfectWeeks++;}
 Object.assign(s,{bestFullRun,fullDays,perfectWeeks,fullToday:full.has(today)});
 // Inventory and tools come first: tools change what other things pay.
 const inventory={};let itemsCrafted=0;
 for(const it of ITEMS){if(consumable(it)){const made=T(`made:${it.id}`),used=T(`used:${it.id}`);inventory[it.id]=Math.max(0,made-used);itemsCrafted+=made;}else{inventory[it.id]=has(records,`got:${it.id}`)?1:0;itemsCrafted+=inventory[it.id];}}
 s.inventory=inventory;s.itemsCrafted=itemsCrafted;
 // Earned. Heat becomes embers, paid more when the forge is hot (its tier that day) and when the dragon was well-fed.
 // Tools pay from the day they were made, never retroactively.
 const madeOn=id=>inventory[id]?fromDayNumber(num(records,`got:${id}`)):null,hodFrom=madeOn('hod'),tongsFrom=madeOn('tongs');
 const earned={};const heatDays=Object.keys(forge.heat).sort();let win=0,winPossible=0;
 for(let i=0;i<heatDays.length;i++){const d=heatDays[i];win+=forge.heat[d];winPossible+=(forge.dayTotals[d]?.planned||0)*FORGE.reference;if(i>=7){const o=heatDays[i-7];win-=forge.heat[o];winPossible-=(forge.dayTotals[o]?.planned||0)*FORGE.reference;}
  const temp=winPossible?Math.min(1.25,win/winPossible):0,fed=at(d,'fed')>0;
  const fedBonus=fed?(at(d,'ate:honeycomb')?.25:.1)*(hodFrom!==null&&d>=hodFrom?2:1):0,blaze=at(d,'ate:custard')?.5:0;
  add(earned,'embers',forge.heat[d]*(1+TIER_BONUS[tierIndex(temp)]+fedBonus+blaze));}
 earned.embers=Math.round(earned.embers||0);
 // Every craft drops its category's material, more on long streaks. Full days and perfect weeks pay extra.
 let learned=0;for(const e of ledger){const mat=s.matFor(e.category);if(e.kind==='target'){add(earned,mat,1);add(earned,'amber',1);continue;}add(earned,mat,e.kind==='once'?3:e.run>=30?3:e.run>=10?2:1);if(e.kind==='once')add(earned,'amber',1);if(e.category==='Learning')learned++;
  if(hash(`wis:${e.date}:${e.id}`)<Math.min(.15,learned*.002))add(earned,mat,1);}
 for(const d of full){add(earned,'embers',10);const cats=ledger.filter(e=>e.date===d&&e.kind==='day').map(e=>e.category);if(cats.length)add(earned,s.matFor(cats[Math.floor(hash(`full:${d}`)*cats.length)]),1);}
 add(earned,'embers',perfectWeeks*60);add(earned,'scale',perfectWeeks);add(earned,'starmetal',perfectWeeks);
 // Streak milestones use each goal's best daily run from the ledger, which keeps archived goals, so archiving never takes rewards back.
 const bestRun={};for(const e of ledger)if(e.kind==='day')bestRun[e.id]=Math.max(bestRun[e.id]||0,e.run);
 s.bestRun=Math.max(0,...Object.values(bestRun));
 for(const best of Object.values(bestRun))for(const m of STREAK_MILESTONES)if(best>=m.days){if(m.days>=7)add(earned,'scale',m.days>=100?3:m.days>=30?2:1);add(earned,'embers',m.days*3);}
 // Stored rewards: games, scraps, bounties.
 const scrapToday={embers:0,mats:0};
 for(const [d,v]of Object.entries(day)){
  if(Number.isInteger(v.anvil)){add(earned,'embers',v.anvil);anvilRuns++;}
  add(earned,'starmetal',v.anvilstar||0);add(earned,'iron',v.anviliron||0);if((v.anvilperfect||0)>=3)anvilPerfectRuns++;
  if(v.catch)add(earned,'embers',Math.max(0,v.catch-1));catchBest=Math.max(catchBest,v.catchbest||0);add(earned,'amber',v.catchmat||0);
  if(v.wing)add(earned,'embers',Math.max(0,v.wing-1));wingBest=Math.max(wingBest,v.wingbest||0);
  fedTotal+=v.fed||0;petTotal+=v.pet||0;
  for(const [kk,n]of Object.entries(v)){
   if(kk.startsWith('wingm:')&&MATERIALS[kk.slice(6)])add(earned,kk.slice(6),n);
   else if(kk.startsWith('scrap:')){const m=kk.slice(6);if(m==='e'){add(earned,'embers',n);if(d===today)scrapToday.embers+=n;}else if(COMMON.includes(m)){add(earned,m,n);scrapTotal+=n;if(d===today)scrapToday.mats+=n;}}
  }
 }
 for(const [w,i,v]of rewards){bountiesClaimed++;const code=v%100;for(const [m,n]of Object.entries(bountyReward(w,i,code>1&&MAT_KEYS[code-2]||'amber',v>=100)))add(earned,m,n);}
 const isle=Math.min(ISLES.length-1,num(records,'isle'));for(let i=1;i<=isle;i++){const glass=has(records,`islebonus:${i}`);for(const [m,n]of Object.entries(ISLES[i].reward||{}))add(earned,m,glass?Math.ceil(n*1.25):n);}
 Object.assign(s,{anvilRuns,anvilPerfectRuns,catchBest,wingBest,bountiesClaimed,isle,fedTotal,petTotal,scrapTotal});
 s.scrapCap={embers:inventory.satchel?45:30,mats:inventory.satchel?5:3};s.scrapToday=scrapToday;
 // Relics.
 const rolled=rollRelics(forge.forged);
 s.relics=rolled.filter(r=>r.relic).map(r=>({...r.relic,date:r.date,index:r.index}));
 for(const r of rolled)if(r.duplicate)add(earned,'embers',100);
 if(tongsFrom)add(earned,'starmetal',rolled.filter(r=>r.date>=tongsFrom).length);
 const ownedRelic=new Set(s.relics.map(r=>r.id));
 s.sets=SETS.map(x=>{const have=RELICS.filter(r=>r.set===x.name&&ownedRelic.has(r.id)).length;return {...x,have,done:have>=x.size};});
 const setPerk=p=>s.sets.filter(x=>x.done&&x.perk===p).reduce((n,x)=>n+x.n,0);
 // Equipped gear. A slot holds an item code (1000+) or a relic code (1-40).
 const byCode=Object.fromEntries([...ITEMS.map(x=>[x.code,{...x,type:'item'}]),...RELICS.map(r=>[r.code,{...r,type:'relic'}])]);
 const equip={};for(const sl of SLOTS){const c=num(records,`equip:${sl.key}`);const thing=byCode[c];equip[sl.key]=thing&&thing.slot===sl.key&&(thing.type==='item'?inventory[thing.id]:ownedRelic.has(thing.id))?thing:null;}
 s.equip=equip;s.byCode=byCode;
 const worn=Object.values(equip).filter(Boolean),perkCount=p=>worn.filter(x=>x.perk===p).length;
 s.perks={thrift:Math.min(3,perkCount('thrift')+setPerk('thrift')),swift:Math.min(3,perkCount('swift')+2*perkCount('swift2')+setPerk('swift')),frugal:Math.min(1,perkCount('frugal')),hot:s.relics.filter(r=>r.perk==='hot').length+(inventory.hammer?2:0)+perkCount('hot')+setPerk('hot'),snack:Math.min(2,perkCount('snack')+setPerk('snack')),pack:Math.min(1,perkCount('pack')),lucky:Math.min(1,perkCount('lucky')+setPerk('lucky')),warm:Math.min(3,perkCount('warm')+setPerk('warm')),bond:setPerk('bond')};
 s.tags=new Set(worn.flatMap(x=>x.tags||(x.tag?[x.tag]:[])));
 // The dragon starts as a baby the day you adopt them (or the day the season began): bond counts from then.
 const named=Boolean(readName(records));let born=has(records,'born')?fromDayNumber(num(records,'born')):today;if(epoch&&epoch>born)born=epoch;
 const activeDays=new Set(ledger.filter(e=>e.date>=born).map(e=>e.date)).size,bornHeat=Object.entries(forge.heat).reduce((n,[d,h])=>d>=born?n+h:n,0),fullSince=[...full].filter(d=>d>=born).length;
 const treatBond=ITEMS.filter(x=>x.kind==='treat').reduce((n,x)=>n+T(`used:${x.id}`)*x.bond,0);
 let petBond=0;for(const [d,v]of Object.entries(day))if(v.pet)petBond+=Math.min(8,v.pet)*(v['ate:jam']?4:2);
 const goalBond=bornHeat+activeDays*5+fullSince*10;
 const spiritBoost=(1+Math.min(.25,stats.spirit*.005))*(1+s.perks.bond*.1),xp=named?Math.round((goalBond+treatBond+petBond)*spiritBoost):0;
 const stage=STAGES.reduce((st,x,i)=>xp>=x.xp?i:st,0),next=STAGES[stage+1];
 const todayPlanned=forge.dayTotals[today]?.planned||0,todayDone=forge.dayTotals[today]?.done||0,ratio=todayPlanned?todayDone/todayPlanned:0;
 const lastActive=ledger.length?ledger.at(-1).date:null,away=lastActive?Math.round((dateOf(today)-dateOf(lastActive))/864e5):99;
 const fedToday=at(today,'fed'),petsToday=at(today,'pet'),lastPet=has(records,'petat')?num(records,'petat'):null;
 nightPet=has(records,'owl');
 let mood='content';if(away>=3&&!todayDone)mood='lonely';else if(!todayDone)mood=hour<11?'sleepy':'restless';else if(ratio>=1)mood=forge.temp>=.75?'fiery':'delighted';else if(ratio>=.5)mood=forge.temp>=.75?'fiery':'happy';
 const name=readName(records)||'Your dragon',color=DRAGON_COLORS[Math.min(DRAGON_COLORS.length-1,Math.max(0,num(records,'color')))];
 const ateToday=ITEMS.filter(x=>x.kind==='treat'&&at(today,`ate:${x.id}`)).map(x=>x.id);
 s.dragon={named,name,color,colorIndex:DRAGON_COLORS.indexOf(color),stage,stageName:STAGES[stage].name,xp,xpFrom:STAGES[stage].xp,xpTo:next?.xp||null,progress:next?(xp-STAGES[stage].xp)/(next.xp-STAGES[stage].xp):1,stats,mood,fedToday,feedLimit:2+s.perks.snack,ateToday,petsToday,lastPet,away,born:has(records,'born')?born:null,renames:num(records,'renames'),bond:{goals:goalBond,treats:treatBond,pets:petBond},quirk:(()=>{const pool=QUIRKS.filter(([st])=>st<=stage&&st>=stage-1).map(([,t])=>t);return `${name} ${pool[Math.floor(hash(`quirk:${today}:${name}`)*pool.length)]}`;})()};
 s.nightPet=nightPet;
 s.unlocked=new Set(UNLOCKS.filter(u=>stage>=u.stage).map(u=>u.key));
 // Achievements: stored the first time they're met so they stay earned; rewards count once stored.
 s.equipCount=worn.length;
 s.wallet={embers:0};
 s.achievements=ACHIEVEMENTS.map(a=>{const got=has(records,`ach:${a.id}`);return {...a,got,date:got?fromDayNumber(num(records,`ach:${a.id}`)):null,ready:false};});
 for(const a of s.achievements)if(a.got){add(earned,'embers',a.reward);for(const [m,n]of Object.entries(a.mats||{}))add(earned,m,n);}
 // Flight energy (kelp rolls add one each).
 const kelpDays=Object.values(day).filter(v=>v['ate:kelp']).length;
 s.energy={earned:energy+kelpDays,spent:T('spent:energy'),available:Math.max(0,energy+kelpDays-T('spent:energy'))};
 // Wallet.
 const wallet={};for(const k of ['embers',...Object.keys(MATERIALS)])wallet[k]=Math.max(0,(earned[k]||0)-T(`spent:${k}`));
 s.earned=earned;s.wallet=wallet;
 for(const a of s.achievements)if(!a.got)a.ready=safeTest(a,s);
 s.bounties=s.unlocked.has('bounties')?bountiesFor(s,weekKey(today)):[];
 s.lastWeekBounties=bountiesFor(s,addDays(weekKey(today),-7)).filter(b=>b.done&&!b.claimed);
 s.theme=num(records,'theme');
 s.anvilToday={played:(day[today]?.anvil||0)>0,earned:at(today,'anvil'),eligible:todayPlanned>0&&todayDone*2>=todayPlanned};
 s.catchToday={played:Boolean(day[today]?.catch),eligible:todayDone>=1};
 s.wingToday={played:Boolean(day[today]?.wing),eligible:todayPlanned>0&&todayDone>=todayPlanned};
 s.gameBonus=1+(inventory.bellows?.2:0)+s.perks.warm*.15;
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
 const view=recipeView(state,it);if(view==='hidden')throw new Error('That recipe hasn’t been found yet.');
 if(view!=='open')throw new Error(`Unlocks when your dragon reaches ${STAGES[it.stage].name}.`);
 if(!consumable(it)&&state.inventory[itemId])throw new Error('You already have this.');
 const cost=costFor(state,itemId);if(!canAfford(state,cost))throw new Error('Not enough materials yet.');
 return {...spend(state,cost),...(consumable(it)?bump(state,`made:${itemId}`,1):{[gk(state,`got:${itemId}`)]:dayNumber(state.today)})};
}
export function feedChanges(state,itemId){
 const it=ITEM[itemId];if(!it||it.kind!=='treat')throw new Error('That isn’t a treat.');
 if(!state.inventory[itemId])throw new Error('Craft one first.');
 if(state.dragon.fedToday>=state.dragon.feedLimit)throw new Error(`${state.dragon.name} is full for today.`);
 if(state.dragon.ateToday.includes(itemId))throw new Error(`${state.dragon.name} already had one of those today. Try a different treat.`);
 return {...bump(state,'used:'+itemId,1),[gk(state,`fed:${state.today}`)]:state.dragon.fedToday+1,[gk(state,`ate:${state.today}:${itemId}`)]:1};
}
export const petReadyIn=(state,now=minuteNow())=>state.dragon.lastPet===null?0:Math.max(0,state.dragon.lastPet+PET_COOLDOWN-now);
export function petChanges(state,now=minuteNow(),hour=new Date().getHours()){
 const wait=petReadyIn(state,now);if(wait>0)throw new Error(`${state.dragon.name} is still happy from the last pet. Try again in ${wait>=60?`${Math.ceil(wait/60)} hour${wait>60?'s':''}`:`${wait} min`}.`);
 const out={[gk(state,'petat')]:now,[gk(state,`pet:${state.today}`)]:Math.min(99,state.dragon.petsToday+1)};if(hour<4)out[gk(state,'owl')]=1;return out;
}
export function adoptChanges(state,name,colorIndex){
 const changes=nameChanges(name,state.records);if(!cleanName(name))throw new Error('Give your dragon a name.');
 changes[gk(state,'color')]=Math.max(0,Math.min(DRAGON_COLORS.length-1,colorIndex|0));if(!state.dragon.born)changes[gk(state,'born')]=dayNumber(state.today);return changes;
}
// The first new name within a week of adopting is free; after that a Naming scroll is used.
export const freeRename=state=>!state.dragon.renames&&(!state.dragon.born||dayNumber(state.today)-dayNumber(state.dragon.born)<=7);
export function renameChanges(state,name){
 if(!cleanName(name))throw new Error('Give your dragon a name.');if(cleanName(name)===state.dragon.name)throw new Error('That’s already their name.');
 const free=freeRename(state);if(!free&&!state.inventory.scroll)throw new Error('Craft a Naming scroll in the workshop first.');
 return {...nameChanges(name,state.records),[gk(state,'renames')]:state.dragon.renames+1,...(free?{}:bump(state,'used:scroll',1))};
}
export function recolorChanges(state,colorIndex){
 const i=colorIndex|0;if(i<0||i>=DRAGON_COLORS.length)throw new Error('Unknown color.');if(i===state.dragon.colorIndex)throw new Error('They’re already that color.');
 if(!state.inventory.scaledye)throw new Error('Craft Scale dye in the workshop first.');
 return {[gk(state,'color')]:i,...bump(state,'used:scaledye',1)};
}
export function equipChanges(state,slot,code){
 const sl=SLOTS.find(x=>x.key===slot);if(!sl)throw new Error('Unknown slot.');
 if(state.dragon.stage<sl.stage)throw new Error(`The ${sl.label.toLowerCase()} slot opens at ${STAGES[sl.stage].name}.`);
 if(!code)return {[gk(state,`equip:${slot}`)]:0};
 const thing=state.byCode[code];if(!thing||thing.slot!==slot)throw new Error('That doesn’t fit there.');
 const owned=thing.type==='item'?state.inventory[thing.id]:state.relics.some(r=>r.id===thing.id);if(!owned)throw new Error('You don’t own that yet.');
 return {[gk(state,`equip:${slot}`)]:code};
}
export function claimBountyChanges(state,bounty){
 if(!bounty.done)throw new Error('Not finished yet.');if(bounty.claimed)throw new Error('Already claimed.');
 const mat=Object.keys(bounty.reward).find(k=>MATERIALS[k]&&k!=='core')||'amber';
 return {[gk(state,`bounty:${bounty.week}:${bounty.index}`)]:2+MAT_KEYS.indexOf(mat)+(state.perks.lucky?100:0)};
}
export function flightPlan(state){
 const next=ISLES[state.isle+1];if(!next)return null;
 const cost=Math.max(1,next.cost-state.perks.swift),rations=next.cost>=6&&!state.perks.pack?1:0,missing=next.needs&&!state.tags.has(next.needs)?next.needs:null;
 const reward=Object.fromEntries(Object.entries(next.reward).map(([k,n])=>[k,state.inventory.spyglass?Math.ceil(n*1.25):n]));
 return {to:next,index:state.isle+1,cost,rations,missing,reward,ok:!missing&&state.energy.available>=cost&&(state.inventory.rations||0)>=rations&&state.unlocked.has('isles')};
}
export function flyChanges(state){
 const p=flightPlan(state);if(!p)throw new Error('You’ve reached the edge of the map.');
 if(!state.unlocked.has('isles'))throw new Error('Flights unlock when your dragon is a Fledgling.');
 if(p.missing)throw new Error({storm:'You need storm gear equipped to cross.',frost:'You need frost gear equipped to cross.',light:'You need a light equipped to find the way.'}[p.missing]);
 if(state.energy.available<p.cost)throw new Error('Not enough flight energy. Finish more full days.');
 if((state.inventory.rations||0)<p.rations)throw new Error('This is a long flight. Pack flight rations.');
 const out={[gk(state,'isle')]:p.index,...bump(state,'spent:energy',p.cost)};if(state.inventory.spyglass)out[gk(state,`islebonus:${p.index}`)]=1;if(p.rations)Object.assign(out,bump(state,'used:rations',1));return out;
}
export function anvilZone(state){return Math.min(.42,.16+state.dragon.stats.strength*.001+state.perks.hot*.02);}
export const extraLife=state=>state.dragon.ateToday.includes('plum')?1:0;
export function anvilRewardChanges(state,{score,perfects}){
 if(state.anvilToday.played)throw new Error('Today’s rewarded run is done. Practice is free.');
 if(!state.anvilToday.eligible)throw new Error('Craft half of today’s goals to earn a rewarded run.');
 const embers=Math.max(1,Math.round(Math.max(0,Math.min(150,score))/2*state.gameBonus*(state.dragon.ateToday.includes('jerky')?1.25:1)));
 return {[gk(state,`anvil:${state.today}`)]:embers,[gk(state,`anvilperfect:${state.today}`)]:Math.max(0,Math.min(6,perfects|0)),[gk(state,`anvilstar:${state.today}`)]:perfects>=3?1:0,[gk(state,`anviliron:${state.today}`)]:score>=100?2:0};
}
export function catchRewardChanges(state,score){
 if(state.catchToday.played)throw new Error('Today’s rewarded run is done. Practice is free.');
 if(!state.catchToday.eligible)throw new Error('Craft a goal today to earn a rewarded run.');
 const s=Math.max(0,Math.min(500,score|0)),embers=Math.round(Math.min(60,s/4)*state.gameBonus);
 return {[gk(state,`catch:${state.today}`)]:embers+1,[gk(state,`catchbest:${state.today}`)]:s,[gk(state,`catchmat:${state.today}`)]:Math.min(3,Math.floor(s/40))};
}
// Wingbeat's rewarded run needs every daily goal done: the hardest gate, so it pays the most materials.
export function wingRewardChanges(state,{score,mats={},level=1}){
 if(!state.unlocked.has('wingbeat'))throw new Error('Wingbeat opens when your dragon is a Fledgling.');
 if(state.wingToday.played)throw new Error('Today’s rewarded run is done. Free play still drops scraps.');
 if(!state.wingToday.eligible)throw new Error('Craft every daily goal today to earn a rewarded run.');
 const s=Math.max(0,Math.min(999,score|0)),pay=WING_LEVELS[wingLevel(state,level)].pay,out={[gk(state,`wing:${state.today}`)]:Math.round(Math.min(80*pay,s*2*pay)*state.gameBonus)+1,[gk(state,`wingbest:${state.today}`)]:Math.max(s,num(state.records,`wingbest:${state.today}`))};
 let total=0;for(const m of COMMON){const n=Math.max(0,Math.min(8-total,(mats[m]|0)*2));if(n){out[gk(state,`wingm:${state.today}:${m}`)]=n;total+=n;}}
 if(s>=40)out[gk(state,`wingm:${state.today}:scale`)]=1;
 return out;
}
// Free play pays scraps: a few embers and common materials, capped each day so goals stay the main income.
export function scrapChanges(state,{embers=0,mats={},best=null,game=null}={}){
 const out={},dn=dayNumber(state.today);let room=Math.max(0,state.scrapCap.embers-state.scrapToday.embers);
 const e=Math.max(0,Math.min(room,embers|0));if(e)out[gk(state,`scrap:${dn}:e:${DEVICE}`)]=num(state.records,`scrap:${dn}:e:${DEVICE}`)+e;
 room=Math.max(0,state.scrapCap.mats-state.scrapToday.mats);
 for(const m of COMMON){const n=Math.max(0,Math.min(room,mats[m]|0));if(n){out[gk(state,`scrap:${dn}:${m}:${DEVICE}`)]=num(state.records,`scrap:${dn}:${m}:${DEVICE}`)+n;room-=n;}}
 if(game==='wing'&&best!==null&&best>num(state.records,`wingbest:${state.today}`))out[gk(state,`wingbest:${state.today}`)]=Math.min(999,best|0);
 if(game==='catch'&&best!==null&&best>num(state.records,`catchbest:${state.today}`))out[gk(state,`catchbest:${state.today}`)]=Math.min(999,best|0);
 return out;
}
export function themeChanges(state,theme){
 if(theme&&!ITEMS.some(x=>x.kind==='theme'&&x.theme===theme&&state.inventory[x.id]))throw new Error('Craft that theme first.');
 return {[gk(state,'theme')]:theme|0};
}
export function achievementChanges(state){
 const out={};for(const a of state.achievements)if(a.ready)out[gk(state,`ach:${a.id}`)]=dayNumber(state.today);return out;
}
// A fresh game season from a given day: keeps the dragon (name, color), goals and their history.
export function seasonChanges(state,day=state.today){return {[gk(state,'season')]:(state.season||0)+1,[gk(state,'epoch')]:dayNumber(day)};}
