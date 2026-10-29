// Chip skin picker and the 7-day login gift. Chip skins B, C and D are not sold: they come from the gift
// calendar on days 3, 5 and 7. The server decides every reward; this file only shows them.
import {CHIP_SKINS,DAILY_REWARDS} from '/chip-skin-catalog.js';
import {chipFace,chipStacks} from '/pot-fx.js';

let getAccount=()=>null,performRequest=null,offered=false;
export function configureChipSkins(options){getAccount=options.getAccount;performRequest=options.request;}
const owns=(a,id)=>id==='classic'||a?.ownedChipSkins?.includes(id);
const skinName=id=>CHIP_SKINS.find(s=>s.id===id)?.name||id;
// Four chips and a small stack, drawn in the given skin whatever skin the page has on.
const preview=(id,size=34)=>`<div class="chip-preview" data-chip-preview="${id}" aria-hidden="true"><div class="chip-preview-faces">${[100,500,1000,5000].map(v=>chipFace(v,size)).join('')}</div>${chipStacks(3250)}</div>`;

function dialogShell(cls,label){const d=document.createElement('dialog');d.className='deck-dialog '+cls;d.setAttribute('aria-label',label);d.addEventListener('close',()=>d.remove());document.body.append(d);return d;}

export function openChipSkins(){
 if(document.querySelector('.deck-dialog')||!getAccount())return;
 const dialog=dialogShell('chip-dialog','Bộ sưu tập chip');let draft=getAccount().equippedChipSkin||'classic',pending=false;
 const draw=(status='')=>{
  const a=getAccount();if(!a){dialog.close();return;}const skin=CHIP_SKINS.find(s=>s.id===draft),mine=owns(a,draft),using=a.equippedChipSkin===draft;
  dialog.innerHTML=`<header class="deck-head"><div><small>BELLA CHIP COLLECTION</small><h2>Chip của bạn trên bàn.</h2></div><button type="button" data-close aria-label="Đóng">×</button></header>
  <section class="chip-feature">${preview(draft,46)}<div><h3>${skin.name}</h3><p>${skin.description}</p><small>${skin.daily?`QUÀ ĐĂNG NHẬP NGÀY ${skin.daily}`:'CHIP MẶC ĐỊNH'}</small></div></section>
  <div class="chip-options" role="group" aria-label="Chọn skin chip">${CHIP_SKINS.map(s=>`<button type="button" class="chip-option ${draft===s.id?'selected':''} ${owns(a,s.id)?'':'locked'}" data-skin="${s.id}" aria-pressed="${draft===s.id}">${preview(s.id,24)}<strong>${s.name}</strong><small>${a.equippedChipSkin===s.id?'✓ Đang dùng':owns(a,s.id)?'Đã sở hữu':'🔒 '+s.tag}</small></button>`).join('')}</div>
  <footer class="deck-footer"><p>Chip áp dụng cho bàn chơi trên các thiết bị của bạn. Skin B, C, D nhận từ quà đăng nhập 7 ngày.</p>${mine?`<button type="button" class="primary" data-use ${using||pending?'disabled':''}>${using?'✓ Đang sử dụng':'Dùng chip này →'}</button>`:`<button type="button" class="primary" data-open-daily>Xem quà ngày ${skin.daily} →</button>`}<span role="status" class="deck-status">${status}</span></footer>`;
  dialog.querySelector('[data-close]').onclick=()=>dialog.close();
  dialog.querySelectorAll('[data-skin]').forEach(b=>b.onclick=()=>{draft=b.dataset.skin;draw();dialog.querySelector(`[data-skin="${draft}"]`).focus({preventScroll:true});});
  dialog.querySelector('[data-open-daily]')?.addEventListener('click',()=>{dialog.close();openDailyGift();});
  dialog.querySelector('[data-use]')?.addEventListener('click',async()=>{if(pending)return;pending=true;draw();try{await performRequest({op:'equipChipSkin',skin:draft});pending=false;draw('Đã dùng '+skin.name);}catch(e){pending=false;draw(e.message);}});
 };
 draw();dialog.showModal();
}

