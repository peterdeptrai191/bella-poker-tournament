import {createHash,randomBytes,randomInt,scrypt as rawScrypt,timingSafeEqual,randomUUID} from 'node:crypto';
import {promisify} from 'node:util';
import {readRecord,writeRecord,limit,readRoom,writeRoom,indexAccount} from './store.js';
import {demand,GameError} from './poker.js';
import {CHARACTERS,DEFAULT_CHARACTER} from '../public/characters.js';
import {CARD_SKINS} from '../public/card-skin-catalog.js';
const scrypt=promisify(rawScrypt),sha=s=>createHash('sha256').update(s).digest('hex');
const sessionSeconds=30*24*3600;
const usernameKey=s=>`account:${sha(s.normalize('NFKC').toLocaleLowerCase('en-US'))}`;
const passwordHash=(password,salt)=>scrypt(password,salt,64,{N:131072,r:8,p:1,maxmem:256*1024*1024});
export const publicAccount=a=>({id:a.id,username:a.username,coins:a.coins,ownedSkins:a.ownedSkins,equippedSkin:a.equippedSkin,ownedCardSkins:a.ownedCardSkins||['classic'],equippedCardSkin:a.equippedCardSkin||'classic',isAdmin:a.role==='admin'||a.isAdmin===true,version:a.version||1});
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
   demand(!existing,'Tên đăng nhập đã được sử dụng.',409);const salt=randomBytes(16).toString('hex'),digest=await passwordHash(password,salt);
   user={id:randomUUID(),username,salt,passwordHash:digest.toString('hex'),coins:0,ownedSkins:[DEFAULT_CHARACTER],equippedSkin:DEFAULT_CHARACTER,claims:{},createdAt:Date.now(),version:1};
   demand(await writeRecord(key,null,user),'Tên đăng nhập đã được sử dụng.',409);
   try{await indexAccount(key,user.createdAt);}catch{console.error('Account index requires admin resync');}
  }else{
   const digest=await passwordHash(password,existing?.salt||'00000000000000000000000000000000');demand(existing&&timingSafeEqual(digest,Buffer.from(existing.passwordHash,'hex')),'Tên đăng nhập hoặc mật khẩu chưa đúng.',401);
  }
  const identity={id:user.id,key,username:user.username};let gift=null;
  if(op==='login'){
   demand(/^[\w-]{8,80}$/.test(String(body.requestId||'')),'Mã thao tác không hợp lệ.');
   const result=await mutate(identity,a=>{const claim=`login:${body.requestId}`;if(a.claims[claim]!==undefined)return a.claims[claim];const amount=randomInt(1,6);a.coins+=amount;a.claims[claim]=amount;return amount;});gift=result.result;user=result.account;
  }
  const sessionToken=randomBytes(32).toString('hex');await writeRecord(`session:${sha(sessionToken)}`,null,{...identity,expiresAt:Date.now()+sessionSeconds*1000},sessionSeconds);
  return {account:publicAccount(user),gift,cookieToken:sessionToken};
 }
 const identity=await authenticateAccount(token);demand(identity,'Vui lòng đăng nhập để chơi.',401);
 if(op==='logout'){const name=`session:${sha(token)}`,{raw}=await readRecord(name);await writeRecord(name,raw,null);return {loggedOut:true,cookieToken:''};}
 if(op==='account')return {account:publicAccount((await accountDocument(identity)).value)};
 if(op==='buyCardSkin'||op==='equipCardSkin'){
  const skin=CARD_SKINS.find(c=>c.id===body.skin);demand(skin,'Skin bài không hợp lệ.');
  return mutate(identity,a=>{a.ownedCardSkins??=['classic'];a.equippedCardSkin??='classic';
   if(op==='equipCardSkin'){demand(a.ownedCardSkins.includes(skin.id),'Bạn chưa sở hữu skin bài này.');a.equippedCardSkin=skin.id;return 'equipped';}
   if(a.ownedCardSkins.includes(skin.id))return 'owned';
   demand(a.coins>=skin.price,'Bạn chưa đủ xu để đổi skin bài.');a.coins-=skin.price;a.ownedCardSkins.push(skin.id);return 'bought';
  });
 }
 if(op==='buySkin'){
  const skin=CHARACTERS.find(c=>c.id===body.character);demand(skin,'Skin không hợp lệ.');
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
  const winner=room.players.find(p=>p.rank===1),eligible=room.coinRewardEligible&&winner?.accountKey;
  if(eligible)await mutate({id:winner.accountId,key:winner.accountKey},a=>{const claim=`tour:${room.code}:${room.createdAt}`;if(a.claims[claim])return;a.coins++;a.claims[claim]=1;});
  room.coinReward={playerId:eligible?winner.id:null,amount:eligible?1:0};room.version++;
  if(await writeRoom(code,raw,room))return room;
 }
 throw new GameError('Đang cập nhật phần thưởng. Thử lại.',409);
}
