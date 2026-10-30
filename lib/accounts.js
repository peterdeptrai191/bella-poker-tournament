import {CR7_EVENT,CR7_PRICE,goatTiles,goatPick} from '../public/cr7-catalog.js';
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
export const publicAccount=a=>({id:a.id,username:a.username,name:displayName(a),displayName:displayName(a),coins:a.coins,ownedSkins:a.ownedSkins,equippedSkin:a.equippedSkin,ownedCardSkins:a.ownedCardSkins||['classic'],equippedCardSkin:a.equippedCardSkin||'classic',ownedChipSkins:a.ownedChipSkins||[DEFAULT_CHIP_SKIN],equippedChipSkin:a.equippedChipSkin||DEFAULT_CHIP_SKIN,cr7Event:a.cr7Event||{seen:false,freeUsed:false},daily:dailyStatus(a),isAdmin:a.role==='admin'||a.isAdmin===true,version:a.version||1});
export async function accountDocument(identity){const record=await readRecord(identity.key);demand(record.value?.id===identity.id,'Vui lòng đăng nhập lại.',401);return record;}
async function mutate(identity,update){for(let i=0;i<20;i++){const {raw,value}=await accountDocument(identity);const result=update(value);value.version=(value.version||1)+1;if(await writeRecord(identity.key,raw,value))return {account:publicAccount(value),result};}throw new GameError('Tài khoản đang cập nhật. Thử lại.',409);}
export async function authenticateAccount(token){
 if(!/^[a-f0-9]{64}$/.test(token||''))return null;
 const {value}=await readRecord(`session:${sha(token)}`);return value&&value.expiresAt>Date.now()?{id:value.id,key:value.key,username:value.username}:null;
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
   if(body.free)demand(!a.cr7Event.freeUsed,'Bạn đã dùng lượt miễn phí.');
   else demand(a.coins>=CR7_PRICE,`Bạn chưa đủ ${CR7_PRICE} coin để quay GOAT or BOAT.`);
   const id=goatPick(randomInt(100),randomInt(840)),tile=goatTiles().indexOf(id),skin={id};
   const duplicate=a.ownedSkins.includes(skin.id),before=a.coins;
   if(body.free)a.cr7Event.freeUsed=true;else a.coins-=CR7_PRICE;
   a.cr7Event.seen=true;if(!duplicate)a.ownedSkins.push(skin.id);
   const result={skin:skin.id,tile,duplicate,free:body.free,cost:body.free?0:CR7_PRICE,before,after:a.coins,at:Date.now()};a.claims[key]=result;return result;
  });
 }
 if(op==='buyRandomSkin'){
  demand(typeof body.requestId==='string'&&/^[\w-]{8,80}$/.test(body.requestId),'Mã thao tác không hợp lệ.');
  return mutate(identity,a=>{a.claims??={};const key='skin-pack:'+body.requestId;if(a.claims[key])return a.claims[key];demand(a.coins>=10,'Bạn chưa đủ 10 coin để mở gói.');const roll=randomInt(105),tier=roll<50?3:roll<85?10:roll<100?15:20,pool=CHARACTERS.filter(c=>c.price===tier),skin=pool[randomInt(pool.length)],duplicate=a.ownedSkins.includes(skin.id);a.coins-=10;if(!duplicate)a.ownedSkins.push(skin.id);const result={skin:skin.id,tier,duplicate};a.claims[key]=result;return result;});
 }
 if(op==='buySkin'){
  const skin=CHARACTERS.find(c=>c.id===body.character);demand(skin,'Skin không hợp lệ.');demand(!skin.event,'Skin này chỉ nhận được từ vòng quay GOAT or BOAT.');
  return mutate(identity,a=>{if(a.ownedSkins.includes(skin.id))return 'owned';demand(a.coins>=skin.price,'Bạn chưa đủ coin để đổi skin.');a.coins-=skin.price;a.ownedSkins.push(skin.id);return 'bought';});
 }
 if(op==='equipSkin'){
  return mutate(identity,a=>{demand(a.ownedSkins.includes(body.character),'Bạn chưa sở hữu skin này.');a.equippedSkin=body.character;});
 }
 throw new GameError('Thao tác tài khoản không hợp lệ.');
}
export function cookieHeader(token,secure=false){return `bella_account=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${token?sessionSeconds:0}${secure?'; Secure':''}`;}
export function cookieToken(header=''){return String(header).split(';').map(s=>s.trim()).find(s=>s.startsWith('bella_account='))?.slice(14)||'';}

// The account receipt makes payment idempotent even if a room update is retried.
export async function rewardFinishedTournament(code){
 for(let i=0;i<8;i++){
  const {raw,room}=await readRoom(code);if(!room||room.status!=='finished'||room.coinReward)return room;
  const policy=room.rewardPolicy||(room.startedAt?tournamentReward(room.players):{amount:0,mode:'human',entrants:room.players.length});
  const winner=room.players.find(p=>p.rank===1),eligible=policy.amount>0&&!winner?.isBot&&winner?.accountKey;let paid=0;
  if(eligible){const result=await mutate({id:winner.accountId,key:winner.accountKey},a=>{a.claims??={};const claim=`tour:${room.code}:${room.createdAt}`;if(Object.hasOwn(a.claims,claim))return a.claims[claim];a.coins+=policy.amount;a.claims[claim]=policy.amount;return policy.amount;});paid=result.result;}
  room.coinReward={playerId:eligible?winner.id:null,amount:paid,mode:policy.mode,entrants:policy.entrants};room.version++;
  if(await writeRoom(code,raw,room))return room;
 }
 throw new GameError('Đang cập nhật phần thưởng. Thử lại.',409);
}
