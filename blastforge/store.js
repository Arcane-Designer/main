import {seededRecords,mergeRecords,nextStamp,dayKey,trackRecords,recordsChanged} from './core.js?v=15';
import {completionChanges,stepChanges,goalEditChanges,archiveChanges,missedChanges,moveChanges,cancelMoveChanges,restChanges,grindstoneMergeChanges} from './actions.js?v=15';
import {SYNC_ENDPOINT} from './config.js?v=15';
import {validRecord} from './validate.js?v=15';
const STATE='blastforge-v1', CONNECTION='blastforge-connection-v1';
const random=()=>{const b=crypto.getRandomValues(new Uint8Array(20));return [...b].map(x=>'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[x&31]).join('');};
export const cleanCode=s=>String(s||'').toUpperCase().replace(/[018]/g,c=>({'0':'O','1':'I','8':'B'}[c])).replace(/[^A-Z2-7]/g,'');
export const validCode=s=>/^[A-Z2-7]{20}$/.test(s);
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))||fallback;}catch{return fallback;}};
let records=mergeRecords(seededRecords(),read(STATE,{}));
let connection=read(CONNECTION,{}),db,busy,timer,generation=0,revision=0,initializing;
let readyResolve;const ready=new Promise(resolve=>readyResolve=resolve);
const actor=crypto.randomUUID();
let error='',status='Preparing…',last=0,lastPersistOK=false;
const listeners=new Set();
const notify=()=>listeners.forEach(f=>f());
function cookieCode(){try{return document.cookie.split('; ').find(c=>c.startsWith('blastforge_connection='))?.split('=')[1]||'';}catch{return '';}}
function saveConnection(){try{localStorage.setItem(CONNECTION,JSON.stringify(connection));}catch{}if(location.protocol==='https:')document.cookie=`blastforge_connection=${connection.code}; Max-Age=31536000; Path=/blastforge; Secure; SameSite=Strict`;}
function disk(action,key,data){if(!db)return Promise.resolve(null);return new Promise((resolve,reject)=>{let tx;const timeout=setTimeout(()=>reject(new Error('Storage timed out')),5000);try{tx=db.transaction('settings',action==='get'?'readonly':'readwrite');const req=action==='get'?tx.objectStore('settings').get(key):tx.objectStore('settings').put(data,key);tx.oncomplete=()=>{clearTimeout(timeout);resolve(req.result);};tx.onerror=tx.onabort=()=>{clearTimeout(timeout);reject(tx.error||new Error('Storage unavailable'));};}catch(e){clearTimeout(timeout);reject(e);}});}
async function persist(){let local=false,indexed=false;try{localStorage.setItem(STATE,JSON.stringify(Object.fromEntries(Object.entries(records).sort(([a],[b])=>a.localeCompare(b)))));local=true;}catch{}try{await disk('put','state',{records,connection});indexed=Boolean(db);}catch{}saveConnection();lastPersistOK=local||indexed;if(!lastPersistOK){error='Device storage is unavailable. Keep this tab open and save a backup.';status='Not saved on this device';}return lastPersistOK;}
function scheduleSync(){clearTimeout(timer);timer=setTimeout(()=>Store.sync(),450);}
async function commit(changes){await ready;const stamp=nextStamp(records,actor);for(const [key,value]of Object.entries(changes)){if(!validRecord(key,{value,stamp}))throw new Error('This goal or backup contains invalid values. Check its dates and steps.');}
 for(const [key,value]of Object.entries(changes))records[key]={value,stamp};recordsChanged(records);revision++;status='Saving…';notify();const saved=await persist();if(saved){status='Saved · syncing…';error='';}notify();scheduleSync();if(!saved)throw new Error('Could not save on this device. Keep this tab open and save a backup.');return true;
}
export const Store={
 get records(){return trackRecords(records);},get revision(){return revision;},get code(){return connection.code;},get status(){return status;},get error(){return error;},get last(){return last;},get ready(){return ready;},
 subscribe(f){listeners.add(f);},
 async set(key,value){return commit({[key]:value});},
 async setMany(changes){return commit(changes);},
 async setCompletion(id,date,done){await ready;return commit(completionChanges(records,id,date,done,dayKey(),{cascade:true}));},
 async setMissed(id,date,missed){await ready;return commit(missedChanges(records,id,date,missed));},
 async setRest(id,date,rest){await ready;return commit(restChanges(records,id,date,rest));},
 // Runs only on a board that has synced and has real check-offs, so a brand-new device can't
 // overwrite the real board's goals with merged copies of the starter goals.
 async migrate(){await ready;if(status!=='Synced'||!Object.entries(records).some(([k,r])=>k.startsWith('entry:')&&!r.stamp.endsWith(':seed')))return false;const changes=grindstoneMergeChanges(records);if(!changes)return false;await commit(changes);return true;},
 async moveOccurrence(id,date,to){await ready;return commit(moveChanges(records,id,date,to));},
 async cancelMove(id,date){await ready;return commit(cancelMoveChanges(records,id,date));},
 async setStep(id,date,step,done){await ready;return commit(stepChanges(records,id,date,step,done));},
 async saveGoal(goal,options){await ready;return commit(goalEditChanges(records,goal,options));},
 async archiveGoal(id,archived=true){await ready;return commit(archiveChanges(records,id,archived));},
 async init(){if(initializing)return initializing;initializing=(async()=>{
  try{db=await new Promise((resolve,reject)=>{let settled=false;const timeout=setTimeout(()=>{settled=true;reject(new Error('Storage blocked'));},4000);const req=indexedDB.open('blastforge',1);req.onupgradeneeded=()=>req.result.createObjectStore('settings');req.onsuccess=()=>{clearTimeout(timeout);if(settled){req.result.close();return;}settled=true;resolve(req.result);};req.onerror=req.onblocked=()=>{clearTimeout(timeout);settled=true;reject(req.error||new Error('Storage blocked'));};});db.onversionchange=()=>{db.close();db=null;};const saved=await disk('get','state');if(saved){records=mergeRecords(records,saved.records);if(!validCode(connection.code)&&validCode(saved.connection?.code))connection=saved.connection;}}catch{}
  if(!validCode(connection.code)&&validCode(cookieCode()))connection={code:cookieCode()};
  if(!validCode(connection.code))connection={code:random()};
  const params=new URLSearchParams(location.hash.slice(1)),incoming=params.get('connect');
  if(incoming&&validCode(cleanCode(incoming))){connection={code:cleanCode(incoming)};history.replaceState(null,'',location.pathname+location.search);}
  const saved=await persist();if(saved)status='Saved on this device';readyResolve();notify();await Store.sync();
 })();return initializing;},
 async sync(){await ready;if(busy)return busy;if(!validCode(connection.code))return false;const at=generation,code=connection.code;status='Syncing…';notify();
  busy=(async()=>{try{while(true){const sentRevision=revision,sent=Object.fromEntries(Object.entries(records).filter(([,r])=>r.stamp!=='0000000000000000:seed'));
   const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);let response,data;
   try{response=await fetch(SYNC_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,records:sent}),signal:controller.signal});if(!response.ok)throw new Error(`Sync returned ${response.status}`);data=await response.json();}finally{clearTimeout(timeout);}
   if(at!==generation)return false;if(!data.records||typeof data.records!=='object'||Array.isArray(data.records))throw new Error('Invalid sync response');
   for(const [k,r]of Object.entries(data.records))if(!validRecord(k,r))throw new Error('Invalid synced record');
   records=mergeRecords(records,data.records);const saved=await persist();last=Date.now();
   if(revision!==sentRevision){status='Syncing…';notify();continue;}
   status=saved?'Synced':'Synced · local storage unavailable';if(saved)error='';notify();return true;
  }}catch(e){if(at===generation){status=lastPersistOK?(navigator.onLine?'Saved · sync unavailable':'Saved · offline'):'Not saved on this device';if(lastPersistOK)error='Your changes stay on this device and will retry automatically.';notify();}return false;}finally{busy=null;if(at!==generation)scheduleSync();}})();return busy;
 },
 async connect(code){await ready;if(!validCode(code))throw new Error('Enter the 20-character connection code from your other device.');if(busy)await busy;generation++;connection={code};await persist();return Store.sync();},
 backup(){return {app:'blastforge',version:1,exported:new Date().toISOString(),connection:{code:connection.code},records:structuredClone(records)};},
 async restore(data){await ready;if(data?.app!=='blastforge'||data.version!==1||!data.records||typeof data.records!=='object'||Array.isArray(data.records)||Object.keys(data.records).length>20000)throw new Error('Choose a Blastforge backup.');for(const [key,r]of Object.entries(data.records))if(!validRecord(key,r))throw new Error('This backup contains invalid records.');records=mergeRecords(records,data.records);revision++;const saved=await persist();notify();scheduleSync();if(!saved)throw new Error('Backup merged in memory, but device storage is unavailable. Keep this tab open.');return true;}
};
window.addEventListener('online',()=>Store.sync());
window.addEventListener('storage',e=>{if(e.key===STATE){try{const incoming=JSON.parse(e.newValue),merged=mergeRecords(records,incoming);if(Object.entries(merged).some(([k,r])=>records[k]?.stamp!==r.stamp)){records=merged;revision++;notify();scheduleSync();}}catch{}}if(e.key===CONNECTION){try{const next=JSON.parse(e.newValue);if(validCode(next?.code)&&next.code!==connection.code){connection=next;generation++;notify();scheduleSync();}}catch{}}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)Store.sync();});
setInterval(()=>{if(!document.hidden)Store.sync();},30000);
