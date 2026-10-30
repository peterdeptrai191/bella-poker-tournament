// Player settings, remembered on this device: background music (on/off + volume) and sound effects.
// The music is one jazz file played on a loop. Browsers only allow sound after the player has touched the
// page, so it starts on the first tap; it keeps playing in a background tab and streams instead of downloading
// everything first.
const read=(key,fallback)=>{try{const v=localStorage.getItem(key);return v===null?fallback:JSON.parse(v);}catch{return fallback;}};
const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};

const state={music:read('bella.music',true),volume:read('bella.musicVolume',.35),sfx:read('bella.sfx',true),sfxVolume:read('bella.sfxVolume',.8)};
export const sfxEnabled=()=>state.sfx!==false&&state.sfxVolume>0;
export const sfxVolume=()=>state.sfx===false?0:state.sfxVolume;

let track=null,unlocked=false,duck=1,duckTimer=null;
// Lowers the background music to `level` (0–1 of its normal volume) over `ms`, e.g. while a prize is revealed.
export function duckMusic(level,ms=1500){clearInterval(duckTimer);const from=duck,start=performance.now();duckTimer=setInterval(()=>{const k=Math.min(1,(performance.now()-start)/ms);duck=from+(level-from)*k;if(track)track.volume=Math.max(0,Math.min(1,state.volume*duck));if(k>=1)clearInterval(duckTimer);},50);}
function player(){
 if(!track){track=new Audio('/assets/music/bella-jazz.mp3');track.loop=true;track.preload='none';}
 track.volume=Math.max(0,Math.min(1,state.volume*duck));return track;
}
function sync(){
 if(!unlocked)return;
 if(state.music&&state.volume>0)player().play().catch(()=>{});else track?.pause();
}
if(typeof window!=='undefined'){
 const start=()=>{unlocked=true;sync();};
 for(const type of ['pointerdown','keydown'])window.addEventListener(type,start,{capture:true,passive:true,once:true});
 // Music keeps playing while you look at another tab. If the phone stopped it in the background, start it again
 // when the player comes back.
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync();});
}

export function openSettings({layout,onLayout}={}){
 if(document.querySelector('.settings-dialog'))return;
 const d=document.createElement('dialog');d.className='deck-dialog settings-dialog';d.setAttribute('aria-labelledby','settings-title');
 d.innerHTML=`<header class="deck-head"><div><small>BELLA POKER</small><h2 id="settings-title">Cài đặt</h2></div><button type="button" data-close aria-label="Đóng">×</button></header>
 <div class="settings-list">
  <div class="setting-row"><div><strong>Nhạc nền</strong><small>Jazz lounge, phát lặp lại</small></div><button type="button" class="switch" role="switch" data-setting="music" aria-checked="${state.music}" aria-label="Nhạc nền"><i></i></button></div>
  <div class="setting-row"><label for="music-volume"><strong>Âm lượng nhạc</strong></label><input id="music-volume" type="range" min="0" max="100" step="5" value="${Math.round(state.volume*100)}" ${state.music?'':'disabled'}></div>
  <div class="setting-row"><div><strong>Âm thanh hiệu ứng</strong><small>Tiếng chip, lật bài</small></div><button type="button" class="switch" role="switch" data-setting="sfx" aria-checked="${state.sfx}" aria-label="Âm thanh hiệu ứng"><i></i></button></div>
  <div class="setting-row"><label for="sfx-volume"><strong>Âm lượng hiệu ứng</strong></label><input id="sfx-volume" type="range" min="0" max="100" step="5" value="${Math.round(state.sfxVolume*100)}" ${state.sfx?'':'disabled'}></div>
  ${onLayout?`<div class="setting-row"><div><strong>Chế độ màn hình</strong><small>Ngang cần màn hình nằm ngang</small></div><div class="segmented" role="group" aria-label="Chế độ màn hình"><button type="button" data-layout-pick="portrait" aria-pressed="${layout!=='landscape'}">Dọc</button><button type="button" data-layout-pick="landscape" aria-pressed="${layout==='landscape'}">Ngang</button></div></div>`:''}
 </div>`;
 d.querySelector('[data-close]').onclick=()=>d.close();
 d.querySelectorAll('[data-setting]').forEach(b=>b.onclick=()=>{const key=b.dataset.setting,on=b.getAttribute('aria-checked')!=='true';state[key]=on;write(key==='music'?'bella.music':'bella.sfx',on);b.setAttribute('aria-checked',String(on));if(key==='music'){d.querySelector('#music-volume').disabled=!on;unlocked=true;sync();}if(key==='sfx')d.querySelector('#sfx-volume').disabled=!on;});
 const sv=d.querySelector('#sfx-volume');sv.oninput=()=>{state.sfxVolume=Number(sv.value)/100;write('bella.sfxVolume',state.sfxVolume);};
 const vol=d.querySelector('#music-volume');vol.oninput=()=>{state.volume=Number(vol.value)/100;write('bella.musicVolume',state.volume);if(track)track.volume=state.volume*duck;unlocked=true;sync();};
 d.querySelectorAll('[data-layout-pick]').forEach(b=>b.onclick=()=>{d.querySelectorAll('[data-layout-pick]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));onLayout(b.dataset.layoutPick);});
 d.addEventListener('close',()=>d.remove());document.body.append(d);d.showModal();
}
