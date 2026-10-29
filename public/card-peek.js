// Card peek ("nặn bài"). At the start of each hand the player's two cards appear enlarged,
// each under a cover they drag away in any direction. Once both are open, five Bella moods
// appear above the cards. The stage lives outside #app, so the table re-rendering on every
// server update never interrupts a drag.
import {MOODS,moodIcon} from '/reactions.js';
import {sfxEnabled} from '/settings.js';
import {CARD_SKINS} from '/card-skin-catalog.js';

const suits={c:'♣',d:'♦',h:'♥',s:'♠'},ranks={11:'J',12:'Q',13:'K',14:'A'};
const FLING_SHARE=.45;      // drag this share of the card's height to pull the cover off
const CLOSE_MS=380;

function face(c){
 const r=ranks[c.rank]||c.rank,s=suits[c.suit],red=c.suit==='h'||c.suit==='d';
 return `<div class="peek-face ${red?'red':''}" aria-label="${r} ${s}"><span class="peek-corner">${r}<i>${s}</i></span><span class="peek-pip">${s}</span><span class="peek-corner flip">${r}<i>${s}</i></span></div>`;
}

export function createCardPeek({onReact,soundUrl}){
 let el=null,handId=null,until=0,total=1,revealed=[false,false],chosen=null,frame=null,closing=null;
 const base=typeof Audio==='undefined'?null:new Audio(soundUrl);if(base)base.preload='auto';
 const playSound=()=>{if(!base||!sfxEnabled())return;try{const a=base.cloneNode();a.volume=.9;a.play().catch(()=>{});}catch{}};

 function close(){
  if(!el||closing)return;cancelAnimationFrame(frame);const node=el;closing=node;node.classList.add('closing');document.body.classList.remove('peek-open');
  setTimeout(()=>{node.remove();if(closing===node)closing=null;if(el===node)el=null;},CLOSE_MS);
 }

 function tickClock(){
  if(!el)return;const left=Math.max(0,until-Date.now());
  el.querySelector('.peek-time').textContent=Math.ceil(left/1000)+'s';
  el.querySelector('.peek-bar i').style.transform=`scaleX(${left/total})`;
  if(left<=0){close();return;}frame=requestAnimationFrame(tickClock);
 }

 function showMoods(){
  if(!revealed.every(Boolean))return;el.classList.add('opened');
  el.querySelector('.peek-tip').textContent='Thả cảm xúc cho cả bàn thấy';
 }

 function reveal(cover,i,dx,dy){
  if(revealed[i])return;revealed[i]=true;
  const len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len,dist=cover.offsetHeight*2.4;
  cover.style.transition='transform .3s cubic-bezier(.2,.7,.3,1),opacity .3s';
  cover.style.transform=`translate(${ux*dist}px,${uy*dist}px) rotate(${ux*40}deg)`;cover.style.opacity='0';
  cover.disabled=true;cover.setAttribute('aria-hidden','true');playSound();
  setTimeout(()=>{cover.remove();showMoods();},300);
 }

 function bindCover(cover,i){
  let start=null,dx=0,dy=0;
  cover.onpointerdown=e=>{if(revealed[i])return;e.preventDefault();cover.setPointerCapture(e.pointerId);start={x:e.clientX,y:e.clientY};dx=dy=0;cover.style.transition='none';cover.classList.add('dragging');};
  cover.onpointermove=e=>{if(!start)return;dx=e.clientX-start.x;dy=e.clientY-start.y;cover.style.transform=`translate(${dx}px,${dy}px) rotate(${dx/14}deg)`;};
  const release=()=>{if(!start)return;start=null;cover.classList.remove('dragging');
   if(Math.hypot(dx,dy)>=cover.offsetHeight*FLING_SHARE){reveal(cover,i,dx,dy);return;}
   cover.style.transition='transform .22s cubic-bezier(.3,1.4,.5,1)';cover.style.transform='';
   if(Math.hypot(dx,dy)<6)cover.animate([{transform:'translateY(0)'},{transform:'translateY(-14px) rotate(-2deg)'},{transform:'translateY(0)'}],{duration:320,easing:'ease-out'});};
  cover.onpointerup=release;cover.onpointercancel=release;
  // Keyboard players: Enter or Space pulls the cover straight up.
  cover.onclick=e=>{if(e.detail===0)reveal(cover,i,0,-1);};
 }

 function build(state){
  el?.remove();cancelAnimationFrame(frame);revealed=[false,false];chosen=state.mood??null;handId=state.handId;
  el=document.createElement('section');el.className='peek-stage';el.setAttribute('role','dialog');el.setAttribute('aria-label','Nặn bài');
  el.dataset.cardSkin=CARD_SKINS.some(s=>s.id===state.cardSkin)?state.cardSkin:'classic';
  el.innerHTML=`<div class="peek-panel"><header class="peek-head"><strong>Nặn bài</strong><span class="peek-time" aria-live="off"></span></header><div class="peek-bar" aria-hidden="true"><i></i></div><div class="peek-moods" role="group" aria-label="Thả cảm xúc">${MOODS.map((m,i)=>`<button type="button" class="peek-mood" data-mood="${i}" aria-pressed="${chosen===i}" style="--mood-color:${m.color}">${moodIcon(i)}<span>${m.label}</span></button>`).join('')}</div><div class="peek-cards">${state.cards.map((c,i)=>`<div class="peek-card">${face(c)}<button type="button" class="peek-cover" aria-label="Kéo tấm che để xem lá bài ${i+1}"></button></div>`).join('')}</div><p class="peek-tip">Kéo tấm che theo hướng bất kỳ để xem bài</p></div>`;
  document.body.append(el);document.body.classList.add('peek-open');
  el.querySelectorAll('.peek-cover').forEach(bindCover);
  el.querySelectorAll('.peek-mood').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.mood);chosen=i;markMood();onReact(i);});
 }

 function markMood(){el?.querySelectorAll('.peek-mood').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.mood)===chosen)));}

 return {
  // state: {active, handId, cards, until (local ms), seconds, mood}
  sync(state){
   if(!state?.active||state.until<=Date.now()){if(el&&(!state||state.handId!==handId||state.until<=Date.now()||!state.active))close();return;}
   if(state.handId!==handId||!el||closing===el)build(state);
   el.dataset.cardSkin=CARD_SKINS.some(s=>s.id===state.cardSkin)?state.cardSkin:'classic';
   until=state.until;total=state.seconds*1000;
   if(state.mood!=null&&state.mood!==chosen){chosen=state.mood;markMood();}
   cancelAnimationFrame(frame);tickClock();
  }
 };
}
