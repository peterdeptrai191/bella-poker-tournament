import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {accountRequest,authenticateAccount,accountDocument} from '../lib/accounts.js';
import {adminRequest} from '../lib/admin.js';
import {readRecord,writeRecord,clearMemory,indexAccount} from '../lib/store.js';
const auth=(op,extra={},token)=>accountRequest({body:{op,requestId:randomUUID(),...extra},token,ip:'admin-tests'});
async function fixture(){clearMemory();const admin=await auth('register',{username:'Owner',password:'secret',role:'admin'}),user=await auth('register',{username:'Target',password:'secret'});const identity=await authenticateAccount(admin.cookieToken),target=await authenticateAccount(user.cookieToken);const {raw,value}=await accountDocument(identity);assert.equal(value.role,undefined);value.role='admin';await writeRecord(identity.key,raw,value);return {identity,target,token:user.cookieToken};}
const call=(identity,op,extra={})=>adminRequest({identity,body:{op,requestId:randomUUID(),...extra}});
test('admin authorization cannot be granted by registration, username or client payload',async()=>{
 const f=await fixture();await assert.rejects(()=>call(null,'adminInfo'),e=>e.status===401);await assert.rejects(()=>call(f.target,'adminInfo',{role:'admin'}),e=>e.status===403);
 const list=await call(f.identity,'adminAccounts');assert.equal(list.total,2);assert.ok(list.accounts.every(a=>!('salt'in a)&&!('passwordHash'in a)&&!('claims'in a)));
 const login=await auth('login',{username:'Owner',password:'secret'});assert.equal(login.account.isAdmin,true);
 const {raw,value}=await accountDocument(f.identity);delete value.role;await writeRecord(f.identity.key,raw,value);await assert.rejects(()=>call(f.identity,'adminInfo'),e=>e.status===403);
});
test('coin adjustment and complete audit are atomic, idempotent and reject overdrafts',async()=>{
 const f=await fixture(),body={op:'adminAdjustCoins',username:'Target',amount:100,reason:'Thưởng giải tuần',requestId:randomUUID()};
 const results=await Promise.all(Array.from({length:5},()=>adminRequest({identity:f.identity,body})));assert.ok(results.every(r=>r.account.coins===100));
 const sub=await call(f.identity,'adminAdjustCoins',{username:'Target',amount:-30,reason:'Điều chỉnh thưởng'});assert.equal(sub.event.before,100);assert.equal(sub.event.after,70);
 await assert.rejects(()=>call(f.identity,'adminAdjustCoins',{username:'Target',amount:-71,reason:'Không đủ số dư'}),/số dư/);
 await assert.rejects(()=>call(f.identity,'adminAdjustCoins',{username:'Target',amount:1.5,reason:'Không hợp lệ'}),/số nguyên/);
 await assert.rejects(()=>call(f.identity,'adminAdjustCoins',{username:'Target',amount:10,reason:''}),/Lý do/);
 await assert.rejects(()=>adminRequest({identity:f.identity,body:{...body,amount:200}}),e=>e.status===409);
 const history=await call(f.identity,'adminHistory',{username:'Target'});assert.equal(history.total,2);assert.ok(history.events.every(e=>e.actorUsername==='Owner'&&e.targetUsername==='Target'&&e.reason&&!('fingerprint'in e)));
 assert.deepEqual(new Set(history.events.map(e=>[e.before,e.after].join(':'))),new Set(['0:100','100:70']));assert.equal((await accountDocument(f.target)).value.coins,70);
});
test('skin gifts support both catalogs, never charge coins, and retain an audit when already owned',async()=>{
 const f=await fixture();await call(f.identity,'adminGiftSkin',{username:'Target',kind:'character',skin:'bella-spider',reason:'Quà sự kiện'});
 const gift=await call(f.identity,'adminGiftSkin',{username:'Target',kind:'cards',skin:'neon',reason:'Tặng bộ bài neon'});assert.ok(gift.account.ownedCardSkins.includes('neon'));assert.ok(gift.account.ownedSkins.includes('bella-spider'));assert.equal(gift.account.coins,0);
 const repeat=await call(f.identity,'adminGiftSkin',{username:'Target',kind:'cards',skin:'neon',reason:'Kiểm tra đã sở hữu'});assert.equal(repeat.event.alreadyOwned,true);assert.equal(repeat.account.ownedCardSkins.filter(s=>s==='neon').length,1);
 await assert.rejects(()=>call(f.identity,'adminGiftSkin',{username:'Target',kind:'cards',skin:'not-real',reason:'Skin không tồn tại'}),/không hợp lệ/);
 assert.equal((await call(f.identity,'adminHistory')).total,3);
});
test('exact account lookup and index migration are safe and do not expose credentials',async()=>{
 const f=await fixture();const sync=await call(f.identity,'adminSync');assert.equal(sync.cursor,'0');assert.equal(sync.indexed,2);
 const exact=await call(f.identity,'adminAccounts',{query:'target'});assert.equal(exact.accounts[0].username,'Target');assert.equal(exact.total,1);
 assert.equal((await call(f.identity,'adminAccounts',{query:'does-not-exist'})).total,0);
 await assert.rejects(()=>call(f.identity,'adminSync',{cursor:'invalid'}),/không hợp lệ/);await assert.rejects(()=>call(f.identity,'adminAccounts',{offset:-1}),/không hợp lệ/);
 await indexAccount(f.target.key,Date.now());assert.ok((await readRecord(f.target.key)).value.passwordHash);
});
