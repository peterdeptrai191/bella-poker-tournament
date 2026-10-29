// Change the name other players see. Your login name stays the same; the server refuses a name that
// another player already uses (as a display name or as their login).
let getAccount=()=>null,performRequest=null;
export function configureAccountName(options){getAccount=options.getAccount;performRequest=options.request;}
export function openRename(){
 const a=getAccount();if(!a||document.querySelector('.deck-dialog'))return;
 const d=document.createElement('dialog');d.className='deck-dialog rename-dialog';d.setAttribute('aria-labelledby','rename-title');
 d.innerHTML=`<header class="deck-head"><div><small>TÀI KHOẢN BELLA</small><h2 id="rename-title">Đổi tên hiển thị</h2></div><button type="button" data-close aria-label="Đóng">×</button></header>
 <form class="rename-form"><label for="rename-input">Tên người khác nhìn thấy trên bàn</label><input id="rename-input" name="name" minlength="2" maxlength="22" required autocomplete="nickname" value=""><p class="rename-hint">Bạn vẫn đăng nhập bằng <b></b>. Tên mới được lưu và đồng bộ vào bàn đang chơi.</p><p class="rename-error" role="alert"></p><div class="rename-actions"><button type="button" data-close>Hủy</button><button class="primary" type="submit">Lưu tên</button></div></form>`;
 const input=d.querySelector('#rename-input');input.value=a.name||a.username;d.querySelector('.rename-hint b').textContent=a.username;
 d.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>d.close());
 d.querySelector('form').onsubmit=async e=>{e.preventDefault();const save=d.querySelector('button[type=submit]');save.disabled=true;d.querySelector('.rename-error').textContent='';
  try{await performRequest({op:'renameAccount',name:input.value});d.close();}catch(err){d.querySelector('.rename-error').textContent=err.message;save.disabled=false;input.focus();}};
 d.addEventListener('close',()=>d.remove());document.body.append(d);d.showModal();input.select();
}
document.addEventListener('click',e=>{if(e.target.closest('[data-rename]'))openRename();});
