// GOAT or BOAT box (was the CR7 B.O.A.T pack) and the Bella mystery pack, both shown as a spinning wheel.
import {CHARACTERS,characterById} from './characters.js';
import {animatedCharacter} from './character-motion.js';
import {CR7_EVENT,CR7_PRICE,BOX_NAME,cr7Skins,goatSkins,goatTiles,goatFrame,goatOdds,GROUP_ODDS,SPARKLE} from './cr7-catalog.js';
import {wheelHTML,spinner,stillArt,celebrate,potwCard} from './spin-wheel.js';
import {dimmer,revealCard} from './card-reveal.js';
const GOAT_HEAD='<span class="g">G.O.A.T</span><small>or</small><span class="b">B.O.A.T</span>';
const ODDS_LINE=`Thẻ đỏ ${GROUP_ODDS.red}% · Thẻ tím ${GROUP_ODDS.purple}% · Thẻ vàng ${GROUP_ODDS.gold}%`;
let getAccount=()=>null,performRequest,isHome=()=>false,offering=false;
const offered=new Set();
export function configureCr7(o){getAccount=o.getAccount;performRequest=o.request;isHome=o.isHome;}
function dialog(cls){const d=document.createElement('dialog');d.className='cr7-dialog '+cls;document.body.append(d);d.addEventListener('close',()=>d.remove(),{once:true});return d;}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=x=>(x*100).toLocaleString('vi-VN',{maximumFractionDigits:2})+'%';
const art=c=>animatedCharacter(c,'cr7-preview-art');

function listRewards(){
 const odds=goatOdds(),tiles=goatTiles(),goats=goatSkins().filter(c=>c.id.startsWith('goat-m10')),special=goatSkins().filter(c=>!c.id.startsWith('goat-m10'));
 const groups=[[goats,'GOAT'],[cr7Skins(),'BOAT'],[special,'Special Skin'],[tiles.map(id=>CHARACTERS.find(c=>c.id===id)).filter(c=>!c.event),'Skin từ 10 coin trở lên']];
 const d=dialog('cr7-rewards');
 d.innerHTML=`<button class="cr7-close" aria-label="Đóng">×</button><small>${BOX_NAME.toUpperCase()}</small><h2>Có gì trong vòng quay?</h2><p><b>${ODDS_LINE}</b><br>Máy chủ bốc nhóm màu trước rồi chọn thẻ trong nhóm. Trong nhóm đỏ, M10 Barca và CR7 Real hiếm hơn (2% mỗi thẻ). GOAT, BOAT và Special Skin chỉ có trong vòng quay này.</p>`+groups.map(([skins,title])=>`<h3>${title}</h3><div class="cr7-reward-grid">${skins.map(c=>`<article data-frame="${goatFrame(c)}" style="--cr7-color:${c.color}">${art(c)}<b>${esc(c.name)}</b><span>${pct(odds[c.id]||0)}</span></article>`).join('')}</div>`).join('')+'<p>Skin trùng được giữ nguyên trong bộ sưu tập, không hoàn coin.</p>';
 d.querySelector('button').onclick=()=>d.close();d.showModal();
}

export function offerCr7(){const a=getAccount();if(!a||!isHome()||a.cr7Event?.seen||offered.has(a.id)||offering)return;offering=true;setTimeout(()=>{offering=false;const current=getAccount();if(current?.id!==a.id||!isHome())return;const opened=document.querySelector('dialog[open]');if(opened){opened.addEventListener('close',()=>setTimeout(offerCr7,300),{once:true});return;}offered.add(a.id);const d=dialog('cr7-poster');d.innerHTML=`<button class="cr7-close" aria-label="Đóng sự kiện">×</button><div class="cr7-poster-art goat-poster"><img src="/assets/events/cr7-boat/goat-or-boat-poster.webp" alt="M10 và CR7 quay lưng vào nhau"><h2 class="goat-title goat-head">${GOAT_HEAD}</h2></div><h2>Tặng bạn 1 lượt quay</h2><p>${ODDS_LINE}<br>Lượt đầu miễn phí · Các lượt sau ${CR7_PRICE} coin</p><button class="cr7-gold" data-enter>Quay miễn phí →</button>`;d.querySelector('.cr7-close').onclick=()=>d.close();d.querySelector('[data-enter]').onclick=()=>{d.close();openCr7Pack();};d.showModal();performRequest({op:'seeCr7Event'}).catch(()=>{offered.delete(a.id);});},650);}

const idle=(label,cls='')=>`<b class="spin-logo ${cls}">${label}</b>`;
const stepCentre=id=>{const c=characterById(id);return `<img class="spin-peek" src="${stillArt(c)}" alt="" onerror="this.remove()"><em>${esc(c.name)}</em>`;};

