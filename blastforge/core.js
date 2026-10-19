import {validRecord} from './validate.js';
export const DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
export function dayKey(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function dateOf(key){return new Date(`${key}T12:00:00`);}
export function addDays(key,n){const d=dateOf(key);d.setDate(d.getDate()+n);return dayKey(d);}
export function weekKey(key){return addDays(key,-((dateOf(key).getDay()+6)%7));}
export function weekDays(key){const start=weekKey(key);return Array.from({length:7},(_,i)=>addDays(start,i));}
export function goalForDate(records,id,date){
 const root=value(records,`goal:${id}`);if(!root)return null;
 const snapshot=value(records,`snapshot:${id}:${date}`);if(snapshot)return snapshot;
 const prefix=`version:${id}:`;
 const versions=Object.entries(records).filter(([k])=>k.startsWith(prefix)&&k.slice(prefix.length)<=date).sort(([a],[b])=>a.localeCompare(b));
 return versions.length?versions.at(-1)[1].value:root;
}
export function completionDate(records,goal,date){
 const period=periodKey(goal,date),key=`completed:${goal.id}:${period}`;
 if(Object.hasOwn(records,key))return value(records,key);
 const entry=records[entryKey(goal,date)];
 return entry?.value?dayKey(new Date(Number(entry.stamp.split(':')[0]))):null;
}
export function completedOnDay(records,goal,date){
 if(!value(records,sessionKey(goal,date),false)||!canComplete(records,goal,date))return false;
 return ['monthly','once'].includes(goal.schedule)?completionDate(records,goal,date)===date:true;
}
export function historyDay(records,date,today=dayKey()){
 if(date>today)return {date,future:true,goals:[],completed:0};
 const entries=Object.entries(records).filter(([k,r])=>k.startsWith('goal:')&&r.value).map(([,r])=>goalForDate(records,r.value.id,date));
 const list=entries.filter(g=>{
  if(g.metric)return false;
  const activity=Object.hasOwn(records,`snapshot:${g.id}:${date}`)||Object.keys(records).some(k=>k.startsWith(`entry:${g.id}:${date}:`));
  if(['once','monthly'].includes(g.schedule))return activity||completionDate(records,g,date)===date;
  return scheduled(g,date)||activity;
 });
 return {date,future:false,goals:list,completed:list.filter(g=>completedOnDay(records,g,date)).length};
}
export function periodKey(goal,date){return goal.schedule==='weekly'?weekKey(date):goal.schedule==='monthly'?date.slice(0,7):goal.schedule==='once'?'once':date;}
export function scheduled(goal,date){if(goal.archived||date<(goal.start||'2026-10-19'))return false;return goal.schedule==='daily'||goal.schedule==='weekly'||goal.schedule==='monthly'||(goal.schedule==='days'&&goal.days.includes(dateOf(date).getDay()))||(goal.schedule==='once'&&goal.due===date);}
export function entryKey(goal,date,step='done'){const period=goal.schedule==='weekly'&&step.startsWith('step-')?date:periodKey(goal,date);return `entry:${goal.id}:${period}:${step}`;}
export function stepsFor(goal,date){return goal.routines?goal.routines[dateOf(date).getDay()]||[]:goal.steps||[];}
export function value(records,key,fallback=null){return records[key]?.value??fallback;}
export function count(records,goal,date){if(goal.schedule==='weekly'){let n=0;for(const d of weekDays(date)){const at=goalForDate(records,goal.id,d)||goal;n+=at.schedule==='weekly'&&completedOnDay(records,at,d);}return n;}return Boolean(value(records,entryKey(goal,date),false))&&canComplete(records,goal,date)?1:0;}
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
 {id:'calories',title:'Stay within 1,700 calories',category:'Health',schedule:'daily',target:1,icon:'bowl',notes:'Your daily intake target. Check this off after you know your total for the day. This does not calculate calories burned or a weekly deficit.',steps:[]},
 {id:'hiragana',title:'Memorize all hiragana',category:'Learning',schedule:'once',due:'2026-12-31',target:1,icon:'kana',link:'https://arcanedesigner.com/neosai/',notes:'Your end-of-year Neosai goal. Track learning in Neosai; mark this complete when you have memorized all hiragana.',steps:[]},
 {id:'keene-oct',title:'4,500 Keene followers',category:'Creative',schedule:'once',due:'2026-10-31',target:4500,metric:'followers',icon:'flame',notes:'October milestone.',steps:[]},
 {id:'keene-nov',title:'4,750 Keene followers',category:'Creative',schedule:'once',due:'2026-11-30',target:4750,metric:'followers',icon:'flame',notes:'November milestone.',steps:[]},
 {id:'keene-dec',title:'5,000 Keene followers',category:'Creative',schedule:'once',due:'2026-12-31',target:5000,metric:'followers',icon:'flame',notes:'End-of-year milestone.',steps:[]}
].map(g=>({...g,start:'2026-10-19',archived:false,time:''}));
export function seededRecords(){return Object.fromEntries(SEED_GOALS.map(g=>[`goal:${g.id}`,{value:g,stamp:'0000000000000000:seed'}]));}
export function goalsOf(records){return Object.entries(records).filter(([k,r])=>k.startsWith('goal:')&&r.value&&!r.value.archived).map(([,r])=>r.value);}
export function milestoneDone(records,g,date){return g.metric?Number(value(records,`metric:${g.metric}`,-1))>=g.target:isComplete(records,g,date);}
export function scheduleLabel(g){return g.schedule==='daily'?'Every day':g.schedule==='days'?g.days.map(d=>DAYS[d]).join(' · '):g.schedule==='weekly'?`${g.target||1} ${(g.target||1)>1?'days':'time'} / week`:g.schedule==='monthly'?'Each month':`By ${dateOf(g.due).toLocaleDateString('en-US',{month:'short',day:'numeric'})}`;}
