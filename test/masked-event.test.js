import test from 'node:test';import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {CHARACTERS} from '../public/characters.js';
import {accountRequest,authenticateAccount,accountDocument} from '../lib/accounts.js';
import {clearMemory,writeRecord} from '../lib/store.js';
import {maskedGroups,maskedPick,MASKED_STARS} from '../public/masked-catalog.js';
const call=(op,extra={},token)=>accountRequest({body:{op,requestId:randomUUID(),...extra},token,ip:'masked-test'});
test('masked groups are disjoint, exhaustive rolls yield 20/30/50 and each star gets 4%',()=>{
 const groups=maskedGroups();assert.ok(groups.every(g=>g.length));const ids=groups.flat();assert.equal(new Set(ids).size,ids.length);assert.deepEqual(groups[0],MASKED_STARS);
 assert.ok(groups[1].every(id=>{const c=CHARACTERS.find(c=>c.id===id);return c.price>6&&c.price<=10}));assert.ok(groups[2].every(id=>{const c=CHARACTERS.find(c=>c.id===id);return c.price>0&&c.price<=6}));
 const counts=[0,0,0],stars={};for(let roll=0;roll<100;roll++)for(let i=0;i<840;i++){const p=maskedPick(roll,i);counts[p.group]++;if(!p.group)stars[p.skin]=(stars[p.skin]||0)+1;}
 assert.deepEqual(counts,[16800,25200,42000]);assert.ok(Object.values(stars).every(n=>n===3360));assert.ok(!ids.includes('son-hyung-min'));
});
test('masked pack charges 15 once under retries and concurrency, persists prize and enforces balance',async()=>{
 clearMemory();const u=await call('register',{username:'MaskedTester',password:'test password'}),token=u.cookieToken,identity=await authenticateAccount(token);let d=await accountDocument(identity);d.value.coins=30;await writeRecord(identity.key,d.raw,d.value);
 const requestId=randomUUID(),results=await Promise.all(Array.from({length:4},()=>call('openMaskedPack',{requestId,skin:'sydney-sweeney',cost:0},token)));assert.ok(results.every(r=>r.result.skin===results[0].result.skin));assert.equal((await call('account',{},token)).account.coins,15);assert.ok(maskedGroups().flat().includes(results[0].result.skin));assert.ok(results[0].account.ownedSkins.includes(results[0].result.skin));
 d=await accountDocument(identity);d.value.ownedSkins=CHARACTERS.map(c=>c.id);await writeRecord(identity.key,d.raw,d.value);const duplicate=await call('openMaskedPack',{},token);assert.equal(duplicate.result.duplicate,true);assert.equal(duplicate.account.coins,0);
 await assert.rejects(()=>call('openMaskedPack',{},token),/15 xu/);await assert.rejects(()=>call('openMaskedPack',{requestId:'x'},token),/Mã thao tác/);assert.equal((await call('openMaskedPack',{requestId},token)).result.skin,results[0].result.skin);
});
