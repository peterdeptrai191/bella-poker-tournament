import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {accountRequest,authenticateAccount,accountDocument} from '../lib/accounts.js';import {clearMemory,writeRecord} from '../lib/store.js';
const call=(op,extra={},token)=>accountRequest({body:{op,requestId:randomUUID(),...extra},token,ip:'masked-gift-test'});
test('all accounts including existing records receive one free opening without a wallet debit',async()=>{
 clearMemory();const u=await call('register',{username:'FreeMaskedOld',password:'test password'}),token=u.cookieToken,identity=await authenticateAccount(token);const d=await accountDocument(identity);delete d.value.maskedGift;d.value.coins=30;await writeRecord(identity.key,d.raw,d.value);
 assert.deepEqual((await call('account',{},token)).account.maskedGift,{noticeSeen:false,freeUsed:false});
 const requestId=randomUUID(),r=await Promise.all(Array.from({length:4},()=>call('openMaskedPack',{requestId},token)));assert.ok(r.every(x=>x.result.skin===r[0].result.skin));assert.ok(r.every(x=>x.result.free&&x.result.cost===0));assert.equal((await call('account',{},token)).account.coins,30);
 const paid=await call('openMaskedPack',{free:true},token);assert.equal(paid.result.cost,15);assert.equal(paid.result.free,false);assert.equal(paid.account.coins,15);
 const retry=await call('openMaskedPack',{requestId},token);assert.equal(retry.result.cost,0);assert.equal(retry.account.coins,15);
 const fresh=await call('register',{username:'FreeMaskedNew',password:'test password'});assert.equal((await call('openMaskedPack',{},fresh.cookieToken)).account.coins,0);
 await assert.rejects(()=>call('openMaskedPack',{free:true},fresh.cookieToken),/15 xu/);
});
test('notice is claimed once across devices and free opening survives dismissal and login',async()=>{
 clearMemory();const u=await call('register',{username:'MaskedNotice',password:'test password'});const results=await Promise.all(Array.from({length:4},()=>call('claimMaskedNotice',{},u.cookieToken)));assert.equal(results.filter(r=>r.result.show).length,1);
 assert.equal((await call('claimMaskedNotice',{},u.cookieToken)).result.show,false);const logged=await call('login',{username:'MaskedNotice',password:'test password'});assert.equal(logged.account.maskedGift.noticeSeen,true);assert.equal(logged.account.maskedGift.freeUsed,false);
 assert.equal((await call('openMaskedPack',{},logged.cookieToken)).result.cost,0);assert.equal((await call('account',{},u.cookieToken)).account.maskedGift.freeUsed,true);
});
test('concurrent distinct openings cannot both use the free gift',async()=>{
 clearMemory();const u=await call('register',{username:'MaskedRace',password:'test password'});const r=await Promise.allSettled([call('openMaskedPack',{},u.cookieToken),call('openMaskedPack',{},u.cookieToken)]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal(r.filter(x=>x.status==='rejected').length,1);assert.equal((await call('account',{},u.cookieToken)).account.coins,0);
});
