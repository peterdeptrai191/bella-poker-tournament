export const compare=(a,b)=>{for(let i=0;i<Math.max(a.length,b.length);i++){if((a[i]||0)!==(b[i]||0))return (a[i]||0)-(b[i]||0);}return 0;};
export function evaluate5(cards){
 const ranks=cards.map(c=>c.rank).sort((a,b)=>b-a),counts=new Map();for(const r of ranks)counts.set(r,(counts.get(r)||0)+1);
 const groups=[...counts].sort((a,b)=>b[1]-a[1]||b[0]-a[0]),unique=[...new Set(ranks)];
 const straight=unique.length===5?(unique[0]-unique[4]===4?unique[0]:unique.join(',')==='14,5,4,3,2'?5:0):0;
 const flush=cards.every(c=>c.suit===cards[0].suit);
 if(straight&&flush)return [8,straight];if(groups[0][1]===4)return [7,groups[0][0],groups[1][0]];
 if(groups[0][1]===3&&groups[1][1]===2)return [6,groups[0][0],groups[1][0]];
 if(flush)return [5,...ranks];if(straight)return [4,straight];
 if(groups[0][1]===3)return [3,groups[0][0],...groups.slice(1).map(x=>x[0])];
 if(groups[0][1]===2&&groups[1][1]===2)return [2,Math.max(groups[0][0],groups[1][0]),Math.min(groups[0][0],groups[1][0]),groups[2][0]];
 if(groups[0][1]===2)return [1,groups[0][0],...groups.slice(1).map(x=>x[0])];return [0,...ranks];
}
export function evaluate(cards){let best=null;for(let a=0;a<cards.length-4;a++)for(let b=a+1;b<cards.length-3;b++)for(let c=b+1;c<cards.length-2;c++)for(let d=c+1;d<cards.length-1;d++)for(let e=d+1;e<cards.length;e++){const score=evaluate5([cards[a],cards[b],cards[c],cards[d],cards[e]]);if(!best||compare(score,best)>0)best=score;}return best;}
export const handName=score=>['Bài cao','Một đôi','Hai đôi','Bộ ba','Sảnh','Thùng','Cù lũ','Tứ quý','Thùng phá sảnh'][score?.[0]??0];
// English hand names shown on the table when a hand is won at showdown.
export const handNameEn=score=>score?.[0]===8&&score[1]===14?'Royal Flush':['High Card','One Pair','Two Pair','Three of a Kind','Straight','Flush','Full House','Four of a Kind','Straight Flush'][score?.[0]??0];
// All-in run-out: the remaining board cards are turned one at a time, RUNOUT_STEP apart, with extra suspense
// before the turn (+0.5 s) and the river (+1 s). After the last card everyone gets 1.5 s to read the board, then
// the winner, the hand name and the chips are shown. The client times the cards with these numbers and the
// server keeps the next hand back until the winner has been shown.
export const RUNOUT_LEAD=1000,RUNOUT_STEP=1800,RUNOUT_FLIP=720,RUNOUT_READ=1500,RUNOUT_EXTRA={3:500,4:1000};
// delays (ms from the all-in) for board positions from..4
export function runoutDelays(from){const out=[];let t=0;for(let i=from;i<5;i++){t=(i===from?RUNOUT_LEAD:t+RUNOUT_STEP)+(RUNOUT_EXTRA[i]||0);out.push(t);}return out;}
export const runoutRevealMs=from=>from>=5?0:runoutDelays(from).at(-1)+RUNOUT_FLIP+RUNOUT_READ;
