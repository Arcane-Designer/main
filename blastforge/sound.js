// Sound, synthesized live with Web Audio, so there are no files to download and it works offline.
// On by default; the switch in Settings is remembered on this device.
const KEY='blastforge-sound-v1';
let ctx=null,master=null,verb=null,dry=null,noiseBuf=null;
export const soundOn=()=>{try{return localStorage.getItem(KEY)!=='0';}catch{return true;}};
export function setSound(on){try{localStorage.setItem(KEY,on?'1':'0');}catch{}if(on)unlock();}
function impulse(c,seconds=2.2,decay=3){const len=c.sampleRate*seconds,b=c.createBuffer(2,len,c.sampleRate);for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,decay);}return b;}
function setup(){
 if(ctx)return ctx;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
 ctx=new AC();master=ctx.createGain();master.gain.value=.55;
 const comp=ctx.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=4;comp.attack.value=.003;comp.release.value=.2;
 master.connect(comp);comp.connect(ctx.destination);
 dry=ctx.createGain();dry.connect(master);
 const conv=ctx.createConvolver();conv.buffer=impulse(ctx);verb=ctx.createGain();verb.gain.value=.28;verb.connect(conv);conv.connect(master);
 noiseBuf=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
 return ctx;
}
export function unlock(){if(!soundOn())return;const c=setup();if(c&&c.state==='suspended')c.resume().catch(()=>{});}
['pointerdown','keydown','touchend'].forEach(t=>addEventListener(t,unlock,{passive:true}));

// building blocks
function out(wet=.3){const g=ctx.createGain();g.connect(dry);if(wet){const s=ctx.createGain();s.gain.value=wet;g.connect(s);s.connect(verb);}return g;}
function env(g,t,a,peak,d,sustain=0){g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(peak,t+a);g.gain.exponentialRampToValueAtTime(Math.max(.0001,sustain||.0001),t+a+d);}
function tone({type='sine',f=440,f2=null,t=0,a=.005,d=.3,peak=.3,wet=.3,detune=0,glide=null}){const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+(glide||d));o.detune.value=detune;env(g,t,a,peak,d);o.connect(g);g.connect(out(wet));o.start(t);o.stop(t+a+d+.05);return o;}
function noise({t=0,a=.002,d=.2,peak=.3,type='bandpass',f=1200,f2=null,q=1,wet=.2}){const s=ctx.createBufferSource(),fl=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=noiseBuf;s.loop=true;fl.type=type;fl.frequency.setValueAtTime(f,t);if(f2)fl.frequency.exponentialRampToValueAtTime(f2,t+a+d);fl.Q.value=q;env(g,t,a,peak,d);s.connect(fl);fl.connect(g);g.connect(out(wet));s.start(t,Math.random()*.5);s.stop(t+a+d+.05);}
// A struck metal bar: inharmonic partials with their own decays.
function metal(t,f,peak=.25,len=1.4){[[1,1],[2.76,.6],[5.4,.35],[8.93,.2],[13.3,.1]].forEach(([r,amp],i)=>tone({f:f*r,t,a:.001,d:len/(1+i*.7),peak:peak*amp,wet:.45,detune:(Math.random()-.5)*8}));noise({t,d:.06,peak:peak*.9,f:4500,q:.7,wet:.3});}
const pent=[0,2,4,7,9,12,14,16,19,21,24];const note=(base,step)=>base*Math.pow(2,pent[step%pent.length]/12)*Math.pow(2,Math.floor(step/pent.length)*2);

