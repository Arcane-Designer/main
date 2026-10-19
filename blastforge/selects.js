// Keep real selects for form values; give their visible controls a shared material treatment.
export function enhanceSelects(root){
 const controls=[];
 function closeAll(focus=false){for(const c of controls){if(!c.list.hidden){c.list.hidden=true;c.button.setAttribute('aria-expanded','false');if(focus)c.button.focus();}}}
 function refresh(){for(const c of controls){c.button.querySelector('.selected-value').textContent=c.select.selectedOptions[0]?.textContent||'';c.button.setAttribute('aria-label',`${c.name}: ${c.select.selectedOptions[0]?.textContent||''}`);c.list.replaceChildren(...[...c.select.options].map(option=>{const b=document.createElement('button');b.type='button';b.role='option';b.tabIndex=-1;b.textContent=option.textContent;b.dataset.value=option.value;b.setAttribute('aria-selected',String(option.selected));b.addEventListener('click',()=>{c.select.value=option.value;closeAll();c.select.dispatchEvent(new Event('change',{bubbles:true}));refresh();c.button.focus();});return b;}));}}
 for(const [i,select] of [...root.querySelectorAll('select')].entries()){
  const label=select.closest('label'),name=label.firstChild.textContent.trim();
  const wrapper=document.createElement('div');wrapper.className='select-field';select.before(wrapper);wrapper.append(select);select.hidden=true;
  const button=document.createElement('button');button.type='button';button.className='forged-select';button.setAttribute('aria-label',name);button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-expanded','false');button.innerHTML='<span class="selected-value"></span><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>';
  const list=document.createElement('div');list.className='select-options';list.role='listbox';list.id=`goal-select-${i}`;list.setAttribute('aria-label',name);list.hidden=true;button.setAttribute('aria-controls',list.id);wrapper.append(button,list);
  const c={select,button,list,name};controls.push(c);
  const open=()=>{closeAll();list.hidden=false;button.setAttribute('aria-expanded','true');const options=[...list.children];(options.find(o=>o.getAttribute('aria-selected')==='true')||options[0])?.focus();};
  button.addEventListener('click',()=>list.hidden?open():closeAll());
  button.addEventListener('keydown',e=>{if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();open();}});
  list.addEventListener('keydown',e=>{const options=[...list.children],index=options.indexOf(document.activeElement);if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();options[e.key==='Home'?0:e.key==='End'?options.length-1:(index+(e.key==='ArrowDown'?1:-1)+options.length)%options.length]?.focus();}else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeAll(true);}else if(e.key==='Tab')closeAll();else if(e.key.length===1&&/[a-z]/i.test(e.key)){options.find((o,i)=>i>index&&o.textContent.toLowerCase().startsWith(e.key.toLowerCase()))?.focus();}});
 }
 root.addEventListener('click',e=>{if(!e.target.closest('.select-field'))closeAll();});
 root.closest('dialog').addEventListener('close',()=>closeAll());
 refresh();return {refresh,close:closeAll};
}
