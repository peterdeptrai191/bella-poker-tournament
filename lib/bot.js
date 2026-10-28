import {randomInt} from 'node:crypto';
import {evaluate} from './poker.js';

// Accept a player-visible snapshot only: no deck or opponent hole cards.
export function chooseBotAction(view,random=()=>randomInt(10000)/10000){
 const legal=view.legal,me=view.players.find(p=>p.id===view.me);
 if(!legal||!me?.hole?.length)throw new Error('Bot requires its own turn and hole cards.');
 const [a,b]=me.hole,high=Math.max(a.rank,b.rank),low=Math.min(a.rank,b.rank);
 let strength=.12+high/35+low/70+(a.rank===b.rank ? .27 : 0)+(a.suit===b.suit ? .05 : 0)+(Math.abs(a.rank-b.rank)===1 ? .04 : 0);
 if(view.hand.board.length>=3){
  const score=evaluate([...me.hole,...view.hand.board]);
  strength=[.25,.48,.64,.75,.83,.88,.94,.98,.995][score[0]]+(score[1]||0)/220;
  if(view.hand.board.length===5){const boardScore=evaluate(view.hand.board);if(score.every((n,i)=>n===boardScore[i]))strength=Math.min(strength,.43);}
 }
 strength=Math.min(.99,strength);const odds=legal.toCall/Math.max(1,view.hand.pot+legal.toCall),pressure=legal.toCall/Math.max(1,me.stack),roll=random();
 const action={handId:view.hand.id};
 if(!legal.canCheck&&((pressure>.45&&strength<.70&&roll>.16)||(odds>strength*.70&&roll>.22)||(strength<.39&&roll>.35)))return {...action,kind:'fold'};
 const wantsRaise=legal.canRaise&&((strength>.82&&roll<.58)||(strength>.60&&roll<.22)||(legal.canCheck&&roll<.055));
 if(wantsRaise){const increase=Math.max(view.hand.minRaise,view.hand.blinds.bb*2,Math.floor(view.hand.pot*.45));const amount=Math.min(legal.maxRaiseTo,Math.max(legal.minRaiseTo,view.hand.currentBet+increase));return {...action,kind:'raise',amount};}
 return {...action,kind:legal.canCheck?'check':'call'};
}
