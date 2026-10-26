import {validRecord} from './validate.js?v=16';
export const DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
export function dayKey(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function dateOf(key){return new Date(`${key}T12:00:00`);}
export function addDays(key,n){const d=dateOf(key);d.setDate(d.getDate()+n);return dayKey(d);}
export function weekKey(key){return addDays(key,-((dateOf(key).getDay()+6)%7));}
export function weekDays(key){const start=weekKey(key);return Array.from({length:7},(_,i)=>addDays(start,i));}
// Records with a prefix. forgeStats walks one goal's records day by day; it registers that fixed
// subset here so each prefix is scanned once instead of once per day (a year of history stays fast).
const PREFIXES=new WeakMap();
// The live board is cached too, but only through the Store, which marks it changed on every save
// (records are only ever changed in place there; merges and restores produce new objects).
export function trackRecords(records){if(!PREFIXES.has(records))PREFIXES.set(records,new Map());return records;}
export function recordsChanged(records){if(PREFIXES.has(records))PREFIXES.set(records,new Map());}
function scan(records,prefix){const cache=PREFIXES.get(records);if(!cache)return Object.entries(records).filter(([k])=>k.startsWith(prefix));if(!cache.has(prefix))cache.set(prefix,Object.entries(records).filter(([k])=>k.startsWith(prefix)));return cache.get(prefix);}
// A move belongs to its original occurrence, never to the recurring goal definition.
function recordedActivity(records,id,date){const g=value(records,`snapshot:${id}:${date}`);return Boolean(g&&(value(records,sessionKey(g,date),false)||value(records,`entry:${id}:${date}:missed`,false)||stepsFor(g,date).some(s=>value(records,entryKey(g,date,`step-${s.id}`),false))));}
function protectedArrival(records,id,origin){
 const prefix=`snapshot:${id}:`;
 return scan(records,prefix).filter(([k,r])=>r.value?.occurrenceOrigin===origin&&recordedActivity(records,id,k.slice(prefix.length))).sort(([ka,a],[kb,b])=>a.stamp.localeCompare(b.stamp)||ka.localeCompare(kb)).map(([key,r])=>({date:key.slice(prefix.length),goal:r.value})).at(-1)||null;
}
export function arrivalForDate(records,id,date){
 const prefix=`snapshot:${id}:`,saved=value(records,`${prefix}${date}`);
 // A stale offline undo/date change cannot erase work already recorded at the destination.
 if(saved?.occurrenceOrigin&&recordedActivity(records,id,date))return {origin:saved.occurrenceOrigin,goal:value(records,`${prefix}${saved.occurrenceOrigin}`,saved)};
 return scan(records,prefix).filter(([k,r])=>{
  if(r.value?.rescheduledTo!==date)return false;
  const protectedAt=protectedArrival(records,id,k.slice(prefix.length));return !protectedAt||protectedAt.date===date;
 }).sort(([ka,a],[kb,b])=>a.stamp.localeCompare(b.stamp)||ka.localeCompare(kb)).map(([key,r])=>({origin:key.slice(prefix.length),goal:r.value})).at(-1)||null;
}
export function goalForDate(records,id,date,today=dayKey()){
 const root=value(records,`goal:${id}`);if(!root)return null;
 let snapshot=records[`snapshot:${id}:${date}`];const prefix=`version:${id}:`;
 const versions=scan(records,prefix).filter(([k])=>k.slice(prefix.length)<=date).sort(([a],[b])=>a.localeCompare(b));
 const definition=versions.length?versions.at(-1)[1]:records[`goal:${id}`];
 const arrival=arrivalForDate(records,id,date);
 if(arrival){
  if(snapshot?.value.occurrenceOrigin===arrival.origin)return snapshot.value;
  const g={...arrival.goal,occurrenceOrigin:arrival.origin,archived:definition.value.archived};delete g.rescheduledTo;
  if(g.routines)g.routines={[dateOf(date).getDay()]:stepsFor(arrival.goal,arrival.origin)};
  return g;
 }
 const protectedAt=protectedArrival(records,id,date);
 if(protectedAt)return {...(snapshot?.value||definition.value),rescheduledTo:protectedAt.date,dayOnly:true};
 // An undone or changed move must not leave a phantom occurrence at its old destination.
 if(snapshot?.value.occurrenceOrigin)snapshot=null;
 if(snapshot?.value.rescheduledTo){
  if(arrivalForDate(records,id,snapshot.value.rescheduledTo)?.origin===date)return snapshot.value;
  // Two offline devices can move different occurrences to the same date. Keep the losing
  // occurrence on its original day, rather than silently dropping it or sharing a checklist.
  return {...snapshot.value,rescheduledTo:null,moveConflict:snapshot.value.rescheduledTo};
 }
 if(snapshot&&(date!==today||snapshot.value.dayOnly||snapshot.stamp>definition.stamp))return snapshot.value;
 return definition.value;
}
export function scheduledOn(records,goal,date){
 if(goal.rescheduledTo)return false;
 if(goal.occurrenceOrigin&&arrivalForDate(records,goal.id,date)?.origin===goal.occurrenceOrigin)return !goal.archived;
 return scheduled(goal,date);
}
export function missedOnDay(records,goal,date){
 const missed=records[`entry:${goal.id}:${date}:missed`],done=records[sessionKey(goal,date)];
 return Boolean(missed?.value)&&!(done?.value&&done.stamp>missed.stamp);
}
// Automatic outcomes are derived, never written over the user's saved progress.
export function weeklyProgress(records,goal,date,today=dayKey()){
 const days=weekDays(date),completed=count(records,goal,date),target=goal.target||1;
 const available=days.filter(d=>{
  const at=goalForDate(records,goal.id,d,today)||goal;
  return d>=today&&at.schedule==='weekly'&&scheduledOn(records,at,d)&&!completedOnDay(records,at,d)&&!missedOnDay(records,at,d);
 }).length;
 return {completed,target,available,complete:completed>=target,possible:completed+available>=target};
}
export function notCompletedOnDay(records,goal,date,today=dayKey()){
 if(goal.rescheduledTo||!['daily','days','weekly'].includes(goal.schedule))return false;
 if(missedOnDay(records,goal,date))return true;
 if(restOnDay(records,goal,date))return false;
 if(value(records,sessionKey(goal,date),false)&&canComplete(records,goal,date))return false;
 if(!scheduledOn(records,goal,date))return false;
 // Reopen is explicit and stays open, even on a historical date.
 if(value(records,`entry:${goal.id}:${date}:reopened`,false))return false;
 return date<today;
}
export function completionDate(records,goal,date){
 const period=periodKey(goal,date),key=`completed:${goal.id}:${period}`;
 if(Object.hasOwn(records,key))return value(records,key);
 const entry=records[entryKey(goal,date)];
 return entry?.value?dayKey(new Date(Number(entry.stamp.split(':')[0]))):null;
}
export function completedOnDay(records,goal,date){
 if(goal.rescheduledTo||missedOnDay(records,goal,date)||!value(records,sessionKey(goal,date),false)||!canComplete(records,goal,date))return false;
 return ['monthly','once'].includes(goal.schedule)?completionDate(records,goal,date)===date:true;
}
export function historyDay(records,date,today=dayKey()){
 if(date>today)return {date,future:true,goals:[],completed:0};
 const entries=Object.entries(records).filter(([k,r])=>k.startsWith('goal:')&&r.value).map(([,r])=>goalForDate(records,r.value.id,date,today));
 const list=entries.filter(g=>{
  if(g.metric)return false;
  const snapshot=records[`snapshot:${g.id}:${date}`]?.value;
  const cancelledArrival=snapshot?.occurrenceOrigin&&!arrivalForDate(records,g.id,date);
  const activity=!cancelledArrival&&(Boolean(snapshot)||Object.keys(records).some(k=>k.startsWith(`entry:${g.id}:${date}:`)));
  if(['once','monthly'].includes(g.schedule))return activity||completionDate(records,g,date)===date;
  return scheduledOn(records,g,date)||activity;
 });
 return {date,future:false,goals:list,completed:list.filter(g=>completedOnDay(records,g,date)).length};
}
export function periodKey(goal,date){return goal.schedule==='weekly'?weekKey(date):goal.schedule==='monthly'?date.slice(0,7):goal.schedule==='once'?'once':date;}
export function scheduled(goal,date){if(goal.archived||date<(goal.start||'2026-10-19'))return false;return goal.schedule==='daily'||goal.schedule==='weekly'||goal.schedule==='monthly'||(goal.schedule==='days'&&goal.days.includes(dateOf(date).getDay()))||(goal.schedule==='once'&&goal.due===date);}
export function entryKey(goal,date,step='done'){const period=goal.schedule==='weekly'&&step.startsWith('step-')?date:periodKey(goal,date);return `entry:${goal.id}:${period}:${step}`;}
export function stepsFor(goal,date){return goal.routines?goal.routines[dateOf(date).getDay()]||[]:goal.steps||[];}
export function value(records,key,fallback=null){return records[key]?.value??fallback;}
export function count(records,goal,date){if(goal.schedule==='weekly'){let n=0;for(const d of weekDays(date)){const at=goalForDate(records,goal.id,d)||goal;n+=at.schedule==='weekly'&&completedOnDay(records,at,d);}return n;}return !goal.rescheduledTo&&!missedOnDay(records,goal,date)&&Boolean(value(records,entryKey(goal,date),false))&&canComplete(records,goal,date)?1:0;}
export function isComplete(records,goal,date){return count(records,goal,date)>=(goal.target||1);}
export function sessionKey(goal,date){return goal.schedule==='weekly'?`entry:${goal.id}:${date}:session`:entryKey(goal,date);}
export function canComplete(records,goal,date){const steps=stepsFor(goal,date);if(goal.routines&&!steps.length)return false;return steps.every(s=>value(records,entryKey(goal,date,`step-${s.id}`),false));}
export function mergeRecords(local,incoming){const next={...local};for(const [key,record]of Object.entries(incoming||{})){if(validRecord(key,record)&&(!next[key]||record.stamp>next[key].stamp))next[key]=record;}return next;}
export function nextStamp(records,actor,now=Date.now()){let clock=now;for(const r of Object.values(records))clock=Math.max(clock,Number(r.stamp?.split(':')[0]||0)+1);return `${String(clock).padStart(16,'0')}:${actor}`;}
export const SEED_GOALS=[
 {id:'veggie',title:'Eat a veggie',category:'Health',schedule:'daily',target:1,icon:'leaf',notes:'A veggie, every day.',steps:[]},
 {id:'grindstone',title:'Grindstone',category:'Movement',schedule:'days',days:[1,3,5,6],target:1,icon:'anvil',notes:"Warm up 3–5 min. Rest 60–90 sec between sets; up to 2 min after demanding lifts. Choose weight that leaves about 2 clean reps available. When both sets reach the top of the range with good form, increase weight and return to the lower end. Raises use a lighter, controlled weight. Friday’s triceps extension stays easy because Saturday uses triceps too. One set per exercise is fine for the first week. Marching or step jacks can replace jumping jacks.",routines:{"1":[{"id":"mon-shoulders","title":"Overhead press · 2 × 8–12"},{"id":"mon-arms","title":"Bicep curls · 2 × 10–15"},{"id":"mon-shrugs","title":"Shrugs · 2 × 12–20"},{"id":"mon-lateral","title":"Lateral raises · 1 × 12–15"},{"id":"mon-bent-raise","title":"Bent-arm lateral raises · 1 × 12–15"},{"id":"mon-dips","title":"Dips · 2 × 6–10"},{"id":"mon-cardio","title":"Cardio · 6 min: alternate 30 sec jumping jacks / 30 sec marching"}],"3":[{"id":"wed-squat","title":"Goblet squats · 2 × 8–12"},{"id":"wed-deadlift","title":"Dumbbell Romanian deadlifts · 2 × 8–12"},{"id":"wed-back","title":"Dumbbell rows · 2 × 8–12 per side"},{"id":"wed-lunge","title":"Reverse lunges · 2 × 6–10 per leg"},{"id":"wed-calf","title":"Standing calf raises · 2 × 15–20"}],"5":[{"id":"fri-arms","title":"Bicep curls · 2 × 10–15"},{"id":"fri-triceps","title":"Overhead triceps extension · 1 easy set × 12–15"},{"id":"fri-situps","title":"Sit-ups · 2 × 8–15"},{"id":"fri-plank","title":"Plank · 2 × 15–30 sec"}],"6":[{"id":"sat-pushup","title":"Push-ups · 2 × 6–12"},{"id":"sat-chest","title":"Dumbbell floor press · 2 × 8–12"},{"id":"sat-bridge","title":"Glute bridges · 2 × 12–15"},{"id":"sat-burpee","title":"Burpees · 2 × 5–8 (no extra push-up; jump optional)"}]}},
 {id:'small-movement',title:'Cardio & stretch',category:'Movement',schedule:'days',days:[0,2,4],target:1,icon:'spark',notes:'Jumping jacks: 50 or 100, to be decided. Edit the steps when you choose.',steps:[{id:'cardio',title:'Jumping jacks · choose 50 or 100'},{id:'stretch',title:'Stretch'}]},
 {id:'juggling',title:'Juggling',category:'Hobbies',schedule:'days',days:[5],target:1,icon:'orbit',notes:'No timer or duration target for now.',steps:[]},
 {id:'quick-math',title:'Quick math',category:'Learning',schedule:'days',days:[6],target:1,icon:'math',link:'https://arcanedesigner.com/math/',notes:'Open Quick Math for your practice, then check it off here.',steps:[]},
 {id:'keene-engage',title:'Keene · follow & engage',category:'Creative',schedule:'weekly',target:2,icon:'flame',notes:'Follow and engage with people.',steps:[]},
 {id:'barnacles',title:'Write for Barnacles',category:'Creative',schedule:'weekly',target:2,preferred:[5],icon:'quill',notes:'Friday is a likely writing day; the other day is flexible. No word count yet.',steps:[]},
 {id:'neosai-practice',title:'Practice Neosai',category:'Learning',schedule:'weekly',target:2,icon:'kana',link:'https://arcanedesigner.com/neosai/',notes:'Practice Japanese in Neosai on two days each week.',steps:[],start:'2026-10-21'},
 {id:'calories',title:'Stay within 1,700 calories',category:'Health',schedule:'daily',target:1,icon:'bowl',notes:'Your daily intake target. Check this off after you know your total for the day. This does not calculate calories burned or a weekly deficit.',steps:[]},
 {id:'hiragana',title:'Memorize all hiragana',category:'Learning',schedule:'once',due:'2026-12-31',target:1,icon:'kana',link:'https://arcanedesigner.com/neosai/',notes:'Your end-of-year Neosai goal. Track learning in Neosai; mark this complete when you have memorized all hiragana.',steps:[]},
 {id:'keene-oct',title:'4,500 Keene followers',category:'Creative',schedule:'once',due:'2026-10-31',target:4500,metric:'followers',icon:'flame',notes:'October milestone.',steps:[]},
 {id:'keene-nov',title:'4,750 Keene followers',category:'Creative',schedule:'once',due:'2026-11-30',target:4750,metric:'followers',icon:'flame',notes:'November milestone.',steps:[]},
 {id:'keene-dec',title:'5,000 Keene followers',category:'Creative',schedule:'once',due:'2026-12-31',target:5000,metric:'followers',icon:'flame',notes:'End-of-year milestone.',steps:[]}
].map(g=>({...g,start:g.start||'2026-10-19',archived:false,time:''}));
export function seededRecords(){return Object.fromEntries(SEED_GOALS.map(g=>[`goal:${g.id}`,{value:g,stamp:'0000000000000000:seed'}]));}
export function goalsOf(records){return Object.entries(records).filter(([k,r])=>k.startsWith('goal:')&&r.value&&!r.value.archived).map(([,r])=>r.value);}
// One-time goals added to a specific day ("day goals") appear in that day's list.
// Unfinished ones carry into today until they are done; finished ones stay on the day they were done.
export function isDayTask(g){return Boolean(g)&&g.schedule==='once'&&!g.metric&&g.dayGoal===true;}
export function dayTasks(records,date,today=dayKey()){
 return goalsOf(records).map(g=>goalForDate(records,g.id,date,today)).filter(g=>{
  if(!isDayTask(g)||g.archived)return false;
  if(g.due===date)return true;
  if(date!==today||g.due>today)return false;
  const doneOn=completionDate(records,g,date);
  return !doneOn||doneOn===today;
 });
}
export function milestoneDone(records,g,date){return g.metric?Number(value(records,`metric:${g.metric}`,-1))>=g.target:isComplete(records,g,date);}
export function scheduleLabel(g){return g.schedule==='daily'?'Every day':g.schedule==='days'?g.days.map(d=>DAYS[d]).join(' · '):g.schedule==='weekly'?`${g.target||1} ${(g.target||1)>1?'days':'time'} / week`:g.schedule==='monthly'?'Each month':`By ${dateOf(g.due).toLocaleDateString('en-US',{month:'short',day:'numeric'})}`;}

// ---- Rest and cheat days ----
// A planned day off for Movement (rest) or Health (cheat) goals. It is never "not completed"
// and it keeps a streak alive. Completing the goal later that day wins over the rest.
export const REST_RULES={Movement:{label:'Rest day',per:2},Health:{label:'Cheat day',per:2}};
export function restRule(g){return g&&['daily','days'].includes(g.schedule)?REST_RULES[g.category]||null:null;}
export function restOnDay(records,goal,date){const r=records[`entry:${goal.id}:${date}:rest`],done=records[sessionKey(goal,date)];return Boolean(r?.value)&&!(done?.value&&done.stamp>r.stamp);}
export function restsInWeek(records,goal,date){return weekDays(date).filter(d=>restOnDay(records,goal,d)).length;}

// ---- The forge: heat, streaks and relics ----
// Every check-off adds heat. A daily goal done on consecutive scheduled days earns more each day
// (x1, x1.5, x2 ... up to x4). Days a goal isn't scheduled, and rest days, don't break a streak.
// Temperature compares the last seven days' heat with steady, moderate effort, so it cools when
// you stop and runs hottest on long streaks. Heat also accumulates for good toward forged relics.
export const FORGE={weeklyBonus:2,milestone:5,reference:2.5,relicBase:30,relicStep:5};
// Streak multiplier: x1 on day one, x4 by day 7, then still climbing: x5 at 14, x6 at 30, x8 at 50, x10 at 100.
export const MULT_STEPS=[[1,1],[7,4],[14,5],[30,6],[50,8],[100,10]];
// Named streak milestones. Reaching one pays a reward once per goal (see game.js).
export const STREAK_MILESTONES=[{days:3,name:'Spark'},{days:7,name:'Flame'},{days:10,name:'Blaze'},{days:14,name:'Bonfire'},{days:21,name:'Wildfire'},{days:30,name:'Inferno'},{days:50,name:'Firestorm'},{days:75,name:'Sunfire'},{days:100,name:'Dragonheart'},{days:150,name:'Starfire'},{days:200,name:'Eternal Flame'},{days:365,name:'Legend'}];
export const TIERS=[{min:0,name:'Embers'},{min:.2,name:'Kindled'},{min:.45,name:'Blazing'},{min:.75,name:'White-hot'},{min:1,name:'Dragonfire'}];
export const RELICS=['Iron Ingot','Rider’s Buckle','Ember Dagger','Forge Gauntlet','Dragonscale Shield','Flamewrought Helm','Wyrmsteel Blade','Skywarden Saddle'];
export function streakMultiplier(n){if(n<=1)return 1;for(let i=1;i<MULT_STEPS.length;i++){const [d1,m1]=MULT_STEPS[i],[d0,m0]=MULT_STEPS[i-1];if(n<=d1)return Math.round((m0+(m1-m0)*(n-d0)/(d1-d0))*10)/10;}return MULT_STEPS.at(-1)[1];}
export function streakMilestone(n){return STREAK_MILESTONES.filter(m=>n>=m.days).at(-1)||null;}
export function nextMilestone(n){return STREAK_MILESTONES.find(m=>m.days>n)||null;}
export function relicThreshold(k){return k*FORGE.relicBase+FORGE.relicStep*k*(k-1)/2;}
export function relicName(i){const base=RELICS[i%RELICS.length],round=Math.floor(i/RELICS.length);return round?`${base} ${['II','III','IV','V','VI','VII','VIII','IX','X'][Math.min(round-1,8)]}`:base;}
export function tierFor(temp){return TIERS.filter(t=>temp>=t.min).at(-1);}
function goalRecords(records,id){return Object.fromEntries(Object.entries(records).filter(([k])=>k.split(':')[1]===id));}
// since: the first day that counts (a game season starts fresh from that day; history is untouched).
export function forgeStats(records,today=dayKey(),{since=null}={}){
 const roots=Object.entries(records).filter(([k,r])=>k.startsWith('goal:')&&r.value&&!r.value.metric).map(([,r])=>r.value);
 let start=roots.reduce((m,g)=>(g.start||'2026-10-19')<m?(g.start||'2026-10-19'):m,today);if(since&&since>start)start=since<today?since:today;
 const days=[];for(let d=start;d<=today;d=addDays(d,1))days.push(d);
 const heat=Object.fromEntries(days.map(d=>[d,0])),maxRun=Object.fromEntries(days.map(d=>[d,0])),dayTotals=Object.fromEntries(days.map(d=>[d,{planned:0,done:0}])),week0=addDays(today,-6),streaks=[],ledger=[];let possible=0;
 // Each goal's own records, gathered in one pass over the board.
 const byGoal={};for(const [k,r]of Object.entries(records)){const id=k.split(':')[1];if(id)(byGoal[id]||={})[k]=r;}
 for(const root of roots){
  const sub=byGoal[root.id]||goalRecords(records,root.id);PREFIXES.set(sub,new Map());let run=0,best=0,weekly=null;
  for(const d of days){
   const g=goalForDate(sub,root.id,d,today);if(!g)continue;
   if(['daily','days'].includes(g.schedule)){
    if(!scheduledOn(sub,g,d))continue;
    const rest=restOnDay(sub,g,d);if(!rest)dayTotals[d].planned++;
    if(completedOnDay(sub,g,d)){if(!rest)dayTotals[d].done++;run++;best=Math.max(best,run);const mult=streakMultiplier(run);heat[d]+=mult;maxRun[d]=Math.max(maxRun[d],run);ledger.push({date:d,id:root.id,category:g.category,kind:'day',run,mult});}
    else if(!rest&&d<today)run=0;
    if(d>=week0&&!rest)possible+=FORGE.reference;
   }else if(g.schedule==='weekly'){
    weekly=g;if(completedOnDay(sub,g,d)){heat[d]+=1;ledger.push({date:d,id:root.id,category:g.category,kind:'week',run:0,mult:1});}
   }else if(completedOnDay(sub,g,d)){heat[d]+=FORGE.milestone;ledger.push({date:d,id:root.id,category:g.category,kind:'once',run:0,mult:FORGE.milestone});}
  }
  const now=goalForDate(sub,root.id,today,today)||root;
  if(weekly){
   // Weekly goals: a bonus when the target is hit, growing with consecutive weeks.
   let weeks=0,bestWeeks=0;
   for(let w=weekKey(start);w<=weekKey(today);w=addDays(w,7)){
    let n=0,hitOn=null;for(const d of weekDays(w)){if(d<start||d>today)continue;const g=goalForDate(sub,root.id,d,today);if(g?.schedule==='weekly'&&completedOnDay(sub,g,d)){n++;if(n===(g.target||1))hitOn=d;}}
    if(hitOn){weeks++;bestWeeks=Math.max(bestWeeks,weeks);const bonus=FORGE.weeklyBonus*streakMultiplier(weeks);heat[hitOn]+=bonus;ledger.push({date:hitOn,id:root.id,category:root.category,kind:'target',run:weeks,mult:bonus});}
    else if(w<weekKey(today))weeks=0;
   }
   if(!root.archived&&now.schedule==='weekly')streaks.push({id:root.id,title:now.title,icon:now.icon,category:now.category,unit:'week',current:weeks,best:bestWeeks,next:streakMultiplier(weeks+1)});
  }
  if(!root.archived&&['daily','days'].includes(now.schedule)){const rule=restRule(now);streaks.push({id:root.id,title:now.title,icon:now.icon,category:now.category,unit:'day',current:run,best,next:streakMultiplier(run+1),rest:rule?{label:rule.label,left:Math.max(0,rule.per-restsInWeek(sub,now,today))}:null});}
 }
 const lifetime=days.reduce((n,d)=>n+heat[d],0),earned=days.filter(d=>d>=week0).reduce((n,d)=>n+heat[d],0);
 const temp=possible?Math.min(1.25,earned/possible):0;let relics=0;while(relicThreshold(relics+1)<=lifetime)relics++;
 const from=relicThreshold(relics),to=relicThreshold(relics+1);
 // The day each relic was forged, and the longest streak running that day (it improves rarity odds).
 const forged=[];let total=0,k=1,runSoFar=0;for(const d of days){total+=heat[d];runSoFar=Math.max(runSoFar,maxRun[d]);while(k<=relics&&total>=relicThreshold(k)){forged.push({index:k-1,date:d,run:maxRun[d]});k++;}}
 streaks.sort((a,b)=>b.current-a.current||b.best-a.best||a.title.localeCompare(b.title));
 ledger.sort((a,b)=>a.date.localeCompare(b.date));
 return {temp,tier:tierFor(temp),earned,possible,lifetime,heat,ledger,forged,maxRun,dayTotals,byGoal,last7:days.slice(-7).map(d=>({date:d,heat:heat[d]})),relics,progress:(lifetime-from)/(to-from),toNext:Math.ceil(to-lifetime),streaks};
}
