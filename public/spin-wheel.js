// A ring of reward tiles with a light that runs around it and stops on the prize.
// The prize is always decided by the server; the wheel only shows it. The light keeps running fast while
// the server answers, then goes about two more laps, slowing down, and stops exactly on the given tile.
import {characterById} from './characters.js';
import {playSound,chipRain} from './pot-fx.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// still picture of a skin (the animated versions are too heavy for 35 tiles)
export function stillArt(c){
 if(c.id.startsWith('goat-'))return `/assets/events/goat/${c.id}.webp`;
 if(c.id.startsWith('cr7-'))return `/assets/events/cr7-boat/${c.id}-clean.webp`;
 return `/assets/characters/${c.asset&&!c.artBox?c.asset:c.id+'.webp'}`;
}
export const rarity=c=>c.id.startsWith('goat-')?'goat':c.id.startsWith('cr7-')?'boat':c.price>=20?'gold':c.price>=15?'epic':c.price>=10?'rare':'common';
export const isJackpot=c=>['goat','boat','gold'].includes(rarity(c));

export function wheelHTML(tiles,centre=''){
 const n=tiles.length;
 return `<div class="spin-wheel" style="--n:${n}"><div class="spin-track" aria-hidden="true"></div>${tiles.map((id,i)=>{const c=characterById(id),a=i/n*2*Math.PI-Math.PI/2;
  return `<span class="spin-tile" data-r="${rarity(c)}" data-i="${i}" style="--x:${(50+Math.cos(a)*44).toFixed(2)}%;--y:${(50+Math.sin(a)*44).toFixed(2)}%;--c:${c.color}" title="${esc(c.name)}"><img src="${stillArt(c)}" alt="" loading="lazy" onerror="this.remove()"></span>`;}).join('')}<div class="spin-centre">${centre}</div></div>`;
}

export function spinner(root,tiles,{onStep}={}){
 const els=[...root.querySelectorAll('.spin-tile')],n=els.length,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let pos=0,timer=null,stopped=false;
 const light=i=>{els.forEach(e=>e.classList.remove('lit'));els[i].classList.add('lit');onStep?.(tiles[i],i);};
 const step=()=>{pos=(pos+1)%n;light(pos);playSound('one',{volume:.18});};
 return {
  start(){stopped=false;root.classList.add('spinning');root.querySelectorAll('.won').forEach(e=>e.classList.remove('won'));if(reduced){light(pos);return;}const loop=()=>{if(stopped)return;step();timer=setTimeout(loop,60);};loop();},
  // lands on tile `target`; resolves when the light has stopped
  land(target){stopped=true;clearTimeout(timer);
   return new Promise(done=>{
    const finish=()=>{light(target);root.classList.remove('spinning');els[target].classList.add('won');playSound('win',{volume:.8});done();};
    if(reduced){pos=target;finish();return;}
    const steps=((target-pos+n)%n)+n*2;let k=0;
    const next=()=>{k++;if(k>=steps){pos=target;finish();return;}step();const t=k/steps;timer=setTimeout(next,60+Math.pow(t,3)*420);};
    timer=setTimeout(next,60);
   });
  },
  stop(){stopped=true;clearTimeout(timer);root.classList.remove('spinning');}
 };
}
export function celebrate(c){if(isJackpot(c))chipRain({full:true,volume:.6});}
