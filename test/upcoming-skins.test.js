import test from 'node:test';import assert from 'node:assert/strict';
import {CHARACTERS} from '../public/characters.js';import {accountRequest,authenticateAccount,accountDocument} from '../lib/accounts.js';import {clearMemory,writeRecord} from '../lib/store.js';import {randomUUID} from 'node:crypto';
test('new singers are pack exclusive while Son Hyung Min costs 20 coins',async()=>{
 clearMemory();const call=(op,extra={},token)=>accountRequest({body:{op,requestId:randomUUID(),...extra},token,ip:'new-skins-test'}),u=await call('register',{username:'SingerTester',password:'test password'});
 for(const id of ['dangrangto','jack97','mck','the-weeknd']){const c=CHARACTERS.find(c=>c.id===id);assert.equal(c.maskedExclusive,true);assert.ok(!c.comingSoon);await assert.rejects(()=>call('buySkin',{character:id},u.cookieToken),/The Masked Singer/);}
 const c=CHARACTERS.find(c=>c.id==='son-hyung-min');assert.equal(c.price,20);assert.ok(!c.comingSoon);const identity=await authenticateAccount(u.cookieToken),d=await accountDocument(identity);d.value.coins=20;await writeRecord(identity.key,d.raw,d.value);const r=await call('buySkin',{character:c.id},u.cookieToken);assert.equal(r.account.coins,0);assert.ok(r.account.ownedSkins.includes(c.id));
});
