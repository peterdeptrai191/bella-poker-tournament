import {createHash} from 'node:crypto';
import {accountDocument,GRANTS} from './accounts.js';
import {readRecord,writeRecord,limit,indexAccount,scanAccounts,indexedAccounts,writeAdminChange,adminAuditPage} from './store.js';
import {demand,GameError} from './poker.js';
import {CHARACTERS,DEFAULT_CHARACTER} from '../public/characters.js';
import {CARD_SKINS} from '../public/card-skin-catalog.js';
import {CHIP_SKINS,DEFAULT_CHIP_SKIN} from '../public/chip-skin-catalog.js';
import {assetSnapshot,resetAssets,revokeAsset} from './account-assets.js';
const sha=s=>createHash('sha256').update(s).digest('hex');
const keyFor=username=>'account:'+sha(username.normalize('NFKC').toLocaleLowerCase('en-US'));
const protectedKey='account:a60e849034914fc025d92ba794f4c286b38d391dd4c5a9c65cc1c51185dbb1ab';
const isOwner=a=>keyFor(a.username)===protectedKey;
const catalog=kind=>kind==='character'?CHARACTERS:kind==='cards'?CARD_SKINS:kind==='chips'?CHIP_SKINS:[];
const cleanAccount=a=>({id:a.id,username:a.username,displayName:a.displayName||a.username,coins:a.coins,createdAt:a.createdAt||0,isAdmin:a.role==='admin',protectedAssets:keyFor(a.username)===protectedKey,ownedSkins:a.ownedSkins||[DEFAULT_CHARACTER],ownedCardSkins:a.ownedCardSkins||['classic'],ownedChipSkins:a.ownedChipSkins||[DEFAULT_CHIP_SKIN],equippedSkin:a.equippedSkin,equippedCardSkin:a.equippedCardSkin||'classic',equippedChipSkin:a.equippedChipSkin||DEFAULT_CHIP_SKIN,version:a.version||1});
const cleanEvent=({fingerprint,...e})=>e;
function offsetOf(value){const n=Number(value??0);demand(Number.isSafeInteger(n)&&n>=0&&n<=10000000,'Trang không hợp lệ.');return n;}
export async function adminRequest({body={},identity}){
 demand(identity,'Vui lòng đăng nhập.',401);
 const actor=(await accountDocument(identity)).value;demand(actor.role==='admin','Bạn không có quyền quản trị.',403);
 await limit('admin:'+actor.id,180);
 if(body.op==='adminInfo')return {admin:{username:actor.username,id:actor.id},canResetServerAssets:isOwner(actor),protectedUsername:'ducduy.191@gmail.com',characters:CHARACTERS.map(({id,name,price})=>({id,name,price})),cardSkins:CARD_SKINS.map(({id,name,price})=>({id,name,price})),chipSkins:CHIP_SKINS.map(({id,name})=>({id,name}))};
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
 if(['adminPrepareAssetReset','adminRunAssetReset','adminAssetResetStatus'].includes(body.op)){demand(isOwner(actor),'Chỉ chủ app được đặt lại toàn server.',403);return bulkAssetReset(actor,body);}
 return changeAccount(actor,body);
}
async function changeAccount(actor,body,batchId=null){
 demand(['adminAdjustCoins','adminGiftSkin','adminRevokeSkin','adminResetAccountAssets'].includes(body.op),'Thao tác quản trị không hợp lệ.');
 const username=String(body.username||'').normalize('NFKC').trim(),reason=String(body.reason||'').trim();
 demand(username.length>0&&username.length<=32,'Nhập đúng tên đăng nhập.');
 demand(reason.length>=3&&reason.length<=300,'Lý do cần từ 3–300 ký tự.');
 demand(typeof body.requestId==='string'&&/^[\w-]{8,80}$/.test(body.requestId),'Mã thao tác không hợp lệ.');
 const amount=body.amount,kind=body.kind,skin=body.skin;
 if(body.op==='adminAdjustCoins')demand(Number.isSafeInteger(amount)&&amount!==0&&Math.abs(amount)<=1000000000,'Số xu cần là số nguyên khác 0, tối đa 1 tỷ.');
 else if(body.op==='adminResetAccountAssets')demand(body.confirmation==='RESET','Nhập RESET để xác nhận đặt lại tài sản.');
 else demand(catalog(kind).some(s=>s.id===skin),'Skin không hợp lệ.');
 if(body.op==='adminRevokeSkin'){demand(skin!==(kind==='character'?DEFAULT_CHARACTER:kind==='chips'?DEFAULT_CHIP_SKIN:'classic'),'Không thể thu hồi skin miễn phí mặc định.');}
 if(['adminResetAccountAssets','adminRevokeSkin'].includes(body.op))demand(keyFor(username)!==protectedKey,'Tài khoản chủ app được bảo vệ khỏi thu hồi/đặt lại tài sản.',403);
 const fingerprintParts=[body.op,username.toLocaleLowerCase('en-US'),reason,amount??null,kind??null,skin??null];if(batchId)fingerprintParts.push(batchId);const fingerprint=sha(JSON.stringify(fingerprintParts));
 const id=sha(actor.id+':'+body.requestId),name=keyFor(username);
 for(let i=0;i<20;i++){
  const previous=(await readRecord('audit:'+id)).value;
  if(previous){demand(previous.fingerprint===fingerprint,'Mã thao tác đã dùng cho yêu cầu khác.',409);return {event:cleanEvent(previous),account:cleanAccount((await readRecord(name)).value),repeated:true};}
  const {raw,value}=await readRecord(name);demand(value,'Không tìm thấy tài khoản.',404);
  const before=value.coins;demand(Number.isSafeInteger(before)&&before>=0,'Số dư tài khoản không hợp lệ.',409);
  const assetsBefore=assetSnapshot(value);let alreadyOwned=false;
  if(body.op==='adminAdjustCoins'){demand(Number.isSafeInteger(before+amount)&&before+amount>=0,'Không thể trừ quá số dư hiện tại.');value.coins+=amount;}
  else if(body.op==='adminResetAccountAssets')resetAssets(value,GRANTS.map(g=>g.skin));
  else if(body.op==='adminRevokeSkin')revokeAsset(value,kind,skin);
  else{const field=kind==='character'?'ownedSkins':kind==='cards'?'ownedCardSkins':'ownedChipSkins';value[field]??=kind==='character'?[DEFAULT_CHARACTER]:kind==='cards'?['classic']:[DEFAULT_CHIP_SKIN];alreadyOwned=value[field].includes(skin);if(!alreadyOwned)value[field].push(skin);}
  value.version=(value.version||1)+1;
  const event={id,fingerprint,createdAt:Date.now(),actorId:actor.id,actorUsername:actor.username,targetId:value.id,targetUsername:value.username,type:body.op==='adminAdjustCoins'?'coins':body.op==='adminResetAccountAssets'?'reset':body.op==='adminRevokeSkin'?'revoke':'gift',amount:value.coins-before,before,after:value.coins,accountVersionAfter:value.version,reason,...(['adminGiftSkin','adminRevokeSkin'].includes(body.op)?{kind,skin,alreadyOwned}:{}),...(body.op!=='adminAdjustCoins'?{assetsBefore,assetsAfter:assetSnapshot(value)}:{}),...(batchId?{batchId}:{})};
  const result=await writeAdminChange(name,raw,value,event);
  if(result===1)return {account:cleanAccount(value),event:cleanEvent(event)};
 }
 throw new GameError('Tài khoản đang thay đổi. Thử lại cùng thao tác.',409);
}

