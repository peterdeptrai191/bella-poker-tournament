import {compare,evaluate,evaluate5,handName} from './hand-evaluator.js';
export const cardKey=c=>`${c.rank}${c.suit}`;

// Deliberately copy only the local hand, public board and count of live opponents.
export function equityInputs(room){
 const me=room?.players.find(p=>p.id===room.me),h=room?.hand;
 if(room?.status!=='running'||!h||h.stage==='complete'||!me?.inHand||me.folded||me.hole?.length!==2)return null;
 return {hole:me.hole.map(({rank,suit})=>({rank,suit})),board:h.board.map(({rank,suit})=>({rank,suit})),opponents:room.players.filter(p=>p.id!==room.me&&p.inHand&&!p.folded).length};
}

export function estimateEquity({hole,board,opponents},{samples=600,random=Math.random}={}){
 const known=[...hole,...board],keys=new Set(known.map(cardKey));
 if(hole.length!==2||board.length>5||keys.size!==known.length||!Number.isInteger(opponents)||opponents<0||opponents>8||!Number.isInteger(samples)||samples<1)throw new Error('Invalid equity input');
 if(known.some(c=>!Number.isInteger(c.rank)||c.rank<2||c.rank>14||!['c','d','h','s'].includes(c.suit)))throw new Error('Invalid card');
 if(opponents===0)return {equity:100,samples:0};
 const deck=Array.from({length:52},(_,i)=>({rank:2+i%13,suit:['c','d','h','s'][Math.floor(i/13)]})).filter(c=>!keys.has(cardKey(c)));
 const missing=5-board.length,needed=missing+opponents*2;let share=0;
 for(let trial=0;trial<samples;trial++){
  const pool=deck.slice();for(let i=0;i<needed;i++){const j=i+Math.floor(random()*(pool.length-i));[pool[i],pool[j]]=[pool[j],pool[i]];}
  const fullBoard=[...board,...pool.slice(0,missing)],score=evaluate([...hole,...fullBoard]);let tied=1,lost=false;
  for(let i=0;i<opponents;i++){const offset=missing+i*2,other=evaluate([pool[offset],pool[offset+1],...fullBoard]),result=compare(other,score);if(result>0){lost=true;break;}if(result===0)tied++;}
  if(!lost)share+=1/tied;
 }
 return {equity:100*share/samples,samples};
}

export function bestFive(cards){
 if(cards.length<5||cards.length>7)return null;let best=null,indices=null;
 for(let a=0;a<cards.length-4;a++)for(let b=a+1;b<cards.length-3;b++)for(let c=b+1;c<cards.length-2;c++)for(let d=c+1;d<cards.length-1;d++)for(let e=d+1;e<cards.length;e++){
  const chosen=[a,b,c,d,e],score=evaluate5(chosen.map(i=>cards[i]));if(!best||compare(score,best)>0){best=score;indices=chosen;}
 }
 return {indices,score:best,name:handName(best)};
}

export function winningSelection(room,playerId=room?.me){
 const h=room?.hand,me=room?.players.find(p=>p.id===playerId);
 if(!h||h.stage!=='complete'||!h.showdown||h.board.length!==5||me?.folded||me?.hole?.length!==2)return null;
 const realWins=h.winners.filter(w=>w.id===playerId&&w.amount>0&&w.hand!=='Hoàn phần cược dư'&&w.hand!=='Đối thủ bỏ bài');if(!realWins.length)return null;
 const result=bestFive([...me.hole,...h.board]);
 return {...result,hole:result.indices.filter(i=>i<2),board:result.indices.filter(i=>i>=2).map(i=>i-2),cards:result.indices.map(i=>({card:[...me.hole,...h.board][i],source:i<2?'Bài bạn':'Bài chung'})),shared:(h.pots||[]).some(p=>p.winners?.includes(playerId)&&p.winners.length>1),amount:realWins.reduce((n,w)=>n+w.amount,0)};
}

export function showdownHighlights(room){
 if(room?.hand?.stage!=='complete'||!room.hand.showdown)return null;
 const players={},board=new Set();
 for(const p of room.players){const win=winningSelection(room,p.id);players[p.id]=win?.hole||[];for(const i of win?.board||[])board.add(i);}
 return {players,board:[...board]};
}