// Shared wheel dialog. mode: {title, sub, tiles, label, cost(account,receipt), canSpin, buttonText, request(receipt), storageKey, footnote, onDone}
function wheelDialog(mode){
 const a=getAccount();if(!a||document.querySelector('.spin-dialog[open]'))return;
 const accountId=a.id,d=dialog('cr7-pack spin-dialog '+(mode.cls||''));let pending=false,receipt=null,result=null,canStop=false,stopNow=null;
 if(mode.storageKey){try{receipt=JSON.parse(localStorage.getItem(mode.storageKey(accountId)));if(!mode.validReceipt(receipt))receipt=null;}catch{receipt=null;}}
 d.addEventListener('cancel',e=>{if(pending)e.preventDefault();});
 d.innerHTML=`<button class="cr7-close" aria-label="Đóng">×</button><small>${mode.eyebrow}</small><h2 class="${mode.titleClass||''}">${mode.title}</h2><p class="spin-sub">${mode.sub}</p>${wheelHTML(mode.tiles,idle(mode.label,mode.titleClass),mode.badge,mode.frame,mode.sparkle,mode.hidden)}<h3 class="cr7-result-name" aria-live="polite"></h3><p class="spin-msg"></p><p class="cr7-wallet"></p><button class="cr7-gold" data-open></button><button class="cr7-gold spin-stop" data-stop hidden>DỪNG ✋</button><button class="cr7-equip" hidden>Dùng skin vừa nhận</button><button class="cr7-list">✧ Xem tỷ lệ & hiệu ứng</button><p class="cr7-error" role="status"></p><small class="cr7-footnote">${mode.footnote}</small>`;
 const $=s=>d.querySelector(s),centre=$('.spin-centre'),wheel=$('.spin-wheel');
 const sp=spinner(wheel,mode.tiles,{onStep:id=>{centre.innerHTML=mode.hidden?potwCard(mode.frame(characterById(id))):stepCentre(id);}});
 const ui=(error='')=>{const current=getAccount();if(current?.id!==accountId){d.close();return;}
  const b=$('[data-open]'),btn=mode.button(current,receipt);
  b.textContent=btn.text;b.disabled=pending||btn.disabled;b.hidden=pending;const st=$('[data-stop]');st.hidden=!pending;st.disabled=!canStop;st.textContent=canStop?'DỪNG ✋':stopNow===false?'Đang dừng…':'Đang tăng tốc…';
  $('.cr7-close').disabled=pending;$('.cr7-list').disabled=pending;
  $('.cr7-wallet').textContent='Số dư: '+current.coins+' coin'+(mode.walletNote?' · '+mode.walletNote(current):'');
  $('.cr7-error').textContent=error;$('.cr7-equip').hidden=!result||pending;
 };
 $('.cr7-close').onclick=()=>d.close();$('.cr7-list').onclick=mode.list||listRewards;
 $('[data-stop]').onclick=()=>{if(canStop&&typeof stopNow==='function')stopNow();};
 $('.cr7-equip').onclick=async e=>{e.currentTarget.disabled=true;try{await performRequest({op:'equipSkin',character:result.skin});d.close();}catch(err){e.currentTarget.disabled=false;ui(err.message);}};
 $('[data-open]').onclick=async()=>{if(pending)return;const current=getAccount();receipt??=mode.newReceipt(current);if(mode.storageKey)try{localStorage.setItem(mode.storageKey(accountId),JSON.stringify(receipt));}catch{}
  pending=true;canStop=false;stopNow=null;result=null;$('.cr7-result-name').textContent='';$('.spin-msg').textContent='';wheel.classList.remove('has-prize');ui();
  try{const [data]=await Promise.all([mode.request(receipt),sp.start()]);
   // full speed and the prize is known: now the player may press DỪNG (or it stops by itself after 8 s)
   canStop=true;ui();$('[data-stop]').focus();
   await new Promise(r=>{const t=setTimeout(r,8000);stopNow=()=>{clearTimeout(t);r();};});
   canStop=false;stopNow=false;ui();
   if(getAccount()?.id!==accountId){sp.stop();d.close();return;}
   result=data.result;const tile=Number.isInteger(result.tile)?result.tile:mode.tiles.indexOf(result.skin);
   const c=characterById(result.skin);
   if(mode.reveal){const dim=dimmer(d);await sp.land(tile,{onPlan:ms=>dim.fade(ms),winSound:false});await revealCard(d,c,mode.frame(c),{duplicate:result.duplicate});dim.remove();}
   else await sp.land(tile);
   receipt=null;if(mode.storageKey)try{localStorage.removeItem(mode.storageKey(accountId));}catch{}
   centre.innerHTML=animatedCharacter(c,'spin-prize');wheel.classList.add('has-prize');
   $('.cr7-result-name').textContent=c.name;$('.spin-msg').textContent=result.duplicate?'Bạn đã có skin này rồi (không hoàn coin).':'Skin mới đã vào bộ sưu tập!';
   if(!mode.reveal)celebrate(c);pending=false;ui();mode.onDone?.(result);
  }catch(err){sp.stop();canStop=false;stopNow=null;if(mode.resetOn?.test(err.message)){receipt=null;if(mode.storageKey)try{localStorage.removeItem(mode.storageKey(accountId));}catch{}}pending=false;ui(err.message+(receipt?' — Bấm lại để tiếp tục đúng lượt này, không trừ coin hai lần.':''));}
 };
 ui();d.showModal();
}

