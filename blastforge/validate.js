const text=(v,max)=>typeof v==='string'&&v.length<=max;
const id=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(v);
export const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
const weekdays=v=>Array.isArray(v)&&v.length<=7&&new Set(v).size===v.length&&v.every(n=>Number.isInteger(n)&&n>=0&&n<=6);
const steps=v=>Array.isArray(v)&&v.length<=40&&new Set(v.map(s=>s?.id)).size===v.length&&v.every(s=>s&&id(s.id)&&text(s.title,200)&&s.title.trim());
export function validGoal(g,goalId){
 if(!g||!id(g.id)||g.id!==goalId||!text(g.title,100)||!g.title.trim()||!text(g.category,40)||!['daily','days','weekly','monthly','once'].includes(g.schedule))return false;
 if(!Number.isInteger(g.target)||g.target<1||g.target>100000000)return false;
 if(g.schedule==='weekly'&&g.target>7)return false;
 if(g.schedule==='days'&&(!weekdays(g.days)||!g.days.length))return false;
 if(g.schedule==='once'&&!validDate(g.due))return false;
 if(g.start!==undefined&&!validDate(g.start))return false;
 if(g.time!==undefined&&g.time!==''&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(g.time))return false;
 if(g.notes!==undefined&&!text(g.notes,1200))return false;
 if(g.archived!==undefined&&typeof g.archived!=='boolean')return false;
 if(g.metric!==undefined&&g.metric!=='followers')return false;
 if(g.metric&&g.schedule!=='once')return false;
 if(g.rescheduledTo!==undefined&&g.rescheduledTo!==null&&!validDate(g.rescheduledTo))return false;
 if(g.occurrenceOrigin!==undefined&&!validDate(g.occurrenceOrigin))return false;
 if(g.preferred!==undefined&&!weekdays(g.preferred))return false;
 if(g.dayGoal!==undefined&&typeof g.dayGoal!=='boolean')return false;
 if(g.steps!==undefined&&!steps(g.steps))return false;
 if(g.routines!==undefined&&(!g.routines||typeof g.routines!=='object'||Array.isArray(g.routines)||Object.entries(g.routines).some(([d,s])=>!/^[0-6]$/.test(d)||!steps(s))))return false;
 return true;
}
export function validRecord(key,r){
 if(!/^(goal|entry|metric|version|snapshot|completed):[a-zA-Z0-9:_-]{1,220}$/.test(key)||!r||!/^\d{16}:[a-zA-Z0-9-]+$/.test(r.stamp||'')||!Number.isSafeInteger(Number(r.stamp.split(':')[0]))||!Object.hasOwn(r,'value'))return false;
 if(JSON.stringify(r).length>40000)return false;
 if(key.startsWith('entry:'))return typeof r.value==='boolean';
 if(key.startsWith('metric:'))return Number.isInteger(r.value)&&r.value>=0&&r.value<=100000000;
 if(key.startsWith('completed:'))return r.value===null||validDate(r.value);
 const [kind,goalId,date]=key.split(':');
 if(['version','snapshot'].includes(kind)&&!validDate(date))return false;
 if(r.value?.rescheduledTo!==undefined&&(kind!=='snapshot'||r.value.rescheduledTo!==null&&r.value.rescheduledTo<=date))return false;
 if(r.value?.occurrenceOrigin!==undefined&&(kind!=='snapshot'||r.value.occurrenceOrigin>=date||r.value.rescheduledTo))return false;
 return validGoal(r.value,goalId);
}
