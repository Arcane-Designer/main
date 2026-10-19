import {dayKey,dateOf,addDays,goalForDate,value,entryKey,sessionKey,periodKey,stepsFor,canComplete} from './core.js';
export function snapshotGoal(goal,date){const g=structuredClone(goal);if(g.routines)g.routines={[dateOf(date).getDay()]:stepsFor(g,date)};return g;}
export function baselineChanges(records,goal){
 const prefix=`version:${goal.id}:`;
 return Object.keys(records).some(k=>k.startsWith(prefix))?{}:{[`${prefix}${goal.start||'2026-10-19'}`]:structuredClone(goal)};
}
function activeGoal(records,id,date,today){if(date>today)throw new Error('Future days cannot be checked off.');const g=goalForDate(records,id,date);if(!g||date<(g.start||'2026-10-19'))throw new Error('This goal is unavailable on that day.');return g;}
export function completionChanges(records,id,date,done,today=dayKey()){
 const g=activeGoal(records,id,date,today);
 if(done&&!canComplete(records,g,date))throw new Error('Finish the smaller steps first.');
 const changes={...baselineChanges(records,value(records,`goal:${id}`)),[`snapshot:${id}:${date}`]:snapshotGoal(g,date),[sessionKey(g,date)]:Boolean(done)};
 if(['monthly','once'].includes(g.schedule))changes[`completed:${id}:${periodKey(g,date)}`]=done?date:null;
 return changes;
}
export function stepChanges(records,id,date,step,done,today=dayKey()){
 const g=activeGoal(records,id,date,today);
 if(!stepsFor(g,date).some(s=>s.id===step))throw new Error('This step has changed. Reopen the goal.');
 const changes={...baselineChanges(records,value(records,`goal:${id}`)),[`snapshot:${id}:${date}`]:snapshotGoal(g,date),[entryKey(g,date,`step-${step}`)]:Boolean(done)};
 if(!done){changes[sessionKey(g,date)]=false;if(['monthly','once'].includes(g.schedule))changes[`completed:${id}:${periodKey(g,date)}`]=null;}
 return changes;
}
export function goalEditChanges(records,goal,{scope='future',date=dayKey(),today=dayKey()}={}){
 const root=value(records,`goal:${goal.id}`);if(!root)return {[`goal:${goal.id}`]:goal,[`version:${goal.id}:${goal.start||today}`]:goal};
 const changes=baselineChanges(records,root),prior=goalForDate(records,goal.id,date);
 if(scope==='day'){
  if(date>today)throw new Error('Choose today or a past day to edit.');
  const g={...goal,schedule:prior.schedule,target:prior.target,days:prior.days,due:prior.due,metric:prior.metric,start:prior.start,archived:prior.archived};
  changes[`snapshot:${goal.id}:${date}`]=snapshotGoal(g,date);
  // Changing requirements reopens only this occurrence, never another day's work.
  const merged=Object.fromEntries([...Object.entries(records),...Object.entries(changes).map(([k,v])=>[k,{value:v,stamp:'0000000000000000:edit'}])]);
  if(!canComplete(merged,g,date)){changes[sessionKey(g,date)]=false;if(['monthly','once'].includes(g.schedule))changes[`completed:${g.id}:${periodKey(g,date)}`]=null;}
  return changes;
 }
 // A goal definition edit applies today onward; all earlier definitions remain addressable.
 const current=goalForDate(records,goal.id,today),g={...goal,...(goal.routines?{routines:{...root.routines,...goal.routines}}:{}),archived:root.archived};
 changes[`version:${goal.id}:${today}`]=g;changes[`goal:${goal.id}`]=g;
 if(Object.hasOwn(records,`snapshot:${goal.id}:${today}`)){
  // A started occurrence keeps its original checklist. History can explicitly edit that day.
  changes[`snapshot:${goal.id}:${today}`]=snapshotGoal(current,today);
 }
 return changes;
}
export function archiveChanges(records,id,archived,today=dayKey()){
 const root=value(records,`goal:${id}`);if(!root)throw new Error('This goal is unavailable.');
 const g={...root,archived},changes=baselineChanges(records,root);
 // Archiving removes Today immediately while preserving this day's history.
 changes[`version:${id}:${archived?addDays(today,1):today}`]=g;changes[`goal:${id}`]=g;
 if(!archived)for(const k of Object.keys(records))if(k.startsWith(`version:${id}:`)&&k.slice(`version:${id}:`.length)>today)changes[k]=g;
 return changes;
}
export function parseSteps(text,previous=[],makeId=()=>crypto.randomUUID()){
 const used=new Set();return String(text).split('\n').map(t=>t.trim()).filter(Boolean).slice(0,40).map(title=>{const match=previous.find(s=>s.title===title&&!used.has(s.id));const id=match?.id||makeId();used.add(id);return {id,title:title.slice(0,200)};});
}
