import {plate,GOAT_ART} from './goat-motion.js';
// The GOAT M10 cards share this same style, each in its own colours.
const ACCENT={'cr7-real':'#748bff','cr7-al-nassr':'#3985ff','goat-m10-barca-2015':'#e0405e','goat-m10-bernabeu':'#5b8cff','goat-m10-paris':'#ff4a5c','goat-m10-miami':'#ffd166'};
const PLATES={'cr7-mu':{kind:'bigtime',name:'CR7 · MAN UTD',date:'21.05.2008'},'cr7-real':{kind:'bigtime',name:'CR7 · REAL',date:'03.06.2017'},'cr7-sporting':{kind:'goat',name:'CR7 · SPORTING'},'cr7-al-nassr':{kind:'goat',name:'CR7 · AL NASSR'}};
const ball='<circle r="21" fill="#fff" stroke="#172b49" stroke-width="2"/><path d="M0-12 12-4 7 10H-7L-12-4Z M-18-10-12-4-20 4M18-10 12-4 20 4M-7 10-12 17M7 10 12 17M0-12V-20" fill="#172b49" stroke="#172b49" stroke-width="2"/>';
const star='<path d="M0-25 6-8 24-8 10 3 15 22 0 11-15 22-10 3-24-8-6-8Z" fill="#f2f8ff" stroke="#769dd2" stroke-width="2"/>';
export function cr7Character(c,cls){
 const card=PLATES[c.id]||GOAT_ART[c.id]?.plate,showPlate=!/character-avatar|opponent-portrait/.test(cls)&&card;
 const real=c.id==='cr7-real'||c.id==='goat-m10-barca-2015',accent=ACCENT[c.id]||'#fff3ba',art=c.id.startsWith('goat-')?`/assets/events/goat/${c.id}.webp`:`/assets/events/cr7-boat/${c.id}-clean.webp`;
 const orbit=(i)=>`<g transform="translate(320 338)"><g class="cr7-orbit cr7-orbit-${i}"><g transform="translate(0 -270)"><g class="cr7-ball-spin">${real?star:ball}</g></g></g></g>`;
 return `<svg class="${cls} character-motion cr7-motion" style="--cr7-color:${c.color};--cr7-accent:${accent}" viewBox="0 0 640 ${showPlate?700:676}" role="img" aria-label="${c.name}"><ellipse class="cr7-aura" cx="320" cy="350" rx="225" ry="265"/><g class="cr7-ring-back"><ellipse cx="320" cy="338" rx="280" ry="254"/><ellipse cx="320" cy="338" rx="260" ry="276"/></g>${orbit(0)}<image href="${art}" x="94" y="40" width="452" height="592" preserveAspectRatio="xMidYMid meet"/><g class="cr7-ring-front"><path d="M45 350C75 530 565 555 594 330"/><path d="M65 385C150 520 500 520 575 370"/></g>${orbit(1)}${Array.from({length:10},(_,i)=>{const a=i*Math.PI/5;return `<g transform="translate(${320+Math.cos(a)*267} ${338+Math.sin(a)*280})"><path class="cr7-spark" style="--delay:${-i*.33}s" d="M0-8 2-2 8 0 2 2 0 8-2 2-8 0-2-2Z"/></g>`;}).join('')}${showPlate?plate(card):''}</svg>`;
}
