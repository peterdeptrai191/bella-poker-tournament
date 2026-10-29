// Player settings, remembered on this device: background music (on/off + volume) and sound effects.
// The music is one jazz file played on a loop. Browsers only allow sound after the player has touched the
// page, so it starts on the first tap; it pauses while the tab is hidden and streams instead of downloading
// everything first.
const read=(key,fallback)=>{try{const v=localStorage.getItem(key);return v===null?fallback:JSON.parse(v);}catch{return fallback;}};
const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};

const state={music:read('bella.music',true),volume:read('bella.musicVolume',.35),sfx:read('bella.sfx',true)};
export const sfxEnabled=()=>state.sfx!==false;

let track=null,unlocked=false;
function player(){
 if(!track){track=new Audio('/assets/music/bella-jazz.mp3');track.loop=true;track.preload='none';}
 track.volume=Math.max(0,Math.min(1,state.volume));return track;
}
function sync(){
 if(!unlocked)return;
 if(state.music&&state.volume>0&&!document.hidden)player().play().catch(()=>{});else track?.pause();
}
if(typeof window!=='undefined'){
 const start=()=>{unlocked=true;sync();};
 for(const type of ['pointerdown','keydown'])window.addEventListener(type,start,{capture:true,passive:true,once:true});
 document.addEventListener('visibilitychange',sync);
}

export function openSettings({layout,onLayout}={}){
 if(document.querySelector('.settings-dialog'))return;
 const d=document.createElement('dialog');d.className='deck-dialog settings-dialog';d.setAttribute('aria-labelledby','settings-title');
 d.innerHTML=`<header class="deck-head"><div><small>BELLA POKER</small><h2 id="settings-title">Cài đặt</h2></div><button type="button" data-close aria-label="Đóng">×</button></header>
 <div class="settings-list">
  <div class="setting-row"><div><strong>Nhạc nền</strong><small>Jazz lounge, phát lặp lại</small></div><button type="button" class="switch" role="switch" data-setting="music" aria-checked="${state.music}" aria-label="Nhạc nền"><i></i></button></div>
  <div class="setting-row"><label for="music-volume"><strong>Âm lượng nhạc</strong></label><input id="music-volume" type="range" min="0" max="100" step="5" value="${Math.round(state.volume*100)}" ${state.music?'':'disabled'}></div>
  <div class="setting-row"><div><strong>Âm thanh hiệu ứng</strong><small>Tiếng chip, lật bài</small></div><button type="button" class="switch" role="switch" data-setting="sfx" aria-checked="${state.sfx}" aria-label="Âm thanh hiệu ứng"><i></i></button></div>
  ${onLayout?`<div class="setting-row"><div><strong>Chế độ màn hình</strong><small>Ngang cần màn hình nằm ngang</small></div><div class="segmented" role="group" aria-label="Chế độ màn hình"><button type="button" data-layout-pick="portrait" aria-pressed="${layout!=='landscape'}">Dọc</button><button type="button" data-layout-pick="landscape" aria-pressed="${layout==='landscape'}">Ngang</button></div></div>`:''}
 </div>`;
 d.querySelector('[data-close]').onclick=()=>d.close();
 d.querySelectorAll('[data-setting]').forEach(b=>b.onclick=()=>{const key=b.dataset.setting,on=b.getAttribute('aria-checked')!=='true';state[key]=on;write(key==='music'?'bella.music':'bella.sfx',on);b.setAttribute('aria-checked',String(on));if(key==='music'){d.querySelector('#music-volume').disabled=!on;unlocked=true;sync();}});
 const vol=d.querySelector('#music-volume');vol.oninput=()=>{state.volume=Number(vol.value)/100;write('bella.musicVolume',state.volume);if(track)track.volume=state.volume;unlocked=true;sync();};
 d.querySelectorAll('[data-layout-pick]').forEach(b=>b.onclick=()=>{d.querySelectorAll('[data-layout-pick]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));onLayout(b.dataset.layoutPick);});
 d.addEventListener('close',()=>d.remove());document.body.append(d);d.showModal();
}
