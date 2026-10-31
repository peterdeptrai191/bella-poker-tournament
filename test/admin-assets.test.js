import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID,createHash} from 'node:crypto';
import {adminRequest} from '../lib/admin.js';import {accountRequest,authenticateAccount,accountDocument,GRANTS,vnDay} from '../lib/accounts.js';
import {readRecord,writeRecord,clearMemory} from '../lib/store.js';import {assetSnapshot} from '../lib/account-assets.js';import {service} from '../lib/service.js';
const sha=s=>createHash('sha256').update(s).digest('hex');
const auth=(op,extra={},token)=>accountRequest({body:{op,requestId:randomUUID(),...extra},token,ip:'asset-tests'});
async function user(username,role){const a=await auth('register',{username,password:'test password'}),identity=await authenticateAccount(a.cookieToken);if(role){const r=await accountDocument(identity);r.value.role=role;await writeRecord(identity.key,r.raw,r.value);}return {identity,token:a.cookieToken};}
async function fixture(){clearMemory();const owner=await user('ducduy.191@gmail.com','admin'),member=await user('AssetPlayer'),other=await user('OtherAdmin','admin');for(const u of [owner,member,other]){const r=await accountDocument(u.identity);Object.assign(r.value,{coins:50,ownedSkins:['farmer','bella-m10','bella-spider'],equippedSkin:'bella-spider',ownedCardSkins:['classic','neon'],equippedCardSkin:'neon',ownedChipSkins:['classic','neon'],equippedChipSkin:'neon',daily:{lastDay:vnDay(),streak:7},loginGiftDay:vnDay()});await writeRecord(u.identity.key,r.raw,r.value);}return {owner,member,other};}
const call=(u,op,extra={})=>adminRequest({identity:u?.identity,body:{op,requestId:randomUUID(),...extra}});
test('individual revocation and reset preserve identity, roles and receipts and suppress automatic old gifts',async()=>{
 const f=await fixture();const grant={skin:'bella-m10',users:[sha('assetplayer')]};GRANTS.push(grant);
 try{
  const before=(await accountDocument(f.member.identity)).value;
  const revoked=await call(f.owner,'adminRevokeSkin',{username:'AssetPlayer',kind:'character',skin:'bella-spider',reason:'Thu hồi thử nghiệm'});assert.equal(revoked.account.equippedSkin,'farmer');assert.ok(!revoked.account.ownedSkins.includes('bella-spider'));assert.equal(revoked.event.assetsBefore.equippedCharacter,'bella-spider');
  const result=await call(f.owner,'adminResetAccountAssets',{username:'AssetPlayer',reason:'Đặt lại tài sản',confirmation:'RESET'});assert.equal(result.account.coins,0);assert.deepEqual(result.account.ownedSkins,['farmer']);assert.deepEqual(result.account.ownedCardSkins,['classic']);assert.deepEqual(result.account.ownedChipSkins,['classic']);
  const after=(await accountDocument(f.member.identity)).value;for(const k of ['id','username','passwordHash','salt','daily','claims','loginGiftDay'])assert.deepEqual(after[k],before[k]);
  const restored=await auth('account',{},f.member.token);assert.deepEqual(restored.account.ownedSkins,['farmer']);
  assert.ok(!JSON.stringify(result.event).includes('passwordHash'));assert.equal(result.event.before,50);assert.equal(result.event.after,0);
 }finally{GRANTS.splice(GRANTS.indexOf(grant),1);}
});
test('owner exemption and free defaults are enforced by the API, not the interface',async()=>{
 const f=await fixture();for(const op of ['adminResetAccountAssets','adminRevokeSkin'])await assert.rejects(()=>call(f.owner,op,{username:'DUCDUY.191@gmail.com',kind:'character',skin:'bella-spider',reason:'Không được tác động',confirmation:'RESET'}),e=>e.status===403);
 await assert.rejects(()=>call(f.owner,'adminRevokeSkin',{username:'AssetPlayer',kind:'cards',skin:'classic',reason:'Không được tác động'}),/miễn phí/);
 await assert.rejects(()=>call(f.owner,'adminResetAccountAssets',{username:'AssetPlayer',reason:'Thiếu xác nhận'}),/RESET/);
 await assert.rejects(()=>call(f.other,'adminPrepareAssetReset',{reason:'Không được phép'}),e=>e.status===403);await assert.rejects(()=>call(f.member,'adminResetAccountAssets',{username:'OtherAdmin',reason:'Không được phép',confirmation:'RESET'}),e=>e.status===403);
});
test('bulk reset freezes the target list, skips owner, audits once and resumes safely across duplicate batches',async()=>{
 const f=await fixture(),before=assetSnapshot((await accountDocument(f.owner.identity)).value);
 for(let i=0;i<9;i++){const username='BulkExtra'+i;await writeRecord('account:'+sha(username.toLowerCase()),null,{id:randomUUID(),username,coins:i+1,ownedSkins:['farmer','doctor'],equippedSkin:'doctor',ownedCardSkins:['classic'],ownedChipSkins:['classic'],claims:{},createdAt:1,version:1});}
 let plan=await call(f.owner,'adminPrepareAssetReset',{reason:'Đặt lại mùa giải'});while(plan.status==='planning')plan=await call(f.owner,'adminPrepareAssetReset',{jobId:plan.jobId});assert.equal(plan.total,11);
 await writeRecord('account:'+sha('late'),null,{id:randomUUID(),username:'Late',coins:99,ownedSkins:['farmer'],createdAt:Date.now()+1000,version:1});
 await assert.rejects(()=>call(f.owner,'adminRunAssetReset',{jobId:plan.jobId}),/RESET/);
 await Promise.all(Array.from({length:3},()=>call(f.owner,'adminRunAssetReset',{jobId:plan.jobId,confirmation:'RESET'})));
 do{plan=await call(f.owner,'adminRunAssetReset',{jobId:plan.jobId,confirmation:'RESET'});}while(plan.status!=='done');assert.equal(plan.completed,11);assert.equal(plan.coinsRemoved,145);
 const repeated=await call(f.owner,'adminRunAssetReset',{jobId:plan.jobId,confirmation:'RESET'});assert.equal(repeated.completed,11);
 assert.deepEqual(assetSnapshot((await accountDocument(f.owner.identity)).value),before);assert.equal((await accountDocument(f.other.identity)).value.role,'admin');assert.equal((await accountDocument(f.member.identity)).value.coins,0);assert.equal((await readRecord('account:'+sha('late'))).value.coins,99);
 const audit=await call(f.owner,'adminHistory');assert.equal(audit.total,11);assert.ok(audit.events.every(e=>e.type==='reset'&&e.batchId===plan.jobId&&e.targetUsername!=='ducduy.191@gmail.com'));
});
test('active room refresh restores default cosmetics and sends the current wallet after reset',async()=>{
 const f=await fixture();const roomCall=(body,token,code)=>service({account:f.member.identity,method:body?'POST':'GET',body:body?{requestId:randomUUID(),...body}:undefined,token,code,ip:'asset-room'});
 const created=await roomCall({op:'create',withBot:true});const code=created.room.code;await roomCall({op:'ready',ready:true,code},created.token);await roomCall({op:'start',code},created.token);
 await call(f.owner,'adminResetAccountAssets',{username:'AssetPlayer',reason:'Đặt lại khi đang chơi',confirmation:'RESET'});
 assert.equal((await roomCall(null,created.token,code)).account,undefined);   // a poll no longer reads the account
 const state=await roomCall({op:'sync',code},created.token,code),me=state.room.players.find(p=>p.id===state.room.me);assert.equal(me.character,'farmer');assert.equal(me.cardSkin,'classic');assert.equal(state.account.coins,0);assert.equal(state.account.equippedChipSkin,'classic');
});
