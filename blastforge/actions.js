import {dayKey,dateOf,addDays,goalForDate,value,entryKey,sessionKey,periodKey,stepsFor,canComplete,scheduledOn,arrivalForDate,completedOnDay,count} from './core.js?v=14';
export function snapshotGoal(goal,date){const g=structuredClone(goal);delete g.moveConflict;if(g.routines)g.routines={[dateOf(date).getDay()]:stepsFor(g,date)};return g;}
export function baselineChanges(records,goal){
 const prefix=`version:${goal.id}:`;
 return Object.keys(records).some(k=>k.startsWith(prefix))?{}:{[`${prefix}${goal.start||'2026-10-19'}`]:structuredClone(goal)};
}
function activeGoal(records,id,date,today){if(date>today)throw new Error('Future days cannot be checked off.');const g=goalForDate(records,id,date,today);if(!g||g.rescheduledTo||date<(g.start||'2026-10-19'))throw new Error('This goal is unavailable on that day.');return g;}
// cascade: the parent checkbox drives its steps. Checking it checks every step;
// unchecking it clears them. Without cascade the steps must already be complete.
export function completionChanges(records,id,date,done,today=dayKey(),{cascade=false}={}){
 const g=activeGoal(records,id,date,today),steps=stepsFor(g,date);
 if(done&&g.routines&&!steps.length)throw new Error('Set up this day’s routine first.');
 if(done&&!cascade&&!canComplete(records,g,date))throw new Error('Finish the smaller steps first.');
 const changes={...baselineChanges(records,value(records,`goal:${id}`)),[`snapshot:${id}:${date}`]:snapshotGoal(g,date),[sessionKey(g,date)]:Boolean(done),[`entry:${id}:${date}:missed`]:false,[`entry:${id}:${date}:reopened`]:date<today};
 if(cascade)for(const s of steps)changes[entryKey(g,date,`step-${s.id}`)]=Boolean(done);
 if(['monthly','once'].includes(g.schedule))changes[`completed:${id}:${periodKey(g,date)}`]=done?date:null;
 return changes;
}
export function stepChanges(records,id,date,step,done,today=dayKey()){
 const g=activeGoal(records,id,date,today);
 if(!stepsFor(g,date).some(s=>s.id===step))throw new Error('This step has changed. Reopen the goal.');
 const changes={...baselineChanges(records,value(records,`goal:${id}`)),[`snapshot:${id}:${date}`]:snapshotGoal(g,date),[entryKey(g,date,`step-${step}`)]:Boolean(done),[`entry:${id}:${date}:missed`]:false,[`entry:${id}:${date}:reopened`]:date<today};
 if(!done){changes[sessionKey(g,date)]=false;if(['monthly','once'].includes(g.schedule))changes[`completed:${id}:${periodKey(g,date)}`]=null;}
 // Checking the last open step completes the parent, unless a weekly target is already met.
 else if(stepsFor(g,date).every(s=>s.id===step||value(records,entryKey(g,date,`step-${s.id}`),false))&&!value(records,sessionKey(g,date),false)&&!(g.schedule==='weekly'&&count(records,g,date)>=(g.target||1))){
  changes[sessionKey(g,date)]=true;if(['monthly','once'].includes(g.schedule))changes[`completed:${id}:${periodKey(g,date)}`]=date;
 }
 return changes;
}
export function goalEditChanges(records,goal,{scope='future',date=dayKey(),today=dayKey()}={}){
 const root=value(records,`goal:${goal.id}`);if(!root)return {[`goal:${goal.id}`]:goal,[`version:${goal.id}:${goal.start||today}`]:goal};
 const changes=baselineChanges(records,root),prior=goalForDate(records,goal.id,date,today);
 if(scope==='day'){
  if(date>today)throw new Error('Choose today or a past day to edit.');
  const g={...goal,schedule:prior.schedule,target:prior.target,days:prior.days,due:prior.due,metric:prior.metric,start:prior.start,archived:prior.archived};
  changes[`snapshot:${goal.id}:${date}`]={...snapshotGoal(g,date),dayOnly:true};
  // Changing requirements reopens only this occurrence, never another day's work.
  const merged=Object.fromEntries([...Object.entries(records),...Object.entries(changes).map(([k,v])=>[k,{value:v,stamp:'0000000000000000:edit'}])]);
  if(!canComplete(merged,g,date)){changes[sessionKey(g,date)]=false;if(['monthly','once'].includes(g.schedule))changes[`completed:${g.id}:${periodKey(g,date)}`]=null;}
  return changes;
 }
 // A goal definition edit applies today onward; all earlier definitions remain addressable.
 const g={...goal,...(goal.routines?{routines:{...root.routines,...goal.routines}}:{}),archived:root.archived};
 delete g.dayOnly;delete g.rescheduledTo;delete g.occurrenceOrigin;delete g.moveConflict;
 changes[`version:${goal.id}:${today}`]=g;changes[`goal:${goal.id}`]=g;
 const currentSnapshot=value(records,`snapshot:${goal.id}:${today}`);
 if(currentSnapshot&&!Object.hasOwn(currentSnapshot,'rescheduledTo')&&!currentSnapshot.occurrenceOrigin){
  // Today's checklist follows the edit; earlier snapshots stay unchanged.
  changes[`snapshot:${goal.id}:${today}`]=snapshotGoal(g,today);
  if(!canComplete(records,g,today)){changes[sessionKey(g,today)]=false;if(['monthly','once'].includes(g.schedule))changes[`completed:${g.id}:${periodKey(g,today)}`]=null;}
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

export function missedChanges(records,id,date,missed,today=dayKey()){
 const g=activeGoal(records,id,date,today);
 if(!['daily','days','weekly'].includes(g.schedule))throw new Error('This option is for daily occurrences.');
 const changes=completionChanges(records,id,date,false,today);
 changes[`entry:${id}:${date}:missed`]=Boolean(missed);changes[`entry:${id}:${date}:reopened`]=!missed&&date<today;return changes;
}
function hasProgress(records,g,date){return completedOnDay(records,g,date)||stepsFor(g,date).some(s=>value(records,entryKey(g,date,`step-${s.id}`),false))||value(records,`entry:${g.id}:${date}:missed`,false);}
function movingOccurrence(records,id,date,today){
 const g=goalForDate(records,id,date,today);if(!g||g.schedule!=='days'||g.archived||value(records,`goal:${id}`)?.archived)throw new Error('Only goals assigned to weekdays can be moved this way.');
 const origin=g.occurrenceOrigin||date,source=goalForDate(records,id,origin,today),current=source.rescheduledTo||origin;
 if(!g.rescheduledTo&&!scheduledOn(records,g,date))throw new Error('There is no occurrence on this day.');
 const at=goalForDate(records,id,current,today);
 if(hasProgress(records,at,current))throw new Error('Reopen this occurrence and clear its checked steps before moving it.');
 return {g,source,origin,current,currentGoal:at};
}
export function moveChanges(records,id,date,to,today=dayKey()){
 const {origin,current,currentGoal}=movingOccurrence(records,id,date,today);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(to)||dayKey(dateOf(to))!==to||to<today||to<=origin)throw new Error('Choose a later date, today or in the future.');
 if(to===current)throw new Error('This occurrence is already on that date.');
 const target=goalForDate(records,id,to,today);
 if(scheduledOn(records,target,to)||hasProgress(records,target,to))throw new Error('This goal is already on that day. Choose another date.');
 const saved={...snapshotGoal(currentGoal,current),rescheduledTo:to,dayOnly:true};if(saved.routines)saved.routines={[dateOf(origin).getDay()]:stepsFor(currentGoal,current)};delete saved.occurrenceOrigin;delete saved.moveConflict;
 return {...baselineChanges(records,value(records,`goal:${id}`)),[`snapshot:${id}:${origin}`]:saved};
}
export function cancelMoveChanges(records,id,date,today=dayKey()){
 const {origin,current,currentGoal}=movingOccurrence(records,id,date,today);
 if(current===origin)throw new Error('This occurrence has not been moved.');
 const saved={...snapshotGoal(currentGoal,current),rescheduledTo:null,dayOnly:true};delete saved.occurrenceOrigin;
 if(saved.routines)saved.routines={[dateOf(origin).getDay()]:stepsFor(currentGoal,current)};
 return {[`snapshot:${id}:${origin}`]:saved};
}
