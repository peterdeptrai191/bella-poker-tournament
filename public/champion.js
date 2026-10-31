// Tournament champion celebration, shown once per tournament on each device when the room finishes.
// Built from the same pieces as the GOAT or BOAT card reveal: dark stage, white-hot flash, the champion's card
// rising with a gold frame, fireworks and sparkler fountains, sparkles round the edge and the crowd roaring.
// Then the final standings slide up with two choices: stay in the room or leave it.
//  0.0 s  stage darkens, spotlights sweep, the crowd starts
//  0.9 s  flash, the champion card pops in, crown drops on it
//  1.2 s  fireworks, fountains, chip rain
//  3.0 s  "Xem bảng xếp hạng" appears (tap anywhere also works)
//  7.5 s  standings slide up on their own
import {sparks} from './card-reveal.js';
import {animatedCharacter} from './character-motion.js';
import {characterById} from './characters.js';
import {playSound,playShaped,chipRain} from './pot-fx.js';
import {duckMusic} from './settings.js';
import {effectsReduced} from './visual-effects.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n||0).toLocaleString('vi-VN');
const shownKey=room=>'bella.champ.'+room.code+':'+(room.startedAt||'');
export function championShown(room){try{return localStorage.getItem(shownKey(room))==='1';}catch{return false;}}
function markShown(room){try{localStorage.setItem(shownKey(room),'1');}catch{}}

function standings(room){
 const reward=room.coinReward;
 return `<div class="ch-ranks">${room.leaderboard.map(p=>`<div class="ch-rank${p.id===room.me?' own':''}${p.position===1?' first':''}"><span class="ch-pos">${p.position===1?'♛':p.position}</span>${animatedCharacter(characterById(p.character),'character-avatar ch-rank-art')}<div class="ch-who"><strong>${esc(p.name)}${p.isBot?' · BOT':''}${p.id===room.me?' · Bạn':''}</strong><small>${p.position===1?'Nhà vô địch'+(reward?.amount&&reward.playerId===p.id?` · +${fmt(reward.amount)} coin`:''):'Hạng #'+p.position}</small></div><span class="ch-chips">${fmt(p.stack)}</span></div>`).join('')}</div>`;
}

// `onStay` closes the celebration and keeps the player at the table; `onLeave` takes them out of the room.
export function celebrateChampion(room,{onStay,onLeave}={}){
 if(document.querySelector('.champ'))return;
 markShown(room);
 const winner=room.players.find(p=>p.rank===1)||room.leaderboard.find(p=>p.position===1);if(!winner)return;
 const mine=room.leaderboard.find(p=>p.id===room.me),iWon=winner.id===room.me;
 const c=characterById(winner.character),reward=room.coinReward,quiet=effectsReduced();
 const d=document.createElement('dialog');d.className='champ'+(iWon?' is-me':'');d.setAttribute('aria-label','Nhà vô địch giải đấu');
 const edge=Array.from({length:22},(_,i)=>{const t=i/22,side=Math.floor(t*4),k=(t*4)%1,pos=[[k,0],[1,k],[1-k,1],[0,1-k]][side];return `<i style="left:${pos[0]*100}%;top:${pos[1]*100}%;--d:-${(i*.37)%1.2}s;--s:${.6+((i*7)%5)/8}"></i>`;}).join('');
 d.innerHTML=`<div class="ch-stage" aria-hidden="true"><i class="ch-beam l"></i><i class="ch-beam r"></i><i class="ch-glow"></i></div>
 <canvas class="ch-fire" aria-hidden="true"></canvas><div class="ch-edge" aria-hidden="true">${edge}</div><div class="ch-flash" aria-hidden="true"></div>
 <section class="ch-hero">
  <span class="ch-eyebrow">${esc(room.title||'Bella Tournament')}</span>
  <div class="ch-card"><b class="ch-crown" aria-hidden="true">♛</b><div class="ch-face">${animatedCharacter(c,'ch-art')}</div><i class="ch-plinth" aria-hidden="true"></i></div>
  <h2 class="ch-title">${iWon?'Bạn là nhà vô địch':'Nhà vô địch'}</h2>
  <strong class="ch-name">${esc(winner.name)}</strong>
  <span class="ch-sub">${reward?.amount&&reward.playerId===winner.id?`+${fmt(reward.amount)} coin · `:''}${iWon?'Chúc mừng chiến thắng!':mine?`Bạn xếp hạng #${mine.position}`:''}</span>
  <button type="button" class="ch-next">Xem bảng xếp hạng ›</button>
 </section>
 <section class="ch-board" aria-label="Bảng xếp hạng chung cuộc">
  <header><span class="ch-eyebrow">KẾT QUẢ CHUNG CUỘC</span><h3>Bảng xếp hạng</h3></header>
  ${standings(room)}
  <div class="ch-actions"><button type="button" class="cr7-list ch-stay">Ở lại phòng</button><button type="button" class="cr7-gold ch-leave">Thoát phòng</button></div>
 </section>`;
 document.body.append(d);d.showModal();
 const fx=quiet?null:sparks(d.querySelector('.ch-fire')),timers=[],at=(ms,f)=>timers.push(setTimeout(f,ms)),cls=s=>d.classList.add(s);
 let crowd=null;
 duckMusic(.15,800);
 requestAnimationFrame(()=>cls('s-in'));
 crowd=playShaped('crowd',[[0,.12],[1,.35],[2.5,.7],[6,.55],[9,0]]);
 at(900,()=>{cls('s-pop');playSound('win',{volume:.9});playSound('cheer',{volume:.8});});
 at(1200,()=>{cls('s-party');if(fx){const W=innerWidth,H=innerHeight;fx.fireworks(6500);fx.rockets(5000);fx.fountains([[W*.18,H*.98],[W*.82,H*.98]],4200);}chipRain({full:true,volume:.5});});
 at(3000,()=>cls('s-ready'));
 const showBoard=()=>{if(d.classList.contains('s-board'))return;cls('s-ready');cls('s-board');d.querySelector('.ch-stay').focus({preventScroll:true});};
 at(7500,showBoard);
 d.querySelector('.ch-next').onclick=showBoard;
 d.addEventListener('click',e=>{if(d.classList.contains('s-ready')&&!d.classList.contains('s-board')&&!e.target.closest('.ch-board'))showBoard();});
 d.addEventListener('cancel',e=>{e.preventDefault();showBoard();});
 const close=then=>{timers.forEach(clearTimeout);crowd?.stop();fx?.stop();duckMusic(1,1500);d.classList.add('s-out');setTimeout(()=>{d.close();d.remove();then?.();},260);};
 d.querySelector('.ch-stay').onclick=()=>close(onStay);
 d.querySelector('.ch-leave').onclick=()=>close(onLeave);
}
