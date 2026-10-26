// A short guided tour for new players: a spotlight moves across the app and a card explains each part.
// It shows above everything (a popover), and can be replayed from Settings → How it works.
const STEPS=[
 {sel:'#add-goal',title:'Add a goal',text:'Start here. Daily habits, a few times a week, or one-time goals.'},
 {sel:'.main-nav .tabs',title:'Check them off',text:'Today shows what’s due. Every goal you finish heats the forge.',section:'goals'},
 {sel:'.brand',title:'The forge',text:'Tap the anvil to see your heat. Streaks make it burn hotter, and hotter pays more.'},
 {sel:'.game-nav [data-section="dragon"]',title:'Your dragon',text:'Goals grow your bond. Pet and feed them, and watch them grow from Baby to Elder.'},
 {sel:'.game-nav [data-section="craft"]',title:'Craft',text:'Spend embers and materials on treats, tools, gear and themes.'},
 {sel:'.game-nav [data-section="games"]',title:'Games',text:'Finish goals to open today’s rewarded run. After that, free play for scraps.'},
 {sel:'.game-nav [data-section="vault"]',title:'Vault',text:'Relics the forge makes for you, and achievements to claim.'},
 {sel:'.game-nav [data-section="isles"]',title:'Isles',text:'Once your dragon can fly, full days charge energy for flights to new islands.'},
 {sel:'#settings-open',title:'How it works',text:'Everything is explained in Settings, under How it works. You can replay this tour there too.'}
];
let active=null;
export const tourSeen=()=>{try{return localStorage.getItem('blastforge-tour-v1')==='1';}catch{return true;}};
export function startTour({go,done}={}){
 if(active)return;try{localStorage.setItem('blastforge-tour-v1','1');}catch{}
 go?.('goals');
 const box=document.createElement('div');box.className='tour';box.setAttribute('popover','manual');box.setAttribute('role','dialog');box.setAttribute('aria-label','App tour');
 box.innerHTML='<div class="tour-spot"></div><div class="tour-card" aria-live="polite"><span class="tour-count"></span><h3></h3><p></p><div class="tour-actions"><button type="button" class="quiet tour-skip">Skip</button><button type="button" class="quiet tour-back">Back</button><button type="button" class="primary tour-next">Next</button></div></div>';
 document.body.append(box);try{box.showPopover();}catch{}
 const spot=box.querySelector('.tour-spot'),card=box.querySelector('.tour-card');let i=0;
 const place=()=>{
  const step=STEPS[i],el=document.querySelector(step.sel);
  card.querySelector('.tour-count').textContent=`${i+1} of ${STEPS.length}`;card.querySelector('h3').textContent=step.title;card.querySelector('p').textContent=step.text;
  box.querySelector('.tour-back').hidden=i===0;box.querySelector('.tour-next').textContent=i===STEPS.length-1?'Let’s go':'Next';
  if(!el){spot.style.opacity='0';card.style.top='40%';return;}
  el.scrollIntoView({block:'nearest'});const r=el.getBoundingClientRect(),pad=6;
  Object.assign(spot.style,{opacity:'1',left:`${r.left-pad}px`,top:`${r.top-pad}px`,width:`${r.width+pad*2}px`,height:`${r.height+pad*2}px`});
  const cw=Math.min(340,innerWidth-24),below=r.bottom+14+card.offsetHeight<innerHeight-12;
  card.style.width=`${cw}px`;card.style.left=`${Math.max(12,Math.min(innerWidth-cw-12,r.left+r.width/2-cw/2))}px`;card.style.top=`${below?r.bottom+14:Math.max(12,r.top-14-card.offsetHeight)}px`;
  card.classList.remove('pop');void card.offsetWidth;card.classList.add('pop');
 };
 const end=()=>{removeEventListener('resize',place);try{box.hidePopover();}catch{}box.remove();active=null;done?.();};
 box.querySelector('.tour-next').onclick=()=>{if(++i>=STEPS.length)return end();place();};
 box.querySelector('.tour-back').onclick=()=>{i=Math.max(0,i-1);place();};
 box.querySelector('.tour-skip').onclick=end;
 box.addEventListener('keydown',e=>{if(e.key==='Escape')end();});
 addEventListener('resize',place);active=box;requestAnimationFrame(place);box.querySelector('.tour-next').focus({preventScroll:true});
}
