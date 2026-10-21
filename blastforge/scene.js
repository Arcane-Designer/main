// Decorative only: no goal records, sync state, or connection identity are accessed.
const host=document.querySelector('.scene'),toggle=document.querySelector('#background-motion');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const preferenceKey='blastforge-background-motion-v1';
let enabled=true;try{enabled=localStorage.getItem(preferenceKey)!=='off';}catch{}
let video,attempting=false,failed=false;
function wanted(){return enabled&&!reduced.matches&&!document.hidden&&!failed;}
function stop(){video?.pause();host.classList.remove('is-animated');}
function setup(){
 video=document.createElement('video');video.muted=true;video.defaultMuted=true;video.autoplay=true;video.loop=true;video.playsInline=true;video.preload='none';video.disablePictureInPicture=true;
 video.setAttribute('muted','');video.setAttribute('playsinline','');video.setAttribute('webkit-playsinline','');video.setAttribute('aria-hidden','true');video.tabIndex=-1;
 video.addEventListener('playing',()=>{if(wanted())host.classList.add('is-animated');else stop();});
 video.addEventListener('error',()=>{failed=true;stop();update();});
 video.src=new URL('./assets/forge-loop.mp4',import.meta.url).href;host.append(video);
}
function update(){
 if(toggle){toggle.checked=enabled&&!reduced.matches&&!failed;toggle.disabled=reduced.matches||failed;toggle.title=reduced.matches?'Your device’s Reduce Motion setting is on.':failed?'Video is unavailable. The still background is shown.':'';}
 if(!wanted()){stop();return;}
 if(!video)setup();
 if(!video.paused||attempting)return;
 attempting=true;
 video.play().catch(()=>{host.classList.remove('is-animated');}).finally(()=>{attempting=false;});
}
if(host){
 toggle?.addEventListener('change',()=>{enabled=toggle.checked;try{localStorage.setItem(preferenceKey,enabled?'on':'off');}catch{}update();});
 document.addEventListener('visibilitychange',update);reduced.addEventListener('change',update);
 // iOS can require a user gesture in Low Power Mode; a later tap can start playback.
 document.addEventListener('pointerdown',()=>{if(wanted()&&video?.paused)update();},{passive:true});
 window.addEventListener('storage',e=>{if(e.key===preferenceKey){enabled=e.newValue!=='off';update();}});
 update();
}
