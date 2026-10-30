// GOAT or BOAT prize reveal. While the light slows down the screen darkens; once it stops a door of light
// opens in the middle and the card comes out of it. How big the show is depends on the card's colour:
//  gold   – the door opens and the card pops out
//  purple – plus a red carpet rolling out with purple light streaks, and a whoosh
//  red    – plus bright red streaks, fireworks and a cheering crowd
// Tapping anywhere skips straight to the card.
import {animatedCharacter} from './character-motion.js';
import {playSound,whoosh} from './pot-fx.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;

// A dark layer that fades in over `ms` (the time the light needs to stop).
export function dimmer(host){
 const el=document.createElement('div');el.className='reveal-dim';host.append(el);
 return {fade(ms){el.style.transitionDuration=Math.max(200,ms)+'ms';requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add('on')));},remove(){el.remove();}};
}

function fireworks(canvas,ms=2600){
 const ctx=canvas.getContext('2d'),dpr=Math.min(2,devicePixelRatio||1),W=canvas.width=innerWidth*dpr,H=canvas.height=innerHeight*dpr,parts=[],colors=['#ffd34d','#ff2d55','#ffffff','#ff8a3d','#ff5fae'];
 const burst=()=>{const x=W*(.15+Math.random()*.7),y=H*(.12+Math.random()*.4),c=colors[Math.floor(Math.random()*colors.length)];for(let i=0;i<70;i++){const a=Math.random()*Math.PI*2,v=(2+Math.random()*5)*dpr;parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:1,c});}};
 const start=performance.now();let next=0;
 const frame=t=>{const e=t-start;if(e>next&&e<ms-700){burst();next=e+260+Math.random()*260;}
  ctx.globalCompositeOperation='destination-out';ctx.fillStyle='rgba(0,0,0,.22)';ctx.fillRect(0,0,W,H);ctx.globalCompositeOperation='lighter';
  for(const p of parts){p.x+=p.vx;p.y+=p.vy;p.vy+=.06*dpr;p.vx*=.985;p.life-=.012;if(p.life>0){ctx.globalAlpha=p.life;ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x,p.y,2.2*dpr,0,7);ctx.fill();}}
  if(e<ms+900)requestAnimationFrame(frame);else ctx.clearRect(0,0,W,H);};
 requestAnimationFrame(frame);
}

// Shows the card; resolves when the player taps "Nhận thẻ".
export function revealCard(host,c,tier,{duplicate=false}={}){
 return new Promise(done=>{
  const el=document.createElement('div');el.className='reveal';el.dataset.tier=tier;el.setAttribute('role','dialog');el.setAttribute('aria-label','Phần thưởng: '+c.name);
  const streaks=tier==='gold'?'':Array.from({length:24},(_,i)=>`<i style="--a:${i*15}deg;--d:${(i%5)*60}ms"></i>`).join('');
  el.innerHTML=`<div class="rv-door"><div class="rv-light"></div><i class="rv-leaf l"></i><i class="rv-leaf r"></i></div>${tier==='gold'?'':'<div class="rv-carpet"></div>'}<div class="rv-streaks">${streaks}</div><canvas class="rv-fire"></canvas>
  <div class="rv-card" data-tier="${tier}">${animatedCharacter(c,'rv-art')}</div>
  <div class="rv-info"><strong>${esc(c.name)}</strong><span>${duplicate?'Bạn đã có skin này rồi (không hoàn coin).':'Skin mới đã vào bộ sưu tập!'}</span><button type="button" class="cr7-gold rv-ok">Nhận thẻ</button></div><small class="rv-skip">Chạm để bỏ qua</small>`;
  host.append(el);
  const steps=tier==='gold'?[['s-open',350],['s-card',900],['s-done',1500]]:tier==='purple'?[['s-open',350],['s-carpet',800],['s-card',1300],['s-done',1900]]:[['s-open',350],['s-carpet',800],['s-card',1300],['s-fx',1500],['s-done',2300]];
  const timers=[];let finished=false;
  const apply=name=>{el.classList.add(name);if(name==='s-open'&&tier!=='gold')whoosh({volume:tier==='red'?.9:.6});if(name==='s-open'&&tier==='gold')whoosh({volume:.35,ms:450});if(name==='s-card')playSound('win',{volume:.7});if(name==='s-fx'){playSound('cheer',{volume:.9});fireworks(el.querySelector('.rv-fire'));}if(name==='s-done')finished=true;};
  const skip=()=>{if(finished)return;timers.forEach(clearTimeout);el.classList.add('s-instant');for(const [name] of steps)if(!el.classList.contains(name)){if(name==='s-fx'){playSound('cheer',{volume:.7});fireworks(el.querySelector('.rv-fire'),1800);}el.classList.add(name);}finished=true;};
  if(reduced()){el.classList.add('s-instant',...steps.map(s=>s[0]));finished=true;}
  else{el.classList.add('s-black');for(const [name,at] of steps)timers.push(setTimeout(()=>apply(name),at));}
  el.addEventListener('click',e=>{if(e.target.closest('.rv-ok'))return;skip();});
  el.querySelector('.rv-ok').onclick=()=>{el.classList.add('s-leaving');setTimeout(()=>{el.remove();done();},250);};
 });
}
