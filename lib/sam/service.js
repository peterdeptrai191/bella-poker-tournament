import {randomUUID,randomInt,createHash} from 'node:crypto';
import {accountDocument,displayName} from '../accounts.js';
import {readRecord,writeRecord,writeAdminChange,limit} from '../store.js';
import {demand,GameError} from '../poker.js';
import {CHARACTERS,DEFAULT_CHARACTER} from '../../public/characters.js';
import {start,act,tick,snapshot} from './engine.js';
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const key=code=>'sam-room:'+code;
const player=a=>({id:randomUUID(),accountId:a.id,accountKey:a.key,name:displayName(a),character:a.equippedSkin||DEFAULT_CHARACTER,cardSkin:a.equippedCardSkin||'classic',ready:false,score:0,cards:[]});
async function reward(room){
 if(room.status!=='finished'||room.reward)return false;const p=room.players.find(p=>p.id===room.winner),amount=p.bot?0:room.players.some(p=>p.bot)?1:room.players.length;
 if(amount){const id=createHash('sha256').update('sam:'+room.gameId).digest('hex');let paid=false;for(let n=0;n<15;n++){const {raw,value:a}=await accountDocument({id:p.accountId,key:p.accountKey});a.claims??={};if(Object.hasOwn(a.claims,'sam:'+room.gameId)){paid=true;break;}const before=a.coins;a.coins+=amount;a.claims['sam:'+room.gameId]=amount;a.version=(a.version||1)+1;
 const event={id,createdAt:Date.now(),actorId:'system:sam',actorUsername:'Bella Sâm lốc',targetId:a.id,targetUsername:a.username,action:'samReward',type:'coins',amount,reason:`Thắng phòng Sâm ${room.code} · ván ${room.round}`,before,after:a.coins,delta:amount};const saved=await writeAdminChange(p.accountKey,raw,a,event);if(saved){paid=true;break;}}
 demand(paid,'Đang đồng bộ thưởng, vui lòng thử lại.',409);}
 room.reward={playerId:p.id,amount};return true;
}
export async function samRequest({identity,body={}}){
 demand(identity,'Vui lòng đăng nhập tại sảnh Bella.',401);await limit('sam:'+identity.id,100);const {value:a}=await accountDocument(identity);a.key=identity.key;const op=body.op;
 if(op==='create'){await limit('sam-create:'+identity.id,6);for(let n=0;n<8;n++){const code=Array.from({length:6},()=>alphabet[randomInt(alphabet.length)]).join(''),p=player(a),room={code,title:String(body.title||'Bella Sâm lốc').trim().slice(0,48)||'Bella Sâm lốc',createdAt:Date.now(),host:p.id,status:'waiting',players:[p],version:1,receipts:[]};if(await writeRecord(key(code),null,room,604800))return {room:snapshot(room,a.id)};}throw new GameError('Không tạo được phòng. Thử lại.',409);}
 const code=String(body.code||'').toUpperCase();demand(/^[A-Z2-9]{6}$/.test(code),'Mã phòng gồm 6 ký tự.');
 for(let n=0;n<12;n++){const {raw,value:room}=await readRecord(key(code));demand(room,'Phòng Sâm không tồn tại hoặc đã hết hạn.',404);let p=room.players.find(p=>p.accountId===a.id),changed=false;const now=Date.now();
  if(op==='join'&&!p){demand(room.status==='waiting','Ván đang diễn ra. Hãy chờ chủ phòng tạo ván mới.');demand(room.players.length<5,'Phòng đã đủ 5 người.');p=player(a);room.players.push(p);changed=true;}
  demand(p,'Bạn chưa tham gia phòng này.',403);
  const duplicate=body.requestId&&room.receipts.includes(body.requestId);
  if(!duplicate&&!['state','join'].includes(op)){
   demand(typeof body.requestId==='string'&&/^[a-zA-Z0-9-]{8,80}$/.test(body.requestId),'Thiếu mã thao tác.');
   if(['play','pass','declare'].includes(op)){demand(body.gameId===room.gameId,'Ván đã thay đổi, hãy tải lại bàn.');tick(room,now);act(room,p.id,op,body.cards,now);}
   else if(op==='ready'){demand(room.status==='waiting','Ván đã bắt đầu.');p.ready=!p.ready;}
   else if(op==='addBot'){demand(p.id===room.host&&room.status==='waiting','Chỉ chủ phòng được thêm bot trước ván.');demand(room.players.length<5,'Phòng đã đủ 5 người.');room.players.push({id:randomUUID(),name:'Bella Bot '+(room.players.filter(x=>x.bot).length+1),character:['doctor','engineer','chef','gardener'][room.players.filter(x=>x.bot).length%4],cardSkin:'classic',ready:true,bot:true,score:0,cards:[]});}
   else if(op==='removeBot'){demand(p.id===room.host&&room.status==='waiting','Chỉ chủ phòng được xóa bot.');room.players=room.players.filter(x=>!(x.bot&&x.id===body.playerId));}
   else if(op==='start'){demand(p.id===room.host&&room.status==='waiting','Chỉ chủ phòng bắt đầu ván mới.');start(room,now);}
   else if(op==='rematch'){demand(p.id===room.host&&room.status==='finished','Chỉ chủ phòng được tạo ván tiếp.');await reward(room);room.previousWinner=room.winner;room.status='waiting';room.players.forEach(x=>{x.ready=!!x.bot;x.cards=[];x.action='';});room.turn=null;room.pile=[];room.combo=null;}
   else if(op==='character'){demand(room.status==='waiting','Đổi nhân vật ở phòng chờ.');demand(CHARACTERS.some(x=>x.id===body.character)&&(a.ownedSkins||[DEFAULT_CHARACTER]).includes(body.character),'Bạn chưa sở hữu nhân vật.');p.character=body.character;}
   else if(op==='leave'){demand(room.status==='waiting','Bạn có thể về sảnh và quay lại ván đang chơi.');room.players=room.players.filter(x=>x.id!==p.id);if(room.host===p.id)room.host=room.players.find(x=>!x.bot)?.id||null;if(!room.host){if(await writeRecord(key(code),raw,null))return {left:true};continue;}}
   else throw new GameError('Thao tác Sâm không hợp lệ.');room.receipts.push(body.requestId);room.receipts=room.receipts.slice(-100);changed=true;
  }
  if(!['play','pass','declare'].includes(op))changed=tick(room,now)||changed;
  changed=await reward(room)||changed;
  if(!changed)return {room:snapshot(room,a.id)};room.version++;
  if(await writeRecord(key(code),raw,room,604800))return op==='leave'?{left:true}:{room:snapshot(room,a.id)};
 }
 throw new GameError('Phòng đang cập nhật. Thử lại.',409);
}
