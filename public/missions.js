// "Chơi cùng nhau": tickets, shards, the two daily group missions and the streak, plus the reward toast after
// a game with friends. Numbers come from the server (account.group, room.groupReward).
const SHARDS=5,GAMES=5;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const walletChip=a=>`<button type="button" class="ticket-chip" data-missions aria-label="Vé quay và nhiệm vụ nhóm">🎟 <b>${a.tickets||0}</b> vé <small>${a.shards||0}/${SHARDS} mảnh</small></button>`;
export function openMissions(a){
 if(!a||document.querySelector('.missions-dialog[open]'))return;const g=a.group||{};
 const row=(done,title,detail,reward,progress)=>`<li class="${done?'done':''}"><span class="m-check" aria-hidden="true">${done?'✓':''}</span><div><b>${title}</b><small>${detail}</small>${progress!=null?`<i class="m-bar"><i style="width:${Math.min(100,progress*100)}%"></i></i>`:''}</div><em>${reward}</em></li>`;
 const d=document.createElement('dialog');d.className='cr7-dialog missions-dialog';d.addEventListener('close',()=>d.remove(),{once:true});
 d.innerHTML=`<button class="cr7-close" aria-label="Đóng">×</button><small>CHƠI CÙNG NHAU</small><h2>Vé quay & nhiệm vụ nhóm</h2>
 <div class="m-wallet"><div><b>${a.tickets||0}</b><span>vé quay</span></div><div><b>${a.shards||0}/${SHARDS}</b><span>mảnh vé</span></div><div><b>${g.streak||0}</b><span>ngày liên tiếp</span></div></div>
 <h3>Mỗi ván chơi với bạn bè</h3><ul class="m-list">
 ${row(false,'Thưởng coin theo số bạn','Mỗi người nhận 1 coin cho mỗi người thật khác trong phòng','+1 coin / bạn')}
 ${row(false,'1 mảnh vé mỗi ván','Đủ 5 mảnh tự đổi thành 1 vé quay G.O.A.T or B.O.A.T','+1 mảnh')}
 ${row(false,'Vô địch','Người về nhất nhận thêm 1 vé quay','+1 vé')}</ul>
 <h3>Nhiệm vụ nhóm hôm nay</h3><ul class="m-list">
 ${row(g.play5Done,`Chơi ${GAMES} ván cùng bạn`,`Đã chơi ${Math.min(g.gamesToday||0,GAMES)}/${GAMES} ván hôm nay`,'+2 mảnh',(g.gamesToday||0)/GAMES)}
 ${row(g.flushDone,'Có người ra Thùng','Trong ván chơi cùng bạn, ai đó có Thùng trở lên lúc lật bài','+1 mảnh')}</ul>
 <h3>Chuỗi ngày chơi cùng nhau</h3><ul class="m-list">
 ${row((g.streak||0)>=3,'3 ngày liên tiếp','Mỗi 3 ngày liền có chơi cùng bạn',`+1 vé`,((g.streak||0)%3||((g.streak||0)?3:0))/3)}
 ${row((g.streak||0)>=7,'7 ngày liên tiếp','Đủ một tuần không bỏ ngày nào','+2 vé',Math.min(7,g.streak||0)/7)}</ul>
 <p class="m-note">Chỉ tính khi phòng có từ 2 người thật trở lên. Phòng toàn bot hoặc chơi một mình không có thưởng. Coin và vé dùng chung cho mọi trò của Bella.</p>`;
 document.body.append(d);d.querySelector('.cr7-close').onclick=()=>d.close();d.showModal();
}
// Toast text for what this game paid me, or null.
export function groupRewardText(r){if(!r)return null;const parts=[`+${r.coins} coin`,`+${r.shards} mảnh vé`];if(r.tickets)parts.push(`+${r.tickets} vé`);if(r.converted)parts.push(`(${r.converted} vé từ mảnh)`);
 const m={play5:'Hoàn thành 5 ván cùng bạn',flush:'Có người ra Thùng',streak3:'Chuỗi 3 ngày',streak7:'Chuỗi 7 ngày'};const extra=(r.missions||[]).map(x=>m[x]).filter(Boolean);
 return 'Chơi cùng bạn: '+parts.join(' · ')+(extra.length?' — '+extra.join(', '):'');}
