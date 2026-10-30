import {CHARACTERS,characterById} from './characters.js';
import {MASKED_PRICE,maskedGroups,maskedOdds} from './masked-catalog.js';
import {animatedCharacter} from './character-motion.js';
import {playSound,whoosh} from './pot-fx.js';
import {effectsReduced} from './visual-effects.js';
let account,request,isHome=()=>false;
export function configureMasked(o){account=o.getAccount;request=o.request;isHome=o.isHome||(()=>false);}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function openMaskedPack(){
 const a=account();if(!a||document.querySelector('.ms-dialog[open]'))return;
 const owner=a.id,key='bella.masked.pending.'+owner;let receipt=null,result=null,taps=0,busy=false,done=false;
 try{const saved=JSON.parse(localStorage.getItem(key));if(typeof saved?.requestId==='string')receipt=saved;}catch{}
 const d=document.createElement('dialog');d.className='ms-dialog';
 const groups=maskedGroups(),odds=maskedOdds(),labels=['Ca sĩ tâm điểm · 20% (mỗi người 4%)','Skin trên 6 đến 10 xu · 30%','Skin trả phí từ 6 xu trở xuống · 50%'];
 d.innerHTML=`<button class="ms-close" aria-label="Đóng sự kiện">×</button><header><small>BELLA · SỰ KIỆN ÂM NHẠC</small><h2>THE MASKED SINGER</h2><p>${a.maskedGift?.freeUsed?'15 xu / gói':'Bạn có 1 lượt mở miễn phí'} · Chạm 3 lần để lộ diện</p></header><div class="ms-stage"><div class="ms-beam"></div><div class="ms-beam second"></div><div class="ms-sparks" aria-hidden="true">${Array.from({length:18},(_,i)=>`<i style="--i:${i};--x:${(i*37)%100}%"></i>`).join('')}</div><div class="ms-card-stack"><div class="ms-prize"></div><button type="button" class="ms-packet" aria-label="Chạm để mở gói · 15 xu"><span class="ms-foil ms-foil-a"></span><span class="ms-foil ms-foil-b"></span><span class="ms-foil ms-foil-c"></span></button></div><div class="ms-platform"></div></div><p class="ms-status" aria-live="polite"></p><div class="ms-wallet"></div><button class="ms-claim" hidden>Nhận thẻ</button><p class="ms-error" role="alert"></p><details><summary>Nhân vật & tỷ lệ nhận</summary>${groups.map((ids,i)=>`<h3>${labels[i]}</h3><div class="ms-odds-grid">${ids.map(id=>{const c=characterById(id);return `<article class="ms-odds-card" style="--character-color:${c.color}">${animatedCharacter(c,'ms-odds-art')}<strong>${esc(c.name)}</strong><span>${odds[id].toLocaleString('vi-VN',{maximumFractionDigits:2})}%</span></article>`;}).join('')}</div>`).join('')}<p>Chọn đều trong từng nhóm. Có thể nhận skin đã sở hữu; không hoàn xu khi trùng.</p></details>`;
 document.body.append(d);d.showModal();const $=s=>d.querySelector(s);
 const ui=()=>{const free=result?.free??!account().maskedGift?.freeUsed;$('header p').textContent=(free?'Lượt mở miễn phí':'15 xu / gói')+' · Chạm 3 lần để lộ diện';$('.ms-packet').setAttribute('aria-label','Chạm để mở gói · '+(free?'Miễn phí':'15 xu'));$('.ms-wallet').textContent='Số dư: '+account().coins+' xu';$('.ms-status').textContent=done?'LỘ DIỆN':busy?'Đang xác nhận gói…':taps?'Chạm '+(3-taps)+' lần nữa để xé hết lớp mặt nạ':receipt?'Tiếp tục gói đang mở · không trừ xu lần nữa':free?'Chạm vào gói để mở · MIỄN PHÍ':'Chạm vào gói để mở · 15 xu';$('.ms-packet').disabled=busy||done||(!receipt&&!free&&account().coins<MASKED_PRICE);if(!receipt&&!free&&account().coins<MASKED_PRICE)$('.ms-status').textContent='Cần 15 xu để mở gói';};
 const close=()=>{if(busy||result&&!done)return;d.close();};$('.ms-close').onclick=close;d.oncancel=e=>{if(busy||result&&!done)e.preventDefault();};d.onclose=()=>d.remove();
 $('.ms-packet').onclick=async()=>{
  if(busy||done)return;if(account().id!==owner){d.close();return;}
  if(!result){busy=true;receipt??={requestId:crypto.randomUUID()};try{localStorage.setItem(key,JSON.stringify(receipt));}catch{}ui();
   try{const data=await request({op:'openMaskedPack',requestId:receipt.requestId});if(account().id!==owner){d.close();return;}result=data.result;const c=characterById(result.skin);$('.ms-prize').innerHTML=animatedCharacter(c,'ms-prize-art')+`<strong>${esc(c.name)}</strong><small>${result.duplicate?'Bạn đã sở hữu · Không hoàn xu':'Skin mới đã vào bộ sưu tập!'}</small>`;$('.ms-error').textContent='';}
   catch(e){$('.ms-error').textContent=e.message;if(/chưa đủ|Mã thao tác/.test(e.message)){receipt=null;try{localStorage.removeItem(key);}catch{}}busy=false;ui();return;}busy=false;
  }
  taps++;d.dataset.taps=taps;playSound('one',{volume:.65});whoosh({ms:450,volume:.35});
  if(taps===3){busy=true;$('.ms-status').textContent='Đang lộ diện…';setTimeout(()=>{done=true;busy=false;d.classList.add('ms-revealed');$('.ms-packet').hidden=true;$('.ms-claim').hidden=false;playSound('win',{volume:1});whoosh({ms:1400,volume:.7});ui();},effectsReduced()?0:850);}
  ui();
 };
 $('.ms-claim').onclick=()=>{try{localStorage.removeItem(key);}catch{}d.close();};ui();
}
const giftPending=new Set();
export function offerMaskedGift(){
 const a=account();if(!a||!isHome()||a.maskedGift?.noticeSeen||giftPending.has(a.id))return;
 giftPending.add(a.id);
 setTimeout(async()=>{
  if(account()?.id!==a.id||!isHome()){giftPending.delete(a.id);return;}
  const opened=document.querySelector('dialog[open]');if(opened){opened.addEventListener('close',()=>{giftPending.delete(a.id);offerMaskedGift();},{once:true});return;}
  try{
   const data=await request({op:'claimMaskedNotice'});if(!data.result?.show)return;
   const show=()=>{
    if(account()?.id!==a.id)return;
    const active=document.querySelector('dialog[open]');if(active){active.addEventListener('close',show,{once:true});return;}
    const d=document.createElement('dialog');d.className='cr7-dialog ms-gift-popup';d.innerHTML='<button class="ms-gift-close" aria-label="Đóng thông báo">×</button><img src="/assets/promo/masked-singer.png" alt="Bella ca sĩ mặt nạ"><small>QUÀ TẶNG TOÀN SERVER</small><h2>Tặng bạn 1 lượt mở miễn phí!</h2><p>Khám phá The Masked Singer · Bella.<br>Chạm 3 lần để xé gói và lộ diện nhân vật.<br>Lượt miễn phí đã sẵn sàng trong tài khoản của bạn.</p><button class="cr7-gold" data-gift-open>Mở miễn phí ngay →</button><button class="cr7-list" data-gift-later>Để sau</button>';
    d.querySelector('.ms-gift-close').onclick=()=>d.close();d.querySelector('[data-gift-later]').onclick=()=>d.close();d.querySelector('[data-gift-open]').onclick=()=>{d.close();openMaskedPack();};d.onclose=()=>d.remove();document.body.append(d);d.showModal();
   };show();
  }catch{giftPending.delete(a.id);}
 },250);
}
