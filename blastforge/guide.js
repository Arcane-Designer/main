// "How it works": a short field guide to the forge, built from the live rules so the numbers never drift.
import {STAGES,MATERIALS,CATEGORY_MATERIAL,SOURCES,RARITIES,PET_COOLDOWN,ITEMS,TIER_BONUS,SETS,UNLOCKS} from './game.js?v=16';
import {MULT_STEPS,TIERS,relicThreshold} from './core.js?v=16';
import {art} from './art.js?v=16';
import {ART_FILES} from './art-files.js?v=16';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const has=(kind,id)=>(ART_FILES[kind]||[]).includes(id);
const pic=(kind,id,icon)=>has(kind,id)?`<img src="./assets/${kind}/${id}.webp" alt="" loading="lazy" draggable="false">`:art(icon);
const mat=k=>`<span class="gd-mat" title="${esc(MATERIALS[k]?.name||k)}">${pic('materials',k,MATERIALS[k]?.icon||'embers')}<b>${esc(MATERIALS[k]?.name||k)}</b></span>`;
const num=n=>n.toLocaleString('en-US');

function card(id,icon,title,line,body,open=false){
 return `<details class="gd-card" data-key="guide-${id}" ${open?'open':''}><summary><span class="gd-ico">${icon}</span><span class="gd-sum"><strong>${title}</strong><small>${line}</small></span><span class="gd-chev">${art('chevron')}</span></summary><div class="gd-body">${body}</div></details>`;
}
const list=items=>`<ul class="gd-list">${items.map(x=>`<li>${x}</li>`).join('')}</ul>`;

