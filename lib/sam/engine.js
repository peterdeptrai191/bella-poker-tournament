import {randomInt,randomUUID} from 'node:crypto';
import {demand,shuffle} from '../poker.js';
export const strength=c=>c.rank===2?15:c.rank;
export const cardId=c=>`${c.rank}${c.suit}`;
export const sorted=cards=>[...cards].sort((a,b)=>strength(a)-strength(b)||a.suit.localeCompare(b.suit));
export function combination(cards){
 if(!cards.length)return null;const a=sorted(cards),r=a.map(strength),same=r.every(x=>x===r[0]);
 if(same&&a.length<=4)return {type:['','Lẻ','Đôi','Sám','Tứ quý'][a.length],size:a.length,high:r[0]};
 if(a.length>=3&&!a.some(c=>c.rank===2)&&r.every((x,i)=>!i||x===r[i-1]+1))return {type:'Sảnh',size:a.length,high:r.at(-1)};
 return null;
}
export function beats(a,b){return !!a&&(!b||(a.type===b.type&&a.size===b.size&&a.high>b.high)||(a.type==='Tứ quý'&&b.type==='Lẻ'&&b.high===15));}
export function instant(cards){const counts=new Map();cards.forEach(c=>counts.set(c.rank,(counts.get(c.rank)||0)+1));
 if(combination(cards)?.type==='Sảnh')return 'Sảnh rồng';
 if(counts.get(2)===4)return 'Tứ quý 2';
 if(cards.every(c=>['h','d'].includes(c.suit))||cards.every(c=>['c','s'].includes(c.suit)))return 'Đồng màu';
 if([...counts.values()].reduce((n,x)=>n+Math.floor(x/2),0)===5)return 'Năm đôi';
 if([...counts.values()].filter(x=>x>=3).length>=3)return 'Ba sám';return null;
}
const next=(room,id)=>room.players[(room.players.findIndex(p=>p.id===id)+1)%room.players.length];
function setTurn(room,id,now){room.turn=id;room.deadline=now+25000;room.botAt=now+1400+randomInt(1200);}
function log(room,player,text){room.events.push({id:randomUUID(),playerId:player?.id||null,text,at:room.now});room.events=room.events.slice(-25);if(player)player.action=text;}
export function finish(room,winner,reason,now){room.status='finished';room.turn=null;room.deadline=null;room.winner=winner.id;room.reason=reason;room.finishedAt=now;
 const loserPoints=p=>p.cards.length+(p.cards.length===10?10:0)+p.cards.filter(c=>c.rank===2).length*5;
 room.results=room.players.map(p=>({id:p.id,remaining:p.cards.length,points:p.id===winner.id?0:-loserPoints(p)}));
 const win=room.results.find(p=>p.id===winner.id);win.points=-room.results.reduce((n,p)=>n+p.points,0);room.players.forEach(p=>p.score=(p.score||0)+room.results.find(r=>r.id===p.id).points);log(room,winner,`${reason} · thắng ván`);
}
export function start(room,now=Date.now()){
 demand(room.players.length>=2,'Cần ít nhất 2 người.');demand(room.players.every(p=>p.ready),'Tất cả người chơi cần sẵn sàng.');
 const deck=shuffle(Array.from({length:52},(_,i)=>({rank:2+i%13,suit:['c','d','h','s'][Math.floor(i/13)]})));
 room.now=now;room.round=(room.round||0)+1;room.gameId=randomUUID();room.reward=null;room.winner=null;room.reason=null;room.results=[];room.pile=[];room.combo=null;room.passed=[];room.last=null;room.sam=null;room.events=[];room.status='declaring';room.declareUntil=now+8000;room.turn=null;
 room.players.forEach(p=>{p.cards=sorted(deck.splice(0,10));p.action='Đã nhận 10 lá';p.ready=false;p.shown=false;});
 const wins=room.players.map(p=>({p,reason:instant(p.cards)})).filter(x=>x.reason);if(wins.length){const order=['Sảnh rồng','Tứ quý 2','Đồng màu','Ba sám','Năm đôi'];wins.sort((a,b)=>order.indexOf(a.reason)-order.indexOf(b.reason));finish(room,wins[0].p,'Ăn trắng · '+wins[0].reason,now);return;}
 room.first=room.previousWinner&&room.players.some(p=>p.id===room.previousWinner)?room.previousWinner:room.players[randomInt(room.players.length)].id;log(room,null,'8 giây báo Sâm · không phân biệt chất');
}
export function validPlay(room,p,ids){
 demand(Array.isArray(ids)&&ids.length>0&&ids.length<=10&&new Set(ids).size===ids.length,'Chọn các lá bài hợp lệ.');const cards=ids.map(id=>p.cards.find(c=>cardId(c)===id));demand(cards.every(Boolean),'Bạn không sở hữu các lá bài này.');
 const combo=combination(cards);demand(combo&&beats(combo,room.combo),'Cần đánh bộ cùng loại, cùng số lá và lớn hơn. Tứ quý chặt được một lá 2.');
 demand(!(cards.length===p.cards.length&&cards.some(c=>c.rank===2)),'Không được về bằng lá 2.');
 if(cards.length===1&&next(room,p.id).cards.length===1){const legal=p.cards.filter(c=>!(p.cards.length===1&&c.rank===2));const max=Math.max(...legal.map(strength));demand(strength(cards[0])===max,'Người kế tiếp báo 1: phải đánh lá lẻ lớn nhất.');}
 return {cards,combo};
}
export function moves(room,p){const result=[];for(let mask=1;mask<(1<<p.cards.length);mask++){const ids=p.cards.filter((_,i)=>mask&(1<<i)).map(cardId);try{validPlay(room,p,ids);result.push(ids);}catch{}}return result.sort((a,b)=>b.length-a.length||combination(a.map(id=>p.cards.find(c=>cardId(c)===id))).high-combination(b.map(id=>p.cards.find(c=>cardId(c)===id))).high);}
export function act(room,id,op,ids=[],now=Date.now()){
 room.now=now;const p=room.players.find(p=>p.id===id);demand(p,'Không có người chơi.',403);
 if(op==='declare'){demand(room.status==='declaring'&&now<room.declareUntil,'Đã hết thời gian báo Sâm.');room.sam=id;room.status='playing';setTurn(room,id,now);log(room,p,'Báo Sâm!');return;}
 demand(room.status==='playing'&&room.turn===id,'Chưa đến lượt của bạn.');
 if(op==='pass'){demand(room.combo&&room.last!==id,'Bạn đang cầm cái, hãy đánh bài.');room.passed.push(id);log(room,p,'Bỏ lượt');}
 else{demand(op==='play','Thao tác không hợp lệ.');const {cards,combo}=validPlay(room,p,ids);
  if(room.sam&&room.sam!==id){finish(room,p,'Bắt Sâm',now);return;}
  p.cards=p.cards.filter(c=>!ids.includes(cardId(c)));room.pile=cards;room.combo=combo;room.last=id;log(room,p,`${combo.type} ${cards.map(c=>({11:'J',12:'Q',13:'K',14:'A'}[c.rank]||c.rank)).join(' · ')}${p.cards.length===1?' · Báo 1!':''}`);
  if(!p.cards.length){finish(room,p,room.sam?'Sâm thành công':'Hết bài',now);return;}
 }
 let q=next(room,id);for(let i=0;i<room.players.length;i++){if(q.id===room.last){room.combo=null;room.pile=[];room.passed=[];setTurn(room,q.id,now);log(room,q,'Cầm cái mới');return;}if(!room.passed.includes(q.id)){setTurn(room,q.id,now);return;}q=next(room,q.id);}
}
export function tick(room,now=Date.now()){
 room.now=now;if(room.status==='declaring'&&now>=room.declareUntil){room.status='playing';setTurn(room,room.first,now);log(room,null,'Bắt đầu ván');return true;}
 if(room.status!=='playing')return false;const p=room.players.find(p=>p.id===room.turn);if(now<room.deadline&&(!p.bot||now<room.botAt))return false;
 const available=moves(room,p);if(p.bot&&available.length||!room.combo){if(!available.length){finish(room,next(room,p.id),'Đối thủ giữ 2 cuối',now);return true;}act(room,p.id,'play',available[0],now);}else act(room,p.id,'pass',[],now);return true;
}
export function snapshot(room,accountId){return {code:room.code,title:room.title,host:room.host,status:room.status,round:room.round||0,version:room.version,serverTime:Date.now(),turn:room.turn,deadline:room.deadline,declareUntil:room.declareUntil,pile:room.pile||[],combo:room.combo,sam:room.sam,winner:room.winner,reason:room.reason,results:room.results||[],reward:room.reward,events:room.events||[],gameId:room.gameId,players:room.players.map(p=>({id:p.id,name:p.name,character:p.character,cardSkin:p.cardSkin,bot:!!p.bot,ready:p.ready,count:p.cards?.length||0,score:p.score||0,action:p.action,me:p.accountId===accountId,cards:p.accountId===accountId||room.status==='finished'?p.cards:undefined}))};}
