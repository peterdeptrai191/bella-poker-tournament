import {createHash} from 'node:crypto';
import {accountDocument} from './accounts.js';
import {readRecord,limit,indexAccount,scanAccounts,indexedAccounts,writeAdminChange,adminAuditPage} from './store.js';
import {demand,GameError} from './poker.js';
import {CHARACTERS} from '../public/characters.js';
import {CARD_SKINS} from '../public/card-skin-catalog.js';
const sha=s=>createHash('sha256').update(s).digest('hex');
const keyFor=username=>'account:'+sha(username.normalize('NFKC').toLocaleLowerCase('en-US'));
const cleanAccount=a=>({id:a.id,username:a.username,coins:a.coins,createdAt:a.createdAt||0,isAdmin:a.role==='admin',ownedSkins:a.ownedSkins||[],ownedCardSkins:a.ownedCardSkins||['classic'],equippedSkin:a.equippedSkin,equippedCardSkin:a.equippedCardSkin||'classic',version:a.version||1});
const cleanEvent=({fingerprint,...e})=>e;
function offsetOf(value){const n=Number(value??0);demand(Number.isSafeInteger(n)&&n>=0&&n<=10000000,'Trang không hợp lệ.');return n;}
export async function adminRequest({body={},identity}){
 demand(identity,'Vui lòng đăng nhập.',401);
 const actor=(await accountDocument(identity)).value;demand(actor.role==='admin','Bạn không có quyền quản trị.',403);
 await limit('admin:'+actor.id,180);
 if(body.op==='adminInfo')return {admin:{username:actor.username,id:actor.id},characters:CHARACTERS.map(({id,name,price})=>({id,name,price})),cardSkins:CARD_SKINS.map(({id,name,price})=>({id,name,price}))};
 if(body.op==='adminSync'){
  const cursor=String(body.cursor??'0');demand(/^\d{1,24}$/.test(cursor),'Con trỏ không hợp lệ.');
  const page=await scanAccounts(cursor);await Promise.all(page.accounts.map(a=>indexAccount(a.name,a.value.createdAt)));
  return {cursor:page.cursor,indexed:page.accounts.length};
 }
 if(body.op==='adminAccounts'){
  const query=String(body.query||'').normalize('NFKC').trim();demand(query.length<=32,'Tên đăng nhập quá dài.');
  if(query){const {value}=await readRecord(keyFor(query));return {total:value?1:0,accounts:value?[cleanAccount(value)]:[]};}
  const page=await indexedAccounts(offsetOf(body.offset));return {...page,accounts:page.accounts.map(cleanAccount)};
 }
 if(body.op==='adminHistory'){
  const username=String(body.username||'').normalize('NFKC').trim();demand(username.length<=32,'Tên đăng nhập quá dài.');
  const target=username?(await readRecord(keyFor(username))).value:null;
  if(username&&!target)return {events:[],total:0};
  const page=await adminAuditPage(target?.id,offsetOf(body.offset));return {...page,events:page.events.map(cleanEvent)};
 }
 demand(['adminAdjustCoins','adminGiftSkin'].includes(body.op),'Thao tác quản trị không hợp lệ.');
 const username=String(body.username||'').normalize('NFKC').trim(),reason=String(body.reason||'').trim();
 demand(username.length>0&&username.length<=32,'Nhập đúng tên đăng nhập.');
 demand(reason.length>=3&&reason.length<=300,'Lý do cần từ 3–300 ký tự.');
 demand(typeof body.requestId==='string'&&/^[\w-]{8,80}$/.test(body.requestId),'Mã thao tác không hợp lệ.');
 const amount=body.amount,kind=body.kind,skin=body.skin;
 if(body.op==='adminAdjustCoins')demand(Number.isSafeInteger(amount)&&amount!==0&&Math.abs(amount)<=1000000000,'Số xu cần là số nguyên khác 0, tối đa 1 tỷ.');
 else demand((kind==='character'?CHARACTERS:kind==='cards'?CARD_SKINS:[]).some(s=>s.id===skin),'Skin không hợp lệ.');
 const fingerprint=sha(JSON.stringify([body.op,username.toLocaleLowerCase('en-US'),reason,amount??null,kind??null,skin??null]));
 const id=sha(actor.id+':'+body.requestId),name=keyFor(username);
 for(let i=0;i<20;i++){
  const previous=(await readRecord('audit:'+id)).value;
  if(previous){demand(previous.fingerprint===fingerprint,'Mã thao tác đã dùng cho yêu cầu khác.',409);return {event:cleanEvent(previous),account:cleanAccount((await readRecord(name)).value),repeated:true};}
  const {raw,value}=await readRecord(name);demand(value,'Không tìm thấy tài khoản.',404);
  const before=value.coins;demand(Number.isSafeInteger(before)&&before>=0,'Số dư tài khoản không hợp lệ.',409);
  let alreadyOwned=false;
  if(body.op==='adminAdjustCoins'){demand(Number.isSafeInteger(before+amount)&&before+amount>=0,'Không thể trừ quá số dư hiện tại.');value.coins+=amount;}
  else{const field=kind==='character'?'ownedSkins':'ownedCardSkins';value[field]??=kind==='cards'?['classic']:[];alreadyOwned=value[field].includes(skin);if(!alreadyOwned)value[field].push(skin);}
  value.version=(value.version||1)+1;
  const event={id,fingerprint,createdAt:Date.now(),actorId:actor.id,actorUsername:actor.username,targetId:value.id,targetUsername:value.username,type:body.op==='adminAdjustCoins'?'coins':'gift',amount:body.op==='adminAdjustCoins'?amount:0,before,after:value.coins,reason,...(body.op==='adminGiftSkin'?{kind,skin,alreadyOwned}:{})};
  const result=await writeAdminChange(name,raw,value,event);
  if(result===1)return {account:cleanAccount(value),event:cleanEvent(event)};
 }
 throw new GameError('Tài khoản đang thay đổi. Thử lại cùng thao tác.',409);
}
