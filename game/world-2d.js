'use strict';
(() => {
 const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');
 const status=document.querySelector('.status'),overlay=document.querySelector('.locked');
 const tabs=[...document.querySelectorAll('[data-scene]')],controls=[...document.querySelectorAll('[data-direction]')];
 const W=canvas.width,H=canvas.height;
 const heroLayer=document.createElement('canvas');heroLayer.width=W;heroLayer.height=H;heroLayer.className='hero-layer';heroLayer.setAttribute('aria-hidden','true');canvas.parentElement.append(heroLayer);
 const heroCtx=heroLayer.getContext('2d');
 const scenes=[
  {name:'Спальня',file:'bedroom.png',spawn:.44,feet:.81,height:.47},
  {name:'Кабинет',file:'office.png',spawn:.49,feet:.81,height:.47},
  {name:'Главная площадь',file:'square.png',spawn:.4,feet:.81,height:.40},
  {name:'Общая столовая',file:'dining.png',spawn:.42,feet:.81,height:.46},
  {name:'Консильерг',file:'konsilyerg.png',locked:true}
 ];
 let current=0,x=W*.44,ready=false,lastTime=0,poses,walkPoses,walkPhase=0,walking=false;
 const heldKeys=new Set(),heldPointers=new Map();
 const directionForKey=k=>({ArrowLeft:-1,ArrowRight:1,a:-1,d:1,ф:-1,в:1})[k.toLowerCase?.()]||({ArrowLeft:-1,ArrowRight:1})[k]||0;
 function movement(){if(!ready||scenes[current].locked||window.WindowQuest?.isOpen||window.GameHUD?.isOpen)return 0;let left=false,right=false;for(const k of heldKeys){const d=directionForKey(k);left||=d===-1;right||=d===1;}for(const d of heldPointers.values()){left||=d===-1;right||=d===1;}return Number(right)-Number(left);}
 function resetInput(){heldKeys.clear();heldPointers.clear();walkPhase=0;walking=false;}
 function load(src){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('Не загрузилось изображение '+src));im.src=src;});}
 // The original sheet stays intact. Remove only edge-connected near-white background
 // in the in-memory sprite canvas, preserving light fabric enclosed by its outline.
 function poseFromSheet(sheet,left,right,top=0,bottom=1){
  const c=document.createElement('canvas');c.width=Math.round((right-left)*sheet.width);c.height=Math.round((bottom-top)*sheet.height);
  const q=c.getContext('2d',{willReadFrequently:true});q.drawImage(sheet,Math.round(left*sheet.width),Math.round(top*sheet.height),c.width,c.height,0,0,c.width,c.height);
  const im=q.getImageData(0,0,c.width,c.height),p=im.data,w=c.width,h=c.height,n=w*h;
  const seen=new Uint8Array(n),queue=new Int32Array(n);let start=0,end=0;
  function add(i){if(i<0||i>=n||seen[i])return;seen[i]=1;const j=i*4;if(p[j]>227&&p[j+1]>227&&p[j+2]>227&&Math.max(p[j],p[j+1],p[j+2])-Math.min(p[j],p[j+1],p[j+2])<23)queue[end++]=i;}
  for(let xx=0;xx<w;xx++){add(xx);add((h-1)*w+xx);}for(let yy=0;yy<h;yy++){add(yy*w);add(yy*w+w-1);}
  while(start<end){const i=queue[start++],xx=i%w;p[i*4+3]=0;if(xx>0)add(i-1);if(xx<w-1)add(i+1);add(i-w);add(i+w);}
  let minX=w,minY=h,maxX=-1,maxY=-1;
  for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++)if(p[(yy*w+xx)*4+3]){minX=Math.min(minX,xx);maxX=Math.max(maxX,xx);minY=Math.min(minY,yy);maxY=Math.max(maxY,yy);}
  q.putImageData(im,0,0);if(maxX<minX)throw new Error('Не удалось подготовить персонажа');
  const out=document.createElement('canvas');out.width=maxX-minX+1;out.height=maxY-minY+1;out.getContext('2d').drawImage(c,minX,minY,out.width,out.height,0,0,out.width,out.height);return out;
 }
 // Idle and walking come from the same sheet, with a common body scale.
 function prepareUnified(sheet,walkSheet){
  const cells=[];
  for(let i=0;i<9;i++){
   const source=i===0?sheet:walkSheet,columns=i===0?3:4,rows=i===0?3:2;
   const cell=i===0?0:i-1,col=cell%columns,row=Math.floor(cell/columns),w=Math.round(source.width/columns),h=Math.round(source.height/rows);
   const c=document.createElement('canvas');c.width=w;c.height=h;
   const q=c.getContext('2d',{willReadFrequently:true});
   q.drawImage(source,col*source.width/columns,row*source.height/rows,source.width/columns,source.height/rows,0,0,w,h);
   const data=q.getImageData(0,0,w,h);let left=w,right=0,top=h,bottom=0;
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const a=data.data[(y*w+x)*4+3];
    if(a<32)data.data[(y*w+x)*4+3]=0;
    if(a>128){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
   }
   q.putImageData(data,0,0);cells.push({c,left,right,top,bottom});
  }
  const height=Math.max(...cells.map(p=>p.bottom-p.top+1));
  const frames=cells.map(p=>{
   const c=document.createElement('canvas');c.width=height;c.height=height+8;
   // Anchor the head horizontally and the planted sole vertically.
   const q=p.c.getContext('2d'),data=q.getImageData(0,0,p.c.width,p.c.height).data;
   let l=p.c.width,r=0;
   for(let y=p.top;y<p.top+(p.bottom-p.top)*.17;y++)for(let x=0;x<p.c.width;x++)if(data[(y*p.c.width+x)*4+3]>128){l=Math.min(l,x);r=Math.max(r,x);}
   const scale=height/(p.bottom-p.top+1);
   c.getContext('2d').drawImage(p.c,height/2-(l+r)/2*scale,height+4-p.bottom*scale,p.c.width*scale,p.c.height*scale);return c;
  });
  // The sheet includes both halves of the gait in chronological order.
  // Do not reverse a full cycle: the planted and swinging legs change roles.
  // Hold the rear extreme briefly, matching the pause at the front.
  const right=[7,7,7,2,1,0,3,4,5,6].map(i=>frames[i+1]);
  const left=right.map(im=>{const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const q=c.getContext('2d');q.translate(c.width,0);q.scale(-1,1);q.drawImage(im,0,0);return c;});
  return {front:frames[0],left,right};
 }
 function refreshLocations(){
  const unlocked=window.WindowQuest.progress.bedroomComplete;
  scenes.forEach((scene,i)=>{scene.locked=i===4||(i>0&&!unlocked);const tab=tabs[i];tab.disabled=scene.locked;tab.textContent=(scene.locked?'🔒 ':'')+scene.name;tab.title=i===4?'Откроется после испытания на 5-м уровне Империи':scene.locked?'Сначала пройди все предметы спальни':scene.name;});
 }
 addEventListener('window-quest-progress',refreshLocations);
 refreshLocations();
 function selectScene(i){
  if(!Number.isInteger(i)||!scenes[i]||scenes[i].locked)return;
  current=i;window.GameHUD?.setScene(i);resetInput();x=W*(scenes[i].spawn||.5);
  tabs.forEach((b,j)=>b.setAttribute('aria-pressed',String(j===i)));
  overlay.hidden=!scenes[i].locked;
  controls.forEach(b=>b.disabled=!ready||!!scenes[i].locked);
  status.textContent=scenes[i].name;
  canvas.setAttribute('aria-label',scenes[i].locked?'Консильерг закрыт. Только просмотр.':'Анеллион: '+scenes[i].name+'. Стрелки влево и вправо — движение.');
  canvas.focus({preventScroll:true});draw();
 }
 // Relative travel during each pose: settle into the planted foot,
 // push off, then transfer weight. Average is one, preserving travel speed.
 const stepTravel=[.60,.60,.78,1.20,1.32,1.10,.94,1.04,1.28,1.14];
 function gaitTravel(phase){
  const position=phase*stepTravel.length,index=Math.floor(position),fraction=position-index;
  const ease=fraction*fraction*(3-2*fraction);
  return stepTravel[index%stepTravel.length]*(1-ease)+stepTravel[(index+1)%stepTravel.length]*ease;
 }
 function draw(){
  const scene=scenes[current];window.WindowQuest?.update(current,x,W);ctx.clearRect(0,0,W,H);heroCtx.clearRect(0,0,W,H);
  if(!scene.image){ctx.fillStyle='#241f18';ctx.fillRect(0,0,W,H);return;}
  // All selected scenes are 2:1. Cover prevents empty borders from pixel rounding.
  const scale=Math.max(W/scene.image.width,H/scene.image.height);
  ctx.drawImage(scene.image,(W-scene.image.width*scale)/2,(H-scene.image.height*scale)/2,scene.image.width*scale,scene.image.height*scale);
  if(!ready||scene.locked)return;
  const d=movement(),index=Math.floor(walkPhase*walkPoses.right.length)%walkPoses.right.length;
  const im=walking&&d?(d<0?walkPoses.left:walkPoses.right)[index]:poses.front;
  const height=H*scene.height,width=height*im.width/im.height;
  // Feet settle twice per full stride; the body rises slightly between contacts.
  const lift=walking?height*.009*(1-Math.cos(walkPhase*Math.PI*4))/2:0;
  heroCtx.drawImage(im,x-width/2,H*scene.feet-height-lift,width,height);
 }
 function frame(t){const dt=lastTime?Math.min((t-lastTime)/1000,.05):0;lastTime=t;
  if(ready&&!scenes[current].locked){
   const d=movement(),before=x;
   if(d){
    const speed=W*.22,stride=H*scenes[current].height*.85;
    const phaseRate=speed/stride*(55/80)*(8/walkPoses.right.length);
    const nextPhase=(walkPhase+phaseRate*dt)%1;
    const travel=gaitTravel((walkPhase+phaseRate*dt/2)%1);
    x=Math.max(75,Math.min(W-75,x+d*speed*travel*dt));
    walking=Math.abs(x-before)>.001;
    walkPhase=walking?nextPhase:0;
   }else{walking=false;walkPhase=0;}
  }else{walking=false;walkPhase=0;}
  draw();requestAnimationFrame(frame);
 }
 tabs.forEach(b=>b.addEventListener('click',()=>selectScene(Number(b.dataset.scene))));
 addEventListener('keydown',e=>{if(window.WindowQuest?.isOpen||window.GameHUD?.isOpen)return;if(!directionForKey(e.key)||e.ctrlKey||e.metaKey||e.altKey)return;if(e.target.closest?.('button')&&!e.target.matches('[data-direction]'))return;e.preventDefault();if(!scenes[current].locked)heldKeys.add(e.key);});
 addEventListener('window-quest-open',resetInput);
 addEventListener('window-quest-close',resetInput);
 addEventListener('keyup',e=>heldKeys.delete(e.key));addEventListener('blur',resetInput);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){resetInput();lastTime=0;}});
 canvas.addEventListener('pointerdown',()=>canvas.focus({preventScroll:true}));
 controls.forEach(b=>{
  b.addEventListener('pointerdown',e=>{if(b.disabled||!ready||scenes[current].locked)return;e.preventDefault();b.setPointerCapture(e.pointerId);heldPointers.set(e.pointerId,b.dataset.direction==='left'?-1:1);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,e=>heldPointers.delete(e.pointerId));
 });
 Promise.all([Promise.all(scenes.map(s=>load('assets-2d/'+s.file))),load('assets-2d/anellion-unified.png'),load('assets-2d/anellion-walk-complete.png')]).then(([images,sheet,walkSheet])=>{
  images.forEach((im,i)=>scenes[i].image=im);
  const unified=prepareUnified(sheet,walkSheet);poses={front:unified.front};walkPoses=unified;
  ready=true;selectScene(current);requestAnimationFrame(frame);
 }).catch(e=>{status.textContent='Не удалось открыть игру: '+e.message;console.error(e);draw();});
})();
