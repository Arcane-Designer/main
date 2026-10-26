// Goal categories. Six come built in; you can add your own, give each an icon, and pick which
// material its goals drop. Stored as whole numbers (the sync server only accepts those):
// metric:game:cat:<slug> = 1 (exists) or 0 (removed), catname:<slug>:<0-5> = the name, four
// characters per number, caticon:<slug> and catmat:<slug> = list position + 1.
import {value} from './core.js?v=16';
import {COMMON,MATERIALS,slug} from './game.js?v=16';
export const CAT_ICONS=['heart','dumbbell','run','book','brush','orbit','sun','leaf','music','code','briefcase','people','home','coin','gamepad','camera','chat','bed','water','quill','math','kana','flame','spark','anvil','bowl','moon','flag'];
export const BUILTIN=[
 {name:'Health',icon:'heart',mat:'herb'},{name:'Movement',icon:'dumbbell',mat:'iron'},{name:'Learning',icon:'book',mat:'moonstone'},
 {name:'Creative',icon:'brush',mat:'dye'},{name:'Hobbies',icon:'orbit',mat:'silk'},{name:'Personal',icon:'sun',mat:'amber'}
];
const CHARS=" abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'-.0123456789&/";
export const NAME_LEN=24;
export const cleanCategory=s=>[...String(s||'')].filter(c=>CHARS.includes(c)).join('').replace(/\s+/g,' ').trim().slice(0,NAME_LEN);
const K=k=>`metric:game:${k}`;
const int=(records,k)=>{const v=value(records,K(k),null);return Number.isInteger(v)?v:null;};
function readName(records,id){let s='';for(let i=0;i<6;i++){let v=int(records,`catname:${id}:${i}`)||0;for(let j=0;j<4;j++){const c=v%69;v=Math.floor(v/69);if(c)s+=CHARS[c-1];}}return s.trim();}
function nameChanges(id,name){const out={};for(let i=0;i<6;i++){let v=0;for(let j=3;j>=0;j--){const c=name[i*4+j];v=v*69+(c?CHARS.indexOf(c)+1:0);}out[K(`catname:${id}:${i}`)]=v;}return out;}
// Every category: built-ins (unless removed), your own, and any name a goal already uses.
export function categories(records,goals=[]){
 const list=[];const seen=new Set();
 const used=name=>goals.filter(g=>!g.archived&&g.category===name).length;
 for(const b of BUILTIN){const id=slug(b.name),state=int(records,`cat:${id}`);seen.add(id);if(state===0&&!used(b.name))continue;const icon=int(records,`caticon:${id}`),mat=int(records,`catmat:${id}`);list.push({...b,id,builtin:true,icon:CAT_ICONS[icon-1]||b.icon,mat:b.mat,used:used(b.name)});}
 for(const k of Object.keys(records)){const m=k.match(/^metric:game:cat:([a-z0-9-]+)$/);if(!m||seen.has(m[1]))continue;seen.add(m[1]);if(int(records,`cat:${m[1]}`)!==1)continue;const name=readName(records,m[1]);if(!name)continue;list.push({id:m[1],name,builtin:false,icon:CAT_ICONS[(int(records,`caticon:${m[1]}`)||0)-1]||'flag',mat:COMMON[(int(records,`catmat:${m[1]}`)||0)-1]||'amber',used:used(name)});}
 for(const g of goals){if(g.archived||!g.category||seen.has(slug(g.category)))continue;seen.add(slug(g.category));list.push({id:slug(g.category),name:g.category,builtin:false,icon:'flag',mat:'amber',used:used(g.category),loose:true});}
 return list;
}
export const categoryOf=(records,goals,name)=>categories(records,goals).find(c=>c.name===name)||{name,icon:'flag',mat:'amber',id:slug(name)};
export const categoryColor=c=>MATERIALS[c?.mat]?.color||'#d3b384';
// A new category. A name that matches one you already have (in any spelling) is refused, so an
// existing category's material, and what its past goals paid, never changes.
export function saveCategoryChanges(records,{name,icon,mat},goals=[]){
 const clean=cleanCategory(name);if(!clean)throw new Error('Give the category a name.');
 const id=slug(clean),builtin=BUILTIN.find(b=>slug(b.name)===id),existing=categories(records,goals).find(c=>c.id===id);
 if(existing)throw new Error(`You already have a ${existing.name} category.`);
 if(builtin)throw new Error(`${builtin.name} is already a category.`);
 const out={[K(`cat:${id}`)]:1,[K(`caticon:${id}`)]:Math.max(1,CAT_ICONS.indexOf(icon)+1)};
 if(!builtin){Object.assign(out,nameChanges(id,clean));out[K(`catmat:${id}`)]=Math.max(1,COMMON.indexOf(mat)+1);}
 return out;
}
export function removeCategoryChanges(records,goals,id){
 const c=categories(records,goals).find(x=>x.id===id);if(!c)throw new Error('That category is gone already.');
 if(c.used)throw new Error(`${c.used} goal${c.used>1?'s use':' uses'} ${c.name}. Move ${c.used>1?'them':'it'} to another category first.`);
 return {[K(`cat:${id}`)]:0};
}
