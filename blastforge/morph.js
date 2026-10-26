// Updates the page in place instead of rebuilding it, so a sync or a tap only changes what
// actually changed: pictures don't reload, open sections stay open, the text box you're typing
// in keeps its focus and running animations keep running.
// Elements marked data-own are added by scripts (the sliding glass) and are left alone.
// Elements with data-keep and an unchanged data-sig are kept exactly as they are.
// data-key lets an element be matched even when the list around it is reordered.
// Classes scripts add for a moment (a flash, a nudge, a stroke in progress) survive a patch.
const TRANSIENT=['forged','stroking','nudge','relic-ready','is-moving'];
const KEEP_ATTRS=new Set(['data-pose','data-x','data-dir','style']);
const keyOf=n=>n.nodeType===1?n.getAttribute('data-key')||n.getAttribute('data-keep')||null:null;
// Inline style is kept only where scripts move things (the den); elsewhere it follows the new HTML.
const keepAttr=(el,name)=>KEEP_ATTRS.has(name)&&(name!=='style'||Boolean(el.closest('.den-floor,[data-own]')));
export function morph(target,html){
 const t=document.createElement('template');t.innerHTML=html;patchChildren(target,t.content);
}
function same(a,b){return a.nodeType===b.nodeType&&a.nodeName===b.nodeName&&keyOf(a)===keyOf(b);}
function patchChildren(from,to){
 const keyed=new Map();for(const c of from.childNodes){const k=keyOf(c);if(k)keyed.set(k,c);}
 const wanted=new Set([...to.childNodes].map(keyOf).filter(Boolean));
 let cur=from.firstChild;
 for(const next of [...to.childNodes]){
  while(cur&&cur.nodeType===1&&(cur.hasAttribute('data-own')||(keyOf(cur)&&!wanted.has(keyOf(cur))))){const n=cur.nextSibling;if(!cur.hasAttribute('data-own'))cur.remove();cur=n;}
  const k=keyOf(next);let match=null;
  if(k){const found=keyed.get(k);if(found&&same(found,next))match=found;}
  else if(cur&&same(cur,next))match=cur;
  if(match){if(match!==cur)from.insertBefore(match,cur);patch(match,next);cur=match.nextSibling;}
  else from.insertBefore(next,cur);
 }
 while(cur){const n=cur.nextSibling;if(!(cur.nodeType===1&&cur.hasAttribute('data-own')))cur.remove();cur=n;}
}
function patch(a,b){
 if(a.nodeType===3||a.nodeType===8){if(a.nodeValue!==b.nodeValue)a.nodeValue=b.nodeValue;return;}
 if(a.nodeType!==1)return;
 if(a.hasAttribute('data-keep')&&a.getAttribute('data-sig')===b.getAttribute('data-sig'))return;
 const tag=a.nodeName,focused=a===document.activeElement;
 for(const {name}of [...a.attributes])if(!b.hasAttribute(name)&&!(tag==='DETAILS'&&name==='open')&&!keepAttr(a,name))a.removeAttribute(name);
 for(let {name,value}of [...b.attributes]){if(tag==='DETAILS'&&name==='open')continue;if(name==='class'){const keep=TRANSIENT.filter(c=>a.classList.contains(c)&&!value.split(' ').includes(c));if(keep.length)value=`${value} ${keep.join(' ')}`;}if(a.getAttribute(name)!==value)a.setAttribute(name,value);}
 if(tag==='INPUT'){
  if(a.type==='checkbox'||a.type==='radio')a.checked=b.hasAttribute('checked');
  else if(!focused&&b.hasAttribute('value')&&a.value!==b.getAttribute('value'))a.value=b.getAttribute('value');
  return;
 }
 if(tag==='TEXTAREA'){if(!focused&&a.value!==b.value)a.value=b.value;return;}
 patchChildren(a,b);
}
