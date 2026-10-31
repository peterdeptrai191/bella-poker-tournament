import {RUNOUT_FLIP,runoutDelays,runoutRevealMs} from './hand-evaluator.js';
export const displayedPot=room=>!room?.hand?0:room.hand.stage==='complete'?(room.hand.winners||[]).reduce((n,w)=>n+w.amount,0):(room.hand.pot||0);
// Compare authoritative snapshots, never infer eliminations from a zero stack alone.
export function diffTableEffects(before,after){
 if(!before||before.code!==after.code||!after.hand)return [];
 const events=[],hand=after.hand,sameHand=before.hand?.id===hand.id;
 // Hand blinds are the stakes actually in play; the level clock may advance mid-hand.
 const oldBlinds=before.hand?.blinds,blinds=hand.blinds;
 if(before.status==='running'&&after.status==='running'&&oldBlinds&&blinds&&(blinds.sb>oldBlinds.sb||blinds.bb>oldBlinds.bb))events.push({key:`${after.code}:blind:${blinds.level}:${blinds.sb}:${blinds.bb}`,type:'blind',from:{sb:oldBlinds.sb,bb:oldBlinds.bb},to:{sb:blinds.sb,bb:blinds.bb},duration:4500,delay:0});
 const count=sameHand?before.hand.board.length:0;
 // After an all-in the rest of the board is turned one card at a time (RUNOUT_STEP apart) and the winner is
 // only revealed once the last card is down (the 'runout' event; app.js hides the result until then).
 const runout=hand.runoutFrom!=null&&hand.board.length===5&&count<5,reveal=runout?runoutRevealMs(count):0,times=runout?runoutDelays(count):[];
 for(let i=count;i<hand.board.length;i++){const delay=runout?times[i-count]:(i-count)*190;events.push({key:`${after.code}:${hand.id}:board:${i}`,type:'board',index:i,delay,duration:(runout?RUNOUT_FLIP:540)+delay,runout});}
 if(runout)events.push({key:`${after.code}:${hand.id}:runout`,type:'runout',handId:hand.id,delay:reveal,duration:reveal+100});
 const mine=after.players.find(p=>p.id===after.me),oldMine=before.players.find(p=>p.id===after.me);
 if(mine?.hole?.length===2&&(!sameHand||!oldMine?.hole))for(let i=0;i<2;i++)events.push({key:`${after.code}:${hand.id}:hole:${mine.id}:${i}`,type:'hole',playerId:mine.id,index:i,delay:i*220,duration:650+i*220});
 for(const p of after.players){
  const old=before.players.find(x=>x.id===p.id);if(!old)continue;
  const a=p.lastAction,oldAction=sameHand?old.lastAction:null;
  const newAction=a&&JSON.stringify(a)!==JSON.stringify(oldAction);
  const amount=Math.max(newAction?a.paid||0:0,(before.status==='waiting'?after.config.startingStack:old.stack)-p.stack,0);
  if(amount>0)events.push({key:`${after.code}:${hand.id}:chips:${p.id}:${a?.at||'blind'}:${p.stack}:${a?.total||0}`,type:'chips',playerId:p.id,amount,duration:1600,delay:0});
 }
 const eliminated=after.players.filter(p=>p.rank>1&&!before.players.find(x=>x.id===p.id)?.rank);
 if(eliminated.length)events.push({key:`${after.code}:${hand.id}:out:${eliminated.map(p=>p.id).sort().join(',')}`,type:'elimination',players:eliminated.map(p=>({id:p.id,name:p.name,rank:p.rank})),duration:6500+reveal,delay:reveal});
 return events;
}
