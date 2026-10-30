// GOAT or BOAT prize reveal: walking out of a stadium tunnel (about 10 seconds, every card).
//  0 s    the screen is dark; you walk down the tunnel (ceiling lights rush past), the crowd murmurs
//  2 s    the gate at the end rolls open with a heavy rumble and the pitch light floods in
//  5 s    a red carpet rolls out toward you, the tunnel lights take the card's colour
//  6.5 s  a face-down card in the card's colour (gold / purple / red) comes from the far end
//  8.5 s  the card flips and shows the skin; the crowd is at its loudest
//  9 s    sparkles run round the edge of the screen (fireworks too for a red card)
//  10 s   name and "Nhận thẻ"
// Tapping anywhere jumps to the end. The colour shown at 6.5 s is always the real colour of the prize.
import {animatedCharacter} from './character-motion.js';
import {playSound,playShaped,gateSound,whoosh} from './pot-fx.js';
import {potwCard} from './spin-wheel.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;

// A dark layer that fades in over `ms` (the time the light on the board needs to stop).
export function dimmer(host){
 const el=document.createElement('div');el.className='reveal-dim';host.append(el);
 return {fade(ms){el.style.transitionDuration=Math.max(200,ms)+'ms';requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add('on')));},remove(){el.remove();}};
}

function fireworks(canvas,ms=2600){
 const ctx=canvas.getContext('2d'),dpr=Math.min(2,devicePixelRatio||1),W=canvas.width=innerWidth*dpr,H=canvas.height=innerHeight*dpr,parts=[],colors=['#ffd34d','#ff2d55','#ffffff','#ff8a3d','#ff5fae'];
 const burst=()=>{const x=W*(.15+Math.random()*.7),y=H*(.1+Math.random()*.35),c=colors[Math.floor(Math.random()*colors.length)];for(let i=0;i<70;i++){const a=Math.random()*Math.PI*2,v=(2+Math.random()*5)*dpr;parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:1,c});}};
 const start=performance.now();let next=0;
 const frame=t=>{const e=t-start;if(e>next&&e<ms-700){burst();next=e+260+Math.random()*260;}
  ctx.globalCompositeOperation='destination-out';ctx.fillStyle='rgba(0,0,0,.22)';ctx.fillRect(0,0,W,H);ctx.globalCompositeOperation='lighter';
  for(const p of parts){p.x+=p.vx;p.y+=p.vy;p.vy+=.06*dpr;p.vx*=.985;p.life-=.012;if(p.life>0){ctx.globalAlpha=p.life;ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x,p.y,2.2*dpr,0,7);ctx.fill();}}
  if(e<ms+900)requestAnimationFrame(frame);else ctx.clearRect(0,0,W,H);};
 requestAnimationFrame(frame);
}

// Red carpet on the tunnel floor with gold edges and gold posts joined by velvet ropes.
// The tunnel exit is the middle 30% of the screen, so the floor runs from y=65 (far) to y=100 (near).
function carpetSVG(){
 const lerp=(a,b,t)=>a+(b-a)*t,posts=[.18,.45,.8].flatMap(t=>[[lerp(43,12,t),lerp(65,100,t),t],[lerp(57,88,t),lerp(65,100,t),t]]);
 const post=([x,y,t])=>{const h=4+t*16;return `<line x1="${x}" y1="${y}" x2="${x}" y2="${y-h}" class="cp-post" style="stroke-width:${1+t*4}px"/><circle cx="${x}" cy="${y-h}" r="${.4+t*1.2}" class="cp-knob"/>`;};
 const rope=(a,b)=>{const ha=4+a[2]*16,hb=4+b[2]*16,mx=(a[0]+b[0])/2,my=(a[1]-ha+b[1]-hb)/2+3+b[2]*5;return `<path d="M${a[0]} ${a[1]-ha} Q${mx} ${my} ${b[0]} ${b[1]-hb}" class="cp-rope" style="stroke-width:${1+b[2]*3}px"/>`;};
 const left=posts.filter((_,i)=>i%2===0),right=posts.filter((_,i)=>i%2===1);
 return `<svg class="tn-carpet" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="cp-velvet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a0309"/><stop offset=".45" stop-color="#5e0815"/><stop offset="1" stop-color="#8e0f22"/></linearGradient><linearGradient id="cp-sheen" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".35"/><stop offset=".5" stop-color="#ff6b7d" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient><linearGradient id="cp-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a5a1c"/><stop offset="1" stop-color="#f3cf6b"/></linearGradient></defs>
 <polygon points="43.4,65 56.6,65 92,100 8,100" fill="url(#cp-gold)"/><polygon points="44,65 56,65 89,100 11,100" fill="url(#cp-velvet)"/><polygon points="44,65 56,65 89,100 11,100" fill="url(#cp-sheen)"/>
 ${[...left.slice(1).map((p,i)=>rope(left[i],p)),...right.slice(1).map((p,i)=>rope(right[i],p))].join('')}${posts.map(post).join('')}</svg>`;
}
const EDGE_STARS=Array.from({length:44},(_,i)=>{const side=i%4,t=((i*37)%100)/100;const [x,y]=side===0?[t*100,1.5]:side===1?[98.5,t*100]:side===2?[t*100,98.5]:[1.5,t*100];return `<i style="left:${x}%;top:${y}%;--d:${-(i*.13)%1.2}s;--s:${.6+((i*7)%5)/6}"></i>`;}).join('');

