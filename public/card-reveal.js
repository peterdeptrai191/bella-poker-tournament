import {effectsReduced} from './visual-effects.js';
// GOAT or BOAT prize reveal: walking out of a stadium tunnel, 18 seconds for every card.
//  0 s     dark tunnel, ceiling lights rush past, the crowd murmurs
//  2 s     the gate at the end rolls open slowly (5 s) with a heavy rumble and a long whoosh; light floods in
//  7 s     sparkler fountains fire on both sides of the gate; a red carpet unrolls from the gate toward you
//  10 s    a face-down card in the prize's colour comes slowly from the far end
//  14 s    the card glows white-hot …
//  14.8 s  … and turns into the skin; big fireworks, the crowd at its loudest
//  15 s    sparkles run round the edge of the screen
//  18 s    name and "Nhận thẻ"
// The colour shown from 10 s is always the real colour of the prize.
import {animatedCharacter} from './character-motion.js';
import {playSound,playShaped,gateSound,whoosh} from './pot-fx.js';
import {potwCard} from './spin-wheel.js';
import {duckMusic} from './settings.js';
import {cardFace} from './card-face.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reduced=()=>effectsReduced();
const lerp=(a,b,t)=>a+(b-a)*t;

// A dark layer that fades in over `ms`.
export function dimmer(host){
 const el=document.createElement('div');el.className='reveal-dim';host.append(el);
 return {fade(ms){el.style.transitionDuration=Math.max(200,ms)+'ms';requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add('on')));},remove(){el.remove();}};
}

// One particle engine for the sparkler fountains and the fireworks.
export function sparks(canvas){
 const ctx=canvas.getContext('2d'),dpr=Math.min(1.5,devicePixelRatio||1),W=canvas.width=innerWidth*dpr,H=canvas.height=innerHeight*dpr,parts=[],jobs=[];let running=true;
 const COLORS=['#ffd34d','#ff2d55','#ffffff','#ff8a3d','#ff5fae','#7cc4ff','#b98cff'];
 const add=(x,y,vx,vy,c,life=1,size=2.2,drag=.985,grav=.06)=>parts.push({x,y,vx,vy,c,life,size,drag,grav});
 const burst=(x,y,n=120,power=1)=>{const c=COLORS[Math.floor(Math.random()*COLORS.length)],c2=COLORS[Math.floor(Math.random()*COLORS.length)];for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=(1.5+Math.random()*6)*dpr*power;add(x,y,Math.cos(a)*v,Math.sin(a)*v,i%3?c:c2,1,2.6*dpr);}};
 let awake=false,until=0;
 const wake=ms=>{until=Math.max(until,performance.now()+ms+2500);if(!awake&&running){awake=true;requestAnimationFrame(loop);}};
 const loop=t=>{if(!running){awake=false;return;}if(t>until&&!parts.length){awake=false;ctx.clearRect(0,0,W,H);return;}for(const j of jobs)j(t);
  ctx.globalCompositeOperation='destination-out';ctx.fillStyle='rgba(0,0,0,.24)';ctx.fillRect(0,0,W,H);ctx.globalCompositeOperation='lighter';
  for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.x+=p.vx;p.y+=p.vy;p.vy+=p.grav*dpr;p.vx*=p.drag;p.vy*=p.drag;p.life-=.014;if(p.life<=0){parts.splice(i,1);continue;}ctx.globalAlpha=Math.min(1,p.life*1.4);ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,7);ctx.fill();}
  requestAnimationFrame(loop);};
 return {
  // golden sparks shooting up from two points for `ms`
  // rockets fired from the bottom left and right corners: a smoky trail up, then a burst that falls and fades
  rockets(ms){wake(ms);const end=performance.now()+ms;let next=0,side=1;jobs.push(t=>{if(t>end||t<next)return;next=t+260+Math.random()*200;side=-side;
   const x=side<0?W*(.02+Math.random()*.08):W*(.9+Math.random()*.08),y=H*1.02,tx=side<0?W*(.12+Math.random()*.3):W*(.58+Math.random()*.3),ty=H*(.08+Math.random()*.3),steps=48;
   let k=0;const fly=()=>{k++;const px=lerp(x,tx,k/steps),py=lerp(y,ty,1-Math.pow(1-k/steps,2));add(px,py,(Math.random()-.5)*.6*dpr,.6*dpr,'#ffe2a8',.55,1.4*dpr,.96,.02);add(px,py,0,0,'#7a6a66',.35,2.6*dpr,.9,-.01);
    if(k<steps)requestAnimationFrame(fly);else{const c=COLORS[Math.floor(Math.random()*COLORS.length)];for(let i=0;i<95;i++){const a=Math.random()*Math.PI*2,v=(1+Math.random()*4.2)*dpr;add(px,py,Math.cos(a)*v,Math.sin(a)*v,i%4?c:'#fff',1,2*dpr,.975,.05);}}};
   requestAnimationFrame(fly);});},
  fountains(points,ms){wake(ms);const end=performance.now()+ms;jobs.push(t=>{if(t>end)return;for(const [x,y] of points)for(let k=0;k<2;k++)add(x*dpr,y*dpr,(Math.random()-.5)*1.6*dpr,-(3.5+Math.random()*3.5)*dpr,Math.random()<.2?'#ffffff':'#ffc94a',.75,1.4*dpr,.99,.08);});},
  // big fireworks all over the top of the screen for `ms`
  fireworks(ms){wake(ms);const end=performance.now()+ms;let next=0;jobs.push(t=>{if(t>end||t<next)return;next=t+300+Math.random()*250;burst(W*(.1+Math.random()*.8),H*(.06+Math.random()*.3),100,1.05);});burst(W*.25,H*.2,140,1.25);burst(W*.75,H*.18,140,1.25);},
  stop(){running=false;}
 };
}

