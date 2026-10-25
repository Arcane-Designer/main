// Device-only presentation preference. Goal records and connection data are separate.
const KEY='blastforge-history-v1';
export function loadCollapsedDays(storage=globalThis.localStorage){
 try{const days=JSON.parse(storage.getItem(KEY));return new Set(Array.isArray(days)?days.filter(d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)):[]);}catch{return new Set();}
}
export function saveCollapsedDays(days,storage=globalThis.localStorage){
 try{storage.setItem(KEY,JSON.stringify([...days].sort()));return true;}catch{return false;}
}