// The reward shown on one day of the calendar.
function rewardView(r,a){
 if(r.chip&&!owns(a,r.chip))return `<span class="chip-preview daily-chip" data-chip-preview="${r.chip}">${chipFace(1000,30)}</span><b>${skinName(r.chip)}</b><small>+${r.coins} xu</small>`;
 return `<span class="daily-coin" aria-hidden="true">🪙</span><b>+${r.coins} xu</b>${r.chip?'<small>Đã có chip</small>':''}`;
}

export function openDailyGift(){
 if(document.querySelector('.deck-dialog')||!getAccount())return;
 const dialog=dialogShell('daily-dialog','Quà đăng nhập hằng ngày');let pending=false,result=null;
 const draw=(error='')=>{
  const a=getAccount();if(!a){dialog.close();return;}const {day,claimed}=a.daily||{day:1,claimed:false};
  dialog.innerHTML=`<header class="deck-head"><div><small>QUÀ ĐĂNG NHẬP HẰNG NGÀY</small><h2>${claimed?'Hẹn bạn ngày mai.':`Ngày ${day} / 7`}</h2></div><button type="button" data-close aria-label="Đóng">×</button></header>
  <ol class="daily-days">${DAILY_REWARDS.map(r=>{const state=r.day<day||(claimed&&r.day===day)?'done':r.day===day?'today':'later';return `<li class="daily-day ${state} ${r.chip?'chip-day':''}"><span class="daily-label">${state==='done'?'<i class="daily-check" aria-label="Đã nhận">✓</i> ':''}${state==='today'?'HÔM NAY':'NGÀY '+r.day}</span>${rewardView(r,a)}</li>`;}).join('')}</ol>
  ${result?`<p class="daily-result" role="status">${result.chip?`Bạn nhận được chip <b>${skinName(result.chip)}</b>${result.coins?` và ${result.coins} xu`:''}!`:`+${result.coins} xu đã vào ví.`}</p>`:''}
  <footer class="deck-footer"><p>Vào game mỗi ngày để đi tiếp. Bỏ lỡ một ngày sẽ quay lại ngày 1, chip đã nhận vẫn giữ nguyên.</p>${result?.chip?`<button type="button" class="primary" data-equip="${result.chip}">Dùng chip mới →</button>`:claimed?`<button type="button" class="primary" data-close-bottom>Đóng</button>`:`<button type="button" class="primary daily-claim" data-claim ${pending?'disabled':''}>${pending?'Đang mở quà…':'Nhận quà hôm nay'}</button>`}<span role="status" class="deck-status">${error}</span></footer>`;
  for(const b of dialog.querySelectorAll('[data-close],[data-close-bottom]'))b.onclick=()=>dialog.close();
  dialog.querySelector('[data-claim]')?.addEventListener('click',async()=>{if(pending)return;pending=true;draw();try{const data=await performRequest({op:'claimDaily'});result=data.result?.already?null:data.result;pending=false;draw();dialog.querySelector('.daily-day.done:last-of-type, .daily-result')?.scrollIntoView?.({block:'nearest'});}catch(e){pending=false;draw(e.message);}});
  dialog.querySelector('[data-equip]')?.addEventListener('click',async e=>{const id=e.currentTarget.dataset.equip;try{await performRequest({op:'equipChipSkin',skin:id});dialog.close();}catch(err){draw(err.message);}});
 };
 draw();dialog.showModal();
}

// Opens the gift once per visit when today's gift is still waiting and no other popup is open.
export function maybeOfferDaily(){
 const a=getAccount();if(offered||!a||a.daily?.claimed!==false)return;
 if(document.querySelector('dialog[open]')){document.querySelector('dialog[open]').addEventListener('close',()=>setTimeout(maybeOfferDaily,250),{once:true});return;}
 offered=true;setTimeout(()=>{if(!document.querySelector('dialog[open]'))openDailyGift();else offered=false;},500);
}

document.addEventListener('click',e=>{if(e.target.closest('[data-chip-skins]'))openChipSkins();else if(e.target.closest('[data-daily-gift]'))openDailyGift();});
