// Mystery pack opening: a leather gift box with a red ribbon appears; tap it 3 to 5 times (it shakes and light
// leaks out a little more each time), then the lid flies off, light bursts out and the card rises from the box.
// The prize is already decided by the server; the taps are only the show.
import {animatedCharacter} from './character-motion.js';
import {cardFace} from './card-face.js';
import {playSound,whoosh} from './pot-fx.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function openGift(host,c){
 return new Promise(done=>{
  const need=3+Math.floor(Math.random()*3);let taps=0,open=false;
  const el=document.createElement('div');el.className='gift-stage';el.setAttribute('role','dialog');el.setAttribute('aria-label','Mở hộp quà');
  el.innerHTML=`<div class="gift-rays" aria-hidden="true"></div>
   <button type="button" class="gift" aria-label="Chạm để mở hộp quà"><span class="gift-glow"></span><span class="gift-lid"><i class="rib-v"></i><span class="bow"><i></i><i></i></span></span><span class="gift-body"><i class="rib-v"></i><i class="rib-h"></i></span></button>
   <div class="gift-card">${cardFace(c,animatedCharacter(c,'rv-art'))}</div>
   <p class="gift-hint">Chạm vào hộp quà <b>${need}</b> lần để mở</p>
   <div class="gift-info"><strong>${esc(c.name)}</strong><button type="button" class="cr7-gold gift-ok">Nhận thẻ</button></div>`;
  host.append(el);
  const box=el.querySelector('.gift'),hint=el.querySelector('.gift-hint');
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){el.classList.add('opened','done');}
  box.addEventListener('click',()=>{if(open)return;taps++;el.style.setProperty('--leak',taps/need);
   box.classList.remove('shake');void box.offsetWidth;box.classList.add('shake');playSound('one',{volume:.5});
   const left=need-taps;hint.innerHTML=left>0?`Còn <b>${left}</b> lần nữa…`:'';
   if(left<=0){open=true;whoosh({volume:.9,ms:900});setTimeout(()=>{el.classList.add('opened');playSound('win',{volume:.9});},250);setTimeout(()=>el.classList.add('done'),1500);}});
  el.querySelector('.gift-ok').onclick=()=>{el.classList.add('leaving');setTimeout(()=>{el.remove();done();},250);};
  box.focus();
 });
}