// Red carpet and gold posts with velvet ropes, drawn in screen pixels so circles stay round.
// The tunnel exit is the middle 30% of the screen; the carpet runs from its bottom edge (y = 65%) to you.
function carpetScene(){
 const W=innerWidth,H=innerHeight,y0=H*.65,cx=W/2,halfAt=y=>lerp(W*.07,W*.4,(y-y0)/(H-y0)),scaleAt=y=>halfAt(y)/(W*.4);
 const trimAt=y=>lerp(2,14,(y-y0)/(H-y0));
 const quad=(y1,y2,f)=>`${f(y1,-1)} ${f(y1,1)} ${f(y2,1)} ${f(y2,-1)}`;
 const edge=(y,side,off=0)=>`${(cx+side*(halfAt(y)+off)).toFixed(1)},${y.toFixed(1)}`;
 const trimL=`${edge(y0,-1)} ${edge(y0,-1,-trimAt(y0))} ${edge(H,-1,-trimAt(H))} ${edge(H,-1)}`,trimR=`${edge(y0,1)} ${edge(y0,1,-trimAt(y0))} ${edge(H,1,-trimAt(H))} ${edge(H,1)}`;
 const velvet=`${edge(y0,-1,-trimAt(y0))} ${edge(y0,1,-trimAt(y0))} ${edge(H,1,-trimAt(H))} ${edge(H,-1,-trimAt(H))}`;
 // people behind the ropes: mostly fans (some arms up with phone lights), every third one a photographer
 let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;const people=[];
 for(const side of [-1,1])for(let row=2;row>=0;row--)for(let i=0;i<11;i++){const t=.02+i*.085+row*.012+rnd()*.02;if(t>.95)continue;const y=lerp(y0,H*1.02,t),s=scaleAt(y);
  people.push({y,s,x:cx+side*(halfAt(y)+(46+row*30+rnd()*10)*s),h:H*(.16+rnd()*.03)*s,side,row,kind:(i+row+(side>0?1:0))%3===0?'press':'fan',arm:rnd()<.45,phone:rnd()<.6,d:(rnd()*3).toFixed(2)});}
 people.sort((a,b)=>a.y-b.y||b.row-a.row);const lights=[];let ph=0,fl=0;  // only every other phone / camera gets a light
 const person=p=>{const {x,y,h,s}=p,hy=y-h*.84,bob=`style="--d:-${p.d}s"`;let extra='';
  if(p.kind==='fan'&&p.arm){const ax=x-p.side*h*.14,top=y-h*1.12;extra=`<path d="M${x-p.side*h*.1} ${y-h*.56} L${ax} ${top}" stroke="#050506" stroke-width="${h*.07}" stroke-linecap="round"/>`+(p.phone?`<rect x="${ax-h*.04}" y="${top-h*.1}" width="${h*.08}" height="${h*.12}" rx="${h*.015}" fill="#fffbe0"/>`:'');if(p.phone&&ph++%2===0)lights.push(`<i class="cp-phone" style="left:${ax}px;top:${top-h*.04}px;width:${h*.16}px;height:${h*.2}px;--d:-${p.d}s"></i>`);}
  if(p.kind==='press')extra=`<rect x="${x-p.side*h*.18-h*.12}" y="${hy-h*.04}" width="${h*.24}" height="${h*.15}" rx="${h*.02}" fill="#050506"/><circle cx="${x-p.side*h*.32}" cy="${hy+h*.03}" r="${h*.055}" fill="#16161a"/>`;if(fl++%2===0)lights.push(`<i class="cp-flash" style="left:${x-p.side*h*.2}px;top:${hy-h*.08}px;width:${h}px;height:${h}px;--d:-${p.d}s"></i>`);
  return `<g><path d="M${x-h*.25} ${y}Q${x-h*.27} ${y-h*.6} ${x} ${y-h*.64}Q${x+h*.27} ${y-h*.6} ${x+h*.25} ${y}Z" fill="#050506" stroke="#ff6a7c40" stroke-width="1"/><ellipse cx="${x}" cy="${hy}" rx="${h*.11}" ry="${h*.13}" fill="#050506" stroke="#ff6a7c40" stroke-width="1"/>${extra}</g>`;};
 const posts=[.06,.2,.42,.78].map(t=>{const y=lerp(y0,H*1.02,t),s=scaleAt(y);return {y,s,h:H*.2*s,side:[-1,1].map(side=>cx+side*(halfAt(y)+22*s))};});
 const post=(x,p)=>{const {y,s,h}=p,w=7*s;return `<ellipse cx="${x}" cy="${y+2*s}" rx="${16*s}" ry="${4.5*s}" fill="#000" opacity=".55" filter="url(#cp-blur)"/><ellipse cx="${x}" cy="${y}" rx="${11*s}" ry="${3.6*s}" fill="url(#cp-goldH)"/><rect x="${x-w/2}" y="${y-h}" width="${w}" height="${h}" fill="url(#cp-goldH)"/><ellipse cx="${x}" cy="${y-h*.55}" rx="${w*.75}" ry="${1.6*s}" fill="url(#cp-goldH)"/><circle cx="${x}" cy="${y-h-4*s}" r="${6.5*s}" fill="url(#cp-knob)"/>`;};
 const rope=(a,b,side)=>{const xa=a.side[side],xb=b.side[side],ya=a.y-a.h+2*a.s,yb=b.y-b.h+2*b.s,s=(a.s+b.s)/2,mx=(xa+xb)/2,my=(ya+yb)/2+H*.05*s;
  return `<path d="M${xa} ${ya} Q${mx} ${my} ${xb} ${yb}" stroke="#2a0207" stroke-width="${7*s}" fill="none" stroke-linecap="round" opacity=".6" transform="translate(0 ${3*s})"/><path d="M${xa} ${ya} Q${mx} ${my} ${xb} ${yb}" stroke="url(#cp-rope)" stroke-width="${6*s}" fill="none" stroke-linecap="round"/><path d="M${xa} ${ya-1.5*s} Q${mx} ${my-1.5*s} ${xb} ${yb-1.5*s}" stroke="#ff8a98" stroke-width="${1.4*s}" fill="none" opacity=".55" stroke-linecap="round"/>`;};
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>
  <filter id="cp-blur"><feGaussianBlur stdDeviation="3"/></filter>
  <filter id="cp-nap"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .22 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
  <linearGradient id="cp-velvet" x1="0" y1="${y0}" x2="0" y2="${H}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#1c0206"/><stop offset=".35" stop-color="#4a0610"/><stop offset=".75" stop-color="#7a0c1c"/><stop offset="1" stop-color="#9c1226"/></linearGradient>
  <linearGradient id="cp-sheen" x1="${cx-halfAt(H)}" y1="0" x2="${cx+halfAt(H)}" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset=".3" stop-color="#000" stop-opacity="0"/><stop offset=".5" stop-color="#ff9aa8" stop-opacity=".16"/><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></linearGradient>
  <linearGradient id="cp-trim" x1="0" y1="${y0}" x2="0" y2="${H}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#5e4512"/><stop offset=".6" stop-color="#c79a3a"/><stop offset="1" stop-color="#ffe39a"/></linearGradient>
  <linearGradient id="cp-goldH" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6e4f14"/><stop offset=".3" stop-color="#ffe9a8"/><stop offset=".55" stop-color="#d4a640"/><stop offset="1" stop-color="#5a400f"/></linearGradient>
  <radialGradient id="cp-knob" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff6d6"/><stop offset=".35" stop-color="#e9c060"/><stop offset="1" stop-color="#6b4c12"/></radialGradient>
  <linearGradient id="cp-rope" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c41a33"/><stop offset="1" stop-color="#5a0612"/></linearGradient>
  <linearGradient id="cp-roll" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7a8c"/><stop offset=".25" stop-color="#b3132b"/><stop offset=".7" stop-color="#5a0612"/><stop offset="1" stop-color="#2a0207"/></linearGradient>
  <radialGradient id="cp-flashg"><stop offset="0" stop-color="#fff"/><stop offset=".18" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
  <g><polygon points="${edge(y0,-1,4)} ${edge(y0,1,4)} ${edge(H,1,20)} ${edge(H,-1,20)}" fill="#000" opacity=".6" filter="url(#cp-blur)"/>
  <polygon points="${trimL}" fill="url(#cp-trim)"/><polygon points="${trimR}" fill="url(#cp-trim)"/><polygon points="${velvet}" fill="url(#cp-velvet)"/><polygon points="${velvet}" fill="url(#cp-sheen)"/><polygon points="${velvet}" fill="#fff" filter="url(#cp-nap)"/></g>
  <g>${people.map(person).join('')}</g><g>${posts.map((p,i)=>`<g>${i?[0,1].map(side=>rope(posts[i-1],p,side)).join(''):''}${p.side.map(x=>post(x,p)).join('')}</g>`).join('')}</g></svg>`;
 // The whole carpet scene is painted once into a picture; unrolling only moves a clip edge and the roll,
 // both on the compositor, so it stays smooth on slow phones.
 const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
 const html=`<div class="tn-carpet" aria-hidden="true"><div class="cp-reveal"><img src="${url}" alt="" decoding="async">${lights.join('')}</div><i class="cp-roll"></i></div>`;
 const ease=k=>Math.pow(k,1.7),N=14;
 const unroll=(root,ms)=>{const rv=root.querySelector('.cp-reveal'),roll=root.querySelector('.cp-roll'),frames=[],rframes=[];
  for(let i=0;i<=N;i++){const k=i/N,y=lerp(y0,H+40,ease(k)),yy=Math.min(y,H),hw=halfAt(yy)+2,r=9*scaleAt(yy)+3;
   frames.push({clipPath:`inset(0 0 ${Math.max(0,H-y)}px 0)`,offset:k});
   rframes.push({transform:`translate(${cx-hw}px,${y-r}px) scale(${hw*2/100},${r*2/20})`,opacity:k<1?1:0,offset:k});}
  rv.animate(frames,{duration:ms,fill:'forwards',easing:'linear'});roll.animate(rframes,{duration:ms,fill:'forwards',easing:'linear'});};
 const finish=root=>{root.querySelector('.cp-reveal').style.clipPath='none';root.querySelector('.cp-roll').style.opacity=0;};
 const cleanup=()=>URL.revokeObjectURL(url);
 return {svg:html,unroll,finish,cleanup,gate:[[W*.35+6,H*.65],[W*.65-6,H*.65]]};
}
const EDGE_STARS=Array.from({length:44},(_,i)=>{const side=i%4,t=((i*37)%100)/100;const [x,y]=side===0?[t*100,1.5]:side===1?[98.5,t*100]:side===2?[t*100,98.5]:[1.5,t*100];return `<i style="left:${x}%;top:${y}%;--d:${-(i*.13)%1.2}s;--s:${.6+((i*7)%5)/6}"></i>`;}).join('');

// Shows the card; resolves when the player taps "Nhận thẻ".
export function revealCard(host,c,tier,{duplicate=false}={}){
 return new Promise(done=>{
  const scene=carpetScene(),el=document.createElement('div');el.className='reveal';el.dataset.tier=tier;el.setAttribute('role','dialog');el.setAttribute('aria-label','Phần thưởng: '+c.name);
  el.innerHTML=`<div class="rv-tunnel" aria-hidden="true"><i class="tn-ceil"></i><i class="tn-floor"></i><i class="tn-wall l"></i><i class="tn-wall r"></i>
   <div class="tn-ribs">${Array.from({length:7},(_,i)=>`<i style="--d:${-i*.3}s"></i>`).join('')}</div>
   <div class="tn-exit"><div class="tn-light"></div><i class="tn-gate l"></i><i class="tn-gate r"></i></div>${scene.svg}<div class="tn-haze"></div></div>
  <canvas class="rv-fire"></canvas>
  <div class="rv-card" data-tier="${tier}"><div class="rv-face rv-back">${potwCard(tier)}</div><div class="rv-face rv-front">${cardFace(c,animatedCharacter(c,'rv-art'))}</div><div class="rv-white"></div></div>
  <div class="rv-flash"></div><div class="rv-edge" aria-hidden="true">${EDGE_STARS}</div>
  <div class="rv-info"><strong>${esc(c.name)}</strong><span>${duplicate?'Bạn đã có skin này rồi (không hoàn coin).':'Skin mới đã vào bộ sưu tập!'}</span><button type="button" class="cr7-gold rv-ok">Nhận thẻ</button></div>`;
  host.append(el);
  const fx=sparks(el.querySelector('.rv-fire'));
  const steps=[['s-walk',100],['s-gate',2000],['s-carpet',7000],['s-approach',10000],['s-glow',14000],['s-flip',14800],['s-celebrate',15000],['s-done',18000]];
  const timers=[],crowd=[];
  const apply=name=>{el.classList.add(name);
   if(name==='s-gate'){gateSound(5000,1);whoosh({volume:1.6,ms:5200});}
   if(name==='s-carpet'){scene.unroll(el,3000);fx.rockets(3600);whoosh({volume:.7,ms:2600});}
   if(name==='s-approach')whoosh({volume:.6,ms:3800});
   if(name==='s-glow')whoosh({volume:.9,ms:900});
   if(name==='s-flip'){playSound('win',{volume:1});fx.fireworks(3600);}};
  if(reduced()){el.classList.add('s-instant',...steps.map(s=>s[0]));scene.finish(el);}
  else{
   // the crowd: a murmur in the tunnel that grows, then a second wave timed so the loudest roar lands
   // exactly when the card turns into the skin (the recording is 10.7 s, the show 18 s)
   crowd.push(playShaped('crowd',[[0,.08],[2,.16],[7,.35],[10,.5],[10.7,0]]));
   crowd.push(playShaped('crowd',[[0,0],[1.4,.45],[3,.6],[5.2,1.05],[8.5,1.05],[10.7,0]],{delay:9600}));
   // the Champions League-style anthem: its last 16 s start as the gate opens, so the final big chord
   // (12.8 s into the clip) lands exactly when the card glows and turns into the skin
   crowd.push(playShaped('anthem',[[0,.0],[1.2,.35],[5,.55],[9,.75],[12.6,1.15],[13.8,1.0],[16.2,0]],{delay:2000}));
   // the jazz in the background dips away as you walk into the tunnel and comes back softly after the reveal,
   // as the anthem's last chord fades, so the two never fight
   duckMusic(.06,2500);timers.push(setTimeout(()=>duckMusic(1,4500),15600));
   for(const [name,at] of steps)timers.push(setTimeout(()=>apply(name),at));
  }
  el.querySelector('.rv-ok').onclick=()=>{duckMusic(1,1500);el.classList.add('s-leaving');for(const c of crowd)c.peak(.5);setTimeout(()=>{fx.stop();scene.cleanup();el.remove();done();},250);};
 });
}
