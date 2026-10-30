// A square board of reward cards along the four edges, with a light that runs around it.
// The player presses Quay: the light speeds up, runs at full speed, and the player presses Dừng to slow it
// down onto the prize. The prize is decided by the server when the spin starts; pressing Dừng only decides
// when the light starts slowing down, so timing the press cannot change what you win.
import {characterById} from './characters.js';
import {playSound,chipRain} from './pot-fx.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// still picture of a skin (the animated versions are too heavy for 35 cards)
export function stillArt(c){
 if(c.id.startsWith('goat-'))return `/assets/events/goat/${c.id}.webp`;
 if(c.id.startsWith('cr7-'))return `/assets/events/cr7-boat/${c.id}-clean.webp`;
 return `/assets/characters/${c.asset&&!c.artBox?c.asset:c.id+'.webp'}`;
}
export const rarity=c=>c.id.startsWith('goat-')?'goat':c.id.startsWith('cr7-')?'boat':c.price>=20?'gold':c.price>=15?'epic':c.price>=10?'rare':'common';
export const isJackpot=c=>['goat','boat','gold'].includes(rarity(c));

// A face-down card in the style of a "player of the week" card: tier colour, light rays, chevrons and a
// shadow figure. Used on the GOAT or BOAT board so the board stays mysterious and clean.
const SIL='<svg class="potw-sil" viewBox="0 0 100 140" aria-hidden="true"><path d="M50 6C57 15 67 12 64 25C73 30 71 44 61 48C56 53 44 53 39 48C29 44 30 31 36 27C34 19 42 21 42 12C46 17 48 13 50 6Z M36 52H64L69 88H31Z M62 55 79 34 87 40 70 63Z M38 56 23 72 31 79 43 66Z M33 87 28 126H41L49 91Z M51 91 59 126H72L67 87Z"/><circle cx="84" cy="33" r="7"/></svg>';
export const potwCard=(tier,extra='')=>`<span class="potw" data-t="${tier}"><i class="potw-rays"></i><i class="potw-chev"></i>${SIL}<b class="potw-base">★★★★★</b>${extra}</span>`;
const SPARKS='<i class="spark-star" style="--d:0s"></i><i class="spark-star" style="--d:-1.1s"></i><i class="spark-star" style="--d:-2.2s"></i>';
// Cells of an s×s square's edge, clockwise from the top-left corner.
function edge(s){const out=[];for(let c=0;c<s;c++)out.push([0,c]);for(let r=1;r<s;r++)out.push([r,s-1]);for(let c=s-2;c>=0;c--)out.push([s-1,c]);for(let r=s-2;r>0;r--)out.push([r,0]);return out;}
export function wheelHTML(tiles,centre='',badge='★',frame=rarity,sparkle=new Set(),hidden=false){
 const n=tiles.length;let s=3;while(4*(s-1)<n)s++;
 const cells=edge(s),spare=cells.length-n,corners=[0,s-1,2*(s-1),3*(s-1)].slice(0,spare);  // leftover corners become badges
 let k=0;const html=cells.map(([r,c],i)=>{const pos=`grid-area:${r+1}/${c+1}`;
  if(corners.includes(i))return `<span class="spin-badge" style="${pos}" aria-hidden="true">${badge}</span>`;
  const id=tiles[k],ch=characterById(id),j=k++;
  return `<span class="spin-tile" data-r="${frame(ch)}"${sparkle.has(id)?' data-sparkle':''} data-i="${j}" style="${pos};--c:${ch.color}" title="${hidden?'Thẻ bí ẩn':esc(ch.name)}">${hidden?potwCard(frame(ch))+(sparkle.has(id)?SPARKS:''):`<img src="${stillArt(ch)}" alt="" loading="lazy" onerror="this.remove()">`}</span>`;}).join('');
 return `<div class="spin-wheel${hidden?' potw-board':''}" style="--s:${s}">${html}<div class="spin-centre" style="grid-area:2/2/${s}/${s}">${centre}</div></div>`;
}

export function spinner(root,tiles,{onStep}={}){
 const els=[...root.querySelectorAll('.spin-tile')].sort((a,b)=>a.dataset.i-b.dataset.i),n=els.length,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let pos=0,timer=null,running=false;
 const light=i=>{els.forEach(e=>e.classList.remove('lit'));els[i].classList.add('lit');onStep?.(tiles[i],i);};
 const step=()=>{pos=(pos+1)%n;light(pos);playSound('one',{volume:.16});};
 const TOP=55;
 return {
  // speeds up from a slow crawl to full speed; resolves once full speed is reached
  start(){running=true;root.classList.add('spinning');root.querySelectorAll('.won').forEach(e=>e.classList.remove('won'));
   if(reduced){light(pos);return Promise.resolve();}
   return new Promise(atTop=>{let k=0;const loop=()=>{if(!running)return;step();k++;const t=Math.min(1,k/14),wait=TOP+(1-t)*(1-t)*300;if(k===14)atTop();timer=setTimeout(loop,wait);};loop();});
  },
  // slows down onto tile `target`; resolves when the light has stopped
  land(target,{onPlan,winSound=true}={}){running=false;clearTimeout(timer);
   return new Promise(done=>{
    const finish=()=>{light(target);root.classList.remove('spinning');els[target].classList.add('won');if(winSound)playSound('win',{volume:.8});done();};
    if(reduced){pos=target;onPlan?.(0);finish();return;}
    const steps=((target-pos+n)%n)+n,wait=k=>TOP+Math.pow(k/steps,2.6)*480;let k=0;
    onPlan?.(Array.from({length:steps},(_,i)=>wait(i)).reduce((a,b)=>a+b,0));
    const next=()=>{k++;if(k>=steps){pos=target;finish();return;}step();timer=setTimeout(next,wait(k));};
    timer=setTimeout(next,TOP);
   });
  },
  stop(){running=false;clearTimeout(timer);root.classList.remove('spinning');}
 };
}
export function celebrate(c){if(isJackpot(c))chipRain({full:true,volume:.6});}
