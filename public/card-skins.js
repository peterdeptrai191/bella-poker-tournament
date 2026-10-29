import {CARD_SKINS} from './card-skin-catalog.js';
export {CARD_SKINS};
let getAccount=()=>null,performRequest=null;
export function configureCardSkins(options){getAccount=options.getAccount;performRequest=options.request;}
const owns=(a,id)=>id==='classic'||a?.ownedCardSkins?.includes(id);
const sample=(rank,suit,red=false)=>`<div class="card ${red?'red':''}" aria-label="${rank} ${suit}">${rank}<span>${suit}</span></div>`;
const spread=()=>`<div class="deck-spread" aria-hidden="true">${sample('A','♠')}${sample('Q','♥',true)}<div class="card back"></div></div>`;
export function openCardSkins(){
 if(document.querySelector('.deck-dialog')||!getAccount())return;
 const dialog=document.createElement('dialog');dialog.className='deck-dialog';dialog.setAttribute('aria-labelledby','deck-title');
 const accountId=getAccount().id;let draft=getAccount().equippedCardSkin||'classic';let pending=false;
 const draw=()=>{
  const skin=CARD_SKINS.find(s=>s.id===draft),account=getAccount();if(account?.id!==accountId){dialog.close();return;}
  dialog.innerHTML=`<header class="deck-head"><div><small>BELLA ATELIER / CARD COLLECTION</small><h2 id="deck-title">Dấu ấn trên từng lá bài.</h2></div><button type="button" data-deck-close aria-label="Đóng skin bài">×</button></header><section class="deck-feature" data-card-skin="${draft}"><div class="deck-feature-art">${spread()}</div><div class="deck-feature-copy"><span>0${CARD_SKINS.findIndex(s=>s.id===draft)+1} / BỘ BÀI</span><h3>${skin.name}</h3><p>${skin.description}</p><small>MẶT TRƯỚC + MẶT LƯNG ĐỒNG BỘ</small></div></section><div class="deck-options" role="group" aria-label="Bộ sưu tập skin bài">${CARD_SKINS.map(s=>`<button type="button" class="deck-option ${draft===s.id?'selected':''}" data-deck="${s.id}" data-card-skin="${s.id}" aria-pressed="${draft===s.id}">${spread()}<strong>${s.name}</strong><small>${s.tag}</small><span class="deck-check">${draft===s.id?'✓':'○'}</span></button>`).join('')}</div><footer class="deck-footer"><p>Miễn phí · Áp dụng cho bài của bạn và bài chung trên thiết bị này.</p><button type="button" class="primary" data-deck-save>Dùng bộ bài này →</button><span role="status" class="deck-status"></span></footer>`;
  dialog.querySelector('[data-deck-close]').onclick=()=>dialog.close();
  dialog.querySelectorAll('[data-deck]').forEach(b=>b.onclick=()=>{const top=dialog.scrollTop;draft=b.dataset.deck;draw();dialog.scrollTop=top;dialog.querySelector(`[data-deck="${draft}"]`).focus({preventScroll:true});});
  dialog.querySelector('.deck-head small').textContent='BELLA CARD SHOP · 🪙 '+account.coins+' XU';
  dialog.querySelectorAll('[data-deck]').forEach(b=>{const s=CARD_SKINS.find(s=>s.id===b.dataset.deck);const price=document.createElement('small');price.className='deck-price';price.textContent=s.price===0?'Miễn phí':owns(account,s.id)?'✓ Đã sở hữu':'🔒 '+s.price+' xu';b.append(price);});
  dialog.querySelector('.deck-footer p').textContent='Mỗi bộ mới 3 xu · Sở hữu và lựa chọn được lưu theo tài khoản.';
  dialog.querySelector('[data-deck-save]').textContent=owns(account,draft)?'Dùng bộ bài này →':'Mở khóa · '+skin.price+' xu';
  const equip=async()=>{if(pending)return;pending=true;dialog.querySelector('[data-deck-save]').disabled=true;try{await performRequest({op:'equipCardSkin',skin:draft});draw();dialog.querySelector('.deck-status').textContent='Đã áp dụng '+skin.name;dialog.querySelector('[data-deck-save]').textContent='✓ Đang sử dụng';}catch(e){dialog.querySelector('.deck-status').textContent=e.message;}finally{pending=false;dialog.querySelector('[data-deck-save]').disabled=false;}};
  dialog.querySelector('[data-deck-save]').onclick=()=>{
   if(owns(getAccount(),draft)){equip();return;}
   const panel=document.createElement('section');panel.className='deck-confirm';panel.setAttribute('role','alertdialog');panel.setAttribute('aria-label','Xác nhận mua skin bài');
   panel.innerHTML=`<div><h3>Mở khóa ${skin.name}</h3><p>Giá: <strong>${skin.price} xu</strong><br>Số dư: ${getAccount().coins} xu</p><div><button type="button" data-deck-cancel>Để sau</button><button type="button" class="primary" data-deck-buy ${getAccount().coins<skin.price?'disabled':''}>${getAccount().coins<skin.price?'Chưa đủ xu':'Xác nhận · '+skin.price+' xu'}</button></div><p role="status"></p></div>`;
   dialog.append(panel);panel.querySelector('[data-deck-cancel]').onclick=()=>panel.remove();panel.querySelector('[data-deck-buy]').onclick=async()=>{if(pending)return;pending=true;panel.querySelector('[data-deck-buy]').disabled=true;try{await performRequest({op:'buyCardSkin',skin:draft});draw();dialog.querySelector('.deck-status').textContent='Đã mở khóa '+skin.name+'. Chọn Dùng bộ bài để áp dụng.';}catch(e){panel.querySelector('[role="status"]').textContent=e.message;panel.querySelector('[data-deck-buy]').disabled=false;}finally{pending=false;}};
   panel.querySelector('[data-deck-cancel]').focus();
  };
 };
 dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);draw();dialog.showModal();
}
document.addEventListener('click',e=>{if(e.target.closest('[data-card-skins]'))openCardSkins();});
