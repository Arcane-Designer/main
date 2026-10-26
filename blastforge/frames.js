// Filmstrip frames for the canvas games: a frame is {src, i, n} (frame i of an n-frame strip).
export function frameSet(cycle){
 if(!cycle?.length)return null;const imgs=new Map();for(const f of cycle)if(!imgs.has(f.src)){const im=new Image();im.src=f.src;imgs.set(f.src,im);}
 return {n:cycle.length,ready:i=>{const im=imgs.get(cycle[i%cycle.length].src);return im&&im.complete&&im.naturalWidth;},
  draw(ctx,i,x,y,w,h){const f=cycle[((i%cycle.length)+cycle.length)%cycle.length],im=imgs.get(f.src);if(!im||!im.complete||!im.naturalWidth)return false;const fw=im.naturalWidth/f.n,fh=im.naturalHeight;ctx.drawImage(im,fw*f.i,0,fw,fh,x,y,w,w*fh/fw);return true;}};
}
