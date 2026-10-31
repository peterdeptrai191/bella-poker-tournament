import {MASKED_PRICE,maskedPick} from '../public/masked-catalog.js';
import {CR7_EVENT,CR7_PRICE,DAILY_SPINS,goatTiles,goatPick,goatInnerSize} from '../public/cr7-catalog.js';
import {tournamentReward} from '../public/tournament-rewards.js';
import {createHash,randomBytes,randomInt,scrypt as rawScrypt,timingSafeEqual,randomUUID} from 'node:crypto';
import {promisify} from 'node:util';
import {readRecord,writeRecord,limit,readRoom,writeRoom,indexAccount} from './store.js';
import {demand,GameError} from './poker.js';
import {CHARACTERS,DEFAULT_CHARACTER} from '../public/characters.js';
import {CARD_SKINS} from '../public/card-skin-catalog.js';
import {CHIP_SKINS,DEFAULT_CHIP_SKIN,DAILY_REWARDS} from '../public/chip-skin-catalog.js';
const scrypt=promisify(rawScrypt),sha=s=>createHash('sha256').update(s).digest('hex');
const sessionSeconds=30*24*3600;
const usernameKey=s=>`account:${sha(s.normalize('NFKC').toLocaleLowerCase('en-US'))}`;
// Display names. You keep logging in with your username; the name others see can be changed. Every chosen
// name has its own record (name:<hash> → account id), so no two players can show the same name, and if two
// people pick the same name at the same moment only the first write wins.
const sameName=s=>String(s||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('en-US');
const nameKey=s=>`name:${sha(sameName(s))}`;
export const displayName=a=>String(a.displayName||a.name||a.username||'').slice(0,22);
async function nameTaken(name,id){const login=(await readRecord(usernameKey(String(name).normalize('NFKC').trim()))).value;if(login&&login.id!==id)return true;const shown=(await readRecord(nameKey(name))).value;return !!(shown&&shown.id!==id);}
const passwordHash=(password,salt)=>scrypt(password,salt,64,{N:131072,r:8,p:1,maxmem:256*1024*1024});
// Skins given to particular players. Usernames are stored as SHA-256 hashes so no one's name or email
// sits in the source code. Grants are added on register, login or when the account loads.
export const GRANTS=[{skin:'bella-m10',users:['7c999ca89280ed468fb83a7949d316e235b6888bebab637a8063cee87f974f4d']}];
const grantsFor=a=>{const h=sha(String(a.username||'').normalize('NFKC').trim().toLocaleLowerCase('en-US'));return GRANTS.filter(g=>g.users.includes(h)).map(g=>g.skin).filter(s=>!a.revokedGrantSkins?.includes(s));};
const needsGrant=a=>grantsFor(a).some(s=>!a.ownedSkins?.includes(s));
function applyGrants(a){for(const s of grantsFor(a))if(!a.ownedSkins.includes(s))a.ownedSkins.push(s);}
// Days are counted in Vietnam time (UTC+7), so the daily gift resets at midnight for the players.
export const vnDay=(now=Date.now())=>Math.floor((now+7*3600000)/86400000);
// Which calendar day the player is on, and whether today's gift is already taken.
export function dailyStatus(a,now=Date.now()){const today=vnDay(now),last=a.daily?.lastDay,streak=a.daily?.streak||0;
 if(last===today)return {day:streak,claimed:true};return {day:last===today-1?streak%DAILY_REWARDS.length+1:1,claimed:false};}
// Playing together: coins for every game with friends, a ticket shard per game (5 shards = 1 spin ticket),
// a ticket for the winner, two daily group missions and a streak for days in a row with friends.
export const SHARDS_PER_TICKET=5,GROUP_MISSION_GAMES=5;
export function groupStatus(a,now=Date.now()){const today=vnDay(now),g=a.group||{},fresh=g.day===today;
 return {gamesToday:fresh?g.games||0:0,play5Done:fresh&&!!g.play5Done,flushDone:fresh&&!!g.flushDone,streak:g.streakDay>=today-1?g.streak||0:0,playedToday:g.streakDay===today};}
const spinsToday=(a,now=Date.now())=>a.cr7Event?.spinDay===vnDay(now)?a.cr7Event.spinCount||0:0;
export const publicAccount=a=>({id:a.id,username:a.username,name:displayName(a),displayName:displayName(a),coins:a.coins,ownedSkins:a.ownedSkins,equippedSkin:a.equippedSkin,ownedCardSkins:a.ownedCardSkins||['classic'],equippedCardSkin:a.equippedCardSkin||'classic',ownedChipSkins:a.ownedChipSkins||[DEFAULT_CHIP_SKIN],equippedChipSkin:a.equippedChipSkin||DEFAULT_CHIP_SKIN,maskedGift:{noticeSeen:!!a.maskedGift?.noticeSeen,freeUsed:!!a.maskedGift?.freeUsed},cr7Event:{seen:false,freeUsed:false,...a.cr7Event,spinsToday:spinsToday(a)},daily:dailyStatus(a),joinedAt:a.createdAt||null,tickets:a.tickets||0,shards:a.shards||0,group:groupStatus(a),isAdmin:a.role==='admin'||a.isAdmin===true,version:a.version||1});
export async function accountDocument(identity){const record=await readRecord(identity.key);demand(record.value?.id===identity.id,'Vui lòng đăng nhập lại.',401);return record;}
async function mutate(identity,update){for(let i=0;i<20;i++){const {raw,value}=await accountDocument(identity);const result=update(value);value.version=(value.version||1)+1;if(await writeRecord(identity.key,raw,value))return {account:publicAccount(value),result};}throw new GameError('Tài khoản đang cập nhật. Thử lại.',409);}
// The session record for a login cookie, split in two so a table poll can read it together with the room.
export const sessionRecordName=token=>/^[a-f0-9]{64}$/.test(token||'')?`session:${sha(token)}`:null;
export const sessionIdentity=value=>value&&value.expiresAt>Date.now()?{id:value.id,key:value.key,username:value.username}:null;
export async function authenticateAccount(token){
 const name=sessionRecordName(token);if(!name)return null;
 const {value}=await readRecord(name);return sessionIdentity(value);
}
export async function accountRequest({body={},token,ip='local'}){
 const op=body.op;
 if(op==='register'||op==='login'){
  await limit(`auth:${ip}`,60);const username=String(body.username||'').normalize('NFKC').trim(),password=body.password;
  demand(username.length>0&&username.length<=32&&!/[\u0000-\u001f\u007f]/.test(username),'Nhập tên đăng nhập từ 1–32 ký tự.');demand(typeof password==='string'&&password.length>0&&password.length<=256,'Nhập mật khẩu từ 1–256 ký tự.');
  await limit('auth-user:'+sha(username.toLocaleLowerCase('en-US')),12);const key=usernameKey(username),{value:existing}=await readRecord(key);let user=existing;
  if(op==='register'){
   demand(!existing&&!(await readRecord(nameKey(username))).value,'Tên đăng nhập đã được sử dụng.',409);const salt=randomBytes(16).toString('hex'),digest=await passwordHash(password,salt);
   user={id:randomUUID(),username,salt,passwordHash:digest.toString('hex'),coins:0,ownedSkins:[DEFAULT_CHARACTER],equippedSkin:DEFAULT_CHARACTER,claims:{},createdAt:Date.now(),lastLoginAt:Date.now(),loginCount:1,version:1};applyGrants(user);
   demand(await writeRecord(key,null,user),'Tên đăng nhập đã được sử dụng.',409);
   try{await indexAccount(key,user.createdAt);}catch{console.error('Account index requires admin resync');}
  }else{
   const digest=await passwordHash(password,existing?.salt||'00000000000000000000000000000000');demand(existing&&timingSafeEqual(digest,Buffer.from(existing.passwordHash,'hex')),'Tên đăng nhập hoặc mật khẩu chưa đúng.',401);
  }
  const identity={id:user.id,key,username:user.username};let gift=null;
  if(op==='login'){
   demand(/^[\w-]{8,80}$/.test(String(body.requestId||'')),'Mã thao tác không hợp lệ.');
   // The 1–5 coin login box opens once per day (Vietnam time), whatever the number of logins. Time comes
   // from the server clock, so changing the phone's clock or logging in again and again earns nothing more.
   const result=await mutate(identity,a=>{const claim=`login:${body.requestId}`;if(a.claims[claim]!==undefined)return a.claims[claim];
    const now=Date.now(),today=vnDay(now);a.lastLoginAt=now;a.loginCount=(a.loginCount||0)+1;applyGrants(a);
    if(a.loginGiftDay===today){a.claims[claim]=null;return null;}
    const amount=randomInt(1,6);a.coins+=amount;a.loginGiftDay=today;a.claims[claim]=amount;return amount;});gift=result.result;user=result.account;
  }
  const sessionToken=randomBytes(32).toString('hex');await writeRecord(`session:${sha(sessionToken)}`,null,{...identity,expiresAt:Date.now()+sessionSeconds*1000},sessionSeconds);
  return {account:publicAccount(user),gift,cookieToken:sessionToken};
 }
 const identity=await authenticateAccount(token);demand(identity,'Vui lòng đăng nhập để chơi.',401);
 if(op==='logout'){const name=`session:${sha(token)}`,{raw}=await readRecord(name);await writeRecord(name,raw,null);return {loggedOut:true,cookieToken:''};}
 if(op==='account'){const doc=(await accountDocument(identity)).value;if(needsGrant(doc))return {account:(await mutate(identity,applyGrants)).account};return {account:publicAccount(doc)};}
 if(op==='buyCardSkin'||op==='equipCardSkin'){
  const skin=CARD_SKINS.find(c=>c.id===body.skin);demand(skin,'Skin bài không hợp lệ.');
  return mutate(identity,a=>{a.ownedCardSkins??=['classic'];a.equippedCardSkin??='classic';
   if(op==='equipCardSkin'){demand(a.ownedCardSkins.includes(skin.id),'Bạn chưa sở hữu skin bài này.');a.equippedCardSkin=skin.id;return 'equipped';}
   if(a.ownedCardSkins.includes(skin.id))return 'owned';
   demand(a.coins>=skin.price,'Bạn chưa đủ xu để đổi skin bài.');a.coins-=skin.price;a.ownedCardSkins.push(skin.id);return 'bought';
  });
 }
 if(op==='renameAccount'||op==='setDisplayName'){
  await limit(`rename:${identity.id}`,6);const input=op==='setDisplayName'?body.displayName:body.name;demand(typeof input==='string'&&!/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/.test(input),'Tên hiển thị không hợp lệ.');const name=input.normalize('NFKC').trim().replace(/\s+/g,' ');
  demand(name.length>=2&&name.length<=22&&!/[\u0000-\u001f\u007f]/.test(name),'Tên hiển thị gồm 2–22 ký tự.');
  const doc=(await accountDocument(identity)).value;if(name===displayName(doc))return {account:publicAccount(doc)};
  demand(!(await nameTaken(name,identity.id)),'Tên này đã có người dùng. Hãy chọn tên khác.',409);
  const backToLogin=sameName(name)===sameName(doc.username),key=nameKey(name);
  if(!backToLogin&&!(await writeRecord(key,null,{id:identity.id})))demand((await readRecord(key)).value?.id===identity.id,'Tên này vừa có người khác chọn. Hãy chọn tên khác.',409);
  const old=doc.displayName&&nameKey(doc.displayName);
  const result=await mutate(identity,a=>{if(backToLogin)delete a.displayName;else a.displayName=name;});
  // free the previous display name so someone else can use it
  if(old&&old!==key){const r=await readRecord(old);if(r.value?.id===identity.id)await writeRecord(old,r.raw,null);}
  return {account:result.account};
 }
 if(op==='claimDaily'){
  return mutate(identity,a=>{const status=dailyStatus(a);if(status.claimed)return {already:true,day:status.day};
   const reward=DAILY_REWARDS[status.day-1];a.ownedChipSkins??=[DEFAULT_CHIP_SKIN];const coins=reward.coins||0;let chip=null;
   if(reward.chip&&!a.ownedChipSkins.includes(reward.chip)){a.ownedChipSkins.push(reward.chip);chip=reward.chip;}
   a.coins+=coins;a.daily={lastDay:vnDay(),streak:status.day};return {day:status.day,coins,chip};
  });
 }
 if(op==='equipChipSkin'){
  const skin=CHIP_SKINS.find(c=>c.id===body.skin);demand(skin,'Skin chip không hợp lệ.');
  return mutate(identity,a=>{a.ownedChipSkins??=[DEFAULT_CHIP_SKIN];demand(a.ownedChipSkins.includes(skin.id),'Skin chip này mở khóa bằng quà đăng nhập.');a.equippedChipSkin=skin.id;return 'equipped';});
 }
 if(op==='seeCr7Event')return mutate(identity,a=>{a.cr7Event??={seen:false,freeUsed:false};a.cr7Event.seen=true;});
 if(op==='openCr7Pack'){
  demand(typeof body.requestId==='string'&&/^[\w-]{8,80}$/.test(body.requestId),'Mã thao tác không hợp lệ.');
  demand(typeof body.free==='boolean','Chọn loại lượt mở.');
  return mutate(identity,a=>{
   a.claims??={};const key=CR7_EVENT+':'+body.requestId;
   if(a.claims[key]){demand(a.claims[key].free===body.free,'Mã lượt mở đã sử dụng.');return a.claims[key];}
   a.cr7Event??={seen:false,freeUsed:false};
   const used=spinsToday(a);demand(used<DAILY_SPINS,`Bạn đã quay đủ ${DAILY_SPINS} lượt hôm nay. Quay tiếp vào ngày mai nhé!`,429);
   const ticket=!body.free&&body.ticket===true;
   if(body.free)demand(!a.cr7Event.freeUsed,'Bạn đã dùng lượt miễn phí.');
   else if(ticket)demand((a.tickets||0)>0,'Bạn chưa có vé quay. Chơi cùng bạn bè để nhận mảnh vé.');
   else demand(a.coins>=CR7_PRICE,`Bạn chưa đủ ${CR7_PRICE} coin để quay GOAT or BOAT.`);
   const id=goatPick(randomInt(100),randomInt(goatInnerSize())),tile=goatTiles().indexOf(id),skin={id};
   const duplicate=a.ownedSkins.includes(skin.id),before=a.coins;
   if(body.free)a.cr7Event.freeUsed=true;else if(ticket)a.tickets--;else a.coins-=CR7_PRICE;
   a.cr7Event.spinDay=vnDay();a.cr7Event.spinCount=used+1;
   a.cr7Event.seen=true;if(!duplicate)a.ownedSkins.push(skin.id);
   const result={skin:skin.id,tile,duplicate,free:body.free,ticket,cost:body.free||ticket?0:CR7_PRICE,before,after:a.coins,at:Date.now()};a.claims[key]=result;return result;
  });
 }
 if(op==='claimMaskedNotice')return mutate(identity,a=>{a.maskedGift??={};if(a.maskedGift.noticeSeen)return {show:false};a.maskedGift.noticeSeen=true;return {show:true};});
 if(op==='openMaskedPack'){
  demand(typeof body.requestId==='string'&&/^[\w-]{8,80}$/.test(body.requestId),'Mã thao tác không hợp lệ.');
  return mutate(identity,a=>{a.claims??={};const key='masked-v1:'+body.requestId;if(a.claims[key])return a.claims[key];a.maskedGift??={};const free=!a.maskedGift.freeUsed,cost=free?0:MASKED_PRICE;demand(a.coins>=cost,'Bạn chưa đủ 15 xu để mở The Masked Singer.');const prize=maskedPick(randomInt(100),randomInt(840)),duplicate=a.ownedSkins.includes(prize.skin);a.coins-=cost;if(free)a.maskedGift.freeUsed=true;if(!duplicate)a.ownedSkins.push(prize.skin);const result={...prize,duplicate,cost,free};a.claims[key]=result;return result;});
 }
 if(op==='buyRandomSkin'){
  demand(typeof body.requestId==='string'&&/^[\w-]{8,80}$/.test(body.requestId),'Mã thao tác không hợp lệ.');
  return mutate(identity,a=>{a.claims??={};const key='skin-pack:'+body.requestId;if(a.claims[key])return a.claims[key];demand(a.coins>=10,'Bạn chưa đủ 10 coin để mở gói.');const roll=randomInt(105),tier=roll<50?3:roll<85?10:roll<100?15:20,pool=CHARACTERS.filter(c=>!c.comingSoon&&c.price===tier),skin=pool[randomInt(pool.length)],duplicate=a.ownedSkins.includes(skin.id);a.coins-=10;if(!duplicate)a.ownedSkins.push(skin.id);const result={skin:skin.id,tier,duplicate};a.claims[key]=result;return result;});
 }
 if(op==='buySkin'){
  const skin=CHARACTERS.find(c=>c.id===body.character);demand(skin,'Skin không hợp lệ.');demand(!skin.maskedExclusive,'Skin này chỉ có trong The Masked Singer.');demand(!skin.comingSoon,'Coming Soon: skin này chưa mở bán.');demand(!skin.event,'Skin này chỉ nhận được từ vòng quay GOAT or BOAT.');
  return mutate(identity,a=>{if(a.ownedSkins.includes(skin.id))return 'owned';demand(a.coins>=skin.price,'Bạn chưa đủ coin để đổi skin.');a.coins-=skin.price;a.ownedSkins.push(skin.id);return 'bought';});
 }
 if(op==='equipSkin'){
  return mutate(identity,a=>{demand(a.ownedSkins.includes(body.character),'Bạn chưa sở hữu skin này.');a.equippedSkin=body.character;});
 }
 throw new GameError('Thao tác tài khoản không hợp lệ.');
}
export function cookieHeader(token,secure=false){return `bella_account=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${token?sessionSeconds:0}${secure?'; Secure':''}`;}
export function cookieToken(header=''){return String(header).split(';').map(s=>s.trim()).find(s=>s.startsWith('bella_account='))?.slice(14)||'';}

export async function rewardGroupPlay(room){
 const humans=room.players.filter(p=>!p.isBot&&p.accountKey&&p.accountId);if(humans.length<2)return null;
 const today=vnDay(),out={};
 for(const p of humans){
  const r=await mutate({id:p.accountId,key:p.accountKey},a=>{a.claims??={};const claim=`group:${room.code}:${room.createdAt}`;if(Object.hasOwn(a.claims,claim))return a.claims[claim];
   const g=a.group??={},got={coins:humans.length-1,shards:1,tickets:p.rank===1?1:0,missions:[]};
   if(g.day!==today){g.day=today;g.games=0;g.flushDone=false;g.play5Done=false;}
   g.games++;
   if(!g.play5Done&&g.games>=GROUP_MISSION_GAMES){g.play5Done=true;got.shards+=2;got.missions.push('play5');}
   if(!g.flushDone&&room.highlights?.flush){g.flushDone=true;got.shards+=1;got.missions.push('flush');}
   if(g.streakDay!==today){g.streak=g.streakDay===today-1?(g.streak||0)+1:1;g.streakDay=today;
    if(g.streak%7===0){got.tickets+=2;got.missions.push('streak7');}else if(g.streak%3===0){got.tickets+=1;got.missions.push('streak3');}}
   a.coins+=got.coins;a.shards=(a.shards||0)+got.shards;a.tickets=(a.tickets||0)+got.tickets;
   while(a.shards>=SHARDS_PER_TICKET){a.shards-=SHARDS_PER_TICKET;a.tickets++;got.converted=(got.converted||0)+1;}
   got.streak=g.streak;a.claims[claim]=got;return got;});
  out[p.id]=r.result;
 }
 return out;
}
// The account receipt makes payment idempotent even if a room update is retried.
export async function rewardFinishedTournament(code){
 for(let i=0;i<8;i++){
  const {raw,room}=await readRoom(code);if(!room||room.status!=='finished'||room.coinReward)return room;
  const policy=room.rewardPolicy||(room.startedAt?tournamentReward(room.players):{amount:0,mode:'human',entrants:room.players.length});
  const winner=room.players.find(p=>p.rank===1),eligible=policy.amount>0&&!winner?.isBot&&winner?.accountKey;let paid=0;
  if(eligible){const result=await mutate({id:winner.accountId,key:winner.accountKey},a=>{a.claims??={};const claim=`tour:${room.code}:${room.createdAt}`;if(Object.hasOwn(a.claims,claim))return a.claims[claim];a.coins+=policy.amount;a.claims[claim]=policy.amount;return policy.amount;});paid=result.result;}
  room.groupReward??=await rewardGroupPlay(room);
  room.coinReward={playerId:eligible?winner.id:null,amount:paid,mode:policy.mode,entrants:policy.entrants};room.version++;
  if(await writeRoom(code,raw,room))return room;
 }
 throw new GameError('Đang cập nhật phần thưởng. Thử lại.',409);
}