export function openCr7Pack(){
 wheelDialog({eyebrow:'BELLA • VÒNG QUAY',title:GOAT_HEAD,titleClass:'goat-head',label:GOAT_HEAD,badge:'🐐',frame:goatFrame,sparkle:SPARKLE,hidden:true,reveal:true,tiles:goatTiles(),
  sub:ODDS_LINE,
  footnote:`Mỗi tài khoản được tặng 1 lượt quay. Các lượt sau ${CR7_PRICE} coin. Skin trùng không hoàn coin.`,
  storageKey:id=>'bella.'+CR7_EVENT+'.pending.'+id,validReceipt:r=>r&&typeof r.free==='boolean'&&typeof r.requestId==='string',
  newReceipt:a=>({requestId:crypto.randomUUID(),free:!a.cr7Event?.freeUsed}),
  button:(a,r)=>{const free=r?r.free:!a.cr7Event?.freeUsed;return r?{text:'Tiếp tục lượt đang quay'}:free?{text:'Quay miễn phí 🎁'}:a.coins<CR7_PRICE?{text:`Chưa đủ ${CR7_PRICE} coin`,disabled:true}:{text:`Quay · ${CR7_PRICE} coin`};},
  walletNote:a=>a.cr7Event?.freeUsed?`Lượt tiếp: ${CR7_PRICE} coin`:'Còn 1 lượt miễn phí',
  request:r=>performRequest({op:'openCr7Pack',...r}),resetOn:/đã dùng lượt miễn phí|chưa đủ \d+ coin/});
}

const MYSTERY_TIERS=[[3,50],[10,35],[15,15],[20,5]];
export const mysteryTiles=()=>{const by=MYSTERY_TIERS.map(([p])=>CHARACTERS.filter(c=>c.price===p&&!c.event).map(c=>c.id)),out=[];for(let i=0;by.some(t=>t.length);i++)for(const t of by)if(t.length)out.push(t.shift());return out;};
function listMystery(){const d=dialog('cr7-rewards');const total=MYSTERY_TIERS.reduce((n,[,w])=>n+w,0);
 d.innerHTML='<button class="cr7-close" aria-label="Đóng">×</button><small>BELLA MYSTERY PACK</small><h2>Tỷ lệ gói bí ẩn</h2><p>Bốc nhóm giá theo tỷ lệ, rồi chọn đều một skin trong nhóm.</p>'+MYSTERY_TIERS.map(([p,w])=>{const skins=CHARACTERS.filter(c=>c.price===p&&!c.event);return `<h3>Skin ${p} coin · ${pct(w/total)}</h3><div class="cr7-reward-grid">${skins.map(c=>`<article style="--cr7-color:${c.color}">${art(c)}<b>${esc(c.name)}</b><span>${pct(w/total/skins.length)}</span></article>`).join('')}</div>`;}).join('');
 d.querySelector('button').onclick=()=>d.close();d.showModal();}
export function openMysteryPack(onDone){
 wheelDialog({cls:'mystery-wheel',eyebrow:'BELLA MYSTERY PACK',title:'Ai đang chờ bạn?',label:'?',badge:'?',tiles:mysteryTiles(),
  sub:'3 coin: 47,62% · 10 coin: 33,33% · 15 coin: 14,29% · 20 coin: 4,76%',
  footnote:'Giá 10 coin/lượt. Có thể ra skin đã sở hữu, skin trùng không hoàn coin.',list:listMystery,
  newReceipt:()=>({requestId:crypto.randomUUID()}),
  button:(a,r)=>r?{text:'Tiếp tục lượt đang quay'}:a.coins<10?{text:'Chưa đủ 10 coin',disabled:true}:{text:'Quay · 10 coin ✦'},
  request:r=>performRequest({op:'buyRandomSkin',requestId:r.requestId}),resetOn:/chưa đủ 10 coin/,onDone:r=>onDone?.(r.skin)});
}
document.addEventListener('click',e=>{if(e.target.closest('[data-cr7-pack]'))openCr7Pack();});