const publicResetJob=j=>({jobId:j.id,status:j.status,reason:j.reason,total:j.targets.length,completed:j.next||0,coinsRemoved:j.coinsRemoved||0,protectedUsername:'ducduy.191@gmail.com'});
async function bulkAssetReset(actor,body){
 let id=String(body.jobId||'');
 if(body.op==='adminPrepareAssetReset'&&!id){
  demand(typeof body.requestId==='string'&&/^[\w-]{8,80}$/.test(body.requestId),'Mã thao tác không hợp lệ.');
  const reason=String(body.reason||'').trim();demand(reason.length>=3&&reason.length<=300,'Lý do cần từ 3–300 ký tự.');
  id=sha(actor.id+':asset-reset:'+body.requestId);const existing=(await readRecord('admin-reset-job:'+id)).value;
  if(existing)demand(existing.actorId===actor.id&&existing.reason===reason,'Mã kế hoạch đã dùng cho yêu cầu khác.',409);
  else await writeRecord('admin-reset-job:'+id,null,{id,actorId:actor.id,createdAt:Date.now(),reason,status:'planning',scanCursor:'0',targets:[],next:0,coinsRemoved:0});
 }
 demand(/^[a-f0-9]{64}$/.test(id),'Mã kế hoạch không hợp lệ.');
 for(let attempt=0;attempt<20;attempt++){
  const name='admin-reset-job:'+id,{raw,value:job}=await readRecord(name);demand(job&&job.actorId===actor.id,'Không tìm thấy kế hoạch.',404);
  if(body.op==='adminAssetResetStatus')return publicResetJob(job);
  if(body.op==='adminPrepareAssetReset'){
   if(job.status!=='planning')return publicResetJob(job);
   const page=await scanAccounts(job.scanCursor),seen=new Set(job.targets.map(t=>t.id));
   for(const a of page.accounts)if(a.name!==protectedKey&&!seen.has(a.value.id)&&(a.value.createdAt||0)<=job.createdAt){job.targets.push({id:a.value.id,username:a.value.username});seen.add(a.value.id);}
   job.scanCursor=page.cursor;if(page.cursor==='0')job.status='ready';
   if(await writeRecord(name,raw,job))return publicResetJob(job);continue;
  }
  demand(body.confirmation==='RESET','Nhập RESET để xác nhận đặt lại toàn server.');
  demand(job.status!=='planning','Danh sách tài khoản chưa hoàn tất.');
  if(job.status==='done')return publicResetJob(job);
  const start=job.next,end=Math.min(start+10,job.targets.length);let removed=0;
  for(const target of job.targets.slice(start,end)){
   const current=(await readRecord(keyFor(target.username))).value;demand(current?.id===target.id,'Tài khoản trong kế hoạch đã thay đổi.',409);
   const result=await changeAccount(actor,{op:'adminResetAccountAssets',username:target.username,reason:job.reason,confirmation:'RESET',requestId:id.slice(0,32)+'_'+sha(target.id).slice(0,32)},id);
   removed+=Math.max(0,result.event.before-result.event.after);
  }
  const latest=await readRecord(name);if(latest.value.next!==start)return publicResetJob(latest.value);
  latest.value.next=end;latest.value.coinsRemoved+=removed;latest.value.status=end===latest.value.targets.length?'done':'running';
  if(await writeRecord(name,latest.raw,latest.value))return publicResetJob(latest.value);
 }
 throw new GameError('Kế hoạch đang được cập nhật. Thử lại cùng kế hoạch.',409);
}