const SOUNDS={
 // Taps are soft and woody: a short, low knock with a little air, never a beep.
 tap(t){noise({t,a:.001,d:.035,peak:.07,type:'bandpass',f:1700,q:.9,wet:.04});tone({type:'sine',f:240,f2:170,t,a:.002,d:.05,peak:.07,wet:.02});},
 nav(t){noise({t,a:.002,d:.05,peak:.06,type:'bandpass',f:1300,q:.8,wet:.06});tone({type:'sine',f:200,f2:150,t,a:.003,d:.07,peak:.08,wet:.04});noise({t:t+.012,a:.01,d:.09,peak:.025,type:'highpass',f:3500,wet:.12});},
 craftGoal(t){noise({t,a:.02,d:.32,peak:.16,f:300,f2:2600,q:.9,wet:.25});tone({type:'triangle',f:784,t:t+.04,d:.35,peak:.14});tone({type:'triangle',f:1175,t:t+.11,d:.5,peak:.12});tone({type:'sine',f:2350,t:t+.11,d:.6,peak:.04,wet:.6});},
 uncheck(t){tone({type:'triangle',f:600,f2:380,t,d:.16,peak:.07,wet:.1});},
 douse(t){noise({t,a:.01,d:.6,peak:.18,type:'highpass',f:3000,f2:900,q:.5,wet:.2});tone({type:'sine',f:220,f2:110,t,d:.4,peak:.08,wet:.1});},
 clang(t){metal(t,420,.28);},
 perfect(t){metal(t,520,.32,1.8);[0,2,4,7].forEach((s,i)=>tone({type:'triangle',f:note(1046,s),t:t+.06+i*.05,d:.5,peak:.07,wet:.6}));},
 miss(t){tone({type:'sine',f:140,f2:70,t,d:.25,peak:.25,wet:.05});noise({t,d:.12,peak:.12,type:'lowpass',f:600,wet:.05});},
 quench(t){noise({t,a:.01,d:1.4,peak:.22,type:'highpass',f:5000,f2:1200,q:.4,wet:.25});noise({t,a:.02,d:.5,peak:.08,f:800,q:3,wet:.2});},
 coin(t){[0,2,4,6].forEach((s,i)=>tone({type:'triangle',f:note(880,s),t:t+i*.06,d:.35,peak:.1,wet:.45}));tone({type:'sine',f:3520,t:t+.24,d:.6,peak:.03,wet:.8});},
 claim(t){[0,2,4,5,7].forEach((s,i)=>tone({type:'triangle',f:note(587,s),t:t+i*.07,d:.45,peak:.11,wet:.5}));metal(t+.38,880,.12,1.2);},
 craftItem(t){metal(t,360,.16,.6);metal(t+.18,380,.16,.6);metal(t+.36,400,.2,1);[0,4,7].forEach((s,i)=>tone({type:'triangle',f:note(784,s),t:t+.5+i*.05,d:.6,peak:.08,wet:.55}));},
 ember(t){tone({type:'sine',f:1200+Math.random()*500,f2:2400,t,d:.09,peak:.08,wet:.2});},
 gold(t){[0,4,7].forEach((s,i)=>tone({type:'triangle',f:note(1318,s),t:t+i*.04,d:.25,peak:.08,wet:.4}));},
 hurt(t){noise({t,d:.25,peak:.2,type:'lowpass',f:900,f2:200,wet:.1});tone({type:'square',f:180,f2:90,t,d:.18,peak:.04,wet:0});},
 splash(t){noise({t,a:.005,d:.5,peak:.3,type:'lowpass',f:1800,f2:300,q:.6,wet:.3});noise({t:t+.05,a:.02,d:.9,peak:.12,type:'highpass',f:2500,f2:900,wet:.4});tone({type:'sine',f:180,f2:60,t,d:.4,peak:.12,wet:.1});},
 thunder(t){noise({t,a:.01,d:.25,peak:.35,type:'lowpass',f:2400,f2:500,q:.5,wet:.5});noise({t:t+.08,a:.2,d:2.6,peak:.28,type:'lowpass',f:260,f2:70,q:.4,wet:.7});},
 zap(t){noise({t,a:.002,d:.18,peak:.25,type:'highpass',f:3000,wet:.3});tone({type:'square',f:120,f2:60,t,d:.2,peak:.05,wet:.1});},
 flap(t){noise({t,a:.01,d:.13,peak:.08,type:'lowpass',f:380,f2:1100,q:.7,wet:.08});},
 tick(t){noise({t,a:.001,d:.03,peak:.05,type:'bandpass',f:2600,q:1.2,wet:.1});tone({type:'sine',f:520,t,a:.002,d:.05,peak:.04,wet:.1});},
 // A soft, warm bloom for a successful pet.
 content(t,stage=0){[0,4,7].forEach((s,i)=>tone({type:'sine',f:(392-stage*30)*Math.pow(2,s/12),t:t+i*.06,a:.04,d:.9,peak:.035,wet:.6}));},
 whoosh(t){noise({t,a:.25,d:.9,peak:.2,f:300,f2:1800,q:.8,wet:.35});noise({t:t+.6,a:.2,d:.8,peak:.12,f:1800,f2:400,q:.8,wet:.35});},
 relic(t){[0,4,7,11,14].forEach((s,i)=>{tone({type:'sine',f:261.6*Math.pow(2,s/12),t:t+i*.09,a:.05,d:2.2,peak:.09,wet:.7});tone({type:'triangle',f:523.2*Math.pow(2,s/12),t:t+i*.09,a:.02,d:1.2,peak:.04,wet:.8,detune:7});});metal(t,1046,.12,2.4);noise({t,a:.4,d:1.5,peak:.06,f:6000,q:.5,wet:.8});},
 levelUp(t){[[0,0],[4,.12],[7,.24],[12,.36]].forEach(([s,dt])=>{tone({type:'sawtooth',f:392*Math.pow(2,s/12),t:t+dt,a:.02,d:.5,peak:.05,wet:.5});tone({type:'triangle',f:784*Math.pow(2,s/12),t:t+dt,a:.01,d:.6,peak:.07,wet:.5});});metal(t+.5,1568,.1,1.6);},
 // The dragon's voice deepens as they grow (stage 0-4). A coo is a soft, closed-mouth trill, not a whistle.
 coo(t,stage=0){const f=210/(1+stage*.22),o=ctx.createOscillator(),am=ctx.createOscillator(),ag=ctx.createGain(),g=ctx.createGain(),fl=ctx.createBiquadFilter();o.type='triangle';o.frequency.setValueAtTime(f,t);o.frequency.linearRampToValueAtTime(f*1.25,t+.12);o.frequency.linearRampToValueAtTime(f*1.05,t+.32);am.frequency.value=26-stage*2;ag.gain.value=.035;am.connect(ag);ag.connect(g.gain);fl.type='lowpass';fl.frequency.value=900-stage*90;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.07,t+.04);g.gain.linearRampToValueAtTime(0,t+.38);o.connect(fl);fl.connect(g);g.connect(out(.15));o.start(t);am.start(t);o.stop(t+.42);am.stop(t+.42);},
 chirp(t,stage=0){const f=1300/(1+stage*.32);const o=tone({type:'sine',f,f2:f*1.6,t,a:.01,d:.12,peak:.12,wet:.25,glide:.08});tone({type:'sine',f:f*1.5,f2:f*.9,t:t+.13,a:.01,d:.16,peak:.1,wet:.3});noise({t,d:.05,peak:.03,f:f*2,q:2,wet:.1});return o;},
 roar(t,stage=0){const f=300/(1+stage*.35),o=ctx.createOscillator(),lfo=ctx.createOscillator(),lg=ctx.createGain(),g=ctx.createGain(),fl=ctx.createBiquadFilter();o.type='sawtooth';o.frequency.setValueAtTime(f,t);o.frequency.linearRampToValueAtTime(f*1.4,t+.15);o.frequency.exponentialRampToValueAtTime(f*.7,t+.8);lfo.frequency.value=28;lg.gain.value=f*.08;lfo.connect(lg);lg.connect(o.frequency);fl.type='lowpass';fl.frequency.value=1600;fl.Q.value=4;env(g,t,.06,.14,.8);o.connect(fl);fl.connect(g);g.connect(out(.4));o.start(t);lfo.start(t);o.stop(t+1);lfo.stop(t+1);noise({t,a:.05,d:.7,peak:.08,f:900,q:.8,wet:.3});},
 // A purr: a babies' purr is light and quick; grown dragons rumble lower, slower and longer.
 purr(t,stage=0,len=1.1){const o=ctx.createOscillator(),am=ctx.createOscillator(),ag=ctx.createGain(),g=ctx.createGain(),fl=ctx.createBiquadFilter();o.type='sawtooth';o.frequency.value=78-stage*9;am.frequency.value=24-stage*2.5;ag.gain.value=.05;am.connect(ag);ag.connect(g.gain);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.06+stage*.006,t+.18);g.gain.setValueAtTime(.06+stage*.006,t+Math.max(.2,len-.35));g.gain.linearRampToValueAtTime(0,t+len);fl.type='lowpass';fl.frequency.value=420-stage*40;o.connect(fl);fl.connect(g);g.connect(out(.1));o.start(t);am.start(t);o.stop(t+len+.1);am.stop(t+len+.1);},
 // Eating: soft crunches, then a contented little coo.
 munch(t,stage=0){for(let i=0;i<3;i++)noise({t:t+i*.16,a:.004,d:.06,peak:.07,type:'bandpass',f:1100+Math.random()*500,q:1,wet:.04});SOUNDS.coo(t+.55,stage);},
 // Letting go of the bellows: a deep whump, a rush of flame and crackling sparks, bigger the longer you held (c 0..1).
 blast(t,c=0){const k=.45+c*.55;tone({type:'sine',f:110,f2:38,t,a:.004,d:.5+c*.3,peak:.22*k,wet:.15});noise({t,a:.01,d:.7+c*.6,peak:.24*k,type:'lowpass',f:2600,f2:300,q:.5,wet:.35});noise({t:t+.03,a:.03,d:.5+c*.4,peak:.1*k,f:1800,f2:700,q:.9,wet:.3});for(let i=0;i<5+Math.round(c*9);i++)noise({t:t+.08+Math.random()*(.5+c*.5),a:.001,d:.025,peak:.05+Math.random()*.05,type:'highpass',f:3000+Math.random()*2500,wet:.2});},
 flame(t){noise({t,a:.05,d:.6,peak:.2,type:'lowpass',f:500,f2:2200,wet:.3});noise({t:t+.05,a:.04,d:.5,peak:.08,f:2400,f2:900,q:1,wet:.3});},
 open(t){noise({t,a:.04,d:.3,peak:.08,f:400,f2:3000,q:1,wet:.4});tone({type:'sine',f:523,f2:784,t,d:.25,peak:.05,wet:.5});},
 error(t){tone({type:'triangle',f:330,t,d:.1,peak:.08,wet:.05});tone({type:'triangle',f:262,t:t+.1,d:.16,peak:.08,wet:.05});}
};
export function sfx(name,...args){
 if(!soundOn()||!SOUNDS[name])return;const c=setup();if(!c)return;if(c.state==='suspended')c.resume().catch(()=>{});
 try{SOUNDS[name](c.currentTime+.01,...args);}catch{}
}

