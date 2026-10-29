import {tournamentReward} from '../public/tournament-rewards.js';
import {accountDocument,rewardFinishedTournament,publicAccount,displayName} from './accounts.js';
import {CARD_SKINS} from '../public/card-skin-catalog.js';
import {CHARACTERS,DEFAULT_CHARACTER} from '../public/characters.js';
import {createHash,randomBytes,randomInt,randomUUID,timingSafeEqual} from 'node:crypto';
import {demand,GameError,startTournament,act,react,draftRaise,tick,publicRoom,PEEK_SECONDS} from './poker.js';
import {readRoom,writeRoom,limit,storageMode} from './store.js';
import {chooseBotAction} from './bot.js';
const hash=token=>createHash('sha256').update(token).digest('hex');
const clean=(s,max)=>String(s||'').trim().replace(/[\u0000-\u001f\u007f]/g,'').slice(0,max);
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TABLE_CAPACITY=9;
function equippedCards(doc){return CARD_SKINS.some(s=>s.id===doc.equippedCardSkin&&(s.price===0||doc.ownedCardSkins?.includes(s.id)))?doc.equippedCardSkin:'classic';}
const makeCode=()=>Array.from({length:6},()=>alphabet[randomInt(alphabet.length)]).join('');
function validCharacter(id,unlocked=[]){id=id??DEFAULT_CHARACTER;demand(CHARACTERS.some(c=>c.id===id),'Nhân vật không hợp lệ.');demand(id===DEFAULT_CHARACTER||unlocked.includes(id),'Hãy mở khóa nhân vật trước.');return id;}
function player(name,character,unlocked=[]){unlocked=Array.isArray(unlocked)?unlocked.filter(id=>CHARACTERS.some(c=>c.id===id)):[];character=validCharacter(character,unlocked);name=clean(name,32);demand(name.length>=1,'Tên người chơi cần từ 1 đến 32 ký tự.');const token=randomBytes(32).toString('hex');return {token,p:{id:randomUUID(),name,character,unlockedCharacters:[...new Set(unlocked)],tokenHash:hash(token),seat:0,stack:0,ready:false,joinedAt:Date.now(),rank:null}};}
function authenticate(room,token){demand(typeof token==='string'&&/^[a-f0-9]{64}$/.test(token),'Phiên đăng nhập không hợp lệ.',401);const digest=Buffer.from(hash(token),'hex');const p=room.players.find(p=>timingSafeEqual(digest,Buffer.from(p.tokenHash,'hex')));demand(p,'Bạn chưa tham gia phòng này hoặc phiên đã mất.',401);return p;}
function addBot(room){
 demand(room.status==='waiting','Chỉ thêm bot trước khi giải bắt đầu.');demand(room.players.length<TABLE_CAPACITY,'Phòng đã đủ 9 người.');
 let index=1;while(room.players.some(p=>p.name===`Bella Bot ${index}`))index++;
 const {p}=player(`Bella Bot ${index}`,CHARACTERS.filter(c=>!c.locked)[index%CHARACTERS.filter(c=>!c.locked).length].id,CHARACTERS.map(c=>c.id));Object.assign(p,{isBot:true,ready:true,seat:room.players.length});room.players.push(p);room.config.maxPlayers=TABLE_CAPACITY;
}
async function roomService({method,body={},code,token,ip='local',account}){
 if(method==='GET'&&code==='health')return {ok:true,storage:storageMode(),onlineReady:storageMode()==='redis'};
 const op=method==='GET'?'state':body.op;demand(account,'Vui lòng đăng nhập để chơi.',401);await limit(`${ip}:${op==='create'||op==='join'?'entry':op==='draft'?'draft':method}`,method==='GET'?1800:op==='create'||op==='join'?30:op==='draft'?240:100);
 if(op==='create'){
  const doc=(await accountDocument(account)).value;const {p,token:secret}=player(displayName(doc),doc.equippedSkin,doc.ownedSkins);p.accountId=account.id;p.accountKey=account.key;p.cardSkin=equippedCards(doc);const config={startingStack:Number(body.startingStack||5000),levelMinutes:Number(body.levelMinutes||5),maxPlayers:TABLE_CAPACITY,actionSeconds:25};
  demand([1500,3000,5000,10000].includes(config.startingStack),'Stack không hợp lệ.');demand([3,5,10].includes(config.levelMinutes),'Thời lượng level không hợp lệ.');config.peek=body.peek===true||body.peek==='on';if(config.peek)config.peekSeconds=PEEK_SECONDS[config.levelMinutes];
  for(let i=0;i<5;i++){const code=makeCode(),room={code,title:clean(body.title,48)||'Bella Home Tournament',ownerId:p.id,status:'waiting',config,players:[p],version:1,createdAt:Date.now(),receipts:[]};if(body.withBot===true)addBot(room);if(await writeRoom(code,null,room))return {room:publicRoom(room,p.id),token:secret};}throw new GameError('Không tạo được mã phòng. Thử lại.',503);
 }
 code=String(code||body.code||'').toUpperCase();demand(/^[A-Z2-9]{6}$/.test(code),'Mã phòng gồm 6 ký tự.');let doc=op==='join'?(await accountDocument(account)).value:null;const newcomer=op==='join'?player(displayName(doc),doc.equippedSkin,doc.ownedSkins):null;if(newcomer){newcomer.p.accountId=account.id;newcomer.p.accountKey=account.key;newcomer.p.cardSkin=equippedCards(doc);}
 for(let attempt=0;attempt<10;attempt++){
  const {room,raw}=await readRoom(code);demand(room,'Không tìm thấy phòng này.',404);const now=Date.now();let p,dirty=false,quiet=false;
  if(op==='join'){
   const existing=room.players.find(x=>x.accountId===account.id);if(existing){p=existing;p.name=displayName(doc);p.cardSkin=equippedCards(doc);p.tokenHash=newcomer.p.tokenHash;dirty=true;}else{
   demand(room.status==='waiting','Giải đã bắt đầu. Không nhận thêm người.');demand(room.players.length<TABLE_CAPACITY,'Phòng đã đủ 9 người.');demand(!room.players.some(p=>p.name.toLocaleLowerCase()===newcomer.p.name.toLocaleLowerCase()),'Tên này đã có trong phòng.');p={...newcomer.p,seat:room.players.length};room.players.push(p);room.config.maxPlayers=TABLE_CAPACITY;dirty=true;}
  }else{
   p=authenticate(room,token);demand(p.accountId===account.id,'Ghế này thuộc tài khoản khác.',403);doc=(await accountDocument(account)).value;const shownName=displayName(doc);if(p.name!==shownName){p.name=shownName;dirty=true;}const equippedCharacter=validCharacter(doc.equippedSkin,doc.ownedSkins);if(!doc.ownedSkins.includes(p.character)){p.character=equippedCharacter;dirty=true;}const savedCards=room.hand?.cardSkins?.[p.id];if(savedCards&&savedCards!=='classic'&&!doc.ownedCardSkins?.includes(savedCards)){room.hand.cardSkins[p.id]='classic';dirty=true;}const cardSkin=equippedCards(doc);if(p.cardSkin!==cardSkin){p.cardSkin=cardSkin;dirty=true;}dirty=tick(room,now,chooseBotAction)||dirty;
   // A slider draft is written without bumping the room version, so it never forces a full re-render;
   // clients patch the chip stack in place. It needs no receipt because repeating it is harmless.
   if(op==='draft'){draftRaise(room,p.id,body,now);quiet=!dirty;dirty=true;}
   else if(method==='POST'){
    const id=String(body.requestId||'');demand(/^[\w-]{8,80}$/.test(id),'Mã thao tác không hợp lệ.');
    if(!room.receipts.includes(id)){
     if(op==='ready'){demand(room.status==='waiting','Giải đã bắt đầu.');p.ready=Boolean(body.ready);}
     else if(op==='addBot'){demand(p.id===room.ownerId,'Chỉ chủ phòng được thêm bot.',403);addBot(room);}
     else if(op==='removeBot'){
      demand(p.id===room.ownerId,'Chỉ chủ phòng được xóa bot.',403);demand(room.status==='waiting','Không thể xóa bot sau khi giải bắt đầu.');
      const bot=room.players.find(x=>x.id===body.botId);demand(bot?.isBot,'Chỉ có thể xóa bot.');room.players=room.players.filter(x=>x.id!==bot.id);room.players.forEach((x,i)=>x.seat=i);
     }
     else if(op==='character'){const doc=(await accountDocument(account)).value;p.character=validCharacter(body.character,doc.ownedSkins);}
     else if(op==='watch'){
      demand(p.rank>1,'Chỉ người đã bị loại được xem bài người khác.',403);
      const target=room.players.find(x=>x.id===body.playerId);demand(body.playerId===null||(target&&target.id!==p.id&&!target.rank),'Người chơi này không còn thi đấu.');
      p.watchingId=body.playerId||null;
     }
     else if(op==='showCards'){
      demand(room.hand?.id===body.handId,'Ván bài đã thay đổi.',409);demand(room.hand.stage==='complete'&&room.hand.folded.includes(p.id),'Chỉ khoe bài đã fold sau khi kết thúc ván.');
      room.hand.shownCards=[...new Set([...(room.hand.shownCards||[]),p.id])];
     }
     else if(op==='start'){demand(p.id===room.ownerId,'Chỉ chủ phòng được bắt đầu giải.',403);room.rewardPolicy=tournamentReward(room.players);room.coinRewardEligible=room.rewardPolicy.amount>0;startTournament(room,now);}
     else if(op==='action'){act(room,p.id,body,now);}
     else if(op==='react'){react(room,p.id,body,now);}
     else throw new GameError('Thao tác không được hỗ trợ.');
     room.receipts.push(id);room.receipts=room.receipts.slice(-200);dirty=true;
    }
   }
  }
  if(!dirty)return {room:publicRoom(room,p.id,now),account:publicAccount(doc)};if(!quiet)room.version++;if(await writeRoom(code,raw,room))return {room:publicRoom(room,p.id,now),account:publicAccount(doc),...(newcomer?{token:newcomer.token}:{})};
 }
 throw new GameError('Phòng đang cập nhật. Vui lòng thử lại.',409);
}

export async function service(args){const result=await roomService(args);if(result.room?.status==='finished'&&!result.room.coinReward){const completed=await rewardFinishedTournament(result.room.code);result.room=publicRoom(completed,result.room.me);if(completed.coinReward?.amount&&completed.players.find(p=>p.id===completed.coinReward.playerId)?.accountId===args.account.id)result.account=publicAccount((await accountDocument(args.account)).value);}return result;}