export function guideHTML(){
 const mults=MULT_STEPS.map(([d,m])=>`<span class="gd-pill"><b>×${m}</b>${d===1?'day 1':`day ${d}`}</span>`).join('');
 const tiers=TIERS.map((t,i)=>`<span class="gd-pill"><b>${esc(t.name)}</b>${TIER_BONUS[i]?`+${Math.round(TIER_BONUS[i]*100)}%`:'base'}</span>`).join('');
 const stages=STAGES.map(s=>`<span class="gd-pill"><b>${esc(s.name)}</b>${num(s.xp)}</span>`).join('');
 const rar=Object.values(RARITIES).map(r=>`<span class="gd-pill" style="--r:${r.color}"><b style="color:var(--r)">${r.label}</b>${r.weight}%</span>`).join('');
 const common=Object.entries(CATEGORY_MATERIAL).map(([cat,k])=>`<div class="gd-row">${mat(k)}<small>${esc(cat)} goals</small></div>`).join('');
 const rare=['scale','starmetal','core'].map(k=>`<div class="gd-row">${mat(k)}<small>${esc(SOURCES[k])}</small></div>`).join('');
 const treats=ITEMS.filter(x=>x.kind==='treat').length;
 const unlockAt=key=>STAGES[UNLOCKS.find(u=>u.key===key)?.stage||0].name;

 const flow=`<div class="gd-flow" aria-label="Goals make heat, and heat makes embers, materials, bond and relics">
  <div class="gf-node"><span class="gf-ico">${pic('icons','goals','flag')}</span><b>Finish a goal</b></div>
  <span class="gf-arrow" aria-hidden="true"></span>
  <div class="gf-node hot"><span class="gf-ico">${art('flame')}</span><b>Heat</b><small>streaks multiply it</small></div>
  <span class="gf-arrow" aria-hidden="true"></span>
  <div class="gf-outs">
   <span>${pic('materials','embers','embers')}<b>Embers</b></span>
   <span>${pic('materials','iron','ore')}<b>Materials</b></span>
   <span>${pic('icons','dragon','dragon')}<b>Bond</b></span>
   <span>${pic('icons','vault','relic')}<b>Relics</b></span>
  </div></div>`;

 return `<div class="guide">
 ${flow}
 <p class="gd-lede">Everything in the forge comes from your goals. Tap a card for details.</p>
 <button type="button" class="quiet gd-tour" data-tour>${art('play')} Take the tour</button>
 ${card('heat',`<span class="gd-flame">${art('flame')}</span>`,'Heat','Every goal you check off heats the forge.',
  `${list(['Daily goals earn more heat each day in a row:',`<span class="gd-pills">${mults}</span>`,'Weekly goals add 1 heat. One-time goals add 5.','Rest days and unscheduled days never break a streak.'])}
  <p class="gd-note">The forge’s temperature is your last 7 days of heat. A hotter forge pays more embers:</p><span class="gd-pills">${tiers}</span>`,true)}
 ${card('embers',pic('materials','embers','embers'),'Embers','Your coins. Heat turns into embers.',
  list(['Each point of heat pays embers, plus the forge bonus above.','A treat makes your dragon Well-fed: that day pays 10% more.','<b>+10</b> for a full day (every daily goal done).','<b>+60</b>, a Dragonscale and a Starmetal for a perfect week.','Games, bounties, achievements and streak milestones pay too.','A duplicate relic melts down into <b>100</b>.','Spend them in Craft.']))}
 ${card('materials',pic('materials','iron','ore'),'Materials','Each goal drops its category’s material.',
  `<div class="gd-rows">${common}</div>${list(['Your own categories drop the material you chose for them.','Long streaks drop more: 2 from day 10, 3 from day 30.','One-time goals drop 3, plus an Amber.'])}<p class="gd-note">Rare materials</p><div class="gd-rows">${rare}</div>`)}
 ${card('bond',pic('icons','dragon','dragon'),'Bond','Bond grows your dragon.',
  `${list(['Goals: the heat you earn, plus 5 for each day you do something and 10 for each full day.',`Treats: each one gives bond. Up to 2 different treats a day.`,`Petting: 2 bond, once every ${PET_COOLDOWN/60} hours.`,'Creative, Hobbies and Personal goals raise Spirit, which makes bond grow up to 25% faster.'])}
  <p class="gd-note">Bond needed for each age</p><span class="gd-pills">${stages}</span>`)}
 ${card('items',pic('icons','craft','hammer'),'Items','Craft them with embers and materials.',
  list([`<b>Treats</b> (${treats}) feed your dragon: bond, plus a bonus for the day.`,'<b>Tools</b> are permanent upgrades. They pay from the day you make them.','<b>Gear</b> is worn in the Dragon tab for powers.','<b>Themes</b> recolor your whole workshop.','New recipes appear as your dragon grows. Some stay secret until you earn them.']))}
 ${card('relics',pic('icons','vault','relic'),'Relics','The forge makes them as heat builds up.',
  `${list([`Your first relic comes at <b>${relicThreshold(1)}</b> heat. Each one after needs a little more.`,'Longer streaks raise the odds of a rare one:',`<span class="gd-pills">${rar}</span>`,'Some relics can be worn as gear.',`Find a whole collection to unlock a lasting bonus. There are ${SETS.length} collections.`])}
  <div class="gd-rows">${SETS.map(x=>`<div class="gd-row"><span class="gd-set">${esc(x.name)} <small>${x.size}</small></span><small>${esc(x.bonus)}</small></div>`).join('')}</div>`)}
 ${card('isles',pic('icons','isles','map'),'Flight energy and isles','Full days charge flight energy.',
  list(['<b>+2</b> energy for a full day, <b>+1</b> when you finish half.','Spend it to fly to the next island. Each island pays materials.','Far islands need rations, and some need storm, frost or light gear.','Past Dawnspire, a second sea opens: The Far Reaches.',`Flights open when your dragon is a ${unlockAt('isles')}.`]))}
 ${card('games',pic('icons','games','dice'),'Games','A rewarded run each day, then free play.',
  `${list([`<b>Anvil Strike</b>: after half of today’s goals.`,`<b>Ember Catch</b>: after your first goal (${unlockAt('catch')}).`,`<b>Wingbeat</b>: after all of today’s goals (${unlockAt('wingbeat')}).`,'The first run each day pays full rewards.','After that, free play pays scraps: up to 30 embers and 3 materials a day.'])}`)}
 ${card('bounties',art('scroll'),'Bounties','Three new jobs every week.',
  list(['Finish one to claim embers and materials.','The hardest one also pays an Ember core.','Last week’s finished bounties can still be claimed.']))}
 ${card('achievements',art('crown'),'Achievements','One-time rewards for big moments.',
  list(['Claim them in the Vault for embers and materials.','Some are secret until you earn them.']))}
 ${card('strengths',art('bolt'),'Strengths','Your goal categories train your dragon.',
  list(['<b>Strength</b> (Movement) widens the anvil’s perfect zone.','<b>Vitality</b> (Health) adds lives in Ember Catch.','<b>Wisdom</b> (Learning) can drop bonus materials.','<b>Spirit</b> (Creative, Hobbies, Personal) grows bond faster.']))}
 </div>`;
}
