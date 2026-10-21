// Decorative only: no goal records, sync state, or connection identity are accessed.
const host=document.querySelector('.scene'),toggle=document.querySelector('#background-motion');
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),phone=matchMedia('(max-width: 540px)');
const preferenceKey='blastforge-background-motion-v1';
let enabled=true;try{enabled=localStorage.getItem(preferenceKey)!=='off';}catch{}
let canvas,gl,program,texture,image,frame=0,lastFrame=0,elapsed=0,lastTime=0,loadToken=0,failed=false;
const uniforms={};
const vertex=`attribute vec2 position;varying vec2 screenUV;void main(){screenUV=vec2((position.x+1.0)*0.5,(1.0-position.y)*0.5);gl_Position=vec4(position,0.0,1.0);}`;
const fragment=`precision highp float;
varying vec2 screenUV;uniform sampler2D artwork;uniform vec2 uvScale;uniform vec2 uvOffset;uniform vec2 imageSize;uniform float time;uniform float portrait;
float hash(float n){return fract(sin(n*12.9898+78.233)*43758.5453);}
float oval(vec2 uv,vec2 center,vec2 radius){return 1.0-smoothstep(0.05,1.0,length((uv-center)/radius));}
void main(){
 vec2 uv=screenUV*uvScale+uvOffset;
 vec2 torso=mix(vec2(0.665,0.638),vec2(0.405,0.726),portrait);
 vec2 torsoRadius=mix(vec2(0.105,0.082),vec2(0.245,0.087),portrait);
 float breath=0.5-0.5*cos(time*1.04719755);
 float body=oval(uv,torso,torsoRadius);
 vec2 displaced=uv;displaced.y+=body*breath*0.0035;displaced.x-=(uv.x-torso.x)*body*breath*0.009;
 vec2 fireCenter=mix(vec2(0.905,0.425),vec2(0.938,0.377),portrait);
 float fire=oval(uv,fireCenter,mix(vec2(0.090,0.135),vec2(0.132,0.115),portrait));
 displaced.x+=fire*(sin(time*2.6+uv.y*83.0)+sin(time*4.1+uv.y*137.0))*0.0011;
 displaced.y+=fire*sin(time*2.8+uv.x*77.0)*0.0012;
 vec3 color=texture2D(artwork,displaced).rgb;
 float warmth=0.5+0.3*sin(time*2.0)+0.2*sin(time*4.7+1.3);
 float orange=smoothstep(0.06,0.25,color.r-color.b);
 color+=vec3(0.038,0.014,0.002)*fire*orange*warmth;
 // Moving flakes are restricted to the window and blue outdoor pixels, not the room.
 float windowArea=portrait>0.5?step(uv.x,0.477)*step(uv.y,0.414):step(uv.x,0.392)*step(uv.y,0.437);
 float outdoor=smoothstep(0.015,0.10,color.b-color.r)*smoothstep(0.10,0.34,color.b)*windowArea;
 float flakes=0.0;
 if(outdoor>0.02){for(int i=0;i<28;i++){
  float id=float(i),x=0.025+hash(id+1.0)*mix(0.35,0.43,portrait);
  float y=mod(hash(id+41.0)*0.49+time*(0.008+hash(id+12.0)*0.011),0.49)-0.035;
  vec2 delta=(uv-vec2(x+sin(time*0.35+id)*0.004,y))*imageSize;
  float radius=0.7+hash(id+70.0)*1.4;
  flakes+=1.0-smoothstep(radius*0.3,radius+0.8,length(delta));
 }
 }
 color=mix(color,vec3(0.88,0.96,1.0),clamp(flakes*outdoor*0.65,0.0,0.75));
 gl_FragColor=vec4(color,1.0);
}`;
function wanted(){return enabled&&!reduced.matches&&!document.hidden&&!failed;}
function stop(){cancelAnimationFrame(frame);frame=0;lastTime=0;}
function fallback(){stop();failed=true;host.classList.remove('is-animated');if(toggle){toggle.disabled=true;toggle.checked=false;toggle.title='Background motion is unavailable in this browser.';}}
function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);return s;}
function setup(){
 canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');host.append(canvas);
 gl=canvas.getContext('webgl',{antialias:false,depth:false,stencil:false,preserveDrawingBuffer:true,powerPreference:'low-power'});if(!gl)throw Error('No WebGL');
 const vs=shader(gl.VERTEX_SHADER,vertex),fs=shader(gl.FRAGMENT_SHADER,fragment);program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.bindAttribLocation(program,0,'position');gl.linkProgram(program);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Background shader unavailable');
 gl.deleteShader(vs);gl.deleteShader(fs);gl.useProgram(program);
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
 for(const name of ['artwork','uvScale','uvOffset','imageSize','time','portrait'])uniforms[name]=gl.getUniformLocation(program,name);
 texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.uniform1i(uniforms.artwork,0);
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fallback();});
}
function resize(){
 if(!image||!gl)return;const rect=host.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,1.25);
 canvas.width=Math.round(rect.width*ratio);canvas.height=Math.round(rect.height*ratio);gl.viewport(0,0,canvas.width,canvas.height);
 const scale=Math.max(rect.width/image.width,rect.height/image.height),sx=rect.width/(image.width*scale),sy=rect.height/(image.height*scale);
 const px=phone.matches?0.5:rect.width>=1350?0.5:rect.width<=800?0.65:0.61,py=phone.matches?0:0.5;
 gl.uniform2f(uniforms.uvScale,sx,sy);gl.uniform2f(uniforms.uvOffset,(1-sx)*px,(1-sy)*py);gl.uniform2f(uniforms.imageSize,image.width,image.height);gl.uniform1f(uniforms.portrait,phone.matches?1:0);
}
function draw(now){
 if(!wanted()){stop();return;}frame=requestAnimationFrame(draw);
 if(now-lastFrame<1000/24)return;lastFrame=now-(now-lastFrame)%(1000/24);if(lastTime)elapsed+=Math.min((now-lastTime)/1000,0.1);lastTime=now;
 gl.uniform1f(uniforms.time,elapsed);gl.drawArrays(gl.TRIANGLES,0,6);
 host.classList.add('is-animated');
}
async function load(){
 const token=++loadToken;stop();host.classList.remove('is-animated');
 const next=new Image();next.src=new URL(phone.matches?'./assets/forge-phone.webp':'./assets/forge.webp',import.meta.url).href;
 await next.decode();if(token!==loadToken)return;image=next;gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);resize();if(wanted())frame=requestAnimationFrame(draw);
}
function update(){
 if(toggle){toggle.checked=enabled&&!reduced.matches;toggle.disabled=reduced.matches||failed;toggle.title=reduced.matches?'Your device’s Reduce Motion setting is on.':'';}
 if(!wanted()){stop();host.classList.remove('is-animated');return;}
 try{if(!gl){setup();load().catch(fallback);}else if(image&&!frame)frame=requestAnimationFrame(draw);}catch{fallback();}
}
if(host){
 toggle?.addEventListener('change',()=>{enabled=toggle.checked;try{localStorage.setItem(preferenceKey,enabled?'on':'off');}catch{}update();});
 document.addEventListener('visibilitychange',update);reduced.addEventListener('change',update);
 phone.addEventListener('change',()=>{if(gl&&!failed)load().catch(fallback);});window.addEventListener('resize',resize,{passive:true});
 window.addEventListener('storage',e=>{if(e.key===preferenceKey){enabled=e.newValue!=='off';update();}});
 update();
}