// The bellows: a low roar that swells while you hold the fire. Returns {set(level 0..1), stop()}.
export function bellows(){
 if(!soundOn())return {set(){},stop(){}};const c=setup();if(!c)return {set(){},stop(){}};if(c.state==='suspended')c.resume().catch(()=>{});
 const src=c.createBufferSource(),fl=c.createBiquadFilter(),g=c.createGain();src.buffer=noiseBuf;src.loop=true;fl.type='lowpass';fl.frequency.value=260;fl.Q.value=.7;g.gain.setValueAtTime(0,c.currentTime);g.gain.linearRampToValueAtTime(.05,c.currentTime+.25);
 src.connect(fl);fl.connect(g);g.connect(out(.2));src.start();let done=false;
 return {set(v){if(done)return;const t=c.currentTime;g.gain.setTargetAtTime(.05+v*.11,t,.15);fl.frequency.setTargetAtTime(260+v*900,t,.2);},stop(){if(done)return;done=true;try{g.gain.cancelScheduledValues(c.currentTime);g.gain.setTargetAtTime(0,c.currentTime,.05);src.stop(c.currentTime+.3);}catch{}}};
}

// A looping bed of wind or rain under a game. Returns {set(level 0..1), stop()}.
export function ambience(kind='wind'){
 if(!soundOn())return {set(){},stop(){}};const c=setup();if(!c)return {set(){},stop(){}};
 const src=c.createBufferSource(),fl=c.createBiquadFilter(),g=c.createGain();src.buffer=noiseBuf;src.loop=true;
 fl.type=kind==='rain'?'highpass':'bandpass';fl.frequency.value=kind==='rain'?2500:500;fl.Q.value=kind==='rain'?.3:.8;g.gain.value=0;
 src.connect(fl);fl.connect(g);g.connect(out(.25));src.start();
 return {set(v){const t=c.currentTime;g.gain.setTargetAtTime(Math.max(0,Math.min(1,v))*(kind==='rain'?.05:.09),t,.3);if(kind==='wind')fl.frequency.setTargetAtTime(350+v*900,t,.4);},stop(){try{g.gain.setTargetAtTime(0,c.currentTime,.1);src.stop(c.currentTime+.4);}catch{}}};
}
