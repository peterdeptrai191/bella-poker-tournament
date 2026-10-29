export const CARD_SKINS=[
 {id:'classic',name:'Bella Classic',tag:'Ngà · Cổ điển',description:'Nền ngà dịu mắt, chất đỏ và đen truyền thống.'},
 {id:'neon',name:'Neon Circuit',tag:'Cyan × Hồng',description:'Viền điện cyan, số hồng neon và mạch sáng trên nền đêm.'},
 {id:'ruby',name:'Ruby Royale',tag:'Đỏ ruby × Vàng',description:'Sắc ruby, nét số vàng champagne và họa tiết kim cương.'},
 {id:'gold',name:'Golden Flame',tag:'Vàng × Đen',description:'Viền vàng kim, nền than đen và họa tiết tia lửa Bella.'},
 {id:'ice',name:'Arctic Glass',tag:'Xanh băng × Bạc',description:'Mặt bài xanh băng sáng, đường viền bạc và vân tinh thể.'},
 {id:'galaxy',name:'Violet Galaxy',tag:'Tím × Lavender',description:'Số lavender trên nền tím sâu, điểm sao và quỹ đạo ánh sáng.'},
 {id:'jade',name:'Jade Dynasty',tag:'Ngọc lục bảo × Đồng',description:'Nền xanh ngọc, nét đồng ấm và hoa văn hình học.'}
];
const storageKey='bella.card-skin';
let selected='classic';
try{const stored=localStorage.getItem(storageKey);if(CARD_SKINS.some(s=>s.id===stored))selected=stored;}catch{}
document.documentElement.dataset.cardSkin=selected;
const sample=(rank,suit,red=false)=>`<div class="card ${red?'red':''}" aria-label="${rank} ${suit}">${rank}<span>${suit}</span></div>`;
const spread=()=>`<div class="deck-spread" aria-hidden="true">${sample('A','♠')}${sample('Q','♥',true)}<div class="card back"></div></div>`;
export function openCardSkins(){
 if(document.querySelector('.deck-dialog'))return;
 const dialog=document.createElement('dialog');dialog.className='deck-dialog';dialog.setAttribute('aria-labelledby','deck-title');
 let draft=selected;
 const draw=()=>{
  const skin=CARD_SKINS.find(s=>s.id===draft);
  dialog.innerHTML=`<header class="deck-head"><div><small>BELLA ATELIER / CARD COLLECTION</small><h2 id="deck-title">Dấu ấn trên từng lá bài.</h2></div><button type="button" data-deck-close aria-label="Đóng skin bài">×</button></header><section class="deck-feature" data-card-skin="${draft}"><div class="deck-feature-art">${spread()}</div><div class="deck-feature-copy"><span>0${CARD_SKINS.findIndex(s=>s.id===draft)+1} / BỘ BÀI</span><h3>${skin.name}</h3><p>${skin.description}</p><small>MẶT TRƯỚC + MẶT LƯNG ĐỒNG BỘ</small></div></section><div class="deck-options" role="group" aria-label="Bộ sưu tập skin bài">${CARD_SKINS.map(s=>`<button type="button" class="deck-option ${draft===s.id?'selected':''}" data-deck="${s.id}" data-card-skin="${s.id}" aria-pressed="${draft===s.id}">${spread()}<strong>${s.name}</strong><small>${s.tag}</small><span class="deck-check">${draft===s.id?'✓':'○'}</span></button>`).join('')}</div><footer class="deck-footer"><p>Miễn phí · Áp dụng cho bài của bạn và bài chung trên thiết bị này.</p><button type="button" class="primary" data-deck-save>Dùng bộ bài này →</button><span role="status" class="deck-status"></span></footer>`;
  dialog.querySelector('[data-deck-close]').onclick=()=>dialog.close();
  dialog.querySelectorAll('[data-deck]').forEach(b=>b.onclick=()=>{const top=dialog.scrollTop;draft=b.dataset.deck;draw();dialog.scrollTop=top;dialog.querySelector(`[data-deck="${draft}"]`).focus({preventScroll:true});});
  dialog.querySelector('[data-deck-save]').onclick=()=>{selected=draft;document.documentElement.dataset.cardSkin=selected;try{localStorage.setItem(storageKey,selected);}catch{}dialog.querySelector('.deck-status').textContent='Đã áp dụng '+skin.name;dialog.querySelector('[data-deck-save]').textContent='✓ Đang sử dụng';};
 };
 dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);draw();dialog.showModal();
}
document.addEventListener('click',e=>{if(e.target.closest('[data-card-skins]'))openCardSkins();});
