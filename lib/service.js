import {CHARACTERS} from '../public/characters.js';
import {createHash,randomBytes,randomInt,randomUUID,timingSafeEqual} from 'node:crypto';
import {demand,GameError,startTournament,act,tick,publicRoom} from './poker.js';
import {readRoom,writeRoom,limit,storageMode} from './store.js';
import {chooseBotAction} from './bot.js';
const hash=token=>createHash('sha256').update(token).digest('hex');
const clean=(s,max)=>String(s||'').trim().replace(/[\u0000-\u001f\u007f]/g,'').slice(0,max);
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TABLE_CAPACITY=9;
const makeCode=()=>Array.from({length:6},()=>alphabet[randomInt(alphabet.length)]).join('');
function validCharacter(id){id=id??CHARACTERS[0].id;demand(CHARACTERS.some(c=>c.id===id),'Nhân vật không hợp lệ.');return id;}
function player(name,character){character=validCharacter(character);name=clean(name,22);demand(name.length>=2,'Tên người chơi cần từ 2 đến 22 ký tự.');const token=randomBytes(32).toString('hex');return {token,p:{id:randomUUID(),name,character,tokenHash:hash(token),seat:0,stack:0,ready:false,joinedAt:Date.now(),rank:null}};}
function authenticate(room,token){demand(typeof token==='string'&&/^[a-f0-9]{64}$/.test(token),'Phiên đăng nhập không hợp lệ.',401);const digest=Buffer.from(hash(token),'hex');const p=room.players.find(p=>timingSafeEqual(digest,Buffer.from(p.tokenHash,'hex')));demand(p,'Bạn chưa tham gia phòng này hoặc phiên đã mất.',401);return p;}
function addBot(room){
 demand(room.status==='waiting','Chỉ thêm bot trước khi giải bắt đầu.');demand(room.players.length<TABLE_CAPACITY,'Phòng đã đủ 9 người.');
 let index=1;while(room.players.some(p=>p.name===`Bella Bot ${index}`))index++;
 const {p}=player(`Bella Bot ${index}`,CHARACTERS[index%CHARACTERS.length].id);Object.assign(p,{isBot:true,ready:true,seat:room.players.length});room.players.push(p);room.config.maxPlayers=TABLE_CAPACITY;
}
export async function service({method,body={},code,token,ip='local'}){
 if(method==='GET'&&code==='health')return {ok:true,storage:storageMode(),onlineReady:storageMode()==='redis'};
 const op=method==='GET'?'state':body.op;await limit(`${ip}:${op==='create'||op==='join'?'entry':method}`,method==='GET'?1800:op==='create'||op==='join'?30:100);
 if(op==='create'){
  const {p,token:secret}=player(body.name,body.character);const config={startingStack:Number(body.startingStack||5000),levelMinutes:Number(body.levelMinutes||5),maxPlayers:TABLE_CAPACITY,actionSeconds:25};
  demand([1500,3000,5000,10000].includes(config.startingStack),'Stack không hợp lệ.');demand([3,5,10].includes(config.levelMinutes),'Thời lượng level không hợp lệ.');
  for(let i=0;i<5;i++){const code=makeCode(),room={code,title:clean(body.title,48)||'Bella Home Tournament',ownerId:p.id,status:'waiting',config,players:[p],version:1,createdAt:Date.now(),receipts:[]};if(body.withBot===true)addBot(room);if(await writeRoom(code,null,room))return {room:publicRoom(room,p.id),token:secret};}throw new GameError('Không tạo được mã phòng. Thử lại.',503);
 }
 code=String(code||body.code||'').toUpperCase();demand(/^[A-Z2-9]{6}$/.test(code),'Mã phòng gồm 6 ký tự.');const newcomer=op==='join'?player(body.name,body.character):null;
 for(let attempt=0;attempt<10;attempt++){
  const {room,raw}=await readRoom(code);demand(room,'Không tìm thấy phòng này.',404);const now=Date.now();let p,dirty=false;
  if(op==='join'){
   demand(room.status==='waiting','Giải đã bắt đầu. Không nhận thêm người.');demand(room.players.length<TABLE_CAPACITY,'Phòng đã đủ 9 người.');demand(!room.players.some(p=>p.name.toLocaleLowerCase()===newcomer.p.name.toLocaleLowerCase()),'Tên này đã có trong phòng.');p={...newcomer.p,seat:room.players.length};room.players.push(p);room.config.maxPlayers=TABLE_CAPACITY;dirty=true;
  }else{
   p=authenticate(room,token);dirty=tick(room,now,chooseBotAction);
   if(method==='POST'){
    const id=String(body.requestId||'');demand(/^[\w-]{8,80}$/.test(id),'Mã thao tác không hợp lệ.');
    if(!room.receipts.includes(id)){
     if(op==='ready'){demand(room.status==='waiting','Giải đã bắt đầu.');p.ready=Boolean(body.ready);}
     else if(op==='addBot'){demand(p.id===room.ownerId,'Chỉ chủ phòng được thêm bot.',403);addBot(room);}
     else if(op==='removeBot'){
      demand(p.id===room.ownerId,'Chỉ chủ phòng được xóa bot.',403);demand(room.status==='waiting','Không thể xóa bot sau khi giải bắt đầu.');
      const bot=room.players.find(x=>x.id===body.botId);demand(bot?.isBot,'Chỉ có thể xóa bot.');room.players=room.players.filter(x=>x.id!==bot.id);room.players.forEach((x,i)=>x.seat=i);
     }
     else if(op==='character'){p.character=validCharacter(body.character);}
     else if(op==='start'){demand(p.id===room.ownerId,'Chỉ chủ phòng được bắt đầu giải.',403);startTournament(room,now);}
     else if(op==='action'){act(room,p.id,body,now);}
     else throw new GameError('Thao tác không được hỗ trợ.');
     room.receipts.push(id);room.receipts=room.receipts.slice(-200);dirty=true;
    }
   }
  }
  if(!dirty)return {room:publicRoom(room,p.id,now)};room.version++;if(await writeRoom(code,raw,room))return {room:publicRoom(room,p.id,now),...(newcomer?{token:newcomer.token}:{})};
 }
 throw new GameError('Phòng đang cập nhật. Vui lòng thử lại.',409);
}