// Shows the card; resolves when the player taps "Nhận thẻ".
export function revealCard(host,c,tier,{duplicate=false}={}){
 return new Promise(done=>{
  const el=document.createElement('div');el.className='reveal';el.dataset.tier=tier;el.setAttribute('role','dialog');el.setAttribute('aria-label','Phần thưởng: '+c.name);
  el.innerHTML=`<div class="rv-tunnel" aria-hidden="true"><i class="tn-ceil"></i><i class="tn-floor"></i><i class="tn-wall l"></i><i class="tn-wall r"></i>
   <div class="tn-ribs">${Array.from({length:7},(_,i)=>`<i style="--d:${-i*.3}s"></i>`).join('')}</div>
   <div class="tn-exit"><div class="tn-light"></div><i class="tn-gate l"></i><i class="tn-gate r"></i></div>${carpetSVG()}<div class="tn-haze"></div></div>
  <canvas class="rv-fire"></canvas>
  <div class="rv-card" data-tier="${tier}"><div class="rv-flip"><div class="rv-face rv-back">${potwCard(tier)}</div><div class="rv-face rv-front">${animatedCharacter(c,'rv-art')}</div></div></div>
  <div class="rv-flash"></div><div class="rv-edge" aria-hidden="true">${EDGE_STARS}</div>
  <div class="rv-info"><strong>${esc(c.name)}</strong><span>${duplicate?'Bạn đã có skin này rồi (không hoàn coin).':'Skin mới đã vào bộ sưu tập!'}</span><button type="button" class="cr7-gold rv-ok">Nhận thẻ</button></div><small class="rv-skip">Chạm để bỏ qua</small>`;
  host.append(el);
  const steps=[['s-walk',100],['s-gate',2000],['s-carpet',5000],['s-approach',6500],['s-flip',8500],['s-celebrate',9000],['s-done',10000]];
  const timers=[];let finished=false,crowd={peak(){},stop(){}};
  const apply=name=>{el.classList.add(name);
   if(name==='s-gate')gateSound(3000,.9);
   if(name==='s-carpet')whoosh({volume:.45,ms:900});
   if(name==='s-approach')whoosh({volume:.6,ms:1400});
   if(name==='s-flip')playSound('win',{volume:.9});
   if(name==='s-celebrate'&&tier==='red')fireworks(el.querySelector('.rv-fire'),3200);
   if(name==='s-done')finished=true;};
  const skip=()=>{if(finished)return;timers.forEach(clearTimeout);el.classList.add('s-instant',...steps.map(s=>s[0]));crowd.peak(1.3);if(tier==='red')fireworks(el.querySelector('.rv-fire'),2200);finished=true;};
  if(reduced()){el.classList.add('s-instant',...steps.map(s=>s[0]));finished=true;}
  else{
   // the crowd: a murmur in the tunnel, louder as the gate opens, at its loudest when the card turns over
   crowd=playShaped('crowd',[[0,.1],[2,.22],[5,.55],[6.5,.8],[8.5,1.45],[9.6,1.45],[10.7,0]]);
   for(const [name,at] of steps)timers.push(setTimeout(()=>apply(name),at));
  }
  el.addEventListener('click',e=>{if(e.target.closest('.rv-ok'))return;skip();});
  el.querySelector('.rv-ok').onclick=()=>{el.classList.add('s-leaving');crowd.peak(.6);setTimeout(()=>{el.remove();done();},250);};
 });
}
