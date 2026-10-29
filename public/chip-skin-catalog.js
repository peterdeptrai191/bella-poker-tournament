// Chip skins and the 7-day login calendar. Shared by the server (ownership, rewards) and the browser (drawing).
export const CHIP_SKINS=[
 {id:'classic',name:'Clay Casino',tag:'Mặc định',description:'Chip đất sét sòng bài: thân màu, vạch kem ở viền, mặt giữa ghi mệnh giá.',daily:null},
 {id:'ceramic',name:'Ceramic Monaco',tag:'Quà ngày 3',description:'Chip gốm in vân tròn mảnh, viền và vạch vàng ánh kim như bàn high-roller.',daily:3},
 {id:'bella',name:'Bella Signature',tag:'Quà ngày 5',description:'Chip riêng của Bella: thân navy, mệnh giá nhận bằng màu viền, ngọn lửa vàng ở giữa.',daily:5},
 {id:'neon',name:'Neon Circuit',tag:'Quà ngày 7',description:'Chip đêm với vòng neon phát sáng, cùng bộ với skin bài Neon Circuit.',daily:7}
];
export const DEFAULT_CHIP_SKIN='classic';

// One reward per day in a row: 1 coin a day, 2 coins on day 7. Days 3, 5 and 7 also unlock a chip skin
// (already owned: just the coins). Missing a day starts again from day 1; chips you have earned are kept.
export const DAILY_REWARDS=[
 {day:1,coins:1},
 {day:2,coins:1},
 {day:3,coins:1,chip:'ceramic'},
 {day:4,coins:1},
 {day:5,coins:1,chip:'bella'},
 {day:6,coins:1},
 {day:7,coins:2,chip:'neon'}
];

// Chip values on the table, biggest first.
export const CHIP_VALUES=[25000,5000,1000,500,100,25];
// Split an amount into chips the way a dealer would, biggest values first. A big chip is used only when
// there are at least two of it; a single one is broken into the next value down (as long as that stays
// at 10 chips or fewer), so stacks stand tall enough to read at a glance. Amounts round to the nearest 25.
//
// With the big blind (bb) given, a bigger pot also *looks* bigger: the split must reach at least
// 4 × √(amount in big blinds) chips (at most 60). Until it does, one chip of the biggest value that still has
// more than 3 chips is changed into the next value down, so the pile keeps 3–5 colours. The total always
// equals the amount.
export const MAX_PILE=60;
export const pileTarget=(amount,bb)=>Math.max(1,Math.min(MAX_PILE,Math.round(4*Math.sqrt(amount/Math.max(1,bb)))));
export function chipBreakdown(amount,bb=null){
 let rest=Math.round(Math.max(0,amount)/25)*25;const out=[];
 CHIP_VALUES.forEach((value,i)=>{const n=Math.floor(rest/value),next=CHIP_VALUES[i+1];if(!n)return;if(n<2&&next&&rest/next<=10)return;out.push({value,count:n});rest-=n*value;});
 if(!out.length&&amount>0)out.push({value:25,count:1});
 if(!bb)return out;
 const count=new Map(out.map(c=>[c.value,c.count])),want=pileTarget(amount,bb),breakable=CHIP_VALUES.slice(0,-1);
 let total=out.reduce((n,c)=>n+c.count,0);
 while(total<want){
  const pick=breakable.filter(v=>(count.get(v)||0)>3),pool=pick.length?pick:breakable.filter(v=>count.get(v));if(!pool.length)break;
  const v=Math.max(...pool),next=CHIP_VALUES[CHIP_VALUES.indexOf(v)+1],extra=v/next-1;if(total+extra>MAX_PILE)break;
  count.set(v,count.get(v)-1);if(!count.get(v))count.delete(v);count.set(next,(count.get(next)||0)+v/next);total+=extra;
 }
 return CHIP_VALUES.filter(v=>count.get(v)).map(v=>({value:v,count:count.get(v)}));
}
