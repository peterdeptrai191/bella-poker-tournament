export const displayedPot=room=>!room?.hand?0:room.hand.stage==='complete'?(room.hand.winners||[]).reduce((n,w)=>n+w.amount,0):(room.hand.pot||0);
// Compare authoritative snapshots, never infer eliminations from a zero stack alone.
export function diffTableEffects(before,after){
 if(!before||before.code!==after.code||!after.hand)return [];
 const events=[],hand=after.hand,sameHand=before.hand?.id===hand.id;
 const pot=displayedPot(after),previousPot=sameHand?displayedPot(before):0;
 if(pot!==previousPot)events.push({key:`${after.code}:${hand.id}:pot:${pot}`,type:'pot',amount:pot,delta:pot-previousPot,newHand:!sameHand,duration:3000,delay:0});
 const count=sameHand?before.hand.board.length:0;
 for(let i=count;i<hand.board.length;i++)events.push({key:`${after.code}:${hand.id}:board:${i}`,type:'board',index:i,delay:(i-count)*190,duration:540+(i-count)*190});
 for(const p of after.players){
  const old=before.players.find(x=>x.id===p.id);if(!old)continue;
  const a=p.lastAction,oldAction=sameHand?old.lastAction:null;
  const newAction=a&&JSON.stringify(a)!==JSON.stringify(oldAction);
  const amount=Math.max(newAction?a.paid||0:0,(before.status==='waiting'?after.config.startingStack:old.stack)-p.stack,0);
  if(amount>0)events.push({key:`${after.code}:${hand.id}:chips:${p.id}:${a?.at||'blind'}:${p.stack}:${a?.total||0}`,type:'chips',playerId:p.id,amount,duration:1600,delay:0});
 }
 const eliminated=after.players.filter(p=>p.rank>1&&!before.players.find(x=>x.id===p.id)?.rank);
 if(eliminated.length)events.push({key:`${after.code}:${hand.id}:out:${eliminated.map(p=>p.id).sort().join(',')}`,type:'elimination',players:eliminated.map(p=>({id:p.id,name:p.name,rank:p.rank})),duration:6500,delay:0});
 return events;
}
