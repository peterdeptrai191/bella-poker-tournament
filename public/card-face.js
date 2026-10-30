// The front of a skin card: G.O.A.T (M10, blue) / B.O.A.T (CR7, red) / SPECIAL label top-left in the title
// lettering, the Bella logo top-right, and five star slots along the bottom (empty slots are white outlines).
// Stars: 3 coin = 1, 5 coin = 2, 10 coin = 4, player cards and anything from 15 coin = 5.
export function starsOf(c){
 if(c.event||c.id.startsWith('goat-')||c.id.startsWith('cr7-')||c.id==='bella-m10'||c.id==='bella-portugal-7')return 5;
 const p=c.price||0;return p>=15?5:p>=10?4:p>=5?2:p>=3?1:0;
}
export const cardLabel=c=>c.id.startsWith('goat-m10')?['g','G.O.A.T']:c.id.startsWith('cr7-')?['b','B.O.A.T']:c.event?['s','SPECIAL']:null;
export const starRow=c=>{const n=starsOf(c);return `<span class="cf-stars" aria-label="${n} sao">${Array.from({length:5},(_,i)=>`<i class="${i<n?'on':''}"></i>`).join('')}</span>`;};
export function cardFace(c,art){
 const l=cardLabel(c);
 return `<span class="cf">${art}${l?`<span class="cf-label goat-head"><span class="w ${l[0]}" data-t="${l[1]}">${l[1]}</span></span>`:''}<img class="cf-logo" src="/assets/bella.png" alt="">${starRow(c)}</span>`;
}
